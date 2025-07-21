import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@cycletime/shared-utils';
import { 
  TaskServiceError, 
  TaskNotFoundError, 
  TaskValidationError, 
  TaskPermissionError, 
  TaskConflictError,
  TaskServiceUnavailableError
} from '../types/service-types';

export async function errorHandler(fastify: FastifyInstance): Promise<void> {
  // Set custom error handler
  fastify.setErrorHandler(async (error: any, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.headers['x-request-id'] || 'unknown';
    
    // Log error with context
    logger.error(`Error processing request ${requestId}:`, error as Error, {
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    // Handle specific error types
    if (error instanceof TaskNotFoundError) {
      return reply.code(404).send({
        error: 'Task Not Found',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    if (error instanceof TaskValidationError) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        details: error.details
      });
    }

    if (error instanceof TaskPermissionError) {
      return reply.code(403).send({
        error: 'Permission Denied',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    if (error instanceof TaskConflictError) {
      return reply.code(409).send({
        error: 'Conflict',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    if (error instanceof TaskServiceUnavailableError) {
      return reply.code(503).send({
        error: 'Service Unavailable',
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    if (error instanceof TaskServiceError) {
      return reply.code(error.statusCode).send({
        error: error.name,
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        details: error.details
      });
    }

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        details: error.validation
      });
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        details: error.errors
      });
    }

    // Handle rate limiting errors
    if (error.statusCode === 429) {
      return reply.code(429).send({
        error: 'Rate Limit Exceeded',
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        details: {
          retryAfter: error.retryAfter
        }
      });
    }

    // Handle authentication errors
    if (error.statusCode === 401) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      return reply.code(408).send({
        error: 'Request Timeout',
        message: 'Request timed out',
        code: 'REQUEST_TIMEOUT',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    // Handle JSON parsing errors
    if (error.type === 'entity.parse.failed') {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    // Handle payload too large errors
    if (error.statusCode === 413) {
      return reply.code(413).send({
        error: 'Payload Too Large',
        message: 'Request payload is too large',
        code: 'PAYLOAD_TOO_LARGE',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    // Handle database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return reply.code(503).send({
        error: 'Service Unavailable',
        message: 'Database connection failed',
        code: 'DATABASE_CONNECTION_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    // Handle generic HTTP errors
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: error.name || 'Client Error',
        message: error.message || 'Bad request',
        code: error.code || 'CLIENT_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    // Handle server errors
    if (error.statusCode && error.statusCode >= 500) {
      return reply.code(error.statusCode).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId
      });
    }

    // Default to 500 for unknown errors
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  });

  // Handle 404 errors for routes that don't exist
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.headers['x-request-id'] || 'unknown';
    
    logger.warn(`Route not found: ${request.method} ${request.url}`);
    
    return reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      code: 'ROUTE_NOT_FOUND',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId
    });
  });
}