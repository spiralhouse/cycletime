import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from '../routes/auth';
import { githubAuthService } from '../services/github-auth';

// Mock external dependencies
jest.mock('../services/github-auth', () => ({
  githubAuthService: {
    generateOAuthUrl: jest.fn((state) => `https://github.com/login/oauth/authorize?client_id=test&state=${state}`),
    exchangeCodeForToken: jest.fn().mockResolvedValue('mock_github_token'),
    fetchUserProfile: jest.fn().mockResolvedValue({
      id: 12345,
      login: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://github.com/avatar.jpg',
      html_url: 'https://github.com/testuser',
    }),
  },
}));
jest.mock('node-fetch');

describe('Authentication Routes', () => {
  let fastify: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Create test Fastify instance
    fastify = Fastify({ logger: false });
    
    // Mock Prisma client
    prisma = {
      user: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    fastify.decorate('prisma', prisma);
    
    // Register JWT plugin
    await fastify.register(import('@fastify/jwt'), {
      secret: 'test-secret-key-32-characters-long',
      sign: { algorithm: 'HS256' },
      verify: { algorithms: ['HS256'] },
    });
    
    // Register auth routes
    await fastify.register(authRoutes);
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/github/oauth', () => {
    it('should initiate GitHub OAuth flow', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: {
          redirect_uri: 'http://localhost:3000/dashboard',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('oauth_url');
      expect(body).toHaveProperty('state');
      expect(body.oauth_url).toContain('github.com/login/oauth/authorize');
      expect(body.state).toHaveLength(64); // 32 bytes as hex
    });

    it('should work without redirect_uri', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('oauth_url');
      expect(body).toHaveProperty('state');
    });
  });

  describe('GET /auth/github/callback', () => {
    it('should handle successful OAuth callback', async () => {
      // Mock GitHub OAuth flow
      const mockUser = {
        id: 12345,
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://github.com/avatar.jpg',
        html_url: 'https://github.com/testuser',
      };

      const mockDbUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        githubUsername: 'testuser',
        avatarUrl: 'https://github.com/avatar.jpg',
        githubId: 12345,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { githubAuthService } = require('../services/github-auth');
      (githubAuthService.exchangeCodeForToken as jest.Mock).mockResolvedValue('github_token');
      (githubAuthService.fetchUserProfile as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.upsert as jest.Mock).mockResolvedValue(mockDbUser);

      // First initiate OAuth to get a valid state
      const oauthResponse = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: {},
      });
      const { state } = JSON.parse(oauthResponse.body);

      // Then handle callback
      const response = await fastify.inject({
        method: 'GET',
        url: `/auth/github/callback?code=test_code&state=${state}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(body).toHaveProperty('expires_in');
      expect(body).toHaveProperty('user');
      expect(body.user.github_username).toBe('testuser');
    });

    it('should reject invalid state', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=test_code&state=invalid_state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
    });

    it('should handle GitHub API errors', async () => {
      const { githubAuthService } = require('../services/github-auth');
      (githubAuthService.exchangeCodeForToken as jest.Mock).mockRejectedValue(new Error('GitHub API error'));

      // First initiate OAuth to get a valid state
      const oauthResponse = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: {},
      });
      const { state } = JSON.parse(oauthResponse.body);

      // Then handle callback
      const response = await fastify.inject({
        method: 'GET',
        url: `/auth/github/callback?code=test_code&state=${state}`,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('AUTH_FAILED');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        githubUsername: 'testuser',
        avatarUrl: 'https://github.com/avatar.jpg',
        githubId: 12345,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create a refresh token
      const refreshToken = fastify.jwt.sign(
        {
          userId: 'user-123',
          email: 'test@example.com',
          githubUsername: 'testuser',
          type: 'refresh',
        },
        { expiresIn: '30d' }
      );

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(body).toHaveProperty('expires_in');
      expect(body).toHaveProperty('user');
    });

    it('should reject invalid refresh token', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: 'invalid_token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('REFRESH_FAILED');
    });

    it('should reject access token used as refresh token', async () => {
      // Create an access token instead of refresh token
      const accessToken = fastify.jwt.sign(
        {
          userId: 'user-123',
          email: 'test@example.com',
          githubUsername: 'testuser',
          type: 'access',
        },
        { expiresIn: '1h' }
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: accessToken,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('REFRESH_FAILED');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Logged out successfully');
    });
  });
});