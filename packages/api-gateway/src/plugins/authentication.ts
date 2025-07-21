/**
 * Authentication Plugin
 * Handles JWT authentication and authorization
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { AuthPluginOptions, JWTPayload, FastifyRequestContext } from '../types';

export const authenticationPlugin = async (fastify: FastifyInstance, options: AuthPluginOptions) => {
  // Authentication hook - runs before route handlers
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;
    
    // Skip authentication for excluded routes
    const excludedRoutes = [
      '/health',
      '/metrics',
      '/auth/login',
      '/auth/refresh',
      '/admin/services', // Allow for demo purposes
      ...(options.excludedRoutes || []),
    ];
    
    const isExcluded = excludedRoutes.some(route => {
      if (route.includes('*')) {
        return request.url.startsWith(route.replace('*', ''));
      }
      return request.url === route;
    });
    
    if (isExcluded) {
      return;
    }

    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        await publishAuthFailedEvent(fastify, context, 'missing_token', 'Missing Authorization header');
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing Authorization header',
          code: 'MISSING_TOKEN',
          statusCode: 401,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        });
      }

      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        await publishAuthFailedEvent(fastify, context, 'invalid_token', 'Invalid token format');
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid token format',
          code: 'INVALID_TOKEN',
          statusCode: 401,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        });
      }

      // Verify and decode JWT token
      const payload = (fastify as any).jwt.verify(token) as JWTPayload;
      
      // Add user info to context
      context.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
      };

      // Publish authentication success event
      if (fastify.eventPublisher) {
        await fastify.eventPublisher.publish('gateway.auth', 'gateway.auth.success', {
          userId: payload.sub,
          email: payload.email,
          authMethod: 'jwt',
          timestamp: new Date().toISOString(),
          clientIp: context.clientIp,
          userAgent: context.userAgent,
        });
      }

      logger.debug('Authentication successful', {
        userId: payload.sub,
        email: payload.email,
        requestId: context.requestId,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
      await publishAuthFailedEvent(fastify, context, 'invalid_token', errorMessage);
      
      return reply.status(401).send({
        error: 'Unauthorized',
        message: errorMessage,
        code: 'INVALID_TOKEN',
        statusCode: 401,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Helper function to check user roles
  fastify.decorate('checkRole', (requiredRoles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const context = (request as any).context as FastifyRequestContext;
      const user = context.user;

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
          statusCode: 401,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        });
      }

      const hasRequiredRole = requiredRoles.some(role => user.roles.includes(role));
      if (!hasRequiredRole) {
        await publishAuthFailedEvent(fastify, context, 'insufficient_permissions', 'Insufficient permissions');
        
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        });
      }
    };
  });

  // Helper function to check user permissions
  fastify.decorate('checkPermission', (requiredPermissions: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const context = (request as any).context as FastifyRequestContext;
      const user = context.user;

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED',
          statusCode: 401,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        });
      }

      const hasRequiredPermission = requiredPermissions.some(permission => user.permissions.includes(permission));
      if (!hasRequiredPermission) {
        await publishAuthFailedEvent(fastify, context, 'insufficient_permissions', 'Insufficient permissions');
        
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        });
      }
    };
  });

  logger.info('Authentication plugin registered');
};

async function publishAuthFailedEvent(
  fastify: FastifyInstance, 
  context: FastifyRequestContext, 
  reason: string, 
  message: string
): Promise<void> {
  if (fastify.eventPublisher) {
    await fastify.eventPublisher.publish('gateway.auth', 'gateway.auth.failed', {
      reason,
      message,
      timestamp: new Date().toISOString(),
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      attemptedPath: context.route?.path,
    });
  }
}

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    checkRole: (requiredRoles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkPermission: (requiredPermissions: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}