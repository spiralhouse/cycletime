import { FastifyRequest, FastifyReply } from 'fastify';
import { StubGenerationService } from '../services/stub-generation-service';
import { ContractSpecificationSchema } from '../types/contract-types';
import { logger } from '@cycletime/shared-utils';

export class StubController {
  private stubService: StubGenerationService;

  constructor(stubService: StubGenerationService) {
    this.stubService = stubService;
  }

  async generateStub(
    request: FastifyRequest<{
      Body: {
        specification: any;
        options?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { specification, options } = request.body;
      
      if (!specification) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract specification is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate specification
      const specResult = ContractSpecificationSchema.safeParse(specification);
      if (!specResult.success) {
        reply.code(400).send({
          error: 'Invalid specification',
          message: 'Contract specification validation failed',
          details: specResult.error.issues,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      logger.info('Stub generation request received', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        options,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      const stub = await this.stubService.generateStub(specification, options);
      
      reply.code(200).send({
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        stub,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Stub generation failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async generateCustomizedStub(
    request: FastifyRequest<{
      Body: {
        specification: any;
        customization: any;
        options?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { specification, customization, options } = request.body;
      
      if (!specification) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract specification is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      if (!customization) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Customization options are required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate specification
      const specResult = ContractSpecificationSchema.safeParse(specification);
      if (!specResult.success) {
        reply.code(400).send({
          error: 'Invalid specification',
          message: 'Contract specification validation failed',
          details: specResult.error.issues,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      logger.info('Customized stub generation request received', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        customization: Object.keys(customization),
        options,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      const stub = await this.stubService.generateStubWithCustomization(
        specification,
        customization,
        options
      );
      
      reply.code(200).send({
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        stub,
        customization: Object.keys(customization),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Customized stub generation failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async generateStubBundle(
    request: FastifyRequest<{
      Body: {
        specifications: any[];
        bundleOptions?: any;
        stubOptions?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { specifications, bundleOptions, stubOptions } = request.body;
      
      if (!specifications || !Array.isArray(specifications) || specifications.length === 0) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Specifications array is required and must not be empty',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate all specifications
      for (const spec of specifications) {
        const specResult = ContractSpecificationSchema.safeParse(spec);
        if (!specResult.success) {
          reply.code(400).send({
            error: 'Invalid specification',
            message: `Contract specification validation failed for ${spec.serviceName || 'unknown service'}`,
            details: specResult.error.issues,
            timestamp: new Date().toISOString(),
            path: request.url,
          });
          return;
        }
      }

      logger.info('Stub bundle generation request received', {
        serviceCount: specifications.length,
        services: specifications.map(s => s.serviceName),
        bundleOptions,
        stubOptions,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      const result = await this.stubService.generateStubBundle(
        specifications,
        bundleOptions,
        stubOptions
      );
      
      reply.code(200).send({
        serviceCount: specifications.length,
        services: specifications.map(s => s.serviceName),
        stubs: Object.fromEntries(result.stubs),
        bundle: result.bundle,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Stub bundle generation failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async generateStubTests(
    request: FastifyRequest<{
      Body: {
        specification: any;
        testOptions?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { specification, testOptions } = request.body;
      
      if (!specification) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract specification is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate specification
      const specResult = ContractSpecificationSchema.safeParse(specification);
      if (!specResult.success) {
        reply.code(400).send({
          error: 'Invalid specification',
          message: 'Contract specification validation failed',
          details: specResult.error.issues,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      logger.info('Stub test generation request received', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        testOptions,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      const tests = await this.stubService.generateStubTests(specification, testOptions);
      
      reply.code(200).send({
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        tests,
        testTypes: Object.keys(tests),
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Stub test generation failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async generateStubDocumentation(
    request: FastifyRequest<{
      Body: {
        specification: any;
        documentationOptions?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { specification, documentationOptions } = request.body;
      
      if (!specification) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract specification is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate specification
      const specResult = ContractSpecificationSchema.safeParse(specification);
      if (!specResult.success) {
        reply.code(400).send({
          error: 'Invalid specification',
          message: 'Contract specification validation failed',
          details: specResult.error.issues,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      logger.info('Stub documentation generation request received', {
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        documentationOptions,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      const documentation = await this.stubService.generateStubDocumentation(
        specification,
        documentationOptions
      );
      
      // Set appropriate content type based on format
      const format = documentationOptions?.format || 'markdown';
      if (format === 'html') {
        reply.type('text/html');
      } else if (format === 'markdown') {
        reply.type('text/markdown');
      } else if (format === 'pdf') {
        reply.type('application/pdf');
      } else {
        reply.type('application/json');
      }
      
      reply.code(200).send({
        contractId: specification.contractId,
        serviceName: specification.serviceName,
        documentation,
        format,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Stub documentation generation failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async cancelStubGeneration(
    request: FastifyRequest<{
      Params: { generationId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { generationId } = request.params;
      
      if (!generationId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Generation ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      await this.stubService.cancelStubGeneration(generationId);
      
      reply.code(200).send({
        message: 'Stub generation cancelled successfully',
        generationId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to cancel stub generation: ' + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  // Register all routes
  async registerRoutes(fastify: any): Promise<void> {
    // Generate stub
    fastify.post('/api/v1/stubs/generate', {
      schema: {
        description: 'Generate service stub',
        tags: ['Stub Generation'],
        body: {
          type: 'object',
          properties: {
            specification: { type: 'object' },
            options: {
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
          required: ['specification'],
        },
      },
    }, this.generateStub.bind(this));

    // Generate customized stub
    fastify.post('/api/v1/stubs/generate-customized', {
      schema: {
        description: 'Generate customized service stub',
        tags: ['Stub Generation'],
        body: {
          type: 'object',
          properties: {
            specification: { type: 'object' },
            customization: {
              type: 'object',
              properties: {
                responseTemplates: { type: 'object' },
                errorScenarios: { type: 'array' },
                dataGenerators: { type: 'object' },
                middleware: { type: 'array', items: { type: 'string' } },
              },
            },
            options: { type: 'object' },
          },
          required: ['specification', 'customization'],
        },
      },
    }, this.generateCustomizedStub.bind(this));

    // Generate stub bundle
    fastify.post('/api/v1/stubs/generate-bundle', {
      schema: {
        description: 'Generate bundle of service stubs',
        tags: ['Stub Generation'],
        body: {
          type: 'object',
          properties: {
            specifications: { type: 'array', items: { type: 'object' } },
            bundleOptions: {
              type: 'object',
              properties: {
                includeDockerCompose: { type: 'boolean' },
                includeKubernetesManifests: { type: 'boolean' },
                includeGatewayConfig: { type: 'boolean' },
                includeMonitoring: { type: 'boolean' },
              },
            },
            stubOptions: { type: 'object' },
          },
          required: ['specifications'],
        },
      },
    }, this.generateStubBundle.bind(this));

    // Generate stub tests
    fastify.post('/api/v1/stubs/generate-tests', {
      schema: {
        description: 'Generate tests for service stub',
        tags: ['Stub Generation'],
        body: {
          type: 'object',
          properties: {
            specification: { type: 'object' },
            testOptions: {
              type: 'object',
              properties: {
                includeUnitTests: { type: 'boolean' },
                includeIntegrationTests: { type: 'boolean' },
                includeContractTests: { type: 'boolean' },
                includePerformanceTests: { type: 'boolean' },
                testFramework: { type: 'string', enum: ['jest', 'mocha', 'vitest'] },
              },
            },
          },
          required: ['specification'],
        },
      },
    }, this.generateStubTests.bind(this));

    // Generate stub documentation
    fastify.post('/api/v1/stubs/generate-documentation', {
      schema: {
        description: 'Generate documentation for service stub',
        tags: ['Stub Generation'],
        body: {
          type: 'object',
          properties: {
            specification: { type: 'object' },
            documentationOptions: {
              type: 'object',
              properties: {
                includeApiDocs: { type: 'boolean' },
                includeSetupGuide: { type: 'boolean' },
                includeUsageExamples: { type: 'boolean' },
                includeContractValidation: { type: 'boolean' },
                format: { type: 'string', enum: ['markdown', 'html', 'pdf'] },
              },
            },
          },
          required: ['specification'],
        },
      },
    }, this.generateStubDocumentation.bind(this));

    // Cancel stub generation
    fastify.delete('/api/v1/stubs/generation/:generationId', {
      schema: {
        description: 'Cancel stub generation',
        tags: ['Stub Generation'],
        params: {
          type: 'object',
          properties: {
            generationId: { type: 'string' },
          },
          required: ['generationId'],
        },
      },
    }, this.cancelStubGeneration.bind(this));
  }
}