import { App } from './app';
import { logger } from './utils/logger';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3007', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  logger.info('Starting Standards Engine service', {
    port: PORT,
    host: HOST,
    environment: NODE_ENV,
    nodeVersion: process.version,
  });

  const app = new App();

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    try {
      await app.stop();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
    process.exit(1);
  });

  try {
    await app.start();
  } catch (error) {
    logger.error('Failed to start Standards Engine service', { error });
    process.exit(1);
  }
}

// Start the service
main().catch((error) => {
  logger.error('Fatal error during startup', { error });
  process.exit(1);
});