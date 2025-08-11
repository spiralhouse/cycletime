/**
 * Base class for all session-related domain errors
 */
export abstract class SessionError extends Error {
  abstract readonly code: string;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
}

/**
 * Error thrown when a session is not found
 */
export class SessionNotFoundError extends SessionError {
  readonly code = 'SESSION_NOT_FOUND';

  constructor(sessionKey: string, cause?: Error) {
    super(`Session with key '${sessionKey}' was not found`, cause);
  }
}

/**
 * Error thrown when session data is invalid
 */
export class InvalidSessionDataError extends SessionError {
  readonly code = 'INVALID_SESSION_DATA';

  constructor(message: string, cause?: Error) {
    super(`Invalid session data: ${message}`, cause);
  }
}

/**
 * Error thrown when session has expired
 */
export class SessionExpiredError extends SessionError {
  readonly code = 'SESSION_EXPIRED';

  constructor(sessionKey: string, expiredAt: Date, cause?: Error) {
    super(`Session '${sessionKey}' expired at ${expiredAt.toISOString()}`, cause);
  }
}

/**
 * Error thrown when session operation fails due to storage issues
 */
export class SessionStorageError extends SessionError {
  readonly code = 'SESSION_STORAGE_ERROR';

  constructor(operation: string, cause?: Error) {
    super(`Session storage error during ${operation}`, cause);
  }
}

/**
 * Error thrown when session data fails validation
 */
export class SessionValidationError extends SessionError {
  readonly code = 'SESSION_VALIDATION_ERROR';
  readonly validationErrors: Array<{ field: string; message: string }>;

  constructor(
    sessionKey: string,
    validationErrors: Array<{ field: string; message: string }>,
    cause?: Error
  ) {
    const errorMessages = validationErrors.map(e => `${e.field}: ${e.message}`).join(', ');
    super(`Session '${sessionKey}' failed validation: ${errorMessages}`, cause);
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when session data is corrupted beyond repair
 */
export class SessionCorruptionError extends SessionError {
  readonly code = 'SESSION_CORRUPTION_ERROR';

  constructor(sessionKey: string, details: string, cause?: Error) {
    super(`Session '${sessionKey}' is corrupted: ${details}`, cause);
  }
}
