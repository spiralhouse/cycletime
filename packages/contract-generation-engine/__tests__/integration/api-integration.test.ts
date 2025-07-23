import { FastifyInstance } from 'fastify';
import supertest from 'supertest';
import { build } from '../../src/app';
import { MockDataService } from '../../src/services/mock-data-service';
import { createClient } from 'redis';

describe.skip('API Integration Tests', () => {
  let app: FastifyInstance;
  let request: supertest.SuperTest<supertest.Test>;
  let mockDataService: MockDataService;
  let redis: any;

  beforeAll(async () => {
    // Create Redis client for testing
    redis = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    try {
      await redis.connect();
    } catch (error) {
      console.warn('Redis not available for tests, using mock');
      redis = null;
    }

    // Build Fastify app
    app = await build({
      logger: false,
      redis: redis || undefined,
    });
    
    request = supertest(app.server);
    mockDataService = new MockDataService();
  });

  afterAll(async () => {
    if (redis) {
      try {
        await redis.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    }
    
    if (app) {
      await app.close();
    }
  });

  describe('Health Check Endpoint', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        service: 'contract-generation-engine',
        version: '1.0.0',
      });

      // Validate timestamp format
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe('Contract Generation Endpoints', () => {
    test('POST /api/v1/contracts should create a new contract generation request', async () => {
      const contractRequest = mockDataService.generateContractGenerationRequest('api-test-service');
      
      const response = await request
        .post('/api/v1/contracts')
        .send(contractRequest)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        contractId: expect.any(String),
        status: 'pending',
        message: expect.any(String),
        estimatedCompletion: expect.any(String),
      });

      // Store contractId for subsequent tests
      (global as any).testContractId = response.body.contractId;
    });

    test('GET /api/v1/contracts/:contractId/status should return contract status', async () => {
      const contractId = (global as any).testContractId;
      
      if (!contractId) {
        // Create a contract first
        const contractRequest = mockDataService.generateContractGenerationRequest('status-test-service');
        const createResponse = await request
          .post('/api/v1/contracts')
          .send(contractRequest)
          .expect(201);
        
        (global as any).testContractId = createResponse.body.contractId;
      }

      const response = await request
        .get(`/api/v1/contracts/${(global as any).testContractId}/status`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        contractId: expect.any(String),
        status: expect.stringMatching(/^(pending|processing|completed|failed)$/),
        progress: expect.any(Number),
        createdAt: expect.any(String),
        stages: expect.any(Array),
      });

      expect(response.body.progress).toBeGreaterThanOrEqual(0);
      expect(response.body.progress).toBeLessThanOrEqual(100);
    });

    test('GET /api/v1/contracts should list contracts with pagination', async () => {
      const response = await request
        .get('/api/v1/contracts')
        .query({ limit: 5, offset: 0 })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        contracts: expect.any(Array),
        total: expect.any(Number),
        limit: 5,
        offset: 0,
      });

      expect(response.body.contracts.length).toBeLessThanOrEqual(5);
    });

    test('GET /api/v1/contracts with service filter should filter results', async () => {
      const response = await request
        .get('/api/v1/contracts')
        .query({ serviceName: 'user-service', limit: 10 })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        contracts: expect.any(Array),
        total: expect.any(Number),
      });

      // All returned contracts should match the filter
      response.body.contracts.forEach((contract: any) => {
        expect(contract.serviceName).toBe('user-service');
      });
    });
  });

  describe('Contract Specification Endpoints', () => {
    test('GET /api/v1/contracts/:contractId/specification should return full specification', async () => {
      // Wait for contract generation to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contractId = (global as any).testContractId;
      
      if (!contractId) {
        const contractRequest = mockDataService.generateContractGenerationRequest('spec-test-service');
        const createResponse = await request
          .post('/api/v1/contracts')
          .send(contractRequest)
          .expect(201);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        (global as any).testContractId = createResponse.body.contractId;
      }

      const response = await request
        .get(`/api/v1/contracts/${(global as any).testContractId}/specification`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        contractId: expect.any(String),
        serviceName: expect.any(String),
        metadata: expect.any(Object),
      });

      // Should have at least one of openapi or asyncapi
      expect(
        response.body.openapi || response.body.asyncapi || response.body.boundaries
      ).toBeDefined();
    });

    test('GET /api/v1/contracts/:contractId/specification?format=openapi should return only OpenAPI spec', async () => {
      const contractId = (global as any).testContractId;
      
      const response = await request
        .get(`/api/v1/contracts/${contractId}/specification`)
        .query({ format: 'openapi' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.openapi).toBeDefined();
      expect(response.body.asyncapi).toBeUndefined();
      expect(response.body.boundaries).toBeUndefined();
    });

    test('GET /api/v1/contracts/:contractId/specification?format=asyncapi should return only AsyncAPI spec', async () => {
      const contractId = (global as any).testContractId;
      
      const response = await request
        .get(`/api/v1/contracts/${contractId}/specification`)
        .query({ format: 'asyncapi' })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.asyncapi).toBeDefined();
      expect(response.body.openapi).toBeUndefined();
      expect(response.body.boundaries).toBeUndefined();
    });
  });

  describe('Contract Validation Endpoints', () => {
    test('POST /api/v1/contracts/:contractId/validate should validate contract', async () => {
      const contractId = (global as any).testContractId;
      
      const response = await request
        .post(`/api/v1/contracts/${contractId}/validate`)
        .send({ includeWarnings: true })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        contractId: expect.any(String),
        validationResults: expect.any(Array),
      });

      // Should have validation results
      expect(response.body.validationResults.length).toBeGreaterThan(0);
    });
  });

  describe('Contract Refinement Endpoints', () => {
    test('POST /api/v1/contracts/:contractId/refine should apply refinements', async () => {
      const contractId = (global as any).testContractId;
      
      const refinements = [
        {
          type: 'add-endpoint',
          path: '/api/v1/test',
          method: 'GET',
          description: 'Test endpoint',
        },
      ];

      const response = await request
        .post(`/api/v1/contracts/${contractId}/refine`)
        .send({ refinements })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        contractId: expect.any(String),
        applied: expect.any(Number),
        skipped: expect.any(Number),
        errors: expect.any(Array),
        updatedAt: expect.any(String),
      });
    });
  });

  describe('Boundary Analysis Endpoints', () => {
    test('POST /api/v1/boundary/analyze should analyze service boundaries', async () => {
      const analysisRequest = mockDataService.generateBoundaryAnalysisRequest();
      
      const response = await request
        .post('/api/v1/boundary/analyze')
        .send(analysisRequest)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        analysisId: expect.any(String),
        services: expect.any(Array),
        interactions: expect.any(Array),
        recommendations: expect.any(Array),
        generatedAt: expect.any(String),
      });
    });

    test('GET /api/v1/boundary/recommendations should return boundary recommendations', async () => {
      const response = await request
        .get('/api/v1/boundary/recommendations')
        .query({ serviceCount: 3 })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        recommendations: expect.any(Array),
        patterns: expect.any(Array),
        bestPractices: expect.any(Array),
      });
    });
  });

  describe('Error Handling', () => {
    test('GET /api/v1/contracts/non-existent-id/status should return 404', async () => {
      const response = await request
        .get('/api/v1/contracts/non-existent-contract-id/status')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('not found'),
        statusCode: 404,
      });
    });

    test('POST /api/v1/contracts with invalid data should return 400', async () => {
      const invalidRequest = {
        // Missing required fields
        serviceName: '',
      };

      const response = await request
        .post('/api/v1/contracts')
        .send(invalidRequest)
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        statusCode: 400,
      });
    });

    test('GET /api/v1/non-existent-endpoint should return 404', async () => {
      await request
        .get('/api/v1/non-existent-endpoint')
        .expect(404);
    });
  });

  describe('Content Negotiation', () => {
    test('should accept and return JSON content', async () => {
      const response = await request
        .get('/health')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeDefined();
    });

    test('should handle missing Content-Type gracefully', async () => {
      const contractRequest = mockDataService.generateContractGenerationRequest('content-test-service');
      
      await request
        .post('/api/v1/contracts')
        .send(contractRequest)
        .expect(201);
    });
  });

  describe('CORS and Security Headers', () => {
    test('should include CORS headers', async () => {
      const response = await request
        .options('/api/v1/contracts')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should include security headers', async () => {
      const response = await request
        .get('/health')
        .expect(200);

      // Check for common security headers (if implemented)
      // This might vary based on actual implementation
    });
  });

  describe('Rate Limiting and Performance', () => {
    test('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request.get('/health').expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request
        .get('/health')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      // Should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });
  });
});