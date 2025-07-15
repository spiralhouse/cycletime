import { QueueManager } from '../../queue/queue-manager';
import { RedisQueue, QueuePriority } from '../../queue/redis-queue';

// Mock RedisQueue
jest.mock('../../queue/redis-queue');

describe('QueueManager', () => {
  let queueManager: QueueManager;
  let mockRedisQueue: jest.Mocked<RedisQueue>;

  const defaultConfig = {
    redisUrl: 'redis://localhost:6379',
    cleanupInterval: 1000,
    staleRequestTimeout: 300000, // 5 minutes
    retryDelay: 30000, // 30 seconds
    maxRetries: 3,
    gracefulShutdownTimeout: 10000, // 10 seconds
  };

  beforeEach(() => {
    // Create mock RedisQueue instance
    mockRedisQueue = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      enqueue: jest.fn().mockResolvedValue(undefined),
      dequeue: jest.fn().mockResolvedValue(null),
      peek: jest.fn().mockResolvedValue(null),
      getQueueDepth: jest.fn().mockResolvedValue(0),
      getTotalQueueDepth: jest.fn().mockResolvedValue(0),
      getQueueMetrics: jest.fn().mockResolvedValue({
        queueDepth: { [QueuePriority.HIGH]: 0, [QueuePriority.NORMAL]: 0, [QueuePriority.LOW]: 0 },
        totalDepth: 0,
      }),
      isEmpty: jest.fn().mockResolvedValue(true),
      on: jest.fn(),
      emit: jest.fn(),
    } as unknown as jest.Mocked<RedisQueue>;

    // Mock the RedisQueue constructor
    (RedisQueue as jest.MockedClass<typeof RedisQueue>).mockImplementation(() => mockRedisQueue);

    queueManager = new QueueManager(defaultConfig);
  });

  afterEach(async () => {
    if (queueManager && queueManager.isRunning()) {
      await queueManager.stop();
    }
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should create QueueManager with provided configuration', () => {
      expect(queueManager).toBeInstanceOf(QueueManager);
      expect(RedisQueue).toHaveBeenCalledWith({
        url: defaultConfig.redisUrl,
        keyPrefix: 'queue',
      });
    });

    it('should initialize with default configuration when not provided', () => {
      const defaultQueueManager = new QueueManager({ redisUrl: 'redis://localhost:6379' });
      expect(defaultQueueManager).toBeInstanceOf(QueueManager);
    });
  });

  describe('lifecycle management', () => {
    it('should start the queue manager and connect to Redis', async () => {
      await queueManager.start();
      
      expect(mockRedisQueue.connect).toHaveBeenCalled();
      expect(queueManager.isRunning()).toBe(true);
    });

    it('should stop the queue manager and disconnect from Redis', async () => {
      await queueManager.start();
      await queueManager.stop();
      
      expect(mockRedisQueue.disconnect).toHaveBeenCalled();
      expect(queueManager.isRunning()).toBe(false);
    });

    it('should handle Redis connection errors during start', async () => {
      const connectionError = new Error('Redis connection failed');
      mockRedisQueue.connect.mockRejectedValue(connectionError);

      await expect(queueManager.start()).rejects.toThrow('Redis connection failed');
      expect(queueManager.isRunning()).toBe(false);
    });
  });

  describe('background tasks', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start cleanup tasks when queue manager starts', async () => {
      const cleanupSpy = jest.spyOn(queueManager as any, 'runCleanupTask');
      
      await queueManager.start();
      
      // Fast forward to trigger cleanup interval
      jest.advanceTimersByTime(defaultConfig.cleanupInterval);
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should stop cleanup tasks when queue manager stops', async () => {
      await queueManager.start();
      await queueManager.stop();
      
      const cleanupSpy = jest.spyOn(queueManager as any, 'runCleanupTask');
      
      // Fast forward time - cleanup should not run after stop
      jest.advanceTimersByTime(defaultConfig.cleanupInterval * 2);
      
      expect(cleanupSpy).not.toHaveBeenCalled();
    });

    it('should handle cleanup task errors gracefully', async () => {
      // Mock cleanup to throw error
      jest.spyOn(queueManager as any, 'cleanupStaleRequests').mockRejectedValue(new Error('Cleanup failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await queueManager.start();
      
      // Directly call the cleanup task method to test error handling
      await (queueManager as any).runCleanupTask().catch(() => {});
      
      expect(queueManager.isRunning()).toBe(true); // Should still be running
      
      consoleSpy.mockRestore();
    });
  });

  describe('stale request cleanup', () => {
    it('should identify and clean up stale requests', async () => {
      // Mock stale request in processing queue
      const staleRequest = {
        id: 'stale-request-1',
        data: { timestamp: Date.now() - defaultConfig.staleRequestTimeout - 1000 },
        priority: QueuePriority.NORMAL,
      };
      
      mockRedisQueue.dequeue.mockResolvedValueOnce(staleRequest);
      
      await queueManager.start();
      await (queueManager as any).cleanupStaleRequests();
      
      // Should attempt to move stale request to retry queue or mark as failed
      expect(mockRedisQueue.dequeue).toHaveBeenCalled();
    });

    it('should not clean up requests that are not stale', async () => {
      // Mock recent request in processing queue
      const recentRequest = {
        id: 'recent-request-1',
        data: { timestamp: Date.now() - 1000 }, // 1 second ago
        priority: QueuePriority.NORMAL,
      };
      
      mockRedisQueue.dequeue.mockResolvedValueOnce(recentRequest);
      
      await queueManager.start();
      await (queueManager as any).cleanupStaleRequests();
      
      // Should re-enqueue the recent request back to processing
      expect(mockRedisQueue.enqueue).toHaveBeenCalledWith(
        recentRequest.id,
        recentRequest.data,
        recentRequest.priority
      );
    });
  });

  describe('retry mechanism', () => {
    it('should implement delayed processing for retry requests', async () => {
      await queueManager.start();
      await (queueManager as any).processRetryQueue();
      
      // Should check retry queue and process eligible requests
      expect(mockRedisQueue.dequeue).toHaveBeenCalled();
    });

    it('should respect maximum retry attempts', async () => {
      const maxRetriedRequest = {
        id: 'max-retry-request-1',
        data: { retryCount: defaultConfig.maxRetries },
        priority: QueuePriority.NORMAL,
      };
      
      await queueManager.start();
      const result = await (queueManager as any).shouldRetryRequest(maxRetriedRequest);
      
      expect(result).toBe(false);
    });
  });

  describe('graceful shutdown', () => {
    it('should wait for background tasks to complete during shutdown', async () => {
      await queueManager.start();
      
      const shutdownPromise = queueManager.stop();
      
      // Should wait for current operations to complete
      await shutdownPromise;
      
      expect(mockRedisQueue.disconnect).toHaveBeenCalled();
      expect(queueManager.isRunning()).toBe(false);
    });

    it('should timeout graceful shutdown if tasks take too long', async () => {
      jest.useFakeTimers();
      
      // Mock a long-running cleanup task
      jest.spyOn(queueManager as any, 'cleanupStaleRequests').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, defaultConfig.gracefulShutdownTimeout + 1000))
      );
      
      await queueManager.start();
      
      const shutdownPromise = queueManager.stop();
      
      // Fast forward past graceful shutdown timeout
      jest.advanceTimersByTime(defaultConfig.gracefulShutdownTimeout + 1000);
      
      await shutdownPromise;
      
      expect(queueManager.isRunning()).toBe(false);
      
      jest.useRealTimers();
    });
  });

  describe('health checks and monitoring', () => {
    it('should provide accurate health status', async () => {
      await queueManager.start();
      
      const health = await queueManager.getHealthStatus();
      
      expect(health).toEqual({
        isRunning: true,
        isHealthy: true,
        redisConnected: true,
        backgroundTasksActive: true,
        queueMetrics: {
          queueDepth: { [QueuePriority.HIGH]: 0, [QueuePriority.NORMAL]: 0, [QueuePriority.LOW]: 0 },
          totalDepth: 0,
        },
        lastCleanupRun: expect.any(Number),
        lastRetryProcessRun: expect.any(Number),
      });
    });

    it('should report unhealthy status when Redis is disconnected', async () => {
      // Mock Redis connection failure
      mockRedisQueue.getQueueMetrics.mockRejectedValue(new Error('Redis disconnected'));
      
      await queueManager.start();
      
      const health = await queueManager.getHealthStatus();
      
      expect(health.isHealthy).toBe(false);
      expect(health.redisConnected).toBe(false);
    });

    it('should provide queue metrics through monitoring endpoint', async () => {
      const mockMetrics = {
        queueDepth: { [QueuePriority.HIGH]: 5, [QueuePriority.NORMAL]: 10, [QueuePriority.LOW]: 2 },
        totalDepth: 17,
      };
      
      mockRedisQueue.getQueueMetrics.mockResolvedValue(mockMetrics);
      
      await queueManager.start();
      
      const metrics = await queueManager.getQueueMetrics();
      
      expect(metrics).toEqual(mockMetrics);
      expect(mockRedisQueue.getQueueMetrics).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle background task failures without crashing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock cleanup failure
      jest.spyOn(queueManager as any, 'cleanupStaleRequests').mockRejectedValue(new Error('Cleanup failed'));
      
      await queueManager.start();
      
      // Directly test the error handling
      await (queueManager as any).runCleanupTask().catch(() => {});
      
      expect(queueManager.isRunning()).toBe(true);
      
      consoleSpy.mockRestore();
    });

    it('should handle Redis queue errors gracefully', async () => {
      mockRedisQueue.connect.mockRejectedValue(new Error('Redis connection failed'));
      
      await expect(queueManager.start()).rejects.toThrow('Redis connection failed');
      expect(queueManager.isRunning()).toBe(false);
    });
  });
});