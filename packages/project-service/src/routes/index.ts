import { FastifyInstance } from 'fastify';
import { projectRoutes } from './project-routes';
import { teamRoutes } from './team-routes';
import { templateRoutes } from './template-routes';
import { analyticsRoutes } from './analytics-routes';
import { resourceRoutes } from './resource-routes';

export async function registerRoutes(app: FastifyInstance) {
  // Register all route modules
  await app.register(projectRoutes, { prefix: '/api/v1' });
  await app.register(teamRoutes, { prefix: '/api/v1' });
  await app.register(templateRoutes, { prefix: '/api/v1' });
  await app.register(analyticsRoutes, { prefix: '/api/v1' });
  await app.register(resourceRoutes, { prefix: '/api/v1' });
}