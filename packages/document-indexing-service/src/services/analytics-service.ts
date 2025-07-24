import { createMockDataService } from './mock-data-service';
import { createEventService } from './event-service';
import { logger } from '@cycletime/shared-utils';

export interface AnalyticsMetrics {
  indexing: {
    totalDocuments: number;
    documentsIndexedToday: number;
    averageIndexingTime: number;
    indexingThroughput: number;
    failureRate: number;
    popularDocumentTypes: Array<{ type: string; count: number }>;
  };
  search: {
    totalQueries: number;
    queriesExecutedToday: number;
    averageQueryTime: number;
    searchThroughput: number;
    popularQueries: Array<{ query: string; count: number }>;
    querySuccessRate: number;
    topSearchTerms: Array<{ term: string; count: number }>;
  };
  embeddings: {
    totalEmbeddings: number;
    embeddingsGeneratedToday: number;
    averageEmbeddingTime: number;
    embeddingThroughput: number;
    uniqueModels: string[];
    modelUsage: Array<{ model: string; count: number }>;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    uptime: number;
    throughput: number;
  };
  storage: {
    totalIndexSize: number;
    documentsCount: number;
    embeddingsCount: number;
    averageDocumentSize: number;
    storageGrowthRate: number;
  };
  users: {
    activeUsers: number;
    uniqueUsersToday: number;
    topUsers: Array<{ userId: string; queryCount: number }>;
    userRetentionRate: number;
  };
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsReport {
  id: string;
  title: string;
  description: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  metrics: AnalyticsMetrics;
  trends: {
    indexingTrend: 'increasing' | 'decreasing' | 'stable';
    searchTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
  };
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;
  generatedAt: Date;
}

export interface QueryAnalytics {
  query: string;
  executionCount: number;
  averageResponseTime: number;
  successRate: number;
  topResults: Array<{
    documentId: string;
    title: string;
    clickCount: number;
    relevanceScore: number;
  }>;
  userSatisfaction: number;
  lastExecuted: Date;
}

export function createAnalyticsService(
  mockDataService: ReturnType<typeof createMockDataService>,
  eventService: ReturnType<typeof createEventService>
) {
  const getMetrics = async (timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<AnalyticsMetrics> => {
    const stats = mockDataService.getStatistics();
    const indices = mockDataService.getIndices();
    const documents = mockDataService.getDocuments();
    const embeddings = mockDataService.getEmbeddings();

    // Generate mock metrics based on timeframe
    const timeMultiplier = {
      hour: 1,
      day: 24,
      week: 168,
      month: 720,
    }[timeframe];

    const metrics: AnalyticsMetrics = {
      indexing: {
        totalDocuments: stats.totalDocuments,
        documentsIndexedToday: Math.floor(Math.random() * 50) + 10,
        averageIndexingTime: stats.averageIndexingTime,
        indexingThroughput: Math.floor(Math.random() * 100) + 50,
        failureRate: Math.random() * 0.05,
        popularDocumentTypes: [
          { type: 'pdf', count: Math.floor(Math.random() * 1000) + 500 },
          { type: 'docx', count: Math.floor(Math.random() * 800) + 300 },
          { type: 'txt', count: Math.floor(Math.random() * 600) + 200 },
          { type: 'md', count: Math.floor(Math.random() * 400) + 100 },
        ],
      },
      search: {
        totalQueries: stats.queryCount,
        queriesExecutedToday: Math.floor(Math.random() * 200) + 100,
        averageQueryTime: stats.averageQueryTime,
        searchThroughput: Math.floor(Math.random() * 500) + 200,
        popularQueries: stats.popularQueries.map(query => ({
          query,
          count: Math.floor(Math.random() * 100) + 10,
        })),
        querySuccessRate: stats.successRate,
        topSearchTerms: [
          { term: 'documentation', count: Math.floor(Math.random() * 50) + 20 },
          { term: 'api', count: Math.floor(Math.random() * 40) + 15 },
          { term: 'guide', count: Math.floor(Math.random() * 30) + 10 },
        ],
      },
      embeddings: {
        totalEmbeddings: stats.totalEmbeddings,
        embeddingsGeneratedToday: Math.floor(Math.random() * 100) + 50,
        averageEmbeddingTime: 0.25,
        embeddingThroughput: Math.floor(Math.random() * 200) + 100,
        uniqueModels: ['text-embedding-3-small', 'text-embedding-3-large'],
        modelUsage: [
          { model: 'text-embedding-3-small', count: Math.floor(Math.random() * 800) + 400 },
          { model: 'text-embedding-3-large', count: Math.floor(Math.random() * 200) + 100 },
        ],
      },
      performance: {
        averageResponseTime: Math.random() * 0.1 + 0.05,
        p95ResponseTime: Math.random() * 0.2 + 0.1,
        p99ResponseTime: Math.random() * 0.5 + 0.2,
        errorRate: stats.errorRate,
        uptime: 0.999,
        throughput: Math.floor(Math.random() * 1000) + 500,
      },
      storage: {
        totalIndexSize: Math.floor(Math.random() * 10000000000) + 1000000000, // 1-10 GB
        documentsCount: documents.length,
        embeddingsCount: embeddings.length,
        averageDocumentSize: Math.floor(Math.random() * 50000) + 10000,
        storageGrowthRate: Math.random() * 0.1 + 0.05,
      },
      users: {
        activeUsers: Math.floor(Math.random() * 100) + 50,
        uniqueUsersToday: Math.floor(Math.random() * 50) + 20,
        topUsers: [
          { userId: 'user-001', queryCount: Math.floor(Math.random() * 50) + 20 },
          { userId: 'user-002', queryCount: Math.floor(Math.random() * 40) + 15 },
          { userId: 'user-003', queryCount: Math.floor(Math.random() * 30) + 10 },
        ],
        userRetentionRate: Math.random() * 0.3 + 0.7,
      },
    };

    // Publish analytics update event
    await eventService.publishAnalyticsUpdated(metrics, { timeframe });

    return metrics;
  };

  const generateReport = async (
    timeframe: { start: Date; end: Date },
    options: {
      includeInsights?: boolean;
      includeTrends?: boolean;
      includeRecommendations?: boolean;
    } = {}
  ): Promise<AnalyticsReport> => {
    const { includeInsights = true, includeTrends = true, includeRecommendations = true } = options;
    
    const reportId = `report-${Date.now()}`;
    const metrics = await getMetrics('day');
    
    const report: AnalyticsReport = {
      id: reportId,
      title: 'Document Indexing Service Analytics Report',
      description: 'Comprehensive analytics report for document indexing service performance',
      timeframe,
      metrics,
      trends: {
        indexingTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
        searchTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
        performanceTrend: Math.random() > 0.3 ? 'improving' : 'stable',
      },
      insights: [],
      generatedAt: new Date(),
    };

    if (includeInsights) {
      report.insights = generateInsights(metrics);
    }

    logger.info('Analytics report generated', { reportId, timeframe });
    
    return report;
  };

  const getTimeSeriesData = async (
    metric: string,
    timeframe: { start: Date; end: Date },
    interval: 'hour' | 'day' | 'week' = 'hour'
  ): Promise<TimeSeriesData[]> => {
    const data: TimeSeriesData[] = [];
    const start = new Date(timeframe.start);
    const end = new Date(timeframe.end);
    
    const intervalMs = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
    }[interval];

    let current = new Date(start);
    while (current <= end) {
      const value = generateMockMetricValue(metric, current);
      data.push({
        timestamp: new Date(current),
        value,
        metadata: {
          interval,
          metric,
        },
      });
      current = new Date(current.getTime() + intervalMs);
    }

    return data;
  };

  const getQueryAnalytics = async (
    query: string,
    timeframe: { start: Date; end: Date }
  ): Promise<QueryAnalytics> => {
    return {
      query,
      executionCount: Math.floor(Math.random() * 100) + 10,
      averageResponseTime: Math.random() * 0.2 + 0.05,
      successRate: Math.random() * 0.1 + 0.9,
      topResults: [
        {
          documentId: 'doc-001',
          title: 'API Documentation',
          clickCount: Math.floor(Math.random() * 20) + 5,
          relevanceScore: Math.random() * 0.3 + 0.7,
        },
        {
          documentId: 'doc-002',
          title: 'User Guide',
          clickCount: Math.floor(Math.random() * 15) + 3,
          relevanceScore: Math.random() * 0.3 + 0.7,
        },
      ],
      userSatisfaction: Math.random() * 0.3 + 0.7,
      lastExecuted: new Date(),
    };
  };

  const getIndexAnalytics = async (indexId: string) => {
    const index = mockDataService.getIndex(indexId);
    const documents = mockDataService.getDocuments(indexId);
    
    if (!index) {
      throw new Error(`Index ${indexId} not found`);
    }

    return {
      indexId,
      name: index.name,
      documentCount: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + (doc.content.length || 0), 0),
      averageDocumentSize: documents.length > 0 ? 
        documents.reduce((sum, doc) => sum + (doc.content.length || 0), 0) / documents.length : 0,
      embeddingModel: index.embeddingModel,
      vectorDimensions: index.vectorDimensions,
      settings: index.settings,
      performance: {
        averageIndexingTime: Math.random() * 2 + 1,
        indexingThroughput: Math.floor(Math.random() * 100) + 50,
        searchPerformance: Math.random() * 0.1 + 0.05,
      },
      usage: {
        queriesLastDay: Math.floor(Math.random() * 100) + 20,
        topQueries: [
          { query: 'documentation', count: Math.floor(Math.random() * 20) + 5 },
          { query: 'api reference', count: Math.floor(Math.random() * 15) + 3 },
        ],
        activeUsers: Math.floor(Math.random() * 50) + 10,
      },
      health: {
        status: index.status,
        lastUpdated: index.updatedAt,
        errorRate: Math.random() * 0.02,
        availability: Math.random() * 0.05 + 0.95,
      },
    };
  };

