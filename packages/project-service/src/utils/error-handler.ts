import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '@cycletime/shared-utils';

export class ProjectServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProjectServiceError';
  }
}

export class ValidationError extends ProjectServiceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ProjectServiceError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ProjectServiceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends ProjectServiceError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends ProjectServiceError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ErrorHandler {
  static handle(error: Error, request: FastifyRequest, reply: FastifyReply) {
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      params: request.params,
      query: request.query
    });

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url,
        details: {
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        }
      });
    }

    // Handle custom project service errors
    if (error instanceof ProjectServiceError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        path: request.url,
        details: error.details
      });
    }

    // Handle Fastify errors
    if ('statusCode' in error) {
      const fastifyError = error as FastifyError;
      return reply.status(fastifyError.statusCode || 500).send({
        error: fastifyError.name || 'Internal Server Error',
        message: fastifyError.message,
        code: fastifyError.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }

    // Handle unknown errors
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }

  static async handleAsync(
    handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>
  ) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        return await handler(request, reply);
      } catch (error) {
        ErrorHandler.handle(error as Error, request, reply);
      }
    };
  }
}