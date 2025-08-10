import { describe, it, expect, beforeEach } from 'vitest';

import { SessionManager } from '../../src/mcp/session/manager.js';
import { MockTimeProvider } from '../fixtures/mock-time-provider.js';
import { MockSessionApplicationService } from '../fixtures/mock-session-application-service.js';

import type { SessionConfig } from '../../src/mcp/session/types.js';
import type { SessionContext } from '../../src/domain/entities/session.js';

describe('SessionManager Unit Tests', () => {
  let mockTimeProvider: MockTimeProvider;
  let config: SessionConfig;

  // Helper to create fresh mocks for each test
  function createFreshSessionManager(): { manager: SessionManager, mockService: MockSessionApplicationService } {
    const mockService = new MockSessionApplicationService();
    const manager = new SessionManager(mockService, mockTimeProvider, config);
    return { manager, mockService };
  }

  beforeEach(() => {
    mockTimeProvider = new MockTimeProvider();
    config = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoCleanup: false, // Disable for unit tests
      cleanupInterval: 60 * 60 * 1000,
      maxSessionsPerProject: 0
    };
  });

  describe('Session Expiration Logic', () => {
    it('should identify expired sessions correctly', async () => {
      const { manager, mockService } = createFreshSessionManager();
      
      // Set initial time
      mockTimeProvider.setTime('2024-01-01T00:00:00Z');
      
      // Mock session created at current time
      const sessionKey = 'test-session';
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'test-project',
        currentContext: {},
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now()
      });

      // Session should be valid initially
      const validSession = await manager.getSession(sessionKey);
      expect(validSession).not.toBeNull();

      // Advance time beyond maxAge
      mockTimeProvider.advance(config.maxAge! + 1);

      // Session should be expired and deleted
      mockService.expectDeleteCall(sessionKey);
      const expiredSession = await manager.getSession(sessionKey);
      expect(expiredSession).toBeNull();
      
      manager.shutdown();
    });

    it('should not expire recent sessions', async () => {
      const { manager, mockService } = createFreshSessionManager();
      
      mockTimeProvider.setTime('2024-01-01T00:00:00Z');
      
      const sessionKey = 'recent-session';
      mockService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'test-project',
        currentContext: {},
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now()
      });

      // Advance time but not beyond maxAge
      mockTimeProvider.advance(config.maxAge! - 1000);

      // Session should still be valid
      const validSession = await manager.getSession(sessionKey);
      expect(validSession).not.toBeNull();
      expect(validSession?.sessionKey).toBe(sessionKey);
      
      manager.shutdown();
    });
  });

  describe('Session Creation', () => {
    it('should create session with current timestamp', async () => {
      const { manager, mockService } = createFreshSessionManager();
      
      mockTimeProvider.setTime('2024-01-01T12:00:00Z');
      
      mockService.mockCreateSessionResult({
        success: true,
        sessionKey: 'new-session-key'
      });

      const sessionKey = await manager.createSession('test-project');
      
      expect(sessionKey).toBe('new-session-key');
      expect(mockService.getCreateSessionCalls()).toHaveLength(1);
      
      const createCall = mockService.getCreateSessionCalls()[0];
      expect(createCall.projectId).toBe('test-project');
      
      manager.shutdown();
    });

    it('should create session with initial context', async () => {
      const { manager, mockService } = createFreshSessionManager();
      
      const initialContext: SessionContext = {
        activeIssues: ['ISSUE-1'],
        workflowStage: 'planning'
      };

      mockService.mockCreateSessionResult({
        success: true,
        sessionKey: 'context-session'
      });

      await manager.createSession('test-project', initialContext);
      
      const createCall = mockService.getCreateSessionCalls()[0];
      expect(createCall.initialContext).toEqual(initialContext);
      
      manager.shutdown();
    });

    it('should handle creation errors', async () => {
      mockSessionService.mockCreateSessionResult({
        success: false,
        error: 'Database connection failed'
      });

      await expect(sessionManager.createSession()).rejects.toThrow('Session storage error');
    });
  });

  describe('Session Updates', () => {
    it('should update session context', async () => {
      const sessionKey = 'update-session';
      const contextUpdate = { workflowStage: 'development' };

      mockSessionService.mockUpdateSessionResult({
        success: true,
        sessionKey
      });

      await sessionManager.updateSession(sessionKey, contextUpdate);
      
      const updateCalls = mockSessionService.getUpdateSessionCalls();
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0].sessionKey).toBe(sessionKey);
      expect(updateCalls[0].contextUpdate).toEqual(contextUpdate);
    });

    it('should handle session not found during update', async () => {
      mockSessionService.mockUpdateSessionResult({
        success: false,
        error: 'Session with key \'non-existent\' was not found'
      });

      await expect(sessionManager.updateSession('non-existent', {}))
        .rejects.toThrow('Session with key');
    });
  });

  describe('Session Deletion', () => {
    it('should delete existing session successfully', async () => {
      mockSessionService.mockDeleteSessionResult({
        success: true,
        affectedCount: 1
      });

      const result = await sessionManager.deleteSession('test-session');
      
      expect(result).toBe(true);
      expect(mockSessionService.getDeleteSessionCalls()).toContain('test-session');
    });

    it('should return false for non-existent session deletion', async () => {
      mockSessionService.mockDeleteSessionResult({
        success: true,
        affectedCount: 0
      });

      const result = await sessionManager.deleteSession('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('Project Sessions', () => {
    it('should filter expired sessions from project results', async () => {
      mockTimeProvider.setTime('2024-01-01T00:00:00Z');
      
      const projectId = 'test-project';
      
      // Mock sessions - one valid, one expired
      const validSession = {
        sessionKey: 'valid-session',
        projectId,
        currentContext: {},
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now()
      };

      const expiredSessionTime = new Date(mockTimeProvider.now().getTime() - config.maxAge! - 1000);
      const expiredSession = {
        sessionKey: 'expired-session',
        projectId,
        currentContext: {},
        lastActivity: expiredSessionTime,
        createdAt: expiredSessionTime,
        updatedAt: expiredSessionTime
      };

      mockSessionService.mockProjectSessions(projectId, [validSession, expiredSession]);

      const sessions = await sessionManager.getProjectSessions(projectId);
      
      // Should only return the valid session
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionKey).toBe('valid-session');
    });
  });

  describe('Bulk Session Expiration', () => {
    it('should expire sessions using configured maxAge', async () => {
      mockTimeProvider.setTime('2024-01-01T12:00:00Z');
      
      mockSessionService.mockCleanupExpiredSessionsResult({
        success: true,
        affectedCount: 5
      });

      const expiredCount = await sessionManager.expireSessions();
      
      expect(expiredCount).toBe(5);
      
      const cleanupCalls = mockSessionService.getCleanupExpiredSessionsCalls();
      expect(cleanupCalls).toHaveLength(1);
      expect(cleanupCalls[0]).toBe(config.maxAge);
    });

    it('should expire sessions using specific cutoff date', async () => {
      mockTimeProvider.setTime('2024-01-01T12:00:00Z');
      
      const cutoffDate = new Date('2024-01-01T06:00:00Z');
      const expectedMaxAge = mockTimeProvider.now().getTime() - cutoffDate.getTime();
      
      mockSessionService.mockCleanupExpiredSessionsResult({
        success: true,
        affectedCount: 3
      });

      const expiredCount = await sessionManager.expireSessions(cutoffDate);
      
      expect(expiredCount).toBe(3);
      
      const cleanupCalls = mockSessionService.getCleanupExpiredSessionsCalls();
      expect(cleanupCalls[0]).toBe(expectedMaxAge);
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const currentConfig = sessionManager.getConfig();
      
      expect(currentConfig).toEqual(config);
      // Should return copy, not original reference
      expect(currentConfig).not.toBe(config);
    });

    it('should update configuration', () => {
      const configUpdate = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
      
      sessionManager.updateConfig(configUpdate);
      
      const updatedConfig = sessionManager.getConfig();
      expect(updatedConfig.maxAge).toBe(configUpdate.maxAge);
    });
  });

  describe('Session Existence Check', () => {
    it('should return true for existing valid session', async () => {
      const sessionKey = 'existing-session';
      
      mockSessionService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'test-project',
        currentContext: {},
        lastActivity: mockTimeProvider.now(),
        createdAt: mockTimeProvider.now(),
        updatedAt: mockTimeProvider.now()
      });

      const exists = await sessionManager.sessionExists(sessionKey);
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      mockSessionService.mockSession('non-existent', null);

      const exists = await sessionManager.sessionExists('non-existent');
      
      expect(exists).toBe(false);
    });

    it('should return false for expired session', async () => {
      const sessionKey = 'expired-session';
      const expiredTime = new Date(mockTimeProvider.now().getTime() - config.maxAge! - 1000);
      
      mockSessionService.mockSession(sessionKey, {
        sessionKey,
        projectId: 'test-project',
        currentContext: {},
        lastActivity: expiredTime,
        createdAt: expiredTime,
        updatedAt: expiredTime
      });

      mockSessionService.expectDeleteCall(sessionKey);

      const exists = await sessionManager.sessionExists(sessionKey);
      
      expect(exists).toBe(false);
    });
  });
});