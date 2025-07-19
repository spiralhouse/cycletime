import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const chatController: FastifyPluginAsync = async (fastify) => {
  // Chat completion
  fastify.post('/api/v1/chat/completions', {
    schema: {
      summary: 'Chat completion',
      description: 'Generate chat completion using the best available model',
      tags: ['Chat'],
      body: Type.Object({
        messages: Type.Array(Type.Object({
          role: Type.Union([
            Type.Literal('system'),
            Type.Literal('user'),
            Type.Literal('assistant'),
            Type.Literal('tool'),
          ]),
          content: Type.String(),
          name: Type.Optional(Type.String()),
          toolCallId: Type.Optional(Type.String()),
        })),
        model: Type.Optional(Type.String()),
        provider: Type.Optional(Type.Union([
          Type.Literal('openai'),
          Type.Literal('anthropic'),
          Type.Literal('google'),
          Type.Literal('azure'),
        ])),
        maxTokens: Type.Optional(Type.Integer({ minimum: 1, maximum: 200000, default: 1000 })),
        temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2, default: 1 })),
        topP: Type.Optional(Type.Number({ minimum: 0, maximum: 1, default: 1 })),
        frequencyPenalty: Type.Optional(Type.Number({ minimum: -2, maximum: 2, default: 0 })),
        presencePenalty: Type.Optional(Type.Number({ minimum: -2, maximum: 2, default: 0 })),
        stream: Type.Optional(Type.Boolean({ default: false })),
        contextOptimization: Type.Optional(Type.Object({
          enabled: Type.Boolean({ default: true }),
          maxContextTokens: Type.Integer({ default: 8000 }),
          priority: Type.Union([
            Type.Literal('speed'),
            Type.Literal('quality'),
            Type.Literal('balanced'),
          ], { default: 'balanced' }),
        })),
        metadata: Type.Optional(Type.Object({
          userId: Type.Optional(Type.String()),
          sessionId: Type.Optional(Type.String()),
          projectId: Type.Optional(Type.String()),
          contextId: Type.Optional(Type.String()),
        })),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          object: Type.Literal('chat.completion'),
          created: Type.Integer(),
          model: Type.String(),
          provider: Type.String(),
          choices: Type.Array(Type.Object({
            index: Type.Integer(),
            message: Type.Object({
              role: Type.String(),
              content: Type.String(),
            }),
            finishReason: Type.Union([
              Type.Literal('stop'),
              Type.Literal('length'),
              Type.Literal('function_call'),
              Type.Literal('tool_calls'),
              Type.Literal('content_filter'),
            ]),
          })),
          usage: Type.Object({
            promptTokens: Type.Integer(),
            completionTokens: Type.Integer(),
            totalTokens: Type.Integer(),
            estimatedCost: Type.Number(),
          }),
          metadata: Type.Object({
            processingTime: Type.Number(),
            contextOptimizationUsed: Type.Boolean(),
            originalContextTokens: Type.Integer(),
            optimizedContextTokens: Type.Integer(),
            providerResponseTime: Type.Number(),
          }),
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
        429: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const requestBody = request.body as any;
    const requestId = crypto.randomUUID();
    
    // Publish request received event
    await fastify.eventService.publishAIRequestReceived(requestId, {
      requestType: 'chat_completion',
      provider: requestBody.provider,
      model: requestBody.model,
      tokens: {
        estimated: requestBody.messages.reduce((sum: number, msg: any) => sum + Math.floor(msg.content.length / 4), 0),
        maxTokens: requestBody.maxTokens || 1000,
      },
      priority: 'medium',
      queuePosition: 1,
      userId: requestBody.metadata?.userId,
      sessionId: requestBody.metadata?.sessionId,
      projectId: requestBody.metadata?.projectId,
    });

    // Publish processing event
    await fastify.eventService.publishAIRequestProcessing(requestId, {
      provider: requestBody.provider || 'openai',
      model: requestBody.model || 'gpt-4',
      estimatedMs: 2000,
      contextOptimization: requestBody.contextOptimization,
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    try {
      // Generate mock response
      const response = fastify.mockDataService.generateChatCompletion(requestBody);
      
      // Publish completion events
      await fastify.eventService.publishAIRequestCompleted(requestId, {
        processingTime: response.metadata.processingTime,
        tokens: response.usage,
        cost: response.usage.estimatedCost,
        quality: {
          score: 0.85,
          feedback: 'good',
        },
      }, {
        provider: response.provider,
        model: response.model,
        userId: requestBody.metadata?.userId,
      });

      await fastify.eventService.publishAIResponseGenerated(requestId, response, {
        provider: response.provider,
        model: response.model,
        userId: requestBody.metadata?.userId,
      });

      return response;
    } catch (error: any) {
      // Publish failure event
      await fastify.eventService.publishAIRequestFailed(requestId, {
        type: 'internal_error',
        message: error.message,
        code: 'PROCESSING_ERROR',
        retryable: true,
      }, {
        provider: requestBody.provider || 'openai',
        model: requestBody.model || 'gpt-4',
        userId: requestBody.metadata?.userId,
      });

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process chat completion',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Streaming chat completion
  fastify.post('/api/v1/chat/completions/stream', {
    schema: {
      summary: 'Streaming chat completion',
      description: 'Generate streaming chat completion',
      tags: ['Chat'],
      body: Type.Object({
        messages: Type.Array(Type.Object({
          role: Type.Union([
            Type.Literal('system'),
            Type.Literal('user'),
            Type.Literal('assistant'),
            Type.Literal('tool'),
          ]),
          content: Type.String(),
        })),
        model: Type.Optional(Type.String()),
        provider: Type.Optional(Type.String()),
        maxTokens: Type.Optional(Type.Integer({ minimum: 1, maximum: 200000, default: 1000 })),
        temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2, default: 1 })),
        stream: Type.Literal(true),
        metadata: Type.Optional(Type.Object({
          userId: Type.Optional(Type.String()),
          sessionId: Type.Optional(Type.String()),
          projectId: Type.Optional(Type.String()),
        })),
      }),
      response: {
        200: {
          description: 'Streaming chat completion response',
          content: {
            'text/event-stream': {
              schema: {
                type: 'string',
                format: 'binary',
              },
            },
          },
        },
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const requestBody = request.body as any;
    const requestId = crypto.randomUUID();

    // Set up streaming response
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    // Publish request received event
    await fastify.eventService.publishAIRequestReceived(requestId, {
      requestType: 'chat_completion_stream',
      provider: requestBody.provider,
      model: requestBody.model,
      streaming: true,
      userId: requestBody.metadata?.userId,
    });

    // Generate streaming response
    const mockResponse = fastify.mockDataService.generateChatCompletion(requestBody);
    const content = mockResponse.choices[0].message.content;
    const words = content.split(' ');

    // Stream the response word by word
    for (let i = 0; i < words.length; i++) {
      const chunk = {
        id: mockResponse.id,
        object: 'chat.completion.chunk',
        created: mockResponse.created,
        model: mockResponse.model,
        provider: mockResponse.provider,
        choices: [
          {
            index: 0,
            delta: {
              content: i === 0 ? words[i] : ` ${words[i]}`,
            },
            finishReason: null,
          },
        ],
      };

      reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
      
      // Add delay between chunks
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }

    // Send final chunk
    const finalChunk = {
      id: mockResponse.id,
      object: 'chat.completion.chunk',
      created: mockResponse.created,
      model: mockResponse.model,
      provider: mockResponse.provider,
      choices: [
        {
          index: 0,
          delta: {},
          finishReason: 'stop',
        },
      ],
    };

    reply.raw.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();

    // Publish completion event
    await fastify.eventService.publishAIRequestCompleted(requestId, {
      processingTime: mockResponse.metadata.processingTime,
      tokens: mockResponse.usage,
      cost: mockResponse.usage.estimatedCost,
      streaming: true,
    }, {
      provider: mockResponse.provider,
      model: mockResponse.model,
      userId: requestBody.metadata?.userId,
    });
  });
};

export { chatController };