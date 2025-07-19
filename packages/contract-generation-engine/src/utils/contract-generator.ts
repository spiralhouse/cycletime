import { OpenAPIV3 } from 'openapi-types';
import * as yaml from 'js-yaml';
import { 
  ContractGenerationRequest, 
  ContractSpecification, 
  GenerationStage,
  CONTRACT_GENERATION_STAGES,
  ContractGenerationStage
} from '../types/contract-types';
import { SystemBoundaries } from '../types/service-types';
import { logger } from '@cycletime/shared-utils';

export class ContractGenerator {
  private request: ContractGenerationRequest;
  private stages: Map<ContractGenerationStage, GenerationStage>;

  constructor(request: ContractGenerationRequest) {
    this.request = request;
    this.stages = new Map();
    
    // Initialize stages
    CONTRACT_GENERATION_STAGES.forEach(stage => {
      this.stages.set(stage, {
        name: stage,
        status: 'pending',
      });
    });
  }

  async generateContract(): Promise<ContractSpecification> {
    const contractId = this.generateContractId();
    
    try {
      // Update stage status
      this.updateStageStatus('requirements-analysis', 'processing');
      
      // Generate OpenAPI specification
      const openapi = await this.generateOpenAPISpec();
      this.updateStageStatus('openapi-generation', 'completed');
      
      // Generate AsyncAPI specification if needed
      let asyncapi;
      if (this.request.events && this.request.events.length > 0) {
        asyncapi = await this.generateAsyncAPISpec();
        this.updateStageStatus('asyncapi-generation', 'completed');
      }
      
      // Generate system boundaries
      const boundaries = await this.generateSystemBoundaries();
      this.updateStageStatus('boundary-analysis', 'completed');
      
      // Generate metadata
      const metadata = this.generateMetadata();
      
      this.updateStageStatus('finalization', 'completed');
      
      return {
        contractId,
        serviceName: this.request.serviceName,
        openapi,
        asyncapi,
        boundaries,
        metadata,
      };
    } catch (error) {
      logger.error('Contract generation failed', { error, request: this.request });
      throw error;
    }
  }

