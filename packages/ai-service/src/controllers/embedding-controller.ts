import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const embeddingController: FastifyPluginAsync = async (fastify) => {
  // Generate embeddings
  fastify.post('/api/v1/embeddings', {
    schema: {
      summary: 'Generate embeddings',
      description: 'Generate embeddings for text content',
      tags: ['Embeddings'],
      body: Type.Object({
        input: Type.Array(Type.String()),
        model: Type.Optional(Type.String({ default: 'text-embedding-3-small' })),
        provider: Type.Optional(Type.Union([
          Type.Literal('openai'),
          Type.Literal('azure'),
        ])),
        dimensions: Type.Optional(Type.Integer({ minimum: 1, maximum: 3072 })),
        encoding_format: Type.Optional(Type.Union([
          Type.Literal('float'),
          Type.Literal('base64'),
        ], { default: 'float' })),
        metadata: Type.Optional(Type.Object({
          userId: Type.Optional(Type.String()),
          projectId: Type.Optional(Type.String()),
          purpose: Type.Optional(Type.Union([
            Type.Literal('search'),
            Type.Literal('similarity'),
            Type.Literal('clustering'),
            Type.Literal('classification'),
          ])),
        })),
      }),
      response: {
        200: Type.Object({
          object: Type.Literal('list'),
          data: Type.Array(Type.Object({
            object: Type.Literal('embedding'),
            embedding: Type.Array(Type.Number()),
            index: Type.Integer(),
          })),
          model: Type.String(),
          provider: Type.String(),
          usage: Type.Object({
            promptTokens: Type.Integer(),
            totalTokens: Type.Integer(),
            estimatedCost: Type.Number(),
          }),
          processingTime: Type.Number(),
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const requestBody = request.body as any;
    const embeddingId = crypto.randomUUID();
    
    // Validate input
    if (!requestBody.input || requestBody.input.length === 0) {
      return reply.status(400).send({
        error: 'Invalid input',
        message: 'Input array cannot be empty',
        timestamp: new Date().toISOString(),
      });
    }
    
    if (requestBody.input.length > 100) {
      return reply.status(400).send({
        error: 'Input too large',
        message: 'Maximum 100 inputs allowed per request',
        timestamp: new Date().toISOString(),
      });
    }
    
    try {
      // Generate mock embeddings
      const result = fastify.mockDataService.generateEmbeddings(requestBody);
      
      // Publish embedding generated event
      await fastify.eventService.publishEmbeddingGenerated(embeddingId, {
        inputCount: requestBody.input.length,
        model: result.model,
        provider: result.provider,
        dimensions: requestBody.dimensions || 1536,
        tokens: result.usage,
        processingTime: result.processingTime,
        cost: result.usage.estimatedCost,
        purpose: requestBody.metadata?.purpose || 'search',
      }, {
        userId: requestBody.metadata?.userId,
        projectId: requestBody.metadata?.projectId,
      });
      
      return result;
    } catch (error: any) {
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate embeddings',
        timestamp: new Date().toISOString(),
      });
    }
  });
};

export { embeddingController };