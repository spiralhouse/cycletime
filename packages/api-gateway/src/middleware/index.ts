import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config.js';
import { errorHandler } from './error-handler.js';
import { requestLogger } from './request-logger.js';

export const setupMiddleware = async (fastify: FastifyInstance) => {
  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  // CORS configuration
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      if (config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // For development, allow localhost with any port
      if (config.nodeEnv === 'development' && origin.match(/^http:\/\/localhost:\d+$/)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.rateLimitMaxRequests,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (request) => {
      // Use user ID if authenticated, otherwise IP address
      return (request as any).user?.id || request.ip;
    },
    errorResponseBuilder: (request, context) => {
      return {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
          details: {
            limit: (context as any).max,
            window: (context as any).timeWindow,
            remaining: (context as any).max - (context as any).hits,
          },
          request_id: request.id,
        },
      };
    },
  });

  // Request logging middleware
  fastify.addHook('preHandler', requestLogger);

  // Global error handler
  fastify.setErrorHandler(errorHandler);

  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        request_id: request.id,
      },
    });
  });
};