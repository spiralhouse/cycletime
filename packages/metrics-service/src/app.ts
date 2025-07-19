import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { logger } from '@cycletime/shared-utils';
import { loadConfig } from '@cycletime/shared-config';

// Import controllers
import { healthController } from './controllers/health-controller';
import { metricsController } from './controllers/metrics-controller';
import { dashboardController } from './controllers/dashboard-controller';
import { alertController } from './controllers/alert-controller';
import { systemHealthController } from './controllers/system-health-controller';

// Import services
import { EventService } from './services/event-service';
import { MockDataService } from './services/mock-data-service';
import { MetricsCollectionService } from './services/metrics-collection-service';
import { AlertingService } from './services/alerting-service';
import { DashboardService } from './services/dashboard-service';

export interface AppOptions {
  port?: number;
  host?: string;
  logger?: boolean;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const config = await loadConfig();
  
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
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: (origin, callback) => {
      const hostname = new URL(origin || 'http://localhost').hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.cycletime.dev')) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'), false);
    },
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Metrics Service API',
        description: 'Metrics collection and monitoring service with Prometheus integration',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${options.port || 8007}`,
          description: 'Development server',
        },
      ],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
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

  // Initialize services
  const eventService = new EventService();
  const mockDataService = new MockDataService();
  const metricsCollectionService = new MetricsCollectionService(eventService, mockDataService);
  const alertingService = new AlertingService(eventService, mockDataService);
  const dashboardService = new DashboardService(eventService, mockDataService);

  // Decorate Fastify instance with services
  app.decorate('eventService', eventService);
  app.decorate('mockDataService', mockDataService);
  app.decorate('metricsCollectionService', metricsCollectionService);
  app.decorate('alertingService', alertingService);
  app.decorate('dashboardService', dashboardService);

  // Register routes
  await app.register(healthController, { prefix: '/health' });
  await app.register(metricsController, { prefix: '/api/v1/metrics' });
  await app.register(dashboardController, { prefix: '/api/v1/dashboards' });
  await app.register(alertController, { prefix: '/api/v1/alerts' });
  await app.register(systemHealthController, { prefix: '/api/v1/system' });

  // Prometheus metrics endpoint
  app.get('/metrics', async (request, reply) => {
    const metrics = mockDataService.getPrometheusMetrics();
    reply.type('text/plain').send(metrics);
  });

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    logger.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    }, 'Request error');

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.message,
      });
    }

    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

  return app;
}

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    eventService: EventService;
    mockDataService: MockDataService;
    metricsCollectionService: MetricsCollectionService;
    alertingService: AlertingService;
    dashboardService: DashboardService;
  }
}