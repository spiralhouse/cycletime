import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { JWTService } from '../../services/jwt';
import { UserService } from '../../services/user';
import { authMiddleware } from '../../middleware/auth';

// Mock services
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

const mockUserService = {
  getUserById: jest.fn(),
  updateLastActive: jest.fn(),
} as unknown as UserService;

describe('Authentication Middleware', () => {
  let fastify: FastifyInstance;
  let jwtService: JWTService;
  const mockSecret = 'test_jwt_secret_that_is_long_enough_for_testing_purposes';

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(jwt, { secret: mockSecret });
    
    fastify.decorate('prisma', mockPrisma);
    jwtService = new JWTService(fastify);
    
    // Register auth middleware
    await fastify.register(authMiddleware);
    
    // Add a protected test route
    fastify.get('/protected', async (request: FastifyRequest, reply: FastifyReply) => {
      return { message: 'Protected resource accessed', user: (request as any).user };
    });
    
    // Add a public test route
    fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
      return { status: 'healthy' };
    });

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fastify.close();
    jest.resetAllMocks();
  });

  describe('Public Routes', () => {
    const publicRoutes = [
      '/health',
      '/ready', 
      '/live',
      '/version',
      '/auth/github/oauth',
      '/auth/github/callback',
      '/auth/refresh'
    ];

    publicRoutes.forEach(route => {
      it(`should allow access to public route ${route}`, async () => {
        const response = await fastify.inject({
          method: 'GET',
          url: route,
        });

        // Should not return 401 for public routes
        expect(response.statusCode).not.toBe(401);
      });
    });

    it('should allow access to health route without authentication', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
    });
  });

  describe('Protected Routes', () => {
    it('should reject requests without authorization header', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_REQUIRED');
      expect(body.error.message).toBe('Authentication required');
      expect(body.error.request_id).toBeDefined();
    });

    it('should reject requests with invalid authorization header format', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'InvalidFormat token123',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_REQUIRED');
      expect(body.error.message).toBe('Authentication required');
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer invalid.jwt.token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_TOKEN');
      expect(body.error.message).toBe('Invalid or expired token');
    });

    it('should reject requests with expired JWT token', async () => {
      // Create an expired token
      const expiredToken = fastify.jwt.sign(
        { userId: 'user_123', email: 'test@example.com', githubUsername: 'testuser', type: 'access' },
        { expiresIn: '0s' }
      );

      // Wait to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_TOKEN');
      expect(body.error.message).toBe('Invalid or expired token');
    });

    it('should reject requests with refresh token instead of access token', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');

      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${tokenPair.refreshToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_TOKEN_TYPE');
      expect(body.error.message).toBe('Invalid token type');
    });

    it('should reject requests when user not found in database', async () => {
      const tokenPair = await jwtService.generateTokenPair('nonexistent_user', 'test@example.com', 'testuser');
      
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('USER_NOT_FOUND');
      expect(body.error.message).toBe('User not found');
    });

    it('should allow access with valid access token and inject user context', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        github_id: 12345,
        github_username: 'testuser',
        name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Protected resource accessed');
      expect(body.user).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        githubUsername: 'testuser',
        name: 'Test User',
        avatarUrl: undefined,
      });

      expect(mockUserService.getUserById).toHaveBeenCalledWith('user_123');
    });

    it('should handle database errors gracefully', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      
      (mockUserService.getUserById as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_INVALID');
      expect(body.error.message).toBe('Invalid authentication credentials');
    });

    it('should handle case-insensitive Bearer token', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        github_id: 12345,
        github_username: 'testuser',
        name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `bearer ${tokenPair.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Protected resource accessed');
    });
  });

  describe('Route Pattern Matching', () => {
    it('should handle routes with query parameters', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health?check=all',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle routes with trailing slashes', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health/',
      });

      // Should still be treated as public route
      expect(response.statusCode).not.toBe(401);
    });

    it('should handle OAuth callback route with query parameters', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=test&state=test',
      });

      // Should be treated as public route (won't return 401)
      expect(response.statusCode).not.toBe(401);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for authentication failures', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('request_id');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.request_id).toBe('string');
    });

    it('should include request ID in error responses', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      
      expect(body.error.request_id).toMatch(/^req-[a-f0-9]{8}$/);
    });
  });
});