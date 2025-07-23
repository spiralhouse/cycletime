import { build } from '../app';
import { FastifyInstance } from 'fastify';

describe.skip('Application', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build({ logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health endpoints', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
        dependencies: expect.any(Object),
        uptime: expect.any(Number),
        memory: expect.any(Object),
        environment: expect.any(String),
      });
    });

    it('should return readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        ready: expect.any(Boolean),
        timestamp: expect.any(String),
        checks: expect.any(Object),
      });
    });

    it('should return liveness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        alive: true,
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        pid: expect.any(Number),
      });
    });
  });

  describe('Service info endpoints', () => {
    it('should return service information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/info',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        name: 'Contract Generation Engine',
        version: expect.any(String),
        description: expect.any(String),
        environment: expect.any(String),
        timestamp: expect.any(String),
        features: expect.any(Array),
        endpoints: expect.any(Object),
        documentation: expect.any(Object),
      });
    });

    it('should return metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        timestamp: expect.any(String),
        system: expect.any(Object),
        service: expect.any(Object),
        stats: expect.any(Object),
      });
    });
  });

  describe('Root endpoint', () => {
    it('should return basic service information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        name: 'Contract Generation Engine',
        version: expect.any(String),
        description: expect.any(String),
        documentation: expect.any(Object),
        timestamp: expect.any(String),
      });
    });
  });

  describe('API endpoints', () => {
    describe('Contract generation', () => {
      it('should accept contract generation request', async () => {
        const contractRequest = {
          serviceName: 'Test Service',
          serviceType: 'rest-api',
          requirements: 'A test service for testing',
          options: {
            includeExamples: true,
            includeMockData: true,
            validateOutput: true,
            outputFormat: 'both',
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/contracts/generate',
          payload: contractRequest,
        });

        expect(response.statusCode).toBe(202);
        
        const body = JSON.parse(response.payload);
        expect(body).toMatchObject({
          contractId: expect.stringMatching(/^contract-\d+-[a-z0-9]+$/),
          status: 'pending',
          message: 'Contract generation started',
        });
      });

      it('should validate contract generation request', async () => {
        const invalidRequest = {
          serviceName: 'Test Service',
          // Missing required serviceType and requirements
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/contracts/generate',
          payload: invalidRequest,
        });

        expect(response.statusCode).toBe(400);
        
        const body = JSON.parse(response.payload);
        expect(body).toMatchObject({
          error: 'Invalid request',
          message: 'Request body validation failed',
          details: expect.any(Array),
        });
      });
    });

    describe('Boundary analysis', () => {
      it('should accept boundary analysis request', async () => {
        const boundaryRequest = {
          services: ['service-a', 'service-b', 'service-c'],
          architecture: 'Microservices with event-driven communication',
          options: {
            includeDataFlow: true,
            includeSecurityBoundaries: true,
            includePerformanceRequirements: false,
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/boundaries/analyze',
          payload: boundaryRequest,
        });

        expect(response.statusCode).toBe(200);
        
        const body = JSON.parse(response.payload);
        expect(body).toMatchObject({
          analysisId: expect.stringMatching(/^analysis-\d+-[a-z0-9]+$/),
          services: expect.any(Array),
          interactions: expect.any(Array),
          recommendations: expect.any(Array),
          generatedAt: expect.any(String),
        });
      });

      it('should validate boundary analysis request', async () => {
        const invalidRequest = {
          // Missing required services array
          architecture: 'Some architecture',
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/boundaries/analyze',
          payload: invalidRequest,
        });

        expect(response.statusCode).toBe(400);
        
        const body = JSON.parse(response.payload);
        expect(body).toMatchObject({
          error: 'Invalid request',
          message: 'Request body validation failed',
          details: expect.any(Array),
        });
      });
    });

    describe('Validation', () => {
      it('should accept contract validation request', async () => {
        const validationRequest = {
          contract: {
            openapi: '3.0.3',
            info: {
              title: 'Test API',
              version: '1.0.0',
            },
            paths: {
              '/test': {
                get: {
                  summary: 'Test endpoint',
                  responses: {
                    '200': {
                      description: 'Success',
                    },
                  },
                },
              },
            },
          },
          options: {
            strict: false,
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/validation/contract',
          payload: validationRequest,
        });

        expect(response.statusCode).toBe(200);
        
        const body = JSON.parse(response.payload);
        expect(body).toMatchObject({
          valid: expect.any(Boolean),
          errors: expect.any(Array),
          warnings: expect.any(Array),
          score: expect.any(Number),
        });
      });

      it('should validate contract validation request', async () => {
        const invalidRequest = {
          // Missing required contract
          options: {
            strict: false,
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/validation/contract',
          payload: invalidRequest,
        });

        expect(response.statusCode).toBe(400);
        
        const body = JSON.parse(response.payload);
        expect(body).toMatchObject({
          error: 'Bad Request',
          message: 'Contract is required',
        });
      });
    });

    describe('Stub generation', () => {
      it('should accept stub generation request', async () => {
        const stubRequest = {
          specification: {
            contractId: 'test-contract-123',
            serviceName: 'Test Service',
            openapi: {
              openapi: '3.0.3',
              info: {
                title: 'Test API',
                version: '1.0.0',
              },
              paths: {
                '/test': {
                  get: {
                    summary: 'Test endpoint',
                    responses: {
                      '200': {
                        description: 'Success',
                      },
                    },
                  },
                },
              },
            },
          },
          options: {
            includeExamples: true,
            includeMockData: true,
            includeValidation: true,
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/stubs/generate',
          payload: stubRequest,
        });

        expect(response.statusCode).toBe(200);
        
        const body = JSON.parse(response.payload);
        expect(body).toMatchObject({
          contractId: 'test-contract-123',
          serviceName: 'Test Service',
          stub: expect.any(Object),
          generatedAt: expect.any(String),
        });
      });

      it('should validate stub generation request', async () => {
        const invalidRequest = {
          // Missing required specification
          options: {
            includeExamples: true,
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/stubs/generate',
          payload: invalidRequest,
        });

        expect(response.statusCode).toBe(400);
        
        const body = JSON.parse(response.payload);
        expect(body).toMatchObject({
          error: 'Bad Request',
          message: 'Contract specification is required',
        });
      });
    });
  });

  describe('Documentation endpoints', () => {
    it('should serve Swagger UI documentation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should serve OpenAPI JSON specification', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        swagger: '2.0',
        info: expect.objectContaining({
          title: 'Contract Generation Engine API',
          version: expect.any(String),
        }),
        paths: expect.any(Object),
      });
    });
  });

  describe('Error handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/unknown-route',
      });

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        error: 'Not Found',
        message: 'Route GET /unknown-route not found',
        timestamp: expect.any(String),
        path: '/unknown-route',
      });
    });

    it('should handle method not allowed', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/health',
      });

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        error: 'Not Found',
        message: 'Route DELETE /health not found',
      });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Rate limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Security headers', () => {
    it('should include security headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });
});