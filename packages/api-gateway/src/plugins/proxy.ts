/**
 * Proxy Plugin
 * Handles service proxying with load balancing and circuit breaking
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { logger } from '../utils/logger';
import { ProxyPluginOptions, FastifyRequestContext } from '../types';
import { mockDataService } from '../services/mock-data-service';

export const proxyPlugin = async (fastify: FastifyInstance, options: ProxyPluginOptions) => {
  // Configure mock data service if enabled
  const mockEnabled = options.mockResponses?.enabled ?? true;
  if (mockEnabled && options.mockResponses) {
    const mockOptions = {
      defaultDelay: options.mockResponses.defaultDelay,
      errorRate: options.mockResponses.errorRate,
    };
    // Configure the mock service with options
    if (options.mockResponses.defaultDelay !== undefined) {
      mockDataService.setScenario('success', 1 - (options.mockResponses.errorRate || 0.05));
    }
  }

  // Track circuit breaker state
  const circuitBreakers = new Map<string, {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
  }>();

  // Initialize circuit breakers
  for (const service of options.services) {
    circuitBreakers.set(service.name, {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
    });
  }

  // Register proxy routes for each service
  for (const service of options.services) {
    await fastify.register(httpProxy as any, {
      upstream: service.upstream,
      prefix: service.prefix,
      rewritePrefix: service.rewritePrefix || service.prefix,
      timeout: options.timeout,
      retries: options.retries,
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        const context = (request as any).context as FastifyRequestContext;
        const circuitBreaker = circuitBreakers.get(service.name);

        // Check circuit breaker
        if (circuitBreaker?.isOpen) {
          const now = Date.now();
          const timeSinceFailure = now - circuitBreaker.lastFailureTime;
          
          // Reset circuit breaker after 60 seconds
          if (timeSinceFailure > 60000) {
            circuitBreaker.isOpen = false;
            circuitBreaker.failureCount = 0;
            circuitBreaker.successCount = 0;
            logger.info(`Circuit breaker reset for service: ${service.name}`);
          } else {
            if (mockEnabled) {
              logger.warn(`Circuit breaker is open for service: ${service.name}, using mock response`);
              
              // Use mock response when circuit breaker is open
              const mockResponse = await mockDataService.getMockResponse(
                service.name,
                request.method,
                request.url,
                'error' // Use error scenario when circuit breaker is open
              );
              
              return reply.status(mockResponse.statusCode).send(mockResponse.body);
            } else {
              logger.warn(`Circuit breaker is open for service: ${service.name}`);
              return reply.status(503).send({
                error: 'ServiceUnavailable',
                message: `Service ${service.name} is currently unavailable`,
                code: 'CIRCUIT_BREAKER_OPEN',
                statusCode: 503,
                timestamp: new Date().toISOString(),
                requestId: context.requestId,
              });
            }
          }
        }

        // Update route context for event publishing
        context.route = {
          path: request.url,
          method: request.method,
          targetService: service.name,
        };

        // Publish request routed event
        if (fastify.eventPublisher) {
          await fastify.eventPublisher.publish('gateway.requests', 'gateway.request.routed', {
            requestId: context.requestId,
            targetService: service.name,
            targetUrl: `${service.upstream}${request.url.replace(service.prefix, service.rewritePrefix || service.prefix)}`,
            routingRule: 'path-based',
            routingTime: Date.now() - new Date(context.timestamp).getTime(),
            timestamp: new Date().toISOString(),
          });
        }

        logger.debug(`Proxying request to ${service.name}`, {
          requestId: context.requestId,
          path: request.url,
          method: request.method,
          targetService: service.name,
          targetUrl: service.upstream,
        });
      },
      replyOptions: {
        rewriteRequestHeaders: (originalReq: any, headers: any) => {
          const context = (originalReq as any).context as FastifyRequestContext;
          
          // Add request ID to upstream headers
          headers['x-request-id'] = context.requestId;
          
          // Add user info to headers if available
          if (context.user) {
            headers['x-user-id'] = context.user.id;
            headers['x-user-email'] = context.user.email;
            headers['x-user-roles'] = context.user.roles.join(',');
          }
          
          return headers;
        },
      },
      onError: async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
        const context = (request as any).context as FastifyRequestContext;
        const circuitBreaker = circuitBreakers.get(service.name);

        if (circuitBreaker) {
          circuitBreaker.failureCount++;
          circuitBreaker.lastFailureTime = Date.now();
          
          // Open circuit breaker after 5 failures
          if (circuitBreaker.failureCount >= 5) {
            circuitBreaker.isOpen = true;
            logger.warn(`Circuit breaker opened for service: ${service.name}`);
          }
        }

        logger.error(`Proxy error for service ${service.name}:`, {
          error: error.message,
          requestId: context.requestId,
          path: request.url,
          method: request.method,
        });

        // Publish request failed event
        if (fastify.eventPublisher) {
          await fastify.eventPublisher.publish('gateway.requests', 'gateway.request.failed', {
            requestId: context.requestId,
            statusCode: 502,
            errorCode: 'SERVICE_UNAVAILABLE',
            errorMessage: `Service ${service.name} is unavailable: ${error.message}`,
            responseTime: Date.now() - new Date(context.timestamp).getTime(),
            timestamp: new Date().toISOString(),
          });
        }

        // Use mock response when service is unavailable (if enabled)
        if (mockEnabled) {
          try {
            const mockResponse = await mockDataService.getMockResponse(
              service.name,
              request.method,
              request.url,
              'error' // Use error scenario for service failures
            );
            
            logger.info(`Using mock response for unavailable service: ${service.name}`);
            reply.status(mockResponse.statusCode).send(mockResponse.body);
          } catch (mockError) {
            logger.error(`Mock response failed for service ${service.name}:`, mockError);
            
            // Fallback to original error response
            reply.status(502).send({
              error: 'BadGateway',
              message: `Service ${service.name} is unavailable`,
              code: 'SERVICE_UNAVAILABLE',
              statusCode: 502,
              timestamp: new Date().toISOString(),
              requestId: context.requestId,
              details: {
                service: service.name,
                upstream: service.upstream,
                error: error.message,
              },
            });
          }
        } else {
          // Original error response when mocks are disabled
          reply.status(502).send({
            error: 'BadGateway',
            message: `Service ${service.name} is unavailable`,
            code: 'SERVICE_UNAVAILABLE',
            statusCode: 502,
            timestamp: new Date().toISOString(),
            requestId: context.requestId,
            details: {
              service: service.name,
              upstream: service.upstream,
              error: error.message,
            },
          });
        }
      },
    });

    // Add response hook for this service
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const context = (request as any).context as FastifyRequestContext;
      
      // Only handle responses for this service
      if (context.route?.targetService === service.name) {
        const circuitBreaker = circuitBreakers.get(service.name);
        
        if (circuitBreaker && reply.statusCode < 400) {
          // Reset circuit breaker on successful response
          circuitBreaker.failureCount = 0;
          circuitBreaker.successCount++;
          
          if (circuitBreaker.isOpen) {
            circuitBreaker.isOpen = false;
            logger.info(`Circuit breaker closed for service: ${service.name}`);
          }
        }

        // Publish request completed event
        if (fastify.eventPublisher) {
          await fastify.eventPublisher.publish('gateway.requests', 'gateway.request.completed', {
            requestId: context.requestId,
            statusCode: reply.statusCode,
            responseTime: Date.now() - new Date(context.timestamp).getTime(),
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    logger.info(`Proxy registered for service: ${service.name} -> ${service.upstream}`);
  }

  // Add circuit breaker status endpoint
  fastify.decorate('getCircuitBreakerStatus', () => {
    const status: Record<string, any> = {};
    for (const [serviceName, breaker] of circuitBreakers) {
      status[serviceName] = {
        isOpen: breaker.isOpen,
        failureCount: breaker.failureCount,
        successCount: breaker.successCount,
        lastFailureTime: breaker.lastFailureTime ? new Date(breaker.lastFailureTime).toISOString() : null,
      };
    }
    return status;
  });

  logger.info('Proxy plugin registered');
};

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    getCircuitBreakerStatus: () => Record<string, any>;
  }
}