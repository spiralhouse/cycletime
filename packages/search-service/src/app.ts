import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { logger } from '@cycletime/shared-utils';
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
        title: 'Search Service API',
        description: 'Global search service with Elasticsearch integration',
        version: '1.0.0',
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
  });

  // Initialize services
  const eventService = { publishEvent: async (type: string, data: any) => {} };
  const mockDataService = { getHealthStatus: () => ({ status: 'healthy', timestamp: new Date() }) };

  // Decorate app
  app.decorate('eventService', eventService);
  app.decorate('mockDataService', mockDataService);

  // Health endpoint
  app.get('/health', async (request, reply) => {
    reply.send({ status: 'healthy', timestamp: new Date(), version: '1.0.0' });
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    eventService: any;
    mockDataService: any;
  }
}