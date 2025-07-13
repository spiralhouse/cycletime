import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { JWTService } from '../../services/jwt';

describe('JWTService', () => {
  let fastify: FastifyInstance;
  let jwtService: JWTService;
  const mockSecret = 'test_jwt_secret_that_is_long_enough_for_testing_purposes';

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(jwt, { secret: mockSecret });
    jwtService = new JWTService(fastify);
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens with correct payload', async () => {
      const userId = 'user_123';
      const email = 'test@example.com';
      const githubUsername = 'testuser';

      const tokenPair = await jwtService.generateTokenPair(userId, email, githubUsername);

      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('expiresIn');
      expect(typeof tokenPair.accessToken).toBe('string');
      expect(typeof tokenPair.refreshToken).toBe('string');
      expect(typeof tokenPair.expiresIn).toBe('number');
      expect(tokenPair.expiresIn).toBe(900); // 15 minutes default

      // Verify access token payload
      const accessPayload = fastify.jwt.verify(tokenPair.accessToken) as any;
      expect(accessPayload.userId).toBe(userId);
      expect(accessPayload.email).toBe(email);
      expect(accessPayload.githubUsername).toBe(githubUsername);
      expect(accessPayload.type).toBe('access');
      expect(accessPayload.iat).toBeDefined();
      expect(accessPayload.exp).toBeDefined();

      // Verify refresh token payload
      const refreshPayload = fastify.jwt.verify(tokenPair.refreshToken) as any;
      expect(refreshPayload.userId).toBe(userId);
      expect(refreshPayload.email).toBe(email);
      expect(refreshPayload.githubUsername).toBe(githubUsername);
      expect(refreshPayload.type).toBe('refresh');
      expect(refreshPayload.iat).toBeDefined();
      expect(refreshPayload.exp).toBeDefined();

      // Verify expiration times
      expect(refreshPayload.exp).toBeGreaterThan(accessPayload.exp);
    });

    it('should generate tokens with different values each time', async () => {
      const userId = 'user_123';
      const email = 'test@example.com';
      const githubUsername = 'testuser';

      const tokenPair1 = await jwtService.generateTokenPair(userId, email, githubUsername);
      const tokenPair2 = await jwtService.generateTokenPair(userId, email, githubUsername);

      expect(tokenPair1.accessToken).not.toBe(tokenPair2.accessToken);
      expect(tokenPair1.refreshToken).not.toBe(tokenPair2.refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid access token and return payload', async () => {
      const userId = 'user_123';
      const email = 'test@example.com';
      const githubUsername = 'testuser';

      const tokenPair = await jwtService.generateTokenPair(userId, email, githubUsername);
      const payload = await jwtService.verifyToken(tokenPair.accessToken);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.githubUsername).toBe(githubUsername);
      expect(payload.type).toBe('access');
    });

    it('should verify valid refresh token and return payload', async () => {
      const userId = 'user_123';
      const email = 'test@example.com';
      const githubUsername = 'testuser';

      const tokenPair = await jwtService.generateTokenPair(userId, email, githubUsername);
      const payload = await jwtService.verifyToken(tokenPair.refreshToken);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.githubUsername).toBe(githubUsername);
      expect(payload.type).toBe('refresh');
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';

      await expect(jwtService.verifyToken(invalidToken)).rejects.toThrow('Invalid token');
    });

    it('should throw error for malformed token', async () => {
      const malformedToken = 'not-a-jwt-token';

      await expect(jwtService.verifyToken(malformedToken)).rejects.toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      // Create a token that expires immediately
      const expiredToken = fastify.jwt.sign(
        { userId: 'user_123', email: 'test@example.com', githubUsername: 'testuser', type: 'access' },
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(jwtService.verifyToken(expiredToken)).rejects.toThrow('Invalid token');
    });
  });

  describe('refreshTokens', () => {
    it('should generate new token pair from valid refresh token', async () => {
      const userId = 'user_123';
      const email = 'test@example.com';
      const githubUsername = 'testuser';

      const originalTokenPair = await jwtService.generateTokenPair(userId, email, githubUsername);
      const newTokenPair = await jwtService.refreshTokens(originalTokenPair.refreshToken);

      expect(newTokenPair).toHaveProperty('accessToken');
      expect(newTokenPair).toHaveProperty('refreshToken');
      expect(newTokenPair).toHaveProperty('expiresIn');

      // Verify new tokens are different
      expect(newTokenPair.accessToken).not.toBe(originalTokenPair.accessToken);
      expect(newTokenPair.refreshToken).not.toBe(originalTokenPair.refreshToken);

      // Verify new access token has correct payload
      const newPayload = fastify.jwt.verify(newTokenPair.accessToken) as any;
      expect(newPayload.userId).toBe(userId);
      expect(newPayload.email).toBe(email);
      expect(newPayload.githubUsername).toBe(githubUsername);
      expect(newPayload.type).toBe('access');
    });

    it('should throw error when refresh token is not refresh type', async () => {
      const userId = 'user_123';
      const email = 'test@example.com';
      const githubUsername = 'testuser';

      const tokenPair = await jwtService.generateTokenPair(userId, email, githubUsername);

      await expect(jwtService.refreshTokens(tokenPair.accessToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid.refresh.token';

      await expect(jwtService.refreshTokens(invalidToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for expired refresh token', async () => {
      // Create a refresh token that expires immediately
      const expiredRefreshToken = fastify.jwt.sign(
        { userId: 'user_123', email: 'test@example.com', githubUsername: 'testuser', type: 'refresh' },
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(jwtService.refreshTokens(expiredRefreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer authorization header', () => {
      const token = 'jwt.token.here';
      const authHeader = `Bearer ${token}`;

      const extractedToken = jwtService.extractTokenFromHeader(authHeader);

      expect(extractedToken).toBe(token);
    });

    it('should return null for missing authorization header', () => {
      const extractedToken = jwtService.extractTokenFromHeader(undefined);

      expect(extractedToken).toBeNull();
    });

    it('should return null for authorization header without Bearer prefix', () => {
      const authHeader = 'jwt.token.here';

      const extractedToken = jwtService.extractTokenFromHeader(authHeader);

      expect(extractedToken).toBeNull();
    });

    it('should return null for Bearer header without token', () => {
      const authHeader = 'Bearer ';

      const extractedToken = jwtService.extractTokenFromHeader(authHeader);

      expect(extractedToken).toBeNull();
    });

    it('should return null for Bearer header with only spaces', () => {
      const authHeader = 'Bearer   ';

      const extractedToken = jwtService.extractTokenFromHeader(authHeader);

      expect(extractedToken).toBeNull();
    });

    it('should handle case-insensitive Bearer prefix', () => {
      const token = 'jwt.token.here';
      const authHeader = `bearer ${token}`;

      const extractedToken = jwtService.extractTokenFromHeader(authHeader);

      expect(extractedToken).toBe(token);
    });
  });

  describe('parseExpiryToSeconds', () => {
    it('should parse seconds notation correctly', () => {
      expect(jwtService.parseExpiryToSeconds('30s')).toBe(30);
      expect(jwtService.parseExpiryToSeconds('0s')).toBe(0);
    });

    it('should parse minutes notation correctly', () => {
      expect(jwtService.parseExpiryToSeconds('15m')).toBe(900);
      expect(jwtService.parseExpiryToSeconds('1m')).toBe(60);
    });

    it('should parse hours notation correctly', () => {
      expect(jwtService.parseExpiryToSeconds('2h')).toBe(7200);
      expect(jwtService.parseExpiryToSeconds('1h')).toBe(3600);
    });

    it('should parse days notation correctly', () => {
      expect(jwtService.parseExpiryToSeconds('7d')).toBe(604800);
      expect(jwtService.parseExpiryToSeconds('1d')).toBe(86400);
    });

    it('should parse numeric values as seconds', () => {
      expect(jwtService.parseExpiryToSeconds('300')).toBe(300);
      expect(jwtService.parseExpiryToSeconds('0')).toBe(0);
    });

    it('should handle invalid expiry format', () => {
      expect(jwtService.parseExpiryToSeconds('invalid')).toBe(0);
      expect(jwtService.parseExpiryToSeconds('')).toBe(0);
    });
  });
});