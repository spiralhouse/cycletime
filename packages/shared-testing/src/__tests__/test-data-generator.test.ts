/**
 * Tests for TestDataGenerator - Contract-first test data generation
 */

import { TestDataGenerator } from '../contract/test-data-generator';
import { EndpointConfig, PerformanceThresholds } from '../types';

describe('TestDataGenerator', () => {
  let generator: TestDataGenerator;

  beforeEach(() => {
    generator = new TestDataGenerator();
  });

  describe('generateFromSchema', () => {
    it('should return null for null schema', () => {
      const result = generator.generateFromSchema(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined schema', () => {
      const result = generator.generateFromSchema(undefined);
      expect(result).toBeNull();
    });

    it('should use example value when provided', () => {
      const schema = {
        type: 'string',
        example: 'example-value'
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toBe('example-value');
    });

    it('should generate string values', () => {
      const schema = { type: 'string' };

      const result = generator.generateFromSchema(schema);
      expect(typeof result).toBe('string');
      expect(result).toBe('test-string');
    });

    it('should generate number values', () => {
      const schema = { type: 'number' };

      const result = generator.generateFromSchema(schema);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should generate integer values', () => {
      const schema = { type: 'integer' };

      const result = generator.generateFromSchema(schema);
      expect(typeof result).toBe('number');
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should generate boolean values', () => {
      const schema = { type: 'boolean' };

      const result = generator.generateFromSchema(schema);
      expect(typeof result).toBe('boolean');
    });

    it('should generate array values', () => {
      const schema = {
        type: 'array',
        items: { type: 'string' }
      };

      const result = generator.generateFromSchema(schema);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(typeof result[0]).toBe('string');
    });

    it('should generate array with default items when items not specified', () => {
      const schema = { type: 'array' };

      const result = generator.generateFromSchema(schema);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should generate object values', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' }
        },
        required: ['name']
      };

      const result = generator.generateFromSchema(schema);
      expect(typeof result).toBe('object');
      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });

    it('should return null for unknown schema types', () => {
      const schema = { type: 'unknown' };

      const result = generator.generateFromSchema(schema);
      expect(result).toBeNull();
    });
  });

  describe('string generation', () => {
    it('should use enum values when provided', () => {
      const schema = {
        type: 'string',
        enum: ['option1', 'option2', 'option3']
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toBe('option1');
    });

    it('should generate email format', () => {
      const schema = {
        type: 'string',
        format: 'email'
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toBe('test@example.com');
    });

    it('should generate uri format', () => {
      const schema = {
        type: 'string',
        format: 'uri'
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toBe('https://example.com');
    });

    it('should generate url format', () => {
      const schema = {
        type: 'string',
        format: 'url'
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toBe('https://example.com');
    });

    it('should generate date format', () => {
      const schema = {
        type: 'string',
        format: 'date'
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should generate date-time format', () => {
      const schema = {
        type: 'string',
        format: 'date-time'
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should generate uuid format', () => {
      const schema = {
        type: 'string',
        format: 'uuid'
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should generate default string for unknown format', () => {
      const schema = {
        type: 'string',
        format: 'unknown-format'
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toBe('test-string');
    });
  });

  describe('number generation', () => {
    it('should respect minimum and maximum values', () => {
      const schema = {
        type: 'number',
        minimum: 10,
        maximum: 20
      };

      const result = generator.generateFromSchema(schema);
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('should use default range when min/max not specified', () => {
      const schema = { type: 'number' };

      const result = generator.generateFromSchema(schema);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('integer generation', () => {
    it('should respect minimum and maximum values', () => {
      const schema = {
        type: 'integer',
        minimum: 5,
        maximum: 15
      };

      const result = generator.generateFromSchema(schema);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(15);
    });

    it('should use default range when min/max not specified', () => {
      const schema = { type: 'integer' };

      const result = generator.generateFromSchema(schema);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('object generation', () => {
    it('should generate required properties', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          optional: { type: 'string' }
        },
        required: ['id', 'name']
      };

      const result = generator.generateFromSchema(schema);
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(typeof result.id).toBe('number');
      expect(typeof result.name).toBe('string');
    });

    it('should handle empty properties', () => {
      const schema = {
        type: 'object',
        properties: {}
      };

      const result = generator.generateFromSchema(schema);
      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle missing properties', () => {
      const schema = { type: 'object' };

      const result = generator.generateFromSchema(schema);
      expect(typeof result).toBe('object');
    });
  });

  describe('generateApiTestData', () => {
    it('should generate test data from OpenAPI spec', () => {
      const spec = {
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              responses: { '200': { description: 'Success' } }
            },
            post: {
              operationId: 'createUser',
              responses: { '201': { description: 'Created' } }
            }
          },
          '/users/{id}': {
            get: {
              operationId: 'getUserById',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const result = generator.generateApiTestData(spec);

      expect(result.requests).toBeDefined();
      expect(result.responses).toBeDefined();
      expect(result.examples).toBeDefined();

      expect(result.requests['/users']).toBeDefined();
      expect(result.requests['/users']['get']).toEqual({ message: 'Generated request data' });
      expect(result.requests['/users']['post']).toEqual({ message: 'Generated request data' });

      expect(result.responses['/users']['get']).toEqual({ message: 'Generated response data' });
      expect(result.responses['/users']['post']).toEqual({ message: 'Generated response data' });

      expect(result.examples['getUsers']).toBeDefined();
      expect(result.examples['createUser']).toBeDefined();
      expect(result.examples['getUserById']).toBeDefined();
    });

    it('should handle spec without paths', () => {
      const spec = { info: { title: 'Test API' } };

      const result = generator.generateApiTestData(spec);

      expect(result.requests).toEqual({});
      expect(result.responses).toEqual({});
      expect(result.examples).toEqual({});
    });

    it('should handle empty spec', () => {
      const result = generator.generateApiTestData({});

      expect(result.requests).toEqual({});
      expect(result.responses).toEqual({});
      expect(result.examples).toEqual({});
    });

    it('should handle paths with null values', () => {
      const spec = {
        paths: {
          '/users': null,
          '/orders': {
            get: {
              operationId: 'getOrders',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const result = generator.generateApiTestData(spec);

      expect(result.requests['/users']).toBeUndefined();
      expect(result.requests['/orders']).toBeDefined();
      expect(result.requests['/orders']['get']).toEqual({ message: 'Generated request data' });
    });

    it('should handle operations without operationId', () => {
      const spec = {
        paths: {
          '/health': {
            get: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      const result = generator.generateApiTestData(spec);

      expect(result.requests['/health']['get']).toEqual({ message: 'Generated request data' });
      expect(result.responses['/health']['get']).toEqual({ message: 'Generated response data' });
      expect(Object.keys(result.examples)).toHaveLength(0);
    });
  });

  describe('generateEventTestData', () => {
    it('should generate event test data from AsyncAPI spec', () => {
      const spec = {
        channels: {
          'user/created': {
            subscribe: {
              message: { name: 'UserCreated' }
            }
          },
          'user/updated': {
            publish: {
              message: { name: 'UserUpdated' }
            }
          },
          'user/deleted': {
            subscribe: {
              message: { name: 'UserDeleted' }
            }
          }
        }
      };

      const result = generator.generateEventTestData(spec);

      expect(result.publishedEvents).toBeDefined();
      expect(result.consumedEvents).toBeDefined();
      expect(result.correlationPatterns).toBeDefined();

      expect(result.publishedEvents['user/created']).toHaveLength(1);
      expect(result.consumedEvents['user/created']).toHaveLength(1);
      expect(result.publishedEvents['user/created'][0]).toMatchObject({
        message: 'Generated event data for user/created'
      });

      expect(result.correlationPatterns).toHaveLength(1);
      expect(result.correlationPatterns[0]).toMatchObject({
        name: 'default-sequence',
        events: ['user/created', 'user/updated'],
        order: 'sequential',
        timeout: 5000
      });
    });

    it('should handle spec without channels', () => {
      const spec = { info: { title: 'Test Events' } };

      const result = generator.generateEventTestData(spec);

      expect(result.publishedEvents).toEqual({});
      expect(result.consumedEvents).toEqual({});
      expect(result.correlationPatterns).toEqual([]);
    });

    it('should handle empty spec', () => {
      const result = generator.generateEventTestData({});

      expect(result.publishedEvents).toEqual({});
      expect(result.consumedEvents).toEqual({});
      expect(result.correlationPatterns).toEqual([]);
    });

    it('should handle single channel without correlation pattern', () => {
      const spec = {
        channels: {
          'single/event': {
            subscribe: { message: { name: 'SingleEvent' } }
          }
        }
      };

      const result = generator.generateEventTestData(spec);

      expect(result.publishedEvents['single/event']).toHaveLength(1);
      expect(result.consumedEvents['single/event']).toHaveLength(1);
      expect(result.correlationPatterns).toHaveLength(0);
    });

    it('should generate timestamp in published and consumed events', () => {
      const spec = {
        channels: {
          'test/event': {
            subscribe: { message: { name: 'TestEvent' } }
          }
        }
      };

      const result = generator.generateEventTestData(spec);

      expect(result.publishedEvents['test/event'][0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.consumedEvents['test/event'][0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('generatePerformanceTestData', () => {
    it('should generate performance test suite with default thresholds', () => {
      const endpoints: EndpointConfig[] = [
        { path: '/users', method: 'GET' },
        { path: '/users', method: 'POST' },
        { path: '/users/{id}', method: 'GET' }
      ];

      const result = generator.generatePerformanceTestData(endpoints);

      expect(result.endpoints).toHaveLength(3);
      expect(result.events).toHaveLength(0);
      expect(result.thresholds).toBeDefined();

      expect(result.thresholds.responseTime).toEqual({ max: 1000, unit: 'ms' });
      expect(result.thresholds.throughput).toEqual({ min: 10, unit: 'requests/second' });
      expect(result.thresholds.concurrency).toEqual({ max: 100, unit: 'concurrent_requests' });

      result.endpoints.forEach(endpoint => {
        expect(endpoint.testData).toEqual({ message: 'Performance test data' });
        expect(endpoint.expectedResponseTime).toBe(1000);
        expect(endpoint.concurrency).toBe(10);
      });
    });

    it('should generate performance test suite with custom thresholds', () => {
      const endpoints: EndpointConfig[] = [
        { path: '/api/fast', method: 'GET' }
      ];
      const customThresholds: Partial<PerformanceThresholds> = {
        responseTime: { max: 500, unit: 'ms' },
        concurrency: { max: 50, unit: 'concurrent_requests' }
      };

      const result = generator.generatePerformanceTestData(endpoints, customThresholds);

      expect(result.thresholds.responseTime).toEqual({ max: 500, unit: 'ms' });
      expect(result.thresholds.throughput).toEqual({ min: 10, unit: 'requests/second' }); // default
      expect(result.thresholds.concurrency).toEqual({ max: 50, unit: 'concurrent_requests' });

      expect(result.endpoints[0].expectedResponseTime).toBe(500);
      expect(result.endpoints[0].concurrency).toBe(10); // min of 10 and 50
    });

    it('should handle empty endpoints array', () => {
      const result = generator.generatePerformanceTestData([]);

      expect(result.endpoints).toHaveLength(0);
      expect(result.events).toHaveLength(0);
      expect(result.thresholds).toBeDefined();
    });

    it('should limit concurrency to maximum threshold', () => {
      const endpoints: EndpointConfig[] = [
        { path: '/test', method: 'GET' }
      ];
      const customThresholds: Partial<PerformanceThresholds> = {
        concurrency: { max: 5, unit: 'concurrent_requests' }
      };

      const result = generator.generatePerformanceTestData(endpoints, customThresholds);

      expect(result.endpoints[0].concurrency).toBe(5); // min of 10 and 5
    });

    it('should handle high concurrency limits', () => {
      const endpoints: EndpointConfig[] = [
        { path: '/test', method: 'GET' }
      ];
      const customThresholds: Partial<PerformanceThresholds> = {
        concurrency: { max: 500, unit: 'concurrent_requests' }
      };

      const result = generator.generatePerformanceTestData(endpoints, customThresholds);

      expect(result.endpoints[0].concurrency).toBe(10); // min of 10 and 500
    });

    it('should generate correct endpoint performance test structure', () => {
      const endpoints: EndpointConfig[] = [
        { path: '/users/{userId}/orders', method: 'POST' }
      ];

      const result = generator.generatePerformanceTestData(endpoints);

      expect(result.endpoints[0]).toMatchObject({
        path: '/users/{userId}/orders',
        method: 'POST',
        testData: { message: 'Performance test data' },
        expectedResponseTime: 1000,
        concurrency: 10
      });
    });
  });
});