  const getPerformanceMetrics = async (timeframe: 'hour' | 'day' | 'week' = 'day') => {
    const baseMetrics = {
      responseTime: {
        average: Math.random() * 0.1 + 0.05,
        p50: Math.random() * 0.08 + 0.04,
        p95: Math.random() * 0.2 + 0.1,
        p99: Math.random() * 0.5 + 0.2,
      },
      throughput: {
        requestsPerSecond: Math.floor(Math.random() * 100) + 50,
        documentsPerSecond: Math.floor(Math.random() * 10) + 5,
        embeddingsPerSecond: Math.floor(Math.random() * 50) + 20,
      },
      errors: {
        rate: Math.random() * 0.02,
        count: Math.floor(Math.random() * 10),
        types: [
          { type: 'timeout', count: Math.floor(Math.random() * 5) },
          { type: 'invalid_query', count: Math.floor(Math.random() * 3) },
          { type: 'index_error', count: Math.floor(Math.random() * 2) },
        ],
      },
      resources: {
        cpuUsage: Math.random() * 0.5 + 0.2,
        memoryUsage: Math.random() * 0.4 + 0.3,
        diskUsage: Math.random() * 0.3 + 0.2,
        networkIO: Math.floor(Math.random() * 1000) + 500,
      },
    };

    return {
      timeframe,
      ...baseMetrics,
      timestamp: new Date(),
    };
  };

