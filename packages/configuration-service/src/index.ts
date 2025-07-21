import { createApp } from './app';
import { loadConfig } from '@cycletime/shared-config';
import { logger } from '@cycletime/shared-utils';

async function start() {
  try {
    const config = await loadConfig();
    const app = await createApp({
      port: config.PORT ? parseInt(config.PORT) : 8010,
      host: config.HOST || 'localhost',
      logger: config.NODE_ENV !== 'production',
    });

    const address = await app.listen({
      port: config.PORT ? parseInt(config.PORT) : 8010,
      host: config.HOST || 'localhost',
    });

    logger.info(`Configuration Service started on ${address}`);
    logger.info(`API documentation available at ${address}/docs`);
    
    // Publish service startup event
    await app.eventService.publishEvent('config.service.started', {
      address,
      version: '1.0.0',
      features: [
        'dynamic-configuration',
        'environment-management',
        'feature-flags',
        'configuration-validation',
        'consul-integration',
        'etcd-integration',
      ],
    });

  } catch (error) {
    logger.error('Failed to start Configuration Service', error as Error);
    process.exit(1);
  }
}

start();