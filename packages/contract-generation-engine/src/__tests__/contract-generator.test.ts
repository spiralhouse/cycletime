import { ContractGenerator } from '../utils/contract-generator';
import { ContractGenerationRequest } from '../types/contract-types';

describe('ContractGenerator', () => {
  let generator: ContractGenerator;
  let mockRequest: ContractGenerationRequest;

  beforeEach(() => {
    mockRequest = {
      serviceName: 'Test Service',
      serviceType: 'rest-api',
      requirements: 'A simple REST API for testing',
      architecture: 'Microservice architecture',
      dependencies: ['auth-service', 'database'],
      endpoints: [
        {
          path: '/api/test',
          method: 'GET',
          description: 'Get test data',
          responseSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              data: { type: 'array' },
            },
          },
        },
      ],
      events: [
        {
          name: 'test.created',
          description: 'Test entity created',
          type: 'published',
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      ],
      options: {
        includeExamples: true,
        includeMockData: true,
        validateOutput: true,
        outputFormat: 'both',
      },
    };

    generator = new ContractGenerator(mockRequest);
  });

  describe('generateContract', () => {
    it('should generate a complete contract specification', async () => {
      const result = await generator.generateContract();

      expect(result).toMatchObject({
        contractId: expect.stringMatching(/^contract-\d+-[a-z0-9]+$/),
        serviceName: 'Test Service',
        openapi: expect.objectContaining({
          openapi: '3.0.3',
          info: expect.objectContaining({
            title: 'Test Service API',
            version: '1.0.0',
          }),
          paths: expect.objectContaining({
            '/health': expect.any(Object),
            '/api/test': expect.any(Object),
          }),
        }),
        asyncapi: expect.objectContaining({
          asyncapi: '2.6.0',
          info: expect.objectContaining({
            title: 'Test Service Events',
            version: '1.0.0',
          }),
          channels: expect.objectContaining({
            'test/created': expect.any(Object),
          }),
        }),
        boundaries: expect.objectContaining({
          service: 'Test Service',
          dependencies: expect.arrayContaining([
            expect.objectContaining({
              service: 'auth-service',
              type: 'synchronous',
            }),
            expect.objectContaining({
              service: 'database',
              type: 'synchronous',
            }),
          ]),
          provides: expect.any(Array),
        }),
        metadata: expect.objectContaining({
          version: '1.0.0',
          generatedAt: expect.any(String),
          generatedBy: 'Contract Generation Engine',
        }),
      });
    });

    it('should generate OpenAPI specification with health check', async () => {
      const result = await generator.generateContract();

      expect(result.openapi).toHaveProperty('paths./health');
      expect(result.openapi.paths['/health']).toHaveProperty('get');
      expect(result.openapi.paths['/health'].get).toMatchObject({
        summary: 'Health check',
        operationId: 'healthCheck',
        tags: ['Health'],
      });
    });

    it('should generate custom endpoints from request', async () => {
      const result = await generator.generateContract();

      expect(result.openapi).toHaveProperty('paths./api/test');
      expect(result.openapi.paths['/api/test']).toHaveProperty('get');
      expect(result.openapi.paths['/api/test'].get).toMatchObject({
        summary: 'Get test data',
        operationId: 'getTest',
        tags: ['Test Service'],
      });
    });

    it('should generate AsyncAPI specification when events are provided', async () => {
      const result = await generator.generateContract();

      expect(result.asyncapi).toHaveProperty('channels.test/created');
      expect(result.asyncapi.channels['test/created']).toHaveProperty('publish');
      expect(result.asyncapi.components.messages).toHaveProperty('TestCreated');
    });

    it('should generate system boundaries', async () => {
      const result = await generator.generateContract();

      expect(result.boundaries).toMatchObject({
        service: 'Test Service',
        dependencies: [
          { service: 'auth-service', type: 'synchronous', required: true },
          { service: 'database', type: 'synchronous', required: true },
        ],
        provides: expect.arrayContaining([
          expect.objectContaining({
            name: 'Get test data',
            description: 'Get test data',
            endpoints: ['GET /api/test'],
          }),
          expect.objectContaining({
            name: 'test.created',
            description: 'Test entity created',
            events: ['test.created'],
          }),
        ]),
      });
    });

    it('should track generation stages', async () => {
      await generator.generateContract();
      const stages = generator.getStages();

      expect(stages).toHaveLength(8);
      expect(stages.map(s => s.name)).toEqual([
        'requirements-analysis',
        'architecture-parsing',
        'openapi-generation',
        'asyncapi-generation',
        'boundary-analysis',
        'validation',
        'stub-generation',
        'finalization',
      ]);
      
      // Check that all stages are completed
      stages.forEach(stage => {
        expect(stage.status).toBe('completed');
        expect(stage.startedAt).toBeDefined();
        expect(stage.completedAt).toBeDefined();
      });
    });
  });

  describe('exportToYAML', () => {
    it('should export specification to YAML format', async () => {
      const specification = { test: 'data', nested: { key: 'value' } };
      const yaml = await generator.exportToYAML(specification);

      expect(yaml).toBe('test: data\nnested:\n  key: value\n');
    });
  });

  describe('exportToJSON', () => {
    it('should export specification to JSON format', async () => {
      const specification = { test: 'data', nested: { key: 'value' } };
      const json = await generator.exportToJSON(specification);

      expect(json).toBe('{\n  "test": "data",\n  "nested": {\n    "key": "value"\n  }\n}');
    });
  });

  describe('generateContract with minimal request', () => {
    it('should generate contract with minimal required fields', async () => {
      const minimalRequest: ContractGenerationRequest = {
        serviceName: 'Minimal Service',
        serviceType: 'rest-api',
        requirements: 'A minimal service',
      };

      const minimalGenerator = new ContractGenerator(minimalRequest);
      const result = await minimalGenerator.generateContract();

      expect(result).toMatchObject({
        contractId: expect.any(String),
        serviceName: 'Minimal Service',
        openapi: expect.objectContaining({
          openapi: '3.0.3',
          info: expect.objectContaining({
            title: 'Minimal Service API',
          }),
          paths: expect.objectContaining({
            '/health': expect.any(Object),
          }),
        }),
        boundaries: expect.objectContaining({
          service: 'Minimal Service',
          dependencies: [],
          provides: [],
        }),
        metadata: expect.any(Object),
      });
    });
  });

  describe('error handling', () => {
    it('should handle empty endpoints array', async () => {
      const requestWithEmptyEndpoints = {
        ...mockRequest,
        endpoints: [],
      };

      const emptyGenerator = new ContractGenerator(requestWithEmptyEndpoints);
      const result = await emptyGenerator.generateContract();

      expect(result.openapi.paths).toHaveProperty('/health');
      expect(Object.keys(result.openapi.paths)).toHaveLength(1);
    });

    it('should handle missing events', async () => {
      const requestWithoutEvents = {
        ...mockRequest,
        events: undefined,
      };

      const noEventsGenerator = new ContractGenerator(requestWithoutEvents);
      const result = await noEventsGenerator.generateContract();

      expect(result.asyncapi).toBeUndefined();
    });

    it('should handle missing dependencies', async () => {
      const requestWithoutDependencies = {
        ...mockRequest,
        dependencies: undefined,
      };

      const noDepsGenerator = new ContractGenerator(requestWithoutDependencies);
      const result = await noDepsGenerator.generateContract();

      expect(result.boundaries.dependencies).toEqual([]);
    });
  });
});