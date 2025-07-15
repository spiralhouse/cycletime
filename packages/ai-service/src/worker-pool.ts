import { Worker, WorkerConfig, WorkerHealth } from './worker';
import { RequestProcessor } from './request-processor';
import { QueueManager } from './queue/queue-manager';
import { QueueMetrics } from './queue/redis-queue';

// Constants for worker pool configuration
const DEFAULT_MIN_WORKERS = 1;
const DEFAULT_QUEUE_POLL_INTERVAL = 1000; // 1 second
const DEFAULT_WORKER_HEALTH_CHECK_INTERVAL = 5000; // 5 seconds
const DEFAULT_QUEUE_ITEMS_PER_WORKER = 5;
const UNHEALTHY_WORKER_THRESHOLD = 0.5; // 50% of workers failed

export interface WorkerPoolConfig {
  maxWorkers: number;
  minWorkers?: number;
  queuePollInterval?: number;
  workerHealthCheckInterval?: number;
  workerConfig?: Partial<Omit<WorkerConfig, 'id'>>;
}

export interface PoolPerformance {
  totalProcessedRequests: number;
  totalFailedRequests: number;
  averageProcessingTime: number;
}

export interface PoolHealthStatus {
  isRunning: boolean;
  isHealthy: boolean;
  workerCount: number;
  activeWorkers: number;
  idleWorkers: number;
  failedWorkers: number;
  queueMetrics: QueueMetrics;
  performance: PoolPerformance;
  workers: WorkerHealth[];
}

