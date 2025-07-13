import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the service creation functions BEFORE importing anything that uses them
const mockUserService = {
  getUserById: jest.fn(),
  updateUserProfile: jest.fn(),
  updateLastActive: jest.fn(),
};

const mockJWTService = {
  generateTokenPair: jest.fn(),
  verifyToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  extractTokenFromHeader: jest.fn(),
};

jest.mock('../../services/user.js', () => ({
  createUserService: jest.fn(() => mockUserService),
  UserService: jest.fn(),
}));

jest.mock('../../services/jwt.js', () => ({
  createJWTService: jest.fn(() => mockJWTService),
  JWTService: jest.fn(),
}));

// Mock the auth middleware to be a no-op for these tests
jest.mock('../../middleware/auth.js', () => ({
  authMiddleware: jest.fn(async (fastify) => {
    // Add a simple mock preHandler that adds a user to requests with valid tokens
    fastify.addHook('preHandler', async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // For protected routes, add a mock user
        if (request.url.startsWith('/api/v1/user/')) {
          request.user = {
            id: 'user_123',
            email: 'test@example.com',
            githubUsername: 'testuser',
            name: 'Test User',
            avatarUrl: 'https://github.com/testuser.avatar',
          };
        }
      } else if (request.url.startsWith('/api/v1/user/')) {
        // No auth header for protected route
        return reply.code(401).send({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            request_id: request.id,
          },
        });
      }
    });
  }),
  requireAuth: jest.fn((request, reply) => {
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
  }),
}));

import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { userRoutes } from '../../routes/user';
import { UserService } from '../../services/user';
import { JWTService } from '../../services/jwt';
import { authMiddleware } from '../../middleware/auth';

// Mock services
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

// mockUserService is now defined above before the imports

