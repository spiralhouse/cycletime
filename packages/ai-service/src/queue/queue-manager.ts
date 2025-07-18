import { RedisQueue, QueuePriority, QueueItem, QueueMetrics } from './redis-queue';

interface RequestData {
  timestamp?: number;
  lastAttempt?: number;
  retryCount?: number;
  [key: string]: any;
}

// Default configuration constants
const DEFAULT_CONFIG = {
  CLEANUP_INTERVAL: 60000, // 1 minute
  STALE_REQUEST_TIMEOUT: 300000, // 5 minutes
  RETRY_DELAY: 30000, // 30 seconds
  MAX_RETRIES: 3,
  GRACEFUL_SHUTDOWN_TIMEOUT: 10000, // 10 seconds
  KEY_PREFIX: 'queue',
} as const;

export interface QueueManagerConfig {
  redisUrl: string;
  cleanupInterval?: number;
  staleRequestTimeout?: number;
  retryDelay?: number;
  maxRetries?: number;
  gracefulShutdownTimeout?: number;
  keyPrefix?: string;
}

export interface HealthStatus {
  isRunning: boolean;
  isHealthy: boolean;
  redisConnected: boolean;
  backgroundTasksActive: boolean;
  queueMetrics: QueueMetrics;
  lastCleanupRun: number;
  lastRetryProcessRun: number;
}

export class QueueManager {
  private redisQueue: RedisQueue;
  private config: Required<QueueManagerConfig>;
  private running: boolean = false;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private lastCleanupRun: number = 0;
  private lastRetryProcessRun: number = 0;
  private shutdownPromise: Promise<void> | null = null;
  private initialTasks: Promise<void>[] = [];

  constructor(config: QueueManagerConfig) {
    this.config = {
      redisUrl: config.redisUrl,
      cleanupInterval: config.cleanupInterval ?? DEFAULT_CONFIG.CLEANUP_INTERVAL,
      staleRequestTimeout: config.staleRequestTimeout ?? DEFAULT_CONFIG.STALE_REQUEST_TIMEOUT,
      retryDelay: config.retryDelay ?? DEFAULT_CONFIG.RETRY_DELAY,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.MAX_RETRIES,
      gracefulShutdownTimeout: config.gracefulShutdownTimeout ?? DEFAULT_CONFIG.GRACEFUL_SHUTDOWN_TIMEOUT,
      keyPrefix: config.keyPrefix ?? DEFAULT_CONFIG.KEY_PREFIX,
    };

    this.redisQueue = new RedisQueue({
      url: this.config.redisUrl,
      keyPrefix: this.config.keyPrefix,
    });
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      await this.redisQueue.connect();
      this.running = true;
      this.startBackgroundTasks();
    } catch (error) {
      this.running = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.stopBackgroundTasks();

    // Create graceful shutdown promise
    this.shutdownPromise = this.gracefulShutdown();
    await this.shutdownPromise;
  }

  isRunning(): boolean {
    return this.running;
  }

  async getHealthStatus(): Promise<HealthStatus> {
    let queueMetrics: QueueMetrics;
    let redisConnected = true;

    try {
      queueMetrics = await this.redisQueue.getQueueMetrics();
    } catch (error) {
      redisConnected = false;
      queueMetrics = {
        queueDepth: {
          [QueuePriority.HIGH]: 0,
          [QueuePriority.NORMAL]: 0,
          [QueuePriority.LOW]: 0,
        },
        totalDepth: 0,
      };
    }

    return {
      isRunning: this.running,
      isHealthy: this.running && redisConnected,
      redisConnected,
      backgroundTasksActive: this.cleanupTimer !== null && this.retryTimer !== null,
      queueMetrics,
      lastCleanupRun: this.lastCleanupRun,
      lastRetryProcessRun: this.lastRetryProcessRun,
    };
  }

  async getQueueMetrics(): Promise<QueueMetrics> {
    return await this.redisQueue.getQueueMetrics();
  }

  private startBackgroundTasks(): void {
    // Start cleanup task
    this.cleanupTimer = setInterval(() => {
      this.runCleanupTask().catch(error => {
        this.logError('Cleanup task failed', error);
      });
    }, this.config.cleanupInterval);

    // Start retry processing task
    this.retryTimer = setInterval(() => {
      this.runRetryTask().catch(error => {
        this.logError('Retry task failed', error);
      });
    }, this.config.retryDelay);

    // Schedule initial tasks with slight delay to ensure they can be canceled
    setTimeout(() => {
      this.scheduleInitialTasks();
    }, 10);
  }

