import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@cycletime/shared-utils';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

// Mock user database for demo purposes
const mockUsers: { [key: string]: AuthenticatedUser } = {
  'dev-token-123': {
    id: 'user-1',
    email: 'dev@cycletime.dev',
    name: 'Developer User',
    roles: ['developer'],
    permissions: ['ai:request', 'ai:read', 'ai:write'],
  },
  'admin-token-456': {
    id: 'user-2',
    email: 'admin@cycletime.dev',
    name: 'Admin User',
    roles: ['admin', 'developer'],
    permissions: ['ai:request', 'ai:read', 'ai:write', 'ai:admin'],
  },
  'readonly-token-789': {
    id: 'user-3',
    email: 'readonly@cycletime.dev',
    name: 'Read Only User',
    roles: ['viewer'],
    permissions: ['ai:read'],
  },
};

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authorization header is required',
        code: 'AUTH_HEADER_MISSING',
        timestamp: new Date().toISOString(),
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authorization header must use Bearer token format',
        code: 'INVALID_AUTH_FORMAT',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Bearer token is required',
        code: 'TOKEN_MISSING',
        timestamp: new Date().toISOString(),
      });
    }

    // Mock token validation - in real implementation, this would validate JWT
    const user = mockUsers[token];
    
    if (!user) {
      logger.warn('Invalid token attempted', { token: token.substring(0, 8) + '...', ip: request.ip });
      
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString(),
      });
    }

    // Add user to request context
    request.user = user;
    
    logger.debug('User authenticated successfully', { userId: user.id, email: user.email });
    
  } catch (error) {
    logger.error('Authentication error', error as Error);
    
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

export function requirePermission(permission: string) {
  return async function(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    
    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
      });
    }

    if (!user.permissions.includes(permission)) {
      logger.warn('Insufficient permissions', { 
        userId: user.id, 
        requiredPermission: permission, 
        userPermissions: user.permissions 
      });
      
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Insufficient permissions. Required: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

export function requireRole(role: string) {
  return async function(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    
    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
      });
    }

    if (!user.roles.includes(role)) {
      logger.warn('Insufficient role', { 
        userId: user.id, 
        requiredRole: role, 
        userRoles: user.roles 
      });
      
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Insufficient role. Required: ${role}`,
        code: 'INSUFFICIENT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

// Fastify plugin for authentication
export const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Add authentication hooks for protected routes
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip authentication for health check and docs
    if (request.url === '/health' || 
        request.url.startsWith('/docs') || 
        request.url.startsWith('/documentation')) {
      return;
    }

    // All other routes require authentication
    await authenticateToken(request, reply);
  });
};

// Type augmentation for Fastify request
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}