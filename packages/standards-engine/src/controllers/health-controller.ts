import { FastifyRequest, FastifyReply } from 'fastify';
import { APIResponse, HttpStatus } from '@cycletime/shared-types';
import { EventService } from '../services/event-service.js';
import { getEnvVar } from '@cycletime/shared-config';

/**
 * Health Controller
 * Handles health check and system status endpoints
 */
export class HealthController {
  private eventService: EventService;
  private startTime: number;

  constructor() {
    this.eventService = new EventService();
    this.startTime = Date.now();
  }

  /**
   * GET /health
   * Basic health check endpoint
   */
  async healthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const uptime = (Date.now() - this.startTime) / 1000;
      const eventHealth = this.eventService.getHealth();

      // Check dependency health
      const dependencies = await this.checkDependencies();

      // Determine overall health status
      const isHealthy = dependencies.redis === 'healthy' && 
                       dependencies.ai_service === 'healthy' &&
                       eventHealth.connected;

      const healthResponse = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'standards-engine',
        version: this.getServiceVersion(),
        timestamp: new Date().toISOString(),
        uptime,
        dependencies
      };

      const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      reply.status(statusCode).send(healthResponse);

    } catch (error) {
      request.log.error(error, 'Health check failed');
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        status: 'unhealthy',
        service: 'standards-engine',
        version: this.getServiceVersion(),
        timestamp: new Date().toISOString(),
        uptime: (Date.now() - this.startTime) / 1000,
        error: 'Health check failed'
      });
    }
  }

  /**
   * GET /health/detailed
   * Detailed health check with system metrics
   */
  async detailedHealthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const uptime = (Date.now() - this.startTime) / 1000;
      const eventHealth = this.eventService.getHealth();
      const dependencies = await this.checkDependencies();
      const systemMetrics = this.getSystemMetrics();

      const detailedHealth = {
        status: this.determineOverallHealth(dependencies, eventHealth),
        service: 'standards-engine',
        version: this.getServiceVersion(),
        timestamp: new Date().toISOString(),
        uptime,
        dependencies,
        eventService: {
          connected: eventHealth.connected,
          queuedEvents: eventHealth.queuedEvents,
          lastError: eventHealth.lastError
        },
        systemMetrics,
        configuration: this.getConfigurationStatus(),
        features: this.getFeatureStatus()
      };

      const statusCode = detailedHealth.status === 'healthy' ? 
        HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

      const response: APIResponse = {
        success: detailedHealth.status === 'healthy',
        data: detailedHealth,
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      reply.status(statusCode).send(response);

    } catch (error) {
      request.log.error(error, 'Detailed health check failed');
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Detailed health check failed'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * GET /health/dependencies
   * Check status of external dependencies
   */
  async dependencyCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const dependencies = await this.checkDependencies();

      const response: APIResponse = {
        success: true,
        data: {
          dependencies,
          timestamp: new Date().toISOString()
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      reply.status(HttpStatus.OK).send(response);

    } catch (error) {
      request.log.error(error, 'Dependency check failed');
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'DEPENDENCY_CHECK_FAILED',
          message: 'Failed to check dependencies'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * GET /health/readiness
   * Kubernetes readiness probe endpoint
   */
  async readinessProbe(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const eventHealth = this.eventService.getHealth();
      const dependencies = await this.checkDependencies();

      // Service is ready if core dependencies are available
      const isReady = dependencies.redis === 'healthy' && eventHealth.connected;

      if (isReady) {
        reply.status(HttpStatus.OK).send({ status: 'ready' });
      } else {
        reply.status(HttpStatus.SERVICE_UNAVAILABLE).send({ 
          status: 'not ready',
          reason: 'Core dependencies unavailable'
        });
      }

    } catch (error) {
      request.log.error(error, 'Readiness probe failed');
      reply.status(HttpStatus.SERVICE_UNAVAILABLE).send({ 
        status: 'not ready',
        error: 'Readiness check failed'
      });
    }
  }

  /**
   * GET /health/liveness
   * Kubernetes liveness probe endpoint
   */
  async livenessProbe(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Simple liveness check - service is alive if it can respond
      const uptime = (Date.now() - this.startTime) / 1000;
      
      // Service is considered alive if it's been running for at least 1 second
      if (uptime > 1) {
        reply.status(HttpStatus.OK).send({ status: 'alive', uptime });
      } else {
        reply.status(HttpStatus.SERVICE_UNAVAILABLE).send({ 
          status: 'starting',
          uptime 
        });
      }

    } catch (error) {
      request.log.error(error, 'Liveness probe failed');
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ 
        status: 'unhealthy',
        error: 'Liveness check failed'
      });
    }
  }

  /**
   * Check the health of external dependencies
   */
  private async checkDependencies(): Promise<{
    redis: 'healthy' | 'unhealthy';
    ai_service: 'healthy' | 'unhealthy';
  }> {
    const dependencies = {
      redis: 'unhealthy' as 'healthy' | 'unhealthy',
      ai_service: 'healthy' as 'healthy' | 'unhealthy' // Mock as healthy for now
    };

    // Check Redis health
    try {
      const eventHealth = this.eventService.getHealth();
      dependencies.redis = eventHealth.connected ? 'healthy' : 'unhealthy';
    } catch (error) {
      dependencies.redis = 'unhealthy';
    }

    // Check AI service health (mock implementation)
    try {
      // In a real implementation, this would make an HTTP call to the AI service
      const aiServiceUrl = getEnvVar('AI_SERVICE_URL', '');
      if (aiServiceUrl) {
        // Mock health check - in real implementation, use fetch/axios
        dependencies.ai_service = 'healthy';
      } else {
        dependencies.ai_service = 'unhealthy';
      }
    } catch (error) {
      dependencies.ai_service = 'unhealthy';
    }

    return dependencies;
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    nodeVersion: string;
  } {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;

    return {
      memory: {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      cpu: {
        usage: Math.round(Math.random() * 100) // Mock CPU usage
      },
      nodeVersion: process.version
    };
  }

  /**
   * Get configuration status
   */
  private getConfigurationStatus(): {
    environment: string;
    port: number;
    logLevel: string;
    redisUrl: string;
    features: string[];
  } {
    return {
      environment: getEnvVar('NODE_ENV', 'development'),
      port: parseInt(getEnvVar('PORT', '3007'), 10),
      logLevel: getEnvVar('LOG_LEVEL', 'info'),
      redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
      features: [
        'standards-analysis',
        'compliance-reporting',
        'event-publishing',
        'template-management'
      ]
    };
  }

  /**
   * Get feature status
   */
  private getFeatureStatus(): {
    standardsAnalysis: boolean;
    complianceReporting: boolean;
    eventPublishing: boolean;
    templateManagement: boolean;
    aiInsights: boolean;
  } {
    return {
      standardsAnalysis: true,
      complianceReporting: true,
      eventPublishing: this.eventService.getHealth().connected,
      templateManagement: true,
      aiInsights: true // Mock as available
    };
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealth(
    dependencies: { redis: string; ai_service: string },
    eventHealth: { connected: boolean }
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalIssues = dependencies.redis === 'unhealthy' || !eventHealth.connected;
    const minorIssues = dependencies.ai_service === 'unhealthy';

    if (criticalIssues) {
      return 'unhealthy';
    } else if (minorIssues) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Get service version
   */
  private getServiceVersion(): string {
    // In a real implementation, this would read from package.json
    return getEnvVar('SERVICE_VERSION', '1.0.0');
  }
}