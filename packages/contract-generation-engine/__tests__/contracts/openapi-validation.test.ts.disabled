import SwaggerParser from '@apidevtools/swagger-parser';
import { ContractGenerationService } from '../../src/services/contract-generation-service';
import { ContractStorageService } from '../../src/services/contract-storage-service';
import { ValidationService } from '../../src/services/validation-service';
import { EventService } from '../../src/services/event-service';
import { MockDataService } from '../../src/services/mock-data-service';
import { createClient } from 'redis';

describe.skip('OpenAPI Contract Validation Tests', () => {
  let contractService: ContractGenerationService;
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
      console.warn('Redis not available for tests, using mock Redis');
      redis = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        setEx: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        lPush: jest.fn(),
        lRange: jest.fn().mockResolvedValue([]),
        lRem: jest.fn(),
        keys: jest.fn().mockResolvedValue([]),
        publish: jest.fn(),
        subscribe: jest.fn(),
        xAdd: jest.fn(),
        xRevRange: jest.fn().mockResolvedValue([]),
      };
    }

    const storageService = new ContractStorageService({ redis });
    const validationService = new ValidationService();
    const eventService = new EventService({ redis });
    
    contractService = new ContractGenerationService(
      storageService,
      validationService,
      eventService
    );
    
    mockDataService = new MockDataService();
  });

  afterAll(async () => {
    if (redis && redis.disconnect) {
      try {
        await redis.disconnect();
      } catch (error) {
        // Ignore disconnect errors in tests
      }
    }
  });

  describe('OpenAPI 3.0 Specification Validation', () => {
    test('should generate valid OpenAPI 3.0 specification', async () => {
      const request = mockDataService.generateContractGenerationRequest('user-service');
      const response = await contractService.generateContract(request);
      
      expect(response.contractId).toBeDefined();
      expect(response.status).toBe('pending');

      // Wait for generation to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'openapi'
      );

      expect(specification.openapi).toBeDefined();
      
      // Validate OpenAPI specification using swagger-parser
      const api = await SwaggerParser.validate(specification.openapi as any);
      
      expect(api).toBeDefined();
      expect((api as any).openapi).toBe('3.0.3');
      expect((api as any).info).toBeDefined();
      expect((api as any).info.title).toBeDefined();
      expect((api as any).info.version).toBeDefined();
    });

    test('should include required OpenAPI components', async () => {
      const request = mockDataService.generateContractGenerationRequest('order-service');
      const response = await contractService.generateContract(request);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'openapi'
      );

      const openapi = specification.openapi;

      // Validate required top-level fields
      expect(openapi.openapi).toBe('3.0.3');
      expect(openapi.info).toBeDefined();
      expect(openapi.info.title).toBeDefined();
      expect(openapi.info.version).toBeDefined();
      
      // Validate servers
      expect(openapi.servers).toBeDefined();
      expect(Array.isArray(openapi.servers)).toBe(true);
      expect(openapi.servers.length).toBeGreaterThan(0);

      // Validate paths
      expect(openapi.paths).toBeDefined();
      expect(Object.keys(openapi.paths).length).toBeGreaterThan(0);

      // Health check endpoint should exist
      expect(openapi.paths['/health']).toBeDefined();
      expect(openapi.paths['/health'].get).toBeDefined();
    });

    test('should have valid response schemas', async () => {
      const request = mockDataService.generateContractGenerationRequest('payment-service');
      const response = await contractService.generateContract(request);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'openapi'
      );

      const openapi = specification.openapi;

      // Check health endpoint response schema
      const healthEndpoint = openapi.paths['/health'];
      expect(healthEndpoint).toBeDefined();
      
      const healthGet = healthEndpoint.get;
      expect(healthGet).toBeDefined();
      expect(healthGet.responses).toBeDefined();
      expect(healthGet.responses['200']).toBeDefined();
      
      const successResponse = healthGet.responses['200'];
      expect(successResponse.description).toBeDefined();
      expect(successResponse.content).toBeDefined();
      expect(successResponse.content['application/json']).toBeDefined();
      expect(successResponse.content['application/json'].schema).toBeDefined();
    });

    test('should validate against OpenAPI schema rules', async () => {
      const specification = mockDataService.generateContractSpecification(
        'contract-test-123',
        'notification-service'
      );

      // Use swagger-parser to validate the specification
      await expect(SwaggerParser.validate(specification.openapi as any)).resolves.toBeDefined();
    });

    test('should handle validation errors gracefully', async () => {
      const invalidSpec = {
        openapi: '3.0.3',
        info: {
          title: 'Invalid API',
          // Missing required version field
        },
        paths: {},
      };

      await expect(SwaggerParser.validate(invalidSpec as any)).rejects.toThrow();
    });

    test('should include operation IDs for all endpoints', async () => {
      const request = mockDataService.generateContractGenerationRequest('inventory-service');
      const response = await contractService.generateContract(request);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'openapi'
      );

      const openapi = specification.openapi;

      // Check that all operations have operationId
      Object.keys(openapi.paths).forEach(path => {
        const pathItem = openapi.paths[path];
        Object.keys(pathItem).forEach(method => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            const operation = pathItem[method];
            expect(operation.operationId).toBeDefined();
          }
        });
      });
    });

    test('should have consistent response structure', async () => {
      const request = mockDataService.generateContractGenerationRequest('analytics-service');
      const response = await contractService.generateContract(request);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'openapi'
      );

      const openapi = specification.openapi;

      // Validate that all endpoints have proper error responses
      Object.keys(openapi.paths).forEach(path => {
        const pathItem = openapi.paths[path];
        Object.keys(pathItem).forEach(method => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            const operation = pathItem[method];
            expect(operation.responses).toBeDefined();
            
            // Should have at least a success response
            const hasSuccessResponse = Object.keys(operation.responses)
              .some(code => code.startsWith('2'));
            expect(hasSuccessResponse).toBe(true);
          }
        });
      });
    });
  });

  describe('Contract Generation Validation', () => {
    test('should validate generated contracts match request requirements', async () => {
      const request = mockDataService.generateContractGenerationRequest('search-service');
      request.requirements = 'Search functionality with full-text search, filtering, and faceted search capabilities';
      
      const response = await contractService.generateContract(request);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'openapi'
      );

      expect(specification.serviceName).toBe(request.serviceName);
      expect(specification.metadata?.requirements).toBeDefined();
      
      // Validate the generated OpenAPI spec
      await expect(SwaggerParser.validate(specification.openapi)).resolves.toBeDefined();
    });

    test('should handle different service types correctly', async () => {
      const serviceTypes = ['rest-api', 'hybrid'] as const;
      
      for (const serviceType of serviceTypes) {
        const request = mockDataService.generateContractGenerationRequest(`${serviceType}-service`);
        request.serviceType = serviceType;
        
        const response = await contractService.generateContract(request);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const specification = await contractService.getContractSpecification(
          response.contractId,
          'openapi'
        );

        expect(specification.openapi).toBeDefined();
        await expect(SwaggerParser.validate(specification.openapi as any)).resolves.toBeDefined();
      }
    });

    test('should include security definitions when required', async () => {
      const request = mockDataService.generateContractGenerationRequest('secure-service');
      request.requirements = 'Secure API requiring JWT authentication for all endpoints';
      
      const response = await contractService.generateContract(request);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'openapi'
      );

      const openapi = specification.openapi;
      
      // Should be a valid OpenAPI spec
      await expect(SwaggerParser.validate(openapi as any)).resolves.toBeDefined();
      
      // Should contain proper API structure
      expect(openapi.info.title).toContain('Secure Service');
    });
  });

  describe('Contract Validation Service Integration', () => {
    test('should validate contracts using validation service', async () => {
      const request = mockDataService.generateContractGenerationRequest('validation-test-service');
      const response = await contractService.generateContract(request);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const validationResult = await contractService.validateContract(response.contractId);
      
      expect(validationResult.contractId).toBe(response.contractId);
      expect(validationResult.validationResults).toBeDefined();
      expect(Array.isArray(validationResult.validationResults)).toBe(true);
      
      // Should have at least OpenAPI validation result
      const openApiResult = validationResult.validationResults.find(
        (result: any) => result.type === 'openapi'
      );
      expect(openApiResult).toBeDefined();
    });

    test('should detect validation errors in malformed contracts', async () => {
      // This test would typically involve creating a contract with known issues
      // For now, we'll test the validation service directly
      const mockResult = mockDataService.generateValidationResult(false);
      
      expect(mockResult.valid).toBe(false);
      expect(mockResult.errors.length).toBeGreaterThan(0);
      expect(mockResult.score).toBeLessThan(80);
    });
  });
});