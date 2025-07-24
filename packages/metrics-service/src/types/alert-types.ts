export interface Alert {
  id: string;
  ruleId: string;
  name: string;
  status: 'active' | 'resolved' | 'silenced';
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric: string;
  value: number;
  threshold: number;
  condition: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  message: string;
  labels: Record<string, string>;
  firedAt: Date;
  resolvedAt?: Date;
  silencedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  duration: string;
  notifications: string[];
  labels: Record<string, string>;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertSilence {
  alertId: string;
  duration: string;
  reason: string;
  silencedBy: string;
  silencedAt: Date;
  silencedUntil: Date;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  type: 'email' | 'sms' | 'webhook' | 'slack';
  recipient: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
}