import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SessionCleanupService, CleanupReason, DEFAULT_CLEANUP_CONFIG } from '../../src/domain/services/session-cleanup-service.js';
import { MockTimeProvider } from '../fixtures/mock-time-provider.js';

import type { SessionStateDto } from '../../src/application/dtos/session-dto.js';

describe('SessionCleanupService Unit Tests', () => {
  let cleanupService: SessionCleanupService;
  let mockTimeProvider: MockTimeProvider;
  let now: Date;

  beforeEach(() => {
    now = new Date('2024-01-15T12:00:00Z');
    mockTimeProvider = new MockTimeProvider();
    mockTimeProvider.setTime(now);
    cleanupService = new SessionCleanupService(mockTimeProvider);
  });

  const createSession = (overrides: Partial<SessionStateDto> = {}): SessionStateDto => ({
    sessionKey: 'test-session',
    projectId: 'project-1',
    currentContext: {
      activeIssues: [],
    },
    lastActivity: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  describe('Session Analysis', () => {
    it('should mark expired sessions for deletion', () => {
      const oldSession = createSession({
        sessionKey: 'old-session',
        lastActivity: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days old
      });

      const analyses = cleanupService.analyzeSessions([oldSession]);

      expect(analyses).toHaveLength(1);
      expect(analyses[0].shouldDelete).toBe(true);
      expect(analyses[0].reason).toBe(CleanupReason.EXPIRED_TOO_LONG);
    });

    it('should keep recent sessions', () => {
      const recentSession = createSession({
        sessionKey: 'recent-session',
        lastActivity: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day old
      });

      const analyses = cleanupService.analyzeSessions([recentSession]);

      expect(analyses).toHaveLength(1);
      expect(analyses[0].shouldDelete).toBe(false);
      expect(analyses[0].reason).toBeUndefined();
    });

    it('should mark orphaned sessions for deletion after retention period', () => {
      const orphanedSession = createSession({
        sessionKey: 'orphaned-session',
        projectId: undefined,
        lastActivity: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days old
      });

      const analyses = cleanupService.analyzeSessions([orphanedSession]);

      expect(analyses).toHaveLength(1);
      expect(analyses[0].shouldDelete).toBe(true);
      expect(analyses[0].reason).toBe(CleanupReason.ORPHANED_TOO_LONG);
    });

    it('should keep recent orphaned sessions', () => {
      const recentOrphan = createSession({
        sessionKey: 'recent-orphan',
        projectId: undefined,
        lastActivity: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day old
      });

      const analyses = cleanupService.analyzeSessions([recentOrphan]);

      expect(analyses).toHaveLength(1);
      expect(analyses[0].shouldDelete).toBe(false);
    });

    it('should enforce max sessions per project limit', () => {
      const sessions: SessionStateDto[] = [];
      
      // Create 12 sessions for the same project
      for (let i = 0; i < 12; i++) {
        sessions.push(createSession({
          sessionKey: `session-${i}`,
          projectId: 'project-1',
          lastActivity: new Date(now.getTime() - i * 60 * 60 * 1000), // Each session 1 hour older
        }));
      }

      const analyses = cleanupService.analyzeSessions(sessions);

      // Should keep only the 10 most recent sessions
      const toDelete = analyses.filter(a => a.shouldDelete);
      const toKeep = analyses.filter(a => !a.shouldDelete);

      expect(toDelete).toHaveLength(2);
      expect(toKeep).toHaveLength(10);
      expect(toDelete[0].reason).toBe(CleanupReason.EXCEEDS_PROJECT_LIMIT);
    });

    it('should handle multiple projects independently', () => {
      const project1Sessions = Array.from({ length: 5 }, (_, i) => 
        createSession({
          sessionKey: `p1-session-${i}`,
          projectId: 'project-1',
          lastActivity: new Date(now.getTime() - i * 60 * 60 * 1000),
        })
      );

      const project2Sessions = Array.from({ length: 5 }, (_, i) => 
        createSession({
          sessionKey: `p2-session-${i}`,
          projectId: 'project-2',
          lastActivity: new Date(now.getTime() - i * 60 * 60 * 1000),
        })
      );

      const analyses = cleanupService.analyzeSessions([...project1Sessions, ...project2Sessions]);

      // All sessions should be kept (5 per project, under the limit of 10)
      expect(analyses.filter(a => a.shouldDelete)).toHaveLength(0);
      expect(analyses.filter(a => !a.shouldDelete)).toHaveLength(10);
    });
  });

  describe('Cleanup Interval Management', () => {
    it('should allow cleanup on first run', () => {
      expect(cleanupService.shouldRunCleanup()).toBe(true);
    });

    it('should respect minimum cleanup interval', () => {
      cleanupService.markCleanupCompleted();
      expect(cleanupService.shouldRunCleanup()).toBe(false);

      // Advance time by less than minimum interval
      mockTimeProvider.advance(30 * 60 * 1000); // 30 minutes
      expect(cleanupService.shouldRunCleanup()).toBe(false);

      // Advance time past minimum interval
      mockTimeProvider.advance(31 * 60 * 1000); // Another 31 minutes (total 61 minutes)
      expect(cleanupService.shouldRunCleanup()).toBe(true);
    });
  });

  describe('Cleanup Statistics', () => {
    it('should calculate cleanup statistics correctly', () => {
      const sessions = [
        createSession({
          sessionKey: 'session-1',
          lastActivity: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days old
        }),
        createSession({
          sessionKey: 'session-2',
          lastActivity: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day old
        }),
        createSession({
          sessionKey: 'session-3',
          projectId: undefined,
          lastActivity: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days old
        }),
      ];

      const analyses = cleanupService.analyzeSessions(sessions);
      const stats = cleanupService.getCleanupStats(analyses);

      expect(stats.byReason.get(CleanupReason.EXPIRED_TOO_LONG)).toBe(1);
      expect(stats.byReason.get(CleanupReason.ORPHANED_TOO_LONG)).toBe(1);
      expect(stats.averageAge).toBeGreaterThan(0);
      expect(stats.oldestSession).toEqual(sessions[0].lastActivity);
      expect(stats.newestSession).toEqual(sessions[1].lastActivity);
    });
  });

  describe('Configuration Management', () => {
    it('should use default configuration', () => {
      const config = cleanupService.getConfig();

      expect(config.expiredSessionRetention).toBe(7 * 24 * 60 * 60 * 1000);
      expect(config.orphanedSessionRetention).toBe(3 * 24 * 60 * 60 * 1000);
      expect(config.maxSessionsPerProject).toBe(10);
      expect(config.optimizeAfterCleanup).toBe(true);
    });

    it('should allow configuration updates', () => {
      cleanupService.updateConfig({
        expiredSessionRetention: 14 * 24 * 60 * 60 * 1000,
        maxSessionsPerProject: 5,
        dryRun: true,
      });

      const config = cleanupService.getConfig();

      expect(config.expiredSessionRetention).toBe(14 * 24 * 60 * 60 * 1000);
      expect(config.maxSessionsPerProject).toBe(5);
      expect(config.dryRun).toBe(true);
    });

    it('should apply custom configuration on initialization', () => {
      const customService = new SessionCleanupService(mockTimeProvider, {
        expiredSessionRetention: 1 * 24 * 60 * 60 * 1000,
        orphanedSessionRetention: 6 * 60 * 60 * 1000,
        maxSessionsPerProject: 3,
      });

      const config = customService.getConfig();

      expect(config.expiredSessionRetention).toBe(1 * 24 * 60 * 60 * 1000);
      expect(config.orphanedSessionRetention).toBe(6 * 60 * 60 * 1000);
      expect(config.maxSessionsPerProject).toBe(3);
    });
  });

  describe('Corruption Detection', () => {
    it('should detect sessions with invalid data', () => {
      const invalidSession = {
        sessionKey: '',
        currentContext: {},
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SessionStateDto;

      expect(cleanupService.isSessionCorrupted(invalidSession)).toBe(true);
    });

    it('should detect sessions with invalid dates', () => {
      const invalidSession = createSession({
        createdAt: new Date('invalid'),
      });

      expect(cleanupService.isSessionCorrupted(invalidSession)).toBe(true);
    });

    it('should detect sessions with missing context', () => {
      const invalidSession = {
        sessionKey: 'test',
        currentContext: null as any,
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SessionStateDto;

      expect(cleanupService.isSessionCorrupted(invalidSession)).toBe(true);
    });

    it('should accept valid sessions', () => {
      const validSession = createSession();

      expect(cleanupService.isSessionCorrupted(validSession)).toBe(false);
    });
  });

  describe('Cleanup Result Building', () => {
    it('should build cleanup result correctly', () => {
      const analyses = [
        { sessionKey: 'session-1', shouldDelete: true, reason: CleanupReason.EXPIRED_TOO_LONG } as any,
        { sessionKey: 'session-2', shouldDelete: true, reason: CleanupReason.ORPHANED_TOO_LONG } as any,
        { sessionKey: 'session-3', shouldDelete: false } as any,
      ];

      const errors = [
        { sessionKey: 'session-1', message: 'Failed to delete', error: new Error('Test error') },
      ];

      const startTime = new Date(now.getTime() - 1000);
      const result = cleanupService.buildCleanupResult(analyses, errors, startTime);

      expect(result.deletedSessions).toBe(2);
      expect(result.deletedKeys).toEqual(['session-1', 'session-2']);
      expect(result.retainedSessions).toBe(1);
      expect(result.errors).toEqual(errors);
      expect(result.duration).toBeGreaterThanOrEqual(1000);
    });

    it('should handle dry run mode', () => {
      cleanupService.updateConfig({ dryRun: true });

      const analyses = [
        { sessionKey: 'session-1', shouldDelete: true, reason: CleanupReason.EXPIRED_TOO_LONG } as any,
      ];

      const result = cleanupService.buildCleanupResult(analyses, [], now);

      expect(result.storageOptimized).toBe(false);
    });
  });
});