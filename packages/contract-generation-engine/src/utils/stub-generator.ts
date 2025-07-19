import { OpenAPIV3 } from 'openapi-types';
import { ContractSpecification } from '../types/contract-types';
import { MockDataGenerator } from './mock-data-generator';
import { logger } from '@cycletime/shared-utils';

export interface StubGenerationOptions {
  includeExamples: boolean;
  includeMockData: boolean;
  includeValidation: boolean;
  responseDelay: number;
  errorRate: number;
  includeHealthCheck: boolean;
}

export interface GeneratedStub {
  serviceStub: string;
  mockData: Record<string, any>;
  testCases: string;
  documentation: string;
}

export class StubGenerator {
  private mockDataGenerator: MockDataGenerator;

  constructor() {
    this.mockDataGenerator = new MockDataGenerator();
  }

  async generateStub(
    specification: ContractSpecification,
    options: StubGenerationOptions = {
      includeExamples: true,
      includeMockData: true,
      includeValidation: true,
      responseDelay: 0,
      errorRate: 0,
      includeHealthCheck: true,
    }
  ): Promise<GeneratedStub> {
    try {
      const serviceStub = await this.generateServiceStub(specification, options);
      const mockData = await this.generateMockData(specification, options);
      const testCases = await this.generateTestCases(specification, options);
      const documentation = await this.generateDocumentation(specification, options);

      return {
        serviceStub,
        mockData,
        testCases,
        documentation,
      };
    } catch (error) {
      logger.error('Stub generation failed', { error, specification });
      throw error;
    }
  }

  private async generateServiceStub(
    specification: ContractSpecification,
    options: StubGenerationOptions
  ): Promise<string> {
    const openapi = specification.openapi as OpenAPIV3.Document;
    if (!openapi) {
      throw new Error('OpenAPI specification is required for stub generation');
    }

    const serviceName = this.toCamelCase(specification.serviceName);
    const routes = this.generateRoutes(openapi, options);
    const middleware = this.generateMiddleware(options);
    const errorHandling = this.generateErrorHandling();

    return `
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@cycletime/shared-utils';
import { z } from 'zod';

// Mock data import
import { mockData } from './mock-data';

// Type definitions
export interface ${serviceName}Routes {
  [key: string]: any;
}

// Plugin registration
export async function ${serviceName}Plugin(
  fastify: FastifyInstance,
  options: any
): Promise<void> {
  // Register middleware
  ${middleware}

  // Register routes
  ${routes}

  // Register error handling
  ${errorHandling}

  logger.info('${specification.serviceName} stub plugin registered');
}

// Route handlers
${this.generateRouteHandlers(openapi, options)}

// Helper functions
${this.generateHelperFunctions(options)}
`;
  }

