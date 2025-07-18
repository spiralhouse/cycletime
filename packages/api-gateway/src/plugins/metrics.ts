/**
 * Metrics Plugin
 * Collects and provides operational metrics for the gateway
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { FastifyRequestContext, MetricsResponse } from '../types';

declare module 'fastify' {
  interface FastifyInstance {
    metrics: {
      getMetrics: () => MetricsResponse;
      incrementCounter: (metric: string, labels?: Record<string, string>) => void;
      recordResponseTime: (path: string, method: string, responseTime: number) => void;
      recordError: (path: string, method: string, statusCode: number) => void;
    };
  }
}

interface MetricsData {
  requestCount: Map<string, number>;
  responseTimeSum: Map<string, number>;
  responseTimeCount: Map<string, number>;
  responseTimes: Map<string, number[]>;
  errorCount: Map<string, number>;
  rateLimitHits: Map<string, number>;
  startTime: number;
  activeConnections: number;
}

export const metricsPlugin = async (fastify: FastifyInstance) => {
  const metrics: MetricsData = {
    requestCount: new Map(),
    responseTimeSum: new Map(),
    responseTimeCount: new Map(),
    responseTimes: new Map(),
    errorCount: new Map(),
    rateLimitHits: new Map(),
    startTime: Date.now(),
    activeConnections: 0,
  };

  // Track active connections
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    metrics.activeConnections++;
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = request.context as FastifyRequestContext;
    const responseTime = Date.now() - new Date(context.timestamp).getTime();
    const method = request.method;
    const path = request.url;
    const statusCode = reply.statusCode;

    metrics.activeConnections--;

    // Record request count
    const requestKey = `${method}:${path}`;
    metrics.requestCount.set(requestKey, (metrics.requestCount.get(requestKey) || 0) + 1);

    // Record response time
    recordResponseTime(path, method, responseTime);

    // Record errors
    if (statusCode >= 400) {
      const errorKey = `${method}:${path}:${statusCode}`;
      metrics.errorCount.set(errorKey, (metrics.errorCount.get(errorKey) || 0) + 1);
    }

    // Record rate limit hits
    if (statusCode === 429) {
      const rateLimitKey = `${method}:${path}`;
      metrics.rateLimitHits.set(rateLimitKey, (metrics.rateLimitHits.get(rateLimitKey) || 0) + 1);
    }
  });

  // Helper functions
  const recordResponseTime = (path: string, method: string, responseTime: number) => {
    const key = `${method}:${path}`;
    
    // Track sum and count for average calculation
    metrics.responseTimeSum.set(key, (metrics.responseTimeSum.get(key) || 0) + responseTime);
    metrics.responseTimeCount.set(key, (metrics.responseTimeCount.get(key) || 0) + 1);
    
    // Track individual response times for percentile calculation
    if (!metrics.responseTimes.has(key)) {
      metrics.responseTimes.set(key, []);
    }
    
    const times = metrics.responseTimes.get(key)!;
    times.push(responseTime);
    
    // Keep only last 1000 response times to prevent memory issues
    if (times.length > 1000) {
      times.shift();
    }
  };

  const incrementCounter = (metric: string, labels?: Record<string, string>) => {
    const key = labels ? `${metric}:${JSON.stringify(labels)}` : metric;
    metrics.requestCount.set(key, (metrics.requestCount.get(key) || 0) + 1);
  };

  const recordError = (path: string, method: string, statusCode: number) => {
    const errorKey = `${method}:${path}:${statusCode}`;
    metrics.errorCount.set(errorKey, (metrics.errorCount.get(errorKey) || 0) + 1);
  };

  const calculatePercentile = (values: number[], percentile: number): number => {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  const getMetrics = (): MetricsResponse => {
    const now = Date.now();
    const uptime = now - metrics.startTime;

    // Calculate overall statistics
    const allResponseTimes: number[] = [];
    let totalResponseTimeSum = 0;
    let totalResponseTimeCount = 0;

    for (const [key, sum] of metrics.responseTimeSum) {
      totalResponseTimeSum += sum;
      totalResponseTimeCount += metrics.responseTimeCount.get(key) || 0;
      
      const times = metrics.responseTimes.get(key) || [];
      allResponseTimes.push(...times);
    }

    const averageResponseTime = totalResponseTimeCount > 0 ? totalResponseTimeSum / totalResponseTimeCount : 0;
    const p95ResponseTime = calculatePercentile(allResponseTimes, 95);
    const p99ResponseTime = calculatePercentile(allResponseTimes, 99);

    // Convert Maps to objects for JSON serialization
    const requestCount: Record<string, number> = {};
    for (const [key, value] of metrics.requestCount) {
      requestCount[key] = value;
    }

    const errorRate: Record<string, number> = {};
    for (const [key, value] of metrics.errorCount) {
      errorRate[key] = value;
    }

    const rateLimitHits: Record<string, number> = {};
    for (const [key, value] of metrics.rateLimitHits) {
      rateLimitHits[key] = value;
    }

    return {
      requestCount,
      responseTime: {
        average: Math.round(averageResponseTime * 100) / 100,
        p95: Math.round(p95ResponseTime * 100) / 100,
        p99: Math.round(p99ResponseTime * 100) / 100,
      },
      errorRate,
      rateLimitHits,
      activeConnections: metrics.activeConnections,
      timestamp: new Date().toISOString(),
    };
  };

  // Decorate Fastify instance with metrics functions
  fastify.decorate('metrics', {
    getMetrics,
    incrementCounter,
    recordResponseTime,
    recordError,
  });

  // Periodically publish metrics snapshot
  const metricsInterval = setInterval(async () => {
    if (fastify.eventPublisher) {
      const metricsData = getMetrics();
      
      // Calculate top endpoints
      const topEndpoints = Object.entries(metricsData.requestCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, requests]) => ({ endpoint, requests }));

      await fastify.eventPublisher.publish('gateway.admin', 'gateway.metrics.snapshot', {
        totalRequests: Object.values(metricsData.requestCount).reduce((a, b) => a + b, 0),
        totalErrors: Object.values(metricsData.errorRate).reduce((a, b) => a + b, 0),
        averageResponseTime: metricsData.responseTime.average,
        activeConnections: metricsData.activeConnections,
        rateLimitViolations: Object.values(metricsData.rateLimitHits).reduce((a, b) => a + b, 0),
        topEndpoints,
        timestamp: new Date().toISOString(),
      });
    }
  }, 60000); // Every minute

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    clearInterval(metricsInterval);
  });

  logger.info('Metrics plugin registered');
};