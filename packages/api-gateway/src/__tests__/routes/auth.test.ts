import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from '../../routes/auth';
import { GitHubAuthService } from '../../services/github-auth';
import { JWTService } from '../../services/jwt';
import { UserService } from '../../services/user';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

// Mock services
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

const mockGitHubAuthService = {
  generateOAuthUrl: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  fetchUserProfile: jest.fn(),
} as unknown as GitHubAuthService;

const mockUserService = {
  findOrCreateUser: jest.fn(),
  getUserById: jest.fn(),
} as unknown as UserService;

describe('Authentication Routes', () => {
  let fastify: FastifyInstance;
  let jwtService: JWTService;
  const mockSecret = 'test_jwt_secret_that_is_long_enough_for_testing_purposes';

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(jwt, { secret: mockSecret });
    
    fastify.decorate('prisma', mockPrisma);
    jwtService = new JWTService(fastify);
    
    // Register auth routes
    await fastify.register(authRoutes, {
      githubAuthService: mockGitHubAuthService,
      jwtService,
      userService: mockUserService,
    });

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fastify.close();
    jest.resetAllMocks();
  });

  describe('POST /auth/github/oauth', () => {
    it('should initiate GitHub OAuth flow successfully', async () => {
      const state = 'random_state_123';
      const crypto = require('crypto');
      crypto.randomBytes.mockReturnValue(Buffer.from(state, 'hex'));
      
      (mockGitHubAuthService.generateOAuthUrl as jest.Mock).mockReturnValue(
        'https://github.com/login/oauth/authorize?client_id=test&state=' + state
      );

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
      expect(body.state).toBe(state);
      
      expect(mockGitHubAuthService.generateOAuthUrl).toHaveBeenCalledWith(state);
    });

    it('should validate redirect_uri parameter', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should validate redirect_uri is a valid URL', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: {
          redirect_uri: 'not-a-valid-url',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should handle GitHub service errors', async () => {
      const state = 'random_state_123';
      const crypto = require('crypto');
      crypto.randomBytes.mockReturnValue(Buffer.from(state, 'hex'));
      
      (mockGitHubAuthService.generateOAuthUrl as jest.Mock).mockImplementation(() => {
        throw new Error('GitHub service unavailable');
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: {
          redirect_uri: 'http://localhost:3000/dashboard',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('OAUTH_INIT_ERROR');
      expect(body.error.message).toBe('Failed to initiate OAuth flow');
    });
  });

  describe('GET /auth/github/callback', () => {
    const mockGitHubProfile = {
      githubId: 12345,
      githubUsername: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
    };

    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      github_id: 12345,
      github_username: 'testuser',
      name: 'Test User',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      // Set up OAuth state
      const state = 'valid_state_123';
      const oauthStates = new Map();
      oauthStates.set(state, {
        redirect_uri: 'http://localhost:3000/dashboard',
        created_at: Date.now(),
      });
      
      // Mock the internal state management
      jest.doMock('../../routes/auth', () => ({
        ...jest.requireActual('../../routes/auth'),
        oauthStates,
      }));
    });

    it('should complete OAuth flow successfully', async () => {
      (mockGitHubAuthService.exchangeCodeForToken as jest.Mock).mockResolvedValue('github_access_token_123');
      (mockGitHubAuthService.fetchUserProfile as jest.Mock).mockResolvedValue(mockGitHubProfile);
      (mockUserService.findOrCreateUser as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123&state=valid_state_123',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('http://localhost:3000/dashboard');
      expect(response.headers.location).toContain('access_token=');
      expect(response.headers.location).toContain('refresh_token=');
      expect(response.headers.location).toContain('expires_in=');

      expect(mockGitHubAuthService.exchangeCodeForToken).toHaveBeenCalledWith('github_code_123');
      expect(mockGitHubAuthService.fetchUserProfile).toHaveBeenCalledWith('github_access_token_123');
      expect(mockUserService.findOrCreateUser).toHaveBeenCalledWith(mockGitHubProfile);
    });

    it('should reject callback without code parameter', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?state=valid_state_123',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('MISSING_CODE');
      expect(body.error.message).toBe('Authorization code is required');
    });

    it('should reject callback without state parameter', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('MISSING_STATE');
      expect(body.error.message).toBe('State parameter is required');
    });

    it('should reject callback with invalid state', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123&state=invalid_state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
      expect(body.error.message).toBe('Invalid state parameter');
    });

    it('should handle GitHub token exchange errors', async () => {
      (mockGitHubAuthService.exchangeCodeForToken as jest.Mock).mockRejectedValue(
        new Error('Invalid authorization code')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=invalid_code&state=valid_state_123',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('GITHUB_TOKEN_ERROR');
      expect(body.error.message).toBe('Failed to exchange authorization code');
    });

    it('should handle GitHub profile fetch errors', async () => {
      (mockGitHubAuthService.exchangeCodeForToken as jest.Mock).mockResolvedValue('github_access_token_123');
      (mockGitHubAuthService.fetchUserProfile as jest.Mock).mockRejectedValue(
        new Error('GitHub API rate limit exceeded')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123&state=valid_state_123',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('GITHUB_PROFILE_ERROR');
      expect(body.error.message).toBe('Failed to fetch GitHub profile');
    });

    it('should handle user creation errors', async () => {
      (mockGitHubAuthService.exchangeCodeForToken as jest.Mock).mockResolvedValue('github_access_token_123');
      (mockGitHubAuthService.fetchUserProfile as jest.Mock).mockResolvedValue(mockGitHubProfile);
      (mockUserService.findOrCreateUser as jest.Mock).mockRejectedValue(
        new Error('Database constraint violation')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123&state=valid_state_123',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('USER_CREATION_ERROR');
      expect(body.error.message).toBe('Failed to create or update user');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const originalTokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: originalTokenPair.refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(body).toHaveProperty('expires_in');
      expect(body.access_token).not.toBe(originalTokenPair.accessToken);
      expect(body.refresh_token).not.toBe(originalTokenPair.refreshToken);
      expect(typeof body.expires_in).toBe('number');
    });

    it('should validate refresh_token parameter', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: 'invalid.refresh.token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
      expect(body.error.message).toBe('Invalid refresh token');
    });

    it('should reject access token used as refresh token', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: tokenPair.accessToken,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
      expect(body.error.message).toBe('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      // Create an expired refresh token
      const expiredRefreshToken = fastify.jwt.sign(
        { userId: 'user_123', email: 'test@example.com', githubUsername: 'testuser', type: 'refresh' },
        { expiresIn: '0s' }
      );

      // Wait to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: expiredRefreshToken,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
      expect(body.error.message).toBe('Invalid refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully (placeholder implementation)', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Logged out successfully');
    });

    it('should handle logout with authorization header', async () => {
      const tokenPair = await jwtService.generateTokenPair('user_123', 'test@example.com', 'testuser');

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: `Bearer ${tokenPair.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Logged out successfully');
    });
  });

  describe('Request Validation', () => {
    it('should return consistent error format for validation failures', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: {
          redirect_uri: 123, // Invalid type
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/github/oauth',
        payload: '{invalid json}',
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should clean up expired OAuth states', async () => {
      // This would test the state cleanup mechanism
      // Implementation depends on how state cleanup is implemented
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=test&state=expired_state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
    });
  });
});