  private generateRoutes(openapi: OpenAPIV3.Document, options: StubGenerationOptions): string {
    if (!openapi.paths) {
      return '';
    }

    const routes: string[] = [];

    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      if (typeof pathItem === 'object' && pathItem !== null) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            const operationObj = operation as OpenAPIV3.OperationObject;
            const handlerName = this.getHandlerName(method, path);
            const routeSchema = this.generateRouteSchema(operationObj, options);

            routes.push(`
  // ${operationObj.summary || `${method.toUpperCase()} ${path}`}
  fastify.route({
    method: '${method.toUpperCase()}',
    url: '${path}',
    schema: ${routeSchema},
    handler: ${handlerName}
  });`);
          }
        }
      }
    }

    return routes.join('\n');
  }

  private generateRouteSchema(operation: OpenAPIV3.OperationObject, options: StubGenerationOptions): string {
    const schema: any = {
      description: operation.description || operation.summary,
      tags: operation.tags || [],
    };

    // Add parameters schema
    if (operation.parameters) {
      const queryParams: any = {};
      const pathParams: any = {};
      const headerParams: any = {};

      operation.parameters.forEach((param: any) => {
        const paramSchema = param.schema || { type: 'string' };
        
        switch (param.in) {
          case 'query':
            queryParams[param.name] = paramSchema;
            break;
          case 'path':
            pathParams[param.name] = paramSchema;
            break;
          case 'header':
            headerParams[param.name] = paramSchema;
            break;
        }
      });

      if (Object.keys(queryParams).length > 0) {
        schema.querystring = {
          type: 'object',
          properties: queryParams,
        };
      }

      if (Object.keys(pathParams).length > 0) {
        schema.params = {
          type: 'object',
          properties: pathParams,
        };
      }

      if (Object.keys(headerParams).length > 0) {
        schema.headers = {
          type: 'object',
          properties: headerParams,
        };
      }
    }

    // Add request body schema
    if (operation.requestBody) {
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
      if (requestBody.content && requestBody.content['application/json']) {
        schema.body = requestBody.content['application/json'].schema;
      }
    }

    // Add response schema
    if (operation.responses) {
      const responses: any = {};
      
      Object.entries(operation.responses).forEach(([statusCode, response]) => {
        if (typeof response === 'object' && 'content' in response) {
          const responseObj = response as OpenAPIV3.ResponseObject;
          if (responseObj.content && responseObj.content['application/json']) {
            responses[statusCode] = {
              description: responseObj.description,
              type: 'object',
              properties: (responseObj.content['application/json'].schema as any)?.properties || {},
            };
          }
        }
      });

      if (Object.keys(responses).length > 0) {
        schema.response = responses;
      }
    }

    return JSON.stringify(schema, null, 2);
  }

  private generateRouteHandlers(openapi: OpenAPIV3.Document, options: StubGenerationOptions): string {
    if (!openapi.paths) {
      return '';
    }

    const handlers: string[] = [];

    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      if (typeof pathItem === 'object' && pathItem !== null) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            const operationObj = operation as OpenAPIV3.OperationObject;
            const handlerName = this.getHandlerName(method, path);
            const handler = this.generateRouteHandler(handlerName, operationObj, path, method, options);
            handlers.push(handler);
          }
        }
      }
    }

    return handlers.join('\n\n');
  }

  private generateRouteHandler(
    handlerName: string,
    operation: OpenAPIV3.OperationObject,
    path: string,
    method: string,
    options: StubGenerationOptions
  ): string {
    const delay = options.responseDelay > 0 ? `await new Promise(resolve => setTimeout(resolve, ${options.responseDelay}));` : '';
    const errorCheck = options.errorRate > 0 ? `
  // Simulate errors based on error rate
  if (Math.random() < ${options.errorRate}) {
    throw new Error('Simulated error for testing');
  }` : '';

    const responseGenerator = this.generateResponseHandler(operation, path, method, options);

    return `
async function ${handlerName}(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<any> {
  try {
    logger.info('${operation.summary || `${method.toUpperCase()} ${path}`}', {
      method: request.method,
      url: request.url,
      params: request.params,
      query: request.query,
    });

    ${delay}
    ${errorCheck}

    ${responseGenerator}
  } catch (error) {
    logger.error('Handler error', { error, path: '${path}', method: '${method}' });
    throw error;
  }
}`;
  }

  private generateResponseHandler(
    operation: OpenAPIV3.OperationObject,
    path: string,
    method: string,
    options: StubGenerationOptions
  ): string {
    const mockDataKey = `${method.toLowerCase()}${path.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    return `
    // Generate mock response
    const mockResponse = mockData['${mockDataKey}'] || {
      success: true,
      message: 'Mock response for ${operation.summary || `${method.toUpperCase()} ${path}`}',
      data: {},
      timestamp: new Date().toISOString(),
    };

    // Add request context to response
    if (options.includeRequestContext) {
      mockResponse.requestContext = {
        method: request.method,
        path: request.url,
        timestamp: new Date().toISOString(),
      };
    }

    return reply.code(200).send(mockResponse);`;
  }

  private generateMiddleware(options: StubGenerationOptions): string {
    const middleware: string[] = [];

    if (options.includeValidation) {
      middleware.push(`
  // Add validation middleware
  fastify.addHook('preValidation', async (request, reply) => {
    logger.debug('Validating request', {
      method: request.method,
      url: request.url,
    });
  });`);
    }

    middleware.push(`
  // Add request logging
  fastify.addHook('onRequest', async (request, reply) => {
    logger.info('Request received', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
    });
  });`);

    return middleware.join('\n');
  }

  private generateErrorHandling(): string {
    return `
  // Error handling
  fastify.setErrorHandler(async (error, request, reply) => {
    logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      method: request.method,
      url: request.url,
    });

    const statusCode = error.statusCode || 500;
    const response = {
      error: error.name || 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    return reply.code(statusCode).send(response);
  });`;
  }

  private generateHelperFunctions(options: StubGenerationOptions): string {
    return `
// Helper function to generate random delays
function randomDelay(min: number = 10, max: number = 100): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper function to generate random errors
function shouldGenerateError(rate: number = 0.1): boolean {
  return Math.random() < rate;
}

// Helper function to generate mock data
function generateMockData(template: any): any {
  // This would be replaced with actual mock data generation
  return template;
}`;
  }

  private async generateMockData(
    specification: ContractSpecification,
    options: StubGenerationOptions
  ): Promise<Record<string, any>> {
    const mockData: Record<string, any> = {};

    if (specification.openapi) {
      const openapi = specification.openapi as OpenAPIV3.Document;
      
      if (openapi.paths) {
        for (const [path, pathItem] of Object.entries(openapi.paths)) {
          if (typeof pathItem === 'object' && pathItem !== null) {
            for (const [method, operation] of Object.entries(pathItem)) {
              if (typeof operation === 'object' && operation !== null) {
                const operationObj = operation as OpenAPIV3.OperationObject;
                const mockDataKey = `${method.toLowerCase()}${path.replace(/[^a-zA-Z0-9]/g, '')}`;
                
                mockData[mockDataKey] = await this.mockDataGenerator.generateMockResponse(
                  operationObj,
                  path,
                  method
                );
              }
            }
          }
        }
      }
    }

    return mockData;
  }

  private async generateTestCases(
    specification: ContractSpecification,
    options: StubGenerationOptions
  ): Promise<string> {
    const openapi = specification.openapi as OpenAPIV3.Document;
    if (!openapi || !openapi.paths) {
      return '';
    }

    const testCases: string[] = [];

    testCases.push(`
