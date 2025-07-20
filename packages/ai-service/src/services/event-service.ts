import { logger } from '@cycletime/shared-utils';
import { EventEmitter } from 'events';

export interface AIEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  version: string;
  correlationId?: string;
  metadata?: any;
  [key: string]: any;
}

export class EventService extends EventEmitter {
  private events: AIEvent[] = [];
  private maxEvents: number = 1000;

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  async publishEvent(eventType: string, payload: any): Promise<void> {
    const event: AIEvent = {
      eventId: crypto.randomUUID(),
      eventType,
      timestamp: new Date().toISOString(),
      source: 'ai-service',
      version: '1.0.0',
      correlationId: payload.correlationId || crypto.randomUUID(),
      ...payload,
    };

    // Store event in memory (in production, this would go to Redis/message queue)
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Emit event for local listeners
    this.emit(eventType, event);
    this.emit('*', event);

    logger.info('Event published', {
      eventId: event.eventId,
      eventType,
      correlationId: event.correlationId,
    });

    // In production, publish to Redis channels
    // await this.publishToRedis(eventType, event);
  }

  async publishAIRequestReceived(requestId: string, metadata: any): Promise<void> {
    await this.publishEvent('ai.request.received', {
      requestId,
      requestType: metadata.requestType || 'chat_completion',
      provider: metadata.provider,
      model: metadata.model,
      tokens: metadata.tokens,
      priority: metadata.priority || 'medium',
      queuePosition: metadata.queuePosition || 1,
      metadata,
    });
  }

