import { createClient, RedisClientType } from 'redis';
import { EventEmitter } from 'events';

export enum QueuePriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

export interface QueueItem<T = any> {
  id: string;
  data: T;
  priority: QueuePriority;
}

export interface QueueMetrics {
  queueDepth: Record<QueuePriority, number>;
  totalDepth: number;
}

export interface RedisQueueConfig {
  url: string;
  keyPrefix?: string;
}

export class RedisQueue extends EventEmitter {
  private client: RedisClientType;
  private keyPrefix: string;

  constructor(config: RedisQueueConfig) {
    super();
    this.keyPrefix = config.keyPrefix || 'queue';
    this.client = createClient({
      url: config.url,
    });

    // Forward Redis client errors
    this.client.on('error', (error) => {
      this.emit('error', error);
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  private ensureConnected(): void {
    if (!this.client.isReady) {
      throw new Error('Redis client is not connected');
    }
  }

  private getQueueKey(priority: QueuePriority): string {
    return `${this.keyPrefix}:priority:${priority}`;
  }

  async enqueue<T>(
    id: string,
    data: T,
    priority: QueuePriority = QueuePriority.NORMAL
  ): Promise<void> {
    this.ensureConnected();

    const queueItem: QueueItem<T> = {
      id,
      data,
      priority,
    };

    const queueKey = this.getQueueKey(priority);
    await this.client.lPush(queueKey, JSON.stringify(queueItem));
  }

  async dequeue<T>(): Promise<QueueItem<T> | null> {
    this.ensureConnected();

    // Try queues in priority order: HIGH -> NORMAL -> LOW
    const priorities = [QueuePriority.HIGH, QueuePriority.NORMAL, QueuePriority.LOW];

    for (const priority of priorities) {
      const queueKey = this.getQueueKey(priority);
      const item = await this.client.rPop(queueKey);

      if (item) {
        try {
          return JSON.parse(item) as QueueItem<T>;
        } catch (error) {
          throw new Error(`Failed to parse queue item: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return null;
  }

  async peek<T>(): Promise<QueueItem<T> | null> {
    this.ensureConnected();

    // Try queues in priority order: HIGH -> NORMAL -> LOW
    const priorities = [QueuePriority.HIGH, QueuePriority.NORMAL, QueuePriority.LOW];

    for (const priority of priorities) {
      const queueKey = this.getQueueKey(priority);
      const items = await this.client.lRange(queueKey, -1, -1);

      if (items.length > 0) {
        try {
          return JSON.parse(items[0]) as QueueItem<T>;
        } catch (error) {
          throw new Error(`Failed to parse queue item: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return null;
  }

  async getQueueDepth(priority: QueuePriority): Promise<number> {
    this.ensureConnected();
    
    const queueKey = this.getQueueKey(priority);
    return await this.client.lLen(queueKey);
  }

  async getTotalQueueDepth(): Promise<number> {
    this.ensureConnected();

    const priorities = [QueuePriority.HIGH, QueuePriority.NORMAL, QueuePriority.LOW];
    let totalDepth = 0;

    for (const priority of priorities) {
      totalDepth += await this.getQueueDepth(priority);
    }

    return totalDepth;
  }

  async getQueueMetrics(): Promise<QueueMetrics> {
    this.ensureConnected();

    const priorities = [QueuePriority.HIGH, QueuePriority.NORMAL, QueuePriority.LOW];
    const queueDepth: Record<QueuePriority, number> = {} as Record<QueuePriority, number>;
    let totalDepth = 0;

    for (const priority of priorities) {
      const depth = await this.getQueueDepth(priority);
      queueDepth[priority] = depth;
      totalDepth += depth;
    }

    return {
      queueDepth,
      totalDepth,
    };
  }

  async isEmpty(): Promise<boolean> {
    const totalDepth = await this.getTotalQueueDepth();
    return totalDepth === 0;
  }
}