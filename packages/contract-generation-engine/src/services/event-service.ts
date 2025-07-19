import { Redis } from 'redis';
import { 
  ContractGeneratedEvent, 
  ContractValidatedEvent, 
  ContractFailedEvent 
} from '../types/contract-types';
import { logger } from '@cycletime/shared-utils';

export interface EventServiceOptions {
  redis?: Redis;
  eventPrefix?: string;
}

export class EventService {
  private redis: Redis;
  private eventPrefix: string;
  private eventHandlers: Map<string, Array<(event: any) => Promise<void>>>;

  constructor(options: EventServiceOptions = {}) {
    this.redis = options.redis || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.eventPrefix = options.eventPrefix || 'contract-engine:';
    this.eventHandlers = new Map();
  }

  async publishContractGenerated(event: ContractGeneratedEvent): Promise<void> {
    try {
      const eventData = {
        ...event,
        eventType: 'contract.generated',
        timestamp: new Date().toISOString(),
        source: 'contract-generation-engine',
      };

      await this.publishEvent('contract.generated', eventData);
      
      logger.info('Contract generated event published', { 
        contractId: event.contractId,
        serviceName: event.serviceName 
      });
    } catch (error) {
      logger.error('Failed to publish contract generated event', { error, event });
      throw error;
    }
  }

  async publishContractValidated(event: ContractValidatedEvent): Promise<void> {
    try {
      const eventData = {
        ...event,
        eventType: 'contract.validated',
        timestamp: new Date().toISOString(),
        source: 'contract-generation-engine',
      };

      await this.publishEvent('contract.validated', eventData);
      
      logger.info('Contract validated event published', { 
        contractId: event.contractId,
        serviceName: event.serviceName,
        valid: event.valid,
        score: event.score
      });
    } catch (error) {
      logger.error('Failed to publish contract validated event', { error, event });
      throw error;
    }
  }

  async publishContractFailed(event: ContractFailedEvent): Promise<void> {
    try {
      const eventData = {
        ...event,
        eventType: 'contract.failed',
        timestamp: new Date().toISOString(),
        source: 'contract-generation-engine',
      };

      await this.publishEvent('contract.failed', eventData);
      
      logger.info('Contract failed event published', { 
        contractId: event.contractId,
        serviceName: event.serviceName,
        error: event.error,
        stage: event.stage
      });
    } catch (error) {
      logger.error('Failed to publish contract failed event', { error, event });
      throw error;
    }
  }

  async publishContractPublished(event: {
    contractId: string;
    serviceName: string;
    version: string;
    specificationUrl: string;
    documentationUrl?: string;
    publishedAt: string;
    publishedBy: string;
    tags?: string[];
  }): Promise<void> {
    try {
      const eventData = {
        ...event,
        eventType: 'contract.published',
        timestamp: new Date().toISOString(),
        source: 'contract-generation-engine',
      };

      await this.publishEvent('contract.published', eventData);
      
      logger.info('Contract published event published', { 
        contractId: event.contractId,
        serviceName: event.serviceName,
        version: event.version
      });
    } catch (error) {
      logger.error('Failed to publish contract published event', { error, event });
      throw error;
    }
  }

  async publishBoundaryAnalyzed(event: {
    analysisId: string;
    services: string[];
    boundaries: any;
    interactions: any[];
    recommendations: any[];
    analyzedAt: string;
    analyzedBy: string;
  }): Promise<void> {
    try {
      const eventData = {
        ...event,
        eventType: 'boundary.analyzed',
        timestamp: new Date().toISOString(),
        source: 'contract-generation-engine',
      };

      await this.publishEvent('boundary.analyzed', eventData);
      
      logger.info('Boundary analyzed event published', { 
        analysisId: event.analysisId,
        serviceCount: event.services.length,
        interactionCount: event.interactions.length,
        recommendationCount: event.recommendations.length
      });
    } catch (error) {
      logger.error('Failed to publish boundary analyzed event', { error, event });
      throw error;
    }
  }

