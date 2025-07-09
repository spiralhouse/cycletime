import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { authRoutes } from './auth.js';
import { userRoutes } from './user.js';

export const setupRoutes = async (fastify: FastifyInstance) => {
  // Health check routes
  await fastify.register(healthRoutes);

  // Authentication routes
  await fastify.register(authRoutes);
  
  // User routes
  await fastify.register(userRoutes);

  // API v1 routes will be added in subsequent phases
  // await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
  // await fastify.register(apiKeyRoutes, { prefix: '/api/v1/api-keys' });
};