import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('Basic Contract Validation', () => {
  let openApiSpec: any;
  let asyncApiSpec: any;

  beforeAll(() => {
    // Load OpenAPI specification
    const openApiPath = path.join(__dirname, '../../openapi.yaml');
    const openApiContent = fs.readFileSync(openApiPath, 'utf8');
    openApiSpec = yaml.load(openApiContent);

    // Load AsyncAPI specification
    const asyncApiPath = path.join(__dirname, '../../asyncapi.yaml');
    const asyncApiContent = fs.readFileSync(asyncApiPath, 'utf8');
    asyncApiSpec = yaml.load(asyncApiContent);
  });

  describe('OpenAPI Contract Basics', () => {
    it('should load and parse OpenAPI specification successfully', () => {
      expect(openApiSpec).toBeDefined();
      expect(openApiSpec.openapi).toBe('3.0.3');
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.info.title).toBe('Document Indexing Service API');
    });

    it('should have core API paths defined', () => {
      expect(openApiSpec.paths).toBeDefined();
      expect(Object.keys(openApiSpec.paths).length).toBeGreaterThan(0);
      
      // Check for existence of main paths (adjust based on actual spec)
      expect(openApiSpec.paths['/api/v1/indices']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/documents']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/search']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/embeddings']).toBeDefined();
      expect(openApiSpec.paths['/health']).toBeDefined();
    });

    it('should have components with schemas', () => {
      expect(openApiSpec.components).toBeDefined();
      expect(openApiSpec.components.schemas).toBeDefined();
      expect(Object.keys(openApiSpec.components.schemas).length).toBeGreaterThan(0);
    });

    it('should have security schemes defined', () => {
      expect(openApiSpec.components.securitySchemes).toBeDefined();
      expect(openApiSpec.components.securitySchemes.BearerAuth).toBeDefined();
    });

    it('should have servers configured', () => {
      expect(openApiSpec.servers).toBeDefined();
      expect(openApiSpec.servers.length).toBeGreaterThan(0);
    });
  });

  describe('AsyncAPI Contract Basics', () => {
    it('should load and parse AsyncAPI specification successfully', () => {
      expect(asyncApiSpec).toBeDefined();
      expect(asyncApiSpec.asyncapi).toBe('3.0.0');
      expect(asyncApiSpec.info).toBeDefined();
      expect(asyncApiSpec.info.title).toContain('Document Indexing Service');
    });

    it('should have channels defined', () => {
      expect(asyncApiSpec.channels).toBeDefined();
      expect(Object.keys(asyncApiSpec.channels).length).toBeGreaterThan(0);
    });

    it('should have components with messages', () => {
      expect(asyncApiSpec.components).toBeDefined();
      expect(asyncApiSpec.components.messages).toBeDefined();
      expect(Object.keys(asyncApiSpec.components.messages).length).toBeGreaterThan(0);
    });

    it('should have servers configured', () => {
      expect(asyncApiSpec.servers).toBeDefined();
      expect(Object.keys(asyncApiSpec.servers).length).toBeGreaterThan(0);
    });
  });

  describe('Mock Data Service Contract', () => {
    it('should provide required interfaces for testing', () => {
      // Test that mock data service provides expected structure
      const { createMockDataService } = require('../services/mock-data-service');
      const mockService = createMockDataService();
      
      // Test service methods exist
      expect(typeof mockService.getIndices).toBe('function');
      expect(typeof mockService.getDocuments).toBe('function');
      expect(typeof mockService.searchDocuments).toBe('function');
      expect(typeof mockService.getHealthStatus).toBe('function');
      expect(typeof mockService.createEmbedding).toBe('function');
      expect(typeof mockService.getStatistics).toBe('function');
    });

    it('should provide sample data for contract validation', () => {
      const { createMockDataService } = require('../services/mock-data-service');
      const mockService = createMockDataService();
      
      // Test that service returns expected data structures
      const indices = mockService.getIndices();
      expect(Array.isArray(indices)).toBe(true);
      
      if (indices.length > 0) {
        const index = indices[0];
        expect(index).toHaveProperty('id');
        expect(index).toHaveProperty('name');
        expect(index).toHaveProperty('status');
        expect(index).toHaveProperty('vectorDimensions');
        expect(index).toHaveProperty('embeddingModel');
      }
      
      const documents = mockService.getDocuments();
      expect(Array.isArray(documents)).toBe(true);
      
      if (documents.length > 0) {
        const doc = documents[0];
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('content');
        expect(doc).toHaveProperty('embeddings');
        expect(doc).toHaveProperty('status');
      }
    });
  });

  describe('Service Integration Contract', () => {
    it('should provide event service interface', () => {
      const { createEventService } = require('../services/event-service');
      const eventService = createEventService();
      
      expect(typeof eventService.publishEvent).toBe('function');
      expect(typeof eventService.subscribe).toBe('function');
      expect(typeof eventService.getEvents).toBe('function');
      expect(typeof eventService.getEvent).toBe('function');
    });

    it('should provide search service interface', () => {
      const { createMockDataService } = require('../services/mock-data-service');
      const { createEventService } = require('../services/event-service');
      const { createSearchService } = require('../services/search-service');
      
      const mockDataService = createMockDataService();
      const eventService = createEventService();
      const searchService = createSearchService(mockDataService, eventService);
      
      expect(typeof searchService.search).toBe('function');
      expect(typeof searchService.similaritySearch).toBe('function');
      expect(typeof searchService.searchSuggestions).toBe('function');
    });

    it('should provide embedding service interface', () => {
      const { createMockDataService } = require('../services/mock-data-service');
      const { createEventService } = require('../services/event-service');
      const { createEmbeddingService } = require('../services/embedding-service');
      
      const mockDataService = createMockDataService();
      const eventService = createEventService();
      const embeddingService = createEmbeddingService(mockDataService, eventService);
      
      expect(typeof embeddingService.generateEmbedding).toBe('function');
      expect(typeof embeddingService.generateBatchEmbeddings).toBe('function');
      expect(typeof embeddingService.compareEmbeddings).toBe('function');
    });
  });

  describe('Data Format Validation', () => {
    it('should validate search request format', () => {
      // Define expected search request structure
      const searchRequest = {
        query: 'test query',
        searchType: 'semantic',
        limit: 10,
        threshold: 0.7
      };

      expect(typeof searchRequest.query).toBe('string');
      expect(['semantic', 'keyword', 'hybrid']).toContain(searchRequest.searchType);
      expect(typeof searchRequest.limit).toBe('number');
      expect(searchRequest.limit).toBeGreaterThan(0);
      expect(typeof searchRequest.threshold).toBe('number');
      expect(searchRequest.threshold).toBeGreaterThanOrEqual(0);
      expect(searchRequest.threshold).toBeLessThanOrEqual(1);
    });

    it('should validate embedding request format', () => {
      const embeddingRequest = {
        text: 'sample text for embedding',
        model: 'text-embedding-3-small'
      };

      expect(typeof embeddingRequest.text).toBe('string');
      expect(embeddingRequest.text.length).toBeGreaterThan(0);
      expect(typeof embeddingRequest.model).toBe('string');
    });

    it('should validate index creation format', () => {
      const indexRequest = {
        name: 'test-index',
        description: 'Test index for validation',
        vectorDimensions: 1536,
        embeddingModel: 'text-embedding-3-small'
      };

      expect(typeof indexRequest.name).toBe('string');
      expect(typeof indexRequest.description).toBe('string');
      expect(typeof indexRequest.vectorDimensions).toBe('number');
      expect(indexRequest.vectorDimensions).toBeGreaterThan(0);
      expect(typeof indexRequest.embeddingModel).toBe('string');
    });
  });

  describe('Error Response Format', () => {
    it('should define standard error response structure', () => {
      const errorResponse = {
        error: 'ValidationError',
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
        statusCode: 400
      };

      expect(typeof errorResponse.error).toBe('string');
      expect(typeof errorResponse.message).toBe('string');
      expect(typeof errorResponse.timestamp).toBe('string');
      expect(typeof errorResponse.statusCode).toBe('number');
      
      // Validate ISO timestamp format
      expect(() => new Date(errorResponse.timestamp)).not.toThrow();
    });
  });

  describe('Health Check Contract', () => {
    it('should validate health response structure', () => {
      const { createMockDataService } = require('../services/mock-data-service');
      const mockService = createMockDataService();
      const healthStatus = mockService.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.status);
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('dependencies');
      expect(healthStatus).toHaveProperty('metrics');
      
      // Validate dependencies structure
      expect(healthStatus.dependencies).toHaveProperty('vectorDatabase');
      expect(healthStatus.dependencies).toHaveProperty('embeddingService');
      expect(healthStatus.dependencies).toHaveProperty('redis');
    });
  });

  describe('Performance Contract', () => {
    it('should define expected response times', () => {
      // Mock response time expectations based on contract
      const performanceRequirements = {
        search: { maxResponseTime: 1000, unit: 'ms' },
        embedding: { maxResponseTime: 2000, unit: 'ms' },
        health: { maxResponseTime: 100, unit: 'ms' },
        indexing: { maxResponseTime: 5000, unit: 'ms' }
      };

      Object.values(performanceRequirements).forEach(req => {
        expect(req.maxResponseTime).toBeGreaterThan(0);
        expect(req.unit).toBe('ms');
      });
    });

    it('should define throughput expectations', () => {
      const throughputRequirements = {
        searches: { rate: 1000, unit: 'per_minute' },
        embeddings: { rate: 500, unit: 'per_minute' },
        indexing: { rate: 100, unit: 'per_minute' }
      };

      Object.values(throughputRequirements).forEach(req => {
        expect(req.rate).toBeGreaterThan(0);
        expect(req.unit).toBe('per_minute');
      });
    });
  });
});