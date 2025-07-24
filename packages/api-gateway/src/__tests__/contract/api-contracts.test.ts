/**
 * API Contract Tests
 * Tests API contract definitions and specifications
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('API Contract Tests', () => {
  const openApiPath = path.resolve(__dirname, '../../..', 'openapi.yaml');
  const asyncApiPath = path.resolve(__dirname, '../../..', 'asyncapi.yaml');

  describe('OpenAPI Specification', () => {
    it('should have valid OpenAPI specification file', () => {
      expect(fs.existsSync(openApiPath)).toBe(true);
    });

    it('should parse OpenAPI specification successfully', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      expect(openApiSpec).toBeDefined();
      expect(openApiSpec.openapi).toBe('3.0.3');
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.paths).toBeDefined();
    });

    it('should contain all required service routes', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      const requiredServices = [
        'ai-service',
        'project-service',
        'task-service',
        'document-service',
        'context-management',
        'standards-engine',
        'notification-service',
        'document-indexing-service',
        'contract-generation-engine',
        'mcp-server',
        'cli-service',
        'issue-tracker',
        'web-dashboard'
      ];

      requiredServices.forEach(service => {
        const routePath = `/api/v1/${service}/{proxy+}`;
        expect(openApiSpec.paths).toHaveProperty(routePath);
      });
    });

    it('should have proper authentication requirements', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      // Check that BearerAuth is defined
      expect(openApiSpec.components.securitySchemes).toHaveProperty('BearerAuth');
      expect(openApiSpec.components.securitySchemes.BearerAuth.type).toBe('http');
      expect(openApiSpec.components.securitySchemes.BearerAuth.scheme).toBe('bearer');
      
      // Check that global security is defined
      expect(openApiSpec.security).toBeDefined();
      expect(openApiSpec.security[0]).toHaveProperty('BearerAuth');
    });

    it('should have proper error response schemas', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      expect(openApiSpec.components.schemas).toHaveProperty('ErrorResponse');
      const errorSchema = openApiSpec.components.schemas.ErrorResponse;
      expect(errorSchema.properties).toHaveProperty('error');
      expect(errorSchema.properties).toHaveProperty('message');
      expect(errorSchema.properties).toHaveProperty('timestamp');
    });

    it('should have all required health and auth endpoints', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      const requiredEndpoints = [
        '/health',
        '/metrics',
        '/auth/login',
        '/auth/logout',
        '/auth/refresh',
        '/auth/profile'
      ];

      requiredEndpoints.forEach(endpoint => {
        expect(openApiSpec.paths).toHaveProperty(endpoint);
      });
    });

    it('should have proper response codes for service proxies', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      const proxyPath = '/api/v1/ai-service/{proxy+}';
      const proxySpec = openApiSpec.paths[proxyPath]['x-amazon-apigateway-any-method'];
      
      expect(proxySpec.responses).toHaveProperty('200');
      expect(proxySpec.responses).toHaveProperty('401');
      expect(proxySpec.responses).toHaveProperty('502');
    });
  });

  describe('AsyncAPI Specification', () => {
    it('should have valid AsyncAPI specification file', () => {
      expect(fs.existsSync(asyncApiPath)).toBe(true);
    });

    it('should parse AsyncAPI specification successfully', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      const asyncApiSpec = yaml.load(fileContent) as any;
      
      expect(asyncApiSpec).toBeDefined();
      expect(asyncApiSpec.asyncapi).toBe('3.0.0');
      expect(asyncApiSpec.info).toBeDefined();
      expect(asyncApiSpec.channels).toBeDefined();
    });

    it('should contain all required event channels', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      const asyncApiSpec = yaml.load(fileContent) as any;
      
      const requiredChannels = [
        'gateway/requests',
        'gateway/auth',
        'gateway/rate-limits',
        'gateway/services',
        'gateway/admin'
      ];

      requiredChannels.forEach(channel => {
        expect(asyncApiSpec.channels).toHaveProperty(channel);
      });
    });

    it('should have proper message schemas', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      const asyncApiSpec = yaml.load(fileContent) as any;
      
      const requiredMessages = [
        'GatewayRequestReceived',
        'GatewayRequestRouted',
        'GatewayRequestCompleted',
        'GatewayRequestFailed',
        'GatewayAuthSuccess',
        'GatewayAuthFailed',
        'GatewayRateLimitExceeded',
        'ServiceHealthChanged'
      ];

      requiredMessages.forEach(message => {
        expect(asyncApiSpec.components.messages).toHaveProperty(message);
      });
    });

    it('should have proper payload schemas', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      const asyncApiSpec = yaml.load(fileContent) as any;
      
      const requiredSchemas = [
        'GatewayRequestPayload',
        'GatewayRequestRoutedPayload',
        'GatewayRequestCompletedPayload',
        'GatewayRequestFailedPayload',
        'GatewayAuthPayload',
        'GatewayAuthFailedPayload',
        'GatewayRateLimitPayload',
        'ServiceHealthPayload'
      ];

      requiredSchemas.forEach(schema => {
        expect(asyncApiSpec.components.schemas).toHaveProperty(schema);
      });
    });
  });

  describe('Service Contract Validation', () => {
    it('should have consistent service naming across specifications', () => {
      const openApiContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(openApiContent) as any;
      
      const serviceRoutes = Object.keys(openApiSpec.paths)
        .filter(path => path.startsWith('/api/v1/'))
        .map(path => path.split('/')[3])
        .filter(service => service && service.includes('{proxy+}') === false);

      // Remove duplicates
      const uniqueServices = [...new Set(serviceRoutes)];
      
      expect(uniqueServices.length).toBeGreaterThan(10);
    });

    it('should have proper request/response formats', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      const loginPath = '/auth/login';
      const loginSpec = openApiSpec.paths[loginPath].post;
      
      expect(loginSpec.requestBody).toBeDefined();
      expect(loginSpec.requestBody.content['application/json']).toBeDefined();
      expect(loginSpec.responses['200']).toBeDefined();
      expect(loginSpec.responses['401']).toBeDefined();
    });
  });

  describe('Contract Compliance', () => {
    it('should have all proxy routes follow the same pattern', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      const proxyRoutes = Object.keys(openApiSpec.paths)
        .filter(path => path.includes('{proxy+}'));
      
      proxyRoutes.forEach(route => {
        const routeSpec = openApiSpec.paths[route]['x-amazon-apigateway-any-method'];
        expect(routeSpec.security).toBeDefined();
        expect(routeSpec.security[0]).toHaveProperty('BearerAuth');
        expect(routeSpec.responses).toHaveProperty('200');
        expect(routeSpec.responses).toHaveProperty('401');
        expect(routeSpec.responses).toHaveProperty('502');
      });
    });

    it('should have consistent error response format', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      const openApiSpec = yaml.load(fileContent) as any;
      
      const errorResponse = openApiSpec.components.schemas.ErrorResponse;
      
      expect(errorResponse.properties).toHaveProperty('error');
      expect(errorResponse.properties).toHaveProperty('message');
      expect(errorResponse.properties).toHaveProperty('timestamp');
      expect(errorResponse.required).toContain('error');
      expect(errorResponse.required).toContain('message');
      expect(errorResponse.required).toContain('timestamp');
    });
  });
});