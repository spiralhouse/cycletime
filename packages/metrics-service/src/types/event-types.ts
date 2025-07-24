export interface MetricEvent {
  eventId: string;
  timestamp: Date;
  type: 'metric.collected' | 'metric.threshold.breached' | 'metric.anomaly.detected';
  metric: {
    id: string;
    name: string;
    value: number;
    type: string;
    unit?: string;
    labels: Record<string, string>;
    service: string;
  };
  source: string;
  environment: string;
  metadata?: Record<string, any>;
}

export interface AlertEvent {
  eventId: string;
  timestamp: Date;
  type: 'alert.triggered' | 'alert.resolved' | 'alert.silenced';
  alert: {
    id: string;
    ruleId: string;
    name: string;
    severity: string;
    metric: string;
    value: number;
    threshold: number;
    condition: string;
    message: string;
    labels: Record<string, string>;
  };
  service: string;
  environment: string;
  notifications?: string[];
}

export interface DashboardEvent {
  eventId: string;
  timestamp: Date;
  type: 'dashboard.created' | 'dashboard.updated' | 'dashboard.deleted';
  dashboard: {
    id: string;
    title: string;
    description?: string;
    tags: string[];
    panelCount: number;
    updatedBy?: string;
    createdBy?: string;
  };
  changes?: string[];
  service: string;
  environment: string;
}

export interface SystemHealthEvent {
  eventId: string;
  timestamp: Date;
  type: 'system.health.changed' | 'system.anomaly.detected';
  healthStatus?: {
    overall: string;
    previous: string;
    services: Array<{
      name: string;
      status: string;
      responseTime: number;
      errorRate: number;
    }>;
    infrastructure: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
  };
  anomaly?: {
    id: string;
    type: string;
    metric: string;
    value: number;
    expectedValue: number;
    deviation: number;
    confidence: number;
    severity: string;
    description: string;
  };
  trigger?: string;
  service: string;
  environment: string;
}