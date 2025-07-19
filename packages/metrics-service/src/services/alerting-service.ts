import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { Alert, AlertRule } from '../types';

export class AlertingService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {}

  async createAlertRule(ruleData: Partial<AlertRule>): Promise<AlertRule> {
    try {
      const rule = this.mockDataService.addAlertRule(ruleData);

      logger.info({
        ruleId: rule.id,
        name: rule.name,
        metric: rule.metric,
        threshold: rule.threshold,
        severity: rule.severity,
      }, 'Alert rule created');

      return rule;
    } catch (error) {
      logger.error({
        error: error.message,
        ruleData,
      }, 'Failed to create alert rule');
      throw error;
    }
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule | undefined> {
    try {
      const rule = this.mockDataService.updateAlertRule(ruleId, updates);

      if (rule) {
        logger.info({
          ruleId,
          name: rule.name,
          updates: Object.keys(updates),
        }, 'Alert rule updated');
      }

      return rule;
    } catch (error) {
      logger.error({
        error: error.message,
        ruleId,
        updates,
      }, 'Failed to update alert rule');
      throw error;
    }
  }

  async deleteAlertRule(ruleId: string): Promise<boolean> {
    try {
      const success = this.mockDataService.deleteAlertRule(ruleId);

      if (success) {
        logger.info({
          ruleId,
        }, 'Alert rule deleted');
      }

      return success;
    } catch (error) {
      logger.error({
        error: error.message,
        ruleId,
      }, 'Failed to delete alert rule');
      throw error;
    }
  }

  async evaluateAlertRules(): Promise<Alert[]> {
    try {
      const rules = this.mockDataService.getAlertRules().filter(r => r.isEnabled);
      const triggeredAlerts: Alert[] = [];

      for (const rule of rules) {
        const triggered = await this.evaluateRule(rule);
        if (triggered) {
          triggeredAlerts.push(triggered);
        }
      }

      logger.debug({
        rulesEvaluated: rules.length,
        alertsTriggered: triggeredAlerts.length,
      }, 'Alert rules evaluated');

      return triggeredAlerts;
    } catch (error) {
      logger.error({
        error: error.message,
      }, 'Failed to evaluate alert rules');
      throw error;
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<Alert | null> {
    try {
      // Get current metric value
      const metrics = this.mockDataService.getMetrics()
        .filter(m => m.name === rule.metric);

      if (metrics.length === 0) {
        logger.warn({
          ruleId: rule.id,
          metric: rule.metric,
        }, 'No metrics found for alert rule');
        return null;
      }

      const latestMetric = metrics[metrics.length - 1];
      const value = latestMetric.value;
      const threshold = rule.threshold;

      // Check if condition is met
      let conditionMet = false;
      switch (rule.condition) {
        case 'gt':
          conditionMet = value > threshold;
          break;
        case 'lt':
          conditionMet = value < threshold;
          break;
        case 'gte':
          conditionMet = value >= threshold;
          break;
        case 'lte':
          conditionMet = value <= threshold;
          break;
        case 'eq':
          conditionMet = value === threshold;
          break;
        case 'ne':
          conditionMet = value !== threshold;
          break;
      }

      if (!conditionMet) {
        return null;
      }

      // Create alert
      const alert: Alert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        name: rule.name,
        status: 'active',
        severity: rule.severity,
        metric: rule.metric,
        value,
        threshold,
        condition: rule.condition,
        message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${threshold})`,
        labels: rule.labels,
        firedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Publish alert triggered event
      await this.eventService.publishAlertTriggered({
        ...alert,
        notifications: rule.notifications,
      });

      logger.warn({
        alertId: alert.id,
        ruleId: rule.id,
        metric: rule.metric,
        value,
        threshold,
        severity: rule.severity,
      }, 'Alert triggered');

      return alert;
    } catch (error) {
      logger.error({
        error: error.message,
        ruleId: rule.id,
      }, 'Failed to evaluate alert rule');
      return null;
    }
  }

  async resolveAlert(alertId: string, resolvedBy: 'auto' | 'manual' = 'manual'): Promise<Alert | undefined> {
    try {
      const alert = this.mockDataService.getAlertById(alertId);
      if (!alert) {
        return undefined;
      }

      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.updatedAt = new Date();

      // Publish alert resolved event
      await this.eventService.publishAlertResolved({
        ...alert,
        resolvedBy,
        duration: alert.resolvedAt.getTime() - alert.firedAt.getTime(),
      });

      logger.info({
        alertId,
        resolvedBy,
        duration: alert.resolvedAt.getTime() - alert.firedAt.getTime(),
      }, 'Alert resolved');

      return alert;
    } catch (error) {
      logger.error({
        error: error.message,
        alertId,
      }, 'Failed to resolve alert');
      throw error;
    }
  }

  async silenceAlert(alertId: string, duration: string, reason: string, silencedBy: string): Promise<Alert | undefined> {
    try {
      const alert = this.mockDataService.silenceAlert(alertId, duration, reason);
      
      if (alert) {
        // Publish alert silenced event
        await this.eventService.publishAlertSilenced(alert, {
          duration,
          reason,
          silencedBy,
          silencedAt: new Date(),
          silencedUntil: alert.silencedUntil,
        });

        logger.info({
          alertId,
          duration,
          reason,
          silencedBy,
        }, 'Alert silenced');
      }

      return alert;
    } catch (error) {
      logger.error({
        error: error.message,
        alertId,
        duration,
        reason,
      }, 'Failed to silence alert');
      throw error;
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return this.mockDataService.getAlertsByStatus('active');
  }

  async getAlertsByStatus(status: string): Promise<Alert[]> {
    return this.mockDataService.getAlertsByStatus(status);
  }

  async getAlertHistory(alertId: string) {
    try {
      const alert = this.mockDataService.getAlertById(alertId);
      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      // Mock history data
      const history = [];
      let currentTime = alert.firedAt;
      
      history.push({
        timestamp: currentTime,
        status: 'triggered',
        value: alert.value,
        message: `Alert triggered: ${alert.message}`,
      });

      // Add some sample status changes
      if (alert.status === 'resolved' && alert.resolvedAt) {
        history.push({
          timestamp: alert.resolvedAt,
          status: 'resolved',
          value: alert.threshold * 0.8, // Below threshold
          message: `Alert resolved: metric returned to normal`,
        });
      }

      if (alert.status === 'silenced' && alert.silencedUntil) {
        history.push({
          timestamp: new Date(alert.firedAt.getTime() + 300000), // 5 minutes after trigger
          status: 'silenced',
          value: alert.value,
          message: `Alert silenced until ${alert.silencedUntil.toISOString()}`,
        });
      }

      return {
        alert,
        history,
      };
    } catch (error) {
      logger.error({
        error: error.message,
        alertId,
      }, 'Failed to get alert history');
      throw error;
    }
  }

  // Bulk operations
  async resolveAlertsBatch(alertIds: string[], resolvedBy: 'auto' | 'manual' = 'manual'): Promise<Alert[]> {
    try {
      const resolvedAlerts: Alert[] = [];
      
      for (const alertId of alertIds) {
        const alert = await this.resolveAlert(alertId, resolvedBy);
        if (alert) {
          resolvedAlerts.push(alert);
        }
      }

      logger.info({
        count: resolvedAlerts.length,
        resolvedBy,
      }, 'Alerts resolved in batch');

      return resolvedAlerts;
    } catch (error) {
      logger.error({
        error: error.message,
        alertIds,
      }, 'Failed to resolve alerts batch');
      throw error;
    }
  }

  // Alert statistics
  async getAlertStatistics() {
    try {
      const alerts = this.mockDataService.getAlerts();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 86400000);
      const oneWeekAgo = new Date(now.getTime() - 604800000);

      const stats = {
        total: alerts.length,
        active: alerts.filter(a => a.status === 'active').length,
        resolved: alerts.filter(a => a.status === 'resolved').length,
        silenced: alerts.filter(a => a.status === 'silenced').length,
        last24h: alerts.filter(a => a.firedAt > oneDayAgo).length,
        lastWeek: alerts.filter(a => a.firedAt > oneWeekAgo).length,
        bySeverity: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length,
        },
      };

      return stats;
    } catch (error) {
      logger.error({
        error: error.message,
      }, 'Failed to get alert statistics');
      throw error;
    }
  }
}