import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { SearchTasksRequest, SearchTasksSchema } from '../types/task-types';

export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  // Search tasks
  fastify.post('/search', {
    schema: {
      description: 'Advanced task search with filters and facets',
      tags: ['Search'],
      body: Type.Object({
        query: Type.String({ minLength: 1 }),
        filters: Type.Optional(Type.Object({
          status: Type.Optional(Type.Array(Type.String())),
          priority: Type.Optional(Type.Array(Type.String())),
          type: Type.Optional(Type.Array(Type.String())),
          assignee: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
          project: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
          tags: Type.Optional(Type.Array(Type.String())),
          dateRange: Type.Optional(Type.Object({
            from: Type.String({ format: 'date-time' }),
            to: Type.String({ format: 'date-time' })
          }))
        })),
        facets: Type.Optional(Type.Array(Type.String())),
        sort: Type.Optional(Type.Object({
          field: Type.String({ enum: ['relevance', 'createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'] }),
          order: Type.String({ enum: ['asc', 'desc'] })
        })),
        pagination: Type.Optional(Type.Object({
          page: Type.Number({ minimum: 1, default: 1 }),
          limit: Type.Number({ minimum: 1, maximum: 100, default: 20 })
        }))
      })
    }
  }, async (request: FastifyRequest<{ Body: SearchTasksRequest }>, reply: FastifyReply) => {
    const searchRequest = SearchTasksSchema.parse(request.body);
    const results = await fastify.taskService.searchTasks(searchRequest);
    return reply.code(200).send(results);
  });
}