  private scheduleInitialTasks(): void {
    if (!this.running) return;
    
    const cleanupTask = this.runCleanupTask().catch(error => {
      this.logError('Initial cleanup task failed', error);
    });
    
    const retryTask = this.runRetryTask().catch(error => {
      this.logError('Initial retry task failed', error);
    });
    
    this.initialTasks = [cleanupTask, retryTask];
  }

  private logError(message: string, error: Error): void {
    console.error(`[QueueManager] ${message}:`, error);
  }

  private stopBackgroundTasks(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private async gracefulShutdown(): Promise<void> {
    // Wait for any running initial tasks to complete first
    if (this.initialTasks.length > 0) {
      await Promise.allSettled(this.initialTasks);
      this.initialTasks = [];
    }
    
    const shutdownPromise = this.redisQueue.disconnect();
    
    // Wait for graceful shutdown timeout or Redis disconnect, whichever comes first
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<void>(resolve => {
      timeoutId = setTimeout(resolve, this.config.gracefulShutdownTimeout);
    });

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
    } finally {
      // Clean up the timeout if it hasn't fired yet
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async runCleanupTask(): Promise<void> {
    if (!this.running) {
      return;
    }
    try {
      await this.cleanupStaleRequests();
      this.lastCleanupRun = Date.now();
    } catch (error) {
      throw error;
    }
  }

  private async runRetryTask(): Promise<void> {
    if (!this.running) {
      return;
    }
    try {
      await this.processRetryQueue();
      this.lastRetryProcessRun = Date.now();
    } catch (error) {
      throw error;
    }
  }

  private async cleanupStaleRequests(): Promise<void> {
    const processingRequest = await this.redisQueue.dequeue<RequestData>();
    
    if (!processingRequest) {
      return;
    }

    if (this.isRequestStale(processingRequest)) {
      await this.handleStaleRequest(processingRequest);
    } else {
      await this.reEnqueueActiveRequest(processingRequest);
    }
  }

  private async handleStaleRequest(request: QueueItem<RequestData>): Promise<void> {
    if (this.shouldRetryRequest(request)) {
      const retryData = this.createRetryData(request);
      await this.redisQueue.enqueue(request.id, retryData, QueuePriority.LOW);
    }
    // If shouldn't retry, request is dropped (considered failed)
  }

  private async reEnqueueActiveRequest(request: QueueItem<RequestData>): Promise<void> {
    await this.redisQueue.enqueue(request.id, request.data, request.priority);
  }

  private createRetryData(request: QueueItem<RequestData>): RequestData {
    const currentData = request.data as RequestData;
    return {
      ...currentData,
      retryCount: (currentData?.retryCount || 0) + 1,
      lastAttempt: Date.now(),
    };
  }

  private async processRetryQueue(): Promise<void> {
    // Process retry queue for requests ready for retry
    const retryRequest = await this.redisQueue.dequeue<RequestData>();
    
    if (retryRequest && this.isRetryReady(retryRequest)) {
      // Move back to appropriate priority queue
      await this.redisQueue.enqueue(
        retryRequest.id,
        retryRequest.data,
        retryRequest.priority
      );
    } else if (retryRequest) {
      // Re-enqueue if not ready for retry
      await this.redisQueue.enqueue(
        retryRequest.id,
        retryRequest.data,
        retryRequest.priority
      );
    }
  }

  private isRequestStale(request: QueueItem<RequestData>): boolean {
    const requestData = request.data as RequestData;
    const requestTimestamp = requestData?.timestamp || requestData?.lastAttempt || 0;
    const now = Date.now();
    return (now - requestTimestamp) > this.config.staleRequestTimeout;
  }

  private shouldRetryRequest(request: QueueItem<RequestData>): boolean {
    const requestData = request.data as RequestData;
    const retryCount = requestData?.retryCount || 0;
    return retryCount < this.config.maxRetries;
  }

  private isRetryReady(request: QueueItem<RequestData>): boolean {
    const requestData = request.data as RequestData;
    const lastAttempt = requestData?.lastAttempt || 0;
    const now = Date.now();
    return (now - lastAttempt) >= this.config.retryDelay;
  }
}