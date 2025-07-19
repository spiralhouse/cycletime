import { FastifyInstance } from 'fastify';
import { taskRoutes } from './task-routes';
import { dependencyRoutes } from './dependency-routes';
import { scheduleRoutes } from './schedule-routes';
import { progressRoutes } from './progress-routes';
import { commentRoutes } from './comment-routes';
import { searchRoutes } from './search-routes';
import { analyticsRoutes } from './analytics-routes';
import { aiAnalysisRoutes } from './ai-analysis-routes';
import { estimationRoutes } from './estimation-routes';
import { templateRoutes } from './template-routes';
import { riskRoutes } from './risk-routes';

export async function setupRoutes(fastify: FastifyInstance): Promise<void> {
  // Register all route modules
  await fastify.register(taskRoutes, { prefix: '/tasks' });
  await fastify.register(dependencyRoutes, { prefix: '/tasks' });
  await fastify.register(scheduleRoutes, { prefix: '/tasks' });
  await fastify.register(progressRoutes, { prefix: '/tasks' });
  await fastify.register(commentRoutes, { prefix: '/tasks' });
  await fastify.register(searchRoutes, { prefix: '/tasks' });
  await fastify.register(analyticsRoutes, { prefix: '/tasks' });
  await fastify.register(aiAnalysisRoutes, { prefix: '/tasks' });
  await fastify.register(estimationRoutes, { prefix: '/tasks' });
  await fastify.register(templateRoutes, { prefix: '/tasks' });
  await fastify.register(riskRoutes, { prefix: '/tasks' });
}