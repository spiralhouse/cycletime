import { EventService } from '../../services/event-service';

// Mock logger to avoid console output during tests
jest.mock('@cycletime/shared-utils', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('EventService - New Event Publishers', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService();
  });

  afterEach(() => {
    eventService.clearEvents();
  });

  describe('publishProviderConnectionLost', () => {
    it('should publish provider connection lost event with default values', async () => {
      const providerId = 'openai';
      const connectionInfo = {};
      const metadata = { userId: 'test-user' };

      await eventService.publishProviderConnectionLost(providerId, connectionInfo, metadata);

      const events = eventService.getEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('ai.provider.connection.lost');
      expect(event.provider).toBe(providerId);
      expect(event.error.type).toBe('network_error');
      expect(event.error.code).toBe('CONNECTION_LOST');
      expect(event.impact.estimatedDowntime).toBe(300000);
      expect(event.recovery.automaticFailover).toBe(true);
    });

    it('should publish provider connection lost event with custom values', async () => {
      const providerId = 'anthropic';
      const connectionInfo = {
        lastSuccessfulConnection: '2023-01-01T00:00:00Z',
        error: {
          type: 'timeout',
          message: 'Request timeout',
          code: 'TIMEOUT',
          details: 'Connection timed out after 30 seconds',
        },
        impact: {
          affectedModels: ['claude-2', 'claude-instant'],
          queuedRequests: 5,
          fallbackProvider: 'openai',
          estimatedDowntime: 600000,
        },
        recovery: {
          retryAttempts: 3,
          nextRetry: '2023-01-01T00:05:00Z',
          automaticFailover: false,
        },
      };
      const metadata = { sessionId: 'test-session' };

      await eventService.publishProviderConnectionLost(providerId, connectionInfo, metadata);

      const events = eventService.getEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('ai.provider.connection.lost');
      expect(event.provider).toBe(providerId);
      expect(event.lastSuccessfulConnection).toBe('2023-01-01T00:00:00Z');
      expect(event.error.type).toBe('timeout');
      expect(event.error.message).toBe('Request timeout');
      expect(event.impact.affectedModels).toEqual(['claude-2', 'claude-instant']);
      expect(event.impact.queuedRequests).toBe(5);
      expect(event.recovery.retryAttempts).toBe(3);
      expect(event.recovery.automaticFailover).toBe(false);
    });
  });

  describe('publishProviderConnectionRestored', () => {
    it('should publish provider connection restored event with default values', async () => {
      const providerId = 'google';
      const restorationInfo = {};
      const metadata = { requestId: 'test-request' };

      await eventService.publishProviderConnectionRestored(providerId, restorationInfo, metadata);

      const events = eventService.getEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('ai.provider.connection.restored');
      expect(event.provider).toBe(providerId);
      expect(event.downtimeDuration).toBe(30000);
      expect(event.restorationMethod).toBe('automatic_retry');
      expect(event.healthCheck.availability).toBe(1.0);
      expect(event.healthCheck.testRequestSuccessful).toBe(true);
      expect(event.impact.serviceFullyRestored).toBe(true);
    });

    it('should publish provider connection restored event with custom values', async () => {
      const providerId = 'azure';
      const restorationInfo = {
        downtimeDuration: 120000,
        connectionLost: '2023-01-01T00:00:00Z',
        restorationMethod: 'manual_intervention',
        healthCheck: {
          responseTime: 750,
          availability: 0.95,
          modelsVerified: ['gpt-4', 'gpt-3.5-turbo'],
          testRequestSuccessful: false,
        },
        impact: {
          queuedRequestsResumed: 10,
          fallbackProviderDisabled: true,
          serviceFullyRestored: false,
        },
      };
      const metadata = { operatorId: 'admin-user' };

      await eventService.publishProviderConnectionRestored(providerId, restorationInfo, metadata);

      const events = eventService.getEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('ai.provider.connection.restored');
      expect(event.provider).toBe(providerId);
      expect(event.downtimeDuration).toBe(120000);
      expect(event.connectionLost).toBe('2023-01-01T00:00:00Z');
      expect(event.restorationMethod).toBe('manual_intervention');
      expect(event.healthCheck.responseTime).toBe(750);
      expect(event.healthCheck.availability).toBe(0.95);
      expect(event.healthCheck.modelsVerified).toEqual(['gpt-4', 'gpt-3.5-turbo']);
      expect(event.impact.queuedRequestsResumed).toBe(10);
      expect(event.impact.serviceFullyRestored).toBe(false);
    });
  });

  describe('publishUsageThresholdReached', () => {
    it('should publish usage threshold reached event with default values', async () => {
      const thresholdInfo = {};
      const metadata = { alertType: 'warning' };

      await eventService.publishUsageThresholdReached(thresholdInfo, metadata);

      const events = eventService.getEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('ai.usage.threshold.reached');
      expect(event.thresholdType).toBe('tokens_per_hour');
      expect(event.current).toBe(0);
      expect(event.threshold).toBe(100000);
      expect(event.percentage).toBe(0);
      expect(event.actions.alertSent).toBe(true);
      expect(event.actions.rateLimitApplied).toBe(false);
      expect(event.forecast.timeToLimit).toBe(1800000);
      expect(event.forecast.recommendedAction).toBe('monitor');
    });

    it('should publish usage threshold reached event with custom values', async () => {
      const thresholdInfo = {
        thresholdType: 'cost_per_day',
        current: 75.50,
        threshold: 100.00,
        percentage: 75.5,
        windowStart: '2023-01-01T00:00:00Z',
        windowEnd: '2023-01-01T23:59:59Z',
        provider: 'openai',
        model: 'gpt-4',
        userId: 'user-123',
        projectId: 'project-456',
        actions: {
          alertSent: true,
          rateLimitApplied: true,
          requestsQueued: 15,
          fallbackProviderActivated: true,
        },
        forecast: {
          timeToLimit: 3600000,
          recommendedAction: 'reduce_usage',
          projectedUsage: 95.0,
        },
      };
      const metadata = { severity: 'high' };

      await eventService.publishUsageThresholdReached(thresholdInfo, metadata);

      const events = eventService.getEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.eventType).toBe('ai.usage.threshold.reached');
      expect(event.thresholdType).toBe('cost_per_day');
      expect(event.current).toBe(75.50);
      expect(event.threshold).toBe(100.00);
      expect(event.percentage).toBe(75.5);
      expect(event.provider).toBe('openai');
      expect(event.model).toBe('gpt-4');
      expect(event.userId).toBe('user-123');
      expect(event.projectId).toBe('project-456');
      expect(event.actions.rateLimitApplied).toBe(true);
      expect(event.actions.requestsQueued).toBe(15);
      expect(event.actions.fallbackProviderActivated).toBe(true);
      expect(event.forecast.timeToLimit).toBe(3600000);
      expect(event.forecast.recommendedAction).toBe('reduce_usage');
      expect(event.forecast.projectedUsage).toBe(95.0);
    });

    it('should calculate percentage correctly when current and threshold provided', async () => {
      const thresholdInfo = {
        current: 850,
        threshold: 1000,
      };
      const metadata = {};

      await eventService.publishUsageThresholdReached(thresholdInfo, metadata);

      const events = eventService.getEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.percentage).toBe(85);
    });
  });

  describe('event metadata and correlation', () => {
    it('should include correlation IDs in all new event types', async () => {
      const correlationId = 'test-correlation-123';
      const metadata = { correlationId };

      // Test all three new event publishers
      await eventService.publishProviderConnectionLost('openai', {}, metadata);
      await eventService.publishProviderConnectionRestored('openai', {}, metadata);
      await eventService.publishUsageThresholdReached({}, metadata);

      const events = eventService.getEvents();
      expect(events).toHaveLength(3);

      events.forEach(event => {
        expect(event.correlationId).toBe(correlationId);
        expect(event.source).toBe('ai-service');
        expect(event.version).toBe('1.0.0');
        expect(event.eventId).toBeDefined();
        expect(event.timestamp).toBeDefined();
      });
    });

    it('should generate unique event IDs for each event', async () => {
      const metadata = {};

      await eventService.publishProviderConnectionLost('openai', {}, metadata);
      await eventService.publishProviderConnectionRestored('openai', {}, metadata);
      await eventService.publishUsageThresholdReached({}, metadata);

      const events = eventService.getEvents();
      const eventIds = events.map(e => e.eventId);
      
      expect(new Set(eventIds).size).toBe(3); // All unique
    });
  });
});