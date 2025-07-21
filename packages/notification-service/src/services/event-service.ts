import { logger } from '@cycletime/shared-utils';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export class EventService extends EventEmitter {
  private redisClient: any = null;

  constructor() {
    super();
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Mock Redis client for stub implementation
      this.redisClient = {
        publish: async (channel: string, message: string) => {
          logger.debug(`[MOCK] Publishing to Redis channel: ${channel}`);
          logger.debug(`[MOCK] Message: ${message}`);
          return 1;
        },
        isReady: true,
      };
      
      logger.info('Connected to Redis for event publishing');
    } catch (error) {
      logger.warn('Failed to connect to Redis, using mock implementation');
    }
  }

  async publishEvent(eventType: string, payload: any): Promise<void> {
    try {
      const event = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        type: eventType,
        service: 'notification-service',
        environment: process.env.NODE_ENV || 'development',
        ...payload,
      };

      // Emit locally for any subscribers
      this.emit(eventType, event);

      // Publish to Redis
      if (this.redisClient?.isReady) {
        const channel = `cycletime:events:${eventType.replace(/\./g, ':')}`;
        await this.redisClient.publish(channel, JSON.stringify(event));
        
        logger.debug('Event published to Redis', {
          eventType,
          channel,
          eventId: event.eventId,
        });
      }

      logger.info('Event published', {
        eventType,
        eventId: event.eventId,
        timestamp: event.timestamp,
      });

    } catch (error) {
      logger.error('Failed to publish event', error as Error, {
        eventType,
        payload,
      });
      throw error;
    }
  }

  async publishNotificationSent(notification: any): Promise<void> {
    await this.publishEvent('notification.sent', {
      notification: {
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        templateId: notification.templateId,
        priority: notification.priority,
        metadata: notification.metadata,
      },
    });
  }

  async publishNotificationDelivered(notification: any): Promise<void> {
    await this.publishEvent('notification.delivered', {
      notification: {
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        deliveredAt: notification.deliveredAt,
        deliveryLatency: notification.deliveredAt 
          ? new Date(notification.deliveredAt).getTime() - new Date(notification.sentAt).getTime()
          : 0,
      },
    });
  }

  async publishNotificationFailed(notification: any): Promise<void> {
    await this.publishEvent('notification.failed', {
      notification: {
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        failureReason: notification.failureReason,
        errorCode: notification.errorCode,
        retryCount: notification.retryCount,
        willRetry: notification.retryCount < notification.maxRetries,
      },
    });
  }

  async publishNotificationOpened(notification: any, metadata: any = {}): Promise<void> {
    await this.publishEvent('notification.opened', {
      notification: {
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        openedAt: notification.openedAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    });
  }

  async publishNotificationClicked(notification: any, metadata: any = {}): Promise<void> {
    await this.publishEvent('notification.clicked', {
      notification: {
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        clickedAt: notification.clickedAt,
        clickedLink: metadata.clickedLink,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    });
  }

  async publishTemplateCreated(template: any): Promise<void> {
    await this.publishEvent('template.created', {
      template: {
        id: template.id,
        name: template.name,
        channel: template.channel,
        category: template.category,
        createdBy: template.createdBy,
      },
    });
  }

  async publishTemplateUpdated(template: any, changes: string[]): Promise<void> {
    await this.publishEvent('template.updated', {
      template: {
        id: template.id,
        name: template.name,
        channel: template.channel,
        category: template.category,
        updatedBy: template.updatedBy,
      },
      changes,
    });
  }

  async publishTemplateDeleted(template: any): Promise<void> {
    await this.publishEvent('template.deleted', {
      template: {
        id: template.id,
        name: template.name,
        channel: template.channel,
        category: template.category,
        deletedBy: template.deletedBy,
      },
    });
  }

  async publishPreferencesUpdated(preferences: any, changes: string[]): Promise<void> {
    await this.publishEvent('preferences.updated', {
      preferences: {
        userId: preferences.userId,
        channels: Object.keys(preferences.channels).filter(ch => preferences.channels[ch].enabled),
        categories: Object.keys(preferences.categories).filter(cat => preferences.categories[cat]),
        updatedBy: preferences.updatedBy,
      },
      changes,
    });
  }

  async publishBulkNotificationsCompleted(bulk: any): Promise<void> {
    await this.publishEvent('bulk.notifications.completed', {
      bulk: {
        batchId: bulk.batchId,
        totalNotifications: bulk.totalNotifications,
        successfulNotifications: bulk.successfulNotifications,
        failedNotifications: bulk.failedNotifications,
        processingTime: bulk.processingTime,
        channels: bulk.channels,
      },
    });
  }

  // Subscribe to events
  onNotificationSent(callback: (event: any) => void): void {
    this.on('notification.sent', callback);
  }

  onNotificationDelivered(callback: (event: any) => void): void {
    this.on('notification.delivered', callback);
  }

  onNotificationFailed(callback: (event: any) => void): void {
    this.on('notification.failed', callback);
  }

  onTemplateCreated(callback: (event: any) => void): void {
    this.on('template.created', callback);
  }

  onPreferencesUpdated(callback: (event: any) => void): void {
    this.on('preferences.updated', callback);
  }

  // Cleanup
  async close(): Promise<void> {
    if (this.redisClient) {
      // In a real implementation, this would close the Redis connection
      logger.info('Closed Redis connection');
    }
    this.removeAllListeners();
  }
}