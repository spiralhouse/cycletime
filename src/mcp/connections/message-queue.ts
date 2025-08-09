/**
 * Message queuing and flow control for MCP client connections
 */

/**
 * Message priority levels
 */
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
}

/**
 * Generic message interface
 */
export interface Message {
  id: string;
  [key: string]: any;
}

/**
 * Queued message with metadata
 */
export interface QueuedMessage {
  message: Message;
  priority: MessagePriority;
  enqueuedAt: number;
}

/**
 * Queue operation result
 */
export interface QueueResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxSize?: number;
}

/**
 * Queue statistics
 */
export interface QueueStatistics {
  connectionId: string;
  currentSize: number;
  maxSize: number;
  totalEnqueued: number;
  totalDequeued: number;
  averageWaitTime: number;
  priorityDistribution: {
    low: number;
    normal: number;
    high: number;
  };
}

/**
 * Priority-based message queue with flow control
 */
export class MessageQueue {
  private connectionId: string;
  private messages: QueuedMessage[] = [];
  private messageMap: Map<string, number> = new Map(); // message ID -> index
  private maxSize: number;
  private totalEnqueued: number = 0;
  private totalDequeued: number = 0;
  private totalWaitTime: number = 0;

  constructor(connectionId: string, config: QueueConfig = {}) {
    this.connectionId = connectionId;
    this.maxSize = config.maxSize ?? 100;
  }

  /**
   * Get connection ID
   */
  getConnectionId(): string {
    return this.connectionId;
  }

  /**
   * Get maximum queue size
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.messages.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.messages.length === 0;
  }

  /**
   * Check if queue is full
   */
  isFull(): boolean {
    return this.messages.length >= this.maxSize;
  }

  /**
   * Enqueue a message with priority
   */
  enqueue(message: Message, priority: MessagePriority = MessagePriority.NORMAL): QueueResult {
    if (this.isFull()) {
      return {
        success: false,
        error: `Queue is full (max size: ${this.maxSize})`,
      };
    }

    if (this.messageMap.has(message.id)) {
      return {
        success: false,
        error: `Message with ID '${message.id}' already exists in queue`,
      };
    }

    const queuedMessage: QueuedMessage = {
      message,
      priority,
      enqueuedAt: Date.now(),
    };

    // Insert message in priority order (high to low)
    const insertIndex = this.findInsertIndex(priority);

    this.messages.splice(insertIndex, 0, queuedMessage);

    // Update mapping
    this.updateMessageMap();
    this.totalEnqueued++;

    return { success: true };
  }

  /**
   * Dequeue the highest priority message
   */
  dequeue(): QueuedMessage | null {
    if (this.isEmpty()) {
      return null;
    }

    const queuedMessage = this.messages.shift()!;

    this.updateMessageMap();

    // Track wait time
    const waitTime = Date.now() - queuedMessage.enqueuedAt;

    this.totalWaitTime += waitTime;
    this.totalDequeued++;

    return queuedMessage;
  }

  /**
   * Peek at the next message without removing it
   */
  peek(): QueuedMessage | null {
    return this.messages[0] || null;
  }

  /**
   * Remove a specific message by ID
   */
  remove(messageId: string): QueueResult<QueuedMessage> {
    const index = this.messageMap.get(messageId);

    if (index === undefined) {
      return {
        success: false,
        error: `Message not found: ${messageId}`,
      };
    }

    const queuedMessage = this.messages[index];

    this.messages.splice(index, 1);
    this.updateMessageMap();

    return {
      success: true,
      data: queuedMessage as QueuedMessage,
    };
  }

  /**
   * Check if a message exists in the queue
   */
  has(messageId: string): boolean {
    return this.messageMap.has(messageId);
  }

  /**
   * Clear all messages from the queue
   */
  clear(): void {
    this.messages = [];
    this.messageMap.clear();
  }

  /**
   * Reset queue statistics (for testing)
   */
  reset(): void {
    this.clear();
    this.totalEnqueued = 0;
    this.totalDequeued = 0;
    this.totalWaitTime = 0;
  }

  /**
   * Get all messages without modifying the queue
   */
  getAll(): QueuedMessage[] {
    return [...this.messages];
  }

  /**
   * Get messages older than the specified threshold (in milliseconds)
   */
  getAgedMessages(ageThreshold: number): QueuedMessage[] {
    const cutoffTime = Date.now() - ageThreshold;

    return this.messages.filter(msg => msg.enqueuedAt < cutoffTime);
  }

  /**
   * Remove messages that have exceeded the timeout threshold
   */
  removeTimedOutMessages(timeout: number): QueuedMessage[] {
    const cutoffTime = Date.now() - timeout;
    const timedOutMessages: QueuedMessage[] = [];

    // Filter out timed out messages
    this.messages = this.messages.filter(msg => {
      if (msg.enqueuedAt < cutoffTime) {
        timedOutMessages.push(msg);

        return false;
      }

      return true;
    });

    // Update mapping
    this.updateMessageMap();

    return timedOutMessages;
  }

  /**
   * Get comprehensive queue statistics
   */
  getStatistics(): QueueStatistics {
    const priorityDistribution = this.messages.reduce(
      (dist, msg) => {
        switch (msg.priority) {
          case MessagePriority.LOW:
            dist.low++;
            break;

          case MessagePriority.NORMAL:
            dist.normal++;
            break;

          case MessagePriority.HIGH:
            dist.high++;
            break;
        }

        return dist;
      },
      { low: 0, normal: 0, high: 0 }
    );

    const averageWaitTime = this.totalDequeued > 0 ? this.totalWaitTime / this.totalDequeued : 0;

    return {
      connectionId: this.connectionId,
      currentSize: this.size(),
      maxSize: this.maxSize,
      totalEnqueued: this.totalEnqueued,
      totalDequeued: this.totalDequeued,
      averageWaitTime,
      priorityDistribution,
    };
  }

  /**
   * Find the correct insertion index for a message based on priority
   */
  private findInsertIndex(priority: MessagePriority): number {
    for (let i = 0; i < this.messages.length; i++) {
      const message = this.messages[i];

      if (message && message.priority < priority) {
        return i;
      }
    }

    return this.messages.length;
  }

  /**
   * Update the message ID to index mapping
   */
  private updateMessageMap(): void {
    this.messageMap.clear();
    this.messages.forEach((msg, index) => {
      this.messageMap.set(msg.message.id, index);
    });
  }
}
