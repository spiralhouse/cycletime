import { v4 as uuidv4 } from 'uuid';
import { logger } from '@cycletime/shared-utils';

export interface EventPayload {
  eventId: string;
  eventType: string;
  timestamp: Date;
  source: string;
  version: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  data: Record<string, any>;
}

export function createEventService() {
  const events: EventPayload[] = [];
  const subscribers: Map<string, Array<(payload: EventPayload) => void>> = new Map();

  const publishEvent = async (eventType: string, data: Record<string, any>, metadata?: Record<string, any>) => {
    const event: EventPayload = {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date(),
      source: 'document-indexing-service',
      version: '1.0.0',
      correlationId: metadata?.correlationId || uuidv4(),
      metadata,
      data,
    };

    events.push(event);
    
    // Publish to subscribers
    const eventSubscribers = subscribers.get(eventType) || [];
    eventSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error calling event subscriber', error as Error, { eventType });
      }
    });

    // Log event for debugging
    logger.info('Event published', {
      eventType,
      eventId: event.eventId,
      correlationId: event.correlationId,
      dataKeys: Object.keys(data),
    });

    return event;
  };

  const subscribe = (eventType: string, callback: (payload: EventPayload) => void) => {
    if (!subscribers.has(eventType)) {
      subscribers.set(eventType, []);
    }
    subscribers.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const eventSubscribers = subscribers.get(eventType);
      if (eventSubscribers) {
        const index = eventSubscribers.indexOf(callback);
        if (index !== -1) {
          eventSubscribers.splice(index, 1);
        }
      }
    };
  };

  const getEvents = (eventType?: string, limit?: number) => {
    let filteredEvents = events;
    
    if (eventType) {
      filteredEvents = events.filter(e => e.eventType === eventType);
    }

    if (limit) {
      filteredEvents = filteredEvents.slice(-limit);
    }

    return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getEvent = (eventId: string) => {
    return events.find(e => e.eventId === eventId);
  };

  // Predefined event publishing methods
  const publishDocumentIndexed = async (documentId: string, indexId: string, metadata?: Record<string, any>) => {
    return publishEvent('document.indexed', {
      documentId,
      indexId,
      indexedAt: new Date(),
      processingTime: Math.random() * 2000 + 500, // 500-2500ms
      chunksCreated: Math.floor(Math.random() * 20) + 5, // 5-25 chunks
      embeddingsGenerated: Math.floor(Math.random() * 20) + 5,
      status: 'completed',
    }, metadata);
  };

  const publishDocumentReindexed = async (documentId: string, indexId: string, metadata?: Record<string, any>) => {
    return publishEvent('document.reindexed', {
      documentId,
      indexId,
      reindexedAt: new Date(),
      processingTime: Math.random() * 1500 + 300,
      chunksUpdated: Math.floor(Math.random() * 15) + 3,
      embeddingsUpdated: Math.floor(Math.random() * 15) + 3,
      changesDetected: Math.floor(Math.random() * 10) + 1,
      status: 'completed',
    }, metadata);
  };

  const publishDocumentRemoved = async (documentId: string, indexId: string, metadata?: Record<string, any>) => {
    return publishEvent('document.removed', {
      documentId,
      indexId,
      removedAt: new Date(),
      chunksDeleted: Math.floor(Math.random() * 20) + 5,
      embeddingsDeleted: Math.floor(Math.random() * 20) + 5,
      status: 'completed',
    }, metadata);
  };

  const publishSearchQueryExecuted = async (query: string, results: any[], metadata?: Record<string, any>) => {
    return publishEvent('search.query.executed', {
      query,
      resultsCount: results.length,
      executedAt: new Date(),
      processingTime: Math.random() * 200 + 50, // 50-250ms
      searchType: metadata?.searchType || 'semantic',
      indexId: metadata?.indexId,
      filters: metadata?.filters || {},
      similarityThreshold: metadata?.similarityThreshold || 0.7,
      highestScore: results.length > 0 ? Math.max(...results.map(r => r.score)) : 0,
      averageScore: results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0,
    }, metadata);
  };

  const publishEmbeddingGenerated = async (text: string, embeddings: number[], metadata?: Record<string, any>) => {
    return publishEvent('embedding.generated', {
      text,
      embeddingId: uuidv4(),
      dimensions: embeddings.length,
      generatedAt: new Date(),
      processingTime: Math.random() * 500 + 100, // 100-600ms
      model: metadata?.model || 'text-embedding-3-small',
      tokens: text.split(' ').length,
      cost: Math.random() * 0.001 + 0.0001, // Small cost estimate
    }, metadata);
  };

  const publishIndexUpdated = async (indexId: string, changeType: 'created' | 'updated' | 'deleted', metadata?: Record<string, any>) => {
    return publishEvent('index.updated', {
      indexId,
      changeType,
      updatedAt: new Date(),
      documentCount: Math.floor(Math.random() * 5000) + 100,
      vectorDimensions: metadata?.vectorDimensions || 1536,
      embeddingModel: metadata?.embeddingModel || 'text-embedding-3-small',
      status: 'active',
    }, metadata);
  };

  const publishIndexingError = async (documentId: string, error: any, metadata?: Record<string, any>) => {
    return publishEvent('indexing.error', {
      documentId,
      error: {
        type: error.type || 'processing_error',
        message: error.message,
        code: error.code || 'IDX_001',
        details: error.details || {},
      },
      occurredAt: new Date(),
      retryable: error.retryable || true,
      retryCount: error.retryCount || 0,
      indexId: metadata?.indexId,
    }, metadata);
  };

  const publishBulkOperationCompleted = async (operationType: string, results: any[], metadata?: Record<string, any>) => {
    return publishEvent('bulk.operation.completed', {
      operationType,
      completedAt: new Date(),
      totalItems: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      processingTime: Math.random() * 10000 + 2000, // 2-12 seconds
      batchId: metadata?.batchId || uuidv4(),
      indexId: metadata?.indexId,
    }, metadata);
  };

  const publishAnalyticsUpdated = async (metrics: Record<string, any>, metadata?: Record<string, any>) => {
    return publishEvent('analytics.updated', {
      metrics,
      updatedAt: new Date(),
      timeframe: metadata?.timeframe || 'hour',
      indexId: metadata?.indexId,
      queryCount: metrics.queryCount || 0,
      averageResponseTime: metrics.averageResponseTime || 0,
      popularQueries: metrics.popularQueries || [],
    }, metadata);
  };

  return {
    publishEvent,
    subscribe,
    getEvents,
    getEvent,
    
    // Predefined publishers
    publishDocumentIndexed,
    publishDocumentReindexed,
    publishDocumentRemoved,
    publishSearchQueryExecuted,
    publishEmbeddingGenerated,
    publishIndexUpdated,
    publishIndexingError,
    publishBulkOperationCompleted,
    publishAnalyticsUpdated,
    
    // Utility methods
    getEventStats: () => ({
      totalEvents: events.length,
      eventTypes: Array.from(new Set(events.map(e => e.eventType))),
      recentEvents: events.slice(-10),
      subscriberCount: Array.from(subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
    }),
    
    clearEvents: () => {
      events.length = 0;
    },
    
    clearSubscribers: () => {
      subscribers.clear();
    },
  };
}