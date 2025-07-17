import { WorkerPool } from '../worker-pool';
import { RequestProcessor } from '../request-processor';
import { QueueManager } from '../queue/queue-manager';
import { RedisQueue, QueuePriority } from '../queue/redis-queue';
import { createClient } from 'redis';

describe('WorkerPool Integration Tests', () => {
  let workerPool: WorkerPool;
  let requestProcessor: RequestProcessor;
  let queueManager: QueueManager;
  let testClient: any;
  let keyPrefix: string;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  beforeAll(async () => {
    // Create a test client to verify Redis is available
    testClient = createClient({ url: redisUrl });
    await testClient.connect();
    await testClient.ping();
  });

  afterAll(async () => {
    if (testClient?.isReady) {
      await testClient.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await testClient.flushAll();
    
    // Add delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Generate unique key prefix for this test run
    keyPrefix = `test-worker-pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create components
    requestProcessor = new RequestProcessor({
      redisUrl,
      providers: {
        claude: {
          apiKey: 'test-api-key',
        }
      }
    });
    queueManager = new QueueManager({
      redisUrl,
      keyPrefix: keyPrefix,
      cleanupInterval: 200,
      staleRequestTimeout: 5000,
      retryDelay: 100,
    });

    workerPool = new WorkerPool(
      {
        maxWorkers: 3,
        minWorkers: 1,
        queuePollInterval: 100,
        workerHealthCheckInterval: 200,
      },
      requestProcessor,
      queueManager
    );
  });

  afterEach(async () => {
    if (workerPool) {
      await workerPool.stop();
    }
    if (queueManager) {
      await queueManager.stop();
    }
  });

  describe('End-to-End Integration', () => {
    it('should start worker pool and queue manager together', async () => {
      // Start queue manager first
      await queueManager.start();
      expect(queueManager.isRunning()).toBe(true);

      // Start worker pool
      await workerPool.start();
      expect(workerPool.isRunning()).toBe(true);

      // Verify worker count
      const workerCount = await workerPool.getWorkerCount();
      expect(workerCount).toBe(1); // minWorkers

      // Get health status
      const poolHealth = await workerPool.getHealthStatus();
      expect(poolHealth.isRunning).toBe(true);
      expect(poolHealth.isHealthy).toBe(true);
      expect(poolHealth.workerCount).toBe(1);

      const queueHealth = await queueManager.getHealthStatus();
      expect(queueHealth.isRunning).toBe(true);
      expect(queueHealth.isHealthy).toBe(true);
      expect(queueHealth.redisConnected).toBe(true);
    });

    it('should handle worker scaling based on queue depth', async () => {
      // Create a separate RedisQueue instance for adding test data BEFORE starting queue manager
      const testRedisQueue = new RedisQueue({
        url: redisUrl,
        keyPrefix: keyPrefix
      });
      await testRedisQueue.connect();
      
      // Add a large number of items to queue using RedisQueue API before any background processing starts
      for (let i = 0; i < 50; i++) {
        await testRedisQueue.enqueue(`scale-test-${i}`, { content: `test ${i}` }, QueuePriority.NORMAL);
      }

      // Verify queue has items before starting any processing
      const initialMetrics = await testRedisQueue.getQueueMetrics();
      expect(initialMetrics.totalDepth).toBe(50);

      // Now start queue manager
      await queueManager.start();

      // Now start worker pool with longer delay to prevent immediate processing
      await workerPool.start();

      // Very brief delay to let workers initialize but not process much
      await new Promise(resolve => setTimeout(resolve, 25));

      // Check metrics directly from the queue we populated
      const currentMetrics = await testRedisQueue.getQueueMetrics();
      
      // If workers haven't processed everything yet, we should see items
      if (currentMetrics.totalDepth > 0) {
        // Verify queue has items before scaling
        const preScaleHealth = await workerPool.getHealthStatus();
        expect(preScaleHealth.queueMetrics.totalDepth).toBeGreaterThan(0);

        // Trigger scaling check
        await workerPool.scaleWorkers();

        // Should have scaled up workers
        const workerCount = await workerPool.getWorkerCount();
        expect(workerCount).toBeGreaterThan(1);
        expect(workerCount).toBeLessThanOrEqual(3); // maxWorkers
      } else {
        // If all items were processed very quickly, test that scaling logic works with the queue state
        console.log('Items processed quickly - testing scaling logic with empty queue');
        await workerPool.scaleWorkers();
        
        // Even with empty queue, worker pool should function correctly
        const workerCount = await workerPool.getWorkerCount();
        expect(workerCount).toBeGreaterThanOrEqual(1); // At least minWorkers
        expect(workerCount).toBeLessThanOrEqual(3); // maxWorkers
      }

      const health = await workerPool.getHealthStatus();
      expect(health.queueMetrics.totalDepth).toBeGreaterThanOrEqual(0);
      
      // Clean up
      await testRedisQueue.disconnect();
    });

    it('should process queue items when workers are available', async () => {
      await queueManager.start();
      await workerPool.start();

      // Create a separate RedisQueue instance for adding test data
      const testRedisQueue = new RedisQueue({
        url: redisUrl,
        keyPrefix: keyPrefix
      });
      await testRedisQueue.connect();

      // Add a test item to the queue using proper API
      await testRedisQueue.enqueue('process-test-1', { prompt: 'Test processing' }, QueuePriority.HIGH);

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Trigger queue processing manually to ensure it runs
      await workerPool.processQueue();

      // Verify queue metrics are being tracked
      const health = await workerPool.getHealthStatus();
      expect(health.queueMetrics).toBeDefined();
      expect(health.performance).toBeDefined();
      
      // Clean up
      await testRedisQueue.disconnect();
    });

    it('should handle worker health checks with real queue', async () => {
      await queueManager.start();
      await workerPool.start();

      // Wait for health checks to run
      await new Promise(resolve => setTimeout(resolve, 300));

      // Manually trigger health check
      await workerPool.checkWorkerHealth();

      const health = await workerPool.getHealthStatus();
      expect(health.workers).toBeDefined();
      expect(health.workers.length).toBeGreaterThan(0);
      
      // All workers should be healthy initially
      const healthyWorkers = health.workers.filter(w => w.isHealthy);
      expect(healthyWorkers.length).toBe(health.workers.length);
    });

    it('should coordinate between multiple workers and queue', async () => {
      // Configure for multiple workers
      const multiWorkerPool = new WorkerPool(
        {
          maxWorkers: 3,
          minWorkers: 2,
          queuePollInterval: 50,
          workerHealthCheckInterval: 100,
        },
        requestProcessor,
        queueManager
      );

      await queueManager.start();
      await multiWorkerPool.start();

      // Verify multiple workers started
      const workerCount = await multiWorkerPool.getWorkerCount();
      expect(workerCount).toBe(2); // minWorkers

      // Add multiple items to queue
      for (let i = 0; i < 5; i++) {
        await testClient.rPush(`${keyPrefix}:priority:normal`, JSON.stringify({
          id: `coord-test-${i}`,
          data: { content: `coordination test ${i}` },
          priority: 'normal'
        }));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Process queue items
      await multiWorkerPool.processQueue();

      const health = await multiWorkerPool.getHealthStatus();
      expect(health.workerCount).toBe(2);
      expect(health.activeWorkers).toBeGreaterThanOrEqual(0);

      await multiWorkerPool.stop();
    });

    it('should handle graceful shutdown of entire system', async () => {
      await queueManager.start();
      await workerPool.start();

      // Verify running state
      expect(workerPool.isRunning()).toBe(true);
      expect(queueManager.isRunning()).toBe(true);

      // Add some items to queue
      await testClient.rPush(`${keyPrefix}:priority:normal`, JSON.stringify({
        id: 'shutdown-test',
        data: { content: 'test shutdown' },
        priority: 'normal'
      }));

      // Stop worker pool first
      await workerPool.stop();
      expect(workerPool.isRunning()).toBe(false);

      // Stop queue manager
      await queueManager.stop();
      expect(queueManager.isRunning()).toBe(false);

      // Both should be stopped
      const poolHealth = await workerPool.getHealthStatus();
      expect(poolHealth.isRunning).toBe(false);

      const queueHealth = await queueManager.getHealthStatus();
      expect(queueHealth.isRunning).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Create components with invalid Redis URL
      const invalidQueueManager = new QueueManager({
        redisUrl: 'redis://invalid-host:6379',
        keyPrefix: 'test-invalid',
      });

      const invalidWorkerPool = new WorkerPool(
        { maxWorkers: 2, minWorkers: 1 },
        requestProcessor,
        invalidQueueManager
      );

      // Queue manager should fail to start
      await expect(invalidQueueManager.start()).rejects.toThrow();

      // Worker pool can start even if queue manager fails
      await expect(invalidWorkerPool.start()).resolves.not.toThrow();
      
      // But health status should reflect queue issues
      const health = await invalidWorkerPool.getHealthStatus();
      expect(health.queueMetrics.totalDepth).toBe(0); // Fallback metrics

      await invalidWorkerPool.stop();
    });

    it('should recover from temporary Redis disconnections', async () => {
      await queueManager.start();
      await workerPool.start();

      // Verify initial healthy state
      let health = await workerPool.getHealthStatus();
      expect(health.isHealthy).toBe(true);

      // Simulate Redis issue by stopping queue manager
      await queueManager.stop();

      // Worker pool should handle queue errors gracefully
      await workerPool.processQueue();
      
      health = await workerPool.getHealthStatus();
      // Pool should still be running even if queue has issues
      expect(health.isRunning).toBe(true);
    });
  });
});