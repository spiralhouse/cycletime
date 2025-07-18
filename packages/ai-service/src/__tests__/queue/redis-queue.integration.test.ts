import { RedisQueue, QueuePriority } from '../../queue/redis-queue';
import { createClient } from 'redis';

describe('RedisQueue Integration Tests', () => {
  let redisQueue: RedisQueue;
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
    // Use highly unique key prefix for test isolation - avoid flushAll to prevent interference with parallel tests
    keyPrefix = `test-queue-${Date.now()}-${process.pid}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(Math.random() * 1000000)}`;
    
    redisQueue = new RedisQueue({ 
      url: redisUrl,
      keyPrefix: keyPrefix
    });
    await redisQueue.connect();
    
    // Clean up only keys with our specific prefix
    const keys = await testClient.keys(`${keyPrefix}:*`);
    if (keys.length > 0) {
      await testClient.del(keys);
    }
  });

  afterEach(async () => {
    if (redisQueue) {
      await redisQueue.disconnect();
      
      // Clean up any test data
      const keys = await testClient.keys(`${keyPrefix}:*`);
      if (keys.length > 0) {
        await testClient.del(keys);
      }
    }
  });

  describe('Real Redis Operations', () => {
    it('should connect to Redis successfully', async () => {
      expect(redisQueue).toBeDefined();
      
      // Verify connection by getting queue metrics
      const metrics = await redisQueue.getQueueMetrics();
      expect(metrics).toEqual({
        queueDepth: {
          [QueuePriority.HIGH]: 0,
          [QueuePriority.NORMAL]: 0,
          [QueuePriority.LOW]: 0,
        },
        totalDepth: 0,
      });
    });

    it('should enqueue and dequeue items in priority order', async () => {

      // Enqueue items in different priorities
      await redisQueue.enqueue('low-1', { content: 'low priority' }, QueuePriority.LOW);
      await redisQueue.enqueue('normal-1', { content: 'normal priority' }, QueuePriority.NORMAL);
      await redisQueue.enqueue('high-1', { content: 'high priority' }, QueuePriority.HIGH);

      // Add delay to ensure Redis operations are committed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify queue metrics
      const metrics = await redisQueue.getQueueMetrics();
      expect(metrics.totalDepth).toBe(3);
      expect(metrics.queueDepth[QueuePriority.HIGH]).toBe(1);
      expect(metrics.queueDepth[QueuePriority.NORMAL]).toBe(1);
      expect(metrics.queueDepth[QueuePriority.LOW]).toBe(1);

      // Dequeue items - should come out in priority order
      const first = await redisQueue.dequeue();
      expect(first?.id).toBe('high-1');
      expect(first?.priority).toBe(QueuePriority.HIGH);

      const second = await redisQueue.dequeue();
      expect(second?.id).toBe('normal-1');
      expect(second?.priority).toBe(QueuePriority.NORMAL);

      const third = await redisQueue.dequeue();
      expect(third?.id).toBe('low-1');
      expect(third?.priority).toBe(QueuePriority.LOW);

      // Queue should be empty
      const fourth = await redisQueue.dequeue();
      expect(fourth).toBeNull();
    });

    it('should persist data across connections', async () => {

      // Enqueue an item
      await redisQueue.enqueue('persist-test', { data: 'persistent data' }, QueuePriority.NORMAL);
      
      // Disconnect and reconnect
      await redisQueue.disconnect();
      
      const newRedisQueue = new RedisQueue({ 
        url: redisUrl,
        keyPrefix: keyPrefix
      });
      await newRedisQueue.connect();

      // Item should still be there
      const item = await newRedisQueue.dequeue();
      expect(item?.id).toBe('persist-test');
      expect(item?.data).toEqual({ data: 'persistent data' });

      await newRedisQueue.disconnect();
    });

    it('should handle concurrent operations correctly', async () => {
      // Create multiple enqueue operations concurrently
      const enqueuePromises = Array.from({ length: 10 }, (_, i) =>
        redisQueue.enqueue(`concurrent-${i}`, { index: i }, QueuePriority.NORMAL)
      );

      await Promise.all(enqueuePromises);

      // Wait for Redis operations to fully commit and verify multiple times if needed
      let metrics;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        await new Promise(resolve => setTimeout(resolve, 50));
        metrics = await redisQueue.getQueueMetrics();
        attempts++;
      } while (metrics.totalDepth !== 10 && attempts < maxAttempts);

      // Log debugging info if still failing
      if (metrics.totalDepth !== 10) {
        console.error(`Expected 10 items, got ${metrics.totalDepth} after ${attempts} attempts. Key prefix: ${keyPrefix}`);
        console.error('Metrics:', metrics);
        
        // Check if items exist directly in Redis
        const queueKey = `${keyPrefix}:priority:normal`;
        const queueLength = await testClient.lLen(queueKey);
        console.error(`Direct Redis queue length for ${queueKey}:`, queueLength);
      }

      // Verify all items were enqueued
      expect(metrics.totalDepth).toBe(10);

      // Dequeue all items with proper error handling
      const items = [];
      for (let i = 0; i < 10; i++) {
        const item = await redisQueue.dequeue();
        if (item) {
          items.push(item);
        }
      }

      expect(items).toHaveLength(10);
      expect(items.map(item => item.id).sort()).toEqual(
        Array.from({ length: 10 }, (_, i) => `concurrent-${i}`).sort()
      );
    });

    it('should handle FIFO order within same priority', async () => {

      // Enqueue multiple items with same priority
      await redisQueue.enqueue('first', { order: 1 }, QueuePriority.NORMAL);
      await redisQueue.enqueue('second', { order: 2 }, QueuePriority.NORMAL);
      await redisQueue.enqueue('third', { order: 3 }, QueuePriority.NORMAL);

      // Should dequeue in FIFO order
      const first = await redisQueue.dequeue();
      expect(first?.id).toBe('first');

      const second = await redisQueue.dequeue();
      expect(second?.id).toBe('second');

      const third = await redisQueue.dequeue();
      expect(third?.id).toBe('third');
    });

    it('should handle large payloads correctly', async () => {

      // Create a large payload
      const largeData = {
        content: 'x'.repeat(1000),
        metadata: {
          items: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }))
        }
      };

      await redisQueue.enqueue('large-payload', largeData, QueuePriority.NORMAL);

      const item = await redisQueue.dequeue();
      expect(item?.id).toBe('large-payload');
      expect(item?.data).toEqual(largeData);
    });
  });

  describe('Error Handling with Real Redis', () => {
    it('should handle Redis connection errors gracefully', async () => {

      // Create queue with invalid URL
      const invalidQueue = new RedisQueue({ url: 'redis://invalid-host:6379' });
      
      await expect(invalidQueue.connect()).rejects.toThrow();
    });

    it('should detect when Redis is disconnected', async () => {

      // Disconnect Redis
      await redisQueue.disconnect();

      // Operations should fail
      await expect(redisQueue.enqueue('test', { data: 'test' })).rejects.toThrow('Redis client is not connected');
      await expect(redisQueue.dequeue()).rejects.toThrow('Redis client is not connected');
      await expect(redisQueue.getQueueMetrics()).rejects.toThrow('Redis client is not connected');
    });
  });
});