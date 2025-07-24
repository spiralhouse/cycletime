import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@cycletime/shared-utils';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  startTime: number;
  userId?: string;
  userRole?: string;
  organizationId?: string;
}

// Extend Fastify request type to include request context
declare module 'fastify' {
  interface FastifyRequest {
    context?: RequestContext;
  }
}

export async function requestLogger(fastify: FastifyInstance): Promise<void> {
  // Register preHandler hook to set up request context
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    const correlationId = (request.headers['x-correlation-id'] as string) || uuidv4();
    
    // Set up request context
    request.context = {
      requestId,
      correlationId,
      startTime: Date.now(),
      userId: request.auth?.userId,
      userRole: request.auth?.userRole,
      organizationId: request.auth?.organizationId
    };

    // Add request ID to response headers
    reply.header('x-request-id', requestId);
    reply.header('x-correlation-id', correlationId);

    // Log incoming request
    logger.info('Incoming request', {
      requestId,
      correlationId,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: request.auth?.userId,
      userRole: request.auth?.userRole,
      organizationId: request.auth?.organizationId,
      contentLength: request.headers['content-length'],
      contentType: request.headers['content-type'],
      timestamp: new Date().toISOString()
    });
  });

  // Register onResponse hook to log response
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = Date.now() - (request.context?.startTime || Date.now());
    
    const logData = {
      requestId: request.context?.requestId,
      correlationId: request.context?.correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      ip: request.ip,
      userId: request.auth?.userId,
      userRole: request.auth?.userRole,
      organizationId: request.auth?.organizationId,
      contentLength: reply.getHeader('content-length'),
      timestamp: new Date().toISOString()
    };

    // Log different levels based on status code
    if (reply.statusCode >= 500) {
      logger.error('Request completed with server error', undefined, logData);
    } else if (reply.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed successfully', logData);
    }
  });

  // Register onError hook to log errors
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const duration = Date.now() - (request.context?.startTime || Date.now());
    
    logger.error('Request failed with error', error, {
      requestId: request.context?.requestId,
      correlationId: request.context?.correlationId,
      method: request.method,
      url: request.url,
      duration: `${duration}ms`,
      ip: request.ip,
      userId: request.auth?.userId,
      userRole: request.auth?.userRole,
      organizationId: request.auth?.organizationId,
      timestamp: new Date().toISOString()
    });
  });

  // Register onTimeout hook to log timeouts
  fastify.addHook('onTimeout', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = Date.now() - (request.context?.startTime || Date.now());
    
    logger.warn('Request timed out', {
      requestId: request.context?.requestId,
      correlationId: request.context?.correlationId,
      method: request.method,
      url: request.url,
      duration: `${duration}ms`,
      ip: request.ip,
      userId: request.auth?.userId,
      userRole: request.auth?.userRole,
      organizationId: request.auth?.organizationId,
      timestamp: new Date().toISOString()
    });
  });

  // Utility function to log custom events within request context
  fastify.decorate('logEvent', (request: FastifyRequest, event: string, data?: any) => {
    logger.info(`Event: ${event}`, {
      requestId: request.context?.requestId,
      correlationId: request.context?.correlationId,
      userId: request.auth?.userId,
      userRole: request.auth?.userRole,
      organizationId: request.auth?.organizationId,
      event,
      data,
      timestamp: new Date().toISOString()
    });
  });

  // Utility function to log performance metrics
  fastify.decorate('logPerformance', (request: FastifyRequest, operation: string, duration: number, metadata?: any) => {
    logger.info(`Performance: ${operation}`, {
      requestId: request.context?.requestId,
      correlationId: request.context?.correlationId,
      userId: request.auth?.userId,
      operation,
      duration: `${duration}ms`,
      metadata,
      timestamp: new Date().toISOString()
    });
  });
}

// Utility function to get request context
export function getRequestContext(request: FastifyRequest): RequestContext | undefined {
  return request.context;
}

// Utility function to get request ID
export function getRequestId(request: FastifyRequest): string {
  return request.context?.requestId || 'unknown';
}

// Utility function to get correlation ID
export function getCorrelationId(request: FastifyRequest): string {
  return request.context?.correlationId || 'unknown';
}

// Utility function to measure operation duration
export function measureDuration<T>(operation: () => T): { result: T; duration: number } {
  const start = Date.now();
  const result = operation();
  const duration = Date.now() - start;
  return { result, duration };
}

// Utility function to measure async operation duration
export async function measureAsyncDuration<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  return { result, duration };
}

// Extend Fastify instance type to include custom logging methods
declare module 'fastify' {
  interface FastifyInstance {
    logEvent: (request: FastifyRequest, event: string, data?: any) => void;
    logPerformance: (request: FastifyRequest, operation: string, duration: number, metadata?: any) => void;
  }
}