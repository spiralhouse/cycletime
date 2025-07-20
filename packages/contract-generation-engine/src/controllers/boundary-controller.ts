import { FastifyRequest, FastifyReply } from 'fastify';
import { BoundaryAnalysisService } from '../services/boundary-analysis-service';
import { BoundaryAnalysisRequestSchema } from '../types/boundary-types';
import { logger } from '@cycletime/shared-utils';

export class BoundaryController {
  private boundaryService: BoundaryAnalysisService;

  constructor(boundaryService: BoundaryAnalysisService) {
    this.boundaryService = boundaryService;
  }

  async analyzeSystemBoundaries(
    request: FastifyRequest<{
      Body: unknown;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // Validate request body
      const validationResult = BoundaryAnalysisRequestSchema.safeParse(request.body);
      
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

      const analysisRequest = validationResult.data;
      
      logger.info('System boundary analysis request received', {
        services: analysisRequest.services,
        options: analysisRequest.options,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      const result = await this.boundaryService.analyzeSystemBoundaries(analysisRequest);
      
      reply.code(200).send(result);
    } catch (error) {
      logger.error('System boundary analysis failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async analyzeServiceDependencies(
    request: FastifyRequest<{
      Params: { serviceName: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { serviceName } = request.params;
      
      if (!serviceName) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Service name is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const result = await this.boundaryService.analyzeServiceDependencies(serviceName);
      
      reply.code(200).send(result);
    } catch (error) {
      logger.error('Service dependency analysis failed: ' + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async analyzeDataFlow(
    request: FastifyRequest<{
      Body: {
        services: string[];
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { services } = request.body;
      
      if (!services || !Array.isArray(services) || services.length === 0) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Services array is required and must not be empty',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const result = await this.boundaryService.analyzeDataFlow(services);
      
      reply.code(200).send(result);
    } catch (error) {
      logger.error('Data flow analysis failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async analyzePerformanceRequirements(
    request: FastifyRequest<{
      Body: {
        services: string[];
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { services } = request.body;
      
      if (!services || !Array.isArray(services) || services.length === 0) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Services array is required and must not be empty',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const result = await this.boundaryService.analyzePerformanceRequirements(services);
      
      reply.code(200).send(result);
    } catch (error) {
      logger.error('Performance requirements analysis failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async generateArchitecturalRecommendations(
    request: FastifyRequest<{
      Body: {
        services: string[];
        currentArchitecture?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { services, currentArchitecture } = request.body;
      
      if (!services || !Array.isArray(services) || services.length === 0) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Services array is required and must not be empty',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const result = await this.boundaryService.generateArchitecturalRecommendations(
        services,
        currentArchitecture
      );
      
      reply.code(200).send(result);
    } catch (error) {
      logger.error('Architectural recommendations generation failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async validateServiceBoundaries(
    request: FastifyRequest<{
      Body: {
        services: string[];
        proposedBoundaries: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { services, proposedBoundaries } = request.body;
      
      if (!services || !Array.isArray(services) || services.length === 0) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Services array is required and must not be empty',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      if (!proposedBoundaries || typeof proposedBoundaries !== 'object') {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Proposed boundaries object is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const result = await this.boundaryService.validateServiceBoundaries(
        services,
        proposedBoundaries
      );
      
      reply.code(200).send(result);
    } catch (error) {
      logger.error('Service boundary validation failed' + ": " + error.message);
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async cancelAnalysis(
    request: FastifyRequest<{
      Params: { analysisId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { analysisId } = request.params;
      
      if (!analysisId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Analysis ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      await this.boundaryService.cancelAnalysis(analysisId);
      
      reply.code(200).send({
        message: 'Analysis cancelled successfully',
        analysisId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to cancel analysis' + ": " + error.message);
      
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
    // Analyze system boundaries
    fastify.post('/api/v1/boundaries/analyze', {
      schema: {
        description: 'Analyze system boundaries',
        tags: ['System Boundaries'],
        body: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'string' } },
            architecture: { type: 'string' },
            requirements: { type: 'string' },
            options: {
              type: 'object',
              properties: {
                includeDataFlow: { type: 'boolean' },
                includeSecurityBoundaries: { type: 'boolean' },
                includePerformanceRequirements: { type: 'boolean' },
              },
            },
          },
          required: ['services'],
        },
      },
    }, this.analyzeSystemBoundaries.bind(this));

    // Analyze service dependencies
    fastify.get('/api/v1/boundaries/services/:serviceName/dependencies', {
      schema: {
        description: 'Analyze service dependencies',
        tags: ['System Boundaries'],
        params: {
          type: 'object',
          properties: {
            serviceName: { type: 'string' },
          },
          required: ['serviceName'],
        },
      },
    }, this.analyzeServiceDependencies.bind(this));

    // Analyze data flow
    fastify.post('/api/v1/boundaries/dataflow', {
      schema: {
        description: 'Analyze data flow between services',
        tags: ['System Boundaries'],
        body: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'string' } },
          },
          required: ['services'],
        },
      },
    }, this.analyzeDataFlow.bind(this));

    // Analyze performance requirements
    fastify.post('/api/v1/boundaries/performance', {
      schema: {
        description: 'Analyze performance requirements',
        tags: ['System Boundaries'],
        body: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'string' } },
          },
          required: ['services'],
        },
      },
    }, this.analyzePerformanceRequirements.bind(this));

    // Generate architectural recommendations
    fastify.post('/api/v1/boundaries/recommendations', {
      schema: {
        description: 'Generate architectural recommendations',
        tags: ['System Boundaries'],
        body: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'string' } },
            currentArchitecture: { type: 'string' },
          },
          required: ['services'],
        },
      },
    }, this.generateArchitecturalRecommendations.bind(this));

    // Validate service boundaries
    fastify.post('/api/v1/boundaries/validate', {
      schema: {
        description: 'Validate service boundaries',
        tags: ['System Boundaries'],
        body: {
          type: 'object',
          properties: {
            services: { type: 'array', items: { type: 'string' } },
            proposedBoundaries: { type: 'object' },
          },
          required: ['services', 'proposedBoundaries'],
        },
      },
    }, this.validateServiceBoundaries.bind(this));

    // Cancel analysis
    fastify.delete('/api/v1/boundaries/analysis/:analysisId', {
      schema: {
        description: 'Cancel boundary analysis',
        tags: ['System Boundaries'],
        params: {
          type: 'object',
          properties: {
            analysisId: { type: 'string' },
          },
          required: ['analysisId'],
        },
      },
    }, this.cancelAnalysis.bind(this));
  }
}