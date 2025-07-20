import fastify, { FastifyInstance, FastifyPluginOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { logger } from '@cycletime/shared-utils';
import { createMockDataService } from './services/mock-data-service';
import { createEventService } from './services/event-service';
import { createIndexingService } from './services/indexing-service';
import { createSearchService } from './services/search-service';
import { createEmbeddingService } from './services/embedding-service';
import { createAnalyticsService } from './services/analytics-service';
import { registerRoutes } from './routes';

interface AppOptions {
  port: number;
  host: string;
  logger: boolean;
}

export async function createApp(options: AppOptions): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger,
  });

  // Register plugins
  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });

  // Create services
  const mockDataService = createMockDataService();
  const eventService = createEventService();
  const indexingService = createIndexingService(mockDataService, eventService);
  const searchService = createSearchService(mockDataService, eventService);
  const embeddingService = createEmbeddingService(mockDataService, eventService);
  const analyticsService = createAnalyticsService(mockDataService, eventService);

  // Add services to app instance
  app.decorate('mockDataService', mockDataService);
  app.decorate('eventService', eventService);
  app.decorate('indexingService', indexingService);
  app.decorate('searchService', searchService);
  app.decorate('embeddingService', embeddingService);
  app.decorate('analyticsService', analyticsService);

  // Register routes
  await registerRoutes(app);

  // OpenAPI documentation
  await app.register(import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Document Indexing Service API',
        description: 'Vector-based semantic search and document indexing service with AI-powered embeddings',
        version: '1.0.0',
        contact: {
          name: 'CycleTime Team',
          email: 'team@cycletime.dev',
        },
        license: {
          name: 'MIT',
        },
      },
      servers: [
        {
          url: `http://${options.host}:${options.port}`,
          description: 'Development server',
        },
        {
          url: 'https://api.cycletime.dev/document-indexing',
          description: 'Production server',
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
      security: [
        {
          BearerAuth: [],
        },
      ],
    },
  });

  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error('Request error', error, {
      url: request.url,
      method: request.method,
    });

    const statusCode = error.statusCode || 500;
    const response = {
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    reply.status(statusCode).send(response);
  });

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    const healthStatus = mockDataService.getHealthStatus();
    reply.send(healthStatus);
  });

  return app;
}

// Type declarations for services
declare module 'fastify' {
  interface FastifyInstance {
    mockDataService: ReturnType<typeof createMockDataService>;
    eventService: ReturnType<typeof createEventService>;
    indexingService: ReturnType<typeof createIndexingService>;
    searchService: ReturnType<typeof createSearchService>;
    embeddingService: ReturnType<typeof createEmbeddingService>;
    analyticsService: ReturnType<typeof createAnalyticsService>;
  }
}