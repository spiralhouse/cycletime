export interface Metric {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'application' | 'business' | 'custom';
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit?: string;
  service: string;
  labels: Record<string, string>;
  value: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricRecord {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit?: string;
  labels?: Record<string, string>;
  timestamp?: Date;
}

export interface MetricSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  unit?: string;
  service: string;
  lastValue: number;
  lastUpdated: Date;
}

export interface MetricStatistics {
  min: number;
  max: number;
  avg: number;
  count: number;
  sum: number;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

export interface MetricHistory {
  metric: MetricSummary;
  timeRange: string;
  resolution: string;
  dataPoints: DataPoint[];
}

export interface PrometheusMetric {
  name: string;
  help: string;
  type: string;
  values: Array<{
    labels: Record<string, string>;
    value: number;
    timestamp?: number;
  }>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  infrastructure: InfrastructureHealth;
  metrics: HealthMetrics;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  uptime: number;
}

export interface InfrastructureHealth {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  database: 'healthy' | 'degraded' | 'unhealthy';
}

export interface HealthMetrics {
  totalMetrics: number;
  metricsPerSecond: number;
  storageUsed: number;
  alertsActive: number;
}