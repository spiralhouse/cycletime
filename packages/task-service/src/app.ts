import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import { logger } from '@cycletime/shared-utils';
import { TaskServiceConfiguration } from './types/service-types';
import { setupRoutes } from './routes';
import { TaskService } from './services/task-service';
import { EventService } from './services/event-service';
import { MockDataService } from './services/mock-data-service';
import { QueueService } from './services/queue-service';
import { SchedulerService } from './services/scheduler-service';
import { HealthService } from './services/health-service';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth-middleware';
import { requestLogger } from './middleware/request-logger';

export async function createApp(config: TaskServiceConfiguration): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger,
    trustProxy: true,
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB
    keepAliveTimeout: 30000,
    connectionTimeout: 30000,
    pluginTimeout: 30000,
    requestTimeout: 30000
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register plugins
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: config.server.helmet.contentSecurityPolicy
  });

  await app.register(fastifyCors, {
    origin: config.server.cors.origin,
    credentials: config.server.cors.credentials
  });

  await app.register(fastifyRateLimit, {
    max: config.server.rateLimit.max,
    timeWindow: config.server.rateLimit.timeWindow,
    skipOnError: true
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB
    }
  });

  // Register Swagger documentation
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Task Service API',
        description: 'Task lifecycle management service with dependency tracking, scheduling, and execution monitoring',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${config.server.port}`,
          description: 'Development server'
        },
        {
          url: 'https://api.cycletime.dev/tasks',
          description: 'Production server'
        }
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [
        {
          BearerAuth: []
        }
      ]
    }
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'none',
      deepLinking: false
    }
  });

  // Initialize services
  const eventService = new EventService(config.events);
  const mockDataService = new MockDataService();
  const queueService = new QueueService(config.queue);
  const schedulerService = new SchedulerService(config.scheduler);
  const healthService = new HealthService();
  const taskService = new TaskService(
    mockDataService,
    eventService,
    queueService,
    schedulerService
  );

  // Register services with app
  app.decorate('taskService', taskService);
  app.decorate('eventService', eventService);
  app.decorate('mockDataService', mockDataService);
  app.decorate('queueService', queueService);
  app.decorate('schedulerService', schedulerService);
  app.decorate('healthService', healthService);
  app.decorate('config', config);

  // Register middleware
  await app.register(requestLogger);
  await app.register(authMiddleware);
  await app.register(errorHandler);

  // Register routes
  await app.register(setupRoutes, { prefix: '/api/v1' });

  // Health check endpoint (outside versioned API)
  app.get('/health', async (request, reply) => {
    const health = await healthService.getHealth();
    return reply.code(200).send(health);
  });

  // Ready endpoint
  app.get('/ready', async (request, reply) => {
    try {
      await healthService.checkReadiness();
      return reply.code(200).send({ status: 'ready' });
    } catch (error) {
      return reply.code(503).send({ status: 'not ready', error: error.message });
    }
  });

  // Metrics endpoint
  if (config.monitoring.metrics.enabled) {
    app.get('/metrics', async (request, reply) => {
      const metrics = await healthService.getMetrics();
      return reply.code(200).type('text/plain').send(metrics);
    });
  }

  // Initialize services
  await app.after(async () => {
    try {
      await eventService.start();
      await queueService.start();
      
      if (config.scheduler.enabled) {
        await schedulerService.start();
      }
      
      app.log.info('Task service initialized successfully');
    } catch (error) {
      app.log.error('Failed to initialize task service:', error);
      throw error;
    }
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      await schedulerService.stop();
      await queueService.stop();
      await eventService.stop();
      await app.close();
      
      app.log.info('Task service shut down successfully');
      process.exit(0);
    } catch (error) {
      app.log.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return app;
}

// Type declarations for Fastify decorators
declare module 'fastify' {
  interface FastifyInstance {
    taskService: TaskService;
    eventService: EventService;
    mockDataService: MockDataService;
    queueService: QueueService;
    schedulerService: SchedulerService;
    healthService: HealthService;
    config: TaskServiceConfiguration;
  }
}