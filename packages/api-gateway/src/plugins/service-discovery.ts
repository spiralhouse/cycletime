/**
 * Service Discovery Plugin
 * Manages service registry and health checking
 */

import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger';
import { ServiceDiscovery, ServiceInfo, ServiceHealthStatus, ServiceDiscoveryPluginOptions } from '../types';

declare module 'fastify' {
  interface FastifyInstance {
    serviceDiscovery: ServiceDiscovery;
  }
}

class InMemoryServiceDiscovery implements ServiceDiscovery {
  private services: Map<string, ServiceInfo> = new Map();
  private healthStatuses: Map<string, ServiceHealthStatus> = new Map();
  private healthCheckInterval: NodeJS.Timer | null = null;
  private options: ServiceDiscoveryPluginOptions;

  constructor(options: ServiceDiscoveryPluginOptions) {
    this.options = options;
  }

  async register(service: any): Promise<void> {
    const serviceInfo: ServiceInfo = {
      id: service.id,
      name: service.name,
      version: service.version || '1.0.0',
      status: 'unknown',
      url: service.url,
      healthCheckUrl: service.healthCheckUrl,
      registeredAt: new Date().toISOString(),
    };

    this.services.set(service.id, serviceInfo);
    this.healthStatuses.set(service.id, {
      status: 'unknown',
      responseTime: 0,
      lastCheck: new Date().toISOString(),
    });

    logger.info(`Service registered: ${service.name} (${service.id})`);
  }

  async deregister(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      this.healthStatuses.delete(serviceId);
      logger.info(`Service deregistered: ${service.name} (${serviceId})`);
    }
  }

  async discover(serviceId: string): Promise<ServiceInfo | null> {
    return this.services.get(serviceId) || null;
  }

  async listServices(): Promise<ServiceInfo[]> {
    return Array.from(this.services.values());
  }

  async healthCheck(serviceId: string): Promise<ServiceHealthStatus> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'unknown';
    let responseTime = 0;

    try {
      if (service.healthCheckUrl) {
        const response = await fetch(service.healthCheckUrl, {
          method: 'GET',
          timeout: this.options.serviceTimeout,
        });

        responseTime = Date.now() - startTime;

        if (response.ok) {
          status = 'healthy';
        } else {
          status = 'degraded';
        }
      } else {
        // If no health check URL, assume healthy
        status = 'healthy';
        responseTime = 0;
      }
    } catch (error) {
      responseTime = Date.now() - startTime;
      status = 'unhealthy';
      logger.warn(`Health check failed for ${serviceId}:`, error);
    }

    const healthStatus: ServiceHealthStatus = {
      status,
      responseTime,
      lastCheck: new Date().toISOString(),
    };

    // Update cached health status
    this.healthStatuses.set(serviceId, healthStatus);

    // Update service status
    const updatedService = { ...service, status, responseTime, lastHealthCheck: healthStatus.lastCheck };
    this.services.set(serviceId, updatedService);

    return healthStatus;
  }

  startHealthChecking(fastify: FastifyInstance): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const services = Array.from(this.services.keys());
      
      for (const serviceId of services) {
        try {
          const previousStatus = this.healthStatuses.get(serviceId)?.status || 'unknown';
          const currentStatus = await this.healthCheck(serviceId);
          
          // Publish health change event if status changed
          if (previousStatus !== currentStatus.status && fastify.eventPublisher) {
            const service = this.services.get(serviceId);
            if (service) {
              await fastify.eventPublisher.publish('gateway.services', 'service.health.changed', {
                serviceId,
                serviceName: service.name,
                previousStatus,
                currentStatus: currentStatus.status,
                healthCheckUrl: service.healthCheckUrl,
                responseTime: currentStatus.responseTime,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          logger.error(`Health check failed for ${serviceId}:`, error);
        }
      }
    }, this.options.healthCheckInterval);
  }

  stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export const serviceDiscoveryPlugin = async (fastify: FastifyInstance, options: ServiceDiscoveryPluginOptions) => {
  const serviceDiscovery = new InMemoryServiceDiscovery(options);
  
  fastify.decorate('serviceDiscovery', serviceDiscovery);

  // Register configured services
  const { config } = await import('../config/gateway-config');
  for (const service of config.services) {
    await serviceDiscovery.register(service);
  }

  // Start health checking
  serviceDiscovery.startHealthChecking(fastify);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    serviceDiscovery.stopHealthChecking();
  });

  logger.info('Service discovery plugin registered');
};