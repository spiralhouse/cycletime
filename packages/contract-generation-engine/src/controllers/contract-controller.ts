import { FastifyRequest, FastifyReply } from 'fastify';
import { ContractGenerationService } from '../services/contract-generation-service';
import { 
  ContractGenerationRequestSchema, 
  ContractRefinementRequestSchema,
  SpecificationFormat 
} from '../types/contract-types';
import { logger } from '@cycletime/shared-utils';

export class ContractController {
  private contractService: ContractGenerationService;

  constructor(contractService: ContractGenerationService) {
    this.contractService = contractService;
  }

  async generateContract(
    request: FastifyRequest<{
      Body: unknown;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Validate request body
      const validationResult = ContractGenerationRequestSchema.safeParse(request.body);
      
      if (!validationResult.success) {
        reply.code(400).send({
          error: 'Invalid request',
          message: 'Request body validation failed',
          details: validationResult.error.issues,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const contractRequest = validationResult.data;
      
      logger.info('Contract generation request received', {
        serviceName: contractRequest.serviceName,
        serviceType: contractRequest.serviceType,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      // Generate contract
      const response = await this.contractService.generateContract(contractRequest);

      reply.code(202).send(response);
    } catch (error) {
      logger.error('Contract generation failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async getContractStatus(
    request: FastifyRequest<{
      Params: { contractId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { contractId } = request.params;
      
      if (!contractId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const status = await this.contractService.getContractStatus(contractId);
      
      reply.code(200).send(status);
    } catch (error) {
      logger.error('Failed to get contract status' + ": " + error.message);
      
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else {
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  }

  async getContractSpecification(
    request: FastifyRequest<{
      Params: { contractId: string };
      Querystring: { format?: SpecificationFormat };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { contractId } = request.params;
      const { format } = request.query;
      
      if (!contractId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const specification = await this.contractService.getContractSpecification(contractId, format);
      
      // Set appropriate content type based on format
      const acceptHeader = request.headers.accept;
      if (acceptHeader && acceptHeader.includes('application/x-yaml')) {
        reply.type('application/x-yaml');
        
        // Convert to YAML format
        const yaml = require('js-yaml');
        const yamlContent = yaml.dump(specification);
        reply.send(yamlContent);
      } else {
        reply.code(200).send(specification);
      }
    } catch (error) {
      logger.error('Failed to get contract specification: ' + error.message);
      
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else if (error instanceof Error && error.message.includes('not completed')) {
        reply.code(409).send({
          error: 'Conflict',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else {
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  }

  async validateContract(
    request: FastifyRequest<{
      Params: { contractId: string };
      Body: unknown;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { contractId } = request.params;
      const validationOptions = request.body;
      
      if (!contractId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const validationResult = await this.contractService.validateContract(contractId, validationOptions);
      
      reply.code(200).send(validationResult);
    } catch (error) {
      logger.error('Contract validation failed: ' + error.message);
      
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else {
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  }

  async refineContract(
    request: FastifyRequest<{
      Params: { contractId: string };
      Body: unknown;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { contractId } = request.params;
      
      if (!contractId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate request body
      const validationResult = ContractRefinementRequestSchema.safeParse(request.body);
      
      if (!validationResult.success) {
        reply.code(400).send({
          error: 'Invalid request',
          message: 'Request body validation failed',
          details: validationResult.error.issues,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const refinementRequest = validationResult.data;
      
      logger.info('Contract refinement request received', {
        contractId,
        refinementCount: refinementRequest.refinements.length,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      const refinementResult = await this.contractService.refineContract(contractId, refinementRequest);
      
      reply.code(200).send(refinementResult);
    } catch (error) {
      logger.error('Contract refinement failed: ' + error.message);
      
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else if (error instanceof Error && error.message.includes('not completed')) {
        reply.code(409).send({
          error: 'Conflict',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else {
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  }

  async deleteContract(
    request: FastifyRequest<{
      Params: { contractId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { contractId } = request.params;
      
      if (!contractId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      await this.contractService.deleteContract(contractId);
      
      reply.code(204).send();
    } catch (error) {
      logger.error('Failed to delete contract: ' + error.message);
      
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else {
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  }

  async listContracts(
    request: FastifyRequest<{
      Querystring: {
        serviceName?: string;
        serviceType?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { serviceName, serviceType, status, limit, offset } = request.query;
      
      const options = {
        serviceName,
        serviceType,
        status: status as any,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      };

      const result = await this.contractService.listContracts(options);
      
      reply.code(200).send({
        contracts: result.contracts,
        total: result.total,
        limit: options.limit || 50,
        offset: options.offset || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to list contracts' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async generateStub(
    request: FastifyRequest<{
      Params: { contractId: string };
      Body: unknown;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { contractId } = request.params;
      const stubOptions = request.body as any;
      
      if (!contractId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Get contract specification
      const specification = await this.contractService.getContractSpecification(contractId);
      
      // Import stub generation service
      const { StubGenerationService } = await import('../services/stub-generation-service');
      const stubService = new StubGenerationService();
      
      // Generate stub
      const stub = await stubService.generateStub(specification, stubOptions);
      
      reply.code(200).send({
        contractId,
        serviceName: specification.serviceName,
        stub,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Stub generation failed: ' + error.message);
      
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else if (error instanceof Error && error.message.includes('not completed')) {
        reply.code(409).send({
          error: 'Conflict',
          message: error.message,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      } else {
        reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  }

  // Register all routes
  async registerRoutes(fastify: any): Promise<void> {
    // Generate contract
    fastify.post('/api/v1/contracts/generate', {
      schema: {
        description: 'Generate API contract',
        tags: ['Contract Generation'],
        body: {
          type: 'object',
          properties: {
            serviceName: { type: 'string' },
            serviceType: { type: 'string', enum: ['rest-api', 'event-driven', 'hybrid', 'cli', 'web-ui'] },
            requirements: { type: 'string' },
            architecture: { type: 'string' },
            dependencies: { type: 'array', items: { type: 'string' } },
            endpoints: { type: 'array' },
            events: { type: 'array' },
            options: { type: 'object' },
          },
          required: ['serviceName', 'serviceType', 'requirements'],
        },
        response: {
          202: {
            description: 'Contract generation started',
            type: 'object',
            properties: {
              contractId: { type: 'string' },
              status: { type: 'string' },
              estimatedCompletion: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    }, this.generateContract.bind(this));

    // Get contract status
    fastify.get('/api/v1/contracts/:contractId/status', {
      schema: {
        description: 'Get contract generation status',
        tags: ['Contract Generation'],
        params: {
          type: 'object',
          properties: {
            contractId: { type: 'string' },
          },
          required: ['contractId'],
        },
      },
    }, this.getContractStatus.bind(this));

    // Get contract specification
    fastify.get('/api/v1/contracts/:contractId/specification', {
      schema: {
        description: 'Get generated contract specification',
        tags: ['Contract Generation'],
        params: {
          type: 'object',
          properties: {
            contractId: { type: 'string' },
          },
          required: ['contractId'],
        },
        querystring: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['openapi', 'asyncapi', 'combined'] },
          },
        },
      },
    }, this.getContractSpecification.bind(this));

    // Validate contract
    fastify.post('/api/v1/contracts/:contractId/validate', {
      schema: {
        description: 'Validate contract specification',
        tags: ['Contract Validation'],
        params: {
          type: 'object',
          properties: {
            contractId: { type: 'string' },
          },
          required: ['contractId'],
        },
        body: {
          type: 'object',
          properties: {
            strict: { type: 'boolean' },
            rules: { type: 'array', items: { type: 'string' } },
            skipRules: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    }, this.validateContract.bind(this));

    // Refine contract
    fastify.put('/api/v1/contracts/:contractId/refine', {
      schema: {
        description: 'Refine contract specification',
        tags: ['Contract Refinement'],
        params: {
          type: 'object',
          properties: {
            contractId: { type: 'string' },
          },
          required: ['contractId'],
        },
        body: {
          type: 'object',
          properties: {
            refinements: { type: 'array' },
            options: { type: 'object' },
          },
          required: ['refinements'],
        },
      },
    }, this.refineContract.bind(this));

    // Delete contract
    fastify.delete('/api/v1/contracts/:contractId', {
      schema: {
        description: 'Delete contract',
        tags: ['Contract Management'],
        params: {
          type: 'object',
          properties: {
            contractId: { type: 'string' },
          },
          required: ['contractId'],
        },
      },
    }, this.deleteContract.bind(this));

    // List contracts
    fastify.get('/api/v1/contracts', {
      schema: {
        description: 'List contracts',
        tags: ['Contract Management'],
        querystring: {
          type: 'object',
          properties: {
            serviceName: { type: 'string' },
            serviceType: { type: 'string' },
            status: { type: 'string' },
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
      },
    }, this.listContracts.bind(this));

    // Generate stub
    fastify.post('/api/v1/contracts/:contractId/generate-stub', {
      schema: {
        description: 'Generate service stub',
        tags: ['Stub Generation'],
        params: {
          type: 'object',
          properties: {
            contractId: { type: 'string' },
          },
          required: ['contractId'],
        },
        body: {
          type: 'object',
          properties: {
            includeExamples: { type: 'boolean' },
            includeMockData: { type: 'boolean' },
            includeValidation: { type: 'boolean' },
            responseDelay: { type: 'number' },
            errorRate: { type: 'number' },
            includeHealthCheck: { type: 'boolean' },
          },
        },
      },
    }, this.generateStub.bind(this));
  }
}