  const getUsageStats = async (timeframe: 'day' | 'week' | 'month' = 'day') => {
    return {
      timeframe,
      overview: {
        totalRequests: Math.floor(Math.random() * 10000) + 5000,
        uniqueUsers: Math.floor(Math.random() * 200) + 100,
        totalDocuments: mockDataService.getDocuments().length,
        totalQueries: Math.floor(Math.random() * 5000) + 2000,
      },
      operations: {
        indexing: {
          documents: Math.floor(Math.random() * 100) + 50,
          averageTime: Math.random() * 2 + 1,
          successRate: Math.random() * 0.1 + 0.9,
        },
        search: {
          queries: Math.floor(Math.random() * 1000) + 500,
          averageTime: Math.random() * 0.2 + 0.05,
          successRate: Math.random() * 0.05 + 0.95,
        },
        embeddings: {
          generated: Math.floor(Math.random() * 200) + 100,
          averageTime: Math.random() * 0.5 + 0.1,
          successRate: Math.random() * 0.05 + 0.95,
        },
      },
      trends: {
        indexingGrowth: Math.random() * 0.2 + 0.1,
        searchGrowth: Math.random() * 0.3 + 0.2,
        userGrowth: Math.random() * 0.15 + 0.05,
      },
      timestamp: new Date(),
    };
  };

  const exportData = async (
    options: {
      format: 'json' | 'csv' | 'xlsx';
      timeframe: { start: Date; end: Date };
      metrics: string[];
      includeRawData?: boolean;
    }
  ) => {
    const { format, timeframe, metrics, includeRawData = false } = options;
    
    const data = {
      exportId: `export-${Date.now()}`,
      format,
      timeframe,
      metrics,
      generatedAt: new Date(),
      data: {} as Record<string, any>,
    };

    // Generate mock export data
    for (const metric of metrics) {
      data.data[metric] = await getTimeSeriesData(metric, timeframe);
    }

    if (includeRawData) {
      data.data.rawEvents = eventService.getEvents(undefined, 1000);
    }

    logger.info('Data export generated', { exportId: data.exportId, format, metrics });
    
    return data;
  };

