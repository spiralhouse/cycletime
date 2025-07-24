import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { UpdateProgressRequest, UpdateProgressSchema } from '../types/task-types';
import { getCurrentUserId } from '../middleware/auth-middleware';

export async function progressRoutes(fastify: FastifyInstance): Promise<void> {
  // Get task progress
  fastify.get('/:taskId/progress', {
    schema: {
      description: 'Get progress tracking information for a task',
      tags: ['Progress Tracking'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const progress = await fastify.taskService.getProgress(taskId);
    
    if (!progress) {
      return reply.code(404).send({
        error: 'Progress Not Found',
        message: `Progress for task ${taskId} not found`,
        code: 'PROGRESS_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    return reply.code(200).send(progress);
  });

  // Update task progress
  fastify.post('/:taskId/progress', {
    schema: {
      description: 'Update progress tracking for a task',
      tags: ['Progress Tracking'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        progress: Type.Number({ minimum: 0, maximum: 100 }),
        timeSpent: Type.Optional(Type.Number({ minimum: 0 })),
        comment: Type.Optional(Type.String())
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Body: UpdateProgressRequest }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);
    const progressRequest = UpdateProgressSchema.parse(request.body);

    const progress = await fastify.taskService.updateProgress(taskId, progressRequest, userId);
    
    if (!progress) {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    return reply.code(200).send(progress);
  });
}