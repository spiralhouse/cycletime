import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createSessionManager, SessionNotFoundError } from '../../src/mcp/session/index.js';

import type { SessionContext, SessionManager } from '../../src/mcp/session/index.js';

describe.sequential('SessionManager Integration Tests', () => {
  let db: Database.Database;
  let sessionManager: SessionManager;

  beforeEach(async () => {
    // Ensure any previous database is closed
    if (db?.open) {
      db.close();
    }

    // Create fresh in-memory database for testing (complete isolation between tests)
    db = new Database(':memory:');

    // Create required tables with proper constraints
    db.exec(`
      PRAGMA foreign_keys = ON;
      
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE session_states (
        session_key TEXT PRIMARY KEY,
        project_id TEXT,
        current_context TEXT NOT NULL DEFAULT '{}',
        last_activity INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_session_states_project_id ON session_states(project_id);
      CREATE INDEX idx_session_states_last_activity ON session_states(last_activity);
    `);

    // Insert test projects to satisfy foreign key constraints
    db.exec(`
      INSERT INTO projects (id, name) VALUES 
        ('test-project-1', 'Test Project 1'),
        ('test-project', 'Test Project'),
        ('other-project', 'Other Project');
    `);

    // Create session manager with test configuration
    sessionManager = createSessionManager(db, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours - long enough to avoid expiration in tests
      autoCleanup: false, // Disable for predictable tests
      maxSessionsPerProject: 0, // Unlimited
    });
  });

  afterEach(async () => {
    // Close database - this will automatically clean up resources
    if (db?.open) {
      db.close();
    }
  });

  describe('Database Integration', () => {
    it('should persist session to database and retrieve it', async () => {
      const projectId = 'test-project';
      const initialContext: SessionContext = {
        activeIssues: ['ISSUE-1', 'ISSUE-2'],
        workflowStage: 'development',
        lastAction: 'started coding',
      };

      // Create session
      const sessionKey = await sessionManager.createSession(projectId, initialContext);

      // Verify session persisted by retrieving through the API
      const retrievedSession = await sessionManager.getSession(sessionKey);

      expect(retrievedSession).not.toBeNull();
      expect(retrievedSession!.sessionKey).toBe(sessionKey);
      expect(retrievedSession!.projectId).toBe(projectId);
      expect(retrievedSession!.currentContext).toEqual(initialContext);
    });

    it('should handle database transactions correctly during updates', async () => {
      const sessionKey = await sessionManager.createSession('test-project', {
        activeIssues: ['ISSUE-1'],
        workflowStage: 'planning',
      });

      // Update session
      const contextUpdate: Partial<SessionContext> = {
        workflowStage: 'development',
        lastAction: 'started implementation',
      };

      await sessionManager.updateSession(sessionKey, contextUpdate);

      // Verify update was persisted by retrieving through the API
      const retrievedSession = await sessionManager.getSession(sessionKey);

      expect(retrievedSession).not.toBeNull();
      expect(retrievedSession!.currentContext.workflowStage).toBe('development');
      expect(retrievedSession!.currentContext.lastAction).toBe('started implementation');
      expect(retrievedSession!.currentContext.activeIssues).toEqual(['ISSUE-1']); // Should preserve existing
    });

    it('should cascade delete when project is removed', async () => {
      const sessionKey = await sessionManager.createSession('test-project');

      // Verify session exists
      expect(await sessionManager.sessionExists(sessionKey)).toBe(true);

      // Delete the project (should set session project_id to NULL due to foreign key constraint)
      db.prepare('DELETE FROM projects WHERE id = ?').run('test-project');

      // Session should still exist but with null project_id
      const dbRow = db
        .prepare('SELECT * FROM session_states WHERE session_key = ?')
        .get(sessionKey) as any;

      expect(dbRow).toBeDefined();
      expect(dbRow.project_id).toBeNull();
    });

    it('should handle concurrent session operations', async () => {
      const projectId = 'test-project';

      // Create multiple sessions concurrently
      const sessionPromises = Array.from({ length: 10 }, (_, i) =>
        sessionManager.createSession(projectId, { workflowStage: `stage-${i}` })
      );

      const sessionKeys = await Promise.all(sessionPromises);

      // Verify all sessions were created
      expect(sessionKeys).toHaveLength(10);
      expect(new Set(sessionKeys).size).toBe(10); // All unique

      // Verify all are persisted in database
      const dbCount = db
        .prepare('SELECT COUNT(*) as count FROM session_states WHERE project_id = ?')
        .get(projectId) as any;

      expect(dbCount.count).toBe(10);
    });

    it('should maintain data integrity during bulk operations', async () => {
      const sessions: string[] = [];

      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        const sessionKey = await sessionManager.createSession('test-project', {
          activeIssues: [`ISSUE-${i}`],
          workflowStage: `stage-${i}`,
        });

        sessions.push(sessionKey);
      }

      // Update all sessions concurrently
      const updatePromises = sessions.map((sessionKey, i) =>
        sessionManager.updateSession(sessionKey, {
          lastAction: `action-${i}-updated`,
        })
      );

      await Promise.all(updatePromises);

      // Verify all updates were persisted correctly
      for (let i = 0; i < sessions.length; i++) {
        const session = await sessionManager.getSession(sessions[i]);

        expect(session?.currentContext.lastAction).toBe(`action-${i}-updated`);
        expect(session?.currentContext.activeIssues).toEqual([`ISSUE-${i}`]);
        expect(session?.currentContext.workflowStage).toBe(`stage-${i}`);
      }
    });
  });

  describe('Repository Integration', () => {
    it('should properly handle SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE session_states; --";

      // Test SQL injection in context data instead of project ID
      const maliciousContext = {
        workflowStage: maliciousInput,
        lastAction: maliciousInput,
        activeIssues: [maliciousInput],
      };

      // Should not crash or affect database - use valid project ID
      const sessionKey = await sessionManager.createSession('test-project', maliciousContext);

      expect(sessionKey).toBeDefined();

      // Verify session was created safely with malicious data stored as-is
      const retrievedSession = await sessionManager.getSession(sessionKey);

      expect(retrievedSession).not.toBeNull();
      expect(retrievedSession!.currentContext.workflowStage).toBe(maliciousInput);

      // Verify table still exists (SQL injection was prevented)
      const tableExists = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='session_states'
      `
        )
        .get();

      expect(tableExists).toBeDefined();
    });

    it('should handle large context data correctly', async () => {
      const largeContext: SessionContext = {
        activeIssues: Array.from({ length: 100 }, (_, i) => `ISSUE-${i}`),
        workflowStage: 'development',
        lastAction: 'processing large dataset',
        contextData: {
          largeArray: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: `item-${i}` })),
          metadata: {
            description: 'Large context data for testing storage limits'.repeat(50),
          },
        },
      };

      const sessionKey = await sessionManager.createSession('test-project', largeContext);
      const retrievedSession = await sessionManager.getSession(sessionKey);

      expect(retrievedSession?.currentContext).toEqual(largeContext);
    });

    it('should handle unicode and special characters in context', async () => {
      const unicodeContext: SessionContext = {
        workflowStage: 'développement',
        lastAction: '開始編程',
        contextData: {
          emoji: '🚀💻🔥',
          symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
          unicode: 'Iñtërnâtiônàlizætiøn',
        },
      };

      const sessionKey = await sessionManager.createSession('test-project', unicodeContext);
      const retrievedSession = await sessionManager.getSession(sessionKey);

      expect(retrievedSession?.currentContext).toEqual(unicodeContext);
    });
  });

  describe('Error Recovery', () => {
    it('should handle database connection errors gracefully', async () => {
      // Close the database to simulate connection issues
      db.close();

      // Operations should throw appropriate errors
      await expect(sessionManager.createSession()).rejects.toThrow();
      await expect(sessionManager.getSession('any-key')).rejects.toThrow();
    });

    it('should validate session context data at application layer', async () => {
      const sessionKey = await sessionManager.createSession('test-project');

      // Invalid context should be rejected by domain validation
      await expect(
        sessionManager.updateSession(sessionKey, {
          activeIssues: 'invalid-not-array' as any,
        })
      ).rejects.toThrow();

      await expect(
        sessionManager.updateSession(sessionKey, {
          workflowStage: 123 as any,
        })
      ).rejects.toThrow();
    });

    it('should handle session not found errors correctly', async () => {
      await expect(sessionManager.updateSession('non-existent', {})).rejects.toThrow(
        SessionNotFoundError
      );

      await expect(sessionManager.addActiveIssue('non-existent', 'ISSUE-1')).rejects.toThrow(
        SessionNotFoundError
      );

      await expect(sessionManager.removeActiveIssue('non-existent', 'ISSUE-1')).rejects.toThrow(
        SessionNotFoundError
      );
    });
  });

  describe('Performance Integration', () => {
    it('should handle session retrieval efficiently with database indexes', async () => {
      const projectId = 'test-project';
      const sessionKeys: string[] = [];

      // Create many sessions for the same project
      for (let i = 0; i < 50; i++) {
        const sessionKey = await sessionManager.createSession(projectId, {
          workflowStage: `stage-${i}`,
        });

        sessionKeys.push(sessionKey);
      }

      const startTime = Date.now();

      // Retrieve project sessions - should be efficient due to index
      const projectSessions = await sessionManager.getProjectSessions(projectId);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(projectSessions).toHaveLength(50);
      expect(queryTime).toBeLessThan(100); // Should be very fast with proper indexing
    });

    it('should efficiently delete expired sessions using index', async () => {
      // Create sessions with older timestamps by directly inserting to database
      const oldTimestamp = Math.floor(Date.now() / 1000) - 48 * 60 * 60; // 48 hours ago

      for (let i = 0; i < 20; i++) {
        db.prepare(
          `
          INSERT INTO session_states (session_key, project_id, current_context, last_activity, created_at, updated_at)
          VALUES (?, ?, '{}', ?, ?, ?)
        `
        ).run(`old-session-${i}`, 'test-project', oldTimestamp, oldTimestamp, oldTimestamp);
      }

      const startTime = Date.now();

      // Delete expired sessions - should be efficient due to last_activity index
      const expiredCount = await sessionManager.expireSessions(new Date());

      const endTime = Date.now();
      const deleteTime = endTime - startTime;

      expect(expiredCount).toBe(20);
      expect(deleteTime).toBeLessThan(50); // Should be fast with proper indexing
    });
  });
});
