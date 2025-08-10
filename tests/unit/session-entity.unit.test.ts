import { describe, it, expect, beforeEach } from 'vitest';

import { Session } from '../../src/domain/entities/session.js';
import { InvalidSessionDataError } from '../../src/domain/errors/session-errors.js';
import { MockTimeProvider } from '../fixtures/mock-time-provider.js';

import type { SessionContext } from '../../src/domain/entities/session.js';

describe('Session Entity Unit Tests', () => {
  let mockTimeProvider: MockTimeProvider;

  beforeEach(() => {
    mockTimeProvider = new MockTimeProvider();
    mockTimeProvider.setTime('2024-01-01T12:00:00Z');
  });

  describe('Session Creation', () => {
    it('should create session with provided time provider', () => {
      const session = Session.create('test-project', {}, mockTimeProvider);

      expect(session.projectId).toBe('test-project');
      expect(session.createdAt).toEqual(mockTimeProvider.now());
      expect(session.lastActivity).toEqual(mockTimeProvider.now());
      expect(session.updatedAt).toEqual(mockTimeProvider.now());
    });

    it('should create session with empty context by default', () => {
      const session = Session.create('test-project', undefined, mockTimeProvider);

      expect(session.currentContext).toEqual({});
    });

    it('should create session with initial context', () => {
      const initialContext: SessionContext = {
        activeIssues: ['ISSUE-1'],
        workflowStage: 'planning'
      };

      const session = Session.create('test-project', initialContext, mockTimeProvider);

      expect(session.currentContext).toEqual(initialContext);
    });

    it('should generate unique session keys', () => {
      const session1 = Session.create('test-project', {}, mockTimeProvider);
      const session2 = Session.create('test-project', {}, mockTimeProvider);

      expect(session1.sessionKey.value).not.toBe(session2.sessionKey.value);
    });
  });

  describe('Session Context Management', () => {
    let session: Session;

    beforeEach(() => {
      session = Session.create('test-project', {
        activeIssues: ['ISSUE-1'],
        workflowStage: 'planning'
      }, mockTimeProvider);
    });

    it('should update context and touch activity', () => {
      const originalActivity = session.lastActivity;
      
      // Advance time before update
      mockTimeProvider.advance(1000);

      session.updateContext({
        workflowStage: 'development',
        lastAction: 'started coding'
      });

      expect(session.currentContext.workflowStage).toBe('development');
      expect(session.currentContext.lastAction).toBe('started coding');
      expect(session.currentContext.activeIssues).toEqual(['ISSUE-1']); // Should preserve
      expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
    });

    it('should add active issue without duplicates', () => {
      session.addActiveIssue('ISSUE-2');

      expect(session.currentContext.activeIssues).toEqual(['ISSUE-1', 'ISSUE-2']);

      // Adding same issue again should not duplicate
      session.addActiveIssue('ISSUE-1');

      expect(session.currentContext.activeIssues).toEqual(['ISSUE-1', 'ISSUE-2']);
    });

    it('should remove active issue', () => {
      session.addActiveIssue('ISSUE-2');
      session.removeActiveIssue('ISSUE-1');

      expect(session.currentContext.activeIssues).toEqual(['ISSUE-2']);
    });

    it('should handle removing non-existent issue', () => {
      session.removeActiveIssue('NON-EXISTENT');

      expect(session.currentContext.activeIssues).toEqual(['ISSUE-1']);
    });
  });

  describe('Session Touch Operation', () => {
    it('should update lastActivity and updatedAt timestamps', () => {
      const session = Session.create('test-project', {}, mockTimeProvider);
      const originalActivity = session.lastActivity;
      const originalUpdated = session.updatedAt;

      // Advance time
      mockTimeProvider.advance(5000);

      session.touch();

      expect(session.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
      expect(session.updatedAt.getTime()).toBeGreaterThan(originalUpdated.getTime());
      expect(session.lastActivity).toEqual(mockTimeProvider.now());
      expect(session.updatedAt).toEqual(mockTimeProvider.now());
    });
  });

  describe('Session Expiration Check', () => {
    it('should correctly identify expired sessions', () => {
      const session = Session.create('test-project', {}, mockTimeProvider);
      const maxAge = 1000; // 1 second

      // Session should not be expired initially
      expect(session.isExpired(maxAge)).toBe(false);

      // Advance system time (simulating real-world time passage)
      const realNow = Date.now;
      const futureTime = mockTimeProvider.now().getTime() + maxAge + 1;
      Date.now = () => futureTime;

      try {
        expect(session.isExpired(maxAge)).toBe(true);
      } finally {
        // Restore Date.now
        Date.now = realNow;
      }
    });

    it('should not expire recent sessions', () => {
      const session = Session.create('test-project', {}, mockTimeProvider);
      const maxAge = 10000; // 10 seconds

      // Advance system time but not beyond maxAge
      const realNow = Date.now;
      const nearFutureTime = mockTimeProvider.now().getTime() + maxAge - 1000;
      Date.now = () => nearFutureTime;

      try {
        expect(session.isExpired(maxAge)).toBe(false);
      } finally {
        Date.now = realNow;
      }
    });
  });

  describe('Session Data Validation', () => {
    it('should validate activeIssues as array of strings', () => {
      expect(() => {
        Session.create('test-project', {
          activeIssues: 'invalid' as any
        }, mockTimeProvider);
      }).toThrow(InvalidSessionDataError);

      expect(() => {
        Session.create('test-project', {
          activeIssues: [123, 'valid'] as any
        }, mockTimeProvider);
      }).toThrow(InvalidSessionDataError);
    });

    it('should validate workflowStage as string', () => {
      expect(() => {
        Session.create('test-project', {
          workflowStage: 123 as any
        }, mockTimeProvider);
      }).toThrow(InvalidSessionDataError);
    });

    it('should validate lastAction as string', () => {
      expect(() => {
        Session.create('test-project', {
          lastAction: ['array'] as any
        }, mockTimeProvider);
      }).toThrow(InvalidSessionDataError);
    });

    it('should validate contextData as object', () => {
      expect(() => {
        Session.create('test-project', {
          contextData: 'not-object' as any
        }, mockTimeProvider);
      }).toThrow(InvalidSessionDataError);

      expect(() => {
        Session.create('test-project', {
          contextData: ['array'] as any
        }, mockTimeProvider);
      }).toThrow(InvalidSessionDataError);
    });

    it('should accept valid context data', () => {
      const validContext: SessionContext = {
        activeIssues: ['ISSUE-1', 'ISSUE-2'],
        workflowStage: 'development',
        lastAction: 'completed task',
        contextData: {
          customField: 'value',
          numericField: 42,
          nested: { data: true }
        }
      };

      const session = Session.create('test-project', validContext, mockTimeProvider);

      expect(session.currentContext).toEqual(validContext);
    });
  });

  describe('Session Serialization', () => {
    it('should convert to plain object for storage', () => {
      const initialContext: SessionContext = {
        activeIssues: ['ISSUE-1'],
        workflowStage: 'planning'
      };

      const session = Session.create('test-project', initialContext, mockTimeProvider);
      const plainObject = session.toPlainObject();

      expect(plainObject).toEqual({
        sessionKey: session.sessionKey.value,
        projectId: 'test-project',
        currentContext: initialContext,
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now()
      });
    });

    it('should recreate from plain object with time provider', () => {
      const originalSession = Session.create('test-project', {
        activeIssues: ['ISSUE-1'],
        workflowStage: 'planning'
      }, mockTimeProvider);

      const plainObject = originalSession.toPlainObject();
      const recreatedSession = Session.fromPlainObject(plainObject, mockTimeProvider);

      expect(recreatedSession.sessionKey.value).toBe(originalSession.sessionKey.value);
      expect(recreatedSession.projectId).toBe(originalSession.projectId);
      expect(recreatedSession.currentContext).toEqual(originalSession.currentContext);
      expect(recreatedSession.lastActivity).toEqual(originalSession.lastActivity);
    });

    it('should handle timestamp conversion in fromPlainObject', () => {
      const plainObject = {
        sessionKey: 'test-key',
        projectId: 'test-project',
        currentContext: { workflowStage: 'development' },
        lastActivity: '2024-01-01T12:00:00Z', // String timestamp
        createdAt: 1704110400000, // Number timestamp
        updatedAt: new Date('2024-01-01T12:00:00Z') // Date timestamp
      };

      const session = Session.fromPlainObject(plainObject, mockTimeProvider);

      expect(session.lastActivity).toBeInstanceOf(Date);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Immutability and Defensive Copying', () => {
    it('should return defensive copies of context', () => {
      const session = Session.create('test-project', {
        activeIssues: ['ISSUE-1']
      }, mockTimeProvider);

      const context1 = session.currentContext;
      const context2 = session.currentContext;

      expect(context1).not.toBe(context2); // Different object references
      expect(context1).toEqual(context2); // Same values
    });

    it('should return defensive copies of timestamps', () => {
      const session = Session.create('test-project', {}, mockTimeProvider);

      const activity1 = session.lastActivity;
      const activity2 = session.lastActivity;

      expect(activity1).not.toBe(activity2); // Different object references
      expect(activity1.getTime()).toBe(activity2.getTime()); // Same timestamp
    });

    it('should not allow external mutation of context arrays', () => {
      const session = Session.create('test-project', {
        activeIssues: ['ISSUE-1']
      }, mockTimeProvider);

      const context = session.currentContext;
      if (context.activeIssues) {
        context.activeIssues.push('ISSUE-2');
      }

      // Original session should be unchanged
      expect(session.currentContext.activeIssues).toEqual(['ISSUE-1']);
    });
  });
});