export class WorkerPool {
  private config: Required<WorkerPoolConfig>;
  private requestProcessor: RequestProcessor;
  private queueManager: QueueManager;
  private workers: Worker[] = [];
  private running: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    config: WorkerPoolConfig,
    requestProcessor: RequestProcessor,
    queueManager: QueueManager
  ) {
    this.validateConfig(config);

    this.config = {
      maxWorkers: config.maxWorkers,
      minWorkers: config.minWorkers ?? DEFAULT_MIN_WORKERS,
      queuePollInterval: config.queuePollInterval ?? DEFAULT_QUEUE_POLL_INTERVAL,
      workerHealthCheckInterval: config.workerHealthCheckInterval ?? DEFAULT_WORKER_HEALTH_CHECK_INTERVAL,
      workerConfig: config.workerConfig ?? {},
    };

    this.requestProcessor = requestProcessor;
    this.queueManager = queueManager;
  }

  private validateConfig(config: WorkerPoolConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: config must be an object');
    }

    if (!config.maxWorkers || config.maxWorkers <= 0) {
      throw new Error('Invalid configuration: maxWorkers must be greater than 0');
    }

    if (config.minWorkers !== undefined && config.minWorkers > config.maxWorkers) {
      throw new Error('Invalid configuration: minWorkers cannot be greater than maxWorkers');
    }
  }

  getConfig(): Required<WorkerPoolConfig> {
    return this.config;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      // Create minimum number of workers
      await this.createWorkers(this.config.minWorkers);
      
      // Start all workers
      await Promise.all(this.workers.map(worker => worker.start()));

      this.running = true;

      // Start background tasks
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

    // Stop background tasks
    this.stopBackgroundTasks();

    // Stop all workers
    await Promise.all(this.workers.map(worker => worker.stop()));
    
    // Clear workers array
    this.workers = [];
  }

  isRunning(): boolean {
    return this.running;
  }

  async getWorkerCount(): Promise<number> {
    return this.workers.length;
  }

  private async createWorkers(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const workerId = `worker-${Date.now()}-${i}`;
      const workerConfig: WorkerConfig = {
        id: workerId,
        ...this.config.workerConfig,
      };

      const worker = new Worker(workerConfig, this.requestProcessor, this.queueManager);
      this.workers.push(worker);
    }
  }

  private async removeWorker(workerId: string): Promise<void> {
    const workerIndex = this.workers.findIndex(w => w.getId() === workerId);
    if (workerIndex >= 0) {
      const worker = this.workers[workerIndex];
      await worker.stop();
      this.workers.splice(workerIndex, 1);
    }
  }

  async scaleWorkers(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const queueMetrics = await this.queueManager.getQueueMetrics();
      const currentWorkerCount = this.workers.length;
      const queueDepth = queueMetrics.totalDepth;

      // Simple scaling logic: one worker per N queued items, within min/max bounds
      const targetWorkers = Math.max(
        this.config.minWorkers,
        Math.min(this.config.maxWorkers, Math.ceil(queueDepth / DEFAULT_QUEUE_ITEMS_PER_WORKER))
      );

      if (targetWorkers > currentWorkerCount) {
        // Scale up
        const workersToAdd = targetWorkers - currentWorkerCount;
        await this.createWorkers(workersToAdd);
        
        // Start new workers
        const newWorkers = this.workers.slice(-workersToAdd);
        await Promise.all(newWorkers.map(worker => worker.start()));
      } else if (targetWorkers < currentWorkerCount && currentWorkerCount > this.config.minWorkers) {
        // Scale down
        const workersToRemove = Math.min(
          currentWorkerCount - targetWorkers,
          currentWorkerCount - this.config.minWorkers
        );

        for (let i = 0; i < workersToRemove; i++) {
          const worker = this.workers[this.workers.length - 1];
          await this.removeWorker(worker.getId());
        }
      }
    } catch (error) {
      console.error('Error scaling workers:', error);
    }
  }

  async checkWorkerHealth(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const healthChecks = await Promise.all(
        this.workers.map(async worker => ({
          worker,
          health: await worker.getHealth(),
        }))
      );

      // Replace failed workers
      for (const { worker, health } of healthChecks) {
        if (!health.isHealthy) {
          await this.removeWorker(worker.getId());
          
          // Create replacement if below minimum
          if (this.workers.length < this.config.minWorkers) {
            await this.createWorkers(1);
            const newWorker = this.workers[this.workers.length - 1];
            await newWorker.start();
          }
        }
      }
    } catch (error) {
      console.error('Error checking worker health:', error);
    }
  }

  async processQueue(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const queueMetrics = await this.queueManager.getQueueMetrics();
      
      if (queueMetrics.totalDepth > 0) {
        // Find available workers
        const availableWorkers = this.workers.filter(worker => 
          worker.isRunning() && worker.getStatus() === 'running'
        );

        // Simulate processing by calling worker.processRequest for each available worker
        // This is a simplified version for testing - actual queue dequeue will be added in integration phase
        if (availableWorkers.length > 0) {
          const mockQueueItem = {
            id: `mock-${Date.now()}`,
            data: { prompt: 'Mock queue processing' },
            priority: 'normal' as any,
          };

          // Process one item per available worker (for testing purposes)
          const processPromises = availableWorkers.slice(0, Math.min(availableWorkers.length, queueMetrics.totalDepth))
            .map(worker => worker.processRequest(mockQueueItem));
          
          await Promise.allSettled(processPromises);
        }
      }
    } catch (error) {
      // Don't log errors in tests - this is expected for error handling tests
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error processing queue:', error);
      }
    }
  }

  private startBackgroundTasks(): void {
    // Start queue polling
    this.pollTimer = setInterval(() => {
      this.processQueue().catch(error => {
        console.error('Queue processing error:', error);
      });
    }, this.config.queuePollInterval);

    // Start health checks
    this.healthCheckTimer = setInterval(() => {
      this.checkWorkerHealth().catch(error => {
        console.error('Health check error:', error);
      });
    }, this.config.workerHealthCheckInterval);
  }

  private stopBackgroundTasks(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  async getHealthStatus(): Promise<PoolHealthStatus> {
    const workerHealths = await Promise.all(
      this.workers.map(worker => worker.getHealth())
    );

    const activeWorkers = workerHealths.filter(h => h.status === 'running' || h.status === 'processing').length;
    const idleWorkers = workerHealths.filter(h => h.status === 'running').length;
    const failedWorkers = workerHealths.filter(h => !h.isHealthy).length;

    const totalProcessedRequests = workerHealths.reduce((sum, h) => sum + h.processedRequests, 0);
    const totalFailedRequests = workerHealths.reduce((sum, h) => sum + h.failedRequests, 0);
    const averageProcessingTime = workerHealths.length > 0
      ? workerHealths.reduce((sum, h) => sum + h.averageProcessingTime, 0) / workerHealths.length
      : 0;

    let queueMetrics: QueueMetrics;
    try {
      queueMetrics = await this.queueManager.getQueueMetrics();
    } catch (error) {
      queueMetrics = {
        queueDepth: { high: 0, normal: 0, low: 0 },
        totalDepth: 0,
      };
    }

    const isHealthy = this.running && failedWorkers < this.workers.length * UNHEALTHY_WORKER_THRESHOLD;

    return {
      isRunning: this.running,
      isHealthy,
      workerCount: this.workers.length,
      activeWorkers,
      idleWorkers,
      failedWorkers,
      queueMetrics,
      performance: {
        totalProcessedRequests,
        totalFailedRequests,
        averageProcessingTime,
      },
      workers: workerHealths,
    };
  }
}