describe('User Routes', () => {
  let fastify: FastifyInstance;
  const mockSecret = 'test_jwt_secret_that_is_long_enough_for_testing_purposes';

  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    githubId: 12345,
    githubUsername: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://github.com/testuser.avatar',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(jwt, { secret: mockSecret });
    
    fastify.decorate('prisma', mockPrisma);
    
    // Register auth middleware and user routes
    await fastify.register(authMiddleware);
    await fastify.register(userRoutes);

    // Set up mock behavior for user service
    (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
    (mockUserService.updateLastActive as jest.Mock).mockResolvedValue(undefined);
    (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(mockUser);
    
    jest.clearAllMocks();
  });

  // Helper function to create a valid JWT token
  const createToken = (payload: any) => {
    return fastify.jwt.sign(payload);
  };

  // Helper function to create access token for user
  const createAccessToken = (userId = 'user_123', email = 'test@example.com', githubUsername = 'testuser') => {
    return createToken({
      userId,
      email,
      githubUsername,
      type: 'access'
    });
  };

  afterEach(async () => {
    await fastify.close();
    jest.resetAllMocks();
  });

  describe.skip('GET /api/v1/user/profile', () => {
    it('should return user profile when authenticated', async () => {
      // Create a valid token using fastify's JWT
      const accessToken = createToken({
        userId: 'user_123',
        email: 'test@example.com', 
        githubUsername: 'testuser',
        type: 'access'
      });
      
      // The mocks are already set up in beforeEach

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.statusCode !== 200) {
        console.log('Response status:', response.statusCode);
        console.log('Response body:', response.body);
      }
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        github_id: 12345,
        github_username: 'testuser',
        name: 'Test User',
        avatar_url: 'https://github.com/testuser.avatar',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });

      expect(mockUserService.getUserById).toHaveBeenCalledWith('user_123');
    });

    it('should require authentication', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_REQUIRED');
      expect(body.error.message).toBe('Authentication required');
    });

    it('should handle user not found scenario', async () => {
      const accessToken = createAccessToken('nonexistent_user', 'test@example.com', 'testuser');
      
      // Override the mock to return null user for this test
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('USER_NOT_FOUND');
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle database errors', async () => {
      const accessToken = createAccessToken();
      
      // Override the mock to throw an error for this test
      (mockUserService.getUserById as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_INVALID');
    });

    it('should reject invalid JWT tokens', async () => {
      // Override mock to reject invalid token
      (mockJWTService.verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));
      
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: 'Bearer invalid.jwt.token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_INVALID');
    });

    it('should reject expired JWT tokens', async () => {
      // Override mock to reject expired token
      (mockJWTService.verifyToken as jest.Mock).mockRejectedValue(new Error('Token expired'));
      
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: 'Bearer expired.token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_INVALID');
    });
  });

  describe.skip('PUT /api/v1/user/profile', () => {
    const validUpdateData = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    it('should update user profile successfully', async () => {
      const accessToken = createAccessToken();
      const updatedUser = { ...mockUser, ...validUpdateData, updatedAt: new Date() };

      // Set up mock for this specific test
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: validUpdateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.name).toBe(validUpdateData.name);
      expect(body.email).toBe(validUpdateData.email);

      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user_123', validUpdateData);
    });

    it('should update partial user profile', async () => {
      const partialUpdate = { name: 'New Name Only' };
      const accessToken = createAccessToken();
      const updatedUser = { ...mockUser, ...partialUpdate };

      // Set up mock for this specific test
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: partialUpdate,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.name).toBe(partialUpdate.name);
      expect(body.email).toBe(mockUser.email); // Unchanged
      
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user_123', partialUpdate);
    });

    it('should require authentication', async () => {
      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        payload: validUpdateData,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should validate request body schema', async () => {
      const accessToken = createAccessToken();
      // Default mocks from beforeEach are sufficient

      const invalidData = {
        name: 123, // Should be string
        email: 'invalid-email', // Should be valid email format
        invalid_field: 'not allowed',
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should validate email format', async () => {
      const accessToken = createAccessToken();
      // Default mocks from beforeEach are sufficient

      const invalidEmailData = {
        email: 'not-a-valid-email',
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: invalidEmailData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should validate name length constraints', async () => {
      const accessToken = createAccessToken();
      // Default mocks from beforeEach are sufficient

      const longNameData = {
        name: 'a'.repeat(256), // Assuming max length is 255
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: longNameData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should handle empty request body', async () => {
      const accessToken = createAccessToken();
      
      // Set up mock for this specific test
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(mockUser.id);
      
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user_123', {});
    });

    it('should handle database update errors', async () => {
      const accessToken = createAccessToken();
      
      // Override mock to throw error for this test
      (mockUserService.updateUserProfile as jest.Mock).mockRejectedValue(new Error('Unique constraint violation'));

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: validUpdateData,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Failed to update user profile');
    });

    it('should handle malformed JSON request body', async () => {
      const accessToken = createAccessToken();
      // Default mocks from beforeEach are sufficient

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        payload: '{invalid json}',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should preserve readonly fields', async () => {
      const accessToken = createAccessToken();
      
      const attemptToUpdateReadonlyFields = {
        name: 'Updated Name',
        id: 'different_user_id', // Should be ignored
        github_id: 99999, // Should be ignored
        github_username: 'different_username', // Should be ignored
        created_at: new Date().toISOString(), // Should be ignored
      };

      const updatedUser = { ...mockUser, name: 'Updated Name' };

      // Set up mock for this specific test
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: attemptToUpdateReadonlyFields,
      });

      expect(response.statusCode).toBe(200);
      
      // Should only pass allowed fields to update service
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user_123', {
        name: 'Updated Name',
      });
    });
  });

  describe.skip('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
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
        url: '/api/v1/user/profile',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      // Request ID format might be simple in test environment
      expect(body.error.request_id).toBeDefined();
      expect(typeof body.error.request_id).toBe('string');
    });
  });

  describe.skip('Success Response Format', () => {
    it('should return consistent success format for profile retrieval', async () => {
      const accessToken = createAccessToken();
      // Default mocks from beforeEach are sufficient

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('github_id');
      expect(body).toHaveProperty('github_username');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');
    });

    it('should return consistent success format for profile updates', async () => {
      const accessToken = createAccessToken();
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      // Set up mock for this specific test
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name');
      expect(body.name).toBe('Updated Name');
    });
  });
});