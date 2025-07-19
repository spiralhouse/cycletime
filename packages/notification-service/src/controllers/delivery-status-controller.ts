import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const deliveryStatusController: FastifyPluginAsync = async (fastify) => {
  // Get delivery status summary
  fastify.get('/', async (request, reply) => {
    const { timeRange = '24h', channel } = request.query as { timeRange?: string; channel?: string };
    
    const report = await fastify.deliveryTrackingService.getDeliveryReport(timeRange, channel);
    reply.send(report);
  });

  // Get notification delivery status
  fastify.get('/:notificationId', async (request, reply) => {
    const { notificationId } = request.params as { notificationId: string };
    
    try {
      const status = await fastify.deliveryTrackingService.getNotificationDeliveryStatus(notificationId);
      reply.send(status);
    } catch (error) {
      reply.status(404).send({ error: error.message });
    }
  });
};

export { deliveryStatusController };