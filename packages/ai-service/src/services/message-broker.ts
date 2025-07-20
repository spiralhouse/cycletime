import { EventEmitter } from 'events';
import { logger } from '@cycletime/shared-utils';
import { AIEvent } from './event-service';
import { EventHandlers } from './event-handlers';

export interface MessageBroker {
  publish(channel: string, message: AIEvent): Promise<void>;
  subscribe(channel: string, handler: (message: AIEvent) => Promise<void>): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export class InMemoryBroker implements MessageBroker {
  private emitter: EventEmitter;
  private connected: boolean = true;
  private subscriptions: Map<string, (message: AIEvent) => Promise<void>> = new Map();

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  async publish(channel: string, message: AIEvent): Promise<void> {
    if (!this.connected) {
      throw new Error('Broker not connected');
    }

    try {
      logger.debug('Publishing message to in-memory broker', {
        channel,
        eventId: message.eventId,
        eventType: message.eventType,
      });

      // Emit the event
      this.emitter.emit(channel, message);

      // Also emit to wildcard listeners
      this.emitter.emit('*', { channel, message });
    } catch (error) {
      const logContext = {
        channel,
        eventId: message.eventId,
      };
      logger.error('Failed to publish message to in-memory broker', error instanceof Error ? error : undefined, logContext);
      throw error;
    }
  }

  async subscribe(channel: string, handler: (message: AIEvent) => Promise<void>): Promise<void> {
    if (!this.connected) {
      throw new Error('Broker not connected');
    }

    try {
      logger.info('Subscribing to channel on in-memory broker', { channel });

      // Wrap handler to handle async errors
      const wrappedHandler = async (message: AIEvent) => {
        try {
          await handler(message);
        } catch (error) {
          const logContext = {
            channel,
            eventId: message.eventId,
          };
          logger.error('Event handler failed', error instanceof Error ? error : undefined, logContext);
        }
      };

      this.emitter.on(channel, wrappedHandler);
      this.subscriptions.set(channel, handler);
    } catch (error) {
      const logContext = { channel };
      logger.error('Failed to subscribe to channel', error instanceof Error ? error : undefined, logContext);
      throw error;
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      logger.info('Unsubscribing from channel on in-memory broker', { channel });
      
      const handler = this.subscriptions.get(channel);
      if (handler) {
        this.emitter.removeAllListeners(channel);
        this.subscriptions.delete(channel);
      }
    } catch (error) {
      const logContext = { channel };
      logger.error('Failed to unsubscribe from channel', error instanceof Error ? error : undefined, logContext);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting in-memory broker');
      this.connected = false;
      this.emitter.removeAllListeners();
      this.subscriptions.clear();
    } catch (error) {
      logger.error('Failed to disconnect in-memory broker', error instanceof Error ? error : undefined);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export class RedisBrokerStub implements MessageBroker {
  private connected: boolean = false;
  private subscriptions: Map<string, (message: AIEvent) => Promise<void>> = new Map();

  constructor(private connectionString: string = 'redis://localhost:6379') {}

  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Redis broker (stub)', { 
        connectionString: this.connectionString 
      });
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      this.connected = true;
      
      logger.info('Connected to Redis broker (stub)');
    } catch (error) {
      const logContext = { connectionString: this.connectionString };
      logger.error('Failed to connect to Redis broker (stub)', error instanceof Error ? error : undefined, logContext);
      throw error;
    }
  }

