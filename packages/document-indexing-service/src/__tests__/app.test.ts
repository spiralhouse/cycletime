import { FastifyInstance } from 'fastify';
import { createApp } from '../app';

describe('Application Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp({
      port: 0,
      host: 'localhost',
      logger: false
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Application Setup', () => {
    it('should create app successfully', () => {
      expect(app).toBeDefined();
    });

    it('should have all required services decorated', () => {
      expect(app.mockDataService).toBeDefined();
      expect(app.eventService).toBeDefined();
      expect(app.indexingService).toBeDefined();
      expect(app.searchService).toBeDefined();
      expect(app.embeddingService).toBeDefined();
      expect(app.analyticsService).toBeDefined();
    });

    it('should have swagger documentation available', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should have OpenAPI JSON specification available', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json'
      });

      expect(response.statusCode).toBe(200);
      const spec = response.json();
      
      expect(spec).toHaveProperty('openapi');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
      expect(spec.info.title).toBe('Document Indexing Service API');
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('dependencies');
      expect(body).toHaveProperty('metrics');
    });

    it('should provide dependency status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/dependencies'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      
      expect(body).toHaveProperty('dependencies');
      expect(body.dependencies).toHaveProperty('vectorDatabase');
      expect(body.dependencies).toHaveProperty('embeddingService');
      expect(body.dependencies).toHaveProperty('redis');
      expect(body.dependencies).toHaveProperty('textProcessor');
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/v1/indices',
        headers: {
          'origin': 'http://localhost:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type'
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent-endpoint'
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('statusCode', 404);
    });

    it('should handle malformed JSON requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/indices',
        payload: '{"invalid": json}',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/indices',
        payload: {
          // Missing required 'name' field
          description: 'Test index'
        }
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('API Versioning', () => {
    it('should respond to v1 API routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/indices'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should include API version in response headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/indices'
      });

      expect(response.headers).toHaveProperty('api-version');
    });
  });

  describe('Content Type Handling', () => {
    it('should accept JSON content type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/indices',
        payload: {
          name: 'test-index',
          description: 'Test description'
        },
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(201);
    });

    it('should reject unsupported content types', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/indices',
        payload: 'name=test&description=test',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Request/Response Logging', () => {
    it('should log requests in development mode', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      // In a real implementation, you would verify logging output
      // For now, we just ensure the request completes successfully
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle shutdown gracefully', async () => {
      // Create a temporary app instance for testing shutdown
      const tempApp = await createApp({
        port: 0,
        host: 'localhost',
        logger: false
      });

      // Ensure app is ready
      await tempApp.ready();

      // Close should complete without errors
      await expect(tempApp.close()).resolves.not.toThrow();
    });
  });
});