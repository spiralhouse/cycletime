/**
 * Error handling utility functions
 */

/**
 * Base error class with additional properties
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code = 'UNKNOWN_ERROR',
    statusCode = 500,
    isOperational = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    if (context !== undefined) {
      this.context = context;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Validation error class
 */
export class ValidationError extends BaseError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, field?: string, value?: any, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    if (field !== undefined) {
      this.field = field;
    }
    if (value !== undefined) {
      this.value = value;
    }
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends BaseError {
  public readonly resource?: string;
  public readonly id?: string | number;

  constructor(message: string, resource?: string, id?: string | number, context?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, true, context);
    if (resource !== undefined) {
      this.resource = resource;
    }
    if (id !== undefined) {
      this.id = id;
    }
  }
}

/**
 * Unauthorized error class
 */
export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized', context?: Record<string, any>) {
    super(message, 'UNAUTHORIZED', 401, true, context);
  }
}

/**
 * Forbidden error class
 */
export class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden', context?: Record<string, any>) {
    super(message, 'FORBIDDEN', 403, true, context);
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends BaseError {
  public readonly conflictingResource?: string;

  constructor(message: string, conflictingResource?: string, context?: Record<string, any>) {
    super(message, 'CONFLICT', 409, true, context);
    if (conflictingResource !== undefined) {
      this.conflictingResource = conflictingResource;
    }
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends BaseError {
  public readonly retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number, context?: Record<string, any>) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true, context);
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }
}

/**
 * Internal server error class
 */
export class InternalServerError extends BaseError {
  constructor(message = 'Internal server error', context?: Record<string, any>) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, false, context);
  }
}

/**
 * Database error class
 */
export class DatabaseError extends BaseError {
  public readonly query?: string;
  public readonly table?: string;

  constructor(message: string, query?: string, table?: string, context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, false, context);
    if (query !== undefined) {
      this.query = query;
    }
    if (table !== undefined) {
      this.table = table;
    }
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends BaseError {
  public readonly service?: string;
  public readonly originalError?: Error;

  constructor(message: string, service?: string, originalError?: Error, context?: Record<string, any>) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, true, context);
    if (service !== undefined) {
      this.service = service;
    }
    if (originalError !== undefined) {
      this.originalError = originalError;
    }
  }
}

/**
 * Error wrapper function that converts unknown errors to BaseError
 */
export function wrapError(error: unknown, defaultMessage = 'An unknown error occurred'): BaseError {
  if (error instanceof BaseError) {
    return error;
  }

  if (error instanceof Error) {
    return new BaseError(error.message || defaultMessage, 'WRAPPED_ERROR', 500, false, {
      originalName: error.name,
      originalStack: error.stack
    });
  }

  if (typeof error === 'string') {
    return new BaseError(error || defaultMessage, 'STRING_ERROR');
  }

  return new BaseError(defaultMessage, 'UNKNOWN_ERROR', 500, false, {
    originalError: error
  });
}

/**
 * Safe error handler that doesn't throw
 */
export function safeErrorHandler<T>(
  fn: () => T,
  fallback: T,
  onError?: (error: BaseError) => void
): T {
  try {
    return fn();
  } catch (error) {
    const wrappedError = wrapError(error);
    if (onError) {
      onError(wrappedError);
    }
    return fallback;
  }
}

/**
 * Async safe error handler
 */
export async function safeAsyncErrorHandler<T>(
  fn: () => Promise<T>,
  fallback: T,
  onError?: (error: BaseError) => void | Promise<void>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const wrappedError = wrapError(error);
    if (onError) {
      await onError(wrappedError);
    }
    return fallback;
  }
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = BaseError> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Creates a success result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Creates an error result
 */
export function failure<E = BaseError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Wraps a function to return a Result instead of throwing
 */
export function toResult<T, A extends any[]>(
  fn: (...args: A) => T
): (...args: A) => Result<T> {
  return (...args: A) => {
    try {
      const data = fn(...args);
      return success(data);
    } catch (error) {
      return failure(wrapError(error));
    }
  };
}

/**
 * Wraps an async function to return a Result instead of throwing
 */
export function toAsyncResult<T, A extends any[]>(
  fn: (...args: A) => Promise<T>
): (...args: A) => Promise<Result<T>> {
  return async (...args: A) => {
    try {
      const data = await fn(...args);
      return success(data);
    } catch (error) {
      return failure(wrapError(error));
    }
  };
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  retryIf?: (error: BaseError) => boolean;
  onRetry?: (error: BaseError, attempt: number) => void;
}

/**
 * Retries a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: BaseError;
  let delay = config.delay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = wrapError(error);

      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      if (config.retryIf && !config.retryIf(lastError)) {
        throw lastError;
      }

      if (config.onRetry) {
        config.onRetry(lastError, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, delay));

      if (config.backoffMultiplier) {
        delay = Math.min(
          delay * config.backoffMultiplier,
          config.maxDelay || Infinity
        );
      }
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
  onStateChange?: (state: CircuitBreakerState) => void;
}

/**
 * Circuit breaker class
 */
export class CircuitBreaker<T> {
  private state = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;

  constructor(
    private fn: () => Promise<T>,
    private config: CircuitBreakerConfig
  ) {}

  async execute(): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new BaseError('Circuit breaker is OPEN', 'CIRCUIT_BREAKER_OPEN', 503);
      }
      this.state = CircuitBreakerState.HALF_OPEN;
      this.onStateChange();
    }

    try {
      const result = await Promise.race([
        this.fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new BaseError('Operation timeout', 'TIMEOUT', 408)), this.config.timeout);
        })
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw wrapError(error);
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      this.onStateChange();
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      this.onStateChange();
    }
  }

  private onStateChange(): void {
    if (this.config.onStateChange) {
      this.config.onStateChange(this.state);
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getLastFailureTime(): number {
    return this.lastFailureTime;
  }
}

/**
 * Error aggregator for collecting multiple errors
 */
export class ErrorAggregator extends BaseError {
  public readonly errors: BaseError[];

  constructor(errors: BaseError[], message = 'Multiple errors occurred') {
    super(message, 'MULTIPLE_ERRORS', 400, true, { errorCount: errors.length });
    this.errors = errors;
  }

  addError(error: BaseError): void {
    this.errors.push(error);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrorCodes(): string[] {
    return this.errors.map(error => error.code);
  }

  getErrorMessages(): string[] {
    return this.errors.map(error => error.message);
  }
}

/**
 * Creates an error aggregator
 */
export function createErrorAggregator(message?: string): ErrorAggregator {
  return new ErrorAggregator([], message);
}