  async publishStubGenerated(event: {
    contractId: string;
    serviceName: string;
    stubType: string;
    stubUrl?: string;
    generatedAt: string;
    generatedBy: string;
    options?: any;
  }): Promise<void> {
    try {
      const eventData = {
        ...event,
        eventType: 'stub.generated',
        timestamp: new Date().toISOString(),
        source: 'contract-generation-engine',
      };

      await this.publishEvent('stub.generated', eventData);
      
      logger.info('Stub generated event published', { 
        contractId: event.contractId,
        serviceName: event.serviceName,
        stubType: event.stubType
      });
    } catch (error) {
      logger.error('Failed to publish stub generated event', { error, event });
      throw error;
    }
  }

  async subscribeToRequirementUpdates(
    handler: (event: {
      requirementId: string;
      serviceName: string;
      changeType: 'added' | 'modified' | 'removed';
      requirements: string;
      previousRequirements?: string;
      impact: 'low' | 'medium' | 'high';
      updatedAt: string;
      updatedBy: string;
      triggerRegeneration: boolean;
    }) => Promise<void>
  ): Promise<void> {
    try {
      await this.subscribeToEvent('requirement.updated', handler);
      logger.info('Subscribed to requirement updates');
    } catch (error) {
      logger.error('Failed to subscribe to requirement updates', { error });
      throw error;
    }
  }

  async subscribeToArchitectureChanges(
    handler: (event: {
      architectureId: string;
      changeType: 'service-added' | 'service-removed' | 'service-modified' | 'integration-changed' | 'pattern-changed';
      affectedServices: string[];
      architecture: string;
      previousArchitecture?: string;
      impact: 'low' | 'medium' | 'high';
      changedAt: string;
      changedBy: string;
      triggerRegeneration: boolean;
    }) => Promise<void>
  ): Promise<void> {
    try {
      await this.subscribeToEvent('architecture.changed', handler);
      logger.info('Subscribed to architecture changes');
    } catch (error) {
      logger.error('Failed to subscribe to architecture changes', { error });
      throw error;
    }
  }

  async subscribeToServiceDefinitions(
    handler: (event: {
      serviceId: string;
      serviceName: string;
      serviceType: 'rest-api' | 'event-driven' | 'hybrid' | 'cli' | 'web-ui';
      requirements: string;
      architecture?: string;
      dependencies?: string[];
      priority: 'low' | 'medium' | 'high' | 'critical';
      definedAt: string;
      definedBy: string;
      autoGenerateContract: boolean;
    }) => Promise<void>
  ): Promise<void> {
    try {
      await this.subscribeToEvent('service.defined', handler);
      logger.info('Subscribed to service definitions');
    } catch (error) {
      logger.error('Failed to subscribe to service definitions', { error });
      throw error;
    }
  }

  async subscribeToContractRequests(
    handler: (event: {
      requestId: string;
      serviceName: string;
      requestType: 'generate' | 'validate' | 'refine' | 'publish';
      requestData: any;
      requestedAt: string;
      requestedBy: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }) => Promise<void>
  ): Promise<void> {
    try {
      await this.subscribeToEvent('contract.request', handler);
      logger.info('Subscribed to contract requests');
    } catch (error) {
      logger.error('Failed to subscribe to contract requests', { error });
      throw error;
    }
  }

  async publishCustomEvent(eventType: string, eventData: any): Promise<void> {
    try {
      const enrichedEvent = {
        ...eventData,
        eventType,
        timestamp: new Date().toISOString(),
        source: 'contract-generation-engine',
      };

      await this.publishEvent(eventType, enrichedEvent);
      
      logger.info('Custom event published', { eventType, eventData });
    } catch (error) {
      logger.error('Failed to publish custom event', { error, eventType, eventData });
      throw error;
    }
  }

