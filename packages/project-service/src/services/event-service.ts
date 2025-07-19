import { logger } from '@cycletime/shared-utils';
import { ProjectEvent } from '../types/event-types';
import { config } from '../config';

export class EventService {
  private events: ProjectEvent[] = [];
  private subscribers: Map<string, Function[]> = new Map();

  constructor() {
    logger.info('EventService initialized');
  }

  /**
   * Publish an event to all subscribers
   */
  async publishEvent(event: ProjectEvent): Promise<void> {
    try {
      // Store event for testing/debugging
      this.events.push(event);
      
      // Log event
      logger.info('Publishing event:', {
        eventType: event.eventType,
        eventId: event.eventId,
        projectId: (event.data as any).projectId,
        timestamp: event.timestamp
      });

      // Notify subscribers
      const subscribers = this.subscribers.get(event.eventType) || [];
      for (const subscriber of subscribers) {
        try {
          await subscriber(event);
        } catch (error) {
          logger.error('Error in event subscriber:', error);
        }
      }

      // In a real implementation, this would publish to Redis/Queue
      if (config.redis && process.env.NODE_ENV !== 'test') {
        await this.publishToRedis(event);
      }

    } catch (error) {
      logger.error('Error publishing event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(eventType: string, callback: Function): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(callback);
    
    logger.debug(`Subscribed to event type: ${eventType}`);
  }

  /**
   * Unsubscribe from event types
   */
  unsubscribe(eventType: string, callback: Function): void {
    const subscribers = this.subscribers.get(eventType);
    if (subscribers) {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
        logger.debug(`Unsubscribed from event type: ${eventType}`);
      }
    }
  }

  /**
   * Get all events (for testing)
   */
  getEvents(): ProjectEvent[] {
    return [...this.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string): ProjectEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  /**
   * Get events by project ID
   */
  getEventsByProject(projectId: string): ProjectEvent[] {
    return this.events.filter(event => {
      const data = event.data as any;
      return data.projectId === projectId;
    });
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Publish event to Redis (placeholder for real implementation)
   */
  private async publishToRedis(event: ProjectEvent): Promise<void> {
    // In a real implementation, this would:
    // 1. Connect to Redis
    // 2. Publish to appropriate channels
    // 3. Handle retry logic
    // 4. Implement proper error handling
    
    logger.debug('Publishing to Redis:', {
      channel: event.eventType,
      eventId: event.eventId
    });
    
    // Mock Redis publish
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Health check for event system
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      const subscriberCount = Array.from(this.subscribers.values())
        .reduce((sum, subs) => sum + subs.length, 0);
      
      return {
        status: 'healthy',
        details: {
          totalEvents: this.events.length,
          subscriberCount,
          eventTypes: Array.from(this.subscribers.keys())
        }
      };
    } catch (error) {
      logger.error('Event service health check failed:', error);
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }
}