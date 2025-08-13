/**
 * MCP Resource Error Classes
 * Custom error types for resource operations
 */

import { ErrorCodes } from './types.js';

/**
 * Base error class for all resource-related errors
 */
export abstract class ResourceError extends Error {
  public readonly code: ErrorCodes;
  public readonly details: Record<string, unknown> | undefined;
  public readonly timestamp: string;

  constructor(message: string, code: ErrorCodes, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to MCP error format
   */
  toMCPError() {
    return {
      code: this.code,
      message: this.message,
      details: this.details || {},
      timestamp: this.timestamp,
    };
  }
}

/**
 * Error thrown when resource validation fails
 */
export class ResourceValidationError extends ResourceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCodes.VALIDATION_ERROR, details);
  }
}

/**
 * Error thrown when a URI is invalid
 */
export class InvalidUriError extends ResourceError {
  public readonly uri: string;

  constructor(uri: string, reason?: string) {
    const message = reason 
      ? `Invalid URI '${uri}': ${reason}`
      : `Invalid URI '${uri}'`;
    
    super(message, ErrorCodes.INVALID_URI, { uri, reason });
    this.uri = uri;
  }
}

/**
 * Error thrown when a resource is not found
 */
export class ResourceNotFoundError extends ResourceError {
  public readonly uri: string;

  constructor(uri: string) {
    super(`Resource not found: ${uri}`, ErrorCodes.RESOURCE_NOT_FOUND, { uri });
    this.uri = uri;
  }
}

/**
 * Error thrown when there's a conflict with resource registration
 */
export class ResourceConflictError extends ResourceError {
  constructor(type: string, message?: string) {
    const errorMessage = message || `Resource type '${type}' is already registered`;

    super(errorMessage, ErrorCodes.RESOURCE_CONFLICT, { type });
  }
}

/**
 * Error thrown when access to a resource is denied
 */
export class ResourceAccessDeniedError extends ResourceError {
  public readonly uri: string;

  constructor(uri: string, reason?: string) {
    const message = reason
      ? `Access denied to resource '${uri}': ${reason}`
      : `Access denied to resource '${uri}'`;
    
    super(message, ErrorCodes.RESOURCE_ACCESS_DENIED, { uri, reason });
    this.uri = uri;
  }
}

/**
 * Error thrown for internal server errors
 */
export class InternalResourceError extends ResourceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCodes.INTERNAL_ERROR, details);
  }
}