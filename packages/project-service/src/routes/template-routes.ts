import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorHandler } from '../utils/error-handler';
import {
  CreateTemplateRequestSchema,
  UpdateTemplateRequestSchema,
  ApplyTemplateRequestSchema,
  TemplateResponseSchema,
  TemplateListResponseSchema,
  ProjectTemplatesResponseSchema
} from '../types';

export async function templateRoutes(app: FastifyInstance) {
  // Get templates
  app.get('/templates', {
    schema: {
      description: 'Get paginated list of templates',
      tags: ['Templates'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          category: { type: 'string', enum: ['agile', 'waterfall', 'kanban', 'scrum', 'custom'] },
          public: { type: 'boolean' },
          search: { type: 'string' }
        }
      },
      response: {
        200: TemplateListResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const options = {
      page: query.page,
      limit: query.limit,
      filters: {
        category: query.category,
        public: query.public,
        search: query.search
      }
    };

    const result = await app.services.template.getTemplates(options);
    return reply.send(result);
  }));

  // Create template
  app.post('/templates', {
    schema: {
      description: 'Create a new template',
      tags: ['Templates'],
      body: CreateTemplateRequestSchema,
      response: {
        201: TemplateResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    const result = await app.services.template.createTemplate(body, userId);
    return reply.status(201).send(result);
  }));

  // Get template by ID
  app.get('/templates/:templateId', {
    schema: {
      description: 'Get template by ID',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['templateId'],
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: TemplateResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    
    const result = await app.services.template.getTemplateById(params.templateId);
    return reply.send(result);
  }));

  // Update template
  app.put('/templates/:templateId', {
    schema: {
      description: 'Update template',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['templateId'],
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        }
      },
      body: UpdateTemplateRequestSchema,
      response: {
        200: TemplateResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const body = request.body as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    const result = await app.services.template.updateTemplate(params.templateId, body, userId);
    return reply.send(result);
  }));

  // Delete template
  app.delete('/templates/:templateId', {
    schema: {
      description: 'Delete template',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['templateId'],
        properties: {
          templateId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        204: { type: 'null' }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    await app.services.template.deleteTemplate(params.templateId, userId);
    return reply.status(204).send();
  }));

  // Get project templates
  app.get('/projects/:projectId/templates', {
    schema: {
      description: 'Get available templates for a project',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['agile', 'waterfall', 'kanban', 'scrum', 'custom'] }
        }
      },
      response: {
        200: ProjectTemplatesResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const result = await app.services.template.getProjectTemplates(params.projectId, query.category);
    return reply.send(result);
  }));

  // Apply template to project
  app.post('/projects/:projectId/templates', {
    schema: {
      description: 'Apply template to project',
      tags: ['Templates'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      body: ApplyTemplateRequestSchema,
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const body = request.body as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    await app.services.template.applyTemplate(params.projectId, body, userId);
    return reply.send({ message: 'Template applied successfully' });
  }));
}