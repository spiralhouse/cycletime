/**
 * Test Data Generator - Contract-first test data generation
 * 
 * Basic implementation for contract testing framework foundation
 */

import { 
  ApiTestData, 
  EventTestData, 
  PerformanceTestSuite, 
  EndpointConfig,
  EndpointPerformanceTest,
  EventPerformanceTest,
  PerformanceThresholds,
  CorrelationPattern
} from '../types';

export class TestDataGenerator {
  private static readonly DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
    responseTime: { max: 1000, unit: 'ms' },
    throughput: { min: 10, unit: 'requests/second' },
    concurrency: { max: 100, unit: 'concurrent_requests' }
  };

  /**
   * Generate test data from a JSON Schema
   */
  generateFromSchema(schema: any): any {
    if (!schema) {
      return null;
    }

    // Use examples if available
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Generate based on schema type
    switch (schema.type) {
      case 'string':
        return this.generateStringValue(schema);
      case 'number':
        return this.generateNumberValue(schema);
      case 'integer':
        return this.generateIntegerValue(schema);
      case 'boolean':
        return Math.random() < 0.5;
      case 'array':
        return [this.generateFromSchema(schema.items || { type: 'string' })];
      case 'object':
        return this.generateObjectValue(schema);
      default:
        return null;
    }
  }

  /**
   * Generate API test data from OpenAPI specification
   */
  generateApiTestData(spec: any): ApiTestData {
    const requests: Record<string, Record<string, any>> = {};
    const responses: Record<string, Record<string, any>> = {};
    const examples: Record<string, any> = {};

    if (spec?.paths) {
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (!pathItem) continue;

        requests[path] = {};
        responses[path] = {};

        const methods = ['get', 'post', 'put', 'delete', 'patch'];
        
        for (const method of methods) {
          const operation = (pathItem as any)[method];
          
          if (operation) {
            requests[path][method] = { message: 'Generated request data' };
            responses[path][method] = { message: 'Generated response data' };
            
            if (operation.operationId) {
              examples[operation.operationId] = {
                request: requests[path][method],
                response: responses[path][method]
              };
            }
          }
        }
      }
    }

    return { requests, responses, examples };
  }

  /**
   * Generate event test data from AsyncAPI specification
   */
  generateEventTestData(spec: any): EventTestData {
    const publishedEvents: Record<string, any[]> = {};
    const consumedEvents: Record<string, any[]> = {};
    const correlationPatterns: CorrelationPattern[] = [];

    if (spec?.channels) {
      for (const channelName of Object.keys(spec.channels)) {
        publishedEvents[channelName] = [
          { message: `Generated event data for ${channelName}`, timestamp: new Date().toISOString() }
        ];
        consumedEvents[channelName] = [
          { message: `Generated event data for ${channelName}`, timestamp: new Date().toISOString() }
        ];
      }

      const eventNames = Object.keys(spec.channels);
      if (eventNames.length > 1) {
        correlationPatterns.push({
          name: 'default-sequence',
          events: eventNames.slice(0, 2),
          order: 'sequential',
          timeout: 5000
        });
      }
    }

    return { publishedEvents, consumedEvents, correlationPatterns };
  }

  /**
   * Generate performance test suite
   */
  generatePerformanceTestData(
    endpoints: EndpointConfig[], 
    thresholds?: Partial<PerformanceThresholds>
  ): PerformanceTestSuite {
    const mergedThresholds = { ...TestDataGenerator.DEFAULT_PERFORMANCE_THRESHOLDS, ...thresholds };
    
    const endpointTests: EndpointPerformanceTest[] = endpoints.map(endpoint => ({
      path: endpoint.path,
      method: endpoint.method,
      testData: { message: 'Performance test data' },
      expectedResponseTime: mergedThresholds.responseTime.max,
      concurrency: Math.min(10, mergedThresholds.concurrency.max)
    }));

    const eventTests: EventPerformanceTest[] = [];

    return {
      endpoints: endpointTests,
      events: eventTests,
      thresholds: mergedThresholds
    };
  }

  /**
   * Private helper methods
   */

  private generateStringValue(schema: any): string {
    if (schema.enum) {
      return schema.enum[0];
    }

    if (schema.format) {
      switch (schema.format) {
        case 'email':
          return 'test@example.com';
        case 'uri':
        case 'url':
          return 'https://example.com';
        case 'date':
          return new Date().toISOString().split('T')[0];
        case 'date-time':
          return new Date().toISOString();
        case 'uuid':
          return '123e4567-e89b-12d3-a456-426614174000';
        default:
          return 'test-string';
      }
    }

    return 'test-string';
  }

  private generateNumberValue(schema: any): number {
    const min = schema.minimum || 0;
    const max = schema.maximum || 100;
    return Math.random() * (max - min) + min;
  }

  private generateIntegerValue(schema: any): number {
    const min = schema.minimum || 0;
    const max = schema.maximum || 100;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateObjectValue(schema: any): any {
    const obj: any = {};
    
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const isRequired = schema.required?.includes(key);
        const includeOptional = Math.random() < 0.7;
        
        if (isRequired || includeOptional) {
          obj[key] = this.generateFromSchema(propSchema);
        }
      }
    }

    return obj;
  }
}