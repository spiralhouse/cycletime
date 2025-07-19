import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { 
  TaskListQuery, 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  AssignTaskRequest,
  TaskListQuerySchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  AssignTaskSchema
} from '../types/task-types';
import { getCurrentUserId } from '../middleware/auth-middleware';
import { measureAsyncDuration } from '../middleware/request-logger';
import { logger } from '@cycletime/shared-utils';

export async function taskRoutes(fastify: FastifyInstance): Promise<void> {
  // List tasks with filtering, sorting, and pagination
  fastify.get('/', {
    schema: {
      description: 'List tasks with optional filtering, sorting, and pagination',
      tags: ['Tasks'],
      querystring: Type.Object({
        page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
        search: Type.Optional(Type.String()),
        status: Type.Optional(Type.String()),
        priority: Type.Optional(Type.String()),
        assignee: Type.Optional(Type.String({ format: 'uuid' })),
        project: Type.Optional(Type.String({ format: 'uuid' })),
        dueDate: Type.Optional(Type.String({ format: 'date' })),
        tags: Type.Optional(Type.String()),
        sortBy: Type.Optional(Type.String({ enum: ['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'], default: 'createdAt' })),
        sortOrder: Type.Optional(Type.String({ enum: ['asc', 'desc'], default: 'desc' }))
      }),
      response: {
        200: Type.Object({
          tasks: Type.Array(Type.Any()),
          pagination: Type.Object({
            page: Type.Number(),
            limit: Type.Number(),
            total: Type.Number(),
            totalPages: Type.Number(),
            hasNext: Type.Boolean(),
            hasPrevious: Type.Boolean()
          }),
          filters: Type.Object({
            status: Type.Optional(Type.String()),
            priority: Type.Optional(Type.String()),
            assignee: Type.Optional(Type.String()),
            project: Type.Optional(Type.String()),
            search: Type.Optional(Type.String())
          }),
          facets: Type.Object({
            statuses: Type.Array(Type.Object({
              value: Type.String(),
              count: Type.Number()
            })),
            priorities: Type.Array(Type.Object({
              value: Type.String(),
              count: Type.Number()
            }))
          })
        })
      }
    }
  }, async (request: FastifyRequest<{ Querystring: TaskListQuery }>, reply: FastifyReply) => {
    const { result, duration } = await measureAsyncDuration(async () => {
      const query = TaskListQuerySchema.parse(request.query);
      return await fastify.taskService.listTasks(query);
    });

    fastify.logPerformance(request, 'listTasks', duration, { 
      tasksCount: result.tasks.length,
      total: result.pagination.total
    });

    return reply.code(200).send(result);
  });

  // Get single task by ID
  fastify.get('/:taskId', {
    schema: {
      description: 'Get task details by ID',
      tags: ['Tasks'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      querystring: Type.Object({
        includeHistory: Type.Optional(Type.Boolean({ default: false }))
      }),
      response: {
        200: Type.Object({
          task: Type.Any()
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Querystring: { includeHistory?: boolean } }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const { includeHistory } = request.query;

    const { result: task, duration } = await measureAsyncDuration(async () => {
      return await fastify.taskService.getTask(taskId, includeHistory);
    });

    if (!task) {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logPerformance(request, 'getTask', duration, { taskId, includeHistory });

    return reply.code(200).send({ task });
  });

  // Create new task
  fastify.post('/', {
    schema: {
      description: 'Create a new task',
      tags: ['Tasks'],
      body: Type.Object({
        title: Type.String({ minLength: 1, maxLength: 255 }),
        description: Type.Optional(Type.String({ default: '' })),
        priority: Type.Optional(Type.String({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })),
        type: Type.Optional(Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'], default: 'feature' })),
        estimatedHours: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
        tags: Type.Optional(Type.Array(Type.String(), { default: [] })),
        metadata: Type.Optional(Type.Record(Type.String(), Type.Any(), { default: {} })),
        assigneeId: Type.Optional(Type.String({ format: 'uuid' })),
        projectId: Type.Optional(Type.String({ format: 'uuid' })),
        parentId: Type.Optional(Type.String({ format: 'uuid' })),
        dueDate: Type.Optional(Type.String({ format: 'date-time' })),
        startDate: Type.Optional(Type.String({ format: 'date-time' }))
      }),
      response: {
        201: Type.Object({
          task: Type.Any()
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateTaskRequest }>, reply: FastifyReply) => {
    const userId = getCurrentUserId(request);
    const createRequest = CreateTaskSchema.parse(request.body);

    const { result: task, duration } = await measureAsyncDuration(async () => {
      return await fastify.taskService.createTask(createRequest, userId);
    });

    fastify.logEvent(request, 'taskCreated', { taskId: task.id, title: task.title });
    fastify.logPerformance(request, 'createTask', duration, { taskId: task.id });

    return reply.code(201).send({ task });
  });

  // Update task
  fastify.put('/:taskId', {
    schema: {
      description: 'Update task details',
      tags: ['Tasks'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
        description: Type.Optional(Type.String()),
        status: Type.Optional(Type.String({ enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'blocked'] })),
        priority: Type.Optional(Type.String({ enum: ['low', 'medium', 'high', 'urgent'] })),
        type: Type.Optional(Type.String({ enum: ['feature', 'bug', 'maintenance', 'research', 'documentation'] })),
        estimatedHours: Type.Optional(Type.Number({ minimum: 0 })),
        actualHours: Type.Optional(Type.Number({ minimum: 0 })),
        progress: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
        tags: Type.Optional(Type.Array(Type.String())),
        metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
        assigneeId: Type.Optional(Type.String({ format: 'uuid' })),
        projectId: Type.Optional(Type.String({ format: 'uuid' })),
        dueDate: Type.Optional(Type.String({ format: 'date-time' })),
        startDate: Type.Optional(Type.String({ format: 'date-time' })),
        version: Type.Optional(Type.Number({ minimum: 1 }))
      }),
      response: {
        200: Type.Object({
          task: Type.Any()
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
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Body: UpdateTaskRequest }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);
    const updateRequest = UpdateTaskSchema.parse(request.body);

    const { result: task, duration } = await measureAsyncDuration(async () => {
      return await fastify.taskService.updateTask(taskId, updateRequest, userId);
    });

    if (!task) {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'taskUpdated', { taskId, changes: Object.keys(updateRequest) });
    fastify.logPerformance(request, 'updateTask', duration, { taskId });

    return reply.code(200).send({ task });
  });

  // Delete task
  fastify.delete('/:taskId', {
    schema: {
      description: 'Delete a task (soft delete by default)',
      tags: ['Tasks'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      querystring: Type.Object({
        permanent: Type.Optional(Type.Boolean({ default: false }))
      }),
      response: {
        204: Type.Null(),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Querystring: { permanent?: boolean } }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const { permanent } = request.query;

    const { result: success, duration } = await measureAsyncDuration(async () => {
      return await fastify.taskService.deleteTask(taskId, permanent);
    });

    if (!success) {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'taskDeleted', { taskId, permanent });
    fastify.logPerformance(request, 'deleteTask', duration, { taskId, permanent });

    return reply.code(204).send();
  });

  // Assign task to user
  fastify.post('/:taskId/assign', {
    schema: {
      description: 'Assign task to a user',
      tags: ['Task Assignment'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        assigneeId: Type.String({ format: 'uuid' }),
        comment: Type.Optional(Type.String())
      }),
      response: {
        200: Type.Object({
          task: Type.Any()
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Body: AssignTaskRequest }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);
    const assignRequest = AssignTaskSchema.parse(request.body);

    const { result: task, duration } = await measureAsyncDuration(async () => {
      return await fastify.taskService.assignTask(taskId, assignRequest.assigneeId, assignRequest.comment, userId);
    });

    if (!task) {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'taskAssigned', { taskId, assigneeId: assignRequest.assigneeId });
    fastify.logPerformance(request, 'assignTask', duration, { taskId, assigneeId: assignRequest.assigneeId });

    return reply.code(200).send({ task });
  });

  // Unassign task
  fastify.post('/:taskId/unassign', {
    schema: {
      description: 'Unassign task from current assignee',
      tags: ['Task Assignment'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      response: {
        200: Type.Object({
          task: Type.Any()
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          code: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);

    const { result: task, duration } = await measureAsyncDuration(async () => {
      return await fastify.taskService.unassignTask(taskId, userId);
    });

    if (!task) {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'taskUnassigned', { taskId });
    fastify.logPerformance(request, 'unassignTask', duration, { taskId });

    return reply.code(200).send({ task });
  });
}