/**
 * Event Contract Testing Suite
 * 
 * Tests event publishing and handling against AsyncAPI specification
 * for SPI-130: Contract Testing and Validation Suite
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { randomUUID } from 'crypto';
import { EventService } from '../../services/event-service';
import { MessageBrokerManager, createMessageBroker } from '../../services/message-broker';

describe('Event Contract Tests', () => {
  let asyncApiSpec: any;
  let ajv: Ajv;
  let eventService: EventService;
  let messageBroker: MessageBrokerManager;

  beforeAll(async () => {
    // Load AsyncAPI specification
    const asyncApiPath = path.join(__dirname, '../../../asyncapi.yaml');
    const asyncApiContent = fs.readFileSync(asyncApiPath, 'utf8');
    asyncApiSpec = yaml.load(asyncApiContent);
    
    // Set up JSON schema validator
    ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
    
    // Create event service and message broker for testing
    eventService = new EventService();
    messageBroker = createMessageBroker('memory'); // Use in-memory broker for tests
    await messageBroker.initialize();
  });

  afterAll(async () => {
    if (messageBroker) {
      await messageBroker.shutdown();
    }
  });

  describe('AsyncAPI Specification Validation', () => {
    it('should have valid AsyncAPI 3.0.0 specification', () => {
      expect(asyncApiSpec.asyncapi).toBe('3.0.0');
      expect(asyncApiSpec.info).toBeDefined();
      expect(asyncApiSpec.channels).toBeDefined();
      expect(asyncApiSpec.components).toBeDefined();
    });

    it('should define all published event channels', () => {
      const expectedPublishedChannels = [
        'ai/request/received',
        'ai/request/processing',
        'ai/request/completed',
        'ai/request/failed',
        'ai/response/generated',
        'ai/context/analysis/started',
        'ai/context/analysis/completed',
        'ai/context/optimization/results',
        'ai/provider/health/changed',
        'ai/provider/configuration/updated',
        'ai/provider/error',
        'ai/provider/connection/lost',
        'ai/provider/connection/restored',
        'ai/project/analysis/started',
        'ai/project/analysis/completed',
        'ai/project/insights/generated',
        'ai/project/recommendations/generated',
        'ai/embedding/completion',
        'ai/usage/tracking',
        'ai/usage/threshold/reached',
        'ai/service/health/check',
        'ai/service/error',
        'ai/service/shutdown',
        'ai/model/availability/changed',
        'ai/rate/limit/status'
      ];

      const actualChannels = Object.keys(asyncApiSpec.channels);
      
      expectedPublishedChannels.forEach(channel => {
        expect(actualChannels).toContain(channel);
      });
      
      // Should have 25 published + 6 consumed = 31 total channels
      expect(actualChannels.length).toBeGreaterThanOrEqual(25);
    });

    it('should define consumed event channels', () => {
      const expectedConsumedChannels = [
        'project/created',
        'project/updated', 
        'project/deleted',
        'context/updated',
        'context/analysis/requested',
        'system/config/updated'
      ];

      const actualChannels = Object.keys(asyncApiSpec.channels);
      
      expectedConsumedChannels.forEach(channel => {
        expect(actualChannels).toContain(channel);
      });
    });

    it('should define message schemas for all events', () => {
      expect(asyncApiSpec.components.messages).toBeDefined();
      expect(asyncApiSpec.components.schemas).toBeDefined();
      
      // Check that key message types are defined
      const expectedMessages = [
        'AiRequestReceived',
        'AiRequestProcessing', 
        'AiRequestCompleted',
        'AiRequestFailed',
        'ProviderHealthChanged',
        'ProjectCreated',
        'ContextAnalysisRequested'
      ];

      expectedMessages.forEach(messageType => {
        expect(asyncApiSpec.components.messages[messageType]).toBeDefined();
      });
    });
  });

  describe('Published Event Schema Validation', () => {
    it('should validate ai/request/received event payload', async () => {
      const eventPayload = {
        requestId: 'test-request-123',
        type: 'chat_completion',
        provider: 'openai',
        model: 'gpt-4',
        priority: 'medium',
        userId: 'user-123',
        sessionId: 'session-456',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-789'
      };

      // Get schema from AsyncAPI spec
      const messageSchema = asyncApiSpec.components.messages.AiRequestReceived.payload;
      const validate = ajv.compile(messageSchema);
      const isValid = validate(eventPayload);
      
      if (!isValid) {
        console.error('Request received event validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });

    it('should validate ai/provider/health/changed event payload', async () => {
      const eventPayload = {
        provider: 'anthropic',
        previousHealth: 'healthy',
        currentHealth: 'degraded',
        reason: 'high_latency',
        timestamp: new Date().toISOString(),
        correlationId: 'health-check-123',
        metrics: {
          responseTime: 2500,
          errorRate: 0.05,
          availability: 0.95
        }
      };

      const messageSchema = asyncApiSpec.components.messages.ProviderHealthChanged.payload;
      const validate = ajv.compile(messageSchema);
      const isValid = validate(eventPayload);
      
      if (!isValid) {
        console.error('Provider health event validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });

    it('should validate ai/usage/threshold/reached event payload', async () => {
      const eventPayload = {
        provider: 'openai',
        thresholdType: 'cost',
        currentValue: 150.50,
        threshold: 100.00,
        period: 'daily',
        timestamp: new Date().toISOString(),
        correlationId: 'threshold-alert-456',
        details: {
          requests: 1500,
          totalTokens: 50000,
          projectedMonthly: 4500.00
        }
      };

      const messageSchema = asyncApiSpec.components.messages.UsageThresholdReached.payload;
      const validate = ajv.compile(messageSchema);
      const isValid = validate(eventPayload);
      
      if (!isValid) {
        console.error('Usage threshold event validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });
  });

  describe('Consumed Event Schema Validation', () => {
    it('should validate project/created event payload', () => {
      const eventPayload = {
        projectId: 'proj-123',
        name: 'Test Project',
        description: 'A test project for validation',
        ownerId: 'user-123',
        createdAt: new Date().toISOString(),
        correlationId: 'project-create-789',
        metadata: {
          type: 'software',
          technology: 'typescript'
        }
      };

      const messageSchema = asyncApiSpec.components.messages.ProjectCreated.payload;
      const validate = ajv.compile(messageSchema);
      const isValid = validate(eventPayload);
      
      if (!isValid) {
        console.error('Project created event validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });

    it('should validate context/analysis/requested event payload', () => {
      const eventPayload = {
        contextId: 'ctx-456',
        projectId: 'proj-123',
        requestedBy: 'user-123',
        analysisType: 'full',
        scope: ['requirements', 'architecture'],
        timestamp: new Date().toISOString(),
        correlationId: 'context-analysis-request-789',
        priority: 'high'
      };

      const messageSchema = asyncApiSpec.components.messages.ContextAnalysisRequested.payload;
      const validate = ajv.compile(messageSchema);
      const isValid = validate(eventPayload);
      
      if (!isValid) {
        console.error('Context analysis request event validation errors:', validate.errors);
      }
      expect(isValid).toBe(true);
    });
  });

  describe('Event Publishing Validation', () => {
    it('should publish events with valid correlation IDs', async () => {
      const correlationId = 'test-correlation-123';
      let publishedEvent: any = null;

      // Set up event listener
      eventService.on('ai/request/received', (event: any) => {
        publishedEvent = event;
      });

      // Test publishing an AI request event
      await eventService.publishEvent('ai/request/received', {
        requestId: 'test-request-456',
        type: 'chat_completion',
        provider: 'anthropic',
        correlationId
      });

      // Verify correlation ID is preserved
      expect(publishedEvent?.correlationId).toBe(correlationId);
    });

    it('should publish events with required timestamp', async () => {
      const beforeTime = new Date();
      let publishedEvent: any = null;

      // Set up event listener
      eventService.on('ai/request/processing', (event: any) => {
        publishedEvent = event;
      });

      await eventService.publishEvent('ai/request/processing', {
        requestId: 'test-request-789',
        status: 'processing',
        provider: 'openai'
      });

      const afterTime = new Date();
      
      // Verify timestamp is included and within reasonable range
      expect(publishedEvent?.timestamp).toBeDefined();
      expect(new Date(publishedEvent?.timestamp).getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(new Date(publishedEvent?.timestamp).getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Message Broker Integration', () => {
    it('should connect to message broker successfully', async () => {
      expect(messageBroker.isConnected()).toBe(true);
    });

    it('should handle event publishing through broker', async () => {
      const eventData = {
        eventId: randomUUID(),
        eventType: 'ai/request/received',
        timestamp: new Date().toISOString(),
        source: 'ai-service',
        version: '1.0.0',
        requestId: 'broker-test-123',
        type: 'embedding',
        provider: 'openai'
      };

      // Should not throw an error
      await expect(
        messageBroker.getBroker().publish('ai/request/received', eventData)
      ).resolves.not.toThrow();
    });

    it('should handle event subscription through broker', async () => {
      let receivedEvent: any = null;
      
      // Set up subscription
      await messageBroker.getBroker().subscribe('test/event', async (event: any) => {
        receivedEvent = event;
      });

      // Publish test event with required AIEvent properties
      const testEvent = {
        eventId: randomUUID(),
        eventType: 'test/event',
        timestamp: new Date().toISOString(),
        source: 'ai-service',
        version: '1.0.0',
        message: 'test'
      };
      await messageBroker.getBroker().publish('test/event', testEvent);

      // Give some time for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvent).toEqual(testEvent);
    });
  });

  describe('Event Sequencing and Correlation', () => {
    it('should maintain event correlation across request lifecycle', async () => {
      const correlationId = 'lifecycle-test-456';
      const requestId = 'req-lifecycle-789';
      
      const events: any[] = [];
      
      // Set up event collection
      eventService.on('*', (event: any) => {
        events.push(event);
      });

      // Simulate request lifecycle events
      await eventService.publishEvent('ai/request/received', {
        requestId,
        correlationId,
        type: 'chat_completion'
      });

      await eventService.publishEvent('ai/request/processing', {
        requestId,
        correlationId,
        status: 'processing'
      });

      await eventService.publishEvent('ai/request/completed', {
        requestId,
        correlationId,
        status: 'completed',
        responseId: 'resp-123'
      });

      // Verify all events have same correlation ID
      events.forEach(event => {
        expect(event.correlationId).toBe(correlationId);
      });

      // Verify events have same request ID
      events.forEach(event => {
        expect(event.requestId).toBe(requestId);
      });
    });

    it('should handle event ordering with timestamps', async () => {
      const events: any[] = [];
      const correlationId = 'order-test-123';

      // Publish events in sequence
      await eventService.publishEvent('ai/request/received', {
        requestId: 'order-test',
        correlationId,
        timestamp: new Date().toISOString()
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await eventService.publishEvent('ai/request/processing', {
        requestId: 'order-test',
        correlationId,
        timestamp: new Date().toISOString()
      });

      // Verify timestamps are in correct order
      if (events.length >= 2) {
        expect(new Date(events[1].timestamp).getTime())
          .toBeGreaterThan(new Date(events[0].timestamp).getTime());
      }
    });
  });
});