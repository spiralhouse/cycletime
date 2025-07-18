/**
 * Request Context Plugin
 * Adds request context to all incoming requests
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { FastifyRequestContext } from '../types';

export const requestContextPlugin = async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers['x-request-id'] as string) || randomUUID();
    const clientIp = request.headers['x-forwarded-for'] as string || 
                    request.headers['x-real-ip'] as string || 
                    request.socket.remoteAddress || 
                    'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    const timestamp = new Date().toISOString();

    const context: FastifyRequestContext = {
      requestId,
      clientIp,
      userAgent,
      timestamp,
    };

    // Add context to request
    request.context = context;

    // Add request ID to response headers
    reply.header('x-request-id', requestId);

    // Publish request received event
    if (fastify.eventPublisher) {
      await fastify.eventPublisher.publish('gateway.requests', 'gateway.request.received', {
        requestId,
        method: request.method,
        path: request.url,
        headers: request.headers,
        query: request.query,
        clientIp,
        userAgent,
        timestamp,
        userId: context.user?.id,
      });
    }
  });
};