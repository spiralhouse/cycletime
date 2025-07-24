import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from '@cycletime/shared-config';

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
    },
    disableRequestLogging: process.env.NODE_ENV === 'production',
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Security middleware
  await app.register(helmet);
  await app.register(cors);

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Activity Service API',
        description: 'Activity tracking and audit logging service',
        version: '1.0.0',
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
  });

  // Initialize services
  const eventService = { publishEvent: async (_type: string, _data: unknown) => {} };
  const mockDataService = { getHealthStatus: () => ({ status: 'healthy', timestamp: new Date() }) };

  // Decorate app
  app.decorate('eventService', eventService);
  app.decorate('mockDataService', mockDataService);

  // Health endpoint
  app.get('/health', async (_request, reply) => {
    reply.send({ status: 'healthy', timestamp: new Date(), version: '1.0.0' });
  });

  return app;
}

// Service types
interface EventService {
  publishEvent(type: string, data: unknown): Promise<void>;
}

interface MockDataService {
  getHealthStatus(): { status: string; timestamp: Date };
}

// Local Fastify type declarations
declare module 'fastify' {
  interface FastifyInstance {
    eventService: EventService;
    mockDataService: MockDataService;
  }
}