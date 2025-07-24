import { logger } from '@cycletime/shared-utils';
import { v4 as uuidv4 } from 'uuid';
import { 
  Notification, 
  NotificationTemplate, 
  UserPreferences, 
  NotificationChannel,
  DeliveryStatus,
  DeliveryReport
} from '../types';

export class MockDataService {
  private notifications: Notification[] = [];
  private templates: NotificationTemplate[] = [];
  private userPreferences: UserPreferences[] = [];
  private channels: NotificationChannel[] = [];
  private deliveryStatuses: DeliveryStatus[] = [];

  constructor() {
    this.initializeMockData();
    logger.info('Mock data service initialized with sample notification data');
  }

  private initializeMockData(): void {
    // Initialize sample channels
    this.channels = this.generateSampleChannels();
    
    // Initialize sample templates
    this.templates = this.generateSampleTemplates();
    
    // Initialize sample notifications
    this.notifications = this.generateSampleNotifications();
    
    // Initialize sample preferences
    this.userPreferences = this.generateSamplePreferences();
    
    // Initialize sample delivery statuses
    this.deliveryStatuses = this.generateSampleDeliveryStatuses();
  }

  private generateSampleChannels(): NotificationChannel[] {
    return [
      {
        type: 'email',
        name: 'Email',
        description: 'Email notifications via SMTP',
        isEnabled: true,
        isConfigured: true,
        config: {
          smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: '***', pass: '***' },
          },
          from: 'noreply@cycletime.dev',
        },
        lastTestedAt: new Date(Date.now() - 3600000),
        status: 'active',
      },
      {
        type: 'sms',
        name: 'SMS',
        description: 'SMS notifications via Twilio',
        isEnabled: true,
        isConfigured: true,
        config: {
          twilio: {
            accountSid: '***',
            authToken: '***',
            from: '+1234567890',
          },
        },
        lastTestedAt: new Date(Date.now() - 7200000),
        status: 'active',
      },
      {
        type: 'push',
        name: 'Push Notifications',
        description: 'Push notifications via Firebase',
        isEnabled: true,
        isConfigured: true,
        config: {
          firebase: {
            projectId: 'cycletime-dev',
            privateKey: '***',
            clientEmail: '***',
          },
        },
        lastTestedAt: new Date(Date.now() - 1800000),
        status: 'active',
      },
      {
        type: 'in_app',
        name: 'In-App',
        description: 'In-app notifications',
        isEnabled: true,
        isConfigured: true,
        config: {
          retention: '30d',
          maxNotifications: 100,
        },
        lastTestedAt: new Date(Date.now() - 900000),
        status: 'active',
      },
    ];
  }

  private generateSampleTemplates(): NotificationTemplate[] {
    const now = new Date();
    return [
      {
        id: uuidv4(),
        name: 'Welcome Email',
        description: 'Welcome new users to the platform',
        channel: 'email',
        category: 'onboarding',
        subject: 'Welcome to CycleTime, {{name}}!',
        content: `
          <h1>Welcome to CycleTime!</h1>
          <p>Hi {{name}},</p>
          <p>Welcome to CycleTime! We're excited to have you on board.</p>
          <p>Your account: {{email}}</p>
          <p>Get started by visiting your dashboard: <a href="{{dashboardUrl}}">Dashboard</a></p>
          <p>Best regards,<br>The CycleTime Team</p>
        `,
        variables: ['name', 'email', 'dashboardUrl'],
        isActive: true,
        metadata: {},
        createdAt: new Date(now.getTime() - 86400000),
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'Task Assigned',
        description: 'Notify user when a task is assigned',
        channel: 'email',
        category: 'task',
        subject: 'New Task Assigned: {{taskTitle}}',
        content: `
          <h2>New Task Assigned</h2>
          <p>Hi {{assigneeName}},</p>
          <p>A new task has been assigned to you:</p>
          <ul>
            <li><strong>Title:</strong> {{taskTitle}}</li>
            <li><strong>Project:</strong> {{projectName}}</li>
            <li><strong>Due Date:</strong> {{dueDate}}</li>
            <li><strong>Priority:</strong> {{priority}}</li>
          </ul>
          <p><a href="{{taskUrl}}">View Task</a></p>
        `,
        variables: ['assigneeName', 'taskTitle', 'projectName', 'dueDate', 'priority', 'taskUrl'],
        isActive: true,
        metadata: {},
        createdAt: new Date(now.getTime() - 604800000),
        updatedAt: new Date(now.getTime() - 86400000),
      },
      {
        id: uuidv4(),
        name: 'Task Due Soon',
        description: 'SMS reminder for tasks due soon',
        channel: 'sms',
        category: 'reminder',
        subject: 'Task Due Soon',
        content: 'Hi {{name}}, your task "{{taskTitle}}" is due {{dueDate}}. View: {{taskUrl}}',
        variables: ['name', 'taskTitle', 'dueDate', 'taskUrl'],
        isActive: true,
        metadata: {},
        createdAt: new Date(now.getTime() - 259200000),
        updatedAt: new Date(now.getTime() - 86400000),
      },
      {
        id: uuidv4(),
        name: 'New Comment',
        description: 'Push notification for new comments',
        channel: 'push',
        category: 'comment',
        subject: 'New Comment on {{itemType}}',
        content: '{{commenterName}} commented on {{itemTitle}}: {{commentPreview}}',
        variables: ['commenterName', 'itemType', 'itemTitle', 'commentPreview'],
        isActive: true,
        metadata: {},
        createdAt: new Date(now.getTime() - 172800000),
        updatedAt: new Date(now.getTime() - 43200000),
      },
    ];
  }

  private generateSampleNotifications(): Notification[] {
    const now = new Date();
    const notifications: Notification[] = [];
    
    // Generate various notification states
    const statuses = ['sent', 'delivered', 'failed', 'opened', 'clicked', 'pending'];
    const channels = ['email', 'sms', 'push', 'in_app'] as const;
    const priorities = ['low', 'normal', 'high', 'urgent'] as const;
    
    for (let i = 0; i < 20; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)] as any;
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      
      const baseTime = now.getTime() - Math.random() * 604800000; // Last 7 days
      const createdAt = new Date(baseTime);
      const sentAt = status !== 'pending' ? new Date(baseTime + Math.random() * 300000) : undefined;
      const deliveredAt = ['delivered', 'opened', 'clicked'].includes(status) 
        ? new Date(baseTime + Math.random() * 600000) : undefined;
      const openedAt = ['opened', 'clicked'].includes(status) 
        ? new Date(baseTime + Math.random() * 1200000) : undefined;
      const clickedAt = status === 'clicked' 
        ? new Date(baseTime + Math.random() * 1800000) : undefined;
      
      const templateId = this.templates[Math.floor(Math.random() * this.templates.length)]?.id;
      
      const notification: Notification = {
        id: uuidv4(),
        channel,
        recipient: `user${i + 1}@example.com`,
        subject: `Sample ${channel} notification ${i + 1}`,
        content: `This is a sample ${channel} notification content for testing.`,
        status,
        priority,
        retryCount: status === 'failed' ? Math.floor(Math.random() * 3) : 0,
        maxRetries: 3,
        metadata: {
          source: 'test-generation',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        createdAt,
        updatedAt: deliveredAt || sentAt || createdAt,
      };
      
      // Add optional properties only if they have values
      if (templateId) {
        notification.templateId = templateId;
      }
      if (sentAt) {
        notification.sentAt = sentAt;
      }
      if (deliveredAt) {
        notification.deliveredAt = deliveredAt;
      }
      if (openedAt) {
        notification.openedAt = openedAt;
      }
      if (clickedAt) {
        notification.clickedAt = clickedAt;
      }
      if (status === 'failed') {
        notification.failureReason = 'Invalid recipient address';
      }
      
      notifications.push(notification);
    }
    
    return notifications;
  }

  private generateSamplePreferences(): UserPreferences[] {
    const now = new Date();
    return [
      {
        userId: 'user-1',
        channels: {
          email: {
            enabled: true,
            address: 'user1@example.com',
            verified: true,
            frequency: 'immediate',
          },
          sms: {
            enabled: true,
            address: '+1234567890',
            verified: true,
            frequency: 'daily',
          },
          push: {
            enabled: true,
            address: 'device-token-1',
            verified: true,
            frequency: 'immediate',
          },
          in_app: {
            enabled: true,
            address: 'user-1',
            verified: true,
            frequency: 'immediate',
          },
        },
        categories: {
          onboarding: true,
          task: true,
          reminder: true,
          comment: true,
          system: false,
        },
        timezone: 'America/New_York',
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
        createdAt: new Date(now.getTime() - 2592000000), // 30 days ago
        updatedAt: new Date(now.getTime() - 86400000), // 1 day ago
      },
      {
        userId: 'user-2',
        channels: {
          email: {
            enabled: true,
            address: 'user2@example.com',
            verified: true,
            frequency: 'weekly',
          },
          sms: {
            enabled: false,
            address: '',
            verified: false,
            frequency: 'never',
          },
          push: {
            enabled: true,
            address: 'device-token-2',
            verified: true,
            frequency: 'daily',
          },
          in_app: {
            enabled: true,
            address: 'user-2',
            verified: true,
            frequency: 'immediate',
          },
        },
        categories: {
          onboarding: false,
          task: true,
          reminder: true,
          comment: false,
          system: true,
        },
        timezone: 'Europe/London',
        quietHours: {
          enabled: false,
          start: '23:00',
          end: '07:00',
        },
        createdAt: new Date(now.getTime() - 1296000000), // 15 days ago
        updatedAt: new Date(now.getTime() - 432000000), // 5 days ago
      },
    ];
  }

  private generateSampleDeliveryStatuses(): DeliveryStatus[] {
    const statuses: DeliveryStatus[] = [];
    
    this.notifications.forEach(notification => {
      // Add initial status
      statuses.push({
        notificationId: notification.id,
        status: 'pending',
        timestamp: notification.createdAt,
        message: 'Notification created',
      });
      
      if (notification.sentAt) {
        statuses.push({
          notificationId: notification.id,
          status: 'sent',
          timestamp: notification.sentAt,
          message: 'Notification sent successfully',
        });
      }
      
      if (notification.deliveredAt) {
        statuses.push({
          notificationId: notification.id,
          status: 'delivered',
          timestamp: notification.deliveredAt,
          message: 'Notification delivered to recipient',
        });
      }
      
      if (notification.openedAt) {
        statuses.push({
          notificationId: notification.id,
          status: 'opened',
          timestamp: notification.openedAt,
          message: 'Notification opened by recipient',
        });
      }
      
      if (notification.clickedAt) {
        statuses.push({
          notificationId: notification.id,
          status: 'clicked',
          timestamp: notification.clickedAt,
          message: 'Notification link clicked',
        });
      }
      
      if (notification.status === 'failed') {
        statuses.push({
          notificationId: notification.id,
          status: 'failed',
          timestamp: notification.updatedAt,
          message: notification.failureReason || 'Delivery failed',
        });
      }
    });
    
    return statuses;
  }

  // Public methods
  getNotifications(): Notification[] {
    return this.notifications;
  }

  getNotificationById(id: string): Notification | undefined {
    return this.notifications.find(n => n.id === id);
  }

  getNotificationsByChannel(channel: string): Notification[] {
    return this.notifications.filter(n => n.channel === channel);
  }

  getNotificationsByStatus(status: string): Notification[] {
    return this.notifications.filter(n => n.status === status);
  }

  addNotification(notification: Partial<Notification>): Notification {
    const newNotification: Notification = {
      id: uuidv4(),
      channel: notification.channel || 'email',
      recipient: notification.recipient || '',
      subject: notification.subject || '',
      content: notification.content || '',
      status: notification.status || 'pending',
      priority: notification.priority || 'normal',
      retryCount: notification.retryCount || 0,
      maxRetries: notification.maxRetries || 3,
      metadata: notification.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add optional properties only if they have values
    if (notification.templateId) {
      newNotification.templateId = notification.templateId;
    }
    if (notification.scheduledAt) {
      newNotification.scheduledAt = notification.scheduledAt;
    }
    if (notification.sentAt) {
      newNotification.sentAt = notification.sentAt;
    }
    if (notification.deliveredAt) {
      newNotification.deliveredAt = notification.deliveredAt;
    }
    if (notification.openedAt) {
      newNotification.openedAt = notification.openedAt;
    }
    if (notification.clickedAt) {
      newNotification.clickedAt = notification.clickedAt;
    }
    if (notification.failureReason) {
      newNotification.failureReason = notification.failureReason;
    }
    
    this.notifications.push(newNotification);
    return newNotification;
  }

  updateNotification(id: string, updates: Partial<Notification>): Notification | undefined {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return undefined;
    
    this.notifications[index] = {
      ...this.notifications[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.notifications[index];
  }

  getTemplates(): NotificationTemplate[] {
    return this.templates;
  }

  getTemplateById(id: string): NotificationTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  getTemplatesByChannel(channel: string): NotificationTemplate[] {
    return this.templates.filter(t => t.channel === channel);
  }

  addTemplate(template: Partial<NotificationTemplate>): NotificationTemplate {
    const newTemplate: NotificationTemplate = {
      id: uuidv4(),
      name: template.name || 'Untitled Template',
      channel: template.channel || 'email',
      category: template.category || 'general',
      subject: template.subject || '',
      content: template.content || '',
      variables: template.variables || [],
      isActive: template.isActive ?? true,
      metadata: template.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add optional properties only if they have values
    if (template.description) {
      newTemplate.description = template.description;
    }
    
    this.templates.push(newTemplate);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<NotificationTemplate>): NotificationTemplate | undefined {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    
    this.templates[index] = {
      ...this.templates[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.templates[index];
  }

  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.templates.splice(index, 1);
    return true;
  }

  getUserPreferences(): UserPreferences[] {
    return this.userPreferences;
  }

  getUserPreferencesById(userId: string): UserPreferences | undefined {
    return this.userPreferences.find(p => p.userId === userId);
  }

  updateUserPreferences(userId: string, updates: Partial<UserPreferences>): UserPreferences {
    const index = this.userPreferences.findIndex(p => p.userId === userId);
    
    if (index === -1) {
      // Create new preferences
      const newPreferences: UserPreferences = {
        userId,
        channels: updates.channels || {
          email: { enabled: true, address: '', verified: false, frequency: 'immediate' },
          sms: { enabled: false, address: '', verified: false, frequency: 'never' },
          push: { enabled: true, address: '', verified: false, frequency: 'immediate' },
          in_app: { enabled: true, address: userId, verified: true, frequency: 'immediate' },
        },
        categories: updates.categories || {},
        timezone: updates.timezone || 'UTC',
        quietHours: updates.quietHours || { enabled: false, start: '22:00', end: '08:00' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.userPreferences.push(newPreferences);
      return newPreferences;
    }
    
    // Update existing preferences
    this.userPreferences[index] = {
      ...this.userPreferences[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.userPreferences[index];
  }

  getChannels(): NotificationChannel[] {
    return this.channels;
  }

  getChannelByType(type: string): NotificationChannel | undefined {
    return this.channels.find(c => c.type === type);
  }

  updateChannelConfig(type: string, config: any): NotificationChannel | undefined {
    const index = this.channels.findIndex(c => c.type === type);
    if (index === -1) return undefined;
    
    this.channels[index] = {
      ...this.channels[index],
      config: { ...this.channels[index].config, ...config },
      lastTestedAt: new Date(),
    };
    
    return this.channels[index];
  }

  getDeliveryStatuses(notificationId?: string): DeliveryStatus[] {
    if (notificationId) {
      return this.deliveryStatuses.filter(ds => ds.notificationId === notificationId);
    }
    return this.deliveryStatuses;
  }

  getDeliveryReport(timeRange: string = '24h'): DeliveryReport {
    const now = new Date();
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = new Date(now.getTime() - timeRangeMs);
    
    const recentNotifications = this.notifications.filter(n => n.createdAt >= cutoffTime);
    
    const report: DeliveryReport = {
      total: recentNotifications.length,
      sent: recentNotifications.filter(n => n.status === 'sent' || n.sentAt).length,
      delivered: recentNotifications.filter(n => n.status === 'delivered' || n.deliveredAt).length,
      failed: recentNotifications.filter(n => n.status === 'failed').length,
      pending: recentNotifications.filter(n => n.status === 'pending').length,
      opened: recentNotifications.filter(n => n.status === 'opened' || n.openedAt).length,
      clicked: recentNotifications.filter(n => n.status === 'clicked' || n.clickedAt).length,
      byChannel: {},
    };
    
    // Calculate by channel
    const channels = ['email', 'sms', 'push', 'in_app'];
    channels.forEach(channel => {
      const channelNotifications = recentNotifications.filter(n => n.channel === channel);
      report.byChannel[channel] = {
        total: channelNotifications.length,
        sent: channelNotifications.filter(n => n.status === 'sent' || n.sentAt).length,
        delivered: channelNotifications.filter(n => n.status === 'delivered' || n.deliveredAt).length,
        failed: channelNotifications.filter(n => n.status === 'failed').length,
      };
    });
    
    return report;
  }

  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (!match) return 86400000; // Default to 24 hours
    
    const [, num, unit] = match;
    const multipliers = { m: 60000, h: 3600000, d: 86400000 };
    return parseInt(num) * multipliers[unit as keyof typeof multipliers];
  }

  getHealthStatus(): any {
    return {
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0',
      uptime: process.uptime(),
      dependencies: {
        redis: 'connected',
        email: 'connected',
        sms: 'connected',
        push: 'connected',
      },
    };
  }
}