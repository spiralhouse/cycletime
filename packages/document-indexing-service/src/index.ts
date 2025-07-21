import { createApp } from './app';
import { getEnvVar, getEnvVarAsNumber } from '@cycletime/shared-config';
import { logger } from '@cycletime/shared-utils';

async function start() {
  try {
    const config = {
      PORT: getEnvVarAsNumber('PORT', 3003) ?? 3003,
      HOST: getEnvVar('HOST', 'localhost') ?? 'localhost',
      NODE_ENV: getEnvVar('NODE_ENV', 'development') ?? 'development'
    };
    
    const app = await createApp({
      port: config.PORT,
      host: config.HOST,
      logger: config.NODE_ENV !== 'production',
    });

    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info(`Document Indexing Service started on ${address}`);
    logger.info(`API documentation available at ${address}/docs`);
    
    // Log startup summary
    const healthStatus = app.mockDataService.getHealthStatus();
    const indices = app.mockDataService.getIndices();
    const statistics = app.mockDataService.getStatistics();
    
    logger.info('Document Indexing Service startup summary', {
      service: 'document-indexing-service',
      version: '1.0.0',
      status: healthStatus.status,
      indices: indices.length,
      totalDocuments: statistics.totalDocuments,
      totalEmbeddings: statistics.totalEmbeddings,
      averageIndexingTime: statistics.averageIndexingTime,
      vectorDimensions: statistics.vectorDimensions,
    });

    // Publish service startup event
    await app.eventService.publishEvent('document-indexing.service.started', {
      address,
      version: '1.0.0',
      indices: indices.map((i: any) => ({ 
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
    logger.error('Failed to start Document Indexing Service', error as Error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', undefined, {
    reason,
    promise,
  });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

start();