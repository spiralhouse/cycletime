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
          dependencies: Type.Object({
            redis: Type.String(),
            email: Type.String(),
            sms: Type.String(),
            push: Type.String(),
          }),
        }),
      },
    },
  }, async (request, reply) => {
    const healthStatus = fastify.mockDataService.getHealthStatus();
    
    reply.send(healthStatus);
  });
};

export { healthController };