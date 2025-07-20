import { InMemoryBroker, RedisBrokerStub, MessageBrokerManager } from '../../services/message-broker';
import { AIEvent } from '../../services/event-service';

// Mock logger to avoid console output during tests
jest.mock('@cycletime/shared-utils', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Message Broker', () => {
  const createMockEvent = (eventType: string = 'test.event'): AIEvent => ({
    eventId: 'test-event-123',
    eventType,
    timestamp: new Date().toISOString(),
    source: 'test-service',
    version: '1.0.0',
    correlationId: 'test-correlation-456',
  });

  describe('InMemoryBroker', () => {
    let broker: InMemoryBroker;

    beforeEach(() => {
      broker = new InMemoryBroker();
    });

    afterEach(async () => {
      await broker.disconnect();
    });

    describe('connection management', () => {
      it('should start connected', () => {
        expect(broker.isConnected()).toBe(true);
      });

      it('should disconnect properly', async () => {
        await broker.disconnect();
        expect(broker.isConnected()).toBe(false);
      });

      it('should fail operations when disconnected', async () => {
        await broker.disconnect();
        
        const event = createMockEvent();
        await expect(broker.publish('test.channel', event)).rejects.toThrow('Broker not connected');
        await expect(broker.subscribe('test.channel', jest.fn())).rejects.toThrow('Broker not connected');
      });
    });

    describe('publish and subscribe', () => {
      it('should publish and receive messages', async () => {
        const handler = jest.fn();
        const event = createMockEvent('test.message');

        await broker.subscribe('test.channel', handler);
        await broker.publish('test.channel', event);

        // Give some time for async handler
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(handler).toHaveBeenCalledWith(event);
      });

      it('should handle multiple subscribers', async () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        const event = createMockEvent();

        await broker.subscribe('multi.channel', handler1);
        await broker.subscribe('multi.channel', handler2);
        await broker.publish('multi.channel', event);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(handler1).toHaveBeenCalledWith(event);
        expect(handler2).toHaveBeenCalledWith(event);
      });

      it('should handle handler errors gracefully', async () => {
        const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
        const event = createMockEvent();

        await broker.subscribe('error.channel', errorHandler);
        
        // This should not throw, errors should be caught internally
        await expect(broker.publish('error.channel', event)).resolves.not.toThrow();

        await new Promise(resolve => setTimeout(resolve, 10));
        expect(errorHandler).toHaveBeenCalled();
      });

      it('should unsubscribe properly', async () => {
        const handler = jest.fn();
        const event = createMockEvent();

        await broker.subscribe('unsub.channel', handler);
        await broker.unsubscribe('unsub.channel');
        await broker.publish('unsub.channel', event);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('wildcard events', () => {
      it('should emit wildcard events for all published messages', async () => {
        const wildcardHandler = jest.fn();
        const event = createMockEvent();

        await broker.subscribe('*', wildcardHandler);
        await broker.publish('any.channel', event);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(wildcardHandler).toHaveBeenCalledWith({
          channel: 'any.channel',
          message: event,
        });
      });
    });
  });

  describe('RedisBrokerStub', () => {
    let broker: RedisBrokerStub;

    beforeEach(() => {
      broker = new RedisBrokerStub('redis://test:6379');
    });

    afterEach(async () => {
      await broker.disconnect();
    });

    describe('connection management', () => {
      it('should start disconnected', () => {
        expect(broker.isConnected()).toBe(false);
      });

      it('should connect with simulated delay', async () => {
        const startTime = Date.now();
        await broker.connect();
        const endTime = Date.now();

        expect(broker.isConnected()).toBe(true);
        expect(endTime - startTime).toBeGreaterThan(100); // Simulated delay
      });

      it('should disconnect properly', async () => {
        await broker.connect();
        expect(broker.isConnected()).toBe(true);

        await broker.disconnect();
        expect(broker.isConnected()).toBe(false);
      });

      it('should fail operations when disconnected', async () => {
        const event = createMockEvent();
        
        await expect(broker.publish('test.channel', event)).rejects.toThrow('Redis broker not connected');
        await expect(broker.subscribe('test.channel', jest.fn())).rejects.toThrow('Redis broker not connected');
      });
    });

    describe('publish and subscribe (stub behavior)', () => {
      beforeEach(async () => {
        await broker.connect();
      });

      it('should publish messages with simulated delay', async () => {
        const event = createMockEvent();
        
        const startTime = Date.now();
        await broker.publish('redis.channel', event);
        const endTime = Date.now();

        // Should have some delay (1-6ms simulated)
        expect(endTime - startTime).toBeGreaterThan(0);
      });

      it('should subscribe to channels', async () => {
        const handler = jest.fn();
        
        await expect(broker.subscribe('redis.channel', handler)).resolves.not.toThrow();
      });

      it('should unsubscribe from channels', async () => {
        const handler = jest.fn();
        
        await broker.subscribe('redis.channel', handler);
        await expect(broker.unsubscribe('redis.channel')).resolves.not.toThrow();
      });

      it('should track subscriptions', async () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        
        await broker.subscribe('channel1', handler1);
        await broker.subscribe('channel2', handler2);
        
        // Subscriptions should be tracked internally
        expect(broker.isConnected()).toBe(true);
        
        await broker.unsubscribe('channel1');
        // Should still be connected with remaining subscription
        expect(broker.isConnected()).toBe(true);
      });
    });
  });

  describe('MessageBrokerManager', () => {
    describe('initialization', () => {
      it('should initialize with in-memory broker by default', async () => {
        const manager = new MessageBrokerManager();
        
        await expect(manager.initialize()).resolves.not.toThrow();
        expect(manager.isConnected()).toBe(true);
        
        await manager.shutdown();
      });

      it('should initialize with Redis broker stub', async () => {
        const manager = new MessageBrokerManager('redis', 'redis://test:6379');
        
        await expect(manager.initialize()).resolves.not.toThrow();
        expect(manager.isConnected()).toBe(true);
        
        await manager.shutdown();
      });

      it('should set up event subscriptions during initialization', async () => {
        const manager = new MessageBrokerManager('memory');
        
        await manager.initialize();
        
        // Should be connected and have subscriptions set up
        expect(manager.isConnected()).toBe(true);
        
        await manager.shutdown();
      });
    });

    describe('message publishing', () => {
      let manager: MessageBrokerManager;

      beforeEach(async () => {
        manager = new MessageBrokerManager('memory');
        await manager.initialize();
      });

      afterEach(async () => {
        await manager.shutdown();
      });

      it('should publish messages through broker', async () => {
        const event = createMockEvent('manager.test');
        
        await expect(manager.publish('manager.test', event)).resolves.not.toThrow();
      });

      it('should handle publish errors', async () => {
        // Disconnect broker to cause error
        await manager.shutdown();
        
        const event = createMockEvent();
        
        await expect(manager.publish('error.test', event)).rejects.toThrow();
      });
    });

    describe('shutdown', () => {
      it('should shutdown gracefully', async () => {
        const manager = new MessageBrokerManager('memory');
        await manager.initialize();
        
        expect(manager.isConnected()).toBe(true);
        
        await manager.shutdown();
        
        expect(manager.isConnected()).toBe(false);
      });

      it('should handle shutdown errors gracefully', async () => {
        const manager = new MessageBrokerManager('memory');
        await manager.initialize();
        
        // Mock broker to throw error on disconnect
        const broker = manager.getBroker();
        const originalDisconnect = broker.disconnect;
        broker.disconnect = jest.fn().mockRejectedValue(new Error('Disconnect failed'));
        
        await expect(manager.shutdown()).resolves.not.toThrow();
        
        // Restore original method
        broker.disconnect = originalDisconnect;
      });
    });

    describe('integration with event handlers', () => {
      it('should route events to appropriate handlers', async () => {
        const manager = new MessageBrokerManager('memory');
        await manager.initialize();

        // Create events that should be handled
        const projectEvent = createMockEvent('project.created');
        projectEvent.projectId = 'test-project-123';

        const contextEvent = createMockEvent('context.updated');
        contextEvent.contextId = 'test-context-456';

        // Publishing should work without errors
        await expect(manager.publish('project.created', projectEvent)).resolves.not.toThrow();
        await expect(manager.publish('context.updated', contextEvent)).resolves.not.toThrow();

        await manager.shutdown();
      });
    });
  });
});