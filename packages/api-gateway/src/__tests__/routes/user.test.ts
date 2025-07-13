import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
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

const mockUserService = {
  getUserById: jest.fn(),
  updateUserProfile: jest.fn(),
  updateLastActive: jest.fn(),
} as unknown as UserService;

describe('User Routes', () => {
  let fastify: FastifyInstance;
  let jwtService: JWTService;
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
    jwtService = new JWTService(fastify);
    
    // Register auth middleware and user routes
    await fastify.register(authMiddleware);
    await fastify.register(userRoutes);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fastify.close();
    jest.resetAllMocks();
  });

  describe('GET /api/v1/user/profile', () => {
    it('should return user profile when authenticated', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
      });

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
      const tokenPair = await jwtService.generateTokenPair('nonexistent_user', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle database errors', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should reject invalid JWT tokens', async () => {
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
      const expiredToken = fastify.jwt.sign(
        { userId: 'user_123', email: 'test@example.com', githubUsername: 'testuser', type: 'access' },
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_INVALID');
    });
  });

  describe('PUT /api/v1/user/profile', () => {
    const validUpdateData = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    it('should update user profile successfully', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      const updatedUser = { ...mockUser, ...validUpdateData, updated_at: new Date() };

      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
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
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      const updatedUser = { ...mockUser, ...partialUpdate };

      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
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
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const invalidData = {
        name: 123, // Should be string
        email: 'invalid-email', // Should be valid email format
        invalid_field: 'not allowed',
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should validate email format', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const invalidEmailData = {
        email: 'not-a-valid-email',
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
        payload: invalidEmailData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should validate name length constraints', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const longNameData = {
        name: 'a'.repeat(256), // Assuming max length is 255
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
        payload: longNameData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should handle empty request body', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(mockUser.id);
      
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user_123', {});
    });

    it('should handle database update errors', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (mockUserService.updateUserProfile as jest.Mock).mockRejectedValue(new Error('Unique constraint violation'));

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
        payload: validUpdateData,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Failed to update user profile');
    });

    it('should handle malformed JSON request body', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
          'content-type': 'application/json',
        },
        payload: '{invalid json}',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should preserve readonly fields', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      
      const attemptToUpdateReadonlyFields = {
        name: 'Updated Name',
        id: 'different_user_id', // Should be ignored
        github_id: 99999, // Should be ignored
        github_username: 'different_username', // Should be ignored
        created_at: new Date().toISOString(), // Should be ignored
      };

      const updatedUser = { ...mockUser, name: 'Updated Name' };

      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
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

  describe('Error Response Format', () => {
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
      expect(body.error.request_id).toMatch(/^req-[a-f0-9]{8}$/);
    });
  });

  describe('Success Response Format', () => {
    it('should return consistent success format for profile retrieval', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
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
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      (mockUserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (mockUserService.updateUserProfile as jest.Mock).mockResolvedValue(updatedUser);

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
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