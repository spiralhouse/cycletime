import { HealthResponse } from '../types/task-types';
import { logger } from '@cycletime/shared-utils';

export class HealthService {
  private startTime: Date;
  private version: string;

  constructor() {
    this.startTime = new Date();
    this.version = process.env.npm_package_version || '1.0.0';
  }

  async getHealth(): Promise<HealthResponse> {
    try {
      const dependencies = await this.checkDependencies();
      const metrics = await this.collectMetrics();
      
      // Determine overall health status
      const unhealthyDeps = Object.values(dependencies).filter(status => status === 'unhealthy');
      const degradedDeps = Object.values(dependencies).filter(status => status === 'degraded');
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (unhealthyDeps.length > 0) {
        status = 'unhealthy';
      } else if (degradedDeps.length > 0) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        version: this.version,
        dependencies,
        metrics
      };
    } catch (error) {
      logger.error('Error getting health status:', error as Error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: this.version,
        dependencies: {
          redis: 'unhealthy',
          queue: 'unhealthy',
          scheduler: 'unhealthy'
        },
        metrics: {
          tasksCount: 0,
          pendingTasks: 0,
          completedTasks: 0,
          averageCompletionTime: 0
        }
      };
    }
  }

  async checkReadiness(): Promise<void> {
    const health = await this.getHealth();
    
    if (health.status === 'unhealthy') {
      throw new Error('Service is not ready');
    }
  }

  async getMetrics(): Promise<string> {
    try {
      const health = await this.getHealth();
      const uptime = Date.now() - this.startTime.getTime();
      
      // Return Prometheus-style metrics
      return `
# HELP task_service_uptime_seconds Total uptime of the task service
# TYPE task_service_uptime_seconds counter
task_service_uptime_seconds ${Math.floor(uptime / 1000)}

# HELP task_service_health_status Health status of the task service (1=healthy, 0.5=degraded, 0=unhealthy)
# TYPE task_service_health_status gauge
task_service_health_status ${health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0}

# HELP task_service_tasks_total Total number of tasks
# TYPE task_service_tasks_total gauge
task_service_tasks_total ${health.metrics.tasksCount}

# HELP task_service_tasks_pending Number of pending tasks
# TYPE task_service_tasks_pending gauge
task_service_tasks_pending ${health.metrics.pendingTasks}

# HELP task_service_tasks_completed Number of completed tasks
# TYPE task_service_tasks_completed gauge
task_service_tasks_completed ${health.metrics.completedTasks}

# HELP task_service_average_completion_time_seconds Average task completion time
# TYPE task_service_average_completion_time_seconds gauge
task_service_average_completion_time_seconds ${health.metrics.averageCompletionTime}

# HELP task_service_dependency_status Status of service dependencies (1=healthy, 0.5=degraded, 0=unhealthy)
# TYPE task_service_dependency_status gauge
task_service_dependency_status{dependency="redis"} ${this.dependencyStatusToNumber(health.dependencies.redis)}
task_service_dependency_status{dependency="queue"} ${this.dependencyStatusToNumber(health.dependencies.queue)}
task_service_dependency_status{dependency="scheduler"} ${this.dependencyStatusToNumber(health.dependencies.scheduler)}
      `.trim();
    } catch (error) {
      logger.error('Error generating metrics:', error as Error);
      return '# Error generating metrics';
    }
  }

  private async checkDependencies(): Promise<{
    redis: 'healthy' | 'degraded' | 'unhealthy';
    queue: 'healthy' | 'degraded' | 'unhealthy';
    scheduler: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const dependencies = {
      redis: await this.checkRedis(),
      queue: await this.checkQueue(),
      scheduler: await this.checkScheduler()
    };

    return dependencies;
  }

  private async checkRedis(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // In a real implementation, this would check Redis connectivity
      // For now, simulate a health check
      const responseTime = Math.random() * 100;
      
      if (responseTime > 50) {
        return 'degraded';
      }
      
      return 'healthy';
    } catch (error) {
      logger.error('Redis health check failed:', error as Error);
      return 'unhealthy';
    }
  }

  private async checkQueue(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // In a real implementation, this would check queue connectivity and status
      // For now, simulate a health check
      const queueSize = Math.floor(Math.random() * 100);
      
      if (queueSize > 50) {
        return 'degraded';
      }
      
      return 'healthy';
    } catch (error) {
      logger.error('Queue health check failed:', error as Error);
      return 'unhealthy';
    }
  }

  private async checkScheduler(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // In a real implementation, this would check scheduler status
      // For now, simulate a health check
      const schedulerEnabled = process.env.SCHEDULER_ENABLED !== 'false';
      
      if (!schedulerEnabled) {
        return 'degraded';
      }
      
      return 'healthy';
    } catch (error) {
      logger.error('Scheduler health check failed:', error as Error);
      return 'unhealthy';
    }
  }

  private async collectMetrics(): Promise<{
    tasksCount: number;
    pendingTasks: number;
    completedTasks: number;
    averageCompletionTime: number;
  }> {
    try {
      // In a real implementation, this would query the actual data store
      // For now, return mock metrics
      const totalTasks = Math.floor(Math.random() * 1000) + 100;
      const completedTasks = Math.floor(totalTasks * 0.7);
      const pendingTasks = totalTasks - completedTasks;
      const averageCompletionTime = Math.random() * 48 + 2; // 2-50 hours

      return {
        tasksCount: totalTasks,
        pendingTasks,
        completedTasks,
        averageCompletionTime
      };
    } catch (error) {
      logger.error('Error collecting metrics:', error as Error);
      return {
        tasksCount: 0,
        pendingTasks: 0,
        completedTasks: 0,
        averageCompletionTime: 0
      };
    }
  }

  private dependencyStatusToNumber(status: string): number {
    switch (status) {
      case 'healthy':
        return 1;
      case 'degraded':
        return 0.5;
      case 'unhealthy':
        return 0;
      default:
        return 0;
    }
  }

  // Additional monitoring methods
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  getStartTime(): Date {
    return this.startTime;
  }

  getVersion(): string {
    return this.version;
  }

  async performHealthCheck(timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, timeout);

      this.getHealth().then(health => {
        clearTimeout(timer);
        resolve(health.status !== 'unhealthy');
      }).catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  async getDetailedHealthStatus(): Promise<any> {
    const health = await this.getHealth();
    const uptime = this.getUptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      ...health,
      uptime: {
        seconds: Math.floor(uptime / 1000),
        readable: this.formatUptime(uptime)
      },
      system: {
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        version: {
          node: process.version,
          service: this.version
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        platform: process.platform,
        architecture: process.arch
      }
    };
  }

  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

    return parts.join(' ') || '0s';
  }
}