import type { Session } from '../entities/session.js';
import type { SessionKey } from '../value-objects/session-key.js';

/**
 * Repository interface for session persistence operations
 */
export interface SessionRepository {
  /**
   * Find a session by its unique key
   */
  findBySessionKey: (sessionKey: SessionKey | string) => Promise<Session | null>;

  /**
   * Find all sessions associated with a project
   */
  findByProjectId: (projectId: string) => Promise<Session[]>;

  /**
   * Save a session (insert or update)
   */
  save: (session: Session) => Promise<void>;

  /**
   * Delete a session by its key
   */
  delete: (sessionKey: SessionKey | string) => Promise<boolean>;

  /**
   * Delete all sessions older than the specified date
   */
  deleteExpired: (olderThan: Date) => Promise<number>;

  /**
   * Check if a session exists with the given key
   */
  exists: (sessionKey: SessionKey | string) => Promise<boolean>;

  /**
   * Count total number of sessions
   */
  count: () => Promise<number>;

  /**
   * Find all sessions
   */
  findAll: () => Promise<Session[]>;

  /**
   * Optimize storage (e.g., vacuum database)
   */
  optimizeStorage: () => Promise<void>;
}

/**
 * Unit of Work interface for managing transactions
 */
export interface UnitOfWork {
  /**
   * Execute operations within a transaction
   */
  execute: <T>(operation: () => Promise<T>) => Promise<T>;

  /**
   * Check if currently in a transaction
   */
  isInTransaction: () => boolean;
}
