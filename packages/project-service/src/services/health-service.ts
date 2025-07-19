import { logger } from '@cycletime/shared-utils';
import { HealthResponse, HealthStatus } from '../types/project-types';
import { config } from '../config';

export class HealthService {
  private startTime: Date;
  private version: string;

  constructor() {
    this.startTime = new Date();
    this.version = process.env.npm_package_version || '1.0.0';
    logger.info('HealthService initialized');
  }

  /**
   * Get overall service health
   */
  async getHealth(): Promise<HealthResponse> {
    try {
      const dependencies = await this.checkDependencies();
      const metrics = await this.collectMetrics();
      
      // Determine overall health status
      const dependencyStatuses = Object.values(dependencies);
      const overallStatus = this.determineOverallStatus(dependencyStatuses);

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: this.version,
        dependencies,
        metrics
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: this.version,
        dependencies: {
          redis: 'unhealthy',
          queue: 'unhealthy'
        },
        metrics: {
          projectsCount: 0,
          activeProjects: 0,
          templatesCount: 0,
          averageTeamSize: 0
        }
      };
    }
  }

  /**
   * Get detailed health information
   */
  async getDetailedHealth(): Promise<any> {
    const health = await this.getHealth();
    
    return {
      ...health,
      uptime: this.getUptime(),
      memory: this.getMemoryUsage(),
      system: this.getSystemInfo(),
      configuration: this.getConfigurationStatus()
    };
  }

  /**
   * Check health of external dependencies
   */
  private async checkDependencies(): Promise<Record<string, HealthStatus>> {
    const dependencies: Record<string, HealthStatus> = {};

    // Check Redis
    try {
      dependencies.redis = await this.checkRedis();
    } catch (error) {
      logger.error('Redis health check failed:', error);
      dependencies.redis = 'unhealthy';
    }

    // Check Queue
    try {
      dependencies.queue = await this.checkQueue();
    } catch (error) {
      logger.error('Queue health check failed:', error);
      dependencies.queue = 'unhealthy';
    }

    return dependencies;
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(): Promise<HealthStatus> {
    // In a real implementation, this would:
    // 1. Create Redis client
    // 2. Send PING command
    // 3. Check response time
    // 4. Return appropriate status
    
    if (!config.redis) {
      return 'degraded';
    }

    // Mock Redis check
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return 'healthy';
  }

  /**
   * Check Queue system
   */
  private async checkQueue(): Promise<HealthStatus> {
    // In a real implementation, this would:
    // 1. Check queue connection
    // 2. Verify job processing
    // 3. Check queue sizes
    // 4. Return appropriate status
    
    if (!config.queue) {
      return 'degraded';
    }

    // Mock Queue check
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return 'healthy';
  }

  /**
   * Collect service metrics
   */
  private async collectMetrics(): Promise<any> {
    // In a real implementation, this would collect actual metrics
    // For now, return mock data
    return {
      projectsCount: 15,
      activeProjects: 8,
      templatesCount: 5,
      averageTeamSize: 4.2
    };
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }
    if (statuses.some(status => status === 'degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Get service uptime
   */
  private getUptime(): { seconds: number; formatted: string } {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    return {
      seconds: uptimeSeconds,
      formatted: `${hours}h ${minutes}m ${seconds}s`
    };
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): any {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      unit: 'MB'
    };
  }

  /**
   * Get system information
   */
  private getSystemInfo(): any {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Get configuration status
   */
  private getConfigurationStatus(): any {
    return {
      redis: {
        enabled: !!config.redis,
        host: config.redis?.host || 'not configured'
      },
      queue: {
        enabled: !!config.queue,
        configured: !!config.queue?.defaultJobOptions
      },
      ai: {
        enabled: config.ai?.enabled || false,
        provider: config.ai?.provider || 'not configured'
      },
      analytics: {
        enabled: config.analytics?.enabled || false,
        batchSize: config.analytics?.batchSize || 0
      },
      integrations: {
        github: config.integrations?.github?.enabled || false,
        linear: config.integrations?.linear?.enabled || false,
        slack: config.integrations?.slack?.enabled || false
      }
    };
  }

  /**
   * Perform readiness check
   */
  async isReady(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.status === 'healthy' || health.status === 'degraded';
    } catch (error) {
      logger.error('Readiness check failed:', error);
      return false;
    }
  }

  /**
   * Perform liveness check
   */
  async isLive(): Promise<boolean> {
    try {
      // Basic liveness check - just verify the service is responding
      return true;
    } catch (error) {
      logger.error('Liveness check failed:', error);
      return false;
    }
  }
}