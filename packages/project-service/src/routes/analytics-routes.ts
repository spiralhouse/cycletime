import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorHandler } from '../utils/error-handler';
import {
  ProjectAnalyticsResponseSchema,
  ProjectForecastingResponseSchema,
  ProjectInsightsResponseSchema
} from '../types';

export async function analyticsRoutes(app: FastifyInstance) {
  // Get project analytics
  app.get('/projects/:projectId/analytics', {
    schema: {
      description: 'Get project analytics and metrics',
      tags: ['Analytics'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['day', 'week', 'month', 'quarter', 'year'], default: 'month' },
          metrics: { type: 'string', description: 'Comma-separated list of metrics to include' }
        }
      },
      response: {
        200: ProjectAnalyticsResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const metrics = query.metrics ? query.metrics.split(',') : undefined;
    const result = await app.services.analytics.getProjectAnalytics(params.projectId, query.timeRange, metrics);
    return reply.send(result);
  }));

  // Get project forecasting
  app.get('/projects/:projectId/forecasting', {
    schema: {
      description: 'Get AI-powered project forecasting and predictions',
      tags: ['Analytics'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          horizon: { type: 'integer', minimum: 7, maximum: 365, default: 90 }
        }
      },
      response: {
        200: ProjectForecastingResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const result = await app.services.analytics.getProjectForecasting(params.projectId, query.horizon);
    return reply.send(result);
  }));

  // Get project insights
  app.get('/projects/:projectId/insights', {
    schema: {
      description: 'Get AI-powered intelligent insights for a project',
      tags: ['Analytics'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['performance', 'risks', 'opportunities', 'team', 'timeline'] }
        }
      },
      response: {
        200: ProjectInsightsResponseSchema
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const result = await app.services.insight.getProjectInsights(params.projectId, query.category);
    return reply.send(result);
  }));

  // Get team performance analytics
  app.get('/projects/:projectId/analytics/team', {
    schema: {
      description: 'Get team performance analytics',
      tags: ['Analytics'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['day', 'week', 'month', 'quarter', 'year'], default: 'month' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            timeRange: { type: 'string' },
            teamMetrics: { type: 'object' },
            insights: { type: 'object' }
          }
        }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    const query = request.query as any;
    
    const result = await app.services.analytics.getTeamPerformanceAnalytics(params.projectId, query.timeRange);
    return reply.send(result);
  }));

  // Get project health score
  app.get('/projects/:projectId/health', {
    schema: {
      description: 'Get project health score and recommendations',
      tags: ['Analytics'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            healthScore: { type: 'number' },
            factors: { type: 'array' },
            recommendations: { type: 'array' }
          }
        }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    
    const result = await app.services.analytics.getProjectHealthScore(params.projectId);
    return reply.send(result);
  }));

  // Get risk analysis
  app.get('/projects/:projectId/risks', {
    schema: {
      description: 'Get AI-powered risk analysis for a project',
      tags: ['Analytics'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            risks: { type: 'array' },
            summary: { type: 'object' }
          }
        }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    
    const result = await app.services.insight.generateRiskAnalysis(params.projectId);
    return reply.send(result);
  }));

  // Get performance recommendations
  app.get('/projects/:projectId/recommendations', {
    schema: {
      description: 'Get AI-powered performance recommendations',
      tags: ['Analytics'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            recommendations: { type: 'array' },
            summary: { type: 'object' }
          }
        }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    
    const result = await app.services.insight.generatePerformanceRecommendations(params.projectId);
    return reply.send(result);
  }));

  // Get predictive insights
  app.get('/projects/:projectId/predictions', {
    schema: {
      description: 'Get AI-powered predictive insights',
      tags: ['Analytics'],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            predictions: { type: 'array' },
            summary: { type: 'object' }
          }
        }
      }
    }
  }, ErrorHandler.handleAsync(async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    
    const result = await app.services.insight.generatePredictiveInsights(params.projectId);
    return reply.send(result);
  }));
}