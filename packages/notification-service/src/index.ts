import { createApp } from './app';
import { loadConfig } from '@cycletime/shared-config';
import { logger } from '@cycletime/shared-utils';

async function start() {
  try {
    const config = await loadConfig();
    const app = await createApp({
      port: config.PORT ? parseInt(config.PORT) : 8008,
      host: config.HOST || 'localhost',
      logger: config.NODE_ENV !== 'production',
    });

    const address = await app.listen({
      port: config.PORT ? parseInt(config.PORT) : 8008,
      host: config.HOST || 'localhost',
    });

    logger.info(`Notification Service started on ${address}`);
    logger.info(`API documentation available at ${address}/docs`);
    
    // Log startup summary
    const healthStatus = app.mockDataService.getHealthStatus();
    const templates = app.mockDataService.getTemplates();
    const notifications = app.mockDataService.getNotifications();
    
    logger.info('Notification Service startup summary', {
      service: 'notification-service',
      version: '1.0.0',
      status: healthStatus.status,
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.isActive).length,
      totalNotifications: notifications.length,
      pendingNotifications: notifications.filter(n => n.status === 'pending').length,
      channels: ['email', 'sms', 'push', 'in_app'],
    });

    // Publish service startup event
    await app.eventService.publishEvent('notification.service.started', {
      address,
      version: '1.0.0',
      features: [
        'multi-channel-notifications',
        'template-management',
        'user-preferences',
        'delivery-tracking',
        'bulk-notifications',
        'scheduled-notifications',
        'real-time-events',
      ],
      channels: [
        { type: 'email', provider: 'nodemailer', status: 'active' },
        { type: 'sms', provider: 'twilio', status: 'active' },
        { type: 'push', provider: 'firebase', status: 'active' },
        { type: 'in_app', provider: 'native', status: 'active' },
      ],
    });

  } catch (error) {
    logger.error('Failed to start Notification Service', error as Error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', new Error(`Unhandled promise rejection: ${reason}`), {
    promise,
  });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error as Error);
  process.exit(1);
});

start();