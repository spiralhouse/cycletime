import { describe, it, expect, beforeEach } from 'vitest';

import { SessionManager } from '../../src/mcp/session/manager.js';
import { MockSessionApplicationService } from '../fixtures/mock-session-application-service.js';
import { MockTimeProvider } from '../fixtures/mock-time-provider.js';

import type { SessionConfig } from '../../src/mcp/session/types.js';

/**
 * Unit tests focused on SessionManager expiration logic
 * These tests use dependency injection to test business logic without external dependencies
 */
describe('SessionManager Expiration Logic Unit Tests', () => {
  let mockTimeProvider: MockTimeProvider;
  let config: SessionConfig;

  function createSessionManager() {
    const mockService = new MockSessionApplicationService();
    const manager = new SessionManager(mockService, mockTimeProvider, config);

    return { manager, mockService };
  }

  beforeEach(() => {
    mockTimeProvider = new MockTimeProvider();
    config = {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      autoCleanup: false,
      cleanupInterval: 60 * 60 * 1000,
      maxSessionsPerProject: 0,
    };
  });

  describe('Session Expiration Detection', () => {
    it('should identify expired sessions and delete them', async () => {
      const { manager, mockService } = createSessionManager();

      // Set current time
      mockTimeProvider.setTime('2024-01-01T12:00:00Z');

      // Mock a session that was active 25 hours ago (expired)
      const expiredTime = new Date(mockTimeProvider.now().getTime() - 25 * 60 * 60 * 1000);
      const sessionKey = 'expired-session';

      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'test-project',
        currentContext: {},
        lastActivity: expiredTime,
        createdAt: expiredTime,
        updatedAt: expiredTime,
      });

      // Expect delete to be called when session is found to be expired
      mockService.expectDeleteCall(sessionKey);

      // Getting the session should return null (expired and deleted)
      const result = await manager.getSession(sessionKey);

      expect(result).toBeNull();

      // Verify delete was actually called
      expect(mockService.getDeleteSessionCalls()).toContain(sessionKey);

      manager.shutdown();
    });

    it('should not expire recent sessions', async () => {
      const { manager, mockService } = createSessionManager();

      mockTimeProvider.setTime('2024-01-01T12:00:00Z');

      // Mock a session that was active 1 hour ago (not expired)
      const recentTime = new Date(mockTimeProvider.now().getTime() - 1 * 60 * 60 * 1000);
      const sessionKey = 'recent-session';

      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'test-project',
        currentContext: { workflowStage: 'development' },
        lastActivity: recentTime,
        createdAt: recentTime,
        updatedAt: recentTime,
      });

      // Getting the session should return the session (not expired)
      const result = await manager.getSession(sessionKey);

      expect(result).not.toBeNull();
      expect(result?.sessionKey).toBe(sessionKey);
      expect(result?.currentContext.workflowStage).toBe('development');

      // Verify no delete was called
      expect(mockService.getDeleteSessionCalls()).toHaveLength(0);

      manager.shutdown();
    });

    it('should filter expired sessions from project results', async () => {
      const { manager, mockService } = createSessionManager();

      mockTimeProvider.setTime('2024-01-01T12:00:00Z');
      const projectId = 'test-project';

      // Create mix of valid and expired sessions
      const validTime = new Date(mockTimeProvider.now().getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
      const expiredTime = new Date(mockTimeProvider.now().getTime() - 25 * 60 * 60 * 1000); // 25 hours ago

      const validSession = {
        sessionKey: 'valid-session',
        projectId,
        currentContext: { workflowStage: 'development' },
        lastActivity: validTime,
        createdAt: validTime,
        updatedAt: validTime,
      };

      const expiredSession = {
        sessionKey: 'expired-session',
        projectId,
        currentContext: { workflowStage: 'planning' },
        lastActivity: expiredTime,
        createdAt: expiredTime,
        updatedAt: expiredTime,
      };

      // Mock service returns both sessions
      mockService.mockProjectSessions(projectId, [validSession, expiredSession]);

      // Get project sessions - should filter out expired ones
      const result = await manager.getProjectSessions(projectId);

      expect(result).toHaveLength(1);
      expect(result[0].sessionKey).toBe('valid-session');
      expect(result[0].currentContext.workflowStage).toBe('development');

      manager.shutdown();
    });
  });

  describe('Bulk Expiration Operations', () => {
    it('should use configured maxAge for bulk expiration', async () => {
      const { manager, mockService } = createSessionManager();

      mockTimeProvider.setTime('2024-01-01T12:00:00Z');

      mockService.mockCleanupExpiredSessionsResult({
        success: true,
        affectedCount: 5,
      });

      const expiredCount = await manager.expireSessions();

      expect(expiredCount).toBe(5);

      // Verify cleanup was called with configured maxAge
      const cleanupCalls = mockService.getCleanupExpiredSessionsCalls();

      expect(cleanupCalls).toHaveLength(1);
      expect(cleanupCalls[0]).toBe(config.maxAge);

      manager.shutdown();
    });

    it('should calculate maxAge from cutoff date', async () => {
      const { manager, mockService } = createSessionManager();

      mockTimeProvider.setTime('2024-01-01T12:00:00Z');

      // Cutoff 6 hours ago
      const cutoffDate = new Date(mockTimeProvider.now().getTime() - 6 * 60 * 60 * 1000);
      const expectedMaxAge = 6 * 60 * 60 * 1000;

      mockService.mockCleanupExpiredSessionsResult({
        success: true,
        affectedCount: 3,
      });

      const expiredCount = await manager.expireSessions(cutoffDate);

      expect(expiredCount).toBe(3);

      // Verify cleanup was called with calculated maxAge
      const cleanupCalls = mockService.getCleanupExpiredSessionsCalls();

      expect(cleanupCalls[0]).toBe(expectedMaxAge);

      manager.shutdown();
    });

    it('should handle cleanup errors gracefully', async () => {
      const { manager, mockService } = createSessionManager();

      mockService.mockCleanupExpiredSessionsResult({
        success: false,
        error: 'Database connection failed',
      });

      await expect(manager.expireSessions()).rejects.toThrow('Session storage error');

      manager.shutdown();
    });
  });

  describe('Time-Independent Business Logic', () => {
    it('should create sessions with timestamp from time provider', async () => {
      const { manager, mockService } = createSessionManager();

      // Set specific time
      mockTimeProvider.setTime('2024-05-15T09:30:00Z');

      mockService.mockCreateSessionResult({
        success: true,
        sessionKey: 'time-test-session',
      });

      await manager.createSession('test-project', { workflowStage: 'planning' });

      const createCalls = mockService.getCreateSessionCalls();

      expect(createCalls).toHaveLength(1);
      expect(createCalls[0].projectId).toBe('test-project');
      expect(createCalls[0].initialContext?.workflowStage).toBe('planning');

      manager.shutdown();
    });

    it('should maintain consistent time across operations', async () => {
      const { manager, mockService } = createSessionManager();

      // Test time consistency across multiple operations
      mockTimeProvider.setTime('2024-01-01T10:00:00Z');

      mockService.mockCreateSessionResult({
        success: true,
        sessionKey: 'consistent-time-session',
      });

      // Create session
      await manager.createSession('test-project');

      // Advance time by 30 minutes
      mockTimeProvider.advance(30 * 60 * 1000);

      mockService.mockUpdateSessionResult({
        success: true,
        sessionKey: 'consistent-time-session',
      });

      // Update session - should use the advanced time
      await manager.updateSession('consistent-time-session', {
        lastAction: 'updated after 30 minutes',
      });

      // Verify both operations used the time provider
      expect(mockService.getCreateSessionCalls()).toHaveLength(1);
      expect(mockService.getUpdateSessionCalls()).toHaveLength(1);

      manager.shutdown();
    });
  });
});
