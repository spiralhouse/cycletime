import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@cycletime/shared-utils';

export interface AuthContext {
  userId: string;
  userRole: string;
  permissions: string[];
  organizationId: string;
}

// Extend Fastify request type to include auth context
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export async function authMiddleware(fastify: FastifyInstance): Promise<void> {
  // Register preHandler hook for authentication
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip authentication for health checks and public routes
    const publicPaths = ['/health', '/ready', '/metrics', '/docs'];
    if (publicPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authorization header is required',
          code: 'MISSING_AUTHORIZATION',
          timestamp: new Date().toISOString()
        });
      }

      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Bearer token is required',
          code: 'MISSING_TOKEN',
          timestamp: new Date().toISOString()
        });
      }

      // Mock JWT verification - in a real implementation, this would validate the JWT
      const authContext = await validateToken(token);
      
      if (!authContext) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          timestamp: new Date().toISOString()
        });
      }

      // Attach auth context to request
      request.auth = authContext;
      
      logger.debug(`Request authenticated for user: ${authContext.userId}`, {
        userId: authContext.userId,
        role: authContext.userRole,
        organizationId: authContext.organizationId,
        path: request.url
      });

    } catch (error) {
      logger.error('Authentication error:', error as Error);
      
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication failed',
        code: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Register preHandler hook for authorization
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip authorization for health checks and public routes
    const publicPaths = ['/health', '/ready', '/metrics', '/docs'];
    if (publicPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    // Skip if no auth context (should be handled by auth middleware)
    if (!request.auth) {
      return;
    }

    try {
      const requiredPermission = getRequiredPermission(request.method, request.url);
      
      if (requiredPermission && !hasPermission(request.auth, requiredPermission)) {
        logger.warn(`Permission denied for user ${request.auth.userId}`, {
          userId: request.auth.userId,
          requiredPermission,
          userPermissions: request.auth.permissions,
          path: request.url,
          method: request.method
        });

        return reply.code(403).send({
          error: 'Forbidden',
          message: `Insufficient permissions. Required: ${requiredPermission}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Authorization error:', error as Error);
      
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Authorization failed',
        code: 'AUTHORIZATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  });
}

// Mock token validation function
async function validateToken(token: string): Promise<AuthContext | null> {
  try {
    // In a real implementation, this would:
    // 1. Verify JWT signature
    // 2. Check expiration
    // 3. Validate issuer
    // 4. Extract user information

    // For demo purposes, we'll decode a simple mock token
    if (token === 'mock-admin-token') {
      return {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        userRole: 'admin',
        permissions: ['tasks:read', 'tasks:write', 'tasks:delete', 'tasks:admin'],
        organizationId: 'org-123'
      };
    }

    if (token === 'mock-user-token') {
      return {
        userId: '550e8400-e29b-41d4-a716-446655440002',
        userRole: 'user',
        permissions: ['tasks:read', 'tasks:write'],
        organizationId: 'org-123'
      };
    }

    if (token === 'mock-readonly-token') {
      return {
        userId: '550e8400-e29b-41d4-a716-446655440003',
        userRole: 'readonly',
        permissions: ['tasks:read'],
        organizationId: 'org-123'
      };
    }

    // Try to decode as base64 JSON for development
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const payload = JSON.parse(decoded);
      
      if (payload.userId && payload.userRole && payload.permissions) {
        return {
          userId: payload.userId,
          userRole: payload.userRole,
          permissions: payload.permissions,
          organizationId: payload.organizationId || 'org-123'
        };
      }
    } catch (decodeError) {
      // Token is not valid base64 JSON
    }

    return null;
  } catch (error) {
    logger.error('Token validation error:', error as Error);
    return null;
  }
}

// Determine required permission based on HTTP method and path
function getRequiredPermission(method: string, path: string): string | null {
  // Extract the base path without query parameters
  const basePath = path.split('?')[0];
  
  // Define permission mapping
  const permissionMap: Record<string, Record<string, string>> = {
    'GET': {
      '/api/v1/tasks': 'tasks:read',
      '/api/v1/tasks/': 'tasks:read',
      '/api/v1/tasks/search': 'tasks:read',
      '/api/v1/tasks/analytics': 'tasks:read'
    },
    'POST': {
      '/api/v1/tasks': 'tasks:write',
      '/api/v1/tasks/search': 'tasks:read',
      '/api/v1/tasks/': 'tasks:write'
    },
    'PUT': {
      '/api/v1/tasks/': 'tasks:write'
    },
    'DELETE': {
      '/api/v1/tasks/': 'tasks:delete'
    }
  };

  // Check exact path match first
  const methodPermissions = permissionMap[method];
  if (methodPermissions) {
    for (const [pathPattern, permission] of Object.entries(methodPermissions)) {
      if (basePath === pathPattern || basePath.startsWith(pathPattern)) {
        return permission;
      }
    }
  }

  // Check for task-specific paths (e.g., /api/v1/tasks/{id})
  if (basePath.match(/^\/api\/v1\/tasks\/[^\/]+$/)) {
    switch (method) {
      case 'GET':
        return 'tasks:read';
      case 'PUT':
      case 'PATCH':
        return 'tasks:write';
      case 'DELETE':
        return 'tasks:delete';
    }
  }

  // Check for task sub-resource paths (e.g., /api/v1/tasks/{id}/comments)
  if (basePath.match(/^\/api\/v1\/tasks\/[^\/]+\/.+$/)) {
    switch (method) {
      case 'GET':
        return 'tasks:read';
      case 'POST':
      case 'PUT':
      case 'PATCH':
        return 'tasks:write';
      case 'DELETE':
        return 'tasks:delete';
    }
  }

  // Default to read permission for GET requests, write for others
  if (method === 'GET') {
    return 'tasks:read';
  } else {
    return 'tasks:write';
  }
}

// Check if user has required permission
function hasPermission(auth: AuthContext, requiredPermission: string): boolean {
  // Admin role has all permissions
  if (auth.userRole === 'admin') {
    return true;
  }

  // Check specific permission
  return auth.permissions.includes(requiredPermission);
}

// Utility function to get current user ID from request
export function getCurrentUserId(request: FastifyRequest): string {
  return request.auth?.userId || 'system';
}

// Utility function to check if user has specific permission
export function hasUserPermission(request: FastifyRequest, permission: string): boolean {
  if (!request.auth) {
    return false;
  }
  
  return hasPermission(request.auth, permission);
}

// Utility function to get user's organization ID
export function getUserOrganizationId(request: FastifyRequest): string {
  return request.auth?.organizationId || 'unknown';
}

// Utility function to check if user is admin
export function isAdmin(request: FastifyRequest): boolean {
  return request.auth?.userRole === 'admin';
}