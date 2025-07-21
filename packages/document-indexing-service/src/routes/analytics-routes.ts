import { FastifyInstance } from 'fastify';

export async function analyticsRoutes(app: FastifyInstance) {
  // Get analytics metrics
  app.get('/', {
    schema: {
      summary: 'Get analytics metrics',
      description: 'Get analytics and metrics for the document indexing service',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['hour', 'day', 'week', 'month'],
            default: 'day',
          },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['indexing', 'search', 'embeddings', 'performance', 'storage', 'users'],
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            timeframe: { type: 'string' },
            metrics: {
              type: 'object',
              properties: {
                indexing: {
                  type: 'object',
                  properties: {
                    totalDocuments: { type: 'integer' },
                    documentsIndexedToday: { type: 'integer' },
                    averageIndexingTime: { type: 'number' },
                    indexingThroughput: { type: 'integer' },
                    failureRate: { type: 'number' },
                    popularDocumentTypes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          count: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
                search: {
                  type: 'object',
                  properties: {
                    totalQueries: { type: 'integer' },
                    queriesExecutedToday: { type: 'integer' },
                    averageQueryTime: { type: 'number' },
                    searchThroughput: { type: 'integer' },
                    popularQueries: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          query: { type: 'string' },
                          count: { type: 'integer' },
                        },
                      },
                    },
                    querySuccessRate: { type: 'number' },
                    topSearchTerms: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          term: { type: 'string' },
                          count: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
                embeddings: {
                  type: 'object',
                  properties: {
                    totalEmbeddings: { type: 'integer' },
                    embeddingsGeneratedToday: { type: 'integer' },
                    averageEmbeddingTime: { type: 'number' },
                    embeddingThroughput: { type: 'integer' },
                    uniqueModels: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    modelUsage: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          model: { type: 'string' },
                          count: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
                performance: {
                  type: 'object',
                  properties: {
                    averageResponseTime: { type: 'number' },
                    p95ResponseTime: { type: 'number' },
                    p99ResponseTime: { type: 'number' },
                    errorRate: { type: 'number' },
                    uptime: { type: 'number' },
                    throughput: { type: 'number' },
                  },
                },
                storage: {
                  type: 'object',
                  properties: {
                    totalIndexSize: { type: 'integer' },
                    documentsCount: { type: 'integer' },
                    embeddingsCount: { type: 'integer' },
                    averageDocumentSize: { type: 'number' },
                    storageGrowthRate: { type: 'number' },
                  },
                },
                users: {
                  type: 'object',
                  properties: {
                    activeUsers: { type: 'integer' },
                    uniqueUsersToday: { type: 'integer' },
                    topUsers: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          userId: { type: 'string' },
                          queryCount: { type: 'integer' },
                        },
                      },
                    },
                    userRetentionRate: { type: 'number' },
                  },
                },
              },
            },
            generatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { timeframe, metrics: requestedMetrics } = request.query as { 
      timeframe?: string; 
      metrics?: string[]; 
    };
    
    const metrics = await app.analyticsService!.getMetrics(timeframe as any);
    
    // Filter metrics if specific ones were requested
    let filteredMetrics = metrics;
    if (requestedMetrics && requestedMetrics.length > 0) {
      filteredMetrics = {} as any;
      requestedMetrics.forEach(metric => {
        if (metric in metrics) {
          (filteredMetrics as any)[metric] = (metrics as any)[metric];
        }
      });
    }
    
    reply.send({
      timeframe: timeframe || 'day',
      metrics: filteredMetrics,
      generatedAt: new Date().toISOString(),
    });
  });

  // Generate analytics report
  app.post('/report', {
    schema: {
      summary: 'Generate analytics report',
      description: 'Generate a comprehensive analytics report',
      tags: ['Analytics'],
      body: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date-time' },
              end: { type: 'string', format: 'date-time' },
            },
            required: ['start', 'end'],
          },
          options: {
            type: 'object',
            properties: {
              includeInsights: { type: 'boolean', default: true },
              includeTrends: { type: 'boolean', default: true },
              includeRecommendations: { type: 'boolean', default: true },
            },
          },
        },
        required: ['timeframe'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            report: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                timeframe: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', format: 'date-time' },
                    end: { type: 'string', format: 'date-time' },
                  },
                },
                metrics: { type: 'object' },
                trends: {
                  type: 'object',
                  properties: {
                    indexingTrend: { 
                      type: 'string', 
                      enum: ['increasing', 'decreasing', 'stable'] 
                    },
                    searchTrend: { 
                      type: 'string', 
                      enum: ['increasing', 'decreasing', 'stable'] 
                    },
                    performanceTrend: { 
                      type: 'string', 
                      enum: ['improving', 'degrading', 'stable'] 
                    },
                  },
                },
                insights: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { 
                        type: 'string', 
                        enum: ['positive', 'negative', 'neutral'] 
                      },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      impact: { 
                        type: 'string', 
                        enum: ['high', 'medium', 'low'] 
                      },
                      recommendation: { type: 'string' },
                    },
                  },
                },
                generatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { timeframe, options } = request.body as any;
    
    try {
      const report = await app.analyticsService!.generateReport(timeframe, options);
      reply.send({ report });
    } catch (error) {
      reply.code(400).send({
        error: 'Report Generation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get time series data
  app.get('/timeseries/:metric', {
    schema: {
      summary: 'Get time series data',
      description: 'Get time series data for a specific metric',
      tags: ['Analytics'],
      params: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
        },
        required: ['metric'],
      },
      querystring: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' },
          interval: { 
            type: 'string', 
            enum: ['hour', 'day', 'week'],
            default: 'hour'
          },
        },
        required: ['start', 'end'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  value: { type: 'number' },
                  metadata: { type: 'object' },
                },
              },
            },
            interval: { type: 'string' },
            totalDataPoints: { type: 'integer' },
            generatedAt: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { metric } = request.params as { metric: string };
    const { start, end, interval } = request.query as { 
      start: string; 
      end: string; 
      interval?: string; 
    };
    
    try {
      const data = await app.analyticsService!.getTimeSeriesData(
        metric,
        { start: new Date(start), end: new Date(end) },
        interval as any
      );
      
      reply.send({
        metric,
        data,
        interval: interval || 'hour',
        totalDataPoints: data.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      reply.code(400).send({
        error: 'Time Series Data Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get query analytics
  app.get('/query/:query', {
    schema: {
      summary: 'Get query analytics',
      description: 'Get analytics for a specific search query',
      tags: ['Analytics'],
      params: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
      querystring: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date-time' },
          end: { type: 'string', format: 'date-time' },
        },
        required: ['start', 'end'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            executionCount: { type: 'integer' },
            averageResponseTime: { type: 'number' },
            successRate: { type: 'number' },
            topResults: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  documentId: { type: 'string' },
                  title: { type: 'string' },
                  clickCount: { type: 'integer' },
                  relevanceScore: { type: 'number' },
                },
              },
            },
            userSatisfaction: { type: 'number' },
            lastExecuted: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { query } = request.params as { query: string };
    const { start, end } = request.query as { start: string; end: string };
    
    try {
      const analytics = await app.analyticsService!.getQueryAnalytics(
        decodeURIComponent(query),
        { start: new Date(start), end: new Date(end) }
      );
      
      reply.send(analytics);
    } catch (error) {
      reply.code(400).send({
        error: 'Query Analytics Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get index analytics
  app.get('/index/:indexId', {
    schema: {
      summary: 'Get index analytics',
      description: 'Get analytics for a specific index',
      tags: ['Analytics'],
      params: {
        type: 'object',
        properties: {
          indexId: { type: 'string' },
        },
        required: ['indexId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            indexId: { type: 'string' },
            name: { type: 'string' },
            documentCount: { type: 'integer' },
            totalSize: { type: 'integer' },
            averageDocumentSize: { type: 'number' },
            embeddingModel: { type: 'string' },
            vectorDimensions: { type: 'integer' },
            settings: { type: 'object' },
            performance: {
              type: 'object',
              properties: {
                averageIndexingTime: { type: 'number' },
                indexingThroughput: { type: 'integer' },
                searchPerformance: { type: 'number' },
              },
            },
            usage: {
              type: 'object',
              properties: {
                queriesLastDay: { type: 'integer' },
                topQueries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      count: { type: 'integer' },
                    },
                  },
                },
                activeUsers: { type: 'integer' },
              },
            },
            health: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                lastUpdated: { type: 'string', format: 'date-time' },
                errorRate: { type: 'number' },
                availability: { type: 'number' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    
    try {
      const analytics = await app.analyticsService!.getIndexAnalytics(indexId);
      reply.send(analytics);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: 'Index Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        reply.code(400).send({
          error: 'Index Analytics Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get performance metrics
  app.get('/performance', {
    schema: {
      summary: 'Get performance metrics',
      description: 'Get detailed performance metrics',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeframe: { 
            type: 'string', 
            enum: ['hour', 'day', 'week'],
            default: 'day'
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            timeframe: { type: 'string' },
            responseTime: {
              type: 'object',
              properties: {
                average: { type: 'number' },
                p50: { type: 'number' },
                p95: { type: 'number' },
                p99: { type: 'number' },
              },
            },
            throughput: {
              type: 'object',
              properties: {
                requestsPerSecond: { type: 'integer' },
                documentsPerSecond: { type: 'integer' },
                embeddingsPerSecond: { type: 'integer' },
              },
            },
            errors: {
              type: 'object',
              properties: {
                rate: { type: 'number' },
                count: { type: 'integer' },
                types: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
            resources: {
              type: 'object',
              properties: {
                cpuUsage: { type: 'number' },
                memoryUsage: { type: 'number' },
                diskUsage: { type: 'number' },
                networkIO: { type: 'integer' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { timeframe } = request.query as { timeframe?: string };
    
    const metrics = await app.analyticsService!.getPerformanceMetrics(timeframe as any);
    reply.send(metrics);
  });

  // Get usage statistics
  app.get('/usage', {
    schema: {
      summary: 'Get usage statistics',
      description: 'Get usage statistics and trends',
      tags: ['Analytics'],
      querystring: {
        type: 'object',
        properties: {
          timeframe: { 
            type: 'string', 
            enum: ['day', 'week', 'month'],
            default: 'day'
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            timeframe: { type: 'string' },
            overview: {
              type: 'object',
              properties: {
                totalRequests: { type: 'integer' },
                uniqueUsers: { type: 'integer' },
                totalDocuments: { type: 'integer' },
                totalQueries: { type: 'integer' },
              },
            },
            operations: {
              type: 'object',
              properties: {
                indexing: {
                  type: 'object',
                  properties: {
                    documents: { type: 'integer' },
                    averageTime: { type: 'number' },
                    successRate: { type: 'number' },
                  },
                },
                search: {
                  type: 'object',
                  properties: {
                    queries: { type: 'integer' },
                    averageTime: { type: 'number' },
                    successRate: { type: 'number' },
                  },
                },
                embeddings: {
                  type: 'object',
                  properties: {
                    generated: { type: 'integer' },
                    averageTime: { type: 'number' },
                    successRate: { type: 'number' },
                  },
                },
              },
            },
            trends: {
              type: 'object',
              properties: {
                indexingGrowth: { type: 'number' },
                searchGrowth: { type: 'number' },
                userGrowth: { type: 'number' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { timeframe } = request.query as { timeframe?: string };
    
    const stats = await app.analyticsService!.getUsageStats(timeframe as any);
    reply.send(stats);
  });

  // Export analytics data
  app.post('/export', {
    schema: {
      summary: 'Export analytics data',
      description: 'Export analytics data in various formats',
      tags: ['Analytics'],
      body: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['json', 'csv', 'xlsx'],
            default: 'json'
          },
          timeframe: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date-time' },
              end: { type: 'string', format: 'date-time' },
            },
            required: ['start', 'end'],
          },
          metrics: {
            type: 'array',
            items: { type: 'string' },
          },
          includeRawData: { type: 'boolean', default: false },
        },
        required: ['timeframe', 'metrics'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            exportId: { type: 'string' },
            format: { type: 'string' },
            timeframe: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' },
              },
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
            },
            generatedAt: { type: 'string', format: 'date-time' },
            data: { type: 'object' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const options = request.body as any;
    
    try {
      const exportData = await app.analyticsService!.exportData(options);
      reply.send(exportData);
    } catch (error) {
      reply.code(400).send({
        error: 'Export Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get system health
  app.get('/health', {
    schema: {
      summary: 'Get system health metrics',
      description: 'Get real-time system health metrics',
      tags: ['Analytics'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            uptime: { type: 'number' },
            activeConnections: { type: 'integer' },
            queueLength: { type: 'integer' },
            resourceUsage: {
              type: 'object',
              properties: {
                cpu: { type: 'number' },
                memory: { type: 'number' },
                disk: { type: 'number' },
              },
            },
            lastUpdate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const health = await app.analyticsService!.getSystemHealth();
    reply.send(health);
  });

  // Get alerts
  app.get('/alerts', {
    schema: {
      summary: 'Get system alerts',
      description: 'Get current system alerts and warnings',
      tags: ['Analytics'],
      response: {
        200: {
          type: 'object',
          properties: {
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'number' },
                  threshold: { type: 'number' },
                  triggeredAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            totalAlerts: { type: 'integer' },
            criticalAlerts: { type: 'integer' },
            warningAlerts: { type: 'integer' },
            checkedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const alerts = await app.analyticsService!.checkAlerts();
    
    reply.send({
      alerts,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      warningAlerts: alerts.filter(a => a.severity === 'warning').length,
      checkedAt: new Date().toISOString(),
    });
  });

  // Get forecast
  app.get('/forecast/:metric', {
    schema: {
      summary: 'Get metric forecast',
      description: 'Get forecast for a specific metric',
      tags: ['Analytics'],
      params: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
        },
        required: ['metric'],
      },
      querystring: {
        type: 'object',
        properties: {
          days: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 30,
            default: 7
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            forecast: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', format: 'date-time' },
                  predictedValue: { type: 'number' },
                  confidence: { type: 'number' },
                  range: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                    },
                  },
                },
              },
            },
            methodology: { type: 'string' },
            generatedAt: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { metric } = request.params as { metric: string };
    const { days } = request.query as { days?: number };
    
    try {
      const forecast = await app.analyticsService!.forecastMetrics(metric, days);
      reply.send(forecast);
    } catch (error) {
      reply.code(400).send({
        error: 'Forecast Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });
}