  async publish(channel: string, message: AIEvent): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis broker not connected');
    }

    try {
      logger.debug('Publishing message to Redis broker (stub)', {
        channel,
        eventId: message.eventId,
        eventType: message.eventType,
      });

      // Simulate Redis publish delay
      await new Promise(resolve => setTimeout(resolve, 1 + Math.random() * 5));

      // In a real implementation, this would use Redis PUBLISH
      // For stub, we just log the operation
      logger.debug('Message published to Redis (stub)', {
        channel,
        eventId: message.eventId,
        messageSize: JSON.stringify(message).length,
      });
    } catch (error) {
      const logContext = {
        channel,
        eventId: message.eventId,
      };
      logger.error('Failed to publish message to Redis broker (stub)', error instanceof Error ? error : undefined, logContext);
      throw error;
    }
  }

  async subscribe(channel: string, handler: (message: AIEvent) => Promise<void>): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis broker not connected');
    }

    try {
      logger.info('Subscribing to channel on Redis broker (stub)', { channel });

      // Store subscription for tracking
      this.subscriptions.set(channel, handler);

      // In a real implementation, this would use Redis SUBSCRIBE
      // For stub, we just log the subscription
      logger.info('Subscribed to Redis channel (stub)', {
        channel,
        totalSubscriptions: this.subscriptions.size,
      });
    } catch (error) {
      const logContext = { channel };
      logger.error('Failed to subscribe to Redis channel (stub)', error instanceof Error ? error : undefined, logContext);
      throw error;
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      logger.info('Unsubscribing from Redis channel (stub)', { channel });
      
      this.subscriptions.delete(channel);
      
      // In a real implementation, this would use Redis UNSUBSCRIBE
      logger.info('Unsubscribed from Redis channel (stub)', {
        channel,
        remainingSubscriptions: this.subscriptions.size,
      });
    } catch (error) {
      const logContext = { channel };
      logger.error('Failed to unsubscribe from Redis channel (stub)', error instanceof Error ? error : undefined, logContext);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting Redis broker (stub)');
      this.connected = false;
      this.subscriptions.clear();
      
      // Simulate disconnection delay
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      
      logger.info('Disconnected from Redis broker (stub)');
    } catch (error) {
      logger.error('Failed to disconnect Redis broker (stub)', error instanceof Error ? error : undefined);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export class MessageBrokerManager {
  private broker: MessageBroker;
  private eventHandlers: EventHandlers;

  constructor(brokerType: 'memory' | 'redis' = 'memory', connectionString?: string) {
    this.eventHandlers = new EventHandlers();
    
    if (brokerType === 'redis') {
      this.broker = new RedisBrokerStub(connectionString);
    } else {
      this.broker = new InMemoryBroker();
    }
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing message broker manager');

      // Connect broker if it's Redis
      if (this.broker instanceof RedisBrokerStub) {
        await this.broker.connect();
      }

      // Subscribe to consumed events
      await this.setupEventSubscriptions();

      logger.info('Message broker manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize message broker manager', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  private async setupEventSubscriptions(): Promise<void> {
    const handlerMap = this.eventHandlers.getHandlerMap();
    
    for (const [eventType, handler] of Object.entries(handlerMap)) {
      try {
        await this.broker.subscribe(eventType, handler);
        logger.info('Subscribed to event type', { eventType });
      } catch (error) {
        const logContext = { eventType };
        logger.error('Failed to subscribe to event type', error instanceof Error ? error : undefined, logContext);
      }
    }
  }

  async publish(eventType: string, message: AIEvent): Promise<void> {
    try {
      await this.broker.publish(eventType, message);
    } catch (error) {
      const logContext = {
        eventType,
        eventId: message.eventId,
      };
      logger.error('Failed to publish event via broker manager', error instanceof Error ? error : undefined, logContext);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down message broker manager');
      await this.broker.disconnect();
      logger.info('Message broker manager shut down successfully');
    } catch (error) {
      logger.error('Failed to shutdown message broker manager', error instanceof Error ? error : undefined);
    }
  }

  getBroker(): MessageBroker {
    return this.broker;
  }

  isConnected(): boolean {
    return this.broker.isConnected();
  }
}

// Factory function for easy instantiation
export function createMessageBroker(brokerType: 'memory' | 'redis' = 'memory', connectionString?: string): MessageBrokerManager {
  return new MessageBrokerManager(brokerType, connectionString);
}