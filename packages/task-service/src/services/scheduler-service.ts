import { TaskSchedulerInterface } from '../types/service-types';
import { logger } from '@cycletime/shared-utils';

export interface SchedulerConfig {
  enabled: boolean;
  checkInterval: string;
  timezone: string;
}

export class SchedulerService implements TaskSchedulerInterface {
  private isStarted = false;
  private cronJobs: Map<string, any> = new Map();
  private scheduledTasks: Map<string, any> = new Map();
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private config: SchedulerConfig) {}

  async start(): Promise<void> {
    if (this.isStarted || !this.config.enabled) {
      return;
    }

    try {
      // Start the scheduler check interval
      this.intervalId = setInterval(() => {
        this.checkScheduledTasks();
      }, this.parseInterval(this.config.checkInterval));

      logger.info('Scheduler service started');
      this.isStarted = true;
    } catch (error) {
      logger.error('Failed to start scheduler service:', error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      // Stop all cron jobs
      this.cronJobs.forEach((job, name) => {
        if (job.intervalId) {
          clearInterval(job.intervalId);
        }
      });

      logger.info('Scheduler service stopped');
      this.isStarted = false;
    } catch (error) {
      logger.error('Failed to stop scheduler service:', error as Error);
      throw error;
    }
  }

  async scheduleTask(taskId: string, schedule: any): Promise<boolean> {
    if (!this.isStarted) {
      throw new Error('Scheduler service not started');
    }

    try {
      const scheduledTask = {
        taskId,
        schedule,
        createdAt: new Date(),
        nextExecution: this.calculateNextExecution(schedule),
        lastExecution: null,
        executionCount: 0,
        failureCount: 0,
        status: 'scheduled'
      };

      this.scheduledTasks.set(taskId, scheduledTask);
      logger.info(`Task scheduled: ${taskId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to schedule task ${taskId}:`, error as Error);
      return false;
    }
  }

  async unscheduleTask(taskId: string): Promise<boolean> {
    const removed = this.scheduledTasks.delete(taskId);
    if (removed) {
      logger.info(`Task unscheduled: ${taskId}`);
    }
    return removed;
  }

  async rescheduleTask(taskId: string, schedule: any): Promise<boolean> {
    const existingTask = this.scheduledTasks.get(taskId);
    if (!existingTask) {
      return this.scheduleTask(taskId, schedule);
    }

    existingTask.schedule = schedule;
    existingTask.nextExecution = this.calculateNextExecution(schedule);
    existingTask.status = 'rescheduled';

    this.scheduledTasks.set(taskId, existingTask);
    logger.info(`Task rescheduled: ${taskId}`);
    return true;
  }

  addCronJob(name: string, pattern: string, handler: Function): void {
    if (this.cronJobs.has(name)) {
      this.removeCronJob(name);
    }

    try {
      const intervalMs = this.parseCronPattern(pattern);
      const intervalId = setInterval(() => {
        try {
          handler();
        } catch (error) {
          logger.error(`Cron job ${name} failed:`, error as Error);
        }
      }, intervalMs);

      const cronJob = {
        name,
        pattern,
        handler,
        intervalId,
        createdAt: new Date(),
        executionCount: 0,
        lastExecution: null,
        nextExecution: new Date(Date.now() + intervalMs)
      };

      this.cronJobs.set(name, cronJob);
      logger.info(`Cron job added: ${name} (${pattern})`);
    } catch (error) {
      logger.error(`Failed to add cron job ${name}:`, error as Error);
      throw error;
    }
  }

  removeCronJob(name: string): void {
    const cronJob = this.cronJobs.get(name);
    if (cronJob) {
      if (cronJob.intervalId) {
        clearInterval(cronJob.intervalId);
      }
      this.cronJobs.delete(name);
      logger.info(`Cron job removed: ${name}`);
    }
  }

  listCronJobs(): string[] {
    return Array.from(this.cronJobs.keys());
  }

  // Task-specific scheduling methods
  async scheduleRecurringTask(taskId: string, cronPattern: string): Promise<boolean> {
    return this.scheduleTask(taskId, {
      type: 'recurring',
      pattern: cronPattern,
      startDate: new Date().toISOString(),
      timezone: this.config.timezone
    });
  }

  async scheduleDelayedTask(taskId: string, delay: number): Promise<boolean> {
    const executeAt = new Date(Date.now() + delay);
    return this.scheduleTask(taskId, {
      type: 'delayed',
      executeAt: executeAt.toISOString()
    });
  }

  async scheduleTaskAt(taskId: string, executeAt: string): Promise<boolean> {
    return this.scheduleTask(taskId, {
      type: 'at',
      executeAt
    });
  }

  // Private helper methods
  private checkScheduledTasks(): void {
    const now = new Date();
    
    this.scheduledTasks.forEach((task, taskId) => {
      if (task.nextExecution && new Date(task.nextExecution) <= now) {
        this.executeScheduledTask(taskId, task);
      }
    });
  }

  private async executeScheduledTask(taskId: string, task: any): Promise<void> {
    try {
      logger.info(`Executing scheduled task: ${taskId}`);
      
      task.lastExecution = new Date();
      task.executionCount++;
      task.status = 'executing';

      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 100));

      // Calculate next execution if recurring
      if (task.schedule.type === 'recurring') {
        task.nextExecution = this.calculateNextExecution(task.schedule);
        task.status = 'scheduled';
      } else {
        task.status = 'completed';
      }

      this.scheduledTasks.set(taskId, task);
      logger.info(`Scheduled task executed successfully: ${taskId}`);
    } catch (error) {
      task.failureCount++;
      task.status = 'failed';
      this.scheduledTasks.set(taskId, task);
      logger.error(`Scheduled task execution failed for ${taskId}:`, error as Error);
    }
  }

  private calculateNextExecution(schedule: any): Date {
    const now = new Date();
    
    switch (schedule.type) {
      case 'recurring':
        // Simple recurring pattern calculation
        const intervalMs = this.parseCronPattern(schedule.pattern);
        return new Date(now.getTime() + intervalMs);
      
      case 'delayed':
      case 'at':
        return new Date(schedule.executeAt);
      
      default:
        return new Date(now.getTime() + 60000); // Default to 1 minute
    }
  }

  private parseCronPattern(pattern: string): number {
    // Simplified cron pattern parsing
    // In a real implementation, you'd use a proper cron parser
    const cronMap: Record<string, number> = {
      '*/1 * * * *': 60000,      // Every minute
      '*/5 * * * *': 300000,     // Every 5 minutes
      '*/15 * * * *': 900000,    // Every 15 minutes
      '*/30 * * * *': 1800000,   // Every 30 minutes
      '0 * * * *': 3600000,      // Every hour
      '0 0 * * *': 86400000,     // Every day
      '0 0 * * 0': 604800000     // Every week
    };

    return cronMap[pattern] || 3600000; // Default to 1 hour
  }

  private parseInterval(interval: string): number {
    // Parse interval string like "30s", "5m", "1h"
    const match = interval.match(/^(\d+)([smh])$/);
    if (!match) {
      return 60000; // Default to 1 minute
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      default:
        return 60000;
    }
  }

  // Monitoring methods
  getSchedulerStats(): any {
    const tasks = Array.from(this.scheduledTasks.values());
    const cronJobs = Array.from(this.cronJobs.values());

    return {
      isStarted: this.isStarted,
      enabled: this.config.enabled,
      tasks: {
        total: tasks.length,
        scheduled: tasks.filter(t => t.status === 'scheduled').length,
        executing: tasks.filter(t => t.status === 'executing').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length
      },
      cronJobs: {
        total: cronJobs.length,
        totalExecutions: cronJobs.reduce((sum, job) => sum + job.executionCount, 0)
      }
    };
  }

  getScheduledTasks(): any[] {
    return Array.from(this.scheduledTasks.values());
  }

  getScheduledTask(taskId: string): any | null {
    return this.scheduledTasks.get(taskId) || null;
  }

  getCronJobs(): any[] {
    return Array.from(this.cronJobs.values());
  }

  getCronJob(name: string): any | null {
    return this.cronJobs.get(name) || null;
  }
}