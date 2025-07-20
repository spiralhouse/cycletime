import winston from 'winston';
import { FastifyBaseLogger } from 'fastify';

const logLevel = process.env.LOG_LEVEL || 'info';

const winstonLogger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'standards-engine' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Create a Fastify-compatible logger
export const logger: FastifyBaseLogger = {
  fatal: (msg: any, ...args: any[]) => winstonLogger.error(msg, ...args),
  error: (msg: any, ...args: any[]) => winstonLogger.error(msg, ...args),
  warn: (msg: any, ...args: any[]) => winstonLogger.warn(msg, ...args),
  info: (msg: any, ...args: any[]) => winstonLogger.info(msg, ...args),
  debug: (msg: any, ...args: any[]) => winstonLogger.debug(msg, ...args),
  trace: (msg: any, ...args: any[]) => winstonLogger.debug(msg, ...args),
  silent: () => {},
  level: logLevel,
  child: () => logger,
} as FastifyBaseLogger;

// Add file logging in production
if (process.env.NODE_ENV === 'production') {
  winstonLogger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  winstonLogger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}