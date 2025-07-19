import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const modelController: FastifyPluginAsync = async (fastify) => {
  // List available models
  fastify.get('/api/v1/models', {
    schema: {
      summary: 'List available models',
      description: 'Get list of available AI models across all providers',
      tags: ['Model Management'],
      querystring: Type.Object({
        provider: Type.Optional(Type.Union([
          Type.Literal('openai'),
          Type.Literal('anthropic'),
          Type.Literal('google'),
          Type.Literal('azure'),
        ])),
        capability: Type.Optional(Type.Union([
          Type.Literal('text-generation'),
          Type.Literal('code-generation'),
          Type.Literal('embedding'),
          Type.Literal('vision'),
          Type.Literal('function-calling'),
        ])),
      }),
      response: {
        200: Type.Object({
          models: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            description: Type.String(),
            provider: Type.String(),
            capabilities: Type.Array(Type.String()),
            contextWindow: Type.Integer(),
            maxTokens: Type.Integer(),
            costPerInputToken: Type.Number(),
            costPerOutputToken: Type.Number(),
            status: Type.String(),
          })),
          totalModels: Type.Integer(),
          lastUpdated: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { provider, capability } = request.query as any;
    
    const models = fastify.mockDataService.getModels(provider, capability);
    
    return {
      models,
      totalModels: models.length,
      lastUpdated: new Date().toISOString(),
    };
  });

  // Get model details
  fastify.get('/api/v1/models/:modelId', {
    schema: {
      summary: 'Get model details',
      description: 'Get details of a specific AI model',
      tags: ['Model Management'],
      params: Type.Object({
        modelId: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          name: Type.String(),
          description: Type.String(),
          provider: Type.String(),
          capabilities: Type.Array(Type.String()),
          contextWindow: Type.Integer(),
          maxTokens: Type.Integer(),
          costPerInputToken: Type.Number(),
          costPerOutputToken: Type.Number(),
          status: Type.String(),
          lastUpdated: Type.String({ format: 'date-time' }),
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    
    const model = fastify.mockDataService.getModel(modelId);
    
    if (!model) {
      return reply.status(404).send({
        error: 'Model not found',
        message: `Model ${modelId} not found`,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      ...model,
      lastUpdated: new Date().toISOString(),
    };
  });
};

export { modelController };