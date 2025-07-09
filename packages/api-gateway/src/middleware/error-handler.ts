import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  request_id: string;
}

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const requestId = request.id;
  
  // Log error for debugging
  request.log.error({ error, requestId }, 'Request error occurred');

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
        request_id: requestId,
      },
    });
  }

  // Handle Prisma database errors
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Resource already exists',
            details: { field: (error as any).meta?.target },
            request_id: requestId,
          },
        });
      case 'P2025':
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            request_id: requestId,
          },
        });
      default:
        return reply.status(500).send({
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            request_id: requestId,
          },
        });
    }
  }

  // Handle authentication errors
  if (error.message?.includes('JWT') || error.message?.includes('token')) {
    return reply.status(401).send({
      error: {
        code: 'AUTH_INVALID',
        message: 'Invalid authentication credentials',
        request_id: requestId,
      },
    });
  }

  // Handle authorization errors
  if (error.statusCode === 403) {
    return reply.status(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        request_id: requestId,
      },
    });
  }

  // Handle rate limiting errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        request_id: requestId,
      },
    });
  }

  // Handle validation errors from Fastify
  if (error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
        request_id: requestId,
      },
    });
  }

  // Handle known HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code || 'CLIENT_ERROR',
        message: error.message,
        request_id: requestId,
      },
    });
  }

  // Handle unknown errors (500)
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred',
      request_id: requestId,
    },
  });
};