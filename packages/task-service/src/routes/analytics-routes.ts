import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { TaskAnalyticsQuery, TaskAnalyticsQuerySchema } from '../types/task-types';

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get task analytics
  fastify.get('/analytics', {
    schema: {
      description: 'Get analytics and metrics for tasks',
      tags: ['Analytics'],
      querystring: Type.Object({
        timeRange: Type.Optional(Type.String({ enum: ['day', 'week', 'month', 'quarter', 'year'], default: 'week' })),
        groupBy: Type.Optional(Type.String({ enum: ['status', 'priority', 'assignee', 'project', 'tag'], default: 'status' })),
        project: Type.Optional(Type.String({ format: 'uuid' })),
        assignee: Type.Optional(Type.String({ format: 'uuid' }))
      })
    }
  }, async (request: FastifyRequest<{ Querystring: TaskAnalyticsQuery }>, reply: FastifyReply) => {
    const query = TaskAnalyticsQuerySchema.parse(request.query);
    const analytics = await fastify.taskService.getAnalytics(query);
    return reply.code(200).send(analytics);
  });
}