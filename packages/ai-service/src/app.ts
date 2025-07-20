import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { logger } from '@cycletime/shared-utils';
// import { loadConfig } from '@cycletime/shared-config';

// Import stub controllers
import { healthController } from './controllers/health-controller';
import { providerController } from './controllers/provider-controller';
import { modelController } from './controllers/model-controller';
import { chatController } from './controllers/chat-controller';
import { contextController } from './controllers/context-controller';
import { projectController } from './controllers/project-controller';
import { embeddingController } from './controllers/embedding-controller';
import { analyticsController } from './controllers/analytics-controller';
import { requestController } from './controllers/request-controller';

// Import services
import { EventService } from './services/event-service';
import { MockDataService } from './services/mock-data-service';

// Import middleware
import { authPlugin } from './middleware/auth-middleware';

export interface AppOptions {
  port?: number;
  host?: string;
  logger?: boolean;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  // Mock config for development
  const config = {
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
  };
  
  const app = Fastify({
    logger: options.logger ?? {
      level: config.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    disableRequestLogging: process.env.NODE_ENV === 'production',
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Security middleware
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: config.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX || 100,
    timeWindow: config.RATE_LIMIT_WINDOW || '1 minute',
    errorResponseBuilder: (_request, context) => {
      return {
        error: 'Rate limit exceeded',
        message: `Too many requests, please try again later.`,
        statusCode: 429,
        timeWindow: '1 minute',
        limit: context.max,
      };
    },
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'AI Service API',
        description: 'Multi-provider AI orchestration service with context optimization and intelligent project analysis',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://${options.host || 'localhost'}:${options.port || 8003}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ BearerAuth: [] }],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Initialize services
  const eventService = new EventService();
  const mockDataService = new MockDataService();

  // Decorate Fastify instance with services
  app.decorate('eventService', eventService);
  app.decorate('mockDataService', mockDataService);

  // Register authentication middleware
  await app.register(authPlugin);

  // Register controllers
  await app.register(healthController);
  await app.register(providerController);
  await app.register(modelController);
  await app.register(chatController);
  await app.register(contextController);
  await app.register(projectController);
  await app.register(embeddingController);
  await app.register(analyticsController);
  await app.register(requestController);

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    const errorId = crypto.randomUUID();
    
    logger.error('Request error', error);

    // Publish error event
    await eventService.publishEvent('ai/service/error', {
      errorId,
      error: error.message,
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      timestamp: new Date().toISOString(),
    });

    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;

    return reply.status(statusCode).send({
      error: message,
      message: statusCode === 500 ? 'An unexpected error occurred' : error.message,
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: errorId,
    });
  });

  // 404 handler
  app.setNotFoundHandler(async (request, reply) => {
    const errorId = crypto.randomUUID();
    
    logger.warn('Route not found', {
      errorId,
      url: request.url,
      method: request.method,
      headers: request.headers,
    });

    return reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      code: 'ROUTE_NOT_FOUND',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: errorId,
    });
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    try {
      await eventService.publishEvent('ai/service/shutdown', {
        signal,
        timestamp: new Date().toISOString(),
      });
      
      // Cleanup mock data service
      mockDataService.cleanup();
      
      await app.close();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error as Error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return app;
}

// Add type declarations for decorated properties
declare module 'fastify' {
  interface FastifyInstance {
    eventService: EventService;
    mockDataService: MockDataService;
  }
}