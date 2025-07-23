import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { randomUUID } from 'crypto';

const healthController: FastifyPluginAsync = async (fastify) => {
  // Main health endpoint (legacy path)
  fastify.get('/health', {
    schema: {
      summary: 'Health check',
      description: 'Check if the AI service is healthy and operational',
      tags: ['Health'],
      response: {
        200: Type.Object({
          status: Type.Union([
            Type.Literal('healthy'),
            Type.Literal('degraded'),
            Type.Literal('unhealthy'),
          ]),
          timestamp: Type.String({ format: 'date-time' }),
          version: Type.String(),
          dependencies: Type.Object({
            redis: Type.Union([
              Type.Literal('healthy'),
              Type.Literal('degraded'),
              Type.Literal('unhealthy'),
            ]),
            providers: Type.Object({
              openai: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy'),
              ]),
              anthropic: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy'),
              ]),
              google: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy'),
              ]),
              azure: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy'),
              ]),
            }),
            contextService: Type.Union([
              Type.Literal('healthy'),
              Type.Literal('degraded'),
              Type.Literal('unhealthy'),
            ]),
          }),
        }),
      },
    },
  }, async (_request, _reply) => {
    const healthStatus = fastify.mockDataService.getHealthStatus();
    
    // Publish health check event
    await fastify.eventService.publishEvent('ai.health.checked', {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      requestId: randomUUID(),
    });

    return healthStatus;
  });

  // AI service health endpoint (expected path)
  fastify.get('/api/v1/ai/health', {
    schema: {
      summary: 'AI service health check',
      description: 'Check if the AI service is healthy and operational',
      tags: ['Administration'],
      response: {
        200: Type.Object({
          status: Type.Union([
            Type.Literal('healthy'),
            Type.Literal('degraded'),
            Type.Literal('unhealthy'),
          ]),
          timestamp: Type.String({ format: 'date-time' }),
          version: Type.String(),
          dependencies: Type.Object({
            redis: Type.Union([
              Type.Literal('healthy'),
              Type.Literal('degraded'),
              Type.Literal('unhealthy'),
            ]),
            providers: Type.Object({
              openai: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy'),
              ]),
              anthropic: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy'),
              ]),
              google: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy'),
              ]),
              azure: Type.Union([
                Type.Literal('healthy'),
                Type.Literal('degraded'),
                Type.Literal('unhealthy'),
              ]),
            }),
            contextService: Type.Union([
              Type.Literal('healthy'),
              Type.Literal('degraded'),
              Type.Literal('unhealthy'),
            ]),
          }),
        }),
      },
    },
  }, async (_request, _reply) => {
    const healthStatus = fastify.mockDataService.getHealthStatus();
    
    // Publish health check event
    await fastify.eventService.publishEvent('ai.health.checked', {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      requestId: randomUUID(),
    });

    return healthStatus;
  });
};

export { healthController };