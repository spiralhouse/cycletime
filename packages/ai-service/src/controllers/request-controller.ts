import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const requestController: FastifyPluginAsync = async (fastify) => {
  // Get AI request details
  fastify.get('/api/v1/requests/:requestId', {
    schema: {
      summary: 'Get AI request details',
      description: 'Get details and status of an AI request',
      tags: ['Requests'],
      params: Type.Object({
        requestId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          type: Type.Union([
            Type.Literal('chat_completion'),
            Type.Literal('chat_completion_stream'),
            Type.Literal('embedding'),
            Type.Literal('context_analysis'),
            Type.Literal('project_analysis'),
          ]),
          status: Type.Union([
            Type.Literal('pending'),
            Type.Literal('processing'),
            Type.Literal('completed'),
            Type.Literal('failed'),
            Type.Literal('cancelled'),
          ]),
          provider: Type.String(),
          model: Type.String(),
          createdAt: Type.String({ format: 'date-time' }),
          startedAt: Type.Optional(Type.String({ format: 'date-time' })),
          completedAt: Type.Optional(Type.String({ format: 'date-time' })),
          processingTime: Type.Optional(Type.Number()),
          priority: Type.Union([
            Type.Literal('low'),
            Type.Literal('medium'),
            Type.Literal('high'),
            Type.Literal('urgent'),
          ]),
          userId: Type.String(),
          sessionId: Type.Optional(Type.String()),
          projectId: Type.Optional(Type.String()),
          error: Type.Optional(Type.Object({
            type: Type.String(),
            message: Type.String(),
            code: Type.String(),
            retryable: Type.Boolean(),
          })),
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    
    const aiRequest = fastify.mockDataService.getAIRequest(requestId);
    
    if (!aiRequest) {
      return reply.status(404).send({
        error: 'Request not found',
        message: `AI request ${requestId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    return {
      id: aiRequest.id,
      type: aiRequest.type,
      status: aiRequest.status,
      provider: aiRequest.provider,
      model: aiRequest.model,
      createdAt: aiRequest.createdAt,
      startedAt: aiRequest.startedAt,
      completedAt: aiRequest.completedAt,
      processingTime: aiRequest.processingTime,
      priority: aiRequest.priority,
      userId: aiRequest.userId,
      sessionId: aiRequest.sessionId,
      projectId: aiRequest.projectId,
      error: aiRequest.error,
    };
  });

  // Get AI request response
  fastify.get('/api/v1/requests/:requestId/response', {
    schema: {
      summary: 'Get AI request response',
      description: 'Get the response data for a completed AI request',
      tags: ['Requests'],
      params: Type.Object({
        requestId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Any(),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
        409: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    
    const aiRequest = fastify.mockDataService.getAIRequest(requestId);
    
    if (!aiRequest) {
      return reply.status(404).send({
        error: 'Request not found',
        message: `AI request ${requestId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (aiRequest.status !== 'completed') {
      return reply.status(409).send({
        error: 'Request not completed',
        message: `AI request ${requestId} is not yet completed (status: ${aiRequest.status})`,
        timestamp: new Date().toISOString(),
      });
    }
    
    return aiRequest.responseData;
  });

  // Cancel AI request
  fastify.delete('/api/v1/requests/:requestId', {
    schema: {
      summary: 'Cancel AI request',
      description: 'Cancel a pending AI request',
      tags: ['Requests'],
      params: Type.Object({
        requestId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          status: Type.Literal('cancelled'),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
        409: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    
    const aiRequest = fastify.mockDataService.getAIRequest(requestId);
    
    if (!aiRequest) {
      return reply.status(404).send({
        error: 'Request not found',
        message: `AI request ${requestId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (aiRequest.status !== 'pending') {
      return reply.status(409).send({
        error: 'Request cannot be cancelled',
        message: `AI request ${requestId} cannot be cancelled (status: ${aiRequest.status})`,
        timestamp: new Date().toISOString(),
      });
    }
    
    const cancelled = fastify.mockDataService.cancelAIRequest(requestId);
    
    if (cancelled) {
      return {
        id: requestId,
        status: 'cancelled' as const,
        message: 'Request cancelled successfully',
        timestamp: new Date().toISOString(),
      };
    } else {
      return reply.status(409).send({
        error: 'Request cannot be cancelled',
        message: `AI request ${requestId} could not be cancelled`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get request status
  fastify.get('/api/v1/requests/:requestId/status', {
    schema: {
      summary: 'Get AI request status',
      description: 'Get the current status of an AI request',
      tags: ['Requests'],
      params: Type.Object({
        requestId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          status: Type.Union([
            Type.Literal('pending'),
            Type.Literal('processing'),
            Type.Literal('completed'),
            Type.Literal('failed'),
            Type.Literal('cancelled'),
          ]),
          progress: Type.Optional(Type.Object({
            stage: Type.String(),
            percentage: Type.Number({ minimum: 0, maximum: 100 }),
            currentTask: Type.String(),
            estimatedCompletion: Type.Optional(Type.String({ format: 'date-time' })),
          })),
          timestamp: Type.String({ format: 'date-time' }),
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    
    const aiRequest = fastify.mockDataService.getAIRequest(requestId);
    
    if (!aiRequest) {
      return reply.status(404).send({
        error: 'Request not found',
        message: `AI request ${requestId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Generate mock progress information
    let progress;
    if (aiRequest.status === 'processing') {
      progress = {
        stage: 'generating',
        percentage: Math.floor(Math.random() * 80) + 10, // 10-90%
        currentTask: 'Generating AI response',
        estimatedCompletion: new Date(Date.now() + Math.random() * 30000).toISOString(),
      };
    }
    
    return {
      id: aiRequest.id,
      status: aiRequest.status,
      progress,
      timestamp: new Date().toISOString(),
    };
  });
};

export { requestController };