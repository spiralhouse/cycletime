/**
 * Proxy Routes
 * Provides direct proxy endpoints for service access
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { FastifyRequestContext } from '../types';

export const proxyRoutes = async (fastify: FastifyInstance) => {
  // Proxy route for AI Service
  fastify.all('/api/v1/ai-service/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = request.context as FastifyRequestContext;
    
    logger.debug('Proxying to AI Service', {
      requestId: context.requestId,
      path: request.url,
      method: request.method,
      userId: context.user?.id,
    });
    
    // The actual proxying is handled by the proxy plugin
    // This route just ensures the path is registered
  });

  // Proxy route for Context Management Service
  fastify.all('/api/v1/context-management/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = request.context as FastifyRequestContext;
    
    logger.debug('Proxying to Context Management Service', {
      requestId: context.requestId,
      path: request.url,
      method: request.method,
      userId: context.user?.id,
    });
  });

  // Proxy route for Issue Tracker Service
  fastify.all('/api/v1/issue-tracker/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = request.context as FastifyRequestContext;
    
    logger.debug('Proxying to Issue Tracker Service', {
      requestId: context.requestId,
      path: request.url,
      method: request.method,
      userId: context.user?.id,
    });
  });

  // Proxy route for Document Service
  fastify.all('/api/v1/document-service/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = request.context as FastifyRequestContext;
    
    logger.debug('Proxying to Document Service', {
      requestId: context.requestId,
      path: request.url,
      method: request.method,
      userId: context.user?.id,
    });
  });

  // Proxy route for Web Dashboard
  fastify.all('/api/v1/web-dashboard/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = request.context as FastifyRequestContext;
    
    logger.debug('Proxying to Web Dashboard', {
      requestId: context.requestId,
      path: request.url,
      method: request.method,
      userId: context.user?.id,
    });
  });

  logger.info('Proxy routes registered');
};