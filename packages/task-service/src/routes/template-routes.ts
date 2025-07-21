import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { 
  TaskTemplate,
  CreateTaskTemplateRequest,
  UpdateTaskTemplateRequest,
  ApplyTaskTemplateRequest,
  TaskTemplateListResponse,
  ApplyTaskTemplateResponse
} from '../types/service-types';
import { getCurrentUserId } from '../middleware/auth-middleware';
import { measureAsyncDuration } from '../middleware/request-logger';
import { logger } from '@cycletime/shared-utils';

export async function templateRoutes(fastify: FastifyInstance): Promise<void> {
  // Get task templates with filtering and pagination
  fastify.get('/templates', {
    schema: {
      description: 'Get task templates with optional filtering and pagination',
      tags: ['Templates'],
      querystring: Type.Object({
        category: Type.Optional(Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] })),
        search: Type.Optional(Type.String()),
        tags: Type.Optional(Type.String()),
        page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
        sortBy: Type.Optional(Type.String({ enum: ['name', 'category', 'createdAt', 'updatedAt', 'usage'], default: 'updatedAt' })),
        sortOrder: Type.Optional(Type.String({ enum: ['asc', 'desc'], default: 'desc' })),
        includeUsage: Type.Optional(Type.Boolean({ default: true }))
      }),
      response: {
        200: Type.Object({
          templates: Type.Array(Type.Any()),
          pagination: Type.Object({
            page: Type.Number(),
            limit: Type.Number(),
            total: Type.Number(),
            totalPages: Type.Number(),
            hasNext: Type.Boolean(),
            hasPrevious: Type.Boolean()
          }),
          facets: Type.Object({
            categories: Type.Array(Type.Object({
              value: Type.String(),
              count: Type.Number()
            })),
            tags: Type.Array(Type.Object({
              value: Type.String(),
              count: Type.Number()
            })),
            usage: Type.Object({
              totalTemplates: Type.Number(),
              activeTemplates: Type.Number(),
              averageUsage: Type.Number()
            })
          })
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ 
    Querystring: { 
      category?: string; 
      search?: string; 
      tags?: string; 
      page?: number; 
      limit?: number; 
      sortBy?: string; 
      sortOrder?: string;
      includeUsage?: boolean;
    } 
  }>, reply: FastifyReply) => {
    const { result, duration } = await measureAsyncDuration(async () => {
      return await fastify.mockDataService.getTemplates(request.query);
    });

    fastify.logPerformance(request, 'getTemplates', duration, { 
      templatesCount: result.templates.length,
      total: result.pagination.total
    });

    return reply.code(200).send(result);
  });

  // Create new task template
  fastify.post('/templates', {
    schema: {
      description: 'Create a new task template',
      tags: ['Templates'],
      body: Type.Object({
        name: Type.String({ minLength: 1, maxLength: 255 }),
        description: Type.String({ minLength: 1, maxLength: 1000 }),
        category: Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] }),
        tags: Type.Optional(Type.Array(Type.String(), { default: [] })),
        template: Type.Object({
          title: Type.String({ minLength: 1, maxLength: 255 }),
          description: Type.String({ minLength: 1, maxLength: 2000 }),
          type: Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] }),
          priority: Type.String({ enum: ['low', 'medium', 'high', 'urgent'] }),
          estimatedHours: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
          acceptanceCriteria: Type.Optional(Type.Array(Type.String(), { default: [] })),
          subtasks: Type.Optional(Type.Array(Type.Object({
            title: Type.String({ minLength: 1, maxLength: 255 }),
            description: Type.String({ minLength: 1, maxLength: 1000 }),
            type: Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] }),
            priority: Type.String({ enum: ['low', 'medium', 'high', 'urgent'] }),
            estimatedHours: Type.Optional(Type.Number({ minimum: 0, default: 0 }))
          }), { default: [] })),
          dependencies: Type.Optional(Type.Array(Type.Object({
            type: Type.String({ enum: ['blocks', 'depends_on', 'external'] }),
            description: Type.String({ minLength: 1, maxLength: 500 })
          }), { default: [] })),
          metadata: Type.Optional(Type.Record(Type.String(), Type.Any(), { default: {} }))
        }),
        variables: Type.Optional(Type.Array(Type.Object({
          name: Type.String({ minLength: 1, maxLength: 100 }),
          type: Type.String({ enum: ['string', 'number', 'boolean', 'date', 'array', 'object'] }),
          required: Type.Boolean({ default: false }),
          defaultValue: Type.Optional(Type.Any()),
          description: Type.Optional(Type.String({ maxLength: 500 })),
          validation: Type.Optional(Type.Object({
            pattern: Type.Optional(Type.String()),
            min: Type.Optional(Type.Number()),
            max: Type.Optional(Type.Number()),
            options: Type.Optional(Type.Array(Type.Any()))
          }))
        }), { default: [] }))
      }),
      response: {
        201: Type.Object({
          template: Type.Any()
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        409: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateTaskTemplateRequest }>, reply: FastifyReply) => {
    const userId = getCurrentUserId(request);

    const { result: template, duration } = await measureAsyncDuration(async () => {
      return await fastify.mockDataService.createTemplate(request.body, userId);
    });

    fastify.logEvent(request, 'templateCreated', { templateId: template.id, name: template.name });
    fastify.logPerformance(request, 'createTemplate', duration, { templateId: template.id });

    return reply.code(201).send({ template });
  });

  // Get single template by ID
  fastify.get('/templates/:templateId', {
    schema: {
      description: 'Get task template details by ID',
      tags: ['Templates'],
      params: Type.Object({
        templateId: Type.String({ format: 'uuid' })
      }),
      querystring: Type.Object({
        includeUsage: Type.Optional(Type.Boolean({ default: true })),
        includeHistory: Type.Optional(Type.Boolean({ default: false }))
      }),
      response: {
        200: Type.Object({
          template: Type.Any()
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { templateId: string }; 
    Querystring: { includeUsage?: boolean; includeHistory?: boolean } 
  }>, reply: FastifyReply) => {
    const { templateId } = request.params;
    const { includeUsage, includeHistory } = request.query;

    const { result: template, duration } = await measureAsyncDuration(async () => {
      return await fastify.mockDataService.getTemplate(templateId, { includeUsage, includeHistory });
    });

    if (!template) {
      return reply.code(404).send({
        error: 'Template Not Found',
        message: `Template with ID ${templateId} not found`,
        code: 'TEMPLATE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logPerformance(request, 'getTemplate', duration, { templateId });

    return reply.code(200).send({ template });
  });

  // Update template
  fastify.put('/templates/:templateId', {
    schema: {
      description: 'Update task template details',
      tags: ['Templates'],
      params: Type.Object({
        templateId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
        description: Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
        category: Type.Optional(Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] })),
        tags: Type.Optional(Type.Array(Type.String())),
        template: Type.Optional(Type.Object({
          title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
          description: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
          type: Type.Optional(Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] })),
          priority: Type.Optional(Type.String({ enum: ['low', 'medium', 'high', 'urgent'] })),
          estimatedHours: Type.Optional(Type.Number({ minimum: 0 })),
          acceptanceCriteria: Type.Optional(Type.Array(Type.String())),
          subtasks: Type.Optional(Type.Array(Type.Object({
            title: Type.String({ minLength: 1, maxLength: 255 }),
            description: Type.String({ minLength: 1, maxLength: 1000 }),
            type: Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] }),
            priority: Type.String({ enum: ['low', 'medium', 'high', 'urgent'] }),
            estimatedHours: Type.Optional(Type.Number({ minimum: 0 }))
          }))),
          dependencies: Type.Optional(Type.Array(Type.Object({
            type: Type.String({ enum: ['blocks', 'depends_on', 'external'] }),
            description: Type.String({ minLength: 1, maxLength: 500 })
          }))),
          metadata: Type.Optional(Type.Record(Type.String(), Type.Any()))
        })),
        variables: Type.Optional(Type.Array(Type.Object({
          name: Type.String({ minLength: 1, maxLength: 100 }),
          type: Type.String({ enum: ['string', 'number', 'boolean', 'date', 'array', 'object'] }),
          required: Type.Boolean({ default: false }),
          defaultValue: Type.Optional(Type.Any()),
          description: Type.Optional(Type.String({ maxLength: 500 })),
          validation: Type.Optional(Type.Object({
            pattern: Type.Optional(Type.String()),
            min: Type.Optional(Type.Number()),
            max: Type.Optional(Type.Number()),
            options: Type.Optional(Type.Array(Type.Any()))
          }))
        }))),
        version: Type.Number({ minimum: 1 })
      }),
      response: {
        200: Type.Object({
          template: Type.Any()
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        409: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { templateId: string }; Body: UpdateTaskTemplateRequest }>, reply: FastifyReply) => {
    const { templateId } = request.params;
    const userId = getCurrentUserId(request);

    const { result: template, duration } = await measureAsyncDuration(async () => {
      return await fastify.mockDataService.updateTemplate(templateId, request.body, userId);
    });

    if (!template) {
      return reply.code(404).send({
        error: 'Template Not Found',
        message: `Template with ID ${templateId} not found`,
        code: 'TEMPLATE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'templateUpdated', { templateId, changes: Object.keys(request.body) });
    fastify.logPerformance(request, 'updateTemplate', duration, { templateId });

    return reply.code(200).send({ template });
  });

  // Delete template
  fastify.delete('/templates/:templateId', {
    schema: {
      description: 'Delete a task template',
      tags: ['Templates'],
      params: Type.Object({
        templateId: Type.String({ format: 'uuid' })
      }),
      response: {
        204: Type.Null(),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        409: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { templateId: string } }>, reply: FastifyReply) => {
    const { templateId } = request.params;

    const { result: success, duration } = await measureAsyncDuration(async () => {
      return await fastify.mockDataService.deleteTemplate(templateId);
    });

    if (!success) {
      return reply.code(404).send({
        error: 'Template Not Found',
        message: `Template with ID ${templateId} not found`,
        code: 'TEMPLATE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'templateDeleted', { templateId });
    fastify.logPerformance(request, 'deleteTemplate', duration, { templateId });

    return reply.code(204).send();
  });

  // Apply template to create tasks
  fastify.post('/templates/:templateId/apply', {
    schema: {
      description: 'Apply a task template to create new tasks',
      tags: ['Templates'],
      params: Type.Object({
        templateId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        variables: Type.Optional(Type.Record(Type.String(), Type.Any(), { default: {} })),
        projectId: Type.Optional(Type.String({ format: 'uuid' })),
        assigneeId: Type.Optional(Type.String({ format: 'uuid' })),
        parentTaskId: Type.Optional(Type.String({ format: 'uuid' })),
        options: Type.Optional(Type.Object({
          createSubtasks: Type.Boolean({ default: true }),
          createDependencies: Type.Boolean({ default: true }),
          applyEstimates: Type.Boolean({ default: true }),
          overrides: Type.Optional(Type.Object({
            priority: Type.Optional(Type.String({ enum: ['low', 'medium', 'high', 'urgent'] })),
            dueDate: Type.Optional(Type.String({ format: 'date-time' })),
            tags: Type.Optional(Type.Array(Type.String()))
          }))
        }, { default: {} }))
      }),
      response: {
        201: Type.Object({
          createdTasks: Type.Array(Type.Any()),
          createdDependencies: Type.Array(Type.Any()),
          summary: Type.Object({
            totalTasks: Type.Number(),
            totalDependencies: Type.Number(),
            estimatedTotalHours: Type.Number(),
            variables: Type.Record(Type.String(), Type.Any())
          }),
          metadata: Type.Object({
            appliedAt: Type.String(),
            templateId: Type.String(),
            templateVersion: Type.Number()
          })
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        }),
        500: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { templateId: string }; Body: ApplyTaskTemplateRequest }>, reply: FastifyReply) => {
    const { templateId } = request.params;
    const userId = getCurrentUserId(request);

    try {
      const { result: applicationResult, duration } = await measureAsyncDuration(async () => {
        return await fastify.mockDataService.applyTemplate(templateId, request.body, userId);
      });

      if (!applicationResult) {
        return reply.code(404).send({
          error: 'Template Not Found',
          message: `Template with ID ${templateId} not found`,
          code: 'TEMPLATE_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      fastify.logEvent(request, 'templateApplied', { 
        templateId, 
        tasksCreated: applicationResult.createdTasks.length,
        dependenciesCreated: applicationResult.createdDependencies.length
      });
      fastify.logPerformance(request, 'applyTemplate', duration, { 
        templateId, 
        tasksCreated: applicationResult.createdTasks.length 
      });

      return reply.code(201).send(applicationResult);
    } catch (error) {
      logger.error('Template application failed:', error as Error);
      
      return reply.code(500).send({
        error: 'Template Application Failed',
        message: 'An error occurred while applying the template',
        code: 'TEMPLATE_APPLICATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });
}