/**
 * Tests for MockOrchestrator - Test service orchestration utilities
 */

import { MockOrchestrator } from '../contract/mock-orchestrator';
import { MockOptions, ServiceConfig, MockService, MockEventBroker } from '../types';

describe('MockOrchestrator', () => {
  let orchestrator: MockOrchestrator;

  beforeEach(() => {
    orchestrator = new MockOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.cleanup();
  });

  describe('constructor', () => {
    it('should create orchestrator with default options', () => {
      const orchestrator = new MockOrchestrator();
      expect(orchestrator).toBeDefined();
    });

    it('should create orchestrator with custom global options', () => {
      const options: MockOptions = {
        strictMode: false,
        includeExamples: false,
        timeout: 10000,
        baseUrl: 'http://localhost:4000'
      };
      const orchestrator = new MockOrchestrator(options);
      expect(orchestrator).toBeDefined();
    });
  });

  describe('createContractCompliantMock', () => {
    it('should create mock service from OpenAPI spec', () => {
      const spec = {
        info: { title: 'Test Service', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        }
      };

      const mockService = orchestrator.createContractCompliantMock(spec);

      expect(mockService).toBeDefined();
      expect(mockService.getBaseUrl()).toBe('http://localhost:3000');
    });

    it('should create mock service with custom options', () => {
      const spec = {
        info: { title: 'Custom Service', version: '1.0.0' },
        paths: {}
      };
      const options: MockOptions = {
        baseUrl: 'http://localhost:8080',
        strictMode: false
      };

      const mockService = orchestrator.createContractCompliantMock(spec, options);

      expect(mockService).toBeDefined();
      expect(mockService.getBaseUrl()).toBe('http://localhost:8080');
    });

    it('should handle spec without title', () => {
      const spec = {
        info: { version: '1.0.0' },
        paths: {}
      };

      const mockService = orchestrator.createContractCompliantMock(spec);

      expect(mockService).toBeDefined();
      expect(mockService.getBaseUrl()).toBe('http://localhost:3000');
    });

    it('should handle spec without info', () => {
      const spec = { paths: {} };

      const mockService = orchestrator.createContractCompliantMock(spec);

      expect(mockService).toBeDefined();
    });
  });

  describe('createEventMockBroker', () => {
    it('should create mock event broker from AsyncAPI spec', () => {
      const spec = {
        info: { title: 'Test Broker', version: '1.0.0' },
        channels: {
          'user/created': {
            subscribe: {
              message: { name: 'UserCreated' }
            }
          }
        }
      };

      const mockBroker = orchestrator.createEventMockBroker(spec);

      expect(mockBroker).toBeDefined();
    });

    it('should handle spec without title', () => {
      const spec = {
        info: { version: '1.0.0' },
        channels: {}
      };

      const mockBroker = orchestrator.createEventMockBroker(spec);

      expect(mockBroker).toBeDefined();
    });

    it('should handle spec without info', () => {
      const spec = { channels: {} };

      const mockBroker = orchestrator.createEventMockBroker(spec);

      expect(mockBroker).toBeDefined();
    });
  });

  describe('orchestrateServiceInteractions', () => {
    it('should orchestrate multiple HTTP services', async () => {
      const services: ServiceConfig[] = [
        {
          name: 'user-service',
          spec: {
            info: { title: 'User Service', version: '1.0.0' },
            paths: {
              '/users': { get: { responses: { '200': { description: 'Success' } } } }
            }
          },
          mockOptions: { baseUrl: 'http://localhost:3001' }
        },
        {
          name: 'order-service',
          spec: {
            info: { title: 'Order Service', version: '1.0.0' },
            paths: {
              '/orders': { get: { responses: { '200': { description: 'Success' } } } }
            }
          },
          mockOptions: { baseUrl: 'http://localhost:3002' }
        }
      ];

      const testEnv = await orchestrator.orchestrateServiceInteractions(services);

      expect(testEnv).toBeDefined();
      expect(testEnv.services).toHaveLength(2);
      expect(testEnv.eventBroker).toBeUndefined();

      await testEnv.cleanup();
    });

    it('should orchestrate event broker service', async () => {
      const services: ServiceConfig[] = [
        {
          name: 'event-broker',
          spec: {
            info: { title: 'Event Broker', version: '1.0.0' },
            channels: {
              'user/created': { subscribe: {} }
            }
          }
        }
      ];

      const testEnv = await orchestrator.orchestrateServiceInteractions(services);

      expect(testEnv).toBeDefined();
      expect(testEnv.services).toHaveLength(0);
      expect(testEnv.eventBroker).toBeDefined();

      await testEnv.cleanup();
    });

    it('should orchestrate mixed HTTP services and event broker', async () => {
      const services: ServiceConfig[] = [
        {
          name: 'api-gateway',
          spec: {
            info: { title: 'API Gateway', version: '1.0.0' },
            paths: {
              '/api/health': { get: { responses: { '200': { description: 'OK' } } } }
            }
          }
        },
        {
          name: 'event-system',
          spec: {
            info: { title: 'Event System', version: '1.0.0' },
            channels: {
              'system/health': { publish: {} }
            }
          }
        }
      ];

      const testEnv = await orchestrator.orchestrateServiceInteractions(services);

      expect(testEnv).toBeDefined();
      expect(testEnv.services).toHaveLength(1);
      expect(testEnv.eventBroker).toBeDefined();

      await testEnv.cleanup();
    });

    it('should reuse existing event broker for multiple AsyncAPI specs', async () => {
      const services: ServiceConfig[] = [
        {
          name: 'broker1',
          spec: {
            info: { title: 'Broker 1', version: '1.0.0' },
            channels: { 'event/1': { subscribe: {} } }
          }
        },
        {
          name: 'broker2',
          spec: {
            info: { title: 'Broker 2', version: '1.0.0' },
            channels: { 'event/2': { subscribe: {} } }
          }
        }
      ];

      const testEnv = await orchestrator.orchestrateServiceInteractions(services);

      expect(testEnv).toBeDefined();
      expect(testEnv.services).toHaveLength(0);
      expect(testEnv.eventBroker).toBeDefined();

      await testEnv.cleanup();
    });

    it('should handle empty service configurations', async () => {
      const testEnv = await orchestrator.orchestrateServiceInteractions([]);

      expect(testEnv).toBeDefined();
      expect(testEnv.services).toHaveLength(0);
      expect(testEnv.eventBroker).toBeUndefined();

      await testEnv.cleanup();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all mock services and brokers', async () => {
      // Create some mock services and brokers
      const httpSpec = {
        info: { title: 'HTTP Service', version: '1.0.0' },
        paths: { '/test': { get: {} } }
      };
      const eventSpec = {
        info: { title: 'Event Broker', version: '1.0.0' },
        channels: { 'test/event': { subscribe: {} } }
      };

      const mockService = orchestrator.createContractCompliantMock(httpSpec);
      const mockBroker = orchestrator.createEventMockBroker(eventSpec);

      await mockService.start();
      await mockBroker.start();

      // Cleanup should not throw
      await expect(orchestrator.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when no services exist', async () => {
      await expect(orchestrator.cleanup()).resolves.not.toThrow();
    });
  });
});

describe('MockService', () => {
  let orchestrator: MockOrchestrator;
  let mockService: MockService;

  beforeEach(() => {
    orchestrator = new MockOrchestrator();
    const spec = {
      info: { title: 'Test Service', version: '1.0.0' },
      paths: { '/test': { get: {} } }
    };
    mockService = orchestrator.createContractCompliantMock(spec, { baseUrl: 'http://localhost:9000' });
  });

  afterEach(async () => {
    await orchestrator.cleanup();
  });

  it('should start and stop successfully', async () => {
    await expect(mockService.start()).resolves.not.toThrow();
    await expect(mockService.stop()).resolves.not.toThrow();
  });

  it('should return correct base URL', () => {
    expect(mockService.getBaseUrl()).toBe('http://localhost:9000');
  });

  it('should add endpoint without throwing', () => {
    expect(() => mockService.addEndpoint('/users', 'GET', { users: [] })).not.toThrow();
  });

  it('should remove endpoint without throwing', () => {
    expect(() => mockService.removeEndpoint('/users', 'GET')).not.toThrow();
  });
});

describe('MockEventBroker', () => {
  let orchestrator: MockOrchestrator;
  let mockBroker: MockEventBroker;

  beforeEach(() => {
    orchestrator = new MockOrchestrator();
    const spec = {
      info: { title: 'Test Broker', version: '1.0.0' },
      channels: { 'test/event': { subscribe: {} } }
    };
    mockBroker = orchestrator.createEventMockBroker(spec);
  });

  afterEach(async () => {
    await orchestrator.cleanup();
  });

  it('should start and stop successfully', async () => {
    await expect(mockBroker.start()).resolves.not.toThrow();
    await expect(mockBroker.stop()).resolves.not.toThrow();
  });

  it('should handle publish and subscribe', async () => {
    const receivedEvents: any[] = [];
    const handler = (payload: any) => receivedEvents.push(payload);

    await mockBroker.start();
    mockBroker.subscribe('test/event', handler);
    
    await mockBroker.publish('test/event', { message: 'Hello World' });

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]).toEqual({ message: 'Hello World' });
  });

  it('should throw error when publishing to stopped broker', async () => {
    await expect(mockBroker.publish('test/event', {})).rejects.toThrow('Mock event broker is not running');
  });

  it('should handle multiple subscribers for same event', async () => {
    const received1: any[] = [];
    const received2: any[] = [];
    
    const handler1 = (payload: any) => received1.push(payload);
    const handler2 = (payload: any) => received2.push(payload);

    await mockBroker.start();
    mockBroker.subscribe('test/event', handler1);
    mockBroker.subscribe('test/event', handler2);
    
    await mockBroker.publish('test/event', { id: 123 });

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
    expect(received1[0]).toEqual({ id: 123 });
    expect(received2[0]).toEqual({ id: 123 });
  });

  it('should handle unsubscribe', async () => {
    const receivedEvents: any[] = [];
    const handler = (payload: any) => receivedEvents.push(payload);

    await mockBroker.start();
    mockBroker.subscribe('test/event', handler);
    mockBroker.unsubscribe('test/event');
    
    await mockBroker.publish('test/event', { message: 'Should not receive' });

    expect(receivedEvents).toHaveLength(0);
  });

  it('should clear subscribers on stop', async () => {
    const receivedEvents: any[] = [];
    const handler = (payload: any) => receivedEvents.push(payload);

    await mockBroker.start();
    mockBroker.subscribe('test/event', handler);
    await mockBroker.stop();
    await mockBroker.start();
    
    await mockBroker.publish('test/event', { message: 'After restart' });

    expect(receivedEvents).toHaveLength(0);
  });
});

