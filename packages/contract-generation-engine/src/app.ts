import Fastify, { FastifyInstance } from 'fastify';
import { createClient, RedisClientType } from 'redis';
import { logger } from '@cycletime/shared-utils';

// Import services
import { ContractGenerationService } from './services/contract-generation-service';
import { ContractStorageService } from './services/contract-storage-service';
import { ValidationService } from './services/validation-service';
import { BoundaryAnalysisService } from './services/boundary-analysis-service';
import { StubGenerationService } from './services/stub-generation-service';
import { EventService } from './services/event-service';

// Import controllers
import { ContractController } from './controllers/contract-controller';
import { HealthController } from './controllers/health-controller';

export interface AppOptions {
  logger?: boolean;
  redis?: RedisClientType;
}

export async function build(options: AppOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: options.logger !== false ? {
      level: process.env.LOG_LEVEL || 'info',
    } : false,
  });

  try {
    // Register plugins
    await fastify.register(require('@fastify/cors'), {
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    });

    await fastify.register(require('@fastify/helmet'), {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    });

    await fastify.register(require('@fastify/rate-limit'), {
      max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
      timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
    });

    // Register Swagger for API documentation
    await fastify.register(require('@fastify/swagger'), {
      swagger: {
        info: {
          title: 'Contract Generation Engine API',
          description: 'Automated generation of API specifications and system boundaries for parallel development',
          version: process.env.npm_package_version || '1.0.0',
          contact: {
            name: 'CycleTime Team',
            email: 'team@cycletime.dev',
          },
          license: {
            name: 'MIT',
          },
        },
        host: process.env.SWAGGER_HOST || 'localhost:8010',
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json', 'application/x-yaml'],
        securityDefinitions: {
          BearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'Bearer token authentication',
          },
        },
        security: [
          {
            BearerAuth: [],
          },
        ],
      },
    });

    await fastify.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
      },
    });

    // Initialize Redis connection
    const redis = options.redis || createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD,
      database: 0,
    });

    // Connect to Redis
    await redis.connect();
    logger.info('Connected to Redis', {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    // Initialize services
    const contractStorage = new ContractStorageService({ redis });
    const eventService = new EventService({ redis });
    const validationService = new ValidationService();
    const boundaryAnalysisService = new BoundaryAnalysisService();
    const stubGenerationService = new StubGenerationService();
    
    const contractService = new ContractGenerationService(
      contractStorage,
      validationService,
      eventService
    );

    // Initialize controllers
    const contractController = new ContractController(contractService);
    const healthController = new HealthController(contractStorage, eventService);

    // Register routes
    await contractController.registerRoutes(fastify);
    await healthController.registerRoutes(fastify);

    // Register boundary analysis routes
    fastify.post('/api/v1/boundaries/analyze', {
      schema: {
        description: 'Analyze system boundaries',
        tags: ['System Boundaries'],
        body: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'string' } },
            architecture: { type: 'string' },
            requirements: { type: 'string' },
            options: { type: 'object' },
          },
          required: ['services'],
        },
      },
    }, async (request, reply) => {
      try {
        const result = await boundaryAnalysisService.analyzeSystemBoundaries(request.body as any);
        reply.code(200).send(result);
      } catch (error) {
        logger.error('Boundary analysis failed', error.message);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    });

    // Register validation routes
    fastify.post('/api/v1/validation/contract', {
      schema: {
        description: 'Validate contract specification',
        tags: ['Validation'],
        body: {
          type: 'object',
          properties: {
            contract: { type: 'object' },
            options: { type: 'object' },
          },
          required: ['contract'],
        },
      },
    }, async (request, reply) => {
      try {
        const { contract, options } = request.body as any;
        const result = await validationService.validateContract(contract, options);
        reply.code(200).send(result);
      } catch (error) {
        logger.error('Contract validation failed', error.message);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    });

    // Register stub generation routes
    fastify.post('/api/v1/stubs/generate', {
      schema: {
        description: 'Generate service stub',
        tags: ['Stub Generation'],
        body: {
          type: 'object',
          properties: {
            specification: { type: 'object' },
            options: { type: 'object' },
          },
          required: ['specification'],
        },
      },
    }, async (request, reply) => {
      try {
        const { specification, options } = request.body as any;
        const result = await stubGenerationService.generateStub(specification, options);
        reply.code(200).send(result);
      } catch (error) {
        logger.error('Stub generation failed', error.message);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    });

    // Root endpoint
    fastify.get('/', async (request, reply) => {
      return {
        name: 'Contract Generation Engine',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Automated generation of API specifications and system boundaries for parallel development',
        documentation: {
          openapi: '/docs',
          health: '/health',
        },
        timestamp: new Date().toISOString(),
      };
    });

    // Error handler
    fastify.setErrorHandler(async (error, request, reply) => {
      logger.error(`Request error: ${error.message} [${request.method} ${request.url}]`);

      const statusCode = error.statusCode || 500;
      const response = {
        error: error.name || 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      return reply.code(statusCode).send(response);
    });

    // Not found handler
    fastify.setNotFoundHandler(async (request, reply) => {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    });

    // Add cleanup hook
    fastify.addHook('onClose', async (instance) => {
      logger.info('Closing application...');
      
      try {
        await contractStorage.cleanup();
        await eventService.cleanup();
        await redis.quit();
        logger.info('Application cleanup completed');
      } catch (error) {
        logger.error('Error during cleanup', error.message);
      }
    });

    // Subscribe to events
    await eventService.subscribeToRequirementUpdates(async (event) => {
      if (event.triggerRegeneration) {
        logger.info('Requirement updated, triggering contract regeneration', {
          requirementId: event.requirementId,
          serviceName: event.serviceName,
        });
        
        // In a real implementation, you would trigger contract regeneration here
        // For now, just log the event
      }
    });

    await eventService.subscribeToArchitectureChanges(async (event) => {
      if (event.triggerRegeneration) {
        logger.info('Architecture changed, triggering contract updates', {
          architectureId: event.architectureId,
          affectedServices: event.affectedServices,
        });
        
        // In a real implementation, you would trigger contract updates here
        // For now, just log the event
      }
    });

    await eventService.subscribeToServiceDefinitions(async (event) => {
      if (event.autoGenerateContract) {
        logger.info('New service defined, auto-generating contract', {
          serviceId: event.serviceId,
          serviceName: event.serviceName,
        });
        
        // In a real implementation, you would auto-generate the contract here
        // For now, just log the event
      }
    });

    logger.info('Contract Generation Engine application built successfully', {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    });

    return fastify;
  } catch (error) {
    logger.error('Failed to build application', error.message);
    throw error;
  }
}