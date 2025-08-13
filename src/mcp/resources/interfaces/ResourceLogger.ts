/**
 * Resource Logger Interface
 * Defines the contract for logging implementations
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log context for structured logging
 */
export interface LogContext {
  /** Resource URI if applicable */
  resourceUri?: string;
  /** Resource type if applicable */
  resourceType?: string;
  /** Operation being performed */
  operation?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to include timestamps */
  includeTimestamp: boolean;
  /** Whether to include log level in output */
  includeLevel: boolean;
  /** Custom format function */
  formatter?: (level: LogLevel, message: string, context?: LogContext) => string;
}

/**
 * Interface for resource logging implementations
 */
export interface ResourceLogger {
  /**
   * Log a debug message
   * @param message - The message to log
   * @param context - Additional context information
   */
  debug: (message: string, context?: LogContext) => void;

  /**
   * Log an informational message
   * @param message - The message to log
   * @param context - Additional context information
   */
  info: (message: string, context?: LogContext) => void;

  /**
   * Log a warning message
   * @param message - The message to log
   * @param context - Additional context information
   */
  warn: (message: string, context?: LogContext) => void;

  /**
   * Log an error message
   * @param message - The message to log
   * @param error - The error object (optional)
   * @param context - Additional context information
   */
  error: (message: string, error?: Error, context?: LogContext) => void;

  /**
   * Check if a log level is enabled
   * @param level - The log level to check
   * @returns true if the level will be logged
   */
  isEnabled: (level: LogLevel) => boolean;

  /**
   * Get current logger configuration
   * @returns Current logger configuration
   */
  getConfig: () => LoggerConfig;

  /**
   * Update logger configuration
   * @param config - New logger configuration
   */
  updateConfig: (config: Partial<LoggerConfig>) => void;

  /**
   * Create a child logger with additional context
   * @param context - Context to add to all log messages
   * @returns New logger instance with context
   */
  child: (context: LogContext) => ResourceLogger;
}