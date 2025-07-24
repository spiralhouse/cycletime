import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { logger } from '@cycletime/shared-utils';
import { config } from './config';
import { registerRoutes } from './routes';
import { ErrorHandler } from './utils/error-handler';
import { EventService } from './services/event-service';
import { HealthService } from './services/health-service';
import { ProjectService } from './services/project-service';
import { TeamService } from './services/team-service';
import { TemplateService } from './services/template-service';
import { AnalyticsService } from './services/analytics-service';
import { ResourceService } from './services/resource-service';
import { InsightService } from './services/insight-service';
import { MockDataService } from './services/mock-data-service';

export async function createApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: logger as any,
    trustProxy: true,
    disableRequestLogging: process.env.NODE_ENV === 'production'
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  await app.register(multipart);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // Register Swagger
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Project Service API',
        description: 'Project lifecycle management service with team management, templates, analytics, and intelligent project insights',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server'
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

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  // Initialize services
  const eventService = new EventService();
  const healthService = new HealthService();
  const mockDataService = new MockDataService();
  const projectService = new ProjectService(eventService, mockDataService);
  const teamService = new TeamService(eventService, mockDataService);
  const templateService = new TemplateService(eventService, mockDataService);
  const analyticsService = new AnalyticsService(eventService, mockDataService);
  const resourceService = new ResourceService(eventService, mockDataService);
  const insightService = new InsightService(eventService, mockDataService);

  // Register services in app context
  app.decorate('services', {
    event: eventService,
    health: healthService,
    project: projectService,
    team: teamService,
    template: templateService,
    analytics: analyticsService,
    resource: resourceService,
    insight: insightService,
    mockData: mockDataService
  });

  // Register error handler
  app.setErrorHandler(ErrorHandler.handle);

  // Register routes
  await registerRoutes(app);

  // Health check endpoint
  app.get('/health', async () => {
    return await healthService.getHealth();
  });

  return app;
}

// Service-specific type declarations
declare module 'fastify' {
  interface FastifyInstance {
    eventService: any;
    mockDataService: any;
    services: {
      health: HealthService;
      project: ProjectService;
      team: TeamService;
      template: TemplateService;
      analytics: AnalyticsService;
      resource: ResourceService;
      insight: InsightService;
    };
  }
}