describe('TestEnvironment', () => {
  let orchestrator: MockOrchestrator;

  beforeEach(() => {
    orchestrator = new MockOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.cleanup();
  });

  it('should cleanup all services and broker', async () => {
    const services: ServiceConfig[] = [
      {
        name: 'service1',
        spec: {
          info: { title: 'Service 1', version: '1.0.0' },
          paths: { '/test1': { get: {} } }
        }
      },
      {
        name: 'broker1',
        spec: {
          info: { title: 'Broker 1', version: '1.0.0' },
          channels: { 'test/1': { subscribe: {} } }
        }
      }
    ];

    const testEnv = await orchestrator.orchestrateServiceInteractions(services);
    
    // Should not throw during cleanup
    await expect(testEnv.cleanup()).resolves.not.toThrow();
  });

  it('should handle cleanup with services only', async () => {
    const services: ServiceConfig[] = [
      {
        name: 'service1',
        spec: {
          info: { title: 'Service 1', version: '1.0.0' },
          paths: { '/test1': { get: {} } }
        }
      }
    ];

    const testEnv = await orchestrator.orchestrateServiceInteractions(services);
    
    expect(testEnv.eventBroker).toBeUndefined();
    await expect(testEnv.cleanup()).resolves.not.toThrow();
  });

  it('should handle cleanup with broker only', async () => {
    const services: ServiceConfig[] = [
      {
        name: 'broker1',
        spec: {
          info: { title: 'Broker 1', version: '1.0.0' },
          channels: { 'test/1': { subscribe: {} } }
        }
      }
    ];

    const testEnv = await orchestrator.orchestrateServiceInteractions(services);
    
    expect(testEnv.services).toHaveLength(0);
    expect(testEnv.eventBroker).toBeDefined();
    await expect(testEnv.cleanup()).resolves.not.toThrow();
  });
});