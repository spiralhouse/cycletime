import { WorkerPool } from '../worker-pool';
import { Worker } from '../worker';
import { RequestProcessor } from '../request-processor';
import { QueueManager } from '../queue/queue-manager';

// Mock dependencies
jest.mock('../worker');
jest.mock('../request-processor');
jest.mock('../queue/queue-manager');

describe('WorkerPool', () => {
  let workerPool: WorkerPool;
  let mockRequestProcessor: jest.Mocked<RequestProcessor>;
  let mockQueueManager: jest.Mocked<QueueManager>;

  const defaultConfig = {
    maxWorkers: 3,
    minWorkers: 1,
    queuePollInterval: 1000,
    workerHealthCheckInterval: 5000,
    workerConfig: {
      processingTimeout: 30000,
      maxRetries: 3,
    },
  };

  beforeEach(() => {
    // Create mock RequestProcessor
    mockRequestProcessor = {
      isRunning: jest.fn().mockReturnValue(true),
      getHealthStatus: jest.fn().mockResolvedValue({
        isRunning: true,
        isHealthy: true,
      }),
    } as unknown as jest.Mocked<RequestProcessor>;

    // Create mock QueueManager with queue operations
    mockQueueManager = {
      isRunning: jest.fn().mockReturnValue(true),
      getQueueMetrics: jest.fn().mockResolvedValue({
        queueDepth: { high: 0, normal: 2, low: 0 },
        totalDepth: 2,
      }),
    } as unknown as jest.Mocked<QueueManager>;

    // Mock Worker class
    const mockWorkerInstance = (id: string) => {
      let isRunning = false;
      return {
        getId: jest.fn().mockReturnValue(id),
        start: jest.fn().mockImplementation(async () => { isRunning = true; }),
        stop: jest.fn().mockImplementation(async () => { isRunning = false; }),
        isRunning: jest.fn().mockImplementation(() => isRunning),
        getStatus: jest.fn().mockImplementation(() => isRunning ? 'running' : 'stopped'),
        processRequest: jest.fn().mockResolvedValue({ success: true }),
        getHealth: jest.fn().mockImplementation(() => Promise.resolve({
          workerId: id,
          status: isRunning ? 'running' : 'stopped',
          isHealthy: true,
          lastActivity: new Date(),
          processedRequests: 0,
          failedRequests: 0,
          averageProcessingTime: 0,
          uptime: 0,
        })),
        getConfig: jest.fn().mockReturnValue(defaultConfig.workerConfig),
      } as unknown as jest.Mocked<Worker>;
    };

    // Setup Worker constructor mock
    (Worker as jest.MockedClass<typeof Worker>).mockImplementation((config: any) => 
      mockWorkerInstance(config.id)
    );

    workerPool = new WorkerPool(defaultConfig, mockRequestProcessor, mockQueueManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create WorkerPool with provided configuration', () => {
      expect(workerPool).toBeInstanceOf(WorkerPool);
      expect(workerPool.isRunning()).toBe(false);
    });

    it('should validate configuration parameters', () => {
      expect(() => new WorkerPool({} as any, mockRequestProcessor, mockQueueManager)).toThrow(
        /Invalid configuration/
      );
    });

    it('should use default configuration when optional parameters not provided', () => {
      const minimalConfig = { maxWorkers: 2 };
      const poolMin = new WorkerPool(minimalConfig, mockRequestProcessor, mockQueueManager);
      
      expect(poolMin).toBeInstanceOf(WorkerPool);
    });

    it('should validate maxWorkers is greater than 0', () => {
      const invalidConfig = { maxWorkers: 0 };
      
      expect(() => new WorkerPool(invalidConfig, mockRequestProcessor, mockQueueManager)).toThrow(
        /maxWorkers must be greater than 0/
      );
    });

    it('should validate minWorkers is not greater than maxWorkers', () => {
      const invalidConfig = { maxWorkers: 2, minWorkers: 3 };
      
      expect(() => new WorkerPool(invalidConfig, mockRequestProcessor, mockQueueManager)).toThrow(
        /minWorkers cannot be greater than maxWorkers/
      );
    });
  });

  describe('lifecycle management', () => {
    it('should start worker pool and create minimum workers', async () => {
      await workerPool.start();
      
      expect(workerPool.isRunning()).toBe(true);
      expect(Worker).toHaveBeenCalledTimes(defaultConfig.minWorkers);
    });

    it('should stop worker pool and all workers gracefully', async () => {
      await workerPool.start();
      const workers = (workerPool as any).workers;
      
      await workerPool.stop();
      
      expect(workerPool.isRunning()).toBe(false);
      workers.forEach((worker: jest.Mocked<Worker>) => {
        expect(worker.stop).toHaveBeenCalled();
      });
    });

    it('should handle startup failures gracefully', async () => {
      (Worker as jest.MockedClass<typeof Worker>).mockImplementation(() => {
        throw new Error('Worker creation failed');
      });

      await expect(workerPool.start()).rejects.toThrow('Worker creation failed');
      expect(workerPool.isRunning()).toBe(false);
    });

    it('should handle multiple start calls gracefully', async () => {
      await workerPool.start();
      await workerPool.start(); // Should not throw
      
      expect(workerPool.isRunning()).toBe(true);
    });
  });

  describe('worker management', () => {
    beforeEach(async () => {
      await workerPool.start();
    });

    afterEach(async () => {
      await workerPool.stop();
    });

    it('should scale up workers based on queue depth', async () => {
      // Mock high queue depth
      mockQueueManager.getQueueMetrics.mockResolvedValue({
        queueDepth: { high: 5, normal: 10, low: 5 },
        totalDepth: 20,
      });

      await workerPool.scaleWorkers();

      const workerCount = await workerPool.getWorkerCount();
      expect(workerCount).toBeGreaterThan(defaultConfig.minWorkers);
    });

    it('should scale down workers when queue is empty', async () => {
      // First scale up
      await workerPool.scaleWorkers();
      
      // Then mock empty queue
      mockQueueManager.getQueueMetrics.mockResolvedValue({
        queueDepth: { high: 0, normal: 0, low: 0 },
        totalDepth: 0,
      });

      await workerPool.scaleWorkers();

      const workerCount = await workerPool.getWorkerCount();
      expect(workerCount).toBe(defaultConfig.minWorkers);
    });

    it('should not exceed maximum worker limit', async () => {
      // Mock extremely high queue depth
      mockQueueManager.getQueueMetrics.mockResolvedValue({
        queueDepth: { high: 100, normal: 100, low: 100 },
        totalDepth: 300,
      });

      await workerPool.scaleWorkers();

      const workerCount = await workerPool.getWorkerCount();
      expect(workerCount).toBeLessThanOrEqual(defaultConfig.maxWorkers);
    });

    it('should replace failed workers automatically', async () => {
      const workers = (workerPool as any).workers;
      const failedWorker = workers[0];
      
      // Mock worker failure
      failedWorker.getHealth.mockResolvedValue({
        workerId: 'worker-1',
        status: 'failed',
        isHealthy: false,
        lastActivity: new Date(),
        processedRequests: 0,
        failedRequests: 10,
        averageProcessingTime: 0,
        uptime: 0,
      });

      await workerPool.checkWorkerHealth();

      // Should have created a new worker to replace the failed one
      expect(Worker).toHaveBeenCalledTimes(defaultConfig.minWorkers + 1);
    });
  });

  describe('queue processing', () => {
    beforeEach(async () => {
      await workerPool.start();
    });

    afterEach(async () => {
      await workerPool.stop();
    });

    it('should distribute requests to available workers', async () => {
      // Mock queue having items - this is for testing queue processing logic

      // Mock queue having items
      mockQueueManager.getQueueMetrics.mockResolvedValue({
        queueDepth: { high: 0, normal: 1, low: 0 },
        totalDepth: 1,
      });

      await workerPool.processQueue();

      // Should have attempted to process requests
      const workers = (workerPool as any).workers;
      const processCallCount = workers.reduce((count: number, worker: jest.Mocked<Worker>) => {
        return count + worker.processRequest.mock.calls.length;
      }, 0);

      expect(processCallCount).toBeGreaterThan(0);
    });

    it('should handle queue polling errors gracefully', async () => {
      mockQueueManager.getQueueMetrics.mockRejectedValue(new Error('Queue error'));

      await expect(workerPool.processQueue()).resolves.not.toThrow();
    });

    it('should balance load across multiple workers', async () => {
      // Create multiple workers
      await workerPool.scaleWorkers();
      
      // Test load balancing across workers - this is for testing distribution logic

      // Mock queue with multiple items
      mockQueueManager.getQueueMetrics.mockResolvedValue({
        queueDepth: { high: 1, normal: 1, low: 1 },
        totalDepth: 3,
      });

      await workerPool.processQueue();

      // Verify requests are distributed across workers
      const workers = (workerPool as any).workers;
      const totalCalls = workers.reduce((count: number, worker: jest.Mocked<Worker>) => {
        return count + worker.processRequest.mock.calls.length;
      }, 0);

      expect(totalCalls).toBeGreaterThan(0);
    });
  });

  describe('health monitoring', () => {
    beforeEach(async () => {
      await workerPool.start();
    });

    afterEach(async () => {
      await workerPool.stop();
    });

    it('should provide comprehensive pool health status', async () => {
      const health = await workerPool.getHealthStatus();

      expect(health).toEqual({
        isRunning: true,
        isHealthy: true,
        workerCount: expect.any(Number),
        activeWorkers: expect.any(Number),
        idleWorkers: expect.any(Number),
        failedWorkers: expect.any(Number),
        queueMetrics: expect.objectContaining({
          totalDepth: expect.any(Number),
        }),
        performance: expect.objectContaining({
          totalProcessedRequests: expect.any(Number),
          totalFailedRequests: expect.any(Number),
          averageProcessingTime: expect.any(Number),
        }),
        workers: expect.any(Array),
      });
    });

    it('should detect unhealthy pool state', async () => {
      const workers = (workerPool as any).workers;
      
      // Mock all workers as unhealthy
      workers.forEach((worker: jest.Mocked<Worker>) => {
        worker.getHealth.mockResolvedValue({
          workerId: worker.getId(),
          status: 'failed',
          isHealthy: false,
          lastActivity: new Date(),
          processedRequests: 0,
          failedRequests: 5,
          averageProcessingTime: 0,
          uptime: 0,
        });
      });

      const health = await workerPool.getHealthStatus();
      expect(health.isHealthy).toBe(false);
    });

    it('should aggregate worker performance metrics', async () => {
      const workers = (workerPool as any).workers;
      
      // Mock worker metrics
      workers.forEach((worker: jest.Mocked<Worker>, index: number) => {
        worker.getHealth.mockResolvedValue({
          workerId: worker.getId(),
          status: 'running',
          isHealthy: true,
          lastActivity: new Date(),
          processedRequests: (index + 1) * 10,
          failedRequests: index,
          averageProcessingTime: 100 + (index * 50),
          uptime: 10000,
        });
      });

      const health = await workerPool.getHealthStatus();
      expect(health.performance.totalProcessedRequests).toBeGreaterThan(0);
      expect(health.performance.totalFailedRequests).toBeGreaterThanOrEqual(0);
      expect(health.performance.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should respect worker scaling configuration', () => {
      const config = workerPool.getConfig();
      
      expect(config.maxWorkers).toBe(defaultConfig.maxWorkers);
      expect(config.minWorkers).toBe(defaultConfig.minWorkers);
    });

    it('should pass worker configuration to individual workers', async () => {
      await workerPool.start();
      
      expect(Worker).toHaveBeenCalledWith(
        expect.objectContaining({
          processingTimeout: defaultConfig.workerConfig.processingTimeout,
          maxRetries: defaultConfig.workerConfig.maxRetries,
        }),
        mockRequestProcessor,
        mockQueueManager
      );
    });
  });

  describe('error handling', () => {
    it('should handle worker creation failures', async () => {
      (Worker as jest.MockedClass<typeof Worker>).mockImplementationOnce(() => {
        throw new Error('Worker creation failed');
      });

      await expect(workerPool.start()).rejects.toThrow('Worker creation failed');
    });

    it('should continue operating with partial worker failures', async () => {
      await workerPool.start();
      
      const workers = (workerPool as any).workers;
      const failedWorker = workers[0];
      
      // Mock one worker as failed
      failedWorker.getHealth.mockResolvedValue({
        workerId: 'worker-1',
        status: 'failed',
        isHealthy: false,
        lastActivity: new Date(),
        processedRequests: 0,
        failedRequests: 5,
        averageProcessingTime: 0,
        uptime: 0,
      });

      await workerPool.checkWorkerHealth();
      
      // Pool should still be considered healthy if some workers are working
      const health = await workerPool.getHealthStatus();
      expect(health.isRunning).toBe(true);
    });
  });
});