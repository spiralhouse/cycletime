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
   * We manually manage BEGIN/COMMIT/ROLLBACK for async operations with proper error handling.
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if database is still open
    if (!this.db.open) {
      throw new Error('The database connection is not open');
    }
    
    // Check if already in transaction to avoid nested transactions
    const wasInTransaction = this.db.inTransaction;
    
    if (!wasInTransaction) {
      this.db.exec('BEGIN IMMEDIATE');
    }
    
    try {
      const result = await operation();
      
      if (!wasInTransaction) {
        this.db.exec('COMMIT');
      }
      
      return result;
    } catch (error) {
      if (!wasInTransaction && this.db.open) {
        this.db.exec('ROLLBACK');
      }
      throw error;
    }
  }

  /**
   * Check if currently in a transaction
   */
  isInTransaction(): boolean {
    return this.db.inTransaction;
  }
}