  async subscribeToCustomEvent(eventType: string, handler: (event: any) => Promise<void>): Promise<void> {
    try {
      await this.subscribeToEvent(eventType, handler);
      logger.info('Subscribed to custom event', { eventType });
    } catch (error) {
      logger.error('Failed to subscribe to custom event', { error, eventType });
      throw error;
    }
  }

  private async publishEvent(eventType: string, eventData: any): Promise<void> {
    const channel = this.getEventChannel(eventType);
    const serializedEvent = JSON.stringify(eventData);
    
    await this.redis.publish(channel, serializedEvent);
    
    // Also store in a stream for replay capability
    await this.redis.xadd(
      this.getEventStream(eventType),
      '*',
      'event', serializedEvent
    );
  }

  private async subscribeToEvent(eventType: string, handler: (event: any) => Promise<void>): Promise<void> {
    const channel = this.getEventChannel(eventType);
    
    // Store handler
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
    
    // Subscribe to Redis channel
    await this.redis.subscribe(channel);
    
    this.redis.on('message', async (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const event = JSON.parse(message);
          const handlers = this.eventHandlers.get(eventType) || [];
          
          // Execute all handlers for this event type
          await Promise.all(handlers.map(h => h(event)));
        } catch (error) {
          logger.error('Failed to handle event', { error, eventType, message });
        }
      }
    });
  }

  async getEventHistory(
    eventType: string,
    options: {
      count?: number;
      startTime?: string;
      endTime?: string;
    } = {}
  ): Promise<any[]> {
    try {
      const stream = this.getEventStream(eventType);
      const count = options.count || 100;
      
      // Get events from stream
      const events = await this.redis.xrevrange(stream, '+', '-', 'COUNT', count);
      
      return events.map(([id, fields]) => {
        const [, eventData] = fields;
        return {
          id,
          timestamp: this.extractTimestampFromId(id),
          event: JSON.parse(eventData),
        };
      });
    } catch (error) {
      logger.error('Failed to get event history', { error, eventType, options });
      throw error;
    }
  }

  async replayEvents(
    eventType: string,
    handler: (event: any) => Promise<void>,
    options: {
      startTime?: string;
      endTime?: string;
      batchSize?: number;
    } = {}
  ): Promise<void> {
    try {
      const stream = this.getEventStream(eventType);
      const batchSize = options.batchSize || 100;
      let lastId = '0';
      
      logger.info('Starting event replay', { eventType, options });
      
      while (true) {
        const events = await this.redis.xread('STREAMS', stream, lastId, 'COUNT', batchSize);
        
        if (!events || events.length === 0) {
          break;
        }
        
        const [, eventList] = events[0];
        
        for (const [id, fields] of eventList) {
          const [, eventData] = fields;
          const event = JSON.parse(eventData);
          
          // Check time filters
          if (options.startTime && event.timestamp < options.startTime) {
            continue;
          }
          if (options.endTime && event.timestamp > options.endTime) {
            break;
          }
          
          await handler(event);
          lastId = id;
        }
        
        if (eventList.length < batchSize) {
          break;
        }
      }
      
      logger.info('Event replay completed', { eventType, lastId });
    } catch (error) {
      logger.error('Failed to replay events', { error, eventType, options });
      throw error;
    }
  }

  async getEventStats(eventType?: string): Promise<{
    totalEvents: number;
    eventTypes: Record<string, number>;
    recentEvents: number;
    oldestEvent?: string;
    newestEvent?: string;
  }> {
    try {
      const stats = {
        totalEvents: 0,
        eventTypes: {} as Record<string, number>,
        recentEvents: 0,
        oldestEvent: undefined as string | undefined,
        newestEvent: undefined as string | undefined,
      };
      
      // Get all event streams
      const streams = await this.redis.keys(`${this.eventPrefix}stream:*`);
      
      for (const stream of streams) {
        const streamInfo = await this.redis.xinfo('STREAM', stream);
        const length = parseInt(streamInfo[1] as string);
        
        stats.totalEvents += length;
        
        // Extract event type from stream name
        const eventTypeFromStream = stream.replace(`${this.eventPrefix}stream:`, '');
        stats.eventTypes[eventTypeFromStream] = length;
        
        // Get oldest and newest events
        if (length > 0) {
          const oldest = await this.redis.xrange(stream, '-', '+', 'COUNT', 1);
          const newest = await this.redis.xrevrange(stream, '+', '-', 'COUNT', 1);
          
          if (oldest.length > 0) {
            const oldestTimestamp = this.extractTimestampFromId(oldest[0][0]);
            if (!stats.oldestEvent || oldestTimestamp < stats.oldestEvent) {
              stats.oldestEvent = oldestTimestamp;
            }
          }
          
          if (newest.length > 0) {
            const newestTimestamp = this.extractTimestampFromId(newest[0][0]);
            if (!stats.newestEvent || newestTimestamp > stats.newestEvent) {
              stats.newestEvent = newestTimestamp;
            }
          }
        }
      }
      
      // Count recent events (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      for (const stream of streams) {
        const recentEvents = await this.redis.xrevrange(
          stream,
          '+',
          `(${this.timestampToRedisId(oneHourAgo)}`
        );
        stats.recentEvents += recentEvents.length;
      }
      
      return stats;
    } catch (error) {
      logger.error('Failed to get event stats', { error, eventType });
      throw error;
    }
  }

  async cleanupOldEvents(
    maxAge: number = 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    eventType?: string
  ): Promise<{ deletedEvents: number; processedStreams: number }> {
    try {
      const cutoffTime = new Date(Date.now() - maxAge);
      const cutoffId = this.timestampToRedisId(cutoffTime.toISOString());
      
      let deletedEvents = 0;
      let processedStreams = 0;
      
      // Get streams to clean
      const streamPattern = eventType 
        ? `${this.eventPrefix}stream:${eventType}`
        : `${this.eventPrefix}stream:*`;
      
      const streams = await this.redis.keys(streamPattern);
      
      for (const stream of streams) {
        const beforeCount = await this.redis.xlen(stream);
        
        // Delete old events
        await this.redis.xtrim(stream, 'MINID', cutoffId);
        
        const afterCount = await this.redis.xlen(stream);
        const deleted = beforeCount - afterCount;
        
        deletedEvents += deleted;
        processedStreams++;
        
        logger.debug('Cleaned up old events', {
          stream,
          deletedEvents: deleted,
          remainingEvents: afterCount,
        });
      }
      
      logger.info('Event cleanup completed', {
        deletedEvents,
        processedStreams,
        maxAge,
        eventType,
      });
      
      return { deletedEvents, processedStreams };
    } catch (error) {
      logger.error('Failed to cleanup old events', { error, maxAge, eventType });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: any }> {
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      // Check if we can publish and subscribe
      const testChannel = `${this.eventPrefix}test`;
      await this.redis.publish(testChannel, 'health-check');
      
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          details: { responseTime, message: 'Redis response time is high' },
        };
      }
      
      return {
        status: 'healthy',
        details: { responseTime },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Unsubscribe from all channels
      await this.redis.unsubscribe();
      
      // Close Redis connection
      await this.redis.quit();
      
      // Clear event handlers
      this.eventHandlers.clear();
      
      logger.info('Event service cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup event service', { error });
    }
  }

  private getEventChannel(eventType: string): string {
    return `${this.eventPrefix}channel:${eventType}`;
  }

  private getEventStream(eventType: string): string {
    return `${this.eventPrefix}stream:${eventType}`;
  }

  private extractTimestampFromId(redisId: string): string {
    const timestamp = parseInt(redisId.split('-')[0]);
    return new Date(timestamp).toISOString();
  }

  private timestampToRedisId(timestamp: string): string {
    const ms = new Date(timestamp).getTime();
    return `${ms}-0`;
  }
}