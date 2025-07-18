/**
 * Logger utilities tests
 */

import {
  Logger,
  LogLevel,
  createLogger,
  PerformanceLogger,
  StructuredLogger,
  sanitizeForLogging,
  logLevelFromString,
  createRequestLogger
} from '../logger';

describe('Logger Utilities', () => {
  describe('Logger', () => {
    it('should create a logger with default config', () => {
      const logger = new Logger();
      expect(logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should create a logger with custom config', () => {
      const logger = new Logger({ level: LogLevel.DEBUG });
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should log messages at appropriate levels', () => {
      const output = jest.fn();
      const logger = new Logger({ output });
      
      logger.info('Test message');
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Test message'
        })
      );
    });

    it('should not log messages below the set level', () => {
      const output = jest.fn();
      const logger = new Logger({ level: LogLevel.WARN, output });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      
      expect(output).toHaveBeenCalledTimes(1);
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.WARN,
          message: 'Warn message'
        })
      );
    });

    it('should create child loggers with additional context', () => {
      const output = jest.fn();
      const logger = new Logger({ output });
      const childLogger = logger.child({ userId: '123' });
      
      childLogger.info('Child message');
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Child message',
          context: expect.objectContaining({ userId: '123' })
        })
      );
    });

    it('should create loggers with request ID', () => {
      const output = jest.fn();
      const logger = new Logger({ output });
      const requestLogger = logger.withRequestId('req-123');
      
      requestLogger.info('Request message');
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Request message',
          requestId: 'req-123'
        })
      );
    });
  });

  describe('PerformanceLogger', () => {
    it('should measure operation performance', () => {
      const logger = new Logger({ output: jest.fn() });
      const perfLogger = new PerformanceLogger(logger);
      
      perfLogger.start('test-operation');
      const duration = perfLogger.end('test-operation');
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should measure function execution time', () => {
      const logger = new Logger({ output: jest.fn() });
      const perfLogger = new PerformanceLogger(logger);
      
      const result = perfLogger.measure('test-function', () => {
        return 'result';
      });
      
      expect(result).toBe('result');
    });

    it('should measure async function execution time', async () => {
      const logger = new Logger({ output: jest.fn() });
      const perfLogger = new PerformanceLogger(logger);
      
      const result = await perfLogger.measureAsync('test-async-function', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });
      
      expect(result).toBe('async-result');
    });
  });

  describe('StructuredLogger', () => {
    it('should log HTTP requests', () => {
      const output = jest.fn();
      const logger = new StructuredLogger({ output });
      
      logger.logRequest('GET', '/api/users', 200, 150, 'Mozilla/5.0', '127.0.0.1', 'req-123');
      
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'HTTP Request',
          context: expect.objectContaining({
            type: 'http_request',
            method: 'GET',
            url: '/api/users',
            statusCode: 200,
            duration: 150,
            userAgent: 'Mozilla/5.0',
            ip: '127.0.0.1',
            requestId: 'req-123'
          })
        })
      );
    });

    it('should log database queries', () => {
      const output = jest.fn();
      const logger = new StructuredLogger({ output, level: LogLevel.DEBUG });
      
      logger.logQuery('SELECT * FROM users', 25, 'users', 'SELECT', 10);
      
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database Query',
          context: expect.objectContaining({
            type: 'database_query',
            query: 'SELECT * FROM users',
            duration: 25,
            table: 'users',
            operation: 'SELECT',
            rowCount: 10
          })
        })
      );
    });

    it('should log security events', () => {
      const output = jest.fn();
      const logger = new StructuredLogger({ output });
      
      logger.logSecurity('Failed login attempt', 'high', { ip: '192.168.1.1' });
      
      expect(output).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Security Event',
          context: expect.objectContaining({
            type: 'security_event',
            event: 'Failed login attempt',
            severity: 'high',
            ip: '192.168.1.1'
          })
        })
      );
    });
  });

  describe('sanitizeForLogging', () => {
    it('should sanitize sensitive data', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        token: 'abc123',
        apiKey: 'key456',
        secret: 'hidden',
        normalField: 'visible'
      };
      
      const sanitized = sanitizeForLogging(data);
      
      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('visible');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'john',
          password: 'secret'
        },
        config: {
          apiKey: 'key123'
        }
      };
      
      const sanitized = sanitizeForLogging(data);
      
      expect(sanitized.user.name).toBe('john');
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.config.apiKey).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const data = [
        { name: 'john', password: 'secret' },
        { name: 'jane', token: 'abc123' }
      ];
      
      const sanitized = sanitizeForLogging(data);
      
      expect(sanitized[0].name).toBe('john');
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1].name).toBe('jane');
      expect(sanitized[1].token).toBe('[REDACTED]');
    });
  });

  describe('logLevelFromString', () => {
    it('should convert string to log level', () => {
      expect(logLevelFromString('debug')).toBe(LogLevel.DEBUG);
      expect(logLevelFromString('INFO')).toBe(LogLevel.INFO);
      expect(logLevelFromString('warn')).toBe(LogLevel.WARN);
      expect(logLevelFromString('ERROR')).toBe(LogLevel.ERROR);
      expect(logLevelFromString('silent')).toBe(LogLevel.SILENT);
      expect(logLevelFromString('invalid')).toBe(LogLevel.INFO);
    });
  });

  describe('createRequestLogger', () => {
    it('should create a request logger with utilities', () => {
      const logger = new Logger({ output: jest.fn() });
      const createRequestLoggerFunc = createRequestLogger(logger);
      const requestLogger = createRequestLoggerFunc('req-123');
      
      expect(requestLogger.logger).toBeDefined();
      expect(requestLogger.perf).toBeDefined();
      expect(requestLogger.logRequest).toBeDefined();
      
      // Test the logRequest function
      requestLogger.logRequest('GET', '/api/test', 200, 100);
      // Should not throw
    });
  });
});