  // Helper functions
  const generateInsights = (metrics: AnalyticsMetrics) => {
    const insights = [];

    // Performance insights
    if (metrics.performance.averageResponseTime > 0.2) {
      insights.push({
        type: 'negative' as const,
        title: 'High Response Time',
        description: `Average response time of ${metrics.performance.averageResponseTime.toFixed(3)}s is above optimal range`,
        impact: 'high' as const,
        recommendation: 'Consider optimizing vector database queries or increasing server resources',
      });
    }

    // Usage insights
    if (metrics.search.querySuccessRate < 0.95) {
      insights.push({
        type: 'negative' as const,
        title: 'Low Query Success Rate',
        description: `Query success rate of ${(metrics.search.querySuccessRate * 100).toFixed(1)}% indicates potential issues`,
        impact: 'medium' as const,
        recommendation: 'Review query validation and error handling logic',
      });
    }

    // Growth insights
    if (metrics.storage.storageGrowthRate > 0.1) {
      insights.push({
        type: 'positive' as const,
        title: 'Rapid Growth',
        description: `Storage growth rate of ${(metrics.storage.storageGrowthRate * 100).toFixed(1)}% shows healthy adoption`,
        impact: 'medium' as const,
        recommendation: 'Plan for storage scaling to accommodate continued growth',
      });
    }

    return insights;
  };

  const generateMockMetricValue = (metric: string, timestamp: Date): number => {
    const baseValue = {
      'queries_per_hour': 100,
      'documents_indexed_per_hour': 50,
      'average_response_time': 0.1,
      'error_rate': 0.02,
      'throughput': 500,
      'cpu_usage': 0.4,
      'memory_usage': 0.6,
    }[metric] || 50;

    // Add some randomness and temporal variation
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const timeFactor = 1 + 0.1 * Math.sin(timestamp.getHours() * Math.PI / 12); // Daily cycle
    
    return baseValue * randomFactor * timeFactor;
  };

  return {
    getMetrics,
    generateReport,
    getTimeSeriesData,
    getQueryAnalytics,
    getIndexAnalytics,
    getPerformanceMetrics,
    getUsageStats,
    exportData,
    
    // Real-time monitoring
    getSystemHealth: async () => ({
      status: 'healthy',
      uptime: Math.random() * 0.05 + 0.95,
      activeConnections: Math.floor(Math.random() * 100) + 20,
      queueLength: Math.floor(Math.random() * 10),
      resourceUsage: {
        cpu: Math.random() * 0.5 + 0.2,
        memory: Math.random() * 0.4 + 0.3,
        disk: Math.random() * 0.3 + 0.2,
      },
      lastUpdate: new Date(),
    }),
    
    // Alerting
    checkAlerts: async () => {
      const alerts = [];
      const metrics = await getMetrics('hour');
      
      if (metrics.performance.errorRate > 0.05) {
        alerts.push({
          id: `alert-${Date.now()}`,
          type: 'error_rate_high',
          severity: 'warning',
          message: 'Error rate exceeds 5%',
          value: metrics.performance.errorRate,
          threshold: 0.05,
          triggeredAt: new Date(),
        });
      }
      
      if (metrics.performance.averageResponseTime > 0.5) {
        alerts.push({
          id: `alert-${Date.now()}`,
          type: 'response_time_high',
          severity: 'critical',
          message: 'Average response time exceeds 500ms',
          value: metrics.performance.averageResponseTime,
          threshold: 0.5,
          triggeredAt: new Date(),
        });
      }
      
      return alerts;
    },
    
    // Forecasting
    forecastMetrics: async (metric: string, days: number = 7) => {
      const forecast = [];
      const baseValue = generateMockMetricValue(metric, new Date());
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const trendFactor = 1 + (Math.random() - 0.5) * 0.1; // ±5% daily trend
        const value = baseValue * Math.pow(trendFactor, i);
        
        forecast.push({
          date,
          predictedValue: value,
          confidence: Math.random() * 0.2 + 0.8, // 80-100% confidence
          range: {
            min: value * 0.9,
            max: value * 1.1,
          },
        });
      }
      
      return {
        metric,
        forecast,
        methodology: 'linear_regression',
        generatedAt: new Date(),
      };
    },
  };
}