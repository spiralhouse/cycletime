import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const systemHealthController: FastifyPluginAsync = async (fastify) => {
  // Get system health
  fastify.get('/health', {
    schema: {
      description: 'Get comprehensive system health information',
      tags: ['System Health'],
      response: {
        200: Type.Object({
          overall: Type.String(),
          services: Type.Array(Type.Object({
            name: Type.String(),
            status: Type.String(),
            responseTime: Type.Number(),
            errorRate: Type.Number(),
            uptime: Type.Number(),
          })),
          infrastructure: Type.Object({
            cpu: Type.Number(),
            memory: Type.Number(),
            disk: Type.Number(),
            network: Type.Number(),
            database: Type.String(),
          }),
          metrics: Type.Object({
            totalMetrics: Type.Number(),
            metricsPerSecond: Type.Number(),
            storageUsed: Type.Number(),
            alertsActive: Type.Number(),
          }),
        }),
      },
    },
  }, async (request, reply) => {
    const systemHealth = fastify.mockDataService.getSystemHealth();

    reply.send({
      overall: systemHealth.overall,
      services: systemHealth.services.map(service => ({
        name: service.name,
        status: service.status,
        responseTime: service.responseTime,
        errorRate: service.errorRate,
        uptime: service.uptime,
      })),
      infrastructure: {
        cpu: systemHealth.infrastructure.cpu,
        memory: systemHealth.infrastructure.memory,
        disk: systemHealth.infrastructure.disk,
        network: systemHealth.infrastructure.network,
        database: systemHealth.infrastructure.database,
      },
      metrics: {
        totalMetrics: systemHealth.metrics.totalMetrics,
        metricsPerSecond: systemHealth.metrics.metricsPerSecond,
        storageUsed: systemHealth.metrics.storageUsed,
        alertsActive: systemHealth.metrics.alertsActive,
      },
    });
  });
};

export { systemHealthController };