import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createJWTService } from '../services/jwt.js';
import { createUserService } from '../services/user.js';
import { UserContext } from '../types/index.js';
import '../types/fastify.js';

export async function authMiddleware(fastify: FastifyInstance) {
  const jwtService = createJWTService(fastify);
  const userService = createUserService(fastify.prisma);

  // Authentication hook
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip authentication for public routes
    const publicRoutes = [
      '/health',
      '/ready',
      '/live',
      '/version',
      '/auth/github/oauth',
      '/auth/github/callback',
      '/auth/refresh',
    ];

    const isPublicRoute = publicRoutes.some(route => 
      request.routerPath === route || request.url.startsWith(route)
    );

    if (isPublicRoute) {
      return;
    }

    // Extract token from Authorization header
    const token = jwtService.extractTokenFromHeader(request.headers.authorization);
    
    if (!token) {
      return reply.code(401).send({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          request_id: request.id,
        },
      });
    }

    try {
      // Verify token
      const payload = await jwtService.verifyToken(token);
      
      // Ensure it's an access token
      if (payload.type !== 'access') {
        return reply.code(401).send({
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'Invalid token type',
            request_id: request.id,
          },
        });
      }

      // Get user details
      const user = await userService.getUserById(payload.userId);
      
      if (!user) {
        return reply.code(401).send({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            request_id: request.id,
          },
        });
      }

      // Update last active timestamp
      await userService.updateLastActive(user.id);

      // Attach user to request
      request.user = {
        id: user.id,
        email: user.email,
        githubUsername: user.githubUsername,
        name: user.name,
        avatarUrl: user.avatarUrl,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log authentication failure
      fastify.log.warn({
        error: errorMessage,
        url: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        event: 'auth_failed',
      }, 'Authentication failed');

      return reply.code(401).send({
        error: {
          code: 'AUTH_INVALID',
          message: 'Invalid authentication credentials',
          request_id: request.id,
        },
      });
    }
  });
}

/**
 * Utility function to check if user is authenticated
 */
export function requireAuth(request: FastifyRequest, reply: FastifyReply): UserContext {
  if (!request.user) {
    reply.code(401).send({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        request_id: request.id,
      },
    });
    throw new Error('Authentication required');
  }
  
  return request.user;
}