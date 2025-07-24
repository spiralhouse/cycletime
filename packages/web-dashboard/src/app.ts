import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import { randomUUID } from 'crypto';
import path from 'path';
import { DashboardService } from './services/dashboard-service';
import { AuthService } from './services/auth-service';
import { WebSocketService } from './services/websocket-service';
import { EventService } from './services/event-service';
import { ProxyService } from './services/proxy-service';

export class WebDashboardApp {
  private fastify: FastifyInstance;
  private dashboardService: DashboardService;
  private authService: AuthService;
  private wsService: WebSocketService;
  private eventService: EventService;
  private proxyService: ProxyService;

  constructor() {
    this.fastify = Fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'reqId',
      genReqId: () => randomUUID(),
    });

    this.dashboardService = new DashboardService();
    this.authService = new AuthService();
    this.wsService = new WebSocketService();
    this.eventService = new EventService();
    this.proxyService = new ProxyService();
  }

  public async initialize(): Promise<void> {
    await this.registerPlugins();
    await this.registerRoutes();
    await this.initializeServices();
    await this.setupEventHandlers();
  }

  private async registerPlugins(): Promise<void> {
    // Security plugins
    await this.fastify.register(helmet, {
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });

    await this.fastify.register(cors, {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    });

    await this.fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Static files
    await this.fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../public'),
      prefix: '/public/',
    });

    // View engine
    await this.fastify.register(fastifyView, {
      engine: {
        handlebars: require('handlebars'),
      },
      root: path.join(__dirname, '../views'),
      layout: 'layouts/main',
      viewExt: 'hbs',
    });

    // Swagger documentation
    await this.fastify.register(swagger, {
      openapi: {
        openapi: '3.0.3',
        info: {
          title: 'Web Dashboard Service API',
          description: 'Web Dashboard Service providing the main web interface for CycleTime',
          version: '1.0.0',
        },
        servers: [
          {
            url: 'http://localhost:3000',
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

    await this.fastify.register(swaggerUI, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'none',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject) => swaggerObject,
      transformSpecificationClone: true,
    });
  }

  private async registerRoutes(): Promise<void> {
    // Health check
    this.fastify.get('/health', async (request, reply) => {
      const health = await this.dashboardService.getHealthStatus();
      reply.code(200).send(health);
    });

    // Authentication routes
    this.fastify.post('/api/v1/auth/login', {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            rememberMe: { type: 'boolean' },
          },
        },
      },
    }, async (request, reply) => {
      const { email, password, rememberMe } = request.body as any;
      const result = await this.dashboardService.login({ email, password, rememberMe });
      reply.code(result.success ? 200 : 401).send(result);
    });

    this.fastify.post('/api/v1/auth/logout', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const token = request.headers.authorization?.substring(7) || '';
      const result = await this.dashboardService.logout(token);
      reply.code(200).send(result);
    });

    this.fastify.post('/api/v1/auth/refresh', {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    }, async (request, reply) => {
      const { refreshToken } = request.body as any;
      const result = await this.dashboardService.refreshToken(refreshToken);
      reply.code(result.success ? 200 : 401).send(result);
    });

    this.fastify.get('/api/v1/auth/profile', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const result = await this.dashboardService.getUserProfile(userId);
      reply.code(result.success ? 200 : 404).send(result);
    });

    // Dashboard routes
    this.fastify.get('/api/v1/dashboard/overview', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const { timeframe, projectId } = request.query as any;
      const result = await this.dashboardService.getDashboardOverview(userId, timeframe, projectId);
      reply.code(200).send(result);
    });

    this.fastify.get('/api/v1/dashboard/projects', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const options = request.query as any;
      const result = await this.dashboardService.getProjectsSummary(userId, options);
      reply.code(200).send(result);
    });

    this.fastify.get('/api/v1/dashboard/tasks', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const options = request.query as any;
      const result = await this.dashboardService.getTasksSummary(userId, options);
      reply.code(200).send(result);
    });

    this.fastify.get('/api/v1/dashboard/analytics', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const options = request.query as any;
      const result = await this.dashboardService.getDashboardAnalytics(userId, options);
      reply.code(200).send(result);
    });

    this.fastify.get('/api/v1/dashboard/notifications', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const options = request.query as any;
      const result = await this.dashboardService.getNotifications(userId, options);
      reply.code(200).send(result);
    });

    this.fastify.post('/api/v1/dashboard/notifications/:notificationId/read', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const { notificationId } = request.params as any;
      const result = await this.dashboardService.markNotificationRead(notificationId, userId);
      reply.code(result.success ? 200 : 404).send(result);
    });

    this.fastify.get('/api/v1/dashboard/search', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const { q, type, limit } = request.query as any;
      const result = await this.dashboardService.searchDashboard(q, userId, { type, limit });
      reply.code(200).send(result);
    });

    // Preferences routes
    this.fastify.get('/api/v1/preferences', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const result = await this.dashboardService.getUserPreferences(userId);
      reply.code(result.success ? 200 : 404).send(result);
    });

    this.fastify.put('/api/v1/preferences', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const preferences = request.body as any;
      const result = await this.dashboardService.updateUserPreferences(userId, preferences);
      reply.code(result.success ? 200 : 400).send(result);
    });

    // Widget routes
    this.fastify.get('/api/v1/widgets', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const result = await this.dashboardService.getDashboardWidgets(userId);
      reply.code(200).send(result);
    });

    this.fastify.post('/api/v1/widgets', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const widgetData = request.body as any;
      const result = await this.dashboardService.addDashboardWidget(userId, widgetData);
      reply.code(result.success ? 201 : 400).send(result);
    });

    this.fastify.put('/api/v1/widgets/:widgetId', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const { widgetId } = request.params as any;
      const updates = request.body as any;
      const result = await this.dashboardService.updateDashboardWidget(widgetId, userId, updates);
      reply.code(result.success ? 200 : 404).send(result);
    });

    this.fastify.delete('/api/v1/widgets/:widgetId', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const { widgetId } = request.params as any;
      const result = await this.dashboardService.removeDashboardWidget(widgetId, userId);
      reply.code(result.success ? 204 : 404).send(result);
    });

    // Proxy routes
    this.fastify.all('/api/v1/proxy/:serviceName/*', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const { serviceName } = request.params as any;
      const path = `/${(request.params as any)['*']}`;
      const method = request.method.toUpperCase();
      const data = request.body;
      const headers = { ...request.headers };
      delete headers['content-length'];
      
      try {
        const result = await this.dashboardService.proxyRequest(serviceName, method, path, data);
        reply.code(result.success ? 200 : 500).send(result);
      } catch (error) {
        reply.code(500).send({
          success: false,
          error: 'Proxy request failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Real-time status
    this.fastify.get('/api/v1/realtime/status', {
      preHandler: this.authService.createAuthMiddleware(),
    }, async (request, reply) => {
      const userId = (request as any).userId;
      const result = await this.dashboardService.getRealtimeStatus(userId);
      reply.code(200).send(result);
    });

    // Frontend routes
    this.fastify.get('/', async (request, reply) => {
      return reply.view('index', {
        title: 'CycleTime Dashboard',
        description: 'Web Dashboard for CycleTime Project Management',
      });
    });

    this.fastify.get('/dashboard', async (request, reply) => {
      return reply.view('dashboard', {
        title: 'Dashboard - CycleTime',
        description: 'Main dashboard for CycleTime',
      });
    });

    this.fastify.get('/projects', async (request, reply) => {
      return reply.view('projects', {
        title: 'Projects - CycleTime',
        description: 'Project management dashboard',
      });
    });

    this.fastify.get('/tasks', async (request, reply) => {
      return reply.view('tasks', {
        title: 'Tasks - CycleTime',
        description: 'Task management dashboard',
      });
    });

    this.fastify.get('/analytics', async (request, reply) => {
      return reply.view('analytics', {
        title: 'Analytics - CycleTime',
        description: 'Analytics and reporting dashboard',
      });
    });

    this.fastify.get('/settings', async (request, reply) => {
      return reply.view('settings', {
        title: 'Settings - CycleTime',
        description: 'User settings and preferences',
      });
    });

    // Catch-all route for SPA
    this.fastify.get('/*', async (request, reply) => {
      return reply.view('index', {
        title: 'CycleTime Dashboard',
        description: 'Web Dashboard for CycleTime Project Management',
      });
    });
  }

  private async initializeServices(): Promise<void> {
    await this.dashboardService.initialize();
    await this.authService.initialize();
    await this.wsService.initialize();
    await this.eventService.initialize();
    await this.proxyService.initialize();
  }

  private async setupEventHandlers(): Promise<void> {
    // Dashboard service events
    this.dashboardService.on('user.connected', (data) => {
      this.wsService.broadcastToRoom('dashboard', 'user.connected', data);
    });

    this.dashboardService.on('user.disconnected', (data) => {
      this.wsService.broadcastToRoom('dashboard', 'user.disconnected', data);
    });

    this.dashboardService.on('dashboard.data.updated', (data) => {
      this.wsService.broadcastToRoom('dashboard', 'dashboard.data.updated', data);
    });

    this.dashboardService.on('notification.sent', (data) => {
      this.wsService.sendNotificationToUser(data.userId, data);
    });

    // Proxy service events
    this.proxyService.on('circuit-breaker.opened', (data) => {
      this.fastify.log.warn('Circuit breaker opened', data);
    });

    this.proxyService.on('circuit-breaker.closed', (data) => {
      this.fastify.log.info('Circuit breaker closed', data);
    });

    // WebSocket service events
    this.wsService.on('connection.added', (connection) => {
      this.fastify.log.info('WebSocket connection added', { connectionId: connection.id, userId: connection.userId });
    });

    this.wsService.on('connection.removed', (connection) => {
      this.fastify.log.info('WebSocket connection removed', { connectionId: connection.id, userId: connection.userId });
    });
  }

  public async start(port: number = 3000, host: string = '0.0.0.0'): Promise<void> {
    try {
      await this.fastify.listen({ port, host });
      this.fastify.log.info(`Web Dashboard Service running on http://${host}:${port}`);
      this.fastify.log.info(`API Documentation: http://${host}:${port}/docs`);
    } catch (error) {
      this.fastify.log.error('Failed to start server', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.dashboardService.shutdown();
      await this.authService.shutdown();
      await this.wsService.shutdown();
      await this.eventService.shutdown();
      await this.proxyService.shutdown();
      await this.fastify.close();
      this.fastify.log.info('Web Dashboard Service stopped');
    } catch (error) {
      this.fastify.log.error('Error stopping server', error);
    }
  }

  public getFastifyInstance(): FastifyInstance {
    return this.fastify;
  }

  public getDashboardService(): DashboardService {
    return this.dashboardService;
  }

  public getAuthService(): AuthService {
    return this.authService;
  }

  public getWebSocketService(): WebSocketService {
    return this.wsService;
  }

  public getEventService(): EventService {
    return this.eventService;
  }

  public getProxyService(): ProxyService {
    return this.proxyService;
  }
}