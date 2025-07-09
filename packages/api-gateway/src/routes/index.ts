import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';

export const setupRoutes = async (fastify: FastifyInstance) => {
  // Health check routes
  await fastify.register(healthRoutes);

  // API v1 routes will be added in subsequent phases
  // await fastify.register(authRoutes, { prefix: '/auth' });
  // await fastify.register(userRoutes, { prefix: '/api/v1/user' });
  // await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
  // await fastify.register(apiKeyRoutes, { prefix: '/api/v1/api-keys' });
};