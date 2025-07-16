/**
 * Logging utility functions
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * Log level names
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT'
};

/**
 * Log colors for console output
 */
export const LOG_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.SILENT]: '\x1b[0m'  // Reset
};

/**
 * Color reset code
 */
export const COLOR_RESET = '\x1b[0m';

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  source?: string;
  requestId?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableContext: boolean;
  dateFormat?: string;
  contextKeys?: string[];
  output?: (entry: LogEntry) => void;
}

/**
 * Default logger configuration
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableColors: true,
  enableTimestamp: true,
  enableContext: true,
  dateFormat: 'ISO'
};

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
  }

  /**
   * Logs a debug message
   */
  debug(message: string, context?: Record<string, any>, source?: string): void {
    this.log(LogLevel.DEBUG, message, context, undefined, source);
  }

  /**
   * Logs an info message
   */
  info(message: string, context?: Record<string, any>, source?: string): void {
    this.log(LogLevel.INFO, message, context, undefined, source);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context?: Record<string, any>, source?: string): void {
    this.log(LogLevel.WARN, message, context, undefined, source);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: Error, context?: Record<string, any>, source?: string): void {
    this.log(LogLevel.ERROR, message, context, error, source);
  }

  /**
   * Generic log method
   */
  log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    source?: string,
    requestId?: string
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error,
      source,
      requestId
    };

    if (this.config.output) {
      this.config.output(entry);
    } else {
      this.defaultOutput(entry);
    }
  }

  /**
   * Default console output
   */
  private defaultOutput(entry: LogEntry): void {
    const parts: string[] = [];

    // Timestamp
    if (this.config.enableTimestamp) {
      const timestamp = this.formatTimestamp(entry.timestamp);
      parts.push(`[${timestamp}]`);
    }

    // Level
    const levelName = LOG_LEVEL_NAMES[entry.level];
    if (this.config.enableColors) {
      const color = LOG_COLORS[entry.level];
      parts.push(`${color}${levelName}${COLOR_RESET}`);
    } else {
      parts.push(levelName);
    }

    // Source
    if (entry.source) {
      parts.push(`[${entry.source}]`);
    }

    // Request ID
    if (entry.requestId) {
      parts.push(`[${entry.requestId}]`);
    }

    // Message
    parts.push(entry.message);

    let output = parts.join(' ');

    // Context
    if (this.config.enableContext && entry.context) {
      const contextStr = this.formatContext(entry.context);
      if (contextStr) {
        output += ` ${contextStr}`;
      }
    }

    // Error
    if (entry.error) {
      output += `\n${entry.error.stack || entry.error.message}`;
    }

    console.log(output);
  }

  /**
   * Formats timestamp
   */
  private formatTimestamp(timestamp: Date): string {
    switch (this.config.dateFormat) {
      case 'ISO':
        return timestamp.toISOString();
      case 'locale':
        return timestamp.toLocaleString();
      case 'time':
        return timestamp.toLocaleTimeString();
      default:
        return timestamp.toISOString();
    }
  }

  /**
   * Formats context object
   */
  private formatContext(context: Record<string, any>): string {
    try {
      const filteredContext = this.config.contextKeys
        ? this.pickKeys(context, this.config.contextKeys)
        : context;

      return JSON.stringify(filteredContext);
    } catch {
      return '[Invalid Context]';
    }
  }

  /**
   * Picks specific keys from an object
   */
  private pickKeys(obj: Record<string, any>, keys: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * Sets the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Gets the current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: Record<string, any>, source?: string): Logger {
    const childConfig = { ...this.config };
    const originalOutput = this.config.output || this.defaultOutput.bind(this);

    childConfig.output = (entry: LogEntry) => {
      const mergedContext = { ...context, ...(entry.context || {}) };
      const childEntry: LogEntry = {
        ...entry,
        context: mergedContext,
        source: source || entry.source
      };
      originalOutput(childEntry);
    };

    return new Logger(childConfig);
  }

  /**
   * Creates a logger with request ID
   */
  withRequestId(requestId: string): Logger {
    const childConfig = { ...this.config };
    const originalOutput = this.config.output || this.defaultOutput.bind(this);

    childConfig.output = (entry: LogEntry) => {
      const childEntry: LogEntry = {
        ...entry,
        requestId: requestId
      };
      originalOutput(childEntry);
    };

    return new Logger(childConfig);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Creates a logger instance
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Performance logger for measuring execution time
 */
export class PerformanceLogger {
  private startTimes = new Map<string, number>();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Starts timing an operation
   */
  start(operation: string): void {
    this.startTimes.set(operation, performance.now());
    this.logger.debug(`Starting operation: ${operation}`);
  }

  /**
   * Ends timing an operation and logs the duration
   */
  end(operation: string, context?: Record<string, any>): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      this.logger.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operation);

    this.logger.info(`Completed operation: ${operation}`, {
      ...context,
      duration: `${duration.toFixed(2)}ms`
    });

    return duration;
  }

  /**
   * Measures the execution time of a function
   */
  measure<T>(operation: string, fn: () => T, context?: Record<string, any>): T {
    this.start(operation);
    try {
      const result = fn();
      this.end(operation, context);
      return result;
    } catch (error) {
      this.logger.error(`Operation failed: ${operation}`, error as Error, context);
      this.startTimes.delete(operation);
      throw error;
    }
  }

  /**
   * Measures the execution time of an async function
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, context);
      return result;
    } catch (error) {
      this.logger.error(`Async operation failed: ${operation}`, error as Error, context);
      this.startTimes.delete(operation);
      throw error;
    }
  }
}

/**
 * Structured logging utilities
 */
