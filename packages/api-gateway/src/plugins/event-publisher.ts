/**
 * Event Publisher Plugin
 * Publishes events to Redis for event-driven architecture
 */

import { FastifyInstance } from 'fastify';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { EventPublisher } from '../types';

declare module 'fastify' {
  interface FastifyInstance {
    eventPublisher: EventPublisher;
  }
}

class RedisEventPublisher implements EventPublisher {
  private client: RedisClientType;
  private connected = false;

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
    }
  }

  async publish(channel: string, event: string, payload: any): Promise<void> {
    if (!this.connected) {
      logger.warn('Redis not connected, skipping event publication');
      return;
    }

    try {
      const eventData = {
        event,
        payload,
        timestamp: new Date().toISOString(),
        source: 'api-gateway',
      };

      await this.client.publish(channel, JSON.stringify(eventData));
      logger.debug('Event published:', { channel, event, payload });
    } catch (error) {
      logger.error('Failed to publish event:', error);
    }
  }
}

export const eventPublisherPlugin = async (fastify: FastifyInstance) => {
  const eventPublisher = new RedisEventPublisher();
  
  try {
    await eventPublisher.connect();
    fastify.decorate('eventPublisher', eventPublisher);
    
    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      await eventPublisher.disconnect();
    });
    
    logger.info('Event publisher plugin registered');
  } catch (error) {
    logger.error('Failed to initialize event publisher:', error);
    // Create a no-op publisher for development
    fastify.decorate('eventPublisher', {
      publish: async () => {
        // No-op for development
      },
    });
  }
};