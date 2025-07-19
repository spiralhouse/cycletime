import { createApp } from './app';
import { loadConfig } from '@cycletime/shared-config';
import { logger } from '@cycletime/shared-utils';

async function start() {
  try {
    const config = await loadConfig();
    const app = await createApp({
      port: config.PORT ? parseInt(config.PORT) : 8005,
      host: config.HOST || 'localhost',
      logger: config.NODE_ENV !== 'production',
    });

    const address = await app.listen({
      port: config.PORT ? parseInt(config.PORT) : 8005,
      host: config.HOST || 'localhost',
    });

    logger.info(`Document Indexing Service started on ${address}`);
    logger.info(`API documentation available at ${address}/docs`);
    
    // Log startup summary
    const healthStatus = app.mockDataService.getHealthStatus();
    const indices = app.mockDataService.getIndices();
    const statistics = app.mockDataService.getStatistics();
    
    logger.info({
      service: 'document-indexing-service',
      version: '1.0.0',
      status: healthStatus.status,
      indices: indices.length,
      totalDocuments: statistics.totalDocuments,
      totalEmbeddings: statistics.totalEmbeddings,
      averageIndexingTime: statistics.averageIndexingTime,
      vectorDimensions: statistics.vectorDimensions,
    }, 'Document Indexing Service startup summary');

    // Publish service startup event
    await app.eventService.publishEvent('document-indexing.service.started', {
      address,
      version: '1.0.0',
      indices: indices.map(i => ({ 
        id: i.id, 
        name: i.name, 
        status: i.status, 
        documentCount: i.documentCount 
      })),
      statistics,
      features: [
        'document-indexing',
        'semantic-search',
        'hybrid-search',
        'vector-embeddings',
        'keyword-search',
        'bulk-operations',
        'analytics',
        'real-time-indexing',
      ],
    });

  } catch (error) {
    logger.error(error, 'Failed to start Document Indexing Service');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    reason,
    promise,
  }, 'Unhandled promise rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(error, 'Uncaught exception');
  process.exit(1);
});

start();