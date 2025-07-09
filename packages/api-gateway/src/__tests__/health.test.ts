import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { healthRoutes } from '../routes/health';

describe('Health Routes', () => {
  let fastify: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Create test Fastify instance
    fastify = Fastify({ logger: false });
    
    // Mock Prisma client
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as any;

    fastify.decorate('prisma', prisma);
    
    // Register health routes
    await fastify.register(healthRoutes);
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('GET /health', () => {
    it('should return healthy status when all dependencies are up', async () => {
      // Mock successful GitHub API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.dependencies.database).toBe('healthy');
      expect(body.dependencies.github_api).toBe('healthy');
      expect(body.metrics).toHaveProperty('uptime_seconds');
      expect(body.metrics).toHaveProperty('memory_usage_mb');
    });

    it('should return degraded status when GitHub API is down', async () => {
      // Mock failed GitHub API response
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('degraded');
      expect(body.dependencies.database).toBe('healthy');
      expect(body.dependencies.github_api).toBe('unhealthy');
    });

    it('should return unhealthy status when database is down', async () => {
      // Mock database failure
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('unhealthy');
      expect(body.dependencies.database).toBe('unhealthy');

      // Reset mock
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    });
  });

  describe('GET /ready', () => {
    it('should return ready when database is accessible', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ready');
      expect(body.timestamp).toBeDefined();
    });

    it('should return not ready when database is inaccessible', async () => {
      // Mock database failure
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('not ready');

      // Reset mock
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    });
  });

  describe('GET /live', () => {
    it('should always return alive', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('alive');
      expect(body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /version', () => {
    it('should return version information', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/version',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('@cycletime/api-gateway');
      expect(body.version).toBeDefined();
      expect(body.node_version).toBeDefined();
      expect(body.environment).toBeDefined();
    });
  });
});