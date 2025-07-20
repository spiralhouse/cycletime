import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { APIResponse, HttpStatus } from '@cycletime/shared-types';
import { getEnvVar, getEnvVarAsNumber, isProduction } from '@cycletime/shared-config';
import { logger } from './utils/logger';

export class App {
  private server: FastifyInstance;

  constructor() {
    this.server = fastify({
      loggerInstance: logger,
    });

    this.registerPlugins();
    this.registerRoutes();
    this.registerErrorHandlers();
  }

  private async registerPlugins(): Promise<void> {
    // Register CORS
    await this.server.register(cors, {
      origin: isProduction() 
        ? ['https://app.cycletime.dev', 'https://cycletime.dev']
        : true,
      credentials: true,
    });

    // Register Helmet for security
    await this.server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    });

    // Register rate limiting
    await this.server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      errorResponseBuilder: (request, context) => {
        return {
          code: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded, retry in 1 minute`,
          date: Date.now(),
          expiresIn: '1 minute',
        };
      },
    });

    // Register Swagger for API documentation
    await this.server.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Standards Engine API',
          description: 'Development standards management and delivery system for AI-assisted development',
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
            url: `http://localhost:${getEnvVarAsNumber('PORT', 3007)}`,
            description: 'Development server',
          },
          {
            url: 'https://api.cycletime.dev/standards',
            description: 'Production server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    });

    // Register Swagger UI
    await this.server.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
      },
      staticCSP: true,
    });

    logger.info('Fastify plugins registered successfully');
  }

  private registerRoutes(): void {
    // Health check endpoint
    this.server.get('/health', async (request, reply) => {
      const response: APIResponse = {
        success: true,
        data: {
          status: 'healthy',
          service: 'standards-engine',
          version: getEnvVar('npm_package_version', '1.0.0'),
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
      reply.status(HttpStatus.OK).send(response);
    });

    // Basic standards endpoints placeholders
    this.server.get('/api/v1/standards', async (request, reply) => {
      const response: APIResponse = {
        success: true,
        data: {
          message: 'Standards endpoint - implementation pending',
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
      reply.status(HttpStatus.OK).send(response);
    });

    this.server.get('/api/v1/compliance', async (request, reply) => {
      const response: APIResponse = {
        success: true,
        data: {
          message: 'Compliance endpoint - implementation pending',
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
      reply.status(HttpStatus.OK).send(response);
    });

    logger.info('Routes registered successfully');
  }

  private registerErrorHandlers(): void {
    this.server.setErrorHandler(async (error, request, reply) => {
      logger.error('Unhandled error', { 
        error: error.message, 
        stack: error.stack,
        url: request.url,
        method: request.method 
      });

      if (error.statusCode) {
        reply.status(error.statusCode).send({
          error: error.name,
          message: error.message,
          statusCode: error.statusCode,
          timestamp: new Date().toISOString(),
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    });

    this.server.setNotFoundHandler(async (request, reply) => {
      reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    });

    logger.info('Error handlers registered successfully');
  }

  public async start(): Promise<void> {
    try {
      const port = getEnvVarAsNumber('PORT', 3007);
      const host = getEnvVar('HOST', '0.0.0.0');
      
      await this.server.listen({ port, host });
      
      logger.info(`Standards Engine started successfully`, {
        port,
        host,
        environment: getEnvVar('NODE_ENV', 'development')
      });

      // Log available routes
      logger.info('Available routes:');
      this.server.printRoutes();
    } catch (error) {
      logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.server.close();
      logger.info('Standards Engine stopped successfully');
    } catch (error) {
      logger.error('Failed to stop server gracefully', { error });
      process.exit(1);
    }
  }

  public getServer(): FastifyInstance {
    return this.server;
  }
}