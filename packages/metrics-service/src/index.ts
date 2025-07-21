import { createApp } from './app';
import { loadConfig } from '@cycletime/shared-config';
import { logger } from '@cycletime/shared-utils';

async function start() {
  try {
    const config = await loadConfig();
    const app = await createApp({
      port: config.PORT ? parseInt(config.PORT) : 8007,
      host: config.HOST || 'localhost',
      logger: config.NODE_ENV !== 'production',
    });

    const address = await app.listen({
      port: config.PORT ? parseInt(config.PORT) : 8007,
      host: config.HOST || 'localhost',
    });

    logger.info(`Metrics Service started on ${address}`);
    logger.info(`API documentation available at ${address}/docs`);
    logger.info(`Prometheus metrics available at ${address}/metrics`);
    
    // Log startup summary
    const healthStatus = app.mockDataService.getHealthStatus();
    const metrics = app.mockDataService.getMetrics();
    const dashboards = app.mockDataService.getDashboards();
    const alerts = app.mockDataService.getAlerts();
    
    logger.info('Metrics Service startup summary', {
      service: 'metrics-service',
      version: '1.0.0',
      status: healthStatus.status,
      totalMetrics: metrics.length,
      activeDashboards: dashboards.filter((d: any) => !d.isArchived).length,
      activeAlerts: alerts.filter((a: any) => a.status === 'active').length,
      systemHealth: healthStatus.overall,
    });

    // Publish service startup event
    await app.eventService.publishEvent('metrics.service.started', {
      address,
      version: '1.0.0',
      features: [
        'prometheus-metrics',
        'custom-metrics',
        'real-time-dashboards',
        'alert-management',
        'system-health-monitoring',
        'grafana-integration',
        'influxdb-storage',
        'anomaly-detection',
      ],
      capabilities: {
        metricsCollection: true,
        alerting: true,
        dashboards: true,
        systemHealth: true,
        anomalyDetection: true,
      },
    });

  } catch (error) {
    logger.error('Failed to start Metrics Service', error as Error);
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