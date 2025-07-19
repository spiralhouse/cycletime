import { logger } from '@cycletime/shared-utils';
import { v4 as uuidv4 } from 'uuid';
import { 
  Metric, 
  MetricSummary, 
  MetricHistory, 
  DataPoint, 
  Alert, 
  AlertRule, 
  Dashboard, 
  DashboardSummary, 
  SystemHealth,
  ServiceHealth,
  InfrastructureHealth,
  HealthMetrics
} from '../types';

export class MockDataService {
  private metrics: Metric[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private dashboards: Dashboard[] = [];
  private systemHealth: SystemHealth;

  constructor() {
    this.initializeMockData();
    logger.info('Mock data service initialized with sample metrics data');
  }

  private initializeMockData(): void {
    // Initialize sample metrics
    this.metrics = this.generateSampleMetrics();
    
    // Initialize sample alerts
    this.alerts = this.generateSampleAlerts();
    
    // Initialize sample alert rules
    this.alertRules = this.generateSampleAlertRules();
    
    // Initialize sample dashboards
    this.dashboards = this.generateSampleDashboards();
    
    // Initialize system health
    this.systemHealth = this.generateSystemHealth();
  }

  private generateSampleMetrics(): Metric[] {
    const now = new Date();
    const services = ['api-gateway', 'task-service', 'document-service', 'ai-service'];
    const metricTypes = ['counter', 'gauge', 'histogram', 'summary'] as const;
    const categories = ['system', 'application', 'business', 'custom'] as const;
    
    const metrics: Metric[] = [];
    
    services.forEach(service => {
      // Response time metric
      metrics.push({
        id: uuidv4(),
        name: `${service}_response_time`,
        description: `Average response time for ${service}`,
        category: 'application',
        type: 'histogram',
        unit: 'ms',
        service,
        labels: { service, environment: 'production' },
        value: Math.random() * 100 + 50,
        timestamp: now,
        createdAt: new Date(now.getTime() - 86400000),
        updatedAt: now,
      });
      
      // Request count metric
      metrics.push({
        id: uuidv4(),
        name: `${service}_requests_total`,
        description: `Total requests to ${service}`,
        category: 'application',
        type: 'counter',
        unit: 'requests',
        service,
        labels: { service, environment: 'production' },
        value: Math.floor(Math.random() * 10000) + 1000,
        timestamp: now,
        createdAt: new Date(now.getTime() - 86400000),
        updatedAt: now,
      });
      
      // Error rate metric
      metrics.push({
        id: uuidv4(),
        name: `${service}_error_rate`,
        description: `Error rate for ${service}`,
        category: 'application',
        type: 'gauge',
        unit: 'percent',
        service,
        labels: { service, environment: 'production' },
        value: Math.random() * 5,
        timestamp: now,
        createdAt: new Date(now.getTime() - 86400000),
        updatedAt: now,
      });
    });
    
    // System metrics
    metrics.push({
      id: uuidv4(),
      name: 'system_cpu_usage',
      description: 'System CPU usage percentage',
      category: 'system',
      type: 'gauge',
      unit: 'percent',
      service: 'system',
      labels: { host: 'cycletime-prod-1' },
      value: Math.random() * 100,
      timestamp: now,
      createdAt: new Date(now.getTime() - 86400000),
      updatedAt: now,
    });
    
    metrics.push({
      id: uuidv4(),
      name: 'system_memory_usage',
      description: 'System memory usage percentage',
      category: 'system',
      type: 'gauge',
      unit: 'percent',
      service: 'system',
      labels: { host: 'cycletime-prod-1' },
      value: Math.random() * 100,
      timestamp: now,
      createdAt: new Date(now.getTime() - 86400000),
      updatedAt: now,
    });
    
    return metrics;
  }

  private generateSampleAlerts(): Alert[] {
    const now = new Date();
    return [
      {
        id: uuidv4(),
        ruleId: uuidv4(),
        name: 'High Response Time',
        status: 'active',
        severity: 'high',
        metric: 'api_gateway_response_time',
        value: 150,
        threshold: 100,
        condition: 'gt',
        message: 'API Gateway response time is above threshold',
        labels: { service: 'api-gateway', environment: 'production' },
        firedAt: new Date(now.getTime() - 300000),
        createdAt: new Date(now.getTime() - 300000),
        updatedAt: now,
      },
      {
        id: uuidv4(),
        ruleId: uuidv4(),
        name: 'High Error Rate',
        status: 'resolved',
        severity: 'critical',
        metric: 'task_service_error_rate',
        value: 3.2,
        threshold: 5,
        condition: 'gt',
        message: 'Task service error rate was above threshold',
        labels: { service: 'task-service', environment: 'production' },
        firedAt: new Date(now.getTime() - 1800000),
        resolvedAt: new Date(now.getTime() - 600000),
        createdAt: new Date(now.getTime() - 1800000),
        updatedAt: new Date(now.getTime() - 600000),
      },
    ];
  }

  private generateSampleAlertRules(): AlertRule[] {
    const now = new Date();
    return [
      {
        id: uuidv4(),
        name: 'High Response Time Alert',
        description: 'Alert when response time exceeds threshold',
        metric: 'response_time',
        condition: 'gt',
        threshold: 100,
        severity: 'high',
        duration: '5m',
        notifications: ['email:ops@cycletime.dev', 'slack:#alerts'],
        labels: { team: 'platform', service: 'api-gateway' },
        isEnabled: true,
        createdAt: new Date(now.getTime() - 86400000),
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'High Error Rate Alert',
        description: 'Alert when error rate exceeds threshold',
        metric: 'error_rate',
        condition: 'gt',
        threshold: 5,
        severity: 'critical',
        duration: '2m',
        notifications: ['email:ops@cycletime.dev', 'pagerduty:platform'],
        labels: { team: 'platform' },
        isEnabled: true,
        createdAt: new Date(now.getTime() - 86400000),
        updatedAt: now,
      },
    ];
  }

  private generateSampleDashboards(): Dashboard[] {
    const now = new Date();
    return [
      {
        id: uuidv4(),
        title: 'System Overview',
        description: 'High-level system metrics and health',
        tags: ['system', 'overview', 'health'],
        panels: [
          {
            id: uuidv4(),
            title: 'CPU Usage',
            type: 'graph',
            metrics: ['system_cpu_usage'],
            timeRange: '1h',
            gridPos: { x: 0, y: 0, w: 12, h: 8 },
            options: { legend: { show: true } },
            fieldConfig: { unit: 'percent' },
          },
          {
            id: uuidv4(),
            title: 'Memory Usage',
            type: 'graph',
            metrics: ['system_memory_usage'],
            timeRange: '1h',
            gridPos: { x: 12, y: 0, w: 12, h: 8 },
            options: { legend: { show: true } },
            fieldConfig: { unit: 'percent' },
          },
        ],
        isStarred: true,
        isArchived: false,
        createdBy: 'system',
        createdAt: new Date(now.getTime() - 86400000),
        updatedAt: now,
      },
      {
        id: uuidv4(),
        title: 'Application Performance',
        description: 'Application-level performance metrics',
        tags: ['application', 'performance', 'response-time'],
        panels: [
          {
            id: uuidv4(),
            title: 'Response Time by Service',
            type: 'graph',
            metrics: ['api_gateway_response_time', 'task_service_response_time'],
            timeRange: '6h',
            gridPos: { x: 0, y: 0, w: 24, h: 8 },
            options: { legend: { show: true } },
            fieldConfig: { unit: 'ms' },
          },
        ],
        isStarred: false,
        isArchived: false,
        createdBy: 'platform-team',
        createdAt: new Date(now.getTime() - 604800000),
        updatedAt: new Date(now.getTime() - 86400000),
      },
    ];
  }

  private generateSystemHealth(): SystemHealth {
    const services: ServiceHealth[] = [
      {
        name: 'api-gateway',
        status: 'healthy',
        responseTime: 45,
        errorRate: 0.1,
        uptime: 99.9,
      },
      {
        name: 'task-service',
        status: 'healthy',
        responseTime: 32,
        errorRate: 0.05,
        uptime: 99.95,
      },
      {
        name: 'document-service',
        status: 'degraded',
        responseTime: 120,
        errorRate: 2.1,
        uptime: 98.5,
      },
      {
        name: 'ai-service',
        status: 'healthy',
        responseTime: 89,
        errorRate: 0.3,
        uptime: 99.8,
      },
    ];

    const infrastructure: InfrastructureHealth = {
      cpu: 65,
      memory: 78,
      disk: 45,
      network: 12,
      database: 'healthy',
    };

    const healthMetrics: HealthMetrics = {
      totalMetrics: this.metrics.length,
      metricsPerSecond: 45.2,
      storageUsed: 2.3,
      alertsActive: this.alerts.filter(a => a.status === 'active').length,
    };

    return {
      overall: 'healthy',
      services,
      infrastructure,
      metrics: healthMetrics,
    };
  }

  // Public methods
  getMetrics(): Metric[] {
    return this.metrics;
  }

  getMetricById(id: string): Metric | undefined {
    return this.metrics.find(m => m.id === id);
  }

  getMetricsByService(service: string): Metric[] {
    return this.metrics.filter(m => m.service === service);
  }

  getMetricsByCategory(category: string): Metric[] {
    return this.metrics.filter(m => m.category === category);
  }

  addMetric(metric: Partial<Metric>): Metric {
    const newMetric: Metric = {
      id: uuidv4(),
      name: metric.name || 'unnamed_metric',
      description: metric.description || '',
      category: metric.category || 'custom',
      type: metric.type || 'gauge',
      unit: metric.unit,
      service: metric.service || 'unknown',
      labels: metric.labels || {},
      value: metric.value || 0,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.metrics.push(newMetric);
    return newMetric;
  }

  updateMetric(id: string, updates: Partial<Metric>): Metric | undefined {
    const index = this.metrics.findIndex(m => m.id === id);
    if (index === -1) return undefined;
    
    this.metrics[index] = {
      ...this.metrics[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.metrics[index];
  }

  getMetricHistory(metricId: string, timeRange: string, resolution: string): MetricHistory {
    const metric = this.getMetricById(metricId);
    if (!metric) {
      throw new Error(`Metric not found: ${metricId}`);
    }
    
    // Generate mock historical data
    const now = new Date();
    const dataPoints: DataPoint[] = [];
    const points = 50;
    
    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60000)); // Every minute
      const value = metric.value + (Math.random() - 0.5) * metric.value * 0.2; // ±20% variation
      
      dataPoints.push({
        timestamp,
        value,
        labels: metric.labels,
      });
    }
    
    return {
      metric: {
        id: metric.id,
        name: metric.name,
        description: metric.description,
        category: metric.category,
        type: metric.type,
        unit: metric.unit,
        service: metric.service,
        lastValue: metric.value,
        lastUpdated: metric.updatedAt,
      },
      timeRange,
      resolution,
      dataPoints,
    };
  }

  getAlerts(): Alert[] {
    return this.alerts;
  }

  getAlertById(id: string): Alert | undefined {
    return this.alerts.find(a => a.id === id);
  }

  getAlertsByStatus(status: string): Alert[] {
    return this.alerts.filter(a => a.status === status);
  }

  getAlertRules(): AlertRule[] {
    return this.alertRules;
  }

  getAlertRuleById(id: string): AlertRule | undefined {
    return this.alertRules.find(r => r.id === id);
  }

  addAlertRule(rule: Partial<AlertRule>): AlertRule {
    const newRule: AlertRule = {
      id: uuidv4(),
      name: rule.name || 'Unnamed Rule',
      description: rule.description,
      metric: rule.metric || '',
      condition: rule.condition || 'gt',
      threshold: rule.threshold || 0,
      severity: rule.severity || 'medium',
      duration: rule.duration || '5m',
      notifications: rule.notifications || [],
      labels: rule.labels || {},
      isEnabled: rule.isEnabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.alertRules.push(newRule);
    return newRule;
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined {
    const index = this.alertRules.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    
    this.alertRules[index] = {
      ...this.alertRules[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.alertRules[index];
  }

  deleteAlertRule(id: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    this.alertRules.splice(index, 1);
    return true;
  }

  silenceAlert(alertId: string, duration: string, reason: string): Alert | undefined {
    const alert = this.getAlertById(alertId);
    if (!alert) return undefined;
    
    const now = new Date();
    const durationMs = this.parseDuration(duration);
    
    alert.status = 'silenced';
    alert.silencedUntil = new Date(now.getTime() + durationMs);
    alert.updatedAt = now;
    
    return alert;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([mhd])$/);
    if (!match) return 3600000; // Default to 1 hour
    
    const [, num, unit] = match;
    const multipliers = { m: 60000, h: 3600000, d: 86400000 };
    return parseInt(num) * multipliers[unit as keyof typeof multipliers];
  }

  getDashboards(): Dashboard[] {
    return this.dashboards;
  }

  getDashboardById(id: string): Dashboard | undefined {
    return this.dashboards.find(d => d.id === id);
  }

  addDashboard(dashboard: Partial<Dashboard>): Dashboard {
    const newDashboard: Dashboard = {
      id: uuidv4(),
      title: dashboard.title || 'Untitled Dashboard',
      description: dashboard.description,
      tags: dashboard.tags || [],
      panels: dashboard.panels || [],
      isStarred: dashboard.isStarred || false,
      isArchived: dashboard.isArchived || false,
      createdBy: dashboard.createdBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.dashboards.push(newDashboard);
    return newDashboard;
  }

  updateDashboard(id: string, updates: Partial<Dashboard>): Dashboard | undefined {
    const index = this.dashboards.findIndex(d => d.id === id);
    if (index === -1) return undefined;
    
    this.dashboards[index] = {
      ...this.dashboards[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return this.dashboards[index];
  }

  deleteDashboard(id: string): boolean {
    const index = this.dashboards.findIndex(d => d.id === id);
    if (index === -1) return false;
    
    this.dashboards.splice(index, 1);
    return true;
  }

  getSystemHealth(): SystemHealth {
    return this.systemHealth;
  }

  updateSystemHealth(updates: Partial<SystemHealth>): SystemHealth {
    this.systemHealth = {
      ...this.systemHealth,
      ...updates,
    };
    return this.systemHealth;
  }

  getHealthStatus(): any {
    return {
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0',
      uptime: process.uptime(),
      overall: this.systemHealth.overall,
      dependencies: {
        redis: 'connected',
        influxdb: 'connected',
        prometheus: 'connected',
        grafana: 'connected',
      },
    };
  }

  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    let output = '';
    
    for (const metric of metrics) {
      // Add help comment
      output += `# HELP ${metric.name} ${metric.description}\n`;
      output += `# TYPE ${metric.name} ${metric.type}\n`;
      
      // Add metric with labels
      const labels = Object.entries(metric.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      
      output += `${metric.name}{${labels}} ${metric.value} ${metric.timestamp.getTime()}\n`;
    }
    
    return output;
  }
}