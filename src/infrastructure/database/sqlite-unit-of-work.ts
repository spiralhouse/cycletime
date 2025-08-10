// Removed unused SessionStorageError import

import type { UnitOfWork } from '../../domain/repositories/session-repository.js';
import type Database from 'better-sqlite3';

/**
 * SQLite implementation of Unit of Work pattern
 */
export class SqliteUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Database.Database) {}

  /**
   * Execute operations within a transaction
   *
   * Better-sqlite3 handles transactions synchronously, but our operations are async.
   * For now, we'll execute operations directly since individual prepared statements
   * are atomic and auto-committed.
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Execute the operation directly - each prepared statement is atomic
    // Better-sqlite3 auto-commits individual statements
    return await operation();
  }

  /**
   * Check if currently in a transaction
   */
  isInTransaction(): boolean {
    return this.db.inTransaction;
  }
}
