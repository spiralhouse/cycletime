import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createUserService } from '../services/user.js';
import { requireAuth } from '../middleware/auth.js';

// Request schemas
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

// Response schemas
const userProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  github_username: z.string(),
  avatar_url: z.string(),
  github_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export async function userRoutes(fastify: FastifyInstance) {
  const userService = createUserService(fastify.prisma);

  // GET /api/v1/user/profile - Get current user profile
  fastify.get('/api/v1/user/profile', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            github_username: { type: 'string' },
            avatar_url: { type: 'string' },
            github_id: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' }
          },
          required: ['id', 'email', 'name', 'github_username', 'avatar_url', 'github_id', 'created_at', 'updated_at']
        }
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request, reply);
    
    try {
      const profile = await userService.getUserById(user.id);
      
      if (!profile) {
        return reply.code(404).send({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
            request_id: request.id,
          },
        });
      }
      
      return reply.code(200).send({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        github_username: profile.githubUsername,
        avatar_url: profile.avatarUrl,
        github_id: profile.githubId,
        created_at: profile.createdAt.toISOString(),
        updated_at: profile.updatedAt.toISOString(),
      });
      
    } catch (error) {
      fastify.log.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        event: 'get_profile_error',
      }, 'Failed to get user profile');
      
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user profile',
          request_id: request.id,
        },
      });
    }
  });

  // PUT /api/v1/user/profile - Update user profile
  fastify.put('/api/v1/user/profile', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            github_username: { type: 'string' },
            avatar_url: { type: 'string' },
            github_id: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' }
          },
          required: ['id', 'email', 'name', 'github_username', 'avatar_url', 'github_id', 'created_at', 'updated_at']
        }
      },
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof updateProfileSchema> }>, reply: FastifyReply) => {
    const user = requireAuth(request, reply);
    const updates = request.body;
    
    try {
      const updatedProfile = await userService.updateUserProfile(user.id, updates);
      
      fastify.log.info({
        userId: user.id,
        updates,
        event: 'profile_updated',
      }, 'User profile updated');
      
      return reply.code(200).send({
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        github_username: updatedProfile.githubUsername,
        avatar_url: updatedProfile.avatarUrl,
        github_id: updatedProfile.githubId,
        created_at: updatedProfile.createdAt.toISOString(),
        updated_at: updatedProfile.updatedAt.toISOString(),
      });
      
    } catch (error) {
      fastify.log.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        updates,
        event: 'update_profile_error',
      }, 'Failed to update user profile');
      
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user profile',
          request_id: request.id,
        },
      });
    }
  });

  // DELETE /api/v1/user/profile - Delete user account
  fastify.delete('/api/v1/user/profile', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        }
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = requireAuth(request, reply);
    
    try {
      await userService.deleteUser(user.id);
      
      fastify.log.info({
        userId: user.id,
        event: 'account_deleted',
      }, 'User account deleted');
      
      return reply.code(200).send({
        message: 'Account deleted successfully',
      });
      
    } catch (error) {
      fastify.log.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        event: 'delete_account_error',
      }, 'Failed to delete user account');
      
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user account',
          request_id: request.id,
        },
      });
    }
  });
}