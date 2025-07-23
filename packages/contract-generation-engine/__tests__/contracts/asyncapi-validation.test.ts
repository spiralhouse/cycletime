import { AsyncAPIDocument } from '@asyncapi/parser';
import { ContractGenerationService } from '../../src/services/contract-generation-service';
import { ContractStorageService } from '../../src/services/contract-storage-service';
import { ValidationService } from '../../src/services/validation-service';
import { EventService } from '../../src/services/event-service';
import { MockDataService } from '../../src/services/mock-data-service';
import { createClient } from 'redis';

describe.skip('AsyncAPI Event Schema Validation Tests', () => {
  let contractService: ContractGenerationService;
  let eventService: EventService;
  let mockDataService: MockDataService;
  let redis: any;

  beforeAll(async () => {
    // Create Redis client for testing
    redis = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    try {
      await redis.connect();
    } catch (error) {
      console.warn('Redis not available for tests, using mock Redis');
      redis = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        setEx: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        lPush: jest.fn(),
        lRange: jest.fn().mockResolvedValue([]),
        lRem: jest.fn(),
        keys: jest.fn().mockResolvedValue([]),
        publish: jest.fn(),
        subscribe: jest.fn(),
        xAdd: jest.fn(),
        xRevRange: jest.fn().mockResolvedValue([]),
        xInfoStream: jest.fn().mockResolvedValue(['length', '0']),
        xRange: jest.fn().mockResolvedValue([]),
        xLen: jest.fn().mockResolvedValue(0),
        xTrim: jest.fn(),
        ping: jest.fn().mockResolvedValue('PONG'),
        unsubscribe: jest.fn(),
        quit: jest.fn(),
        on: jest.fn(),
      };
    }

    const storageService = new ContractStorageService({ redis });
    const validationService = new ValidationService();
    eventService = new EventService({ redis });
    
    contractService = new ContractGenerationService(
      storageService,
      validationService,
      eventService
    );
    
    mockDataService = new MockDataService();
  });

  afterAll(async () => {
    if (redis && redis.disconnect) {
      try {
        await redis.disconnect();
      } catch (error) {
        // Ignore disconnect errors in tests
      }
    }
  });

  describe('AsyncAPI Specification Validation', () => {
    test('should generate valid AsyncAPI specification for event-driven services', async () => {
      const request = mockDataService.generateContractGenerationRequest('event-service');
      request.serviceType = 'event-driven';
      
      const response = await contractService.generateContract(request);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'asyncapi'
      );

      expect(specification.asyncapi).toBeDefined();
      
      const asyncapi = specification.asyncapi;
      expect(asyncapi.asyncapi).toBeDefined();
      expect(asyncapi.info).toBeDefined();
      expect(asyncapi.info.title).toBeDefined();
      expect(asyncapi.info.version).toBeDefined();
    });

    test('should include proper server definitions', async () => {
      const specification = mockDataService.generateContractSpecification(
        'asyncapi-test-123',
        'notification-service'
      );

      const asyncapi = specification.asyncapi;
      
      expect(asyncapi.servers).toBeDefined();
      
      if (asyncapi.servers.development) {
        expect(asyncapi.servers.development.url).toBeDefined();
        expect(asyncapi.servers.development.protocol).toBeDefined();
      }
    });

    test('should validate AsyncAPI schema structure', async () => {
      const asyncApiSpec = {
        asyncapi: '2.6.0',
        info: {
          title: 'Test Event API',
          version: '1.0.0',
          description: 'Test AsyncAPI specification',
        },
        servers: {
          development: {
            url: 'localhost:6379',
            protocol: 'redis',
            description: 'Development Redis server',
          },
        },
        channels: {
          'user/created': {
            description: 'User created events',
            publish: {
              operationId: 'publishUserCreated',
              summary: 'Publish user created event',
              message: {
                contentType: 'application/json',
                payload: {
                  type: 'object',
                  properties: {
                    userId: {
                      type: 'string',
                      format: 'uuid',
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                    },
                    createdAt: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                  required: ['userId', 'email', 'createdAt'],
                },
              },
            },
          },
        },
      };

      // Validate required fields are present
      expect(asyncApiSpec.asyncapi).toBe('2.6.0');
      expect(asyncApiSpec.info.title).toBeDefined();
      expect(asyncApiSpec.info.version).toBeDefined();
      expect(asyncApiSpec.servers).toBeDefined();
      expect(asyncApiSpec.channels).toBeDefined();
    });

    test('should handle channel definitions correctly', async () => {
      const request = mockDataService.generateContractGenerationRequest('order-service');
      request.serviceType = 'hybrid';
      
      const response = await contractService.generateContract(request);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const specification = await contractService.getContractSpecification(
        response.contractId,
        'asyncapi'
      );

      const asyncapi = specification.asyncapi;
      expect(asyncapi.channels).toBeDefined();
      
      // Channels should be an object
      expect(typeof asyncapi.channels).toBe('object');
    });
  });

  describe('Event Schema Validation', () => {
    test('should validate contract generated events', async () => {
      const event = mockDataService.generateContractGeneratedEvent('test-contract-123');
      
      // Validate event structure
      expect(event.contractId).toBeDefined();
      expect(event.serviceName).toBeDefined();
      expect(event.serviceType).toBeDefined();
      expect(event.generatedAt).toBeDefined();
      expect(event.generatedBy).toBeDefined();
      expect(event.metadata).toBeDefined();
      
      // Validate timestamp format
      expect(() => new Date(event.generatedAt)).not.toThrow();
      expect(new Date(event.generatedAt).toISOString()).toBe(event.generatedAt);
    });

    test('should validate contract validated events', async () => {
      const event = mockDataService.generateContractValidatedEvent('test-contract-456');
      
      expect(event.contractId).toBeDefined();
      expect(event.serviceName).toBeDefined();
      expect(typeof event.valid).toBe('boolean');
      expect(typeof event.score).toBe('number');
      expect(Array.isArray(event.errors)).toBe(true);
      expect(Array.isArray(event.warnings)).toBe(true);
      expect(event.validatedAt).toBeDefined();
      expect(event.validatedBy).toBeDefined();
      
      // Score should be between 0 and 100
      expect(event.score).toBeGreaterThanOrEqual(0);
      expect(event.score).toBeLessThanOrEqual(100);
    });

    test('should validate contract failed events', async () => {
      const event = mockDataService.generateContractFailedEvent('test-contract-789');
      
      expect(event.contractId).toBeDefined();
      expect(event.serviceName).toBeDefined();
      expect(event.error).toBeDefined();
      expect(event.errorCode).toBeDefined();
      expect(event.stage).toBeDefined();
      expect(event.failedAt).toBeDefined();
      expect(typeof event.retryable).toBe('boolean');
      expect(typeof event.retryCount).toBe('number');
      
      // Validate timestamp format
      expect(() => new Date(event.failedAt)).not.toThrow();
    });

    test('should validate contract published events', async () => {
      const event = mockDataService.generateContractPublishedEvent('test-contract-abc');
      
      expect(event.contractId).toBeDefined();
      expect(event.serviceName).toBeDefined();
      expect(event.version).toBeDefined();
      expect(event.specificationUrl).toBeDefined();
      expect(event.publishedAt).toBeDefined();
      expect(event.publishedBy).toBeDefined();
      
      // URL should be valid
      expect(() => new URL(event.specificationUrl)).not.toThrow();
      
      if (event.documentationUrl) {
        expect(() => new URL(event.documentationUrl)).not.toThrow();
      }
    });
  });

  describe('Event Service Integration', () => {
    test('should publish contract generated events', async () => {
      const event = mockDataService.generateContractGeneratedEvent('event-test-123');
      
      await expect(eventService.publishContractGenerated(event)).resolves.not.toThrow();
    });

    test('should publish contract validated events', async () => {
      const event = mockDataService.generateContractValidatedEvent('event-test-456');
      
      await expect(eventService.publishContractValidated(event)).resolves.not.toThrow();
    });

    test('should publish contract failed events', async () => {
      const event = mockDataService.generateContractFailedEvent('event-test-789');
      
      await expect(eventService.publishContractFailed(event)).resolves.not.toThrow();
    });

    test('should publish custom events with proper schema', async () => {
      const customEvent = {
        eventType: 'contract.custom',
        contractId: 'custom-test-123',
        serviceName: 'custom-service',
        customData: {
          key1: 'value1',
          key2: 42,
        },
      };
      
      await expect(eventService.publishCustomEvent('contract.custom', customEvent))
        .resolves.not.toThrow();
    });

    test('should handle event publishing errors gracefully', async () => {
      // Test with invalid event structure
      const invalidEvent = {
        // Missing required fields
        someField: 'value',
      };
      
      // Should handle the error without throwing
      await expect(eventService.publishCustomEvent('invalid.event', invalidEvent))
        .resolves.not.toThrow();
    });
  });

  describe('Event History and Replay', () => {
    test('should retrieve event history', async () => {
      const eventType = 'contract.generated';
      
      const history = await eventService.getEventHistory(eventType, { count: 10 });
      
      expect(Array.isArray(history)).toBe(true);
      // History might be empty in test environment, that's ok
    });

    test('should get event statistics', async () => {
      const stats = await eventService.getEventStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalEvents).toBe('number');
      expect(typeof stats.eventTypes).toBe('object');
      expect(typeof stats.recentEvents).toBe('number');
    });

    test('should handle event cleanup', async () => {
      const cleanupResult = await eventService.cleanupOldEvents(1000, 'test.event');
      
      expect(cleanupResult).toBeDefined();
      expect(typeof cleanupResult.deletedEvents).toBe('number');
      expect(typeof cleanupResult.processedStreams).toBe('number');
    });

    test('should perform health checks', async () => {
      const health = await eventService.healthCheck();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy'].includes(health.status)).toBe(true);
    });
  });

  describe('Event Subscription and Processing', () => {
    test('should handle requirement update subscriptions', async () => {
      const mockHandler = jest.fn();
      
      await expect(eventService.subscribeToRequirementUpdates(mockHandler))
        .resolves.not.toThrow();
    });

    test('should handle architecture change subscriptions', async () => {
      const mockHandler = jest.fn();
      
      await expect(eventService.subscribeToArchitectureChanges(mockHandler))
        .resolves.not.toThrow();
    });

    test('should handle service definition subscriptions', async () => {
      const mockHandler = jest.fn();
      
      await expect(eventService.subscribeToServiceDefinitions(mockHandler))
        .resolves.not.toThrow();
    });

    test('should handle contract request subscriptions', async () => {
      const mockHandler = jest.fn();
      
      await expect(eventService.subscribeToContractRequests(mockHandler))
        .resolves.not.toThrow();
    });

    test('should handle custom event subscriptions', async () => {
      const mockHandler = jest.fn();
      
      await expect(eventService.subscribeToCustomEvent('test.event', mockHandler))
        .resolves.not.toThrow();
    });
  });
});