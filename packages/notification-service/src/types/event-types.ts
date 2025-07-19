export interface NotificationEvent {
  eventId: string;
  timestamp: Date;
  type: 'notification.sent' | 'notification.delivered' | 'notification.failed' | 'notification.opened' | 'notification.clicked';
  notification: {
    id: string;
    channel: string;
    recipient: string;
    subject: string;
    templateId?: string;
    priority: string;
    metadata: Record<string, any>;
  };
  service: string;
  environment: string;
}

export interface TemplateEvent {
  eventId: string;
  timestamp: Date;
  type: 'template.created' | 'template.updated' | 'template.deleted';
  template: {
    id: string;
    name: string;
    channel: string;
    category: string;
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
  };
  changes?: string[];
  service: string;
  environment: string;
}

export interface PreferencesEvent {
  eventId: string;
  timestamp: Date;
  type: 'preferences.updated';
  preferences: {
    userId: string;
    channels: string[];
    categories: string[];
    updatedBy: string;
  };
  changes: string[];
  service: string;
  environment: string;
}

export interface BulkNotificationEvent {
  eventId: string;
  timestamp: Date;
  type: 'bulk.notifications.completed';
  bulk: {
    batchId: string;
    totalNotifications: number;
    successfulNotifications: number;
    failedNotifications: number;
    processingTime: number;
    channels: string[];
  };
  service: string;
  environment: string;
}