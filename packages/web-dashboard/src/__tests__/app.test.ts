import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WebDashboardApp } from '../app';

describe('WebDashboardApp', () => {
  let app: WebDashboardApp;

  beforeEach(async () => {
    app = new WebDashboardApp();
    await app.initialize();
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize all services', async () => {
      expect(app.getDashboardService()).toBeDefined();
      expect(app.getAuthService()).toBeDefined();
      expect(app.getWebSocketService()).toBeDefined();
      expect(app.getEventService()).toBeDefined();
      expect(app.getProxyService()).toBeDefined();
    });

    it('should initialize fastify instance', () => {
      const fastify = app.getFastifyInstance();
      expect(fastify).toBeDefined();
    });
  });

  describe('health check', () => {
    it('should respond to health check', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.status).toBeDefined();
    });
  });

  describe('authentication routes', () => {
    it('should handle login with valid credentials', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'john.doe@cycletime.dev',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user).toBeDefined();
      expect(body.data.tokens).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'invalid@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should require authentication for protected routes', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/overview',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('dashboard routes', () => {
    let authToken: string;

    beforeEach(async () => {
      const fastify = app.getFastifyInstance();
      const loginResponse = await fastify.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'john.doe@cycletime.dev',
          password: 'password123',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      authToken = loginBody.data.tokens.accessToken;
    });

    it('should return dashboard overview', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/overview',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.summary).toBeDefined();
      expect(body.data.recentActivity).toBeDefined();
    });

    it('should return projects summary', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/projects',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.projects).toBeDefined();
      expect(Array.isArray(body.data.projects)).toBe(true);
    });

    it('should return tasks summary', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/tasks',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.tasks).toBeDefined();
      expect(Array.isArray(body.data.tasks)).toBe(true);
    });

    it('should return analytics data', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/analytics',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.metrics).toBeDefined();
      expect(body.data.charts).toBeDefined();
    });

    it('should return notifications', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/notifications',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.notifications).toBeDefined();
      expect(Array.isArray(body.data.notifications)).toBe(true);
    });

    it('should handle search requests', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/dashboard/search?q=test',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.results).toBeDefined();
      expect(Array.isArray(body.data.results)).toBe(true);
    });
  });

  describe('preferences routes', () => {
    let authToken: string;

    beforeEach(async () => {
      const fastify = app.getFastifyInstance();
      const loginResponse = await fastify.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'john.doe@cycletime.dev',
          password: 'password123',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      authToken = loginBody.data.tokens.accessToken;
    });

    it('should return user preferences', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/preferences',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.theme).toBeDefined();
      expect(body.data.notifications).toBeDefined();
    });

    it('should update user preferences', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/preferences',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          theme: 'dark',
          notifications: {
            email: false,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.theme).toBe('dark');
    });
  });

  describe('widget routes', () => {
    let authToken: string;

    beforeEach(async () => {
      const fastify = app.getFastifyInstance();
      const loginResponse = await fastify.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'john.doe@cycletime.dev',
          password: 'password123',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      authToken = loginBody.data.tokens.accessToken;
    });

    it('should return user widgets', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/widgets',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.widgets).toBeDefined();
      expect(Array.isArray(body.data.widgets)).toBe(true);
    });

    it('should create a new widget', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/widgets',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          type: 'tasks',
          title: 'Test Widget',
          position: { x: 0, y: 0, width: 6, height: 4 },
          config: { refreshInterval: 60, showHeader: true, theme: 'auto' },
          enabled: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Test Widget');
      expect(body.data.id).toBeDefined();
    });
  });

  describe('frontend routes', () => {
    it('should render homepage', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should render dashboard page', async () => {
      const fastify = app.getFastifyInstance();
      const response = await fastify.inject({
        method: 'GET',
        url: '/dashboard',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });
});