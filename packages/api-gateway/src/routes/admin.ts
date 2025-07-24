/**
 * Admin Routes
 * Administrative endpoints for gateway management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { 
  ServiceListResponse, 
  ServiceDetailsResponse, 
  RateLimitConfig, 
  FastifyRequestContext 
} from '../types';

export const adminRoutes = async (fastify: FastifyInstance) => {
  // List all registered services
  fastify.get('/admin/services', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      const services = await fastify.serviceDiscovery.listServices();
      
      const serviceListResponse: ServiceListResponse = {
        services,
        total: services.length,
        timestamp: new Date().toISOString(),
      };

      reply.send(serviceListResponse);
    } catch (error) {
      logger.error('Failed to list services:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to list services',
        code: 'SERVICE_LIST_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Get service details
  fastify.get('/admin/services/:serviceId', async (request: FastifyRequest<{ Params: { serviceId: string } }>, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;
    const { serviceId } = request.params;

    try {
      const service = await fastify.serviceDiscovery.discover(serviceId);
      
      if (!service) {
        return reply.status(404).send({
          error: 'NotFound',
          message: `Service ${serviceId} not found`,
          code: 'SERVICE_NOT_FOUND',
          statusCode: 404,
          timestamp: new Date().toISOString(),
          requestId: context.requestId,
        });
      }

      // Mock endpoint info - in a real implementation, this would be discovered
      const endpoints = [
        {
          path: '/health',
          method: 'GET' as const,
          description: 'Health check endpoint',
          rateLimitEnabled: false,
        },
        {
          path: '/api/v1/*',
          method: 'GET' as const,
          description: 'Main API endpoints (GET)',
          rateLimitEnabled: true,
        },
      ];

      // Mock metrics - in a real implementation, these would be collected
      const metrics = {
        requestCount: Math.floor(Math.random() * 10000),
        errorCount: Math.floor(Math.random() * 100),
        averageResponseTime: Math.floor(Math.random() * 500) + 50,
        lastHour: {
          requests: Math.floor(Math.random() * 1000),
          errors: Math.floor(Math.random() * 10),
        },
      };

      const serviceDetailsResponse: ServiceDetailsResponse = {
        service,
        endpoints,
        metrics,
        configuration: {
          timeout: 30000,
          retries: 3,
          circuitBreakerEnabled: true,
          loadBalancerStrategy: 'round_robin',
        },
      };

      reply.send(serviceDetailsResponse);
    } catch (error) {
      logger.error('Failed to get service details:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get service details',
        code: 'SERVICE_DETAILS_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Get rate limit configuration
  fastify.get('/admin/rate-limits', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      const { config } = await import('../config/gateway-config');
      reply.send(config.rateLimit);
    } catch (error) {
      logger.error('Failed to get rate limit config:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get rate limit configuration',
        code: 'RATE_LIMIT_CONFIG_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Update rate limit configuration
  fastify.put('/admin/rate-limits', {
    schema: {
      body: {
        type: 'object',
        properties: {
          global: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              requestsPerMinute: { type: 'number' },
              requestsPerHour: { type: 'number' },
              requestsPerDay: { type: 'number' },
              burstLimit: { type: 'number' },
            },
            required: ['enabled'],
          },
          endpoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                method: { type: 'string' },
                requestsPerMinute: { type: 'number' },
                requestsPerHour: { type: 'number' },
                requestsPerDay: { type: 'number' },
                burstLimit: { type: 'number' },
                enabled: { type: 'boolean' },
              },
              required: ['path', 'method', 'enabled'],
            },
          },
          ipWhitelist: {
            type: 'array',
            items: { type: 'string' },
          },
          ipBlacklist: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['global', 'endpoints'],
      },
    },
  }, async (request: FastifyRequest<{ Body: RateLimitConfig }>, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;
    const newConfig = request.body;

    try {
      // In a real implementation, this would update the configuration
      // For now, we'll just return the updated config
      logger.info('Rate limit configuration updated', {
        requestId: context.requestId,
        updatedBy: context.user?.id,
        config: newConfig,
      });

      // Publish configuration update event
      if (fastify.eventPublisher) {
        await fastify.eventPublisher.publish('gateway.admin', 'gateway.config.updated', {
          configSection: 'rate_limits',
          updatedBy: context.user?.id || 'unknown',
          changes: [
            {
              field: 'global.enabled',
              oldValue: 'true',
              newValue: String(newConfig.global.enabled),
            },
          ],
          timestamp: new Date().toISOString(),
        });
      }

      reply.send(newConfig);
    } catch (error) {
      logger.error('Failed to update rate limit config:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to update rate limit configuration',
        code: 'RATE_LIMIT_UPDATE_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Get circuit breaker status
  fastify.get('/admin/circuit-breakers', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      const circuitBreakerStatus = fastify.getCircuitBreakerStatus();
      
      reply.send({
        circuitBreakers: circuitBreakerStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get circuit breaker status:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get circuit breaker status',
        code: 'CIRCUIT_BREAKER_STATUS_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Reset circuit breaker
  fastify.post('/admin/circuit-breakers/:serviceId/reset', async (request: FastifyRequest<{ Params: { serviceId: string } }>, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;
    const { serviceId } = request.params;

    try {
      // In a real implementation, this would reset the circuit breaker
      logger.info('Circuit breaker reset requested', {
        requestId: context.requestId,
        serviceId,
        requestedBy: context.user?.id,
      });

      reply.send({
        message: `Circuit breaker for ${serviceId} has been reset`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to reset circuit breaker:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to reset circuit breaker',
        code: 'CIRCUIT_BREAKER_RESET_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Get gateway configuration
  fastify.get('/admin/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      const { config } = await import('../config/gateway-config');
      
      // Remove sensitive information before sending
      const sanitizedConfig = {
        ...config,
        auth: {
          ...config.auth,
          jwtSecret: '[REDACTED]',
        },
      };

      reply.send(sanitizedConfig);
    } catch (error) {
      logger.error('Failed to get gateway config:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get gateway configuration',
        code: 'GATEWAY_CONFIG_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  logger.info('Admin routes registered');
};