export class StructuredLogger extends Logger {
  /**
   * Logs HTTP request
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userAgent?: string,
    ip?: string,
    requestId?: string
  ): void {
    this.info('HTTP Request', {
      type: 'http_request',
      method,
      url,
      statusCode,
      duration,
      userAgent,
      ip,
      requestId
    });
  }

  /**
   * Logs database query
   */
  logQuery(
    query: string,
    duration: number,
    table?: string,
    operation?: string,
    rowCount?: number
  ): void {
    this.debug('Database Query', {
      type: 'database_query',
      query: query.slice(0, 200), // Truncate long queries
      duration,
      table,
      operation,
      rowCount
    });
  }

  /**
   * Logs external API call
   */
  logApiCall(
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    requestId?: string
  ): void {
    this.info('External API Call', {
      type: 'api_call',
      service,
      endpoint,
      method,
      statusCode,
      duration,
      requestId
    });
  }

  /**
   * Logs business event
   */
  logEvent(
    event: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.info('Business Event', {
      type: 'business_event',
      event,
      userId,
      ...metadata
    });
  }

  /**
   * Logs security event
   */
  logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: Record<string, any>
  ): void {
    const context = {
      type: 'security_event',
      event,
      severity,
      ...details
    };

    if (severity === 'critical' || severity === 'high') {
      this.error('Security Event', undefined, context);
    } else {
      this.warn('Security Event', context);
    }
  }
}

/**
 * Log level from string
 */
export function logLevelFromString(level: string): LogLevel {
  const upperLevel = level.toUpperCase();
  switch (upperLevel) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Sanitizes sensitive data for logging
 */
export function sanitizeForLogging(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForLogging);
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || 
          lowerKey.includes('token') || 
          lowerKey.includes('secret') || 
          lowerKey.includes('key')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Creates a request logger middleware helper
 */
export function createRequestLogger(logger: Logger = new Logger()) {
  return (requestId: string) => {
    const requestLogger = logger.withRequestId(requestId);
    const perfLogger = new PerformanceLogger(requestLogger);

    return {
      logger: requestLogger,
      perf: perfLogger,
      logRequest: (method: string, url: string, statusCode: number, duration: number) => {
        requestLogger.info('Request completed', {
          method,
          url,
          statusCode,
          duration: `${duration.toFixed(2)}ms`
        });
      }
    };
  };
}