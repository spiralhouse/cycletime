import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const notificationController: FastifyPluginAsync = async (fastify) => {
  // Get all notifications
  fastify.get('/', {
    schema: {
      description: 'List notifications',
      tags: ['Notifications'],
      querystring: Type.Object({
        channel: Type.Optional(Type.String()),
        status: Type.Optional(Type.String()),
        recipient: Type.Optional(Type.String()),
        limit: Type.Optional(Type.Number()),
        offset: Type.Optional(Type.Number()),
      }),
      response: {
        200: Type.Object({
          notifications: Type.Array(Type.Object({
            id: Type.String(),
            channel: Type.String(),
            recipient: Type.String(),
            subject: Type.String(),
            status: Type.String(),
            sentAt: Type.Optional(Type.String()),
            deliveredAt: Type.Optional(Type.String()),
            createdAt: Type.String(),
          })),
          total: Type.Number(),
          limit: Type.Number(),
          offset: Type.Number(),
        }),
      },
    },
  }, async (request, reply) => {
    const { channel, status, recipient, limit = 50, offset = 0 } = request.query as any;
    
    let notifications = fastify.mockDataService.getNotifications();

    if (channel) {
      notifications = notifications.filter((n: any) => n.channel === channel);
    }

    if (status) {
      notifications = notifications.filter((n: any) => n.status === status);
    }

    if (recipient) {
      notifications = notifications.filter((n: any) => n.recipient.includes(recipient));
    }

    const paginatedNotifications = notifications
      .slice(offset, offset + limit)
      .map((n: any) => ({
        id: n.id,
        channel: n.channel,
        recipient: n.recipient,
        subject: n.subject,
        status: n.status,
        sentAt: n.sentAt?.toISOString(),
        deliveredAt: n.deliveredAt?.toISOString(),
        createdAt: n.createdAt.toISOString(),
      }));

    reply.send({
      notifications: paginatedNotifications,
      total: notifications.length,
      limit,
      offset,
    });
  });

  // Send notification
  fastify.post('/', {
    schema: {
      description: 'Send notification',
      tags: ['Notifications'],
      body: Type.Object({
        channel: Type.String(),
        recipient: Type.String(),
        templateId: Type.Optional(Type.String()),
        subject: Type.Optional(Type.String()),
        content: Type.Optional(Type.String()),
        data: Type.Optional(Type.Object({})),
        scheduledAt: Type.Optional(Type.String()),
        priority: Type.Optional(Type.String()),
        metadata: Type.Optional(Type.Object({})),
      }),
      response: {
        201: Type.Object({
          id: Type.String(),
          channel: Type.String(),
          recipient: Type.String(),
          subject: Type.String(),
          status: Type.String(),
          priority: Type.String(),
          createdAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const notificationRequest = request.body as any;

    const notification = await fastify.notificationService?.sendNotification(notificationRequest);

    if (!notification) {
      return reply.status(500).send({ error: 'Failed to send notification' });
    }

    reply.status(201).send({
      id: notification.id,
      channel: notification.channel,
      recipient: notification.recipient,
      subject: notification.subject,
      status: notification.status,
      priority: notification.priority,
      createdAt: notification.createdAt.toISOString(),
    });
  });

  // Get specific notification
  fastify.get('/:notificationId', {
    schema: {
      description: 'Get notification details',
      tags: ['Notifications'],
      params: Type.Object({
        notificationId: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          channel: Type.String(),
          recipient: Type.String(),
          subject: Type.String(),
          content: Type.String(),
          status: Type.String(),
          priority: Type.String(),
          sentAt: Type.Optional(Type.String()),
          deliveredAt: Type.Optional(Type.String()),
          createdAt: Type.String(),
          updatedAt: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { notificationId } = request.params as { notificationId: string };

    const notification = fastify.mockDataService.getNotificationById(notificationId);
    if (!notification) {
      return reply.status(404).send({ error: 'Notification not found' });
    }

    reply.send({
      id: notification.id,
      channel: notification.channel,
      recipient: notification.recipient,
      subject: notification.subject,
      content: notification.content,
      status: notification.status,
      priority: notification.priority,
      sentAt: notification.sentAt?.toISOString(),
      deliveredAt: notification.deliveredAt?.toISOString(),
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    });
  });

  // Send bulk notifications
  fastify.post('/bulk', {
    schema: {
      description: 'Send bulk notifications',
      tags: ['Notifications'],
      body: Type.Object({
        notifications: Type.Array(Type.Object({
          channel: Type.String(),
          recipient: Type.String(),
          templateId: Type.Optional(Type.String()),
          subject: Type.Optional(Type.String()),
          content: Type.Optional(Type.String()),
          data: Type.Optional(Type.Object({})),
        })),
        batchSize: Type.Optional(Type.Number()),
        priority: Type.Optional(Type.String()),
      }),
      response: {
        202: Type.Object({
          batchId: Type.String(),
          totalNotifications: Type.Number(),
          queuedNotifications: Type.Number(),
          failedNotifications: Type.Number(),
          status: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const bulkRequest = request.body as any;

    const result = await fastify.notificationService?.sendBulkNotifications(bulkRequest);

    reply.status(202).send(result);
  });

  // Retry notification
  fastify.post('/:notificationId/retry', {
    schema: {
      description: 'Retry failed notification',
      tags: ['Notifications'],
      params: Type.Object({
        notificationId: Type.String(),
      }),
      response: {
        200: Type.Object({
          id: Type.String(),
          status: Type.String(),
          retryCount: Type.Number(),
        }),
      },
    },
  }, async (request, reply) => {
    const { notificationId } = request.params as { notificationId: string };

    try {
      const notification = await fastify.notificationService?.retryNotification(notificationId);
      if (!notification) {
        return reply.status(404).send({ error: 'Notification not found' });
      }

      reply.send({
        id: notification.id,
        status: notification.status,
        retryCount: notification.retryCount,
      });
    } catch (error) {
      reply.status(400).send({ error: (error as Error).message });
    }
  });
};

export { notificationController };