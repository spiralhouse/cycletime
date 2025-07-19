import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ScheduleTaskRequest, ScheduleTaskSchema } from '../types/task-types';
import { getCurrentUserId } from '../middleware/auth-middleware';

export async function scheduleRoutes(fastify: FastifyInstance): Promise<void> {
  // Get task schedule
  fastify.get('/:taskId/schedule', {
    schema: {
      description: 'Get scheduling information for a task',
      tags: ['Scheduling'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const schedule = await fastify.taskService.getSchedule(taskId);
    
    if (!schedule) {
      return reply.code(404).send({
        error: 'Schedule Not Found',
        message: `Schedule for task ${taskId} not found`,
        code: 'SCHEDULE_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    return reply.code(200).send(schedule);
  });

  // Schedule task
  fastify.post('/:taskId/schedule', {
    schema: {
      description: 'Schedule a task for execution',
      tags: ['Scheduling'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        startDate: Type.Optional(Type.String({ format: 'date-time' })),
        dueDate: Type.Optional(Type.String({ format: 'date-time' })),
        scheduledAt: Type.Optional(Type.String({ format: 'date-time' })),
        recurringPattern: Type.Optional(Type.String())
      })
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Body: ScheduleTaskRequest }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);
    const scheduleRequest = ScheduleTaskSchema.parse(request.body);

    const schedule = await fastify.taskService.scheduleTask(taskId, scheduleRequest, userId);
    return reply.code(200).send(schedule);
  });
}