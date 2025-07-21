/**
 * API Gateway Application Builder
 * Configures and builds the Fastify application with all plugins and routes
 */

import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';

import { config } from './config/gateway-config';
import { logger } from './utils/logger';
import { requestContextPlugin } from './plugins/request-context';
import { serviceDiscoveryPlugin } from './plugins/service-discovery';
import { eventPublisherPlugin } from './plugins/event-publisher';
import { authenticationPlugin } from './plugins/authentication';
import { proxyPlugin } from './plugins/proxy';
import { metricsPlugin } from './plugins/metrics';

// Route imports
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import { metricsRoutes } from './routes/metrics';

import type { FastifyRequestContext } from './types';

export const build = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: config.logging.level,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Register security plugins
  await app.register(helmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await app.register(cors as any, {
    origin: config.server.environment === 'production' ? false : true,
    credentials: true,
  });

  // Register JWT plugin
  await app.register(jwt as any, {
    secret: config.auth.jwtSecret,
    sign: {
      expiresIn: config.auth.tokenExpirationTime,
    },
  });

  // Register rate limiting
  await app.register(rateLimit as any, {
    max: config.rateLimit.global.requestsPerMinute || 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request: FastifyRequest, context: any) => {
      return {
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
        statusCode: 429,
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };
    },
  });

  // Register custom plugins
  await app.register(requestContextPlugin);
  await app.register(serviceDiscoveryPlugin, {
    healthCheckInterval: config.monitoring.healthCheckInterval,
    serviceTimeout: 5000,
    retryAttempts: 3,
  });
  await app.register(eventPublisherPlugin);
  await app.register(authenticationPlugin, {
    jwtSecret: config.auth.jwtSecret,
    tokenExpirationTime: config.auth.tokenExpirationTime,
    refreshTokenExpirationTime: config.auth.refreshTokenExpirationTime,
  });
  await app.register(proxyPlugin, {
    services: config.services.map(service => ({
      name: service.name,
      prefix: `/api/v1/${service.name}`,
      upstream: service.url,
      healthCheckPath: service.healthCheckUrl,
    })),
    timeout: 30000,
    retries: 3,
    mockResponses: {
      enabled: process.env.MOCK_RESPONSES_ENABLED === 'true' || config.server.environment === 'development',
      defaultDelay: parseInt(process.env.MOCK_RESPONSE_DELAY || '150', 10),
      errorRate: parseFloat(process.env.MOCK_ERROR_RATE || '0.05'),
    },
  });
  await app.register(metricsPlugin);

  // Register route handlers
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(adminRoutes);
  await app.register(metricsRoutes);

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    const context = (request as any).context as FastifyRequestContext;
    
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      requestId: context.requestId,
      path: request.url,
      method: request.method,
      userId: context.user?.id,
    });

    // Publish error event
    if (app.eventPublisher) {
      await app.eventPublisher.publish('gateway.requests', 'gateway.request.failed', {
        requestId: context.requestId,
        statusCode: error.statusCode || 500,
        errorCode: error.code || 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        responseTime: Date.now() - new Date(context.timestamp).getTime(),
        timestamp: new Date().toISOString(),
      });
    }

    const statusCode = error.statusCode || 500;
    const response = {
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'INTERNAL_SERVER_ERROR',
      statusCode,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    };

    reply.status(statusCode).send(response);
  });

  // Not found handler
  app.setNotFoundHandler(async (request, reply) => {
    const context = (request as any).context as FastifyRequestContext;
    
    logger.warn('Route not found:', {
      path: request.url,
      method: request.method,
      requestId: context.requestId,
      userId: context.user?.id,
    });

    reply.status(404).send({
      error: 'NotFound',
      message: `Route ${request.method} ${request.url} not found`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    });
  });

  return app;
};