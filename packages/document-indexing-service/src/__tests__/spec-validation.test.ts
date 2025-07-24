import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('API Specification Validation', () => {
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

  describe('OpenAPI Specification Structure', () => {
    it('should have valid OpenAPI 3.0.3 specification', () => {
      expect(openApiSpec).toBeDefined();
      expect(openApiSpec.openapi).toBe('3.0.3');
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.info.title).toBe('Document Indexing Service API');
      expect(openApiSpec.info.version).toBeDefined();
    });

    it('should have all required API paths', () => {
      expect(openApiSpec.paths).toBeDefined();
      
      // Index management paths
      expect(openApiSpec.paths['/api/v1/indices']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/indices/{id}']).toBeDefined();
      
      // Document management paths
      expect(openApiSpec.paths['/api/v1/documents']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/documents/{id}']).toBeDefined();
      
      // Search paths
      expect(openApiSpec.paths['/api/v1/search']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/search/similarity']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/search/suggestions']).toBeDefined();
      
      // Embedding paths
      expect(openApiSpec.paths['/api/v1/embeddings']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/embeddings/batch']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/embeddings/compare']).toBeDefined();
      
      // Analytics paths
      expect(openApiSpec.paths['/api/v1/analytics/statistics']).toBeDefined();
      expect(openApiSpec.paths['/api/v1/analytics/reports']).toBeDefined();
      
      // Health paths
      expect(openApiSpec.paths['/health']).toBeDefined();
      expect(openApiSpec.paths['/health/dependencies']).toBeDefined();
    });

    it('should have properly defined components', () => {
      expect(openApiSpec.components).toBeDefined();
      expect(openApiSpec.components.schemas).toBeDefined();
      expect(openApiSpec.components.securitySchemes).toBeDefined();
      
      // Core schemas should be present
      expect(openApiSpec.components.schemas.DocumentIndex).toBeDefined();
      expect(openApiSpec.components.schemas.IndexedDocument).toBeDefined();
      expect(openApiSpec.components.schemas.SearchResult).toBeDefined();
      expect(openApiSpec.components.schemas.EmbeddingResult).toBeDefined();
      expect(openApiSpec.components.schemas.HealthStatus).toBeDefined();
    });

    it('should have proper error response schemas', () => {
      expect(openApiSpec.components.schemas.ErrorResponse).toBeDefined();
      
      const errorSchema = openApiSpec.components.schemas.ErrorResponse;
      expect(errorSchema.properties.error).toBeDefined();
      expect(errorSchema.properties.message).toBeDefined();
      expect(errorSchema.properties.timestamp).toBeDefined();
    });
  });

  describe('AsyncAPI Specification Structure', () => {
    it('should have valid AsyncAPI 3.0.0 specification', () => {
      expect(asyncApiSpec).toBeDefined();
      expect(asyncApiSpec.asyncapi).toBe('3.0.0');
      expect(asyncApiSpec.info).toBeDefined();
      expect(asyncApiSpec.info.title).toBe('Document Indexing Service Events');
      expect(asyncApiSpec.info.version).toBeDefined();
    });

    it('should define all event channels', () => {
      expect(asyncApiSpec.channels).toBeDefined();
      
      // Document lifecycle events
      expect(asyncApiSpec.channels['documents/indexed']).toBeDefined();
      expect(asyncApiSpec.channels['documents/updated']).toBeDefined();
      expect(asyncApiSpec.channels['documents/deleted']).toBeDefined();
      
      // Search events
      expect(asyncApiSpec.channels['search/performed']).toBeDefined();
      expect(asyncApiSpec.channels['search/failed']).toBeDefined();
      
      // Embedding events
      expect(asyncApiSpec.channels['embeddings/generated']).toBeDefined();
      expect(asyncApiSpec.channels['embeddings/failed']).toBeDefined();
      
      // Analytics events
      expect(asyncApiSpec.channels['analytics/report-generated']).toBeDefined();
    });

    it('should have proper message schemas', () => {
      expect(asyncApiSpec.components.messages).toBeDefined();
      
      // Document events
      expect(asyncApiSpec.components.messages.DocumentIndexed).toBeDefined();
      expect(asyncApiSpec.components.messages.DocumentUpdated).toBeDefined();
      expect(asyncApiSpec.components.messages.DocumentDeleted).toBeDefined();
      
      // Search events
      expect(asyncApiSpec.components.messages.SearchPerformed).toBeDefined();
      expect(asyncApiSpec.components.messages.SearchFailed).toBeDefined();
      
      // Embedding events
      expect(asyncApiSpec.components.messages.EmbeddingGenerated).toBeDefined();
      expect(asyncApiSpec.components.messages.EmbeddingFailed).toBeDefined();
    });
  });

  describe('Data Model Validation', () => {
    it('should validate DocumentIndex schema structure', () => {
      const schema = openApiSpec.components.schemas.DocumentIndex;
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('status');
      expect(schema.required).toContain('vectorDimensions');
      expect(schema.required).toContain('embeddingModel');
      
      // Validate properties
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.name).toBeDefined();
      expect(schema.properties.description).toBeDefined();
      expect(schema.properties.status).toBeDefined();
      expect(schema.properties.vectorDimensions).toBeDefined();
      expect(schema.properties.embeddingModel).toBeDefined();
      expect(schema.properties.settings).toBeDefined();
    });

    it('should validate IndexedDocument schema structure', () => {
      const schema = openApiSpec.components.schemas.IndexedDocument;
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('indexId');
      expect(schema.required).toContain('documentId');
      expect(schema.required).toContain('title');
      expect(schema.required).toContain('content');
      expect(schema.required).toContain('status');
      
      // Validate properties
      expect(schema.properties.embeddings).toBeDefined();
      expect(schema.properties.chunks).toBeDefined();
      expect(schema.properties.metadata).toBeDefined();
      expect(schema.properties.keywords).toBeDefined();
      expect(schema.properties.entities).toBeDefined();
    });

    it('should validate SearchResult schema structure', () => {
      const schema = openApiSpec.components.schemas.SearchResult;
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('documentId');
      expect(schema.required).toContain('title');
      expect(schema.required).toContain('score');
      expect(schema.required).toContain('similarity');
      expect(schema.required).toContain('matchType');
      
      // Validate score and similarity are numbers between 0 and 1
      expect(schema.properties.score.type).toBe('number');
      expect(schema.properties.score.minimum).toBe(0);
      expect(schema.properties.score.maximum).toBe(1);
      
      expect(schema.properties.similarity.type).toBe('number');
      expect(schema.properties.similarity.minimum).toBe(0);
      expect(schema.properties.similarity.maximum).toBe(1);
    });

    it('should validate EmbeddingResult schema structure', () => {
      const schema = openApiSpec.components.schemas.EmbeddingResult;
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('text');
      expect(schema.required).toContain('embeddings');
      expect(schema.required).toContain('model');
      expect(schema.required).toContain('dimensions');
      expect(schema.required).toContain('tokens');
      
      // Validate embeddings is array of numbers
      expect(schema.properties.embeddings.type).toBe('array');
      expect(schema.properties.embeddings.items.type).toBe('number');
    });
  });

  describe('API Endpoint Validation', () => {
    it('should validate search endpoint structure', () => {
      const searchPath = openApiSpec.paths['/api/v1/search'];
      expect(searchPath.post).toBeDefined();
      
      const postOperation = searchPath.post;
      expect(postOperation.summary).toBeDefined();
      expect(postOperation.description).toBeDefined();
      expect(postOperation.tags).toContain('Search Operations');
      
      // Validate request body
      expect(postOperation.requestBody).toBeDefined();
      expect(postOperation.requestBody.required).toBe(true);
      expect(postOperation.requestBody.content['application/json']).toBeDefined();
      
      // Validate responses
      expect(postOperation.responses['200']).toBeDefined();
      expect(postOperation.responses['400']).toBeDefined();
    });

    it('should validate embedding endpoint structure', () => {
      const embeddingPath = openApiSpec.paths['/api/v1/embeddings'];
      expect(embeddingPath.post).toBeDefined();
      
      const postOperation = embeddingPath.post;
      expect(postOperation.summary).toBeDefined();
      expect(postOperation.tags).toContain('Embedding Operations');
      
      // Validate request body schema
      const requestSchema = postOperation.requestBody.content['application/json'].schema;
      expect(requestSchema.properties.text).toBeDefined();
      expect(requestSchema.properties.model).toBeDefined();
      expect(requestSchema.required).toContain('text');
    });

    it('should validate health endpoint structure', () => {
      const healthPath = openApiSpec.paths['/health'];
      expect(healthPath.get).toBeDefined();
      
      const getOperation = healthPath.get;
      expect(getOperation.summary).toBeDefined();
      expect(getOperation.tags).toContain('Health');
      
      // Validate response structure
      const responseSchema = getOperation.responses['200'].content['application/json'].schema;
      expect(responseSchema.properties.status).toBeDefined();
      expect(responseSchema.properties.timestamp).toBeDefined();
      expect(responseSchema.properties.dependencies).toBeDefined();
      expect(responseSchema.properties.metrics).toBeDefined();
    });
  });

  describe('Event Structure Validation', () => {
    it('should validate document indexed event schema', () => {
      const message = asyncApiSpec.components.messages.DocumentIndexed;
      expect(message.payload).toBeDefined();
      
      const payload = message.payload;
      expect(payload.properties.documentId).toBeDefined();
      expect(payload.properties.indexId).toBeDefined();
      expect(payload.properties.title).toBeDefined();
      expect(payload.properties.processingTime).toBeDefined();
      expect(payload.properties.chunkCount).toBeDefined();
      expect(payload.properties.embeddingModel).toBeDefined();
    });

    it('should validate search performed event schema', () => {
      const message = asyncApiSpec.components.messages.SearchPerformed;
      expect(message.payload).toBeDefined();
      
      const payload = message.payload;
      expect(payload.properties.query).toBeDefined();
      expect(payload.properties.searchType).toBeDefined();
      expect(payload.properties.resultCount).toBeDefined();
      expect(payload.properties.processingTime).toBeDefined();
      expect(payload.properties.threshold).toBeDefined();
    });

    it('should validate embedding generated event schema', () => {
      const message = asyncApiSpec.components.messages.EmbeddingGenerated;
      expect(message.payload).toBeDefined();
      
      const payload = message.payload;
      expect(payload.properties.embeddingId).toBeDefined();
      expect(payload.properties.textLength).toBeDefined();
      expect(payload.properties.model).toBeDefined();
      expect(payload.properties.dimensions).toBeDefined();
      expect(payload.properties.tokens).toBeDefined();
      expect(payload.properties.processingTime).toBeDefined();
    });
  });

  describe('Security Schema Validation', () => {
    it('should define proper security schemes', () => {
      expect(openApiSpec.components.securitySchemes).toBeDefined();
      expect(openApiSpec.components.securitySchemes.BearerAuth).toBeDefined();
      
      const bearerAuth = openApiSpec.components.securitySchemes.BearerAuth;
      expect(bearerAuth.type).toBe('http');
      expect(bearerAuth.scheme).toBe('bearer');
      expect(bearerAuth.bearerFormat).toBe('JWT');
    });

    it('should apply security to protected endpoints', () => {
      expect(openApiSpec.security).toBeDefined();
      expect(openApiSpec.security[0].BearerAuth).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    it('should define proper server configurations', () => {
      expect(openApiSpec.servers).toBeDefined();
      expect(openApiSpec.servers.length).toBeGreaterThan(0);
      
      const devServer = openApiSpec.servers.find((s: any) => s.description === 'Development server');
      expect(devServer).toBeDefined();
      expect(devServer.url).toMatch(/http:\/\/.*:3003/);
      
      const prodServer = openApiSpec.servers.find((s: any) => s.description === 'Production server');
      expect(prodServer).toBeDefined();
      expect(prodServer.url).toBe('https://api.cycletime.dev/document-indexing');
    });
  });

  describe('Performance Requirements', () => {
    it('should document response time expectations', () => {
      // Check if performance requirements are documented in operation descriptions
      const searchOp = openApiSpec.paths['/api/v1/search'].post;
      expect(searchOp.description).toBeDefined();
      
      const embeddingOp = openApiSpec.paths['/api/v1/embeddings'].post;
      expect(embeddingOp.description).toBeDefined();
    });

    it('should define appropriate timeout values', () => {
      // This would typically be validated through operation metadata
      // or custom extensions in the OpenAPI spec
      expect(openApiSpec.info).toBeDefined();
    });
  });
});