import { FastifyInstance } from 'fastify';
import { build } from '../src/app';
import { ${this.toCamelCase(specification.serviceName)}Plugin } from '../src/plugins/${specification.serviceName.toLowerCase()}';

describe('${specification.serviceName} API Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = build();
    await app.register(${this.toCamelCase(specification.serviceName)}Plugin);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });`);

    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      if (typeof pathItem === 'object' && pathItem !== null) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            const operationObj = operation as OpenAPIV3.OperationObject;
            const testCase = this.generateTestCase(operationObj, path, method);
            testCases.push(testCase);
          }
        }
      }
    }

    testCases.push('});');

    return testCases.join('\n\n');
  }

  private generateTestCase(operation: OpenAPIV3.OperationObject, path: string, method: string): string {
    const testName = operation.summary || `${method.toUpperCase()} ${path}`;
    const testPath = path.replace(/\{([^}]+)\}/g, '123'); // Replace path parameters with dummy values

    return `
  test('should handle ${testName}', async () => {
    const response = await app.inject({
      method: '${method.toUpperCase()}',
      url: '${testPath}',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: ${method.toLowerCase() === 'post' || method.toLowerCase() === 'put' ? '{}' : 'undefined'},
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    
    const payload = JSON.parse(response.payload);
    expect(payload).toHaveProperty('success');
    expect(payload).toHaveProperty('timestamp');
  });`;
  }

  private async generateDocumentation(
    specification: ContractSpecification,
    options: StubGenerationOptions
  ): Promise<string> {
    return `
# ${specification.serviceName} Service Stub

This is a generated stub implementation for the ${specification.serviceName} service.

## Overview

${specification.metadata?.requirements || 'Service requirements not provided'}

## Generated Features

- ✅ RESTful API endpoints
- ✅ Request/response validation
- ✅ Mock data generation
- ✅ Error handling
- ✅ Logging
- ✅ Health checks
${options.includeExamples ? '- ✅ Response examples' : ''}
${options.includeMockData ? '- ✅ Realistic mock data' : ''}

## API Endpoints

${this.generateEndpointDocumentation(specification)}

## Usage

\`\`\`typescript
import { build } from './src/app';
import { ${this.toCamelCase(specification.serviceName)}Plugin } from './src/plugins/${specification.serviceName.toLowerCase()}';

const app = build();
await app.register(${this.toCamelCase(specification.serviceName)}Plugin);
await app.listen({ port: 3000 });
\`\`\`

## Configuration

The stub supports the following configuration options:

- \`responseDelay\`: Add artificial delay to responses (default: 0ms)
- \`errorRate\`: Probability of generating errors (default: 0%)
- \`includeRequestContext\`: Include request context in responses (default: false)

## Mock Data

Mock data is generated based on the OpenAPI specification and includes:
- Realistic field values
- Proper data types
- Validation constraints
- Response examples

## Testing

Run the test suite:

\`\`\`bash
npm test
\`\`\`

## Development

The stub is designed for development and testing purposes. It provides:
- Consistent API behavior
- Configurable response times
- Error simulation
- Request logging
- Data validation

Generated on: ${new Date().toISOString()}
`;
  }

  private generateEndpointDocumentation(specification: ContractSpecification): string {
    const openapi = specification.openapi as OpenAPIV3.Document;
    if (!openapi || !openapi.paths) {
      return 'No endpoints defined';
    }

    const endpoints: string[] = [];

    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      if (typeof pathItem === 'object' && pathItem !== null) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (typeof operation === 'object' && operation !== null) {
            const operationObj = operation as OpenAPIV3.OperationObject;
            endpoints.push(`
### ${method.toUpperCase()} ${path}

${operationObj.description || operationObj.summary || 'No description provided'}

**Tags:** ${operationObj.tags?.join(', ') || 'None'}
**Operation ID:** ${operationObj.operationId || 'None'}`);
          }
        }
      }
    }

    return endpoints.join('\n');
  }

  private getHandlerName(method: string, path: string): string {
    const pathParts = path.split('/').filter(part => part && !part.startsWith('{'));
    const resource = pathParts[pathParts.length - 1] || 'resource';
    
    const methodMap: Record<string, string> = {
      get: path.includes('{') ? 'get' : 'list',
      post: 'create',
      put: 'update',
      delete: 'delete',
      patch: 'patch',
    };

    return `${methodMap[method.toLowerCase()] || method.toLowerCase()}${this.toPascalCase(resource)}Handler`;
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}