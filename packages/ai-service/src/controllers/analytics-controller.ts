import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const analyticsController: FastifyPluginAsync = async (fastify) => {
  // Get AI service analytics
  fastify.get('/api/v1/analytics', {
    schema: {
      summary: 'Get AI service analytics',
      description: 'Get analytics and metrics for AI service usage',
      tags: ['Analytics'],
      querystring: Type.Object({
        timeframe: Type.Optional(Type.Union([
          Type.Literal('hour'),
          Type.Literal('day'),
          Type.Literal('week'),
          Type.Literal('month'),
        ], { default: 'day' })),
        provider: Type.Optional(Type.Union([
          Type.Literal('openai'),
          Type.Literal('anthropic'),
          Type.Literal('google'),
          Type.Literal('azure'),
        ])),
        model: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({
          timeframe: Type.String(),
          overview: Type.Object({
            totalRequests: Type.Integer(),
            totalTokens: Type.Integer(),
            totalCost: Type.Number(),
            successRate: Type.Number({ minimum: 0, maximum: 1 }),
            averageResponseTime: Type.Number(),
          }),
          providers: Type.Array(Type.Object({
            provider: Type.String(),
            requests: Type.Integer(),
            tokens: Type.Integer(),
            cost: Type.Number(),
            successRate: Type.Number(),
            averageResponseTime: Type.Number(),
          })),
          models: Type.Array(Type.Object({
            model: Type.String(),
            provider: Type.String(),
            requests: Type.Integer(),
            tokens: Type.Integer(),
            cost: Type.Number(),
            successRate: Type.Number(),
            averageResponseTime: Type.Number(),
          })),
          usage: Type.Object({
            peakHours: Type.Array(Type.Integer()),
            usageByDay: Type.Object({}, { additionalProperties: true }),
            topUsers: Type.Array(Type.Object({
              userId: Type.String(),
              requests: Type.Integer(),
              tokens: Type.Integer(),
            })),
          }),
          errors: Type.Object({
            totalErrors: Type.Integer(),
            errorRate: Type.Number(),
            errorsByType: Type.Object({}, { additionalProperties: true }),
            errorsByProvider: Type.Object({}, { additionalProperties: true }),
          }),
          generatedAt: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { timeframe, provider, model } = request.query as any;
    
    // Generate analytics data
    const analytics = fastify.mockDataService.getAnalytics(timeframe || 'day');
    
    // Filter by provider if specified
    if (provider) {
      analytics.providers = analytics.providers.filter((p: any) => p.provider === provider);
      analytics.models = analytics.models.filter((m: any) => m.provider === provider);
    }
    
    // Filter by model if specified
    if (model) {
      analytics.models = analytics.models.filter((m: any) => m.model === model);
    }
    
    return analytics;
  });
};

export { analyticsController };