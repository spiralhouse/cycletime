import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const alertController: FastifyPluginAsync = async (fastify) => {
  // Get all alerts
  fastify.get('/', {
    schema: {
      description: 'List all alerts',
      tags: ['Alerts'],
      querystring: Type.Object({
        status: Type.Optional(Type.String()),
        severity: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({
          alerts: Type.Array(Type.Object({
            id: Type.String(),
            name: Type.String(),
            status: Type.String(),
            severity: Type.String(),
            metric: Type.String(),
            value: Type.Number(),
            threshold: Type.Number(),
            firedAt: Type.String(),
            resolvedAt: Type.Optional(Type.String()),
          })),
          total: Type.Number(),
          activeCount: Type.Number(),
          resolvedCount: Type.Number(),
          silencedCount: Type.Number(),
        }),
      },
    },
  }, async (request, reply) => {
    const { status, severity } = request.query as { status?: string; severity?: string };

    let alerts = fastify.mockDataService.getAlerts();

    if (status) {
      alerts = alerts.filter((a: any) => a.status === status);
    }

    if (severity) {
      alerts = alerts.filter((a: any) => a.severity === severity);
    }

    const alertSummaries = alerts.map((alert: any) => ({
      id: alert.id,
      name: alert.name,
      status: alert.status,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      firedAt: alert.firedAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString(),
    }));

    const allAlerts = fastify.mockDataService.getAlerts();

    reply.send({
      alerts: alertSummaries,
      total: alerts.length,
      activeCount: allAlerts.filter((a: any) => a.status === 'active').length,
      resolvedCount: allAlerts.filter((a: any) => a.status === 'resolved').length,
      silencedCount: allAlerts.filter((a: any) => a.status === 'silenced').length,
    });
  });

  // Create alert rule
  fastify.post('/', {
    schema: {
      description: 'Create alert rule',
      tags: ['Alerts'],
      body: Type.Object({
        name: Type.String(),
        description: Type.Optional(Type.String()),
        metric: Type.String(),
        condition: Type.String(),
        threshold: Type.Number(),
        severity: Type.String(),
        duration: Type.Optional(Type.String()),
        notifications: Type.Optional(Type.Array(Type.String())),
        labels: Type.Optional(Type.Object({}, { additionalProperties: Type.String() })),
      }),
      response: {
        201: Type.Object({
          id: Type.String(),
          name: Type.String(),
          description: Type.Optional(Type.String()),
          metric: Type.String(),
          condition: Type.String(),
          threshold: Type.Number(),
          severity: Type.String(),
          duration: Type.String(),
          notifications: Type.Array(Type.String()),
          labels: Type.Object({}, { additionalProperties: Type.String() }),
          isEnabled: Type.Boolean(),
          createdAt: Type.String(),
          updatedAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const ruleData = request.body as any;

    const rule = await fastify.alertingService.createAlertRule(ruleData);

    reply.status(201).send({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      metric: rule.metric,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      duration: rule.duration,
      notifications: rule.notifications,
      labels: rule.labels,
      isEnabled: rule.isEnabled,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    });
  });

  // Get specific alert
  fastify.get('/:alertId', {
    schema: {
      description: 'Get alert details',
      tags: ['Alerts'],
      params: Type.Object({
        alertId: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          ruleId: Type.String(),
          name: Type.String(),
          status: Type.String(),
          severity: Type.String(),
          metric: Type.String(),
          value: Type.Number(),
          threshold: Type.Number(),
          condition: Type.String(),
          message: Type.String(),
          labels: Type.Object({}, { additionalProperties: Type.String() }),
          firedAt: Type.String(),
          resolvedAt: Type.Optional(Type.String()),
          silencedUntil: Type.Optional(Type.String()),
        }),
      },
    },
  }, async (request, reply) => {
    const { alertId } = request.params as { alertId: string };

    const alert = fastify.mockDataService.getAlertById(alertId);
    if (!alert) {
      return reply.status(404).send({ error: 'Alert not found' });
    }

    reply.send({
      id: alert.id,
      ruleId: alert.ruleId,
      name: alert.name,
      status: alert.status,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      condition: alert.condition,
      message: alert.message,
      labels: alert.labels,
      firedAt: alert.firedAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString(),
      silencedUntil: alert.silencedUntil?.toISOString(),
    });
  });

  // Update alert rule
  fastify.put('/:alertId', {
    schema: {
      description: 'Update alert rule',
      tags: ['Alerts'],
      params: Type.Object({
        alertId: Type.String(),
      }),
      body: Type.Object({
        name: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        metric: Type.Optional(Type.String()),
        condition: Type.Optional(Type.String()),
        threshold: Type.Optional(Type.Number()),
        severity: Type.Optional(Type.String()),
        duration: Type.Optional(Type.String()),
        notifications: Type.Optional(Type.Array(Type.String())),
        labels: Type.Optional(Type.Object({}, { additionalProperties: Type.String() })),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          name: Type.String(),
          description: Type.Optional(Type.String()),
          metric: Type.String(),
          condition: Type.String(),
          threshold: Type.Number(),
          severity: Type.String(),
          duration: Type.String(),
          notifications: Type.Array(Type.String()),
          labels: Type.Object({}, { additionalProperties: Type.String() }),
          isEnabled: Type.Boolean(),
          createdAt: Type.String(),
          updatedAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { alertId } = request.params as { alertId: string };
    const updates = request.body as any;

    const rule = await fastify.alertingService.updateAlertRule(alertId, updates);
    if (!rule) {
      return reply.status(404).send({ error: 'Alert rule not found' });
    }

    reply.send({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      metric: rule.metric,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      duration: rule.duration,
      notifications: rule.notifications,
      labels: rule.labels,
      isEnabled: rule.isEnabled,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    });
  });

  // Delete alert rule
  fastify.delete('/:alertId', {
    schema: {
      description: 'Delete alert rule',
      tags: ['Alerts'],
      params: Type.Object({
        alertId: Type.String(),
      }),
      response: {
        204: Type.Null(),
      },
    },
  }, async (request, reply) => {
    const { alertId } = request.params as { alertId: string };

    const success = await fastify.alertingService.deleteAlertRule(alertId);
    if (!success) {
      return reply.status(404).send({ error: 'Alert rule not found' });
    }

    reply.status(204).send();
  });

  // Silence alert
  fastify.post('/:alertId/silence', {
    schema: {
      description: 'Silence alert',
      tags: ['Alerts'],
      params: Type.Object({
        alertId: Type.String(),
      }),
      body: Type.Object({
        duration: Type.String(),
        reason: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          ruleId: Type.String(),
          name: Type.String(),
          status: Type.String(),
          severity: Type.String(),
          metric: Type.String(),
          value: Type.Number(),
          threshold: Type.Number(),
          condition: Type.String(),
          message: Type.String(),
          labels: Type.Object({}, { additionalProperties: Type.String() }),
          firedAt: Type.String(),
          resolvedAt: Type.Optional(Type.String()),
          silencedUntil: Type.Optional(Type.String()),
        }),
      },
    },
  }, async (request, reply) => {
    const { alertId } = request.params as { alertId: string };
    const { duration, reason } = request.body as { duration: string; reason: string };

    const alert = await fastify.alertingService.silenceAlert(alertId, duration, reason, 'user');
    if (!alert) {
      return reply.status(404).send({ error: 'Alert not found' });
    }

    reply.send({
      id: alert.id,
      ruleId: alert.ruleId,
      name: alert.name,
      status: alert.status,
      severity: alert.severity,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      condition: alert.condition,
      message: alert.message,
      labels: alert.labels,
      firedAt: alert.firedAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString(),
      silencedUntil: alert.silencedUntil?.toISOString(),
    });
  });

  // Get alert history
  fastify.get('/:alertId/history', {
    schema: {
      description: 'Get alert history',
      tags: ['Alerts'],
      params: Type.Object({
        alertId: Type.String(),
      }),
      response: {
        200: Type.Object({
          alert: Type.Any(),
          history: Type.Array(Type.Object({
            timestamp: Type.String(),
            status: Type.String(),
            value: Type.Number(),
            message: Type.String(),
          })),
        }),
      },
    },
  }, async (request, reply) => {
    const { alertId } = request.params as { alertId: string };

    try {
      const { alert, history } = await fastify.alertingService.getAlertHistory(alertId);

      reply.send({
        alert,
        history: history.map((h: any) => ({
          timestamp: h.timestamp.toISOString(),
          status: h.status,
          value: h.value,
          message: h.message,
        })),
      });
    } catch (error) {
      reply.status(404).send({ error: (error as Error).message });
    }
  });
};

export { alertController };