  private generateContractId(): string {
    return `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStageStatus(stage: ContractGenerationStage, status: 'pending' | 'processing' | 'completed' | 'failed') {
    const currentStage = this.stages.get(stage);
    if (currentStage) {
      currentStage.status = status;
      if (status === 'processing') {
        currentStage.startedAt = new Date().toISOString();
      } else if (status === 'completed' || status === 'failed') {
        currentStage.completedAt = new Date().toISOString();
      }
    }
  }

  private async generateOpenAPISpec(): Promise<OpenAPIV3.Document> {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.3',
      info: {
        title: `${this.request.serviceName} API`,
        description: this.request.requirements,
        version: '1.0.0',
        contact: {
          name: 'CycleTime Team',
          email: 'team@cycletime.dev',
        },
        license: {
          name: 'MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:8080`,
          description: 'Development server',
        },
        {
          url: `https://api.cycletime.dev/${this.request.serviceName.toLowerCase()}`,
          description: 'Production server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
      ],
    };

    // Add health check endpoint
    spec.paths['/health'] = {
      get: {
        summary: 'Health check',
        description: 'Check if the service is healthy and operational',
        operationId: 'healthCheck',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'degraded', 'unhealthy'],
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                    },
                    version: {
                      type: 'string',
                    },
                  },
                  required: ['status', 'timestamp', 'version'],
                },
              },
            },
          },
        },
      },
    };

    // Add custom endpoints
    if (this.request.endpoints) {
      for (const endpoint of this.request.endpoints) {
        const pathItem = spec.paths[endpoint.path] || {};
        const method = endpoint.method.toLowerCase() as keyof OpenAPIV3.PathItemObject;
        
        pathItem[method] = {
          summary: endpoint.description,
          description: endpoint.description,
          operationId: this.generateOperationId(endpoint.method, endpoint.path),
          tags: [this.request.serviceName],
          parameters: endpoint.parameters?.map(param => ({
            name: param.name,
            in: param.in as 'query' | 'header' | 'path' | 'cookie',
            description: param.description,
            required: param.required,
            schema: param.schema as OpenAPIV3.SchemaObject,
          })),
          requestBody: endpoint.requestSchema ? {
            required: true,
            content: {
              'application/json': {
                schema: endpoint.requestSchema as OpenAPIV3.SchemaObject,
              },
            },
          } : undefined,
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: endpoint.responseSchema as OpenAPIV3.SchemaObject || {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'object' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
            '500': {
              description: 'Internal Server Error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse',
                  },
                },
              },
            },
          },
        };
        
        spec.paths[endpoint.path] = pathItem;
      }
    }

    // Add error response schema
    if (spec.components?.schemas) {
      spec.components.schemas.ErrorResponse = {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string' },
        },
        required: ['error', 'message', 'timestamp'],
      };
    }

    return spec;
  }

  private async generateAsyncAPISpec(): Promise<any> {
    const spec = {
      asyncapi: '2.6.0',
      info: {
        title: `${this.request.serviceName} Events`,
        version: '1.0.0',
        description: `Event-driven communication for ${this.request.serviceName}`,
      },
      servers: {
        development: {
          url: 'localhost:6379',
          protocol: 'redis',
          description: 'Development Redis server',
        },
        production: {
          url: 'redis.cycletime.dev:6379',
          protocol: 'redis',
          description: 'Production Redis server',
        },
      },
      defaultContentType: 'application/json',
      channels: {} as any,
      components: {
        messages: {} as any,
        schemas: {} as any,
      },
    };

    // Add event channels
    if (this.request.events) {
      for (const event of this.request.events) {
        const channelName = event.name.replace(/\./g, '/');
        
        spec.channels[channelName] = {
          description: event.description,
          [event.type === 'published' ? 'publish' : 'subscribe']: {
            operationId: `${event.type === 'published' ? 'publish' : 'handle'}${this.toPascalCase(event.name)}`,
            message: {
              $ref: `#/components/messages/${this.toPascalCase(event.name)}`,
            },
          },
        };

        // Add message definition
        spec.components.messages[this.toPascalCase(event.name)] = {
          name: event.name,
          title: this.toTitleCase(event.name),
          summary: event.description,
          contentType: 'application/json',
          payload: event.schema || {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              timestamp: { type: 'string', format: 'date-time' },
              source: { type: 'string' },
              data: { type: 'object' },
            },
            required: ['id', 'timestamp', 'source'],
          },
        };
      }
    }

    return spec;
  }

  private async generateSystemBoundaries(): Promise<SystemBoundaries> {
    const boundaries: SystemBoundaries = {
      service: this.request.serviceName,
      dependencies: [],
      provides: [],
      integrations: [],
    };

    // Add dependencies
    if (this.request.dependencies) {
      boundaries.dependencies = this.request.dependencies.map(dep => ({
        service: dep,
        type: 'synchronous',
        required: true,
      }));
    }

    // Add capabilities based on endpoints
    if (this.request.endpoints) {
      boundaries.provides = this.request.endpoints.map(endpoint => ({
        name: endpoint.description,
        description: endpoint.description,
        endpoints: [`${endpoint.method} ${endpoint.path}`],
      }));
    }

    // Add event capabilities
    if (this.request.events) {
      const eventCapabilities = this.request.events
        .filter(event => event.type === 'published')
        .map(event => ({
          name: event.name,
          description: event.description,
          events: [event.name],
        }));
      
      boundaries.provides.push(...eventCapabilities);
    }

    return boundaries;
  }

  private generateMetadata() {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      generatedBy: 'Contract Generation Engine',
      requirements: this.request.requirements,
      architecture: this.request.architecture,
      tags: [this.request.serviceType, 'generated'],
    };
  }

  private generateOperationId(method: string, path: string): string {
    const pathParts = path.split('/').filter(part => part && !part.startsWith('{'));
    const resource = pathParts[pathParts.length - 1] || 'resource';
    
    const methodMap: Record<string, string> = {
      GET: path.includes('{') ? 'get' : 'list',
      POST: 'create',
      PUT: 'update',
      DELETE: 'delete',
      PATCH: 'patch',
    };

    return `${methodMap[method] || method.toLowerCase()}${this.toPascalCase(resource)}`;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toTitleCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  getStages(): GenerationStage[] {
    return Array.from(this.stages.values());
  }

  async exportToYAML(specification: any): Promise<string> {
    return yaml.dump(specification, { indent: 2 });
  }

  async exportToJSON(specification: any): Promise<string> {
    return JSON.stringify(specification, null, 2);
  }
}