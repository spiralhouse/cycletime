import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';

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