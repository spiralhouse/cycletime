
import { SessionStorageError } from '../../domain/errors/session-errors.js';

import type { UnitOfWork } from '../../domain/repositories/session-repository.js';
import type Database from 'better-sqlite3';

/**
 * SQLite implementation of Unit of Work pattern
 */
export class SqliteUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Database.Database) {}

  /**
   * Execute operations within a transaction
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const transaction = this.db.transaction(() => operation());
    
    try {
      return await transaction();
    } catch (error) {
      throw new SessionStorageError('transaction execution', error as Error);
    }
  }

  /**
   * Check if currently in a transaction
   */
  isInTransaction(): boolean {
    return this.db.inTransaction;
  }
}