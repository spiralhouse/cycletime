import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { indexRoutes } from './index-routes';
import { documentRoutes } from './document-routes';
import { searchRoutes } from './search-routes';
import { embeddingRoutes } from './embedding-routes';
import { analyticsRoutes } from './analytics-routes';

export async function registerRoutes(app: FastifyInstance) {
  // Health check routes (no prefix since they define their own paths)
  await app.register(healthRoutes);
  
  // API routes
  await app.register(indexRoutes, { prefix: '/api/v1/indices' });
  await app.register(documentRoutes, { prefix: '/api/v1/documents' });
  await app.register(searchRoutes, { prefix: '/api/v1/search' });
  await app.register(embeddingRoutes, { prefix: '/api/v1/embeddings' });
  await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
  
  // Root redirect
  app.get('/', async (request, reply) => {
    reply.redirect('/docs');
  });
}