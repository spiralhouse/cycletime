import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config';
import { DocumentService } from './services/document-service';
import { StorageService } from './services/storage-service';
import { EventService } from './services/event-service';
import { MockDataService } from './services/mock-data-service';
import { DocumentController } from './controllers/document-controller';
import { registerRoutes } from './routes';
import { logger } from './utils/logger';

export class App {
  private server: FastifyInstance;
  private documentService!: DocumentService;
  private storageService!: StorageService;
  private eventService!: EventService;
  private mockDataService!: MockDataService;
  private documentController!: DocumentController;

  constructor() {
    this.server = fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
    });

    this.initializeServices();
    this.registerPlugins();
    this.registerRoutes();
    this.registerErrorHandlers();
  }

  private initializeServices(): void {
    // Initialize services
    this.storageService = new StorageService(config.storage);
    this.eventService = new EventService(config.redis);
    this.mockDataService = new MockDataService();
    this.documentService = new DocumentService(
      this.storageService,
      this.eventService,
      this.mockDataService
    );
    this.documentController = new DocumentController(this.documentService);

    logger.info('Services initialized successfully');
  }

  private async registerPlugins(): Promise<void> {
    // Register CORS
    await this.server.register(cors, {
      origin: process.env.NODE_ENV === 'production' 
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

    // Register multipart for file uploads
    await this.server.register(multipart, {
      limits: {
        fileSize: config.security.maxFileSize,
        files: 10,
      },
    });

    // Register Swagger for API documentation
    await this.server.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Document Service API',
          description: 'Document lifecycle management service with version control, collaboration, and search integration',
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
            url: `http://localhost:${config.port}`,
            description: 'Development server',
          },
          {
            url: 'https://api.cycletime.dev/documents',
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
      transformSpecification: (swaggerObject) => {
        return swaggerObject;
      },
      transformSpecificationClone: true,
    });

    logger.info('Fastify plugins registered successfully');
  }

  private registerRoutes(): void {
    registerRoutes(this.server, this.documentController);
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
      await this.server.listen({ 
        port: config.port, 
        host: config.host 
      });
      
      logger.info(`Document service started successfully`, {
        port: config.port,
        host: config.host,
        environment: process.env.NODE_ENV || 'development'
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
      await this.eventService.disconnect();
      logger.info('Document service stopped successfully');
    } catch (error) {
      logger.error('Failed to stop server gracefully', { error });
      process.exit(1);
    }
  }

  public getServer(): FastifyInstance {
    return this.server;
  }

  public getDocumentService(): DocumentService {
    return this.documentService;
  }

  public getStorageService(): StorageService {
    return this.storageService;
  }

  public getEventService(): EventService {
    return this.eventService;
  }
}