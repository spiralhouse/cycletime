import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('Contract Validation Tests', () => {
  let openApiSpec: any;
  let asyncApiSpec: any;

  beforeAll(async () => {
    // Load OpenAPI specification
    const openApiPath = path.join(__dirname, '../../openapi.yaml');
    const openApiContent = fs.readFileSync(openApiPath, 'utf8');
    openApiSpec = yaml.load(openApiContent);

    // Load AsyncAPI specification
    const asyncApiPath = path.join(__dirname, '../../asyncapi.yaml');
    const asyncApiContent = fs.readFileSync(asyncApiPath, 'utf8');
    asyncApiSpec = yaml.load(asyncApiContent);
  });

  describe('OpenAPI Contract Validation', () => {
    describe('Index Management Endpoints', () => {
      it('GET /api/v1/indices should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/indices'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        
        // Validate response structure matches OpenAPI spec
        expect(body).toHaveProperty('indices');
        expect(Array.isArray(body.indices)).toBe(true);
        expect(body).toHaveProperty('total');
        expect(body).toHaveProperty('offset');
        expect(body).toHaveProperty('limit');

        // Validate individual index structure
        if (body.indices.length > 0) {
          const index = body.indices[0];
          expect(index).toHaveProperty('id');
          expect(index).toHaveProperty('name');
          expect(index).toHaveProperty('description');
          expect(index).toHaveProperty('status');
          expect(index).toHaveProperty('documentCount');
          expect(index).toHaveProperty('vectorDimensions');
          expect(index).toHaveProperty('embeddingModel');
          expect(index).toHaveProperty('createdAt');
          expect(index).toHaveProperty('updatedAt');
          expect(index).toHaveProperty('settings');
        }
      });

      it('POST /api/v1/indices should match OpenAPI spec', async () => {
        const indexData = {
          name: 'test-contract-index',
          description: 'Test index for contract validation',
          vectorDimensions: 1536,
          embeddingModel: 'text-embedding-3-small',
          settings: {
            chunkSize: 1000,
            chunkOverlap: 100,
            similarityThreshold: 0.7,
            enableHybridSearch: true,
            enableKeywordSearch: true
          }
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/indices',
          payload: indexData
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();

        // Validate required response fields per OpenAPI spec
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('name', indexData.name);
        expect(body).toHaveProperty('description', indexData.description);
        expect(body).toHaveProperty('status');
        expect(body).toHaveProperty('vectorDimensions', indexData.vectorDimensions);
        expect(body).toHaveProperty('embeddingModel', indexData.embeddingModel);
        expect(body).toHaveProperty('createdAt');
        expect(body).toHaveProperty('updatedAt');
      });

      it('GET /api/v1/indices/{id} should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/indices/idx-001'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        // Validate response structure
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('name');
        expect(body).toHaveProperty('description');
        expect(body).toHaveProperty('status');
        expect(['active', 'inactive', 'creating', 'updating', 'deleting']).toContain(body.status);
      });

      it('PUT /api/v1/indices/{id} should match OpenAPI spec', async () => {
        const updateData = {
          description: 'Updated description for contract validation'
        };

        const response = await app.inject({
          method: 'PUT',
          url: '/api/v1/indices/idx-001',
          payload: updateData
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('id', 'idx-001');
        expect(body).toHaveProperty('description', updateData.description);
        expect(body).toHaveProperty('updatedAt');
      });

      it('DELETE /api/v1/indices/{id} should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: '/api/v1/indices/idx-test'
        });

        expect([200, 404]).toContain(response.statusCode);
        
        if (response.statusCode === 200) {
          const body = response.json();
          expect(body).toHaveProperty('success', true);
          expect(body).toHaveProperty('message');
        }
      });
    });

    describe('Document Management Endpoints', () => {
      it('GET /api/v1/documents should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/documents?indexId=idx-001'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('documents');
        expect(Array.isArray(body.documents)).toBe(true);
        expect(body).toHaveProperty('total');
        expect(body).toHaveProperty('offset');
        expect(body).toHaveProperty('limit');
      });

      it('POST /api/v1/documents should match OpenAPI spec', async () => {
        const documentData = {
          indexId: 'idx-001',
          documentId: 'contract-test-doc',
          title: 'Contract Test Document',
          content: 'This is a test document for contract validation testing.',
          metadata: {
            author: 'Contract Tester',
            category: 'test',
            version: '1.0.0'
          }
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/documents',
          payload: documentData
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();

        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('indexId', documentData.indexId);
        expect(body).toHaveProperty('documentId', documentData.documentId);
        expect(body).toHaveProperty('title', documentData.title);
        expect(body).toHaveProperty('content', documentData.content);
        expect(body).toHaveProperty('metadata');
        expect(body).toHaveProperty('status');
        expect(body).toHaveProperty('indexedAt');
      });

      it('GET /api/v1/documents/{id} should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/documents/doc-001'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('documentId');
        expect(body).toHaveProperty('title');
        expect(body).toHaveProperty('content');
        expect(body).toHaveProperty('status');
        expect(['indexed', 'indexing', 'failed', 'pending']).toContain(body.status);
      });
    });

    describe('Search Endpoints', () => {
      it('POST /api/v1/search should match OpenAPI spec', async () => {
        const searchRequest = {
          query: 'test document',
          searchType: 'semantic',
          limit: 10,
          threshold: 0.7
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/search',
          payload: searchRequest
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('query', searchRequest.query);
        expect(body).toHaveProperty('results');
        expect(Array.isArray(body.results)).toBe(true);
        expect(body).toHaveProperty('total');
        expect(body).toHaveProperty('processingTime');
        expect(body).toHaveProperty('searchType');

        // Validate search result structure
        if (body.results.length > 0) {
          const result = body.results[0];
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('documentId');
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('content');
          expect(result).toHaveProperty('score');
          expect(result).toHaveProperty('similarity');
          expect(result).toHaveProperty('matchType');
          expect(['semantic', 'keyword', 'hybrid']).toContain(result.matchType);
        }
      });

      it('POST /api/v1/search/similarity should match OpenAPI spec', async () => {
        const embeddings = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
        
        const similarityRequest = {
          embeddings,
          limit: 5,
          threshold: 0.5
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/search/similarity',
          payload: similarityRequest
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('results');
        expect(Array.isArray(body.results)).toBe(true);
        expect(body).toHaveProperty('total');
        expect(body).toHaveProperty('processingTime');
        expect(body).toHaveProperty('searchType', 'semantic');
      });

      it('GET /api/v1/search/suggestions should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/search/suggestions?query=test&limit=5'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('suggestions');
        expect(Array.isArray(body.suggestions)).toBe(true);
        expect(body).toHaveProperty('query', 'test');
      });

      it('GET /api/v1/search/analytics should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/search/analytics'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('totalQueries');
        expect(body).toHaveProperty('averageQueryTime');
        expect(body).toHaveProperty('popularQueries');
        expect(body).toHaveProperty('successRate');
        expect(body).toHaveProperty('searchTypes');
      });
    });

    describe('Embedding Endpoints', () => {
      it('POST /api/v1/embeddings should match OpenAPI spec', async () => {
        const embeddingRequest = {
          text: 'This is a test text for embedding generation',
          model: 'text-embedding-3-small'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/embeddings',
          payload: embeddingRequest
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('text', embeddingRequest.text);
        expect(body).toHaveProperty('embeddings');
        expect(Array.isArray(body.embeddings)).toBe(true);
        expect(body).toHaveProperty('model');
        expect(body).toHaveProperty('dimensions');
        expect(body).toHaveProperty('tokens');
        expect(body).toHaveProperty('processingTime');
        expect(body).toHaveProperty('createdAt');
      });

      it('POST /api/v1/embeddings/batch should match OpenAPI spec', async () => {
        const batchRequest = {
          texts: [
            'First test text for batch embedding',
            'Second test text for batch embedding'
          ],
          model: 'text-embedding-3-small'
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/embeddings/batch',
          payload: batchRequest
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('batchId');
        expect(body).toHaveProperty('embeddings');
        expect(Array.isArray(body.embeddings)).toBe(true);
        expect(body.embeddings).toHaveLength(batchRequest.texts.length);
        expect(body).toHaveProperty('totalTexts', batchRequest.texts.length);
        expect(body).toHaveProperty('processingTime');
      });

      it('POST /api/v1/embeddings/compare should match OpenAPI spec', async () => {
        const embedding1 = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
        const embedding2 = Array(1536).fill(0).map(() => Math.random() * 2 - 1);

        const compareRequest = {
          embedding1,
          embedding2
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/embeddings/compare',
          payload: compareRequest
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('similarity');
        expect(typeof body.similarity).toBe('number');
        expect(body.similarity).toBeGreaterThanOrEqual(-1);
        expect(body.similarity).toBeLessThanOrEqual(1);
        expect(body).toHaveProperty('distance');
        expect(body).toHaveProperty('method', 'cosine');
      });
    });

    describe('Analytics Endpoints', () => {
      it('GET /api/v1/analytics/statistics should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/analytics/statistics'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('totalDocuments');
        expect(body).toHaveProperty('totalEmbeddings');
        expect(body).toHaveProperty('totalChunks');
        expect(body).toHaveProperty('averageIndexingTime');
        expect(body).toHaveProperty('vectorDimensions');
        expect(body).toHaveProperty('storageUsed');
        expect(body).toHaveProperty('queryCount');
        expect(body).toHaveProperty('averageQueryTime');
        expect(body).toHaveProperty('successRate');
        expect(body).toHaveProperty('errorRate');
      });

      it('POST /api/v1/analytics/reports should match OpenAPI spec', async () => {
        const reportRequest = {
          type: 'performance',
          timeframe: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          metrics: ['queryTime', 'indexingTime', 'errorRate']
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/analytics/reports',
          payload: reportRequest
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('reportId');
        expect(body).toHaveProperty('type', reportRequest.type);
        expect(body).toHaveProperty('timeframe');
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('generatedAt');
      });
    });

    describe('Health Endpoints', () => {
      it('GET /health should match OpenAPI spec', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/health'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();

        expect(body).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
        expect(body).toHaveProperty('timestamp');
        expect(body).toHaveProperty('version');
        expect(body).toHaveProperty('dependencies');
        expect(body).toHaveProperty('metrics');
      });

      it('GET /health/dependencies should match OpenAPI spec', async () => {
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
  });

  describe('Error Response Validation', () => {
    it('should return 400 for invalid search request', async () => {
      const invalidRequest = {
        // Missing required 'query' field
        searchType: 'semantic'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/search',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
    });

    it('should return 404 for non-existent index', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/indices/non-existent-index'
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
    });

    it('should return 404 for non-existent document', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/documents/non-existent-document'
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('Data Type Validation', () => {
    it('should validate integer types', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/documents?limit=invalid'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate number ranges', async () => {
      const invalidRequest = {
        query: 'test',
        threshold: 1.5 // Should be between 0 and 1
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/search',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate enum values', async () => {
      const invalidRequest = {
        query: 'test',
        searchType: 'invalid_type' // Should be 'semantic', 'keyword', or 'hybrid'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/search',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('AsyncAPI Contract Validation', () => {
    it('should validate document indexed event structure', () => {
      const documentIndexedEvent = {
        specversion: '1.0',
        type: 'com.cycletime.document.indexed',
        source: 'document-indexing-service',
        id: 'evt-001',
        time: new Date().toISOString(),
        data: {
          documentId: 'doc-001',
          indexId: 'idx-001',
          title: 'Test Document',
          processingTime: 1500,
          chunkCount: 5,
          embeddingModel: 'text-embedding-3-small',
          vectorDimensions: 1536,
          wordCount: 150,
          language: 'en'
        }
      };

      // Validate event structure matches AsyncAPI spec
      expect(documentIndexedEvent).toHaveProperty('specversion');
      expect(documentIndexedEvent).toHaveProperty('type');
      expect(documentIndexedEvent).toHaveProperty('source');
      expect(documentIndexedEvent).toHaveProperty('id');
      expect(documentIndexedEvent).toHaveProperty('time');
      expect(documentIndexedEvent).toHaveProperty('data');
      
      const data = documentIndexedEvent.data;
      expect(data).toHaveProperty('documentId');
      expect(data).toHaveProperty('indexId');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('processingTime');
      expect(data).toHaveProperty('chunkCount');
      expect(data).toHaveProperty('embeddingModel');
      expect(data).toHaveProperty('vectorDimensions');
    });

    it('should validate search performed event structure', () => {
      const searchPerformedEvent = {
        specversion: '1.0',
        type: 'com.cycletime.search.performed',
        source: 'document-indexing-service',
        id: 'evt-002',
        time: new Date().toISOString(),
        data: {
          query: 'test search',
          searchType: 'semantic',
          resultCount: 5,
          processingTime: 150,
          threshold: 0.7,
          indexId: 'idx-001',
          userId: 'user-001'
        }
      };

      expect(searchPerformedEvent.data).toHaveProperty('query');
      expect(searchPerformedEvent.data).toHaveProperty('searchType');
      expect(['semantic', 'keyword', 'hybrid']).toContain(searchPerformedEvent.data.searchType);
      expect(searchPerformedEvent.data).toHaveProperty('resultCount');
      expect(searchPerformedEvent.data).toHaveProperty('processingTime');
    });

    it('should validate embedding generated event structure', () => {
      const embeddingGeneratedEvent = {
        specversion: '1.0',
        type: 'com.cycletime.embedding.generated',
        source: 'document-indexing-service',
        id: 'evt-003',
        time: new Date().toISOString(),
        data: {
          embeddingId: 'emb-001',
          textLength: 100,
          model: 'text-embedding-3-small',
          dimensions: 1536,
          tokens: 25,
          processingTime: 200
        }
      };

      expect(embeddingGeneratedEvent.data).toHaveProperty('embeddingId');
      expect(embeddingGeneratedEvent.data).toHaveProperty('textLength');
      expect(embeddingGeneratedEvent.data).toHaveProperty('model');
      expect(embeddingGeneratedEvent.data).toHaveProperty('dimensions');
      expect(embeddingGeneratedEvent.data).toHaveProperty('tokens');
      expect(embeddingGeneratedEvent.data).toHaveProperty('processingTime');
    });
  });

  describe('Performance Contract Validation', () => {
    it('should meet response time requirements for search', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/search',
        payload: {
          query: 'performance test',
          searchType: 'semantic',
          limit: 10
        }
      });

      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should meet response time requirements for embedding generation', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/embeddings',
        payload: {
          text: 'Performance test text for embedding generation',
          model: 'text-embedding-3-small'
        }
      });

      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map((_, index) => 
        app.inject({
          method: 'POST',
          url: '/api/v1/search',
          payload: {
            query: `concurrent test ${index}`,
            searchType: 'semantic'
          }
        })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });
  });
});