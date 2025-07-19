/**
 * Authentication Routes
 * Handles user authentication, token management, and user profile endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse, 
  UserProfile, 
  JWTPayload,
  RefreshTokenPayload,
  FastifyRequestContext 
} from '../types';

// Request schemas
const oauthInitiateSchema = z.object({
  redirect_uri: z.string().url().optional(),
});

const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

// Response schemas
const oauthInitiateResponseSchema = z.object({
  oauth_url: z.string(),
  state: z.string(),
});

const authSuccessResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    github_username: z.string(),
    avatar_url: z.string(),
  }),
});

// In-memory state storage (in production, use Redis or database)
const oauthStates = new Map<string, { redirect_uri?: string; created_at: number }>();

// Clean up old states (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  
  for (const [state, data] of oauthStates.entries()) {
    if (data.created_at < tenMinutesAgo) {
      oauthStates.delete(state);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export async function authRoutes(fastify: FastifyInstance) {
  const jwtService = createJWTService(fastify);
  const userService = createUserService(fastify.prisma);

  // POST /auth/github/oauth - Initiate GitHub OAuth flow
  fastify.post('/auth/github/oauth', {
    schema: {
      body: {
        type: 'object',
        properties: {
          redirect_uri: { type: 'string', format: 'uri' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            oauth_url: { type: 'string' },
            state: { type: 'string' }
          },
          required: ['oauth_url', 'state']
        }
      },
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof oauthInitiateSchema> }>, reply: FastifyReply) => {
    const { redirect_uri } = request.body;
    
    // Generate CSRF state
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state for validation
    oauthStates.set(state, {
      redirect_uri,
      created_at: Date.now(),
    });
    
    // Generate GitHub OAuth URL
    const oauthUrl = githubAuthService.generateOAuthUrl(state);
    
    return reply.code(200).send({
      oauth_url: oauthUrl,
      state,
    });
  });

  // GET /auth/github/callback - Handle GitHub OAuth callback
  fastify.get('/auth/github/callback', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' }
        },
        required: ['code', 'state']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            expires_in: { type: 'number' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                github_username: { type: 'string' },
                avatar_url: { type: 'string' }
              },
              required: ['id', 'email', 'name', 'github_username', 'avatar_url']
            }
          },
          required: ['access_token', 'refresh_token', 'expires_in', 'user']
        }
      },
    },
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof oauthCallbackSchema> }>, reply: FastifyReply) => {
    const { code, state } = request.query;
    
    // Validate state
    const stateData = oauthStates.get(state);
    if (!stateData) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_STATE',
          message: 'Invalid or expired OAuth state',
          request_id: request.id,
        },
      });
    }
    
    // Clean up state
    oauthStates.delete(state);
    
    try {
      // Exchange code for access token
      const githubAccessToken = await githubAuthService.exchangeCodeForToken(code);
      
      // Fetch user profile
      const githubUser = await githubAuthService.fetchUserProfile(githubAccessToken);
      
      // Create or update user
      const user = await userService.createOrUpdateUser(githubUser);
      
      // Generate JWT tokens
      const tokens = await jwtService.generateTokenPair(
        user.id,
        user.email,
        user.githubUsername
      );
      
      // Log successful authentication
      fastify.log.info({
        userId: user.id,
        githubUsername: user.githubUsername,
        event: 'auth_success',
      }, 'User authenticated successfully');
      
      return reply.code(200).send({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          github_username: user.githubUsername,
          avatar_url: user.avatarUrl,
        },
      });
      
    } catch (error) {
      fastify.log.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        code,
        state,
        event: 'auth_error',
      }, 'Authentication failed');
      
      return reply.code(500).send({
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication failed',
          request_id: request.id,
        },
      });
    }
  });

  // POST /auth/refresh - Refresh access token
  fastify.post('/auth/refresh', {
    schema: {
      body: {
        type: 'object',
        properties: {
          refresh_token: { type: 'string' }
        },
        required: ['refresh_token']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            expires_in: { type: 'number' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                github_username: { type: 'string' },
                avatar_url: { type: 'string' }
              },
              required: ['id', 'email', 'name', 'github_username', 'avatar_url']
            }
          },
          required: ['access_token', 'refresh_token', 'expires_in', 'user']
        }
      },
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof refreshTokenSchema> }>, reply: FastifyReply) => {
    const { refresh_token } = request.body;
    
    try {
      // Refresh tokens
      const tokens = await jwtService.refreshAccessToken(refresh_token);
      
      // Get user info from token
      const payload = await jwtService.verifyToken(tokens.accessToken);
      const user = await userService.getUserById(payload.userId);
      
      if (!user) {
        return reply.code(404).send({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            request_id: request.id,
          },
        });
      }
      
      // Update last active
      await userService.updateLastActive(user.id);
      
      return reply.code(200).send({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          github_username: user.githubUsername,
          avatar_url: user.avatarUrl,
        },
      });
      
    } catch (error) {
      fastify.log.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        event: 'refresh_error',
      }, 'Token refresh failed');
      
      return reply.code(401).send({
        error: {
          code: 'REFRESH_FAILED',
          message: 'Token refresh failed',
          request_id: request.id,
        },
      });
    }
  });

  // POST /auth/logout - Logout user (invalidate tokens)
  fastify.post('/auth/logout', {
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
    // In a full implementation, we would:
    // 1. Add tokens to a blacklist
    // 2. Clean up any server-side session data
    // 3. Potentially revoke GitHub access token
    
    // For now, we just return success since JWT tokens are stateless
    // Client should discard the tokens on logout
    
    return reply.code(200).send({
      message: 'Logged out successfully',
    });
  });
}