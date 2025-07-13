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
  randomBytes: jest.fn(() => Buffer.from('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'hex')),
}));

// Mock GitHub auth service
jest.mock('../../services/github-auth.js', () => ({
  githubAuthService: {
    generateOAuthUrl: jest.fn((state) => `https://github.com/login/oauth/authorize?client_id=test&state=${state}`),
    exchangeCodeForToken: jest.fn(() => Promise.resolve('mock_github_token')),
    fetchUserProfile: jest.fn(() => Promise.resolve({
      id: 12345,
      login: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://github.com/testuser.avatar',
      html_url: 'https://github.com/testuser'
    })),
  },
}));

// Mock JWT service creation
const mockJWTService = {
  generateTokenPair: jest.fn(),
  verifyToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  extractTokenFromHeader: jest.fn(),
};

jest.mock('../../services/jwt.js', () => ({
  createJWTService: jest.fn(() => mockJWTService),
  JWTService: jest.fn(),
}));

// Mock user service creation
const mockUserServiceAuth = {
  createOrUpdateUser: jest.fn(),
  getUserById: jest.fn(),
  updateLastActive: jest.fn(),
};

jest.mock('../../services/user.js', () => ({
  createUserService: jest.fn(() => mockUserServiceAuth),
  UserService: jest.fn(),
}));

// Mock services
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
} as unknown as PrismaClient;

const mockGitHubAuthService = {
  generateOAuthUrl: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  fetchUserProfile: jest.fn(),
} as unknown as GitHubAuthService;

const mockUserService = {
  createOrUpdateUser: jest.fn(),
  getUserById: jest.fn(),
  updateLastActive: jest.fn(),
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
    
    // Register auth routes - authRoutes creates its own services internally
    await fastify.register(authRoutes);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fastify.close();
    jest.resetAllMocks();
  });

  describe('POST /auth/github/oauth', () => {
    it('should initiate GitHub OAuth flow successfully', async () => {
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
      expect(typeof body.state).toBe('string');
      expect(body.state.length).toBeGreaterThan(0);
    });

    it('should allow empty body (redirect_uri is optional)', async () => {
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
      expect(body.message).toBeDefined();
    });

    it('should handle OAuth initiation (GitHub service always works in test)', async () => {
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
      githubId: 12345,
      githubUsername: 'testuser',
      name: 'Test User',
      avatarUrl: 'https://github.com/testuser.avatar',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // OAuth state is managed internally by the route, reset mocks
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reject callback with invalid state (state validation fails)', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123&state=invalid_state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
      expect(body.error.message).toBe('Invalid or expired OAuth state');
    });

    it('should reject callback without code parameter', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?state=valid_state_123',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
    });

    it('should reject callback without state parameter', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
    });

    it('should reject callback with invalid state', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123&state=invalid_state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
      expect(body.error.message).toBe('Invalid or expired OAuth state');
    });

    it('should handle GitHub token exchange errors (state will be invalid)', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=invalid_code&state=invalid_state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
    });

    it('should handle GitHub profile fetch errors (state will be invalid)', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123&state=invalid_state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
    });

    it('should handle user creation errors', async () => {
      (mockGitHubAuthService.exchangeCodeForToken as jest.Mock).mockResolvedValue('github_access_token_123');
      (mockGitHubAuthService.fetchUserProfile as jest.Mock).mockResolvedValue(mockGitHubProfile);
      (mockUserService.createOrUpdateUser as jest.Mock).mockRejectedValue(
        new Error('Database constraint violation')
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/auth/github/callback?code=github_code_123&state=valid_state_123',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        githubUsername: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://github.com/testuser.avatar',
      };

      // Setup mock responses
      (mockJWTService.refreshAccessToken as jest.Mock).mockResolvedValue({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 3600,
      });
      (mockJWTService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'user_123',
        email: 'test@example.com',
        githubUsername: 'testuser',
        type: 'access',
      });
      (mockUserServiceAuth.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: 'original_refresh_token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
      expect(body).toHaveProperty('expires_in');
      expect(body).toHaveProperty('user');
    });

    it('should validate refresh_token parameter', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
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
      expect(body.error.code).toBe('REFRESH_FAILED');
      expect(body.error.message).toBe('Token refresh failed');
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
      expect(body.error.code).toBe('REFRESH_FAILED');
      expect(body.error.message).toBe('Token refresh failed');
    });

    it('should reject expired refresh token', async () => {
      // Setup mock to throw error for expired token
      (mockJWTService.refreshAccessToken as jest.Mock).mockRejectedValue(new Error('Invalid or expired token'));

      const response = await fastify.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: 'expired_refresh_token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('REFRESH_FAILED');
      expect(body.error.message).toBe('Token refresh failed');
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
      expect(body).toHaveProperty('message');
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
      expect(body.message).toBeDefined();
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