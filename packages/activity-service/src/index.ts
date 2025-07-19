import { createApp } from './app';
import { loadConfig } from '@cycletime/shared-config';
import { logger } from '@cycletime/shared-utils';

async function start() {
  try {
    const config = await loadConfig();
    const app = await createApp({
      port: config.PORT ? parseInt(config.PORT) : 8009,
      host: config.HOST || 'localhost',
      logger: config.NODE_ENV !== 'production',
    });

    const address = await app.listen({
      port: config.PORT ? parseInt(config.PORT) : 8009,
      host: config.HOST || 'localhost',
    });

    logger.info(`Activity Service started on ${address}`);
    logger.info(`API documentation available at ${address}/docs`);
    
    // Publish service startup event
    await app.eventService.publishEvent('activity.service.started', {
      address,
      version: '1.0.0',
      features: [
        'activity-logging',
        'audit-trails',
        'real-time-feeds',
        'analytics',
        'elasticsearch-integration',
      ],
    });

  } catch (error) {
    logger.error(error, 'Failed to start Activity Service');
    process.exit(1);
  }
}

start();