import { build } from './app';
import { logger } from '@cycletime/shared-utils';

const PORT = parseInt(process.env.PORT || '8010');
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  try {
    // Build the application
    const app = await build();

    // Start the server
    await app.listen({ port: PORT, host: HOST });

    logger.info('Contract Generation Engine started successfully', {
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    });

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await app.close();
        logger.info('Application closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start Contract Generation Engine', { error });
    process.exit(1);
  }
}

// Start the application
start().catch((error) => {
  logger.error('Startup failed', { error });
  process.exit(1);
});

export { build };