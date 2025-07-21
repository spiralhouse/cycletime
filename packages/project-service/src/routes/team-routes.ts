import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorHandler } from '../utils/error-handler';
import {
  AddTeamMemberRequestSchema,
  UpdateTeamMemberRequestSchema,
  ProjectTeamResponseSchema,
  TeamMemberResponseSchema
} from '../types';

export async function teamRoutes(app: FastifyInstance) {
  // Get project team
  app.get('/projects/:projectId/team', {
    schema: {
      description: 'Get project team members',
      tags: ['Team Management'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: ProjectTeamResponseSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
    const params = request.params as any;
    
    const result = await app.services!.team.getProjectTeam(params.projectId);
    return reply.send(result);
    } catch (error) {
      return ErrorHandler.handle(error as Error, request, reply);
    }
  });

  // Add team member
  app.post('/projects/:projectId/team', {
    schema: {
      description: 'Add team member to project',
      tags: ['Team Management'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      body: AddTeamMemberRequestSchema,
      response: {
        201: TeamMemberResponseSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
    const params = request.params as any;
    const body = request.body as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    const result = await app.services!.team.addTeamMember(params.projectId, body, userId);
    return reply.status(201).send(result);
    } catch (error) {
      return ErrorHandler.handle(error as Error, request, reply);
    }
  });

  // Update team member
  app.put('/projects/:projectId/team/:userId', {
    schema: {
      description: 'Update team member role and permissions',
      tags: ['Team Management'],
      params: {
        type: 'object',
        required: ['projectId', 'userId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' }
        }
      },
      body: UpdateTeamMemberRequestSchema,
      response: {
        200: TeamMemberResponseSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
    const params = request.params as any;
    const body = request.body as any;
    const updatedBy = 'user-123'; // In real implementation, extract from auth token
    
    const result = await app.services!.team.updateTeamMember(params.projectId, params.userId, body, updatedBy);
    return reply.send(result);
    } catch (error) {
      return ErrorHandler.handle(error as Error, request, reply);
    }
  });

  // Remove team member
  app.delete('/projects/:projectId/team/:userId', {
    schema: {
      description: 'Remove team member from project',
      tags: ['Team Management'],
      params: {
        type: 'object',
        required: ['projectId', 'userId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        204: { type: 'null' }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
    const params = request.params as any;
    const removedBy = 'user-123'; // In real implementation, extract from auth token
    
    await app.services!.team.removeTeamMember(params.projectId, params.userId, removedBy);
    return reply.status(204).send();
    } catch (error) {
      return ErrorHandler.handle(error as Error, request, reply);
    }
  });

  // Get team member
  app.get('/projects/:projectId/team/:userId', {
    schema: {
      description: 'Get team member details',
      tags: ['Team Management'],
      params: {
        type: 'object',
        required: ['projectId', 'userId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: TeamMemberResponseSchema
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
    const params = request.params as any;
    
    const result = await app.services!.team.getTeamMember(params.projectId, params.userId);
    return reply.send(result);
    } catch (error) {
      return ErrorHandler.handle(error as Error, request, reply);
    }
  });
}