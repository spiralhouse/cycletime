import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { UserPreferences } from '../types';

export class PreferencesService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {}

  async updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const original = this.mockDataService.getUserPreferencesById(userId);
      const preferences = this.mockDataService.updateUserPreferences(userId, updates);
      
      const changes = this.getChanges(original, preferences);
      
      if (changes.length > 0) {
        await this.eventService.publishPreferencesUpdated(preferences, changes);
        
        logger.info({
          userId,
          changes,
        }, 'User preferences updated');
      }

      return preferences;
    } catch (error) {
      logger.error({
        error: error.message,
        userId,
        updates,
      }, 'Failed to update preferences');
      throw error;
    }
  }

  private getChanges(original: UserPreferences | undefined, updated: UserPreferences): string[] {
    const changes: string[] = [];

    if (!original) {
      return ['created'];
    }

    // Check channel changes
    for (const [channel, prefs] of Object.entries(updated.channels)) {
      const originalChannel = original.channels[channel as keyof typeof original.channels];
      if (JSON.stringify(originalChannel) !== JSON.stringify(prefs)) {
        changes.push(`channels.${channel}`);
      }
    }

    // Check category changes
    if (JSON.stringify(original.categories) !== JSON.stringify(updated.categories)) {
      changes.push('categories');
    }

    // Check other changes
    if (original.timezone !== updated.timezone) changes.push('timezone');
    if (JSON.stringify(original.quietHours) !== JSON.stringify(updated.quietHours)) changes.push('quietHours');

    return changes;
  }
}

export class DeliveryTrackingService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {}

  async getDeliveryReport(timeRange: string, channel?: string) {
    try {
      const report = this.mockDataService.getDeliveryReport(timeRange);
      
      if (channel) {
        // Filter by channel
        const channelReport = report.byChannel[channel];
        if (channelReport) {
          return {
            summary: channelReport,
            byChannel: { [channel]: channelReport },
            timeRange,
            generatedAt: new Date().toISOString(),
          };
        }
      }

      return {
        summary: {
          total: report.total,
          sent: report.sent,
          delivered: report.delivered,
          failed: report.failed,
          pending: report.pending,
          opened: report.opened,
          clicked: report.clicked,
        },
        byChannel: report.byChannel,
        timeRange,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({
        error: error.message,
        timeRange,
        channel,
      }, 'Failed to get delivery report');
      throw error;
    }
  }

  async getNotificationDeliveryStatus(notificationId: string) {
    try {
      const notification = this.mockDataService.getNotificationById(notificationId);
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      const deliveryHistory = this.mockDataService.getDeliveryStatuses(notificationId);

      return {
        notificationId,
        status: notification.status,
        deliveryHistory: deliveryHistory.map(ds => ({
          timestamp: ds.timestamp.toISOString(),
          status: ds.status,
          message: ds.message,
          metadata: ds.metadata,
        })),
      };
    } catch (error) {
      logger.error({
        error: error.message,
        notificationId,
      }, 'Failed to get notification delivery status');
      throw error;
    }
  }
}