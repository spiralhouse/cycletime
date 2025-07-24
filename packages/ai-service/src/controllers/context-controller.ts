import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const contextController: FastifyPluginAsync = async (fastify) => {
  // Analyze context
  fastify.post('/api/v1/context/analyze', {
    schema: {
      summary: 'Analyze context',
      description: 'Analyze context and optimize for AI consumption',
      tags: ['Context Optimization'],
      body: Type.Object({
        projectId: Type.String({ format: 'uuid' }),
        documents: Type.Array(Type.Object({
          id: Type.String(),
          content: Type.String(),
          title: Type.String(),
          type: Type.Union([
            Type.Literal('markdown'),
            Type.Literal('text'),
            Type.Literal('code'),
            Type.Literal('json'),
            Type.Literal('yaml'),
            Type.Literal('typescript'),
            Type.Literal('javascript'),
            Type.Literal('python'),
            Type.Literal('java'),
            Type.Literal('go'),
            Type.Literal('rust'),
          ]),
          language: Type.Optional(Type.String()),
          metadata: Type.Optional(Type.Object({})),
          lastModified: Type.Optional(Type.String({ format: 'date-time' })),
          priority: Type.Optional(Type.Number({ minimum: 0, maximum: 1, default: 0.5 })),
        })),
        analysisType: Type.Optional(Type.Union([
          Type.Literal('full'),
          Type.Literal('incremental'),
          Type.Literal('targeted'),
        ], { default: 'full' })),
        optimization: Type.Optional(Type.Object({
          targetModel: Type.Optional(Type.String()),
          maxTokens: Type.Optional(Type.Integer()),
          chunkingStrategy: Type.Optional(Type.Union([
            Type.Literal('semantic'),
            Type.Literal('fixed'),
            Type.Literal('adaptive'),
          ], { default: 'semantic' })),
          priority: Type.Optional(Type.Union([
            Type.Literal('speed'),
            Type.Literal('quality'),
            Type.Literal('balanced'),
          ], { default: 'balanced' })),
        })),
      }),
      response: {
        202: Type.Object({
          contextId: Type.String({ format: 'uuid' }),
          projectId: Type.String({ format: 'uuid' }),
          status: Type.Union([
            Type.Literal('pending'),
            Type.Literal('processing'),
            Type.Literal('completed'),
            Type.Literal('failed'),
          ]),
          documentsCount: Type.Integer(),
          estimatedChunks: Type.Integer(),
          estimatedCompletion: Type.String({ format: 'date-time' }),
          processingStage: Type.Union([
            Type.Literal('queued'),
            Type.Literal('tokenizing'),
            Type.Literal('chunking'),
            Type.Literal('analyzing'),
            Type.Literal('optimizing'),
            Type.Literal('completed'),
          ]),
          createdAt: Type.String({ format: 'date-time' }),
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, _reply) => {
    const requestBody = request.body as any;
    
    const result = fastify.mockDataService.createContext(requestBody.projectId, requestBody.documents);
    
    // Publish context analysis started event
    await fastify.eventService.publishContextAnalysisStarted(result.contextId, {
      documentsCount: requestBody.documents.length,
      analysisType: requestBody.analysisType || 'full',
      estimatedMs: 30000,
      configuration: requestBody.optimization,
    });
    
    return {
      contextId: result.contextId,
      projectId: requestBody.projectId,
      status: result.status,
      documentsCount: requestBody.documents.length,
      estimatedChunks: Math.ceil(requestBody.documents.length * 5),
      estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
      processingStage: 'queued',
      createdAt: new Date().toISOString(),
    };
  });

  // Optimize context
  fastify.post('/api/v1/context/:contextId/optimize', {
    schema: {
      summary: 'Optimize context',
      description: 'Optimize context for specific model and use case',
      tags: ['Context Optimization'],
      params: Type.Object({
        contextId: Type.String({ format: 'uuid' }),
      }),
      body: Type.Object({
        targetModel: Type.String(),
        maxTokens: Type.Integer({ minimum: 100, maximum: 200000 }),
        useCase: Type.Optional(Type.Union([
          Type.Literal('code_generation'),
          Type.Literal('documentation'),
          Type.Literal('debugging'),
          Type.Literal('analysis'),
          Type.Literal('chat'),
        ])),
        priority: Type.Optional(Type.Union([
          Type.Literal('speed'),
          Type.Literal('quality'),
          Type.Literal('balanced'),
        ], { default: 'balanced' })),
        preserveStructure: Type.Optional(Type.Boolean({ default: true })),
        compressionLevel: Type.Optional(Type.Union([
          Type.Literal('none'),
          Type.Literal('light'),
          Type.Literal('medium'),
          Type.Literal('aggressive'),
        ], { default: 'medium' })),
      }),
      response: {
        200: Type.Object({
          contextId: Type.String({ format: 'uuid' }),
          optimizedAt: Type.String({ format: 'date-time' }),
          optimization: Type.Object({
            originalTokens: Type.Integer(),
            optimizedTokens: Type.Integer(),
            compressionRatio: Type.Number(),
            chunksReduced: Type.Integer(),
            relevancePreserved: Type.Number({ minimum: 0, maximum: 1 }),
          }),
          metadata: Type.Object({
            targetModel: Type.String(),
            useCase: Type.Optional(Type.String()),
            processingTime: Type.Number(),
          }),
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { contextId } = request.params as { contextId: string };
    const requestBody = request.body as any;
    
    const result = fastify.mockDataService.optimizeContext(contextId, requestBody);
    
    if (!result) {
      return reply.status(404).send({
        error: 'Context not found',
        message: `Context ${contextId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Publish context optimized event
    await fastify.eventService.publishContextOptimized(contextId, result.optimization, {
      targetModel: requestBody.targetModel,
      useCase: requestBody.useCase,
    });
    
    return {
      ...result,
      metadata: {
        targetModel: requestBody.targetModel,
        useCase: requestBody.useCase,
        processingTime: 2000 + Math.random() * 3000,
      },
    };
  });

  // Get context chunks
  fastify.get('/api/v1/context/:contextId/chunks', {
    schema: {
      summary: 'Get context chunks',
      description: 'Get optimized context chunks for AI consumption',
      tags: ['Context Optimization'],
      params: Type.Object({
        contextId: Type.String({ format: 'uuid' }),
      }),
      querystring: Type.Object({
        maxTokens: Type.Optional(Type.Integer({ minimum: 100, maximum: 200000, default: 8000 })),
        priority: Type.Optional(Type.Number({ minimum: 0, maximum: 1, default: 0.5 })),
      }),
      response: {
        200: Type.Object({
          contextId: Type.String({ format: 'uuid' }),
          chunks: Type.Array(Type.Object({
            id: Type.String({ format: 'uuid' }),
            content: Type.String(),
            tokens: Type.Integer(),
            relevanceScore: Type.Number({ minimum: 0, maximum: 1 }),
            priority: Type.Number({ minimum: 0, maximum: 1 }),
            documentId: Type.String(),
            documentTitle: Type.String(),
            documentType: Type.String(),
            chunkIndex: Type.Integer(),
            metadata: Type.Object({
              keywords: Type.Array(Type.String()),
              entities: Type.Array(Type.String()),
              concepts: Type.Array(Type.String()),
              complexity: Type.Number({ minimum: 0, maximum: 1 }),
            }),
          })),
          totalTokens: Type.Integer(),
          totalChunks: Type.Integer(),
          generatedAt: Type.String({ format: 'date-time' }),
        }),
        404: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { contextId } = request.params as { contextId: string };
    const { maxTokens, priority } = request.query as any;
    
    const result = fastify.mockDataService.getContextChunks(contextId, maxTokens);
    
    if (!result) {
      return reply.status(404).send({
        error: 'Context not found',
        message: `Context ${contextId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Filter chunks by priority if specified
    if (priority) {
      result.chunks = result.chunks.filter((chunk: any) => chunk.priority >= priority);
      result.totalChunks = result.chunks.length;
      result.totalTokens = result.chunks.reduce((sum: number, chunk: any) => sum + chunk.tokens, 0);
    }
    
    return result;
  });
};

export { contextController };