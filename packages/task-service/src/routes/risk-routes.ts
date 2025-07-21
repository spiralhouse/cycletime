import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  TaskRisk,
  TaskRisksResponse,
  AddTaskRiskRequest,
  UpdateTaskRiskRequest,
  TaskRiskResponse
} from '../types/service-types';
import { getCurrentUserId } from '../middleware/auth-middleware';
import { measureAsyncDuration } from '../middleware/request-logger';
import { logger } from '@cycletime/shared-utils';

/**
 * Risk assessment routes for task management
 * Handles risk identification, assessment, and mitigation tracking
 */
export async function riskRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all risks for a task
  fastify.get('/:taskId/risks', {
    schema: {
      description: 'Get all risks associated with a task',
      tags: ['Risk Assessment'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      querystring: Type.Object({
        status: Type.Optional(Type.String({ enum: ['open', 'monitoring', 'mitigated', 'closed'] })),
        severity: Type.Optional(Type.String({ enum: ['low', 'medium', 'high', 'critical'] })),
        type: Type.Optional(Type.String({ enum: ['technical', 'resource', 'timeline', 'dependency', 'quality', 'scope', 'external'] })),
        includeHistory: Type.Optional(Type.Boolean({ default: false }))
      }),
      response: {
        200: Type.Object({
          taskId: Type.String({ format: 'uuid' }),
          risks: Type.Array(Type.Any()),
          summary: Type.Object({
            totalRisks: Type.Number(),
            risksByType: Type.Object({
              technical: Type.Number(),
              resource: Type.Number(),
              timeline: Type.Number(),
              dependency: Type.Number(),
              quality: Type.Number(),
              scope: Type.Number(),
              external: Type.Number()
            }),
            risksBySeverity: Type.Object({
              low: Type.Number(),
              medium: Type.Number(),
              high: Type.Number(),
              critical: Type.Number()
            }),
            overallRiskScore: Type.Number({ minimum: 0, maximum: 100 })
          })
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
    Params: { taskId: string }; 
    Querystring: { status?: string; severity?: string; type?: string; includeHistory?: boolean } 
  }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const { status, severity, type, includeHistory } = request.query;

    const { result, duration } = await measureAsyncDuration(async () => {
      // Check if task exists
      const task = await fastify.taskService.getTask(taskId);
      if (!task) {
        return null;
      }

      // Generate mock risk data using the mock data service
      const risks = await fastify.mockDataService.getTaskRisks(taskId, {
        status,
        severity,
        type,
        includeHistory
      });

      return risks;
    });

    if (!result) {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logPerformance(request, 'getTaskRisks', duration, { 
      taskId, 
      totalRisks: result.risks.length,
      riskScore: result.summary.overallRiskScore
    });

    return reply.code(200).send(result);
  });

  // Add a new risk assessment to a task
  fastify.post('/:taskId/risks', {
    schema: {
      description: 'Add a new risk assessment to a task',
      tags: ['Risk Assessment'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        type: Type.String({ enum: ['technical', 'resource', 'timeline', 'dependency', 'quality', 'scope', 'external'] }),
        severity: Type.String({ enum: ['low', 'medium', 'high', 'critical'] }),
        probability: Type.Number({ minimum: 0, maximum: 1 }),
        impact: Type.String({ enum: ['low', 'medium', 'high', 'critical'] }),
        title: Type.String({ minLength: 1, maxLength: 255 }),
        description: Type.String({ minLength: 1, maxLength: 2000 }),
        mitigation: Type.Optional(Type.Object({
          strategy: Type.String({ enum: ['avoid', 'mitigate', 'transfer', 'accept'] }),
          actions: Type.Array(Type.Object({
            action: Type.String({ minLength: 1, maxLength: 500 }),
            assigneeId: Type.Optional(Type.String({ format: 'uuid' })),
            dueDate: Type.Optional(Type.String({ format: 'date-time' })),
            status: Type.String({ enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' }),
            notes: Type.Optional(Type.String({ maxLength: 1000 }))
          })),
          contingency: Type.Optional(Type.String({ maxLength: 1000 }))
        })),
        ownerId: Type.Optional(Type.String({ format: 'uuid' })),
        autoAnalyze: Type.Optional(Type.Boolean({ default: false }))
      }),
      response: {
        201: Type.Object({
          risk: Type.Any()
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
        })
      }
    }
  }, async (request: FastifyRequest<{ 
    Params: { taskId: string }; 
    Body: AddTaskRiskRequest 
  }>, reply: FastifyReply) => {
    const { taskId } = request.params;
    const userId = getCurrentUserId(request);
    const riskRequest = request.body;

    const { result, duration } = await measureAsyncDuration(async () => {
      // Check if task exists
      const task = await fastify.taskService.getTask(taskId);
      if (!task) {
        return { error: 'TASK_NOT_FOUND' };
      }

      // Create risk assessment using mock data service
      const risk = await fastify.mockDataService.addTaskRisk(taskId, riskRequest, userId);
      return { risk };
    });

    if (result.error === 'TASK_NOT_FOUND') {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'riskAssessed', { 
      taskId, 
      riskId: result.risk?.id, 
      type: result.risk?.type,
      severity: result.risk?.severity 
    });
    fastify.logPerformance(request, 'addTaskRisk', duration, { 
      taskId, 
      riskType: result.risk?.type, 
      severity: result.risk?.severity 
    });

    return reply.code(201).send({ risk: result.risk });
  });

  // Update an existing risk assessment
  fastify.put('/:taskId/risks/:riskId', {
    schema: {
      description: 'Update an existing risk assessment',
      tags: ['Risk Assessment'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' }),
        riskId: Type.String({ format: 'uuid' })
      }),
      body: Type.Object({
        type: Type.Optional(Type.String({ enum: ['technical', 'resource', 'timeline', 'dependency', 'quality', 'scope', 'external'] })),
        severity: Type.Optional(Type.String({ enum: ['low', 'medium', 'high', 'critical'] })),
        probability: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
        impact: Type.Optional(Type.String({ enum: ['low', 'medium', 'high', 'critical'] })),
        title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
        description: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
        mitigation: Type.Optional(Type.Object({
          strategy: Type.String({ enum: ['avoid', 'mitigate', 'transfer', 'accept'] }),
          actions: Type.Array(Type.Object({
            action: Type.String({ minLength: 1, maxLength: 500 }),
            assigneeId: Type.Optional(Type.String({ format: 'uuid' })),
            dueDate: Type.Optional(Type.String({ format: 'date-time' })),
            status: Type.String({ enum: ['pending', 'in_progress', 'completed', 'cancelled'] }),
            notes: Type.Optional(Type.String({ maxLength: 1000 }))
          })),
          contingency: Type.Optional(Type.String({ maxLength: 1000 }))
        })),
        status: Type.Optional(Type.String({ enum: ['open', 'monitoring', 'mitigated', 'closed'] })),
        ownerId: Type.Optional(Type.String({ format: 'uuid' })),
        version: Type.Number({ minimum: 1 })
      }),
      response: {
        200: Type.Object({
          risk: Type.Any()
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
  }, async (request: FastifyRequest<{ 
    Params: { taskId: string; riskId: string }; 
    Body: UpdateTaskRiskRequest 
  }>, reply: FastifyReply) => {
    const { taskId, riskId } = request.params;
    const userId = getCurrentUserId(request);
    const updateRequest = request.body;

    const { result, duration } = await measureAsyncDuration(async () => {
      // Check if task exists
      const task = await fastify.taskService.getTask(taskId);
      if (!task) {
        return { error: 'TASK_NOT_FOUND' };
      }

      // Update risk assessment using mock data service
      const risk = await fastify.mockDataService.updateTaskRisk(taskId, riskId, updateRequest, userId);
      if (!risk) {
        return { error: 'RISK_NOT_FOUND' };
      }

      return { risk };
    });

    if (result.error === 'TASK_NOT_FOUND') {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    if (result.error === 'RISK_NOT_FOUND') {
      return reply.code(404).send({
        error: 'Risk Not Found',
        message: `Risk with ID ${riskId} not found for task ${taskId}`,
        code: 'RISK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'riskUpdated', { 
      taskId, 
      riskId, 
      changes: Object.keys(updateRequest).filter(key => key !== 'version')
    });
    fastify.logPerformance(request, 'updateTaskRisk', duration, { taskId, riskId });

    return reply.code(200).send({ risk: result.risk });
  });

  // Delete a risk assessment
  fastify.delete('/:taskId/risks/:riskId', {
    schema: {
      description: 'Delete a risk assessment from a task',
      tags: ['Risk Assessment'],
      params: Type.Object({
        taskId: Type.String({ format: 'uuid' }),
        riskId: Type.String({ format: 'uuid' })
      }),
      querystring: Type.Object({
        reason: Type.Optional(Type.String({ maxLength: 500 }))
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
  }, async (request: FastifyRequest<{ 
    Params: { taskId: string; riskId: string }; 
    Querystring: { reason?: string } 
  }>, reply: FastifyReply) => {
    const { taskId, riskId } = request.params;
    const { reason } = request.query;
    const userId = getCurrentUserId(request);

    const { result, duration } = await measureAsyncDuration(async () => {
      // Check if task exists
      const task = await fastify.taskService.getTask(taskId);
      if (!task) {
        return { error: 'TASK_NOT_FOUND' };
      }

      // Delete risk assessment using mock data service
      const success = await fastify.mockDataService.deleteTaskRisk(taskId, riskId, userId, reason);
      if (!success) {
        return { error: 'RISK_NOT_FOUND' };
      }

      return { success: true };
    });

    if (result.error === 'TASK_NOT_FOUND') {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: `Task with ID ${taskId} not found`,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    if (result.error === 'RISK_NOT_FOUND') {
      return reply.code(404).send({
        error: 'Risk Not Found',
        message: `Risk with ID ${riskId} not found for task ${taskId}`,
        code: 'RISK_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    fastify.logEvent(request, 'riskDeleted', { taskId, riskId, reason });
    fastify.logPerformance(request, 'deleteTaskRisk', duration, { taskId, riskId });

    return reply.code(204).send();
  });
}