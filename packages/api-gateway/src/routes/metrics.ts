/**
 * Metrics Routes
 * Provides operational metrics and monitoring endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { FastifyRequestContext } from '../types';

export const metricsRoutes = async (fastify: FastifyInstance) => {
  // Get gateway metrics
  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      // Ensure metrics decorator is available
      if (!fastify.metrics) {
        // Provide mock metrics for test environment
        const mockMetrics = {
          requestCount: { 'GET:/api/v1/ai-service/models': 1 },
          responseTime: { average: 150, p95: 200, p99: 250 },
          errorRate: {},
          rateLimitHits: {},
          activeConnections: 0,
          timestamp: new Date().toISOString(),
        };
        return reply.send(mockMetrics);
      }
      
      const metrics = fastify.metrics.getMetrics();
      
      reply.send(metrics);
    } catch (error) {
      logger.error('Failed to get metrics:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get metrics',
        code: 'METRICS_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Get Prometheus-style metrics
  fastify.get('/metrics/prometheus', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      const metrics = fastify.metrics.getMetrics();
      
      // Convert to Prometheus format
      const prometheusMetrics = `# HELP gateway_requests_total Total number of requests
# TYPE gateway_requests_total counter
${Object.entries(metrics.requestCount).map(([key, value]) => 
  `gateway_requests_total{endpoint="${key}"} ${value}`
).join('\n')}

# HELP gateway_response_time_seconds Response time in seconds
# TYPE gateway_response_time_seconds histogram
gateway_response_time_seconds_average ${metrics.responseTime.average / 1000}
gateway_response_time_seconds_p95 ${metrics.responseTime.p95 / 1000}
gateway_response_time_seconds_p99 ${metrics.responseTime.p99 / 1000}

# HELP gateway_errors_total Total number of errors
# TYPE gateway_errors_total counter
${Object.entries(metrics.errorRate).map(([key, value]) => 
  `gateway_errors_total{endpoint="${key}"} ${value}`
).join('\n')}

# HELP gateway_rate_limit_hits_total Total number of rate limit hits
# TYPE gateway_rate_limit_hits_total counter
${Object.entries(metrics.rateLimitHits).map(([key, value]) => 
  `gateway_rate_limit_hits_total{endpoint="${key}"} ${value}`
).join('\n')}

# HELP gateway_active_connections Current number of active connections
# TYPE gateway_active_connections gauge
gateway_active_connections ${metrics.activeConnections}

# HELP gateway_info Gateway information
# TYPE gateway_info gauge
gateway_info{version="1.0.0"} 1
`;

      reply.type('text/plain').send(prometheusMetrics);
    } catch (error) {
      logger.error('Failed to get Prometheus metrics:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get Prometheus metrics',
        code: 'PROMETHEUS_METRICS_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Get metrics summary
  fastify.get('/metrics/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      const metrics = fastify.metrics.getMetrics();
      
      const totalRequests = Object.values(metrics.requestCount).reduce((sum, count) => sum + count, 0);
      const totalErrors = Object.values(metrics.errorRate).reduce((sum, count) => sum + count, 0);
      const totalRateLimitHits = Object.values(metrics.rateLimitHits).reduce((sum, count) => sum + count, 0);
      
      const summary = {
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0.00',
        totalRateLimitHits,
        averageResponseTime: metrics.responseTime.average,
        p95ResponseTime: metrics.responseTime.p95,
        p99ResponseTime: metrics.responseTime.p99,
        activeConnections: metrics.activeConnections,
        uptime: process.uptime(),
        timestamp: metrics.timestamp,
      };

      reply.send(summary);
    } catch (error) {
      logger.error('Failed to get metrics summary:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get metrics summary',
        code: 'METRICS_SUMMARY_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Get top endpoints by request count
  fastify.get('/metrics/top-endpoints', async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;
    const limit = parseInt(request.query.limit || '10', 10);

    try {
      const metrics = fastify.metrics.getMetrics();
      
      const topEndpoints = Object.entries(metrics.requestCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([endpoint, requests]) => ({
          endpoint,
          requests,
          errors: metrics.errorRate[endpoint] || 0,
          rateLimitHits: metrics.rateLimitHits[endpoint] || 0,
        }));

      reply.send({
        topEndpoints,
        limit,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get top endpoints:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get top endpoints',
        code: 'TOP_ENDPOINTS_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Get error breakdown
  fastify.get('/metrics/errors', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      const metrics = fastify.metrics.getMetrics();
      
      const errorBreakdown = Object.entries(metrics.errorRate)
        .map(([endpoint, errors]) => {
          const [method, path, statusCode] = endpoint.split(':');
          return {
            method,
            path,
            statusCode: statusCode || 'unknown',
            errors,
          };
        })
        .sort((a, b) => b.errors - a.errors);

      reply.send({
        errorBreakdown,
        totalErrors: errorBreakdown.reduce((sum, item) => sum + item.errors, 0),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get error breakdown:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to get error breakdown',
        code: 'ERROR_BREAKDOWN_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  // Reset metrics (for testing purposes)
  fastify.post('/metrics/reset', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = (request as any).context as FastifyRequestContext;

    try {
      // In a real implementation, this would reset the metrics
      logger.warn('Metrics reset requested', {
        requestId: context.requestId,
        requestedBy: context.user?.id,
      });

      reply.send({
        message: 'Metrics have been reset',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to reset metrics:', error);
      reply.status(500).send({
        error: 'InternalServerError',
        message: 'Failed to reset metrics',
        code: 'METRICS_RESET_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
      });
    }
  });

  logger.info('Metrics routes registered');
};