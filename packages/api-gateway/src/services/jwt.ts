import { FastifyInstance } from 'fastify';
import { config } from '../config.js';

export interface JWTPayload {
  userId: string;
  email: string;
  githubUsername: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(userId: string, email: string, githubUsername: string): Promise<TokenPair> {
    const basePayload = {
      userId,
      email,
      githubUsername,
    };

    const accessToken = this.fastify.jwt.sign(
      { ...basePayload, type: 'access' },
      { expiresIn: config.jwtAccessExpiry }
    );

    const refreshToken = this.fastify.jwt.sign(
      { ...basePayload, type: 'refresh' },
      { expiresIn: config.jwtRefreshExpiry }
    );

    // Calculate expiry in seconds (default 1h = 3600s)
    const expiresIn = this.parseExpiryToSeconds(config.jwtAccessExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const payload = this.fastify.jwt.verify(token) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyToken(refreshToken);
    
    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    return this.generateTokenPair(
      payload.userId,
      payload.email,
      payload.githubUsername
    );
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authorization?: string): string | null {
    if (!authorization) return null;
    
    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
    
    const token = parts[1].trim();
    return token || null;
  }

  /**
   * Parse expiry string to seconds
   */
  parseExpiryToSeconds(expiry: string): number {
    // Check if it's just a number (treated as seconds)
    if (/^\d+$/.test(expiry)) {
      return parseInt(expiry, 10);
    }
    
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // default 1 hour
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }
}

export const createJWTService = (fastify: FastifyInstance) => new JWTService(fastify);