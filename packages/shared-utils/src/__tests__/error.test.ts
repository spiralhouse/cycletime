/**
 * Error utilities tests
 */

import {
  BaseError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  ExternalServiceError,
  wrapError,
  safeErrorHandler,
  safeAsyncErrorHandler,
  success,
  failure,
  toResult,
  toAsyncResult,
  retry,
  CircuitBreaker,
  CircuitBreakerState,
  ErrorAggregator,
  createErrorAggregator
} from '../error';

describe('Error Utilities', () => {
  describe('BaseError', () => {
    it('should create a base error with default values', () => {
      const error = new BaseError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create a base error with custom values', () => {
      const context = { userId: '123' };
      const error = new BaseError('Test error', 'CUSTOM_ERROR', 400, false, context);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(false);
      expect(error.context).toBe(context);
    });

    it('should serialize to JSON', () => {
      const error = new BaseError('Test error');
      const json = error.toJSON();
      expect(json.name).toBe('BaseError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('UNKNOWN_ERROR');
      expect(json.statusCode).toBe(500);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error', () => {
      const error = new ValidationError('Invalid value', 'email', 'invalid-email');
      expect(error.message).toBe('Invalid value');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('email');
      expect(error.value).toBe('invalid-email');
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError('User not found', 'User', '123');
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.resource).toBe('User');
      expect(error.id).toBe('123');
    });
  });

  describe('wrapError', () => {
    it('should wrap unknown errors', () => {
      const error = wrapError('String error');
      expect(error).toBeInstanceOf(BaseError);
      expect(error.message).toBe('String error');
      expect(error.code).toBe('STRING_ERROR');
    });

    it('should pass through BaseError instances', () => {
      const originalError = new BaseError('Original error');
      const wrappedError = wrapError(originalError);
      expect(wrappedError).toBe(originalError);
    });

    it('should wrap regular Error instances', () => {
      const originalError = new Error('Regular error');
      const wrappedError = wrapError(originalError);
      expect(wrappedError).toBeInstanceOf(BaseError);
      expect(wrappedError.message).toBe('Regular error');
      expect(wrappedError.code).toBe('WRAPPED_ERROR');
    });
  });

  describe('safeErrorHandler', () => {
    it('should return the result when no error occurs', () => {
      const result = safeErrorHandler(() => 'success', 'fallback');
      expect(result).toBe('success');
    });

    it('should return the fallback when an error occurs', () => {
      const result = safeErrorHandler(() => {
        throw new Error('Test error');
      }, 'fallback');
      expect(result).toBe('fallback');
    });

    it('should call the error handler when provided', () => {
      const onError = jest.fn();
      safeErrorHandler(() => {
        throw new Error('Test error');
      }, 'fallback', onError);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Result pattern', () => {
    it('should create success results', () => {
      const result = success('data');
      expect(result.success).toBe(true);
      expect(result.data).toBe('data');
      expect(result.error).toBeUndefined();
    });

    it('should create failure results', () => {
      const error = new BaseError('Test error');
      const result = failure(error);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe(error);
    });

    it('should wrap functions to return Results', () => {
      const fn = (x: number) => x * 2;
      const wrappedFn = toResult(fn);
      
      const result = wrappedFn(5);
      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it('should catch errors and return failure Results', () => {
      const fn = () => {
        throw new Error('Test error');
      };
      const wrappedFn = toResult(fn);
      
      const result = wrappedFn();
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(BaseError);
    });
  });

  describe('ErrorAggregator', () => {
    it('should collect multiple errors', () => {
      const aggregator = createErrorAggregator();
      const error1 = new BaseError('Error 1');
      const error2 = new BaseError('Error 2');
      
      aggregator.addError(error1);
      aggregator.addError(error2);
      
      expect(aggregator.hasErrors()).toBe(true);
      expect(aggregator.errors).toHaveLength(2);
      expect(aggregator.getErrorCodes()).toEqual(['UNKNOWN_ERROR', 'UNKNOWN_ERROR']);
      expect(aggregator.getErrorMessages()).toEqual(['Error 1', 'Error 2']);
    });
  });
});