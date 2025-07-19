import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { NotificationRequest, BulkNotificationRequest, Notification } from '../types';

export class NotificationService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {}

  async sendNotification(request: NotificationRequest): Promise<Notification> {
    try {
      const notification = this.mockDataService.addNotification({
        ...request,
        status: 'pending',
        priority: request.priority || 'normal',
      });

      // Simulate processing delay
      setTimeout(async () => {
        await this.processNotification(notification);
      }, 1000);

      logger.info({
        notificationId: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        priority: notification.priority,
      }, 'Notification queued for sending');

      return notification;
    } catch (error) {
      logger.error({
        error: error.message,
        request,
      }, 'Failed to send notification');
      throw error;
    }
  }

  async sendBulkNotifications(request: BulkNotificationRequest): Promise<any> {
    try {
      const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const notifications: Notification[] = [];

      for (const notificationRequest of request.notifications) {
        const notification = this.mockDataService.addNotification({
          ...notificationRequest,
          status: 'pending',
          priority: request.priority || 'normal',
        });
        notifications.push(notification);
      }

      // Simulate bulk processing
      setTimeout(async () => {
        await this.processBulkNotifications(batchId, notifications);
      }, 2000);

      logger.info({
        batchId,
        totalNotifications: notifications.length,
      }, 'Bulk notifications queued for processing');

      return {
        batchId,
        totalNotifications: notifications.length,
        queuedNotifications: notifications.length,
        failedNotifications: 0,
        estimatedProcessingTime: '2-5 minutes',
        status: 'queued',
      };
    } catch (error) {
      logger.error({
        error: error.message,
        request,
      }, 'Failed to send bulk notifications');
      throw error;
    }
  }

  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Simulate sending
      const success = Math.random() > 0.1; // 90% success rate
      
      if (success) {
        const updatedNotification = this.mockDataService.updateNotification(notification.id, {
          status: 'sent',
          sentAt: new Date(),
        });

        if (updatedNotification) {
          await this.eventService.publishNotificationSent(updatedNotification);
          
          // Simulate delivery
          setTimeout(async () => {
            await this.simulateDelivery(updatedNotification);
          }, 500 + Math.random() * 2000);
        }
      } else {
        const updatedNotification = this.mockDataService.updateNotification(notification.id, {
          status: 'failed',
          failureReason: 'Simulated delivery failure',
          retryCount: notification.retryCount + 1,
        });

        if (updatedNotification) {
          await this.eventService.publishNotificationFailed(updatedNotification);
        }
      }
    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
      }, 'Failed to process notification');
    }
  }

  private async simulateDelivery(notification: Notification): Promise<void> {
    try {
      const deliverySuccess = Math.random() > 0.05; // 95% delivery success rate
      
      if (deliverySuccess) {
        const updatedNotification = this.mockDataService.updateNotification(notification.id, {
          status: 'delivered',
          deliveredAt: new Date(),
        });

        if (updatedNotification) {
          await this.eventService.publishNotificationDelivered(updatedNotification);
          
          // Simulate opening (only for email/push)
          if (['email', 'push'].includes(notification.channel)) {
            setTimeout(async () => {
              await this.simulateOpening(updatedNotification);
            }, 1000 + Math.random() * 10000);
          }
        }
      } else {
        const updatedNotification = this.mockDataService.updateNotification(notification.id, {
          status: 'failed',
          failureReason: 'Delivery failed',
          retryCount: notification.retryCount + 1,
        });

        if (updatedNotification) {
          await this.eventService.publishNotificationFailed(updatedNotification);
        }
      }
    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
      }, 'Failed to simulate delivery');
    }
  }

  private async simulateOpening(notification: Notification): Promise<void> {
    try {
      const openRate = notification.channel === 'email' ? 0.25 : 0.6; // 25% email, 60% push
      
      if (Math.random() < openRate) {
        const updatedNotification = this.mockDataService.updateNotification(notification.id, {
          status: 'opened',
          openedAt: new Date(),
        });

        if (updatedNotification) {
          await this.eventService.publishNotificationOpened(updatedNotification);
          
          // Simulate clicking (only for email)
          if (notification.channel === 'email') {
            setTimeout(async () => {
              await this.simulateClicking(updatedNotification);
            }, 500 + Math.random() * 5000);
          }
        }
      }
    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
      }, 'Failed to simulate opening');
    }
  }

  private async simulateClicking(notification: Notification): Promise<void> {
    try {
      const clickRate = 0.4; // 40% click rate for opened emails
      
      if (Math.random() < clickRate) {
        const updatedNotification = this.mockDataService.updateNotification(notification.id, {
          status: 'clicked',
          clickedAt: new Date(),
        });

        if (updatedNotification) {
          await this.eventService.publishNotificationClicked(updatedNotification, {
            clickedLink: 'https://cycletime.dev/dashboard',
          });
        }
      }
    } catch (error) {
      logger.error({
        error: error.message,
        notificationId: notification.id,
      }, 'Failed to simulate clicking');
    }
  }

  private async processBulkNotifications(batchId: string, notifications: Notification[]): Promise<void> {
    try {
      const startTime = Date.now();
      let successful = 0;
      let failed = 0;
      const channels = new Set<string>();

      for (const notification of notifications) {
        channels.add(notification.channel);
        
        // Simulate processing each notification
        await this.processNotification(notification);
        
        // Update counters based on final status
        const updated = this.mockDataService.getNotificationById(notification.id);
        if (updated) {
          if (updated.status === 'sent' || updated.status === 'delivered') {
            successful++;
          } else if (updated.status === 'failed') {
            failed++;
          }
        }
      }

      const processingTime = Date.now() - startTime;

      await this.eventService.publishBulkNotificationsCompleted({
        batchId,
        totalNotifications: notifications.length,
        successfulNotifications: successful,
        failedNotifications: failed,
        processingTime,
        channels: Array.from(channels),
      });

      logger.info({
        batchId,
        totalNotifications: notifications.length,
        successful,
        failed,
        processingTime,
      }, 'Bulk notifications processing completed');
    } catch (error) {
      logger.error({
        error: error.message,
        batchId,
      }, 'Failed to process bulk notifications');
    }
  }

  async retryNotification(notificationId: string): Promise<Notification | undefined> {
    try {
      const notification = this.mockDataService.getNotificationById(notificationId);
      if (!notification) {
        return undefined;
      }

      if (notification.status !== 'failed') {
        throw new Error('Only failed notifications can be retried');
      }

      if (notification.retryCount >= notification.maxRetries) {
        throw new Error('Maximum retry attempts reached');
      }

      const updatedNotification = this.mockDataService.updateNotification(notificationId, {
        status: 'pending',
        retryCount: notification.retryCount + 1,
      });

      if (updatedNotification) {
        // Retry processing
        setTimeout(async () => {
          await this.processNotification(updatedNotification);
        }, 1000);

        logger.info({
          notificationId,
          retryCount: updatedNotification.retryCount,
        }, 'Notification retry initiated');
      }

      return updatedNotification;
    } catch (error) {
      logger.error({
        error: error.message,
        notificationId,
      }, 'Failed to retry notification');
      throw error;
    }
  }

  async cancelNotification(notificationId: string): Promise<Notification | undefined> {
    try {
      const notification = this.mockDataService.getNotificationById(notificationId);
      if (!notification) {
        return undefined;
      }

      if (!['pending', 'scheduled'].includes(notification.status)) {
        throw new Error('Only pending or scheduled notifications can be cancelled');
      }

      const updatedNotification = this.mockDataService.updateNotification(notificationId, {
        status: 'cancelled',
      });

      if (updatedNotification) {
        logger.info({
          notificationId,
        }, 'Notification cancelled');
      }

      return updatedNotification;
    } catch (error) {
      logger.error({
        error: error.message,
        notificationId,
      }, 'Failed to cancel notification');
      throw error;
    }
  }
}