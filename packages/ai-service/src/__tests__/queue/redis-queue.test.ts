import { RedisQueue, QueuePriority } from '../../queue/redis-queue';
import { createClient } from 'redis';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisQueue', () => {
  let redisQueue: RedisQueue;
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isReady: true,
      lPush: jest.fn().mockResolvedValue(1),
      rPop: jest.fn().mockResolvedValue(null),
      lLen: jest.fn().mockResolvedValue(0),
      lRange: jest.fn().mockResolvedValue([]),
      on: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
    redisQueue = new RedisQueue({ url: 'redis://localhost:6379' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create Redis client with provided configuration', () => {
      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
      });
    });

    it('should connect to Redis on initialization', async () => {
      await redisQueue.connect();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should disconnect from Redis', async () => {
      await redisQueue.disconnect();
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('enqueue operations', () => {
    beforeEach(async () => {
      await redisQueue.connect();
    });

    it('should enqueue item to high priority queue', async () => {
      const requestId = 'req_123';
      const requestData = { id: requestId, prompt: 'test' };

      await redisQueue.enqueue(requestId, requestData, QueuePriority.HIGH);

      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'queue:priority:high',
        JSON.stringify({ id: requestId, data: requestData, priority: QueuePriority.HIGH })
      );
    });

    it('should enqueue item to normal priority queue', async () => {
      const requestId = 'req_456';
      const requestData = { id: requestId, prompt: 'test normal' };

      await redisQueue.enqueue(requestId, requestData, QueuePriority.NORMAL);

      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'queue:priority:normal',
        JSON.stringify({ id: requestId, data: requestData, priority: QueuePriority.NORMAL })
      );
    });

    it('should enqueue item to low priority queue', async () => {
      const requestId = 'req_789';
      const requestData = { id: requestId, prompt: 'test low' };

      await redisQueue.enqueue(requestId, requestData, QueuePriority.LOW);

      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'queue:priority:low',
        JSON.stringify({ id: requestId, data: requestData, priority: QueuePriority.LOW })
      );
    });

    it('should default to normal priority when not specified', async () => {
      const requestId = 'req_default';
      const requestData = { id: requestId, prompt: 'test default' };

      await redisQueue.enqueue(requestId, requestData);

      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'queue:priority:normal',
        JSON.stringify({ id: requestId, data: requestData, priority: QueuePriority.NORMAL })
      );
    });

    it('should throw error when Redis is not connected', async () => {
      mockRedisClient.isReady = false;

      await expect(
        redisQueue.enqueue('req_fail', { prompt: 'test' })
      ).rejects.toThrow('Redis client is not connected');
    });
  });

  describe('dequeue operations', () => {
    beforeEach(async () => {
      await redisQueue.connect();
    });

    it('should dequeue from high priority queue first', async () => {
      const highPriorityItem = JSON.stringify({
        id: 'req_high',
        data: { prompt: 'high priority' },
        priority: QueuePriority.HIGH
      });

      mockRedisClient.rPop
        .mockResolvedValueOnce(highPriorityItem)  // high priority queue has item
        .mockResolvedValueOnce(null)              // normal priority queue empty
        .mockResolvedValueOnce(null);             // low priority queue empty

      const result = await redisQueue.dequeue();

      expect(mockRedisClient.rPop).toHaveBeenCalledWith('queue:priority:high');
      expect(result).toEqual({
        id: 'req_high',
        data: { prompt: 'high priority' },
        priority: QueuePriority.HIGH
      });
    });

    it('should dequeue from normal priority when high is empty', async () => {
      const normalPriorityItem = JSON.stringify({
        id: 'req_normal',
        data: { prompt: 'normal priority' },
        priority: QueuePriority.NORMAL
      });

      mockRedisClient.rPop
        .mockResolvedValueOnce(null)                // high priority queue empty
        .mockResolvedValueOnce(normalPriorityItem)  // normal priority queue has item
        .mockResolvedValueOnce(null);               // low priority queue empty

      const result = await redisQueue.dequeue();

      expect(mockRedisClient.rPop).toHaveBeenCalledWith('queue:priority:high');
      expect(mockRedisClient.rPop).toHaveBeenCalledWith('queue:priority:normal');
      expect(result).toEqual({
        id: 'req_normal',
        data: { prompt: 'normal priority' },
        priority: QueuePriority.NORMAL
      });
    });

    it('should dequeue from low priority when high and normal are empty', async () => {
      const lowPriorityItem = JSON.stringify({
        id: 'req_low',
        data: { prompt: 'low priority' },
        priority: QueuePriority.LOW
      });

      mockRedisClient.rPop
        .mockResolvedValueOnce(null)             // high priority queue empty
        .mockResolvedValueOnce(null)             // normal priority queue empty
        .mockResolvedValueOnce(lowPriorityItem); // low priority queue has item

      const result = await redisQueue.dequeue();

      expect(mockRedisClient.rPop).toHaveBeenCalledWith('queue:priority:high');
      expect(mockRedisClient.rPop).toHaveBeenCalledWith('queue:priority:normal');
      expect(mockRedisClient.rPop).toHaveBeenCalledWith('queue:priority:low');
      expect(result).toEqual({
        id: 'req_low',
        data: { prompt: 'low priority' },
        priority: QueuePriority.LOW
      });
    });

    it('should return null when all queues are empty', async () => {
      mockRedisClient.rPop.mockResolvedValue(null);

      const result = await redisQueue.dequeue();

      expect(result).toBeNull();
      expect(mockRedisClient.rPop).toHaveBeenCalledTimes(3); // tried all three queues
    });

    it('should throw error when Redis is not connected', async () => {
      mockRedisClient.isReady = false;

      await expect(redisQueue.dequeue()).rejects.toThrow('Redis client is not connected');
    });
  });

  describe('queue metrics', () => {
    beforeEach(async () => {
      await redisQueue.connect();
    });

    it('should return queue depths for all priorities', async () => {
      mockRedisClient.lLen
        .mockResolvedValueOnce(5)  // high priority queue depth
        .mockResolvedValueOnce(10) // normal priority queue depth
        .mockResolvedValueOnce(2); // low priority queue depth

      const metrics = await redisQueue.getQueueMetrics();

      expect(mockRedisClient.lLen).toHaveBeenCalledWith('queue:priority:high');
      expect(mockRedisClient.lLen).toHaveBeenCalledWith('queue:priority:normal');
      expect(mockRedisClient.lLen).toHaveBeenCalledWith('queue:priority:low');
      
      expect(metrics).toEqual({
        queueDepth: {
          [QueuePriority.HIGH]: 5,
          [QueuePriority.NORMAL]: 10,
          [QueuePriority.LOW]: 2,
        },
        totalDepth: 17,
      });
    });

    it('should return total queue depth', async () => {
      mockRedisClient.lLen.mockResolvedValue(3);

      const totalDepth = await redisQueue.getTotalQueueDepth();

      expect(totalDepth).toBe(9); // 3 + 3 + 3 = 9
    });

    it('should return queue depth for specific priority', async () => {
      mockRedisClient.lLen.mockResolvedValue(7);

      const depth = await redisQueue.getQueueDepth(QueuePriority.HIGH);

      expect(mockRedisClient.lLen).toHaveBeenCalledWith('queue:priority:high');
      expect(depth).toBe(7);
    });
  });

  describe('queue status operations', () => {
    beforeEach(async () => {
      await redisQueue.connect();
    });

    it('should peek at next item without removing it', async () => {
      const highPriorityItems = [JSON.stringify({
        id: 'req_peek',
        data: { prompt: 'peek test' },
        priority: QueuePriority.HIGH
      })];

      mockRedisClient.lRange
        .mockResolvedValueOnce(highPriorityItems) // high priority queue has item
        .mockResolvedValueOnce([])                // normal priority queue empty
        .mockResolvedValueOnce([]);               // low priority queue empty

      const result = await redisQueue.peek();

      expect(mockRedisClient.lRange).toHaveBeenCalledWith('queue:priority:high', -1, -1);
      expect(result).toEqual({
        id: 'req_peek',
        data: { prompt: 'peek test' },
        priority: QueuePriority.HIGH
      });
    });

    it('should return null when peeking at empty queues', async () => {
      mockRedisClient.lRange.mockResolvedValue([]);

      const result = await redisQueue.peek();

      expect(result).toBeNull();
    });

    it('should handle malformed JSON during peek', async () => {
      mockRedisClient.lRange.mockResolvedValue(['invalid json']);

      await expect(redisQueue.peek()).rejects.toThrow('Failed to parse queue item');
    });

    it('should check if queue is empty', async () => {
      mockRedisClient.lLen.mockResolvedValue(0);

      const isEmpty = await redisQueue.isEmpty();

      expect(isEmpty).toBe(true);
    });

    it('should check if queue is not empty', async () => {
      mockRedisClient.lLen
        .mockResolvedValueOnce(0)  // high priority empty
        .mockResolvedValueOnce(1)  // normal priority has items
        .mockResolvedValueOnce(0); // low priority empty

      const isEmpty = await redisQueue.isEmpty();

      expect(isEmpty).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await redisQueue.connect();
    });

    it('should handle Redis connection errors', async () => {
      mockRedisClient.lPush.mockRejectedValue(new Error('Redis connection lost'));

      await expect(
        redisQueue.enqueue('req_error', { prompt: 'test' })
      ).rejects.toThrow('Redis connection lost');
    });

    it('should handle malformed JSON during dequeue', async () => {
      mockRedisClient.rPop.mockResolvedValue('invalid json');

      await expect(redisQueue.dequeue()).rejects.toThrow();
    });

    it('should handle Redis client errors gracefully', () => {
      const errorHandler = jest.fn();
      redisQueue.on('error', errorHandler);

      // Simulate Redis client error
      const errorCallback = mockRedisClient.on.mock.calls.find((call: any) => call[0] === 'error')[1];
      const error = new Error('Redis server error');
      errorCallback(error);

      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });
});