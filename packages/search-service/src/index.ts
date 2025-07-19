import { createApp } from './app';
import { loadConfig } from '@cycletime/shared-config';
import { logger } from '@cycletime/shared-utils';

async function start() {
  try {
    const config = await loadConfig();
    const app = await createApp({
      port: config.PORT ? parseInt(config.PORT) : 8011,
      host: config.HOST || 'localhost',
      logger: config.NODE_ENV !== 'production',
    });

    const address = await app.listen({
      port: config.PORT ? parseInt(config.PORT) : 8011,
      host: config.HOST || 'localhost',
    });

    logger.info(`Search Service started on ${address}`);
    logger.info(`API documentation available at ${address}/docs`);
    
    // Publish service startup event
    await app.eventService.publishEvent('search.service.started', {
      address,
      version: '1.0.0',
      features: [
        'global-search',
        'elasticsearch-integration',
        'faceted-search',
        'search-suggestions',
        'document-indexing',
        'search-analytics',
      ],
    });

  } catch (error) {
    logger.error(error, 'Failed to start Search Service');
    process.exit(1);
  }
}

start();