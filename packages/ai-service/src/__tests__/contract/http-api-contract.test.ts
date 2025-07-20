/**
 * HTTP API Contract Testing Suite
 * 
 * Tests HTTP API stub implementations against OpenAPI specification
 * for SPI-130: Contract Testing and Validation Suite
 */

import { FastifyInstance } from 'fastify';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from 'swagger-parser';
import { createApp } from '../../app';

describe('HTTP API Contract Tests', () => {
  let app: FastifyInstance;
  let openApiSpec: any;
  let ajv: Ajv;

  beforeAll(async () => {
    // Load and validate OpenAPI specification
    const openApiPath = path.join(__dirname, '../../../openapi.yaml');
    const openApiContent = fs.readFileSync(openApiPath, 'utf8');
    openApiSpec = yaml.load(openApiContent);
    
    // Validate OpenAPI spec itself
    await SwaggerParser.validate(openApiSpec);
    
    // Set up JSON schema validator
    ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
    
    // Create and start the application
    app = await createApp({
      logger: false, // Disable logging for tests
      port: 0,       // Use random port for tests
      host: 'localhost'
    });
    
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('OpenAPI Specification Validation', () => {
    it('should have valid OpenAPI 3.0.3 specification', () => {
      expect(openApiSpec.openapi).toBe('3.0.3');
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.paths).toBeDefined();
      expect(openApiSpec.components).toBeDefined();
    });

    it('should define all required API endpoints', () => {
      const expectedEndpoints = [
        // AI Request Management (5 endpoints)
        'POST /api/v1/ai/requests',
        'GET /api/v1/ai/requests/{requestId}',
        'GET /api/v1/ai/requests/{requestId}/status',
        'GET /api/v1/ai/requests/{requestId}/response',
        'DELETE /api/v1/ai/requests/{requestId}',
        
        // Provider Management (4 endpoints)
        'GET /api/v1/ai/providers',
        'GET /api/v1/ai/providers/{providerId}',
        'GET /api/v1/ai/providers/{providerId}/models',
        'POST /api/v1/ai/providers/{providerId}/health',
        
        // Usage Analytics (4 endpoints)
        'GET /api/v1/ai/usage',
        'GET /api/v1/ai/usage/{providerId}',
        'GET /api/v1/ai/usage/costs',
        'GET /api/v1/ai/usage/metrics',
        
        // Administration (3 endpoints - config/reload is POST)
        'GET /api/v1/ai/health',
        'GET /api/v1/ai/metrics',
        'POST /api/v1/ai/config/reload'
      ];

      const actualEndpoints: string[] = [];
      Object.keys(openApiSpec.paths).forEach(path => {
        Object.keys(openApiSpec.paths[path]).forEach(method => {
          actualEndpoints.push(`${method.toUpperCase()} ${path}`);
        });
      });

      expectedEndpoints.forEach(endpoint => {
        expect(actualEndpoints).toContain(endpoint);
      });
      
      // Verify we have exactly 17 endpoints
      expect(actualEndpoints.length).toBe(17);
    });

    it('should define error response schemas', () => {
      const errorResponse = openApiSpec.components.schemas.ErrorResponse;
      expect(errorResponse).toBeDefined();
      expect(errorResponse.properties.error).toBeDefined();
      expect(errorResponse.properties.message).toBeDefined();
      expect(errorResponse.properties.timestamp).toBeDefined();
      expect(errorResponse.required).toContain('error');
      expect(errorResponse.required).toContain('message');
      expect(errorResponse.required).toContain('timestamp');
    });
  });

  describe('Endpoint Availability Tests', () => {
    it('should respond to health check endpoint', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/health')
        .expect(200);
      
      expect(response.body).toBeDefined();
      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should respond to service metrics endpoint', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/metrics')
        .expect(200);
      
      expect(response.body).toBeDefined();
    });

    it('should respond to providers listing endpoint', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/providers')
        .expect(200);
      
      expect(response.body).toBeDefined();
      expect(response.body.providers).toBeDefined();
      expect(Array.isArray(response.body.providers)).toBe(true);
    });

    it('should respond to usage statistics endpoint', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/usage')
        .expect(200);
      
      expect(response.body).toBeDefined();
    });

    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/nonexistent')
        .expect(404);
      
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Request/Response Schema Validation', () => {
    it('should validate health check response schema', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/health')
        .expect(200);
      
      const healthSchema = openApiSpec.components.schemas.ServiceHealthResponse;
      const validate = ajv.compile(healthSchema);
      const isValid = validate(response.body);
      
      if (!isValid) {
        console.error('Health response validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });

    it('should validate providers list response schema', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/providers')
        .expect(200);
      
      const providersSchema = openApiSpec.components.schemas.ProvidersListResponse;
      const validate = ajv.compile(providersSchema);
      const isValid = validate(response.body);
      
      if (!isValid) {
        console.error('Providers response validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });

    it('should validate AI request creation schema', async () => {
      const requestBody = {
        type: 'chat_completion',
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ],
        maxTokens: 100,
        temperature: 0.7
      };

      const response = await request(app.server)
        .post('/api/v1/ai/requests')
        .send(requestBody)
        .expect(201);
      
      const responseSchema = openApiSpec.components.schemas.AIRequestResponse;
      const validate = ajv.compile(responseSchema);
      const isValid = validate(response.body);
      
      if (!isValid) {
        console.error('AI request response validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });
  });

  describe('Error Response Validation', () => {
    it('should return valid error response for invalid request', async () => {
      const response = await request(app.server)
        .post('/api/v1/ai/requests')
        .send({ invalid: 'data' })
        .expect(400);
      
      const errorSchema = openApiSpec.components.schemas.ErrorResponse;
      const validate = ajv.compile(errorSchema);
      const isValid = validate(response.body);
      
      if (!isValid) {
        console.error('Error response validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return valid error response for not found resource', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/requests/non-existent-id')
        .expect(404);
      
      const errorSchema = openApiSpec.components.schemas.ErrorResponse;
      const validate = ajv.compile(errorSchema);
      const isValid = validate(response.body);
      
      if (!isValid) {
        console.error('Error response validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });

    it('should return valid error response with proper content-type', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/requests/invalid-uuid')
        .expect(404);
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Authentication Contract Validation', () => {
    it('should accept requests with Bearer token', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/providers')
        .set('Authorization', 'Bearer test-token')
        .expect(200);
      
      expect(response.body).toBeDefined();
    });

    it('should handle requests without authentication gracefully', async () => {
      // In development/stub mode, auth may be optional
      const response = await request(app.server)
        .get('/api/v1/ai/health');
      
      // Should either work (200) or return auth error (401)
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Content-Type and Headers Validation', () => {
    it('should return JSON content-type for API responses', async () => {
      const response = await request(app.server)
        .get('/api/v1/ai/health')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle JSON request bodies properly', async () => {
      const requestBody = {
        type: 'chat_completion',
        messages: [{ role: 'user', content: 'Test' }]
      };

      const response = await request(app.server)
        .post('/api/v1/ai/requests')
        .set('Content-Type', 'application/json')
        .send(requestBody);
      
      expect([201, 400]).toContain(response.status); // Either success or validation error
    });

    it('should reject non-JSON request bodies for JSON endpoints', async () => {
      const response = await request(app.server)
        .post('/api/v1/ai/requests')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(415); // Unsupported Media Type or 400 Bad Request
    });
  });
});