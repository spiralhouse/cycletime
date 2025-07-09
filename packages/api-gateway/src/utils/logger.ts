import pino from 'pino';
import { config } from '../config.js';

// Create logger instance
export const logger = pino({
  level: config.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
      remoteAddress: req.ip,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    error: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refresh_token',
    ],
    censor: '[REDACTED]',
  },
});

// Request ID generator
export const generateRequestId = (): string => {
  return crypto.randomUUID();
};

// Audit logger for sensitive operations
export const auditLogger = logger.child({ audit: true });

// Security logger for authentication events
export const securityLogger = logger.child({ security: true });