/**
 * CycleTime API Gateway
 * Unified entry point with authentication, authorization, rate limiting, and service routing
 */

import { build } from './app';
import { logger } from './utils/logger';
import { config } from './config/gateway-config';

const start = async () => {
  try {
    const app = await build();
    
    // Start the server
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(`API Gateway started on ${config.server.host}:${config.server.port}`);
    logger.info(`Environment: ${config.server.environment}`);
    logger.info(`Health check available at: http://${config.server.host}:${config.server.port}/health`);
  } catch (error) {
    logger.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the application
start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});