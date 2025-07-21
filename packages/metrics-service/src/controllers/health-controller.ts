import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const healthController: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: Type.Object({
          status: Type.String(),
          timestamp: Type.String(),
          version: Type.String(),
          uptime: Type.Number(),
          overall: Type.String(),
          dependencies: Type.Object({
            redis: Type.String(),
            influxdb: Type.String(),
            prometheus: Type.String(),
            grafana: Type.String(),
          }),
        }),
      },
    },
  }, async (_request, reply) => {
    const healthStatus = fastify.mockDataService.getHealthStatus();
    
    reply.send(healthStatus);
  });
};

export { healthController };