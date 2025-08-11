import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../../src/mcp/session/manager.js';
import { MockSessionApplicationService } from '../fixtures/mock-session-application-service.js';
import { MockTimeProvider } from '../fixtures/mock-time-provider.js';
import type { SessionConfig } from '../../src/mcp/session/types.js';

describe('SessionManager - Session Info Unit Tests', () => {
  let config: SessionConfig;

  // Helper to create fresh mocks for each test
  function createFreshSessionManager(): {
    manager: SessionManager;
    mockService: MockSessionApplicationService;
    mockTimeProvider: MockTimeProvider;
  } {
    const mockTimeProvider = new MockTimeProvider();
    mockTimeProvider.setTime('2024-01-01T00:00:00Z');
    const mockService = new MockSessionApplicationService();
    const manager = new SessionManager(mockService, mockTimeProvider, config);
    return { manager, mockService, mockTimeProvider };
  }

  beforeEach(() => {
    config = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoCleanup: false,
    };
  });

  describe('getSessionInfo', () => {
    it('should return null for non-existent session', async () => {
      const { manager, mockService } = createFreshSessionManager();
      
      mockService.mockSession('non-existent', null);
      
      const info = await manager.getSessionInfo('non-existent');
      expect(info).toBeNull();
      
      manager.shutdown();
    });

    it('should return complete session information with metadata', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'project-1',
        currentContext: {
          activeIssues: ['issue-1', 'issue-2'],
          lastAction: 'updated_issue',
          workflowStage: 'development',
          contextData: { custom: 'data' },
        },
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now(),
      });

      const info = await manager.getSessionInfo(sessionKey);
      
      expect(info).not.toBeNull();
      expect(info!.state.sessionKey).toBe(sessionKey);
      expect(info!.state.projectId).toBe('project-1');
      expect(info!.metadata.issuesAccessed).toBe(2);
      expect(info!.metadata.lastAction).toBe('updated_issue');
      expect(info!.metadata.customData).toEqual({ custom: 'data' });
      expect(info!.metadata.source).toBe('mcp');
      expect(info!.isExpired).toBe(false);
      
      manager.shutdown();
    });

    it('should calculate time to expiration correctly', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      const createdAt = mockTimeProvider.now();
      
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'project-1',
        currentContext: {},
        lastActivity: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
      
      // Advance time by 1 day
      mockTimeProvider.advance(24 * 60 * 60 * 1000);
      
      const info = await manager.getSessionInfo(sessionKey);
      
      expect(info).not.toBeNull();
      expect(info!.isExpired).toBe(false);
      // Should have 6 days left (7 days - 1 day)
      expect(info!.timeToExpiration).toBe(6 * 24 * 60 * 60 * 1000);
      
      manager.shutdown();
    });

    it('should identify expired sessions', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      const createdAt = mockTimeProvider.now();
      
      // Create session at original time
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'project-1',
        currentContext: {},
        lastActivity: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
      
      // Advance time beyond maxAge
      mockTimeProvider.advance(8 * 24 * 60 * 60 * 1000);
      
      const info = await manager.getSessionInfo(sessionKey);
      
      expect(info).not.toBeNull();
      expect(info!.isExpired).toBe(true);
      expect(info!.timeToExpiration).toBe(0);
      
      manager.shutdown();
    });

    it('should calculate total active time', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      const createdAt = mockTimeProvider.now();
      
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'project-1',
        currentContext: {},
        lastActivity: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
      
      // Advance time by 2 hours
      mockTimeProvider.advance(2 * 60 * 60 * 1000);
      
      const info = await manager.getSessionInfo(sessionKey);
      
      expect(info).not.toBeNull();
      expect(info!.metadata.totalActiveTime).toBe(2 * 60 * 60 * 1000);
      
      manager.shutdown();
    });

    it('should track issues accessed count', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'project-1',
        currentContext: {
          activeIssues: ['issue-1', 'issue-2', 'issue-3'],
        },
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now(),
      });
      
      const info = await manager.getSessionInfo(sessionKey);
      
      expect(info).not.toBeNull();
      expect(info!.metadata.issuesAccessed).toBe(3);
      
      manager.shutdown();
    });

    it('should handle empty context gracefully', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: undefined,
        currentContext: {},
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now(),
      });
      
      const info = await manager.getSessionInfo(sessionKey);
      
      expect(info).not.toBeNull();
      expect(info!.metadata.issuesAccessed).toBe(0);
      expect(info!.metadata.lastAction).toBeUndefined();
      expect(info!.metadata.customData).toBeUndefined();
      
      manager.shutdown();
    });

    it('should preserve session state in info', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      const sessionData = {
        sessionKey,
        projectId: 'project-1',
        currentContext: {
          workflowStage: 'testing',
          activeIssues: ['issue-1'],
        },
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now(),
      };
      
      mockService.mockSession(sessionKey, sessionData);
      
      const info = await manager.getSessionInfo(sessionKey);
      
      expect(info).not.toBeNull();
      expect(info!.state.sessionKey).toBe(sessionKey);
      expect(info!.state.projectId).toBe('project-1');
      expect(info!.state.currentContext).toEqual(sessionData.currentContext);
      
      manager.shutdown();
    });
  });

  describe('Session Metadata Tracking', () => {
    it('should track session lifecycle', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      
      // Mock initial state
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'project-1',
        currentContext: {},
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now(),
      });
      
      // Initial state
      let info = await manager.getSessionInfo(sessionKey);
      expect(info!.metadata.updateCount).toBe(0);
      
      // Mock updated state
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'project-1',
        currentContext: {
          lastAction: 'created_issue',
        },
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now(),
      });
      
      // Check updated metadata
      info = await manager.getSessionInfo(sessionKey);
      expect(info!.metadata.lastAction).toBe('created_issue');
      
      manager.shutdown();
    });

    it('should handle session validation', async () => {
      const { manager, mockService, mockTimeProvider } = createFreshSessionManager();
      const sessionKey = 'test-session';
      
      // Mock valid session
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'project-1',
        currentContext: {},
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now(),
      });
      
      // Get info for valid session
      let info = await manager.getSessionInfo(sessionKey);
      expect(info).not.toBeNull();
      expect(info!.isExpired).toBe(false);
      
      // Mock deleted session
      mockService.mockSession(sessionKey, null);
      
      // Try to get info for deleted session
      info = await manager.getSessionInfo(sessionKey);
      expect(info).toBeNull();
      
      manager.shutdown();
    });
  });
});