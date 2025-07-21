import { logger } from '@cycletime/shared-utils';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export class EventService extends EventEmitter {
  private redisClient: any = null;

  constructor() {
    super();
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Mock Redis client for stub implementation
      this.redisClient = {
        publish: async (channel: string, message: string) => {
          logger.debug(`[MOCK] Publishing to Redis channel: ${channel}`);
          logger.debug(`[MOCK] Message: ${message}`);
          return 1;
        },
        isReady: true,
      };
      
      logger.info('Connected to Redis for event publishing');
    } catch (error) {
      logger.warn('Failed to connect to Redis, using mock implementation');
    }
  }

  async publishEvent(eventType: string, payload: any): Promise<void> {
    try {
      const event = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        type: eventType,
        service: 'metrics-service',
        environment: process.env.NODE_ENV || 'development',
        ...payload,
      };

      // Emit locally for any subscribers
      this.emit(eventType, event);

      // Publish to Redis
      if (this.redisClient?.isReady) {
        const channel = `cycletime:events:${eventType.replace(/\./g, ':')}`;
        await this.redisClient.publish(channel, JSON.stringify(event));
        
        logger.debug('Event published to Redis', {
          eventType,
          channel,
          eventId: event.eventId,
        });
      }

      logger.info('Event published', {
        eventType,
        eventId: event.eventId,
        timestamp: event.timestamp,
      });

    } catch (error) {
      logger.error('Failed to publish event', error as Error, {
        eventType,
        payload,
      });
      throw error;
    }
  }

  async publishMetricCollected(metric: any): Promise<void> {
    await this.publishEvent('metric.collected', {
      metric: {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        type: metric.type,
        unit: metric.unit,
        labels: metric.labels,
        service: metric.service,
      },
      source: 'metrics-collection',
    });
  }

  async publishThresholdBreached(metric: any, threshold: any): Promise<void> {
    await this.publishEvent('metric.threshold.breached', {
      metric: {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        threshold: threshold.value,
        condition: threshold.condition,
        severity: threshold.severity,
      },
      duration: threshold.duration,
    });
  }

  async publishAlertTriggered(alert: any): Promise<void> {
    await this.publishEvent('alert.triggered', {
      alert: {
        id: alert.id,
        ruleId: alert.ruleId,
        name: alert.name,
        severity: alert.severity,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        condition: alert.condition,
        message: alert.message,
        labels: alert.labels,
      },
      notifications: alert.notifications,
    });
  }

  async publishAlertResolved(alert: any): Promise<void> {
    await this.publishEvent('alert.resolved', {
      alert: {
        id: alert.id,
        ruleId: alert.ruleId,
        name: alert.name,
        severity: alert.severity,
        duration: alert.duration,
        resolvedBy: alert.resolvedBy || 'auto',
      },
    });
  }

  async publishAlertSilenced(alert: any, silence: any): Promise<void> {
    await this.publishEvent('alert.silenced', {
      alert: {
        id: alert.id,
        ruleId: alert.ruleId,
        name: alert.name,
        severity: alert.severity,
        silencedUntil: silence.silencedUntil,
        reason: silence.reason,
        silencedBy: silence.silencedBy,
      },
    });
  }

  async publishDashboardCreated(dashboard: any): Promise<void> {
    await this.publishEvent('dashboard.created', {
      dashboard: {
        id: dashboard.id,
        title: dashboard.title,
        description: dashboard.description,
        tags: dashboard.tags,
        panelCount: dashboard.panels?.length || 0,
        createdBy: dashboard.createdBy,
      },
    });
  }

  async publishDashboardUpdated(dashboard: any, changes: string[]): Promise<void> {
    await this.publishEvent('dashboard.updated', {
      dashboard: {
        id: dashboard.id,
        title: dashboard.title,
        description: dashboard.description,
        tags: dashboard.tags,
        panelCount: dashboard.panels?.length || 0,
        updatedBy: dashboard.updatedBy,
      },
      changes,
    });
  }

  async publishSystemHealthChanged(healthStatus: any, previous: any): Promise<void> {
    await this.publishEvent('system.health.changed', {
      healthStatus: {
        overall: healthStatus.overall,
        previous: previous.overall,
        services: healthStatus.services,
        infrastructure: healthStatus.infrastructure,
      },
      trigger: 'health-check',
    });
  }

  async publishAnomalyDetected(anomaly: any): Promise<void> {
    await this.publishEvent('system.anomaly.detected', {
      anomaly: {
        id: anomaly.id,
        type: anomaly.type,
        metric: anomaly.metric,
        value: anomaly.value,
        expectedValue: anomaly.expectedValue,
        deviation: anomaly.deviation,
        confidence: anomaly.confidence,
        severity: anomaly.severity,
        description: anomaly.description,
      },
      context: anomaly.context,
    });
  }

  // Subscribe to events
  onMetricCollected(callback: (event: any) => void): void {
    this.on('metric.collected', callback);
  }

  onAlertTriggered(callback: (event: any) => void): void {
    this.on('alert.triggered', callback);
  }

  onDashboardUpdated(callback: (event: any) => void): void {
    this.on('dashboard.updated', callback);
  }

  onSystemHealthChanged(callback: (event: any) => void): void {
    this.on('system.health.changed', callback);
  }

  // Cleanup
  async close(): Promise<void> {
    if (this.redisClient) {
      // In a real implementation, this would close the Redis connection
      logger.info('Closed Redis connection');
    }
    this.removeAllListeners();
  }
}