  async publishAIRequestProcessing(requestId: string, metadata: any): Promise<void> {
    await this.publishEvent('ai.request.processing', {
      requestId,
      provider: metadata.provider,
      model: metadata.model,
      processingStarted: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + (metadata.estimatedMs || 5000)).toISOString(),
      contextOptimization: metadata.contextOptimization,
      metadata,
    });
  }

  async publishAIRequestCompleted(requestId: string, result: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.request.completed', {
      requestId,
      provider: metadata.provider,
      model: metadata.model,
      processingTime: result.processingTime || 1000,
      tokens: result.tokens || {
        prompt: 100,
        completion: 50,
        total: 150,
      },
      cost: result.cost || 0.001,
      quality: result.quality || {
        score: 0.85,
        feedback: 'good',
      },
      metadata,
    });
  }

  async publishAIRequestFailed(requestId: string, error: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.request.failed', {
      requestId,
      provider: metadata.provider,
      model: metadata.model,
      error: {
        type: error.type || 'internal_error',
        message: error.message,
        code: error.code,
        details: error.details,
      },
      processingTime: metadata.processingTime || 0,
      retryable: error.retryable || false,
      retryAttempt: metadata.retryAttempt || 0,
      metadata,
    });
  }

  async publishAIResponseGenerated(requestId: string, response: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.response.generated', {
      requestId,
      responseId: response.id,
      provider: metadata.provider,
      model: metadata.model,
      responseLength: response.choices?.[0]?.message?.content?.length || 0,
      tokens: response.usage || {
        generated: 50,
        total: 150,
      },
      quality: {
        coherence: 0.8 + Math.random() * 0.2,
        relevance: 0.7 + Math.random() * 0.3,
        accuracy: 0.85 + Math.random() * 0.15,
      },
      finishReason: response.choices?.[0]?.finishReason || 'stop',
      metadata,
    });
  }

  async publishContextAnalysisStarted(contextId: string, metadata: any): Promise<void> {
    await this.publishEvent('ai.context.analysis.started', {
      contextId,
      documentsCount: metadata.documentsCount || 0,
      analysisType: metadata.analysisType || 'full',
      estimatedCompletion: new Date(Date.now() + (metadata.estimatedMs || 30000)).toISOString(),
      configuration: metadata.configuration,
      metadata,
    });
  }

  async publishContextAnalysisCompleted(contextId: string, result: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.context.analysis.completed', {
      contextId,
      documentsCount: result.documentsCount || 0,
      chunksGenerated: result.chunksGenerated || 0,
      totalTokens: result.totalTokens || 0,
      processingTime: result.processingTime || 5000,
      quality: {
        averageRelevance: result.averageRelevance || 0.75,
        chunksOptimized: result.chunksOptimized || 0,
        tokensReduced: result.tokensReduced || 0,
      },
      metadata,
    });
  }

  async publishContextOptimized(contextId: string, optimization: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.context.optimized', {
      contextId,
      targetModel: optimization.targetModel,
      optimization: {
        originalTokens: optimization.originalTokens || 0,
        optimizedTokens: optimization.optimizedTokens || 0,
        compressionRatio: optimization.compressionRatio || 0,
        chunksReduced: optimization.chunksReduced || 0,
        relevancePreserved: optimization.relevancePreserved || 0.8,
      },
      processingTime: optimization.processingTime || 2000,
      metadata,
    });
  }

  async publishProviderHealthChanged(providerId: string, healthChange: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.provider.health.changed', {
      provider: providerId,
      previousHealth: healthChange.previousHealth,
      currentHealth: healthChange.currentHealth,
      healthCheck: {
        responseTime: healthChange.responseTime || 0,
        errorRate: healthChange.errorRate || 0,
        availability: healthChange.availability || 1,
        lastSuccessful: healthChange.lastSuccessful || new Date().toISOString(),
        errors: healthChange.errors || [],
      },
      impact: {
        affectedModels: healthChange.affectedModels || [],
        estimatedDowntime: healthChange.estimatedDowntime || 0,
        mitigationStrategy: healthChange.mitigationStrategy || 'none',
      },
      metadata,
    });
  }

  async publishProviderConfigured(providerId: string, configuration: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.provider.configured', {
      provider: providerId,
      configuration: {
        modelsEnabled: configuration.modelsEnabled || [],
        defaultModel: configuration.defaultModel,
        rateLimit: configuration.rateLimit,
        region: configuration.region,
      },
      testResult: {
        success: configuration.testResult?.success || false,
        responseTime: configuration.testResult?.responseTime || 0,
        modelsAvailable: configuration.testResult?.modelsAvailable || 0,
      },
      metadata,
    });
  }

  async publishProviderError(providerId: string, error: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.provider.error', {
      provider: providerId,
      error: {
        type: error.type || 'unknown',
        message: error.message,
        code: error.code,
        details: error.details,
      },
      impact: {
        severity: error.severity || 'medium',
        affectedRequests: error.affectedRequests || 0,
        estimatedResolution: error.estimatedResolution || new Date(Date.now() + 3600000).toISOString(),
      },
      recovery: {
        automatic: error.recovery?.automatic || false,
        strategy: error.recovery?.strategy || 'manual',
        fallbackProvider: error.recovery?.fallbackProvider,
      },
      metadata,
    });
  }

  async publishModelAvailabilityChanged(modelId: string, availabilityChange: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.model.availability.changed', {
      model: modelId,
      provider: availabilityChange.provider,
      previousStatus: availabilityChange.previousStatus,
      currentStatus: availabilityChange.currentStatus,
      reason: availabilityChange.reason || 'unknown',
      impact: {
        activeRequests: availabilityChange.impact?.activeRequests || 0,
        fallbackModel: availabilityChange.impact?.fallbackModel,
        migrationRequired: availabilityChange.impact?.migrationRequired || false,
      },
      metadata,
    });
  }

  async publishProjectAnalysisStarted(analysisId: string, metadata: any): Promise<void> {
    await this.publishEvent('ai.analysis.project.started', {
      analysisId,
      analysisType: metadata.analysisType || 'full',
      scope: metadata.scope || ['code'],
      estimatedCompletion: new Date(Date.now() + (metadata.estimatedMs || 60000)).toISOString(),
      configuration: metadata.configuration,
      metadata,
    });
  }

  async publishProjectAnalysisCompleted(analysisId: string, result: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.analysis.project.completed', {
      analysisId,
      processingTime: result.processingTime || 30000,
      results: {
        insights: result.insights || 0,
        recommendations: result.recommendations || 0,
        metrics: result.metrics || 0,
        complexity: result.complexity || 0,
        quality: result.quality || 0,
      },
      statistics: {
        filesAnalyzed: result.statistics?.filesAnalyzed || 0,
        linesOfCode: result.statistics?.linesOfCode || 0,
        tokensProcessed: result.statistics?.tokensProcessed || 0,
        modelsUsed: result.statistics?.modelsUsed || [],
      },
      metadata,
    });
  }

  async publishProjectInsightsGenerated(insights: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.analysis.insights.generated', {
      insightsCount: insights.length || 0,
      categories: insights.map((i: any) => i.category) || [],
      averageConfidence: insights.reduce((sum: number, i: any) => sum + (i.confidence || 0), 0) / (insights.length || 1),
      highImpactInsights: insights.filter((i: any) => i.impact === 'high').length || 0,
      actionableInsights: insights.filter((i: any) => i.actionable).length || 0,
      trends: insights.filter((i: any) => i.trend).map((i: any) => ({
        metric: i.category,
        trend: i.trend,
        confidence: i.confidence,
      })) || [],
      metadata,
    });
  }

  async publishProjectRecommendationsGenerated(recommendations: any, metadata: any): Promise<void> {
    const priorities = recommendations.reduce((acc: any, rec: any) => {
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    }, {});

    const efforts = recommendations.reduce((acc: any, rec: any) => {
      acc[rec.effort] = (acc[rec.effort] || 0) + 1;
      return acc;
    }, {});

    await this.publishEvent('ai.analysis.recommendations.generated', {
      recommendationsCount: recommendations.length || 0,
      categories: [...new Set(recommendations.map((r: any) => r.category))],
      priorities: {
        critical: priorities.critical || 0,
        high: priorities.high || 0,
        medium: priorities.medium || 0,
        low: priorities.low || 0,
      },
      averageConfidence: recommendations.reduce((sum: number, r: any) => sum + (r.confidence || 0), 0) / (recommendations.length || 1),
      implementationEffort: {
        low: efforts.low || 0,
        medium: efforts.medium || 0,
        high: efforts.high || 0,
      },
      metadata,
    });
  }

  async publishEmbeddingGenerated(embeddingId: string, result: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.embedding.generated', {
      embeddingId,
      inputCount: result.inputCount || 0,
      model: result.model,
      provider: result.provider,
      dimensions: result.dimensions || 1536,
      tokens: result.tokens || {
        total: 0,
        perInput: [],
      },
      processingTime: result.processingTime || 1000,
      cost: result.cost || 0,
      purpose: result.purpose || 'search',
      metadata,
    });
  }

  async publishUsageTracked(usage: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.usage.tracked', {
      usageId: crypto.randomUUID(),
      provider: usage.provider,
      model: usage.model,
      requestType: usage.requestType,
      tokens: usage.tokens,
      cost: usage.cost,
      duration: usage.duration,
      success: usage.success,
      quality: usage.quality,
      metadata,
    });
  }

  async publishRateLimitExceeded(providerId: string, limitInfo: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.rate-limit.exceeded', {
      provider: providerId,
      limitType: limitInfo.limitType,
      current: limitInfo.current,
      limit: limitInfo.limit,
      resetTime: limitInfo.resetTime,
      requestsQueued: limitInfo.requestsQueued || 0,
      estimatedDelay: limitInfo.estimatedDelay || 0,
      fallbackProvider: limitInfo.fallbackProvider,
      metadata,
    });
  }

  async publishServiceHealthChanged(healthChange: any, metadata: any): Promise<void> {
    await this.publishEvent('ai.service.health.changed', {
      previousHealth: healthChange.previousHealth,
      currentHealth: healthChange.currentHealth,
      components: healthChange.components,
      metrics: healthChange.metrics,
      impact: healthChange.impact,
      metadata,
    });
  }

  // Event retrieval methods
  getEvents(filter?: { eventType?: string; limit?: number; since?: string }): AIEvent[] {
    let filteredEvents = this.events;

    if (filter?.eventType) {
      filteredEvents = filteredEvents.filter(e => e.eventType === filter.eventType);
    }

    if (filter?.since) {
      const sinceDate = new Date(filter.since);
      filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) > sinceDate);
    }

    if (filter?.limit) {
      filteredEvents = filteredEvents.slice(-filter.limit);
    }

    return filteredEvents;
  }

  getRecentEvents(limit: number = 50): AIEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByType(eventType: string, limit: number = 50): AIEvent[] {
    return this.events
      .filter(e => e.eventType === eventType)
      .slice(-limit);
  }

  getEventsByCorrelationId(correlationId: string): AIEvent[] {
    return this.events.filter(e => e.correlationId === correlationId);
  }

  // Cleanup
  clearEvents(): void {
    this.events = [];
  }

  // Statistics
  getEventStatistics(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    const recentEvents = this.events.filter(e => new Date(e.timestamp) > oneHourAgo);
    const dailyEvents = this.events.filter(e => new Date(e.timestamp) > oneDayAgo);

    const eventTypeStats = this.events.reduce((acc: any, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      eventTypes: Object.keys(eventTypeStats).length,
      eventTypeDistribution: eventTypeStats,
      oldestEvent: this.events[0]?.timestamp,
      newestEvent: this.events[this.events.length - 1]?.timestamp,
    };
  }
}