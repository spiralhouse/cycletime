import { RequestProcessor } from './request-processor';
import { QueueManager } from './queue/queue-manager';
import { QueueItem } from './queue/redis-queue';
import { AIResponse, AiRequestStatus } from './interfaces/ai-types';

// Constants for worker configuration
const DEFAULT_PROCESSING_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_HEALTH_CHECK_INTERVAL = 5000; // 5 seconds
const UNHEALTHY_FAILURE_RATE_THRESHOLD = 0.5; // 50%

export interface WorkerConfig {
  id: string;
  processingTimeout?: number;
  maxRetries?: number;
  healthCheckInterval?: number;
}

export interface WorkerHealth {
  workerId: string;
  status: 'stopped' | 'running' | 'processing' | 'failed';
  isHealthy: boolean;
  lastActivity: Date;
  processedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  uptime: number;
}

export interface ProcessingResult {
  success: boolean;
  error?: string;
  response?: AIResponse;
  processingTime?: number;
}

export class Worker {
  private config: Required<WorkerConfig>;
  private requestProcessor: RequestProcessor;
  private queueManager: QueueManager;
  private running: boolean = false;
  private status: 'stopped' | 'running' | 'processing' | 'failed' = 'stopped';
  private lastActivity: Date = new Date();
  private processedRequests: number = 0;
  private failedRequests: number = 0;
  private totalProcessingTime: number = 0;
  private startTime: Date = new Date();
  private currentRequest: string | null = null;

  constructor(config: WorkerConfig, requestProcessor: RequestProcessor, queueManager: QueueManager) {
    if (!config.id) {
      throw new Error('Worker ID is required');
    }

    this.config = {
      id: config.id,
      processingTimeout: config.processingTimeout ?? DEFAULT_PROCESSING_TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      healthCheckInterval: config.healthCheckInterval ?? DEFAULT_HEALTH_CHECK_INTERVAL,
    };

    this.requestProcessor = requestProcessor;
    this.queueManager = queueManager;
    this.startTime = new Date();
  }

  getId(): string {
    return this.config.id;
  }

  getConfig(): Required<WorkerConfig> {
    return this.config;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.status = 'running';
    this.lastActivity = new Date();
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.status = 'stopped';
    this.currentRequest = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  getStatus(): 'stopped' | 'running' | 'processing' | 'failed' {
    return this.status;
  }

  getCurrentRequest(): string | null {
    return this.currentRequest;
  }

  getQueueManager(): QueueManager {
    return this.queueManager;
  }

  async processRequest(queueItem: QueueItem): Promise<ProcessingResult> {
    if (!this.running) {
      return {
        success: false,
        error: 'Worker is not running',
      };
    }

    const startTime = Date.now();
    this.status = 'processing';
    this.currentRequest = queueItem.id;
    this.lastActivity = new Date();

    try {
      // Validate request data
      if (!queueItem.data || typeof queueItem.data !== 'object') {
        throw new Error('Invalid request data');
      }

      // Update status to processing
      await this.requestProcessor.updateRequestStatus(queueItem.id, AiRequestStatus.PROCESSING);

      // Process the request with timeout
      const response = await this.processWithTimeout(
        this.requestProcessor.processRequest(queueItem.data),
        this.config.processingTimeout
      );

      const processingTime = Date.now() - startTime;
      this.totalProcessingTime += processingTime;
      this.processedRequests++;

      // Update status to completed
      await this.requestProcessor.updateRequestStatus(queueItem.id, AiRequestStatus.COMPLETED, {
        response,
        completedAt: new Date(),
        processingTime,
      });

      this.status = 'running';
      this.currentRequest = null;

      return {
        success: true,
        response,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.failedRequests++;

      try {
        // Update status to failed
        await this.requestProcessor.updateRequestStatus(queueItem.id, AiRequestStatus.FAILED, {
          error: errorMessage,
          failedAt: new Date(),
          processingTime,
        });
      } catch (statusError) {
        // If we can't update status, that's also a failure
        console.error('Failed to update request status:', statusError);
      }

      this.status = 'running';
      this.currentRequest = null;

      return {
        success: false,
        error: errorMessage,
        processingTime,
      };
    }
  }

  async getHealth(): Promise<WorkerHealth> {
    const uptime = Date.now() - this.startTime.getTime();
    const averageProcessingTime = this.processedRequests > 0 
      ? this.totalProcessingTime / this.processedRequests 
      : 0;

    // Determine if worker is healthy
    const totalRequests = this.processedRequests + this.failedRequests;
    const failureRate = totalRequests > 0 
      ? this.failedRequests / totalRequests
      : 0;
    const isHealthy = failureRate < UNHEALTHY_FAILURE_RATE_THRESHOLD && this.status !== 'failed';

    return {
      workerId: this.config.id,
      status: this.status,
      isHealthy,
      lastActivity: this.lastActivity,
      processedRequests: this.processedRequests,
      failedRequests: this.failedRequests,
      averageProcessingTime,
      uptime,
    };
  }

  private async processWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}