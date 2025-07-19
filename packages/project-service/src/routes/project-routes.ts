import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorHandler } from '../utils/error-handler';
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  ProjectResponseSchema,
  ProjectListResponseSchema
} from '../types';

export async function projectRoutes(app: FastifyInstance) {
  // Get projects
  app.get('/projects', {
    schema: {
      description: 'Get paginated list of projects',
      tags: ['Projects'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          status: { type: 'string', enum: ['active', 'archived', 'on_hold', 'planning', 'completed'] },
          owner: { type: 'string', format: 'uuid' },
          template: { type: 'string', format: 'uuid' },
          sortBy: { type: 'string', enum: ['name', 'createdAt', 'updatedAt', 'status', 'progress'], default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: ProjectListResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const options = {
      page: query.page,
      limit: query.limit,
      filters: {
        search: query.search,
        status: query.status,
        owner: query.owner,
        template: query.template,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder
      }
    };

    const result = await app.services.project.getProjects(options);
    return reply.send(result);
  }));

  // Create project
  app.post('/projects', {
    schema: {
      description: 'Create a new project',
      tags: ['Projects'],
      body: CreateProjectRequestSchema,
      response: {
        201: ProjectResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    const result = await app.services.project.createProject(body, userId);
    return reply.status(201).send(result);
  }));

  // Get project by ID
  app.get('/projects/:projectId', {
    schema: {
      description: 'Get project by ID',
      tags: ['Projects'],
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
          includeTeam: { type: 'boolean', default: false },
          includeAnalytics: { type: 'boolean', default: false }
        }
      },
      response: {
        200: ProjectResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const result = await app.services.project.getProjectById(params.projectId);
    
    // If includeTeam is requested, add team data
    if (query.includeTeam) {
      const team = await app.services.team.getProjectTeam(params.projectId);
      result.project.team = team.team;
    }
    
    // If includeAnalytics is requested, add analytics data
    if (query.includeAnalytics) {
      const analytics = await app.services.analytics.getProjectAnalytics(params.projectId);
      (result.project as any).analytics = analytics;
    }
    
    return reply.send(result);
  }));

  // Update project
  app.put('/projects/:projectId', {
    schema: {
      description: 'Update project',
      tags: ['Projects'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      body: UpdateProjectRequestSchema,
      response: {
        200: ProjectResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const body = request.body as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    const result = await app.services.project.updateProject(params.projectId, body, userId);
    return reply.send(result);
  }));

  // Delete project
  app.delete('/projects/:projectId', {
    schema: {
      description: 'Delete project',
      tags: ['Projects'],
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
          permanent: { type: 'boolean', default: false }
        }
      },
      response: {
        204: { type: 'null' }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    await app.services.project.deleteProject(params.projectId, query.permanent, userId);
    return reply.status(204).send();
  }));
}