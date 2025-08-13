/**
 * Console Resource Logger Implementation
 * Simple console-based logging for development and testing
 */

import { LogLevel as LogLevelEnum } from '../interfaces/ResourceLogger.js';

import type { 
  ResourceLogger, 
  LogContext, 
  LoggerConfig, 
  LogLevel 
} from '../interfaces/ResourceLogger.js';
import type { TimeProvider } from '../interfaces/TimeProvider.js';

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevelEnum.INFO,
  includeTimestamp: true,
  includeLevel: true,
};

/**
 * Console-based logger implementation
 */
export class ConsoleResourceLogger implements ResourceLogger {
  private config: LoggerConfig;
  private baseContext: LogContext;

  constructor(
    config: Partial<LoggerConfig> = {},
    private timeProvider: TimeProvider,
    baseContext: LogContext = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseContext = baseContext;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevelEnum.DEBUG, message, context);
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevelEnum.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevelEnum.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    } : context;

    this.log(LogLevelEnum.ERROR, message, errorContext);
  }

  /**
   * Check if a log level is enabled
   */
  isEnabled(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Get current logger configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): ResourceLogger {
    const childContext = { ...this.baseContext, ...context };

    return new ConsoleResourceLogger(this.config, this.timeProvider, childContext);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isEnabled(level)) {
      return;
    }

    const mergedContext = { ...this.baseContext, ...context };
    const formattedMessage = this.config.formatter 
      ? this.config.formatter(level, message, mergedContext)
      : this.defaultFormat(level, message, mergedContext);

    // Output to appropriate console method
    switch (level) {
      case LogLevelEnum.DEBUG:
        console.debug(formattedMessage);
        break;

      case LogLevelEnum.INFO:
        console.info(formattedMessage);
        break;

      case LogLevelEnum.WARN:
        console.warn(formattedMessage);
        break;

      case LogLevelEnum.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  /**
   * Default message formatting
   */
  private defaultFormat(level: LogLevel, message: string, context?: LogContext): string {
    const parts: string[] = [];

    // Add timestamp if enabled
    if (this.config.includeTimestamp) {
      const timestamp = this.timeProvider.now().toISOString();

      parts.push(`[${timestamp}]`);
    }

    // Add log level if enabled
    if (this.config.includeLevel) {
      const levelName = LogLevelEnum[level];

      parts.push(`[${levelName}]`);
    }

    // Add the main message
    parts.push(message);

    // Add context if provided
    if (context && Object.keys(context).length > 0) {
      try {
        const contextStr = JSON.stringify(context, null, 2);

        parts.push(`\n  Context: ${contextStr}`);
      } catch (error) {
        parts.push(`\n  Context: [Error serializing context: ${error}]`);
      }
    }

    return parts.join(' ');
  }
}