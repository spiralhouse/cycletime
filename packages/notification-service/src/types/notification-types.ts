export interface Notification {
  id: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  recipient: string;
  subject: string;
  content: string;
  templateId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRequest {
  channel: 'email' | 'sms' | 'push' | 'in_app';
  recipient: string;
  templateId?: string;
  subject?: string;
  content?: string;
  data?: Record<string, any>;
  scheduledAt?: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface BulkNotificationRequest {
  notifications: NotificationRequest[];
  batchSize?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app';
  name: string;
  description: string;
  isEnabled: boolean;
  isConfigured: boolean;
  config: Record<string, any>;
  lastTestedAt?: Date;
  status: 'active' | 'inactive' | 'error';
}

export interface DeliveryStatus {
  notificationId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';
  timestamp: Date;
  message?: string;
  metadata?: Record<string, any>;
}

export interface DeliveryReport {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  opened: number;
  clicked: number;
  byChannel: Record<string, {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}