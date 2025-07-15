import { Worker } from '../worker';
import { RequestProcessor } from '../request-processor';
import { QueueManager } from '../queue/queue-manager';
import { QueueItem, QueuePriority } from '../queue/redis-queue';
import { AiRequestStatus } from '../interfaces/ai-types';

// Mock dependencies
jest.mock('../request-processor');
jest.mock('../queue/queue-manager');

describe('Worker', () => {
  let worker: Worker;
  let mockRequestProcessor: jest.Mocked<RequestProcessor>;
  let mockQueueManager: jest.Mocked<QueueManager>;

  const defaultConfig = {
    id: 'worker-1',
    processingTimeout: 30000,
    maxRetries: 3,
    healthCheckInterval: 5000,
  };

  beforeEach(() => {
    // Create mock RequestProcessor
    mockRequestProcessor = {
      processRequest: jest.fn().mockResolvedValue({
        id: 'resp_123',
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
        content: 'Test response',
        metadata: {
          tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        },
        performance: { responseTimeMs: 100, retryCount: 0 },
      }),
      updateRequestStatus: jest.fn().mockResolvedValue(undefined),
      getRequestStatus: jest.fn().mockResolvedValue({
        requestId: 'req_123',
        status: AiRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      isRunning: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<RequestProcessor>;

    // Create mock QueueManager
    mockQueueManager = {
      getQueueMetrics: jest.fn().mockResolvedValue({
        queueDepth: { high: 0, normal: 1, low: 0 },
        totalDepth: 1,
      }),
      isRunning: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<QueueManager>;

    worker = new Worker(defaultConfig, mockRequestProcessor, mockQueueManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create Worker with provided configuration', () => {
      expect(worker).toBeInstanceOf(Worker);
      expect(worker.getId()).toBe(defaultConfig.id);
      expect(worker.isRunning()).toBe(false);
    });

    it('should use default configuration when not provided', () => {
      const minimalConfig = { id: 'worker-min' };
      const workerMin = new Worker(minimalConfig, mockRequestProcessor, mockQueueManager);
      
      expect(workerMin).toBeInstanceOf(Worker);
      expect(workerMin.getId()).toBe('worker-min');
    });

    it('should validate required configuration', () => {
      expect(() => new Worker({} as any, mockRequestProcessor, mockQueueManager)).toThrow(
        /Worker ID is required/
      );
    });
  });

  describe('lifecycle management', () => {
    it('should start worker and begin processing', async () => {
      await worker.start();
      
      expect(worker.isRunning()).toBe(true);
      expect(worker.getStatus()).toBe('running');
    });

    it('should stop worker gracefully', async () => {
      await worker.start();
      await worker.stop();
      
      expect(worker.isRunning()).toBe(false);
      expect(worker.getStatus()).toBe('stopped');
    });

    it('should handle multiple start calls gracefully', async () => {
      await worker.start();
      await worker.start(); // Should not throw
      
      expect(worker.isRunning()).toBe(true);
    });

    it('should handle stop when not running', async () => {
      await worker.stop(); // Should not throw
      
      expect(worker.isRunning()).toBe(false);
    });
  });

  describe('request processing', () => {
    beforeEach(async () => {
      await worker.start();
    });

    afterEach(async () => {
      await worker.stop();
    });

    it('should process a single request successfully', async () => {
      const queueItem: QueueItem = {
        id: 'req_123',
        data: {
          prompt: 'Test prompt',
          provider: 'claude',
          model: 'claude-3-sonnet-20240229',
        },
        priority: QueuePriority.NORMAL,
      };

      const result = await worker.processRequest(queueItem);

      expect(mockRequestProcessor.updateRequestStatus).toHaveBeenCalledWith(
        'req_123',
        AiRequestStatus.PROCESSING
      );
      expect(mockRequestProcessor.processRequest).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
      });
      expect(mockRequestProcessor.updateRequestStatus).toHaveBeenCalledWith(
        'req_123',
        AiRequestStatus.COMPLETED,
        expect.objectContaining({
          response: expect.any(Object),
          completedAt: expect.any(Date),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle processing timeout', async () => {
      const shortTimeoutWorker = new Worker(
        { ...defaultConfig, processingTimeout: 100 },
        mockRequestProcessor,
        mockQueueManager
      );
      await shortTimeoutWorker.start();

      // Mock a slow request
      mockRequestProcessor.processRequest.mockImplementation(
        () => new Promise<any>(resolve => setTimeout(resolve, 200))
      );

      const queueItem: QueueItem = {
        id: 'req_timeout',
        data: { prompt: 'Slow request' },
        priority: QueuePriority.NORMAL,
      };

      const result = await shortTimeoutWorker.processRequest(queueItem);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/timeout/i);
      expect(mockRequestProcessor.updateRequestStatus).toHaveBeenCalledWith(
        'req_timeout',
        AiRequestStatus.FAILED,
        expect.objectContaining({
          error: expect.stringMatching(/timeout/i),
        })
      );

      await shortTimeoutWorker.stop();
    });

    it('should handle processing errors', async () => {
      mockRequestProcessor.processRequest.mockRejectedValue(new Error('Processing failed'));

      const queueItem: QueueItem = {
        id: 'req_error',
        data: { prompt: 'Error request' },
        priority: QueuePriority.NORMAL,
      };

      const result = await worker.processRequest(queueItem);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed');
      expect(mockRequestProcessor.updateRequestStatus).toHaveBeenCalledWith(
        'req_error',
        AiRequestStatus.FAILED,
        expect.objectContaining({
          error: 'Processing failed',
        })
      );
    });

    it('should handle malformed queue items', async () => {
      const malformedItem = {
        id: 'req_malformed',
        data: null,
        priority: QueuePriority.NORMAL,
      } as any;

      const result = await worker.processRequest(malformedItem);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid request data/i);
    });
  });

  describe('health monitoring', () => {
    it('should provide health status', async () => {
      const health = await worker.getHealth();

      expect(health).toEqual({
        workerId: defaultConfig.id,
        status: 'stopped',
        isHealthy: true,
        lastActivity: expect.any(Date),
        processedRequests: 0,
        failedRequests: 0,
        averageProcessingTime: 0,
        uptime: expect.any(Number),
      });
    });

    it('should track processing metrics', async () => {
      await worker.start();

      // Add delay to mock to ensure processing time > 0
      mockRequestProcessor.processRequest.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          id: 'resp_123',
          provider: 'claude',
          model: 'claude-3-sonnet-20240229',
          content: 'Test response',
          metadata: {
            tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          },
          performance: { responseTimeMs: 100, retryCount: 0 },
        }), 10))
      );

      const queueItem: QueueItem = {
        id: 'req_metrics',
        data: { prompt: 'Metrics test' },
        priority: QueuePriority.NORMAL,
      };

      await worker.processRequest(queueItem);

      const health = await worker.getHealth();
      expect(health.processedRequests).toBe(1);
      expect(health.failedRequests).toBe(0);
      expect(health.averageProcessingTime).toBeGreaterThan(0);

      await worker.stop();
    });

    it('should track failed requests', async () => {
      await worker.start();
      mockRequestProcessor.processRequest.mockRejectedValue(new Error('Test failure'));

      const queueItem: QueueItem = {
        id: 'req_failure',
        data: { prompt: 'Failure test' },
        priority: QueuePriority.NORMAL,
      };

      await worker.processRequest(queueItem);

      const health = await worker.getHealth();
      expect(health.processedRequests).toBe(0);
      expect(health.failedRequests).toBe(1);

      await worker.stop();
    });

    it('should detect unhealthy worker state', async () => {
      await worker.start();
      
      // Simulate multiple failures
      mockRequestProcessor.processRequest.mockRejectedValue(new Error('Persistent failure'));
      
      const queueItem: QueueItem = {
        id: 'req_unhealthy',
        data: { prompt: 'Unhealthy test' },
        priority: QueuePriority.NORMAL,
      };

      // Process multiple failing requests
      await worker.processRequest(queueItem);
      await worker.processRequest({ ...queueItem, id: 'req_unhealthy2' });
      await worker.processRequest({ ...queueItem, id: 'req_unhealthy3' });

      const health = await worker.getHealth();
      expect(health.isHealthy).toBe(false);

      await worker.stop();
    });
  });

  describe('error scenarios', () => {
    it('should handle RequestProcessor errors gracefully', async () => {
      mockRequestProcessor.updateRequestStatus.mockRejectedValue(new Error('Status update failed'));
      await worker.start();

      const queueItem: QueueItem = {
        id: 'req_status_error',
        data: { prompt: 'Status error test' },
        priority: QueuePriority.NORMAL,
      };

      const result = await worker.processRequest(queueItem);
      expect(result.success).toBe(false);

      await worker.stop();
    });

    it('should handle concurrent processing attempts', async () => {
      await worker.start();

      const queueItem: QueueItem = {
        id: 'req_concurrent',
        data: { prompt: 'Concurrent test' },
        priority: QueuePriority.NORMAL,
      };

      // Start two concurrent processes
      const promise1 = worker.processRequest(queueItem);
      const promise2 = worker.processRequest({ ...queueItem, id: 'req_concurrent2' });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      await worker.stop();
    });
  });

  describe('configuration', () => {
    it('should respect processing timeout configuration', () => {
      const customConfig = { id: 'worker-custom', processingTimeout: 60000 };
      const customWorker = new Worker(customConfig, mockRequestProcessor, mockQueueManager);
      
      expect(customWorker.getConfig().processingTimeout).toBe(60000);
    });

    it('should use default timeout when not specified', () => {
      const defaultWorker = new Worker({ id: 'worker-default' }, mockRequestProcessor, mockQueueManager);
      
      expect(defaultWorker.getConfig().processingTimeout).toBe(30000);
    });
  });
});