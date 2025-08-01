/**
 * Structured logging utility for JCVD framework
 */

import { createConsola } from 'consola';

import type { LogLevel, LogEntry } from '../types/index.js';

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  log: (level: LogLevel, message: string, context?: Record<string, unknown>) => void;
}

/**
 * Create a structured logger instance
 */
class JCVDLogger implements Logger {
  private consola = createConsola({
    level: this.getLogLevel(),
    formatOptions: {
      colors: true,
      compact: false,
      date: true
    }
  });

  private getLogLevel(): number {
    const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';

    switch (level) {
      case 'debug': return 0;

      case 'info': return 1;

      case 'warn': return 2;

      case 'error': return 3;

      default: return 1;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      source: 'jcvd',
      ...(context && { context })
    };

    // Use consola for console output
    switch (level) {
      case 'debug':
        this.consola.debug(message, context);
        break;

      case 'info':
        this.consola.info(message, context);
        break;

      case 'warn':
        this.consola.warn(message, context);
        break;

      case 'error':
        this.consola.error(message, context);
        break;
    }

    // Emit log entry for other outputs (file, http, etc.)
    this.emit(entry);
  }

  private emit(_entry: LogEntry): void {
    // TODO: Implement additional log outputs based on configuration
    // - File logging with rotation
    // - HTTP logging to external services
    // - Database logging for audit trails
  }
}

/**
 * Create a child logger with additional context
 */
export function createLogger(source: string, baseContext?: Record<string, unknown>): Logger {
  const baseLogger = new JCVDLogger();
  
  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      baseLogger.debug(message, { ...baseContext, ...context, source });
    },
    info: (message: string, context?: Record<string, unknown>) => {
      baseLogger.info(message, { ...baseContext, ...context, source });
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      baseLogger.warn(message, { ...baseContext, ...context, source });
    },
    error: (message: string, context?: Record<string, unknown>) => {
      baseLogger.error(message, { ...baseContext, ...context, source });
    },
    log: (level: LogLevel, message: string, context?: Record<string, unknown>) => {
      baseLogger.log(level, message, { ...baseContext, ...context, source });
    }
  };
}

/**
 * Default logger instance
 */
export const logger = new JCVDLogger();

/**
 * Performance timing utility
 */
export function timeOperation<T>(
  operation: () => Promise<T> | T,
  operationName: string,
  loggerInstance: Logger = logger
): Promise<T> {
  const startTime = Date.now();
  
  const logCompletion = (duration: number) => {
    loggerInstance.debug(`Operation completed: ${operationName}`, { 
      duration: `${duration}ms`,
      operationName 
    });
  };

  try {
    const result = operation();
    
    if (result instanceof Promise) {
      return result.then(res => {
        logCompletion(Date.now() - startTime);

        return res;
      }).catch(error => {
        const duration = Date.now() - startTime;

        loggerInstance.error(`Operation failed: ${operationName}`, { 
          duration: `${duration}ms`,
          operationName,
          error: error.message 
        });
        throw error;
      });
    } else {
      logCompletion(Date.now() - startTime);

      return Promise.resolve(result);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    loggerInstance.error(`Operation failed: ${operationName}`, { 
      duration: `${duration}ms`,
      operationName,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}