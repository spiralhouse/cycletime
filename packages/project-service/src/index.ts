import { logger } from '@cycletime/shared-utils';
import { createApp } from './app';
import { config } from './config';

async function startServer() {
  try {
    const app = await createApp();
    
    const address = await app.listen({
      port: config.port,
      host: config.host
    });
    
    logger.info(`Project Service is listening on ${address}`);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await app.close();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await app.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();