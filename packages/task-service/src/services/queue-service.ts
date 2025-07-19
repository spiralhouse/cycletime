import { Job } from 'bull';
import { TaskQueueInterface } from '../types/service-types';
import { logger } from '@cycletime/shared-utils';

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  settings: {
    stalledInterval: number;
    maxStalledCount: number;
  };
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: string;
      delay: number;
    };
  };
}

export class QueueService implements TaskQueueInterface {
  private isStarted = false;
  private jobs: Map<string, any> = new Map();
  private handlers: Map<string, Function> = new Map();

  constructor(private config: QueueConfig) {}

  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    try {
      // In a real implementation, this would connect to Bull/Redis
      logger.info('Queue service started');
      this.isStarted = true;
    } catch (error) {
      logger.error('Failed to start queue service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      // In a real implementation, this would disconnect from Bull/Redis
      logger.info('Queue service stopped');
      this.isStarted = false;
    } catch (error) {
      logger.error('Failed to stop queue service:', error);
      throw error;
    }
  }

  async addJob(name: string, data: any, options: any = {}): Promise<Job> {
    if (!this.isStarted) {
      throw new Error('Queue service not started');
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      id: jobId,
      name,
      data,
      options: { ...this.config.defaultJobOptions, ...options },
      status: 'waiting',
      createdAt: new Date(),
      processedAt: null,
      completedAt: null,
      failedAt: null,
      attempts: 0,
      error: null
    };

    this.jobs.set(jobId, job);
    logger.info(`Job added: ${name} (${jobId})`);

    // Simulate job processing
    this.processJob(job);

    return job as any;
  }

  async getJob(id: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    return job ? (job as any) : null;
  }

  async getJobs(types: string[]): Promise<Job[]> {
    const jobs = Array.from(this.jobs.values());
    return jobs.filter(job => types.includes(job.name)) as any[];
  }

  async removeJob(id: string): Promise<boolean> {
    const removed = this.jobs.delete(id);
    if (removed) {
      logger.info(`Job removed: ${id}`);
    }
    return removed;
  }

  async pause(): Promise<void> {
    logger.info('Queue paused');
  }

  async resume(): Promise<void> {
    logger.info('Queue resumed');
  }

  async empty(): Promise<void> {
    this.jobs.clear();
    logger.info('Queue emptied');
  }

  async clean(grace: number): Promise<void> {
    const cutoff = new Date(Date.now() - grace);
    const toRemove: string[] = [];

    this.jobs.forEach((job, id) => {
      if (job.completedAt && new Date(job.completedAt) < cutoff) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.jobs.delete(id));
    logger.info(`Cleaned ${toRemove.length} old jobs`);
  }

  on(event: string, handler: Function): void {
    this.handlers.set(event, handler);
  }

  off(event: string, handler: Function): void {
    this.handlers.delete(event);
  }

  // Task-specific queue methods
  async scheduleNotification(taskId: string, type: string, scheduledAt: string): Promise<Job> {
    const job = await this.addJob('notification', {
      taskId,
      type,
      scheduledAt,
      createdAt: new Date().toISOString()
    }, {
      delay: new Date(scheduledAt).getTime() - Date.now()
    });

    logger.info(`Notification scheduled for task ${taskId}: ${type} at ${scheduledAt}`);
    return job;
  }

  async scheduleTaskExecution(taskId: string, executionTime: string): Promise<Job> {
    const job = await this.addJob('task_execution', {
      taskId,
      executionTime,
      createdAt: new Date().toISOString()
    }, {
      delay: new Date(executionTime).getTime() - Date.now()
    });

    logger.info(`Task execution scheduled for ${taskId} at ${executionTime}`);
    return job;
  }

  async scheduleTaskReminder(taskId: string, reminderType: string, reminderTime: string): Promise<Job> {
    const job = await this.addJob('task_reminder', {
      taskId,
      reminderType,
      reminderTime,
      createdAt: new Date().toISOString()
    }, {
      delay: new Date(reminderTime).getTime() - Date.now()
    });

    logger.info(`Task reminder scheduled for ${taskId}: ${reminderType} at ${reminderTime}`);
    return job;
  }

  async processTaskBatch(taskIds: string[], operation: string, data: any): Promise<Job> {
    const job = await this.addJob('task_batch', {
      taskIds,
      operation,
      data,
      createdAt: new Date().toISOString()
    });

    logger.info(`Task batch operation scheduled: ${operation} for ${taskIds.length} tasks`);
    return job;
  }

  // Private helper methods
  private async processJob(job: any): Promise<void> {
    try {
      job.status = 'processing';
      job.processedAt = new Date();
      job.attempts++;

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate success/failure
      const shouldFail = Math.random() < 0.1; // 10% failure rate
      
      if (shouldFail && job.attempts < job.options.attempts) {
        throw new Error('Simulated job failure');
      }

      job.status = 'completed';
      job.completedAt = new Date();
      
      logger.info(`Job completed: ${job.name} (${job.id})`);
      
      // Emit completion event
      const handler = this.handlers.get('completed');
      if (handler) {
        handler(job);
      }
      
    } catch (error) {
      job.status = 'failed';
      job.failedAt = new Date();
      job.error = error.message;
      
      logger.error(`Job failed: ${job.name} (${job.id}):`, error);
      
      // Emit failure event
      const handler = this.handlers.get('failed');
      if (handler) {
        handler(job, error);
      }
      
      // Retry if attempts remaining
      if (job.attempts < job.options.attempts) {
        setTimeout(() => {
          this.processJob(job);
        }, job.options.backoff.delay);
      }
    }
  }

  // Monitoring methods
  getQueueStats(): any {
    const jobs = Array.from(this.jobs.values());
    const stats = {
      total: jobs.length,
      waiting: jobs.filter(j => j.status === 'waiting').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      byType: {}
    };

    // Group by job type
    jobs.forEach(job => {
      const type = job.name;
      if (!(stats.byType as any)[type]) {
        (stats.byType as any)[type] = 0;
      }
      (stats.byType as any)[type]++;
    });

    return stats;
  }

  getJobsByStatus(status: string): any[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  getJobsByType(type: string): any[] {
    return Array.from(this.jobs.values()).filter(job => job.name === type);
  }
}