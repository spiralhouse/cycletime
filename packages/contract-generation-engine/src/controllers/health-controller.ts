import { FastifyRequest, FastifyReply } from 'fastify';
import { ContractStorageService } from '../services/contract-storage-service';
import { EventService } from '../services/event-service';
import { logger } from '@cycletime/shared-utils';

export class HealthController {
  private contractStorage: ContractStorageService;
  private eventService: EventService;

  constructor(
    contractStorage: ContractStorageService,
    eventService: EventService
  ) {
    this.contractStorage = contractStorage;
    this.eventService = eventService;
  }

  async healthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check all dependencies
      const [storageHealth, eventHealth] = await Promise.all([
        this.contractStorage.healthCheck(),
        this.eventService.healthCheck(),
      ]);

      const responseTime = Date.now() - startTime;
      
      // Determine overall health status
      const dependencies = {
        storage: storageHealth.status,
        events: eventHealth.status,
      };

      const overallStatus = this.calculateOverallStatus(dependencies);
      
      const healthResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        dependencies,
        responseTime,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
      };

      const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
      
      reply.code(statusCode).send(healthResponse);
    } catch (error) {
      logger.error('Health check failed', { error });
      
      reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async readinessCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Check if service is ready to receive requests
      const [storageReady, eventReady] = await Promise.all([
        this.checkStorageReadiness(),
        this.checkEventReadiness(),
      ]);

      const isReady = storageReady && eventReady;
      
      const readinessResponse = {
        ready: isReady,
        timestamp: new Date().toISOString(),
        checks: {
          storage: storageReady,
          events: eventReady,
        },
      };

      const statusCode = isReady ? 200 : 503;
      
      reply.code(statusCode).send(readinessResponse);
    } catch (error) {
      logger.error('Readiness check failed', { error });
      
      reply.code(503).send({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async livenessCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Simple liveness check - just verify the service is running
      const livenessResponse = {
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid,
      };

      reply.code(200).send(livenessResponse);
    } catch (error) {
      logger.error('Liveness check failed', { error });
      
      reply.code(503).send({
        alive: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getMetrics(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          pid: process.pid,
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
        },
        service: {
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          port: process.env.PORT || '8010',
        },
        stats: await this.getServiceStats(),
      };

      reply.code(200).send(metrics);
    } catch (error) {
      logger.error('Failed to get metrics', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async getServiceInfo(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const serviceInfo = {
        name: 'Contract Generation Engine',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Automated generation of API specifications and system boundaries for parallel development',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        features: [
          'OpenAPI 3.0 specification generation',
          'AsyncAPI 2.0 specification generation',
          'System boundary analysis',
          'Contract validation',
          'Service stub generation',
          'Mock data generation',
          'Contract refinement',
        ],
        endpoints: {
          health: '/health',
          readiness: '/health/ready',
          liveness: '/health/live',
          metrics: '/metrics',
          contracts: '/api/v1/contracts',
          boundaries: '/api/v1/boundaries',
          validation: '/api/v1/validation',
        },
        documentation: {
          openapi: '/docs',
          asyncapi: '/asyncapi-docs',
        },
      };

      reply.code(200).send(serviceInfo);
    } catch (error) {
      logger.error('Failed to get service info', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  private calculateOverallStatus(dependencies: Record<string, string>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(dependencies);
    
    if (statuses.every(status => status === 'healthy')) {
      return 'healthy';
    } else if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  private async checkStorageReadiness(): Promise<boolean> {
    try {
      const health = await this.contractStorage.healthCheck();
      return health.status === 'healthy' || health.status === 'degraded';
    } catch (error) {
      logger.error('Storage readiness check failed', { error });
      return false;
    }
  }

  private async checkEventReadiness(): Promise<boolean> {
    try {
      const health = await this.eventService.healthCheck();
      return health.status === 'healthy' || health.status === 'degraded';
    } catch (error) {
      logger.error('Event readiness check failed', { error });
      return false;
    }
  }

  private async getServiceStats(): Promise<any> {
    try {
      const [eventStats] = await Promise.all([
        this.eventService.getEventStats(),
      ]);

      return {
        events: eventStats,
        contracts: {
          // In a real implementation, you would get these from the storage service
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        },
      };
    } catch (error) {
      logger.error('Failed to get service stats', { error });
      return {
        error: 'Failed to retrieve stats',
      };
    }
  }

  // Register all routes
  async registerRoutes(fastify: any): Promise<void> {
    // Health check
    fastify.get('/health', {
      schema: {
        description: 'Health check',
        tags: ['Health'],
        response: {
          200: {
            description: 'Service is healthy',
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
              timestamp: { type: 'string', format: 'date-time' },
              version: { type: 'string' },
              dependencies: { type: 'object' },
              responseTime: { type: 'number' },
              uptime: { type: 'number' },
              memory: { type: 'object' },
              environment: { type: 'string' },
            },
          },
        },
      },
    }, this.healthCheck.bind(this));

    // Readiness check
    fastify.get('/health/ready', {
      schema: {
        description: 'Readiness check',
        tags: ['Health'],
        response: {
          200: {
            description: 'Service is ready',
            type: 'object',
            properties: {
              ready: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' },
              checks: { type: 'object' },
            },
          },
        },
      },
    }, this.readinessCheck.bind(this));

    // Liveness check
    fastify.get('/health/live', {
      schema: {
        description: 'Liveness check',
        tags: ['Health'],
        response: {
          200: {
            description: 'Service is alive',
            type: 'object',
            properties: {
              alive: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number' },
              pid: { type: 'number' },
            },
          },
        },
      },
    }, this.livenessCheck.bind(this));

    // Metrics
    fastify.get('/metrics', {
      schema: {
        description: 'Service metrics',
        tags: ['Monitoring'],
        response: {
          200: {
            description: 'Service metrics',
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              system: { type: 'object' },
              service: { type: 'object' },
              stats: { type: 'object' },
            },
          },
        },
      },
    }, this.getMetrics.bind(this));

    // Service info
    fastify.get('/info', {
      schema: {
        description: 'Service information',
        tags: ['Information'],
        response: {
          200: {
            description: 'Service information',
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string' },
              environment: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              features: { type: 'array', items: { type: 'string' } },
              endpoints: { type: 'object' },
              documentation: { type: 'object' },
            },
          },
        },
      },
    }, this.getServiceInfo.bind(this));
  }
}