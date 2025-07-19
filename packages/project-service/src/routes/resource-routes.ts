import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorHandler } from '../utils/error-handler';
import {
  AllocateResourcesRequestSchema,
  ResourceAllocationResponseSchema,
  CapacityPlanningResponseSchema
} from '../types';

export async function resourceRoutes(app: FastifyInstance) {
  // Get resource allocation
  app.get('/projects/:projectId/resources', {
    schema: {
      description: 'Get current resource allocation for a project',
      tags: ['Resource Management'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: ResourceAllocationResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    
    const result = await app.services.resource.getResourceAllocation(params.projectId);
    return reply.send(result);
  }));

  // Allocate resources
  app.post('/projects/:projectId/resources', {
    schema: {
      description: 'Allocate resources to a project',
      tags: ['Resource Management'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      body: AllocateResourcesRequestSchema,
      response: {
        201: ResourceAllocationResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const body = request.body as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    const result = await app.services.resource.allocateResources(params.projectId, body, userId);
    return reply.status(201).send(result);
  }));

  // Deallocate resources
  app.delete('/projects/:projectId/resources', {
    schema: {
      description: 'Deallocate resources from a project',
      tags: ['Resource Management'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['resourceIds'],
        properties: {
          resourceIds: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: ResourceAllocationResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const body = request.body as any;
    const userId = 'user-123'; // In real implementation, extract from auth token
    
    const result = await app.services.resource.deallocateResources(params.projectId, body.resourceIds, userId);
    return reply.send(result);
  }));

  // Get capacity planning
  app.get('/projects/:projectId/capacity', {
    schema: {
      description: 'Get capacity planning data for a project',
      tags: ['Resource Management'],
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
          timeframe: { type: 'string', enum: ['week', 'month', 'quarter'], default: 'month' }
        }
      },
      response: {
        200: CapacityPlanningResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const result = await app.services.resource.getCapacityPlanning(params.projectId, query.timeframe);
    return reply.send(result);
  }));

  // Analyze resource utilization
  app.get('/projects/:projectId/utilization', {
    schema: {
      description: 'Analyze resource utilization for a project',
      tags: ['Resource Management'],
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
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            period: { type: 'object' },
            utilization: { type: 'object' },
            recommendations: { type: 'array' },
            trends: { type: 'array' }
          }
        }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const timeRange = {
      start: query.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: query.end || new Date().toISOString()
    };
    
    const result = await app.services.resource.analyzeResourceUtilization(params.projectId, timeRange);
    return reply.send(result);
  }));

  // Optimize resource allocation
  app.post('/projects/:projectId/optimize', {
    schema: {
      description: 'Optimize resource allocation for a project',
      tags: ['Resource Management'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          maxBudget: { type: 'number', minimum: 0 },
          targetUtilization: { type: 'number', minimum: 0, maximum: 1 },
          skillRequirements: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            currentAllocation: { type: 'object' },
            optimizedAllocation: { type: 'object' },
            improvements: { type: 'array' },
            recommendations: { type: 'array' }
          }
        }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const body = request.body as any;
    
    const result = await app.services.resource.optimizeResourceAllocation(params.projectId, body);
    return reply.send(result);
  }));
}