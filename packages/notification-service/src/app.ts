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
import { notificationController } from './controllers/notification-controller';
import { templateController } from './controllers/template-controller';
import { preferencesController } from './controllers/preferences-controller';
import { deliveryStatusController } from './controllers/delivery-status-controller';
import { channelController } from './controllers/channel-controller';

// Import services
import { EventService } from './services/event-service';
import { MockDataService } from './services/mock-data-service';
import { NotificationService } from './services/notification-service';
import { TemplateService } from './services/template-service';
import { PreferencesService } from './services/preferences-service';
import { DeliveryTrackingService } from './services/delivery-tracking-service';

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
        title: 'Notification Service API',
        description: 'Multi-channel notification service with template management',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${options.port || 8008}`,
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
      onRequest: function (_request, _reply, next) {
        next();
      },
      preHandler: function (_request, _reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, _request, _reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // Initialize services
  const eventService = new EventService();
  const mockDataService = new MockDataService();
  const notificationService = new NotificationService(eventService, mockDataService);
  const templateService = new TemplateService(eventService, mockDataService);
  const preferencesService = new PreferencesService(eventService, mockDataService);
  const deliveryTrackingService = new DeliveryTrackingService(eventService, mockDataService);

  // Decorate Fastify instance with services
  app.decorate('eventService', eventService);
  app.decorate('mockDataService', mockDataService);
  app.decorate('notificationService', notificationService);
  app.decorate('templateService', templateService);
  app.decorate('preferencesService', preferencesService);
  app.decorate('deliveryTrackingService', deliveryTrackingService);

  // Register routes
  await app.register(healthController, { prefix: '/health' });
  await app.register(notificationController, { prefix: '/api/v1/notifications' });
  await app.register(templateController, { prefix: '/api/v1/templates' });
  await app.register(preferencesController, { prefix: '/api/v1/preferences' });
  await app.register(deliveryStatusController, { prefix: '/api/v1/delivery-status' });
  await app.register(channelController, { prefix: '/api/v1/channels' });

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    logger.error('Request error', error as Error, {
      url: request.url,
      method: request.method,
    });

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
    notificationService: NotificationService;
    templateService: TemplateService;
    preferencesService: PreferencesService;
    deliveryTrackingService: DeliveryTrackingService;
  }
}