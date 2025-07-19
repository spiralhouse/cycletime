import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const projectController: FastifyPluginAsync = async (fastify) => {
  // Analyze project
  fastify.post('/api/v1/projects/:projectId/analyze', {
    schema: {
      summary: 'Analyze project',
      description: 'Perform intelligent analysis of a project',
      tags: ['Project Analysis'],
      params: Type.Object({
        projectId: Type.String({ format: 'uuid' }),
      }),
      body: Type.Object({
        analysisType: Type.Optional(Type.Union([
          Type.Literal('full'),
          Type.Literal('incremental'),
          Type.Literal('targeted'),
        ], { default: 'full' })),
        scope: Type.Optional(Type.Array(Type.Union([
          Type.Literal('code'),
          Type.Literal('documentation'),
          Type.Literal('issues'),
          Type.Literal('metrics'),
          Type.Literal('performance'),
          Type.Literal('security'),
        ]), { default: ['code', 'documentation', 'issues', 'metrics'] })),
        timeframe: Type.Optional(Type.Union([
          Type.Literal('day'),
          Type.Literal('week'),
          Type.Literal('month'),
          Type.Literal('quarter'),
          Type.Literal('year'),
        ], { default: 'month' })),
        priority: Type.Optional(Type.Union([
          Type.Literal('low'),
          Type.Literal('medium'),
          Type.Literal('high'),
          Type.Literal('urgent'),
        ], { default: 'medium' })),
      }),
      response: {
        202: Type.Object({
          analysisId: Type.String({ format: 'uuid' }),
          projectId: Type.String({ format: 'uuid' }),
          status: Type.Union([
            Type.Literal('pending'),
            Type.Literal('processing'),
            Type.Literal('completed'),
            Type.Literal('failed'),
          ]),
          analysisType: Type.String(),
          scope: Type.Array(Type.String()),
          estimatedCompletion: Type.String({ format: 'date-time' }),
          createdAt: Type.String({ format: 'date-time' }),
        }),
      },
    },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const requestBody = request.body as any;
    
    const result = fastify.mockDataService.startProjectAnalysis(projectId, requestBody);
    
    // Publish project analysis started event
    await fastify.eventService.publishProjectAnalysisStarted(result.analysisId, {
      analysisType: requestBody.analysisType || 'full',
      scope: requestBody.scope || ['code', 'documentation', 'issues', 'metrics'],
      estimatedMs: 60000,
      configuration: {
        depth: 'medium',
        includeArchived: false,
        maxComplexity: 10,
      },
    });
    
    return {
      analysisId: result.analysisId,
      projectId,
      status: result.status,
      analysisType: requestBody.analysisType || 'full',
      scope: requestBody.scope || ['code', 'documentation', 'issues', 'metrics'],
      estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  });

  // Get project insights
  fastify.get('/api/v1/projects/:projectId/insights', {
    schema: {
      summary: 'Get project insights',
      description: 'Get AI-generated insights for a project',
      tags: ['Project Analysis'],
      params: Type.Object({
        projectId: Type.String({ format: 'uuid' }),
      }),
      querystring: Type.Object({
        timeframe: Type.Optional(Type.Union([
          Type.Literal('day'),
          Type.Literal('week'),
          Type.Literal('month'),
          Type.Literal('quarter'),
          Type.Literal('year'),
        ], { default: 'month' })),
        category: Type.Optional(Type.Union([
          Type.Literal('performance'),
          Type.Literal('quality'),
          Type.Literal('complexity'),
          Type.Literal('trends'),
          Type.Literal('recommendations'),
        ])),
      }),
      response: {
        200: Type.Object({
          projectId: Type.String({ format: 'uuid' }),
          timeframe: Type.String(),
          insights: Type.Array(Type.Object({
            id: Type.String({ format: 'uuid' }),
            category: Type.String(),
            title: Type.String(),
            description: Type.String(),
            confidence: Type.Number({ minimum: 0, maximum: 1 }),
            impact: Type.String(),
            trend: Type.String(),
            actionable: Type.Boolean(),
            generatedAt: Type.String({ format: 'date-time' }),
          })),
          summary: Type.Object({
            totalInsights: Type.Integer(),
            averageConfidence: Type.Number({ minimum: 0, maximum: 1 }),
            lastAnalyzed: Type.String({ format: 'date-time' }),
          }),
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
    const { projectId } = request.params as { projectId: string };
    const { timeframe, category } = request.query as any;
    
    const insights = fastify.mockDataService.getProjectInsights(projectId, timeframe);
    
    const filteredInsights = category 
      ? insights.filter(insight => insight.category === category)
      : insights;
    
    // Publish insights generated event
    await fastify.eventService.publishProjectInsightsGenerated(filteredInsights, {
      projectId,
      timeframe: timeframe || 'month',
      category,
    });
    
    return {
      projectId,
      timeframe: timeframe || 'month',
      insights: filteredInsights,
      summary: {
        totalInsights: filteredInsights.length,
        averageConfidence: filteredInsights.reduce((sum, insight) => sum + insight.confidence, 0) / filteredInsights.length,
        lastAnalyzed: new Date().toISOString(),
      },
      generatedAt: new Date().toISOString(),
    };
  });

  // Get project recommendations
  fastify.get('/api/v1/projects/:projectId/recommendations', {
    schema: {
      summary: 'Get project recommendations',
      description: 'Get AI-generated recommendations for a project',
      tags: ['Project Analysis'],
      params: Type.Object({
        projectId: Type.String({ format: 'uuid' }),
      }),
      querystring: Type.Object({
        priority: Type.Optional(Type.Union([
          Type.Literal('low'),
          Type.Literal('medium'),
          Type.Literal('high'),
          Type.Literal('critical'),
        ])),
        category: Type.Optional(Type.Union([
          Type.Literal('performance'),
          Type.Literal('security'),
          Type.Literal('maintainability'),
          Type.Literal('scalability'),
          Type.Literal('architecture'),
        ])),
      }),
      response: {
        200: Type.Object({
          projectId: Type.String({ format: 'uuid' }),
          recommendations: Type.Array(Type.Object({
            id: Type.String({ format: 'uuid' }),
            title: Type.String(),
            description: Type.String(),
            category: Type.String(),
            priority: Type.String(),
            effort: Type.String(),
            impact: Type.String(),
            confidence: Type.Number({ minimum: 0, maximum: 1 }),
            reasoning: Type.String(),
            actionItems: Type.Array(Type.String()),
            generatedAt: Type.String({ format: 'date-time' }),
          })),
          summary: Type.Object({
            totalRecommendations: Type.Integer(),
            byPriority: Type.Object({
              critical: Type.Integer(),
              high: Type.Integer(),
              medium: Type.Integer(),
              low: Type.Integer(),
            }),
          }),
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
    const { projectId } = request.params as { projectId: string };
    const { priority, category } = request.query as any;
    
    let recommendations = fastify.mockDataService.getProjectRecommendations(projectId);
    
    // Filter by priority if specified
    if (priority) {
      recommendations = recommendations.filter(rec => rec.priority === priority);
    }
    
    // Filter by category if specified
    if (category) {
      recommendations = recommendations.filter(rec => rec.category === category);
    }
    
    // Calculate summary
    const byPriority = recommendations.reduce((acc: any, rec) => {
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
    
    // Publish recommendations generated event
    await fastify.eventService.publishProjectRecommendationsGenerated(recommendations, {
      projectId,
      priority,
      category,
    });
    
    return {
      projectId,
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        byPriority,
      },
      generatedAt: new Date().toISOString(),
    };
  });

  // Get project metrics
  fastify.get('/api/v1/projects/:projectId/metrics', {
    schema: {
      summary: 'Get project metrics',
      description: 'Get AI-analyzed metrics for a project',
      tags: ['Project Analysis'],
      params: Type.Object({
        projectId: Type.String({ format: 'uuid' }),
      }),
      querystring: Type.Object({
        timeframe: Type.Optional(Type.Union([
          Type.Literal('day'),
          Type.Literal('week'),
          Type.Literal('month'),
          Type.Literal('quarter'),
          Type.Literal('year'),
        ], { default: 'month' })),
        metric: Type.Optional(Type.Union([
          Type.Literal('complexity'),
          Type.Literal('velocity'),
          Type.Literal('quality'),
          Type.Literal('technical-debt'),
          Type.Literal('performance'),
        ])),
      }),
      response: {
        200: Type.Object({
          projectId: Type.String({ format: 'uuid' }),
          timeframe: Type.String(),
          metrics: Type.Object({
            complexity: Type.Optional(Type.Object({
              cyclomaticComplexity: Type.Number(),
              cognitiveComplexity: Type.Number(),
              maintainabilityIndex: Type.Number(),
              technicalDebtRatio: Type.Number(),
              codeSmells: Type.Integer(),
              duplicatedLines: Type.Integer(),
              linesOfCode: Type.Integer(),
              files: Type.Integer(),
              functions: Type.Integer(),
              classes: Type.Integer(),
            })),
            velocity: Type.Optional(Type.Object({
              commitsPerDay: Type.Number(),
              linesAddedPerDay: Type.Number(),
              linesDeletedPerDay: Type.Number(),
              filesChangedPerDay: Type.Number(),
              issuesClosedPerDay: Type.Number(),
              pullRequestsPerDay: Type.Number(),
              averageLeadTime: Type.Number(),
              averageCycleTime: Type.Number(),
              deploymentFrequency: Type.Number(),
            })),
            quality: Type.Optional(Type.Object({
              testCoverage: Type.Number(),
              passedTests: Type.Integer(),
              failedTests: Type.Integer(),
              skippedTests: Type.Integer(),
              bugs: Type.Integer(),
              vulnerabilities: Type.Integer(),
              codeReviewCoverage: Type.Number(),
              documentationCoverage: Type.Number(),
              qualityGateStatus: Type.String(),
            })),
          }),
          trends: Type.Object({
            complexity: Type.Union([
              Type.Literal('improving'),
              Type.Literal('stable'),
              Type.Literal('declining'),
            ]),
            velocity: Type.Union([
              Type.Literal('improving'),
              Type.Literal('stable'),
              Type.Literal('declining'),
            ]),
            quality: Type.Union([
              Type.Literal('improving'),
              Type.Literal('stable'),
              Type.Literal('declining'),
            ]),
          }),
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
    const { projectId } = request.params as { projectId: string };
    const { timeframe, metric } = request.query as any;
    
    // Generate mock metrics
    const mockMetrics = {
      complexity: {
        cyclomaticComplexity: 12.5,
        cognitiveComplexity: 8.3,
        maintainabilityIndex: 72.1,
        technicalDebtRatio: 0.15,
        codeSmells: 23,
        duplicatedLines: 156,
        linesOfCode: 12450,
        files: 89,
        functions: 234,
        classes: 45,
      },
      velocity: {
        commitsPerDay: 3.2,
        linesAddedPerDay: 145.8,
        linesDeletedPerDay: 67.3,
        filesChangedPerDay: 8.5,
        issuesClosedPerDay: 2.1,
        pullRequestsPerDay: 1.8,
        averageLeadTime: 3.5,
        averageCycleTime: 2.1,
        deploymentFrequency: 2.3,
      },
      quality: {
        testCoverage: 0.85,
        passedTests: 234,
        failedTests: 3,
        skippedTests: 5,
        bugs: 12,
        vulnerabilities: 2,
        codeReviewCoverage: 0.92,
        documentationCoverage: 0.68,
        qualityGateStatus: 'passed',
      },
    };
    
    const trends = {
      complexity: 'stable',
      velocity: 'improving',
      quality: 'improving',
    };
    
    // Filter by specific metric if requested
    const filteredMetrics = metric 
      ? { [metric]: mockMetrics[metric as keyof typeof mockMetrics] }
      : mockMetrics;
    
    return {
      projectId,
      timeframe: timeframe || 'month',
      metrics: filteredMetrics,
      trends,
      generatedAt: new Date().toISOString(),
    };
  });
};

export { projectController };