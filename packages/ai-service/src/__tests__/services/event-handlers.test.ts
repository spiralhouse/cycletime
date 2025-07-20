import { EventHandlers } from '../../services/event-handlers';
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

describe('EventHandlers', () => {
  let eventHandlers: EventHandlers;

  beforeEach(() => {
    eventHandlers = new EventHandlers();
  });

  const createMockEvent = (eventType: string, additionalProps: any = {}): AIEvent => ({
    eventId: 'test-event-123',
    eventType,
    timestamp: new Date().toISOString(),
    source: 'test-service',
    version: '1.0.0',
    correlationId: 'test-correlation-456',
    ...additionalProps,
  });

  describe('Project Management Event Handlers', () => {
    describe('handleProjectCreated', () => {
      it('should handle project created event successfully', async () => {
        const event = createMockEvent('project.created', {
          projectId: 'project-123',
        });

        await expect(eventHandlers.handleProjectCreated(event)).resolves.not.toThrow();
      });

      it('should handle project created event with mock setup logic', async () => {
        const event = createMockEvent('project.created', {
          projectId: 'project-456',
        });

        const startTime = Date.now();
        await eventHandlers.handleProjectCreated(event);
        const endTime = Date.now();

        // Verify it took some time (mock delay)
        expect(endTime - startTime).toBeGreaterThan(100); // At least 100ms
        expect(endTime - startTime).toBeLessThan(500); // But not too long
      });
    });

    describe('handleProjectUpdated', () => {
      it('should handle project updated event successfully', async () => {
        const event = createMockEvent('project.updated', {
          projectId: 'project-789',
          updateType: 'metadata',
        });

        await expect(eventHandlers.handleProjectUpdated(event)).resolves.not.toThrow();
      });

      it('should handle project updated event without updateType', async () => {
        const event = createMockEvent('project.updated', {
          projectId: 'project-999',
        });

        await expect(eventHandlers.handleProjectUpdated(event)).resolves.not.toThrow();
      });
    });

    describe('handleProjectDeleted', () => {
      it('should handle project deleted event successfully', async () => {
        const event = createMockEvent('project.deleted', {
          projectId: 'project-deleted-123',
        });

        await expect(eventHandlers.handleProjectDeleted(event)).resolves.not.toThrow();
      });

      it('should simulate cleanup operations', async () => {
        const event = createMockEvent('project.deleted', {
          projectId: 'project-cleanup-456',
        });

        const startTime = Date.now();
        await eventHandlers.handleProjectDeleted(event);
        const endTime = Date.now();

        // Verify it took cleanup time (200-500ms)
        expect(endTime - startTime).toBeGreaterThan(200);
        expect(endTime - startTime).toBeLessThan(700);
      });
    });
  });

  describe('Context Management Event Handlers', () => {
    describe('handleContextUpdated', () => {
      it('should handle context updated event successfully', async () => {
        const event = createMockEvent('context.updated', {
          contextId: 'context-123',
          updateType: 'optimization',
        });

        await expect(eventHandlers.handleContextUpdated(event)).resolves.not.toThrow();
      });

      it('should simulate context refresh logic', async () => {
        const event = createMockEvent('context.updated', {
          contextId: 'context-refresh-456',
        });

        const startTime = Date.now();
        await eventHandlers.handleContextUpdated(event);
        const endTime = Date.now();

        // Verify it took refresh time (150-400ms)
        expect(endTime - startTime).toBeGreaterThan(150);
        expect(endTime - startTime).toBeLessThan(500);
      });
    });

    describe('handleContextAnalysisRequested', () => {
      it('should handle context analysis requested event successfully', async () => {
        const event = createMockEvent('context.analysis.requested', {
          contextId: 'context-analysis-123',
          analysisType: 'full',
          priority: 'high',
        });

        await expect(eventHandlers.handleContextAnalysisRequested(event)).resolves.not.toThrow();
      });

      it('should handle context analysis requested event with defaults', async () => {
        const event = createMockEvent('context.analysis.requested', {
          contextId: 'context-analysis-456',
        });

        await expect(eventHandlers.handleContextAnalysisRequested(event)).resolves.not.toThrow();
      });
    });
  });

  describe('System Event Handlers', () => {
    describe('handleSystemConfigUpdated', () => {
      it('should handle system config updated event successfully', async () => {
        const event = createMockEvent('system.config.updated', {
          configType: 'providers',
        });

        await expect(eventHandlers.handleSystemConfigUpdated(event)).resolves.not.toThrow();
      });

      it('should handle different config types', async () => {
        const configTypes = ['providers', 'rate_limits', 'models', 'features'];
        
        for (const configType of configTypes) {
          const event = createMockEvent('system.config.updated', { configType });
          await expect(eventHandlers.handleSystemConfigUpdated(event)).resolves.not.toThrow();
        }
      });

      it('should simulate config reload logic', async () => {
        const event = createMockEvent('system.config.updated', {
          configType: 'models',
        });

        const startTime = Date.now();
        await eventHandlers.handleSystemConfigUpdated(event);
        const endTime = Date.now();

        // Verify it took reload time (100-300ms)
        expect(endTime - startTime).toBeGreaterThan(100);
        expect(endTime - startTime).toBeLessThan(400);
      });
    });
  });

  describe('Handler Registration and Routing', () => {
    describe('getHandlerMap', () => {
      it('should return all expected event handlers', () => {
        const handlerMap = eventHandlers.getHandlerMap();
        
        const expectedHandlers = [
          'project.created',
          'project.updated',
          'project.deleted',
          'context.updated',
          'context.analysis.requested',
          'system.config.updated',
        ];

        expectedHandlers.forEach(eventType => {
          expect(handlerMap[eventType]).toBeDefined();
          expect(typeof handlerMap[eventType]).toBe('function');
        });

        expect(Object.keys(handlerMap)).toHaveLength(expectedHandlers.length);
      });
    });

    describe('handleEvent', () => {
      it('should route events to correct handlers', async () => {
        const testCases = [
          { eventType: 'project.created', projectId: 'test-123' },
          { eventType: 'project.updated', projectId: 'test-456', updateType: 'config' },
          { eventType: 'project.deleted', projectId: 'test-789' },
          { eventType: 'context.updated', contextId: 'ctx-123' },
          { eventType: 'context.analysis.requested', contextId: 'ctx-456' },
          { eventType: 'system.config.updated', configType: 'providers' },
        ];

        for (const testCase of testCases) {
          const { eventType, ...eventProps } = testCase;
          const event = createMockEvent(eventType, eventProps);
          
          await expect(eventHandlers.handleEvent(eventType, event)).resolves.not.toThrow();
        }
      });

      it('should handle unknown event types gracefully', async () => {
        const event = createMockEvent('unknown.event.type');
        
        await expect(eventHandlers.handleEvent('unknown.event.type', event)).resolves.not.toThrow();
      });

      it('should propagate handler errors', async () => {
        // Mock a handler to throw an error
        const originalHandler = eventHandlers.handleProjectCreated;
        eventHandlers.handleProjectCreated = jest.fn().mockRejectedValue(new Error('Handler failed'));

        const event = createMockEvent('project.created', { projectId: 'error-test' });
        
        await expect(eventHandlers.handleEvent('project.created', event)).rejects.toThrow('Handler failed');

        // Restore original handler
        eventHandlers.handleProjectCreated = originalHandler;
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      // Create a mock event that might cause issues
      const event = createMockEvent('project.created', {
        projectId: null, // This might cause issues in a real handler
      });

      // The handlers should be robust enough to handle this
      await expect(eventHandlers.handleProjectCreated(event)).resolves.not.toThrow();
    });

    it('should handle events with missing properties', async () => {
      const minimalEvent = createMockEvent('context.updated');
      
      await expect(eventHandlers.handleContextUpdated(minimalEvent)).resolves.not.toThrow();
    });
  });
});