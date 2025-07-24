import { QueueManager } from '../../queue/queue-manager';
import { createClient } from 'redis';

describe('QueueManager Integration Tests', () => {
  let queueManager: QueueManager;
  let testClient: any;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  beforeAll(async () => {
    if (isCI) {
      console.log('Skipping QueueManager integration tests in CI environment');
      return;
    }

    // Create a test client to verify Redis is available
    testClient = createClient({ url: redisUrl });
    
    try {
      await testClient.connect();
      await testClient.ping();
    } catch (error) {
      console.log('Skipping QueueManager integration tests - Redis not available:', error instanceof Error ? error.message : String(error));
      return;
    }
  });

  afterAll(async () => {
    if (testClient?.isReady) {
      await testClient.disconnect();
    }
  });

  beforeEach(async () => {
    if (!testClient?.isReady || isCI) {
      return; // Skip if Redis not available or running in CI
    }

    // Clean up any existing test data
    await testClient.flushAll();
    
    queueManager = new QueueManager({
      redisUrl,
      keyPrefix: 'test-queue-manager',
      cleanupInterval: 100, // Short interval for testing
      staleRequestTimeout: 1000, // Short timeout for testing
      retryDelay: 100, // Short delay for testing
    });
  });

  afterEach(async () => {
    if (queueManager && testClient?.isReady) {
      await queueManager.stop();
    }
  });

  describe('Real Redis Integration', () => {
    it('should start and connect to Redis successfully', async () => {
      if (!testClient?.isReady || isCI) {
        console.log('Skipping QueueManager Redis connection test - Redis not available');
        return;
      }

      await queueManager.start();
      
      expect(queueManager.isRunning()).toBe(true);
      
      const health = await queueManager.getHealthStatus();
      expect(health.isRunning).toBe(true);
      expect(health.isHealthy).toBe(true);
      expect(health.redisConnected).toBe(true);
    });

    it('should provide accurate queue metrics with real Redis', async () => {
      if (!testClient?.isReady || isCI) {
        console.log('Skipping QueueManager metrics test - Redis not available');
        return;
      }

      await queueManager.start();
      
      // Initially should have empty metrics
      const initialMetrics = await queueManager.getQueueMetrics();
      expect(initialMetrics.totalDepth).toBe(0);

      // Add some items to the queue using direct Redis operations
      await testClient.lPush('test-queue-manager:priority:high', JSON.stringify({
        id: 'test-high',
        data: { content: 'high priority' },
        priority: 'high'
      }));
      
      await testClient.lPush('test-queue-manager:priority:normal', JSON.stringify({
        id: 'test-normal',
        data: { content: 'normal priority' },
        priority: 'normal'
      }));

      // Metrics should reflect the added items
      const updatedMetrics = await queueManager.getQueueMetrics();
      expect(updatedMetrics.totalDepth).toBe(2);
      expect(updatedMetrics.queueDepth.high).toBe(1);
      expect(updatedMetrics.queueDepth.normal).toBe(1);
      expect(updatedMetrics.queueDepth.low).toBe(0);
    });

    it('should handle background tasks with real Redis', async () => {
      if (!testClient?.isReady || isCI) {
        console.log('Skipping QueueManager background tasks test - Redis not available');
        return;
      }

      await queueManager.start();
      
      // Add a stale request directly to Redis
      const staleTimestamp = Date.now() - 2000; // 2 seconds ago (older than stale timeout)
      await testClient.lPush('test-queue-manager:priority:normal', JSON.stringify({
        id: 'stale-request',
        data: { timestamp: staleTimestamp },
        priority: 'normal'
      }));

      // Wait for cleanup task to run
      await new Promise(resolve => setTimeout(resolve, 200));

      // The stale request should be processed by cleanup
      const health = await queueManager.getHealthStatus();
      expect(health.lastCleanupRun).toBeGreaterThan(0);
      expect(health.lastRetryProcessRun).toBeGreaterThan(0);
    });

    it('should handle graceful shutdown with real Redis', async () => {
      if (!testClient?.isReady || isCI) {
        console.log('Skipping QueueManager graceful shutdown test - Redis not available');
        return;
      }

      await queueManager.start();
      expect(queueManager.isRunning()).toBe(true);

      // Stop should complete gracefully
      await queueManager.stop();
      expect(queueManager.isRunning()).toBe(false);

      // Health check should reflect stopped state
      const health = await queueManager.getHealthStatus();
      expect(health.isRunning).toBe(false);
      expect(health.isHealthy).toBe(false);
    });

    it('should handle Redis connection failures gracefully', async () => {
      if (!testClient?.isReady || isCI) {
        console.log('Skipping QueueManager connection failure test - Redis not available');
        return;
      }

      // Create queue manager with invalid Redis URL
      const invalidQueueManager = new QueueManager({
        redisUrl: 'redis://invalid-host:6379',
        keyPrefix: 'test-invalid',
      });

      await expect(invalidQueueManager.start()).rejects.toThrow();
      expect(invalidQueueManager.isRunning()).toBe(false);
    });

    it('should report unhealthy when Redis connection is lost', async () => {
      if (!testClient?.isReady || isCI) {
        console.log('Skipping QueueManager Redis connection loss test - Redis not available');
        return;
      }

      await queueManager.start();
      
      // Verify initial healthy state
      let health = await queueManager.getHealthStatus();
      expect(health.isHealthy).toBe(true);
      expect(health.redisConnected).toBe(true);

      // Stop Redis (simulate connection loss)
      await queueManager.stop();
      
      // Create new manager to test connection failure
      const newManager = new QueueManager({
        redisUrl: 'redis://localhost:9999', // Invalid port
        keyPrefix: 'test-connection-loss',
      });

      try {
        await newManager.start();
      } catch (error) {
        // Expected to fail
      }

      // Health should indicate disconnected state
      health = await newManager.getHealthStatus();
      expect(health.isHealthy).toBe(false);
    });
  });

  describe('Performance with Real Redis', () => {
    it('should handle high throughput operations', async () => {
      if (!testClient?.isReady || isCI) {
        console.log('Skipping QueueManager performance test - Redis not available');
        return;
      }

      await queueManager.start();
      
      const startTime = Date.now();
      
      // Add many items to the queue
      const promises = Array.from({ length: 100 }, (_, i) =>
        testClient.lPush('test-queue-manager:priority:normal', JSON.stringify({
          id: `perf-test-${i}`,
          data: { index: i },
          priority: 'normal'
        }))
      );

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify all items were added
      const metrics = await queueManager.getQueueMetrics();
      expect(metrics.totalDepth).toBe(100);
    });
  });
});