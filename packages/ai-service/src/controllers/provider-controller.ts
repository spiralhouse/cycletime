import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const providerController: FastifyPluginAsync = async (fastify) => {
  // List AI providers
  fastify.get('/api/v1/providers', {
    schema: {
      summary: 'List AI providers',
      description: 'Get list of available AI providers and their status',
      tags: ['Provider Management'],
      response: {
        200: Type.Object({
          providers: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            status: Type.Union([
              Type.Literal('active'),
              Type.Literal('inactive'),
              Type.Literal('error'),
              Type.Literal('configuring'),
            ]),
            health: Type.Union([
              Type.Literal('healthy'),
              Type.Literal('degraded'),
              Type.Literal('unhealthy'),
            ]),
            lastHealthCheck: Type.String({ format: 'date-time' }),
            capabilities: Type.Array(Type.String()),
            models: Type.Array(Type.String()),
            configuration: Type.Object({
              configured: Type.Boolean(),
              lastConfigured: Type.Optional(Type.String({ format: 'date-time' })),
            }),
            metrics: Type.Object({
              requestCount: Type.Integer(),
              errorRate: Type.Number(),
              averageResponseTime: Type.Number(),
            }),
          })),
          totalProviders: Type.Integer(),
          activeProviders: Type.Integer(),
          lastUpdated: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (_request, _reply) => {
    const providers = fastify.mockDataService.getProviders();
    const activeProviders = providers.filter(p => p.status === 'active').length;

    return {
      providers,
      totalProviders: providers.length,
      activeProviders,
      lastUpdated: new Date().toISOString(),
    };
  });

  // Get provider details
  fastify.get('/api/v1/providers/:providerId', {
    schema: {
      summary: 'Get provider details',
      description: 'Get details of a specific AI provider',
      tags: ['Provider Management'],
      params: Type.Object({
        providerId: Type.Union([
          Type.Literal('openai'),
          Type.Literal('anthropic'),
          Type.Literal('google'),
          Type.Literal('azure'),
        ]),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          name: Type.String(),
          description: Type.String(),
          status: Type.String(),
          health: Type.String(),
          lastHealthCheck: Type.String({ format: 'date-time' }),
          capabilities: Type.Array(Type.String()),
          models: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            description: Type.String(),
            capabilities: Type.Array(Type.String()),
            contextWindow: Type.Integer(),
            maxTokens: Type.Integer(),
            status: Type.String(),
          })),
          configuration: Type.Object({
            configured: Type.Boolean(),
            lastConfigured: Type.Optional(Type.String({ format: 'date-time' })),
            requiredFields: Type.Array(Type.String()),
          }),
          metrics: Type.Object({
            requestCount: Type.Integer(),
            successRate: Type.Number(),
            errorRate: Type.Number(),
            averageResponseTime: Type.Number(),
            totalTokensUsed: Type.Integer(),
            costEstimate: Type.Number(),
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
    const { providerId } = request.params as { providerId: string };
    const provider = fastify.mockDataService.getProvider(providerId);

    if (!provider) {
      return reply.status(404).send({
        error: 'Provider not found',
        message: `Provider ${providerId} not found`,
        timestamp: new Date().toISOString(),
      });
    }

    const models = fastify.mockDataService.getModels(providerId);
    
    return {
      ...provider,
      description: `${provider.name} AI provider with advanced capabilities`,
      models: models.map(model => ({
        id: model.id,
        name: model.name,
        description: model.description,
        capabilities: model.capabilities,
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        status: model.status,
      })),
      configuration: {
        ...provider.configuration,
        requiredFields: ['apiKey'],
      },
      metrics: {
        ...provider.metrics,
        successRate: 1 - provider.metrics.errorRate,
        totalTokensUsed: Math.floor(Math.random() * 1000000) + 100000,
        costEstimate: Math.random() * 100 + 50,
      },
    };
  });

  // Configure provider
  fastify.post('/api/v1/providers/:providerId/configure', {
    schema: {
      summary: 'Configure AI provider',
      description: 'Configure API keys and settings for an AI provider',
      tags: ['Provider Management'],
      params: Type.Object({
        providerId: Type.Union([
          Type.Literal('openai'),
          Type.Literal('anthropic'),
          Type.Literal('google'),
          Type.Literal('azure'),
        ]),
      }),
      body: Type.Object({
        apiKey: Type.String(),
        baseUrl: Type.Optional(Type.String()),
        organization: Type.Optional(Type.String()),
        project: Type.Optional(Type.String()),
        region: Type.Optional(Type.String()),
        rateLimit: Type.Optional(Type.Object({
          requestsPerMinute: Type.Integer(),
          tokensPerMinute: Type.Integer(),
        })),
        defaultModel: Type.Optional(Type.String()),
        maxRetries: Type.Optional(Type.Integer({ default: 3 })),
        timeout: Type.Optional(Type.Integer({ default: 30000 })),
      }),
      response: {
        200: Type.Object({
          providerId: Type.String(),
          configured: Type.Boolean(),
          message: Type.String(),
          testResult: Type.Object({
            success: Type.Boolean(),
            responseTime: Type.Number(),
            error: Type.Optional(Type.String()),
          }),
          configuredAt: Type.String({ format: 'date-time' }),
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const configuration = request.body as any;

    const provider = fastify.mockDataService.getProvider(providerId);
    if (!provider) {
      return reply.status(400).send({
        error: 'Provider not found',
        message: `Provider ${providerId} not found`,
        timestamp: new Date().toISOString(),
      });
    }

    // Simulate configuration
    const success = fastify.mockDataService.configureProvider(providerId, configuration);
    const testResult = fastify.mockDataService.testProvider(providerId);

    // Publish configuration event
    await fastify.eventService.publishProviderConfigured(providerId, {
      ...configuration,
      testResult,
    }, {
      userId: request.headers['x-user-id'] as string,
    });

    return {
      providerId,
      configured: success,
      message: success ? 'Provider configured successfully' : 'Configuration failed',
      testResult,
      configuredAt: new Date().toISOString(),
    };
  });

  // Test provider
  fastify.post('/api/v1/providers/:providerId/test', {
    schema: {
      summary: 'Test AI provider',
      description: 'Test connectivity and functionality of an AI provider',
      tags: ['Provider Management'],
      params: Type.Object({
        providerId: Type.Union([
          Type.Literal('openai'),
          Type.Literal('anthropic'),
          Type.Literal('google'),
          Type.Literal('azure'),
        ]),
      }),
      response: {
        200: Type.Object({
          providerId: Type.String(),
          success: Type.Boolean(),
          responseTime: Type.Number(),
          message: Type.String(),
          testDetails: Type.Object({
            modelsAvailable: Type.Integer(),
            testModel: Type.String(),
            testQuery: Type.String(),
            testResponse: Type.String(),
          }),
          testedAt: Type.String({ format: 'date-time' }),
          error: Type.Optional(Type.String()),
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
          timestamp: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    
    const provider = fastify.mockDataService.getProvider(providerId);
    if (!provider) {
      return reply.status(400).send({
        error: 'Provider not found',
        message: `Provider ${providerId} not found`,
        timestamp: new Date().toISOString(),
      });
    }

    const testResult = fastify.mockDataService.testProvider(providerId);
    const models = fastify.mockDataService.getModels(providerId);
    
    // Publish test event
    await fastify.eventService.publishEvent('ai.provider.tested', {
      providerId,
      success: testResult.success,
      responseTime: testResult.responseTime,
      error: testResult.error,
    });

    return {
      providerId,
      success: testResult.success,
      responseTime: testResult.responseTime,
      message: testResult.success ? 'Provider test successful' : 'Provider test failed',
      testDetails: {
        modelsAvailable: models.length,
        testModel: models[0]?.id || 'unknown',
        testQuery: 'Hello, can you respond to this test message?',
        testResponse: testResult.success ? 'Test response received successfully' : 'No response received',
      },
      testedAt: new Date().toISOString(),
      error: testResult.error,
    };
  });
};

export { providerController };