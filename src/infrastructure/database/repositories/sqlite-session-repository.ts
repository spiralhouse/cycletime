import { Session } from '../../../domain/entities/session.js';
import {
  SessionStorageError,
  InvalidSessionDataError,
} from '../../../domain/errors/session-errors.js';

import type { SessionContext } from '../../../domain/entities/session.js';
import type { TimeProvider } from '../../../domain/interfaces/time-provider.js';
import type { SessionRepository } from '../../../domain/repositories/session-repository.js';
import type { SessionKey } from '../../../domain/value-objects/session-key.js';
import type Database from 'better-sqlite3';

/**
 * SQLite implementation of SessionRepository
 */
export class SqliteSessionRepository implements SessionRepository {
  private findByKeyStmt?: Database.Statement;
  private findByProjectStmt?: Database.Statement;
  private insertStmt?: Database.Statement;
  private updateStmt?: Database.Statement;
  private deleteStmt?: Database.Statement;
  private deleteExpiredStmt?: Database.Statement;
  private existsStmt?: Database.Statement;
  private countStmt?: Database.Statement;

  constructor(
    private readonly db: Database.Database,
    private readonly timeProvider?: TimeProvider
  ) {
    this.initializeStatements();
  }

  private initializeStatements(): void {
    // Check if database is open before preparing statements
    if (!this.db.open) {
      return;
    }

    try {
      this.findByKeyStmt = this.db.prepare(`
        SELECT session_key, project_id, current_context, last_activity, created_at, updated_at
        FROM session_states
        WHERE session_key = ?
      `);

      this.findByProjectStmt = this.db.prepare(`
        SELECT session_key, project_id, current_context, last_activity, created_at, updated_at
        FROM session_states
        WHERE project_id = ?
        ORDER BY last_activity DESC
        LIMIT 100
      `);

      this.insertStmt = this.db.prepare(`
        INSERT INTO session_states (session_key, project_id, current_context, last_activity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      this.updateStmt = this.db.prepare(`
        UPDATE session_states
        SET project_id = ?, current_context = ?, last_activity = ?, updated_at = ?
        WHERE session_key = ?
      `);

      this.deleteStmt = this.db.prepare(`
        DELETE FROM session_states
        WHERE session_key = ?
      `);

      this.deleteExpiredStmt = this.db.prepare(`
        DELETE FROM session_states
        WHERE last_activity < ?
      `);

      this.existsStmt = this.db.prepare(`
        SELECT 1 FROM session_states WHERE session_key = ? LIMIT 1
      `);

      this.countStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM session_states
      `);
    } catch {
      // If statement preparation fails, statements remain undefined
      // and will be re-initialized on next access
    }
  }

  private ensureStatementsReady(): void {
    // Re-initialize statements if they're not available or database was recreated
    if (!this.findByKeyStmt || !this.db.open) {
      this.initializeStatements();
    }
  }

  /**
   * Find a session by its unique key
   */
  async findBySessionKey(sessionKey: SessionKey | string): Promise<Session | null> {
    try {
      this.ensureStatementsReady();
      if (!this.findByKeyStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const key = typeof sessionKey === 'string' ? sessionKey : sessionKey.value;
      const row = this.findByKeyStmt.get(key) as any;

      if (!row) {
        return null;
      }

      return this.rowToSession(row);
    } catch (error) {
      throw new SessionStorageError('find by session key', error as Error);
    }
  }

  /**
   * Find all sessions associated with a project
   */
  async findByProjectId(projectId: string): Promise<Session[]> {
    try {
      this.ensureStatementsReady();
      if (!this.findByProjectStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const rows = this.findByProjectStmt.all(projectId) as any[];

      return rows.map(row => this.rowToSession(row));
    } catch (error) {
      throw new SessionStorageError('find by project id', error as Error);
    }
  }

  /**
   * Save a session (insert or update)
   */
  async save(session: Session): Promise<void> {
    try {
      this.ensureStatementsReady();
      if (!this.updateStmt || !this.insertStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const exists = await this.exists(session.sessionKey);
      const sessionData = session.toPlainObject();

      if (exists) {
        // Update existing session
        this.updateStmt.run(
          sessionData.projectId || null,
          JSON.stringify(sessionData.currentContext),
          Math.floor(sessionData.lastActivity.getTime() / 1000),
          Math.floor(sessionData.updatedAt.getTime() / 1000),
          sessionData.sessionKey
        );
      } else {
        // Insert new session
        this.insertStmt.run(
          sessionData.sessionKey,
          sessionData.projectId || null,
          JSON.stringify(sessionData.currentContext),
          Math.floor(sessionData.lastActivity.getTime() / 1000),
          Math.floor(sessionData.createdAt.getTime() / 1000),
          Math.floor(sessionData.updatedAt.getTime() / 1000)
        );
      }
    } catch (error) {
      throw new SessionStorageError('save session', error as Error);
    }
  }

  /**
   * Delete a session by its key
   */
  async delete(sessionKey: SessionKey | string): Promise<boolean> {
    try {
      this.ensureStatementsReady();
      if (!this.deleteStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const key = typeof sessionKey === 'string' ? sessionKey : sessionKey.value;
      const result = this.deleteStmt.run(key);

      return result.changes > 0;
    } catch (error) {
      throw new SessionStorageError('delete session', error as Error);
    }
  }

  /**
   * Delete all sessions older than the specified date
   */
  async deleteExpired(olderThan: Date): Promise<number> {
    try {
      this.ensureStatementsReady();
      if (!this.deleteExpiredStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const cutoffTimestamp = Math.floor(olderThan.getTime() / 1000);
      const result = this.deleteExpiredStmt.run(cutoffTimestamp);

      return result.changes;
    } catch (error) {
      throw new SessionStorageError('delete expired sessions', error as Error);
    }
  }

  /**
   * Check if a session exists with the given key
   */
  async exists(sessionKey: SessionKey | string): Promise<boolean> {
    try {
      this.ensureStatementsReady();
      if (!this.existsStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const key = typeof sessionKey === 'string' ? sessionKey : sessionKey.value;
      const result = this.existsStmt.get(key);

      return result !== undefined;
    } catch (error) {
      throw new SessionStorageError('check session existence', error as Error);
    }
  }

  /**
   * Count total number of sessions
   */
  async count(): Promise<number> {
    try {
      this.ensureStatementsReady();
      if (!this.countStmt) {
        throw new Error('Unable to prepare database statements');
      }

      const result = this.countStmt.get() as any;

      return result.count;
    } catch (error) {
      throw new SessionStorageError('count sessions', error as Error);
    }
  }

  /**
   * Convert database row to Session domain object
   */
  private rowToSession(row: any): Session {
    try {
      let currentContext: SessionContext;

      try {
        currentContext = JSON.parse(row.current_context || '{}');
      } catch {
        throw new InvalidSessionDataError('Invalid JSON in current_context field');
      }

      return Session.fromPlainObject(
        {
          sessionKey: row.session_key,
          projectId: row.project_id || undefined,
          currentContext,
          lastActivity: new Date(row.last_activity * 1000), // Convert from Unix timestamp
          createdAt: new Date(row.created_at * 1000),
          updatedAt: new Date(row.updated_at * 1000),
        },
        this.timeProvider
      );
    } catch (error) {
      throw new InvalidSessionDataError(`Failed to convert database row to Session: ${error}`);
    }
  }
}
