/**
 * Simple Contract Tests
 * Tests API contract definitions without external dependencies
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Simple Contract Tests', () => {
  const openApiPath = path.resolve(__dirname, '../../..', 'openapi.yaml');
  const asyncApiPath = path.resolve(__dirname, '../../..', 'asyncapi.yaml');

  describe('Contract Files Existence', () => {
    it('should have OpenAPI specification file', () => {
      expect(fs.existsSync(openApiPath)).toBe(true);
    });

    it('should have AsyncAPI specification file', () => {
      expect(fs.existsSync(asyncApiPath)).toBe(true);
    });

    it('should have readable OpenAPI specification', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      expect(fileContent).toBeDefined();
      expect(fileContent.length).toBeGreaterThan(0);
    });

    it('should have readable AsyncAPI specification', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      expect(fileContent).toBeDefined();
      expect(fileContent.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAPI Content Validation', () => {
    it('should contain OpenAPI version declaration', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      expect(fileContent).toContain('openapi: 3.0.3');
    });

    it('should contain all required service routes', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
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
        expect(fileContent).toContain(routePath);
      });
    });

    it('should contain authentication endpoints', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
      const authEndpoints = [
        '/auth/login',
        '/auth/logout',
        '/auth/refresh',
        '/auth/profile'
      ];

      authEndpoints.forEach(endpoint => {
        expect(fileContent).toContain(endpoint);
      });
    });

    it('should contain health and metrics endpoints', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
      expect(fileContent).toContain('/health');
      expect(fileContent).toContain('/metrics');
    });

    it('should contain admin endpoints', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
      expect(fileContent).toContain('/admin/services');
      expect(fileContent).toContain('/admin/rate-limits');
    });

    it('should contain security schemes', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
      expect(fileContent).toContain('BearerAuth');
      expect(fileContent).toContain('bearer');
      expect(fileContent).toContain('JWT');
    });

    it('should contain error response schemas', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
      expect(fileContent).toContain('ErrorResponse');
      expect(fileContent).toContain('error');
      expect(fileContent).toContain('message');
      expect(fileContent).toContain('timestamp');
    });

    it('should contain proper HTTP response codes', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
      const responseCodes = ['200', '401', '502', '404', '429'];
      responseCodes.forEach(code => {
        expect(fileContent).toContain(`'${code}'`);
      });
    });
  });

  describe('AsyncAPI Content Validation', () => {
    it('should contain AsyncAPI version declaration', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      expect(fileContent).toContain('asyncapi: 3.0.0');
    });

    it('should contain event channels', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      
      const channels = [
        'gateway/requests',
        'gateway/auth',
        'gateway/rate-limits',
        'gateway/services',
        'gateway/admin'
      ];

      channels.forEach(channel => {
        expect(fileContent).toContain(channel);
      });
    });

    it('should contain gateway events', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      
      const events = [
        'gateway.request.received',
        'gateway.request.routed',
        'gateway.request.completed',
        'gateway.request.failed',
        'gateway.auth.success',
        'gateway.auth.failed',
        'gateway.rate.limit.exceeded',
        'service.health.changed'
      ];

      events.forEach(event => {
        expect(fileContent).toContain(event);
      });
    });

    it('should contain message schemas', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      
      const schemas = [
        'GatewayRequestPayload',
        'GatewayRequestRoutedPayload',
        'GatewayRequestCompletedPayload',
        'GatewayRequestFailedPayload',
        'GatewayAuthPayload',
        'GatewayAuthFailedPayload',
        'GatewayRateLimitPayload',
        'ServiceHealthPayload'
      ];

      schemas.forEach(schema => {
        expect(fileContent).toContain(schema);
      });
    });

    it('should contain server configurations', () => {
      const fileContent = fs.readFileSync(asyncApiPath, 'utf8');
      
      expect(fileContent).toContain('development:');
      expect(fileContent).toContain('production:');
      expect(fileContent).toContain('redis');
    });
  });

  describe('Contract Consistency', () => {
    it('should have consistent naming between OpenAPI and AsyncAPI', () => {
      const openApiContent = fs.readFileSync(openApiPath, 'utf8');
      const asyncApiContent = fs.readFileSync(asyncApiPath, 'utf8');
      
      // Both should mention CycleTime API Gateway
      expect(openApiContent).toContain('CycleTime API Gateway');
      expect(asyncApiContent).toContain('CycleTime API Gateway');
      
      // Both should have version 1.0.0
      expect(openApiContent).toContain('version: 1.0.0');
      expect(asyncApiContent).toContain('version: 1.0.0');
    });

    it('should have proper service route patterns', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
      // All service routes should follow the pattern /api/v1/service-name/{proxy+}
      const serviceRoutePattern = /\/api\/v1\/[\w-]+\/\{proxy\+\}/g;
      const matches = fileContent.match(serviceRoutePattern);
      
      expect(matches).toBeDefined();
      expect(matches!.length).toBeGreaterThan(10); // Should have all 13 services
    });

    it('should have proper authentication requirements', () => {
      const fileContent = fs.readFileSync(openApiPath, 'utf8');
      
      // Service routes should require BearerAuth
      const serviceRoutes = fileContent.match(/\/api\/v1\/[\w-]+\/\{proxy\+\}/g);
      expect(serviceRoutes).toBeDefined();
      
      // Should have BearerAuth security requirement
      expect(fileContent).toContain('- BearerAuth: []');
    });
  });

  describe('Mock Data Service Integration', () => {
    it('should have MockDataService file', () => {
      const mockServicePath = path.resolve(__dirname, '../../services/mock-data-service.ts');
      expect(fs.existsSync(mockServicePath)).toBe(true);
    });

    it('should have comprehensive mock responses', () => {
      const mockServicePath = path.resolve(__dirname, '../../services/mock-data-service.ts');
      const fileContent = fs.readFileSync(mockServicePath, 'utf8');
      
      const services = [
        'ai-service',
        'project-service',
        'task-service',
        'document-service',
        'context-management-service',
        'standards-engine',
        'notification-service',
        'document-indexing-service',
        'contract-generation-engine',
        'mcp-server',
        'cli-service',
        'issue-tracker-service',
        'web-dashboard'
      ];

      services.forEach(service => {
        expect(fileContent).toContain(service);
      });
    });

    it('should have proper mock response structure', () => {
      const mockServicePath = path.resolve(__dirname, '../../services/mock-data-service.ts');
      const fileContent = fs.readFileSync(mockServicePath, 'utf8');
      
      expect(fileContent).toContain('getMockResponse');
      expect(fileContent).toContain('MockResponse');
      expect(fileContent).toContain('statusCode');
      expect(fileContent).toContain('body');
    });
  });

  describe('File Structure Validation', () => {
    it('should have proper directory structure', () => {
      const srcPath = path.resolve(__dirname, '../..');
      const pluginsPath = path.resolve(srcPath, 'plugins');
      const servicesPath = path.resolve(srcPath, 'services');
      const routesPath = path.resolve(srcPath, 'routes');
      const typesPath = path.resolve(srcPath, 'types');
      
      expect(fs.existsSync(pluginsPath)).toBe(true);
      expect(fs.existsSync(servicesPath)).toBe(true);
      expect(fs.existsSync(routesPath)).toBe(true);
      expect(fs.existsSync(typesPath)).toBe(true);
    });

    it('should have required plugin files', () => {
      const pluginsPath = path.resolve(__dirname, '../../plugins');
      
      const requiredPlugins = [
        'proxy.ts',
        'authentication.ts',
        'service-discovery.ts',
        'event-publisher.ts',
        'request-context.ts',
        'metrics.ts'
      ];

      requiredPlugins.forEach(plugin => {
        const pluginPath = path.resolve(pluginsPath, plugin);
        expect(fs.existsSync(pluginPath)).toBe(true);
      });
    });

    it('should have required service files', () => {
      const servicesPath = path.resolve(__dirname, '../../services');
      
      const requiredServices = [
        'mock-data-service.ts',
        'jwt.ts',
        'github-auth.ts',
        'user.ts'
      ];

      requiredServices.forEach(service => {
        const servicePath = path.resolve(servicesPath, service);
        expect(fs.existsSync(servicePath)).toBe(true);
      });
    });
  });
});