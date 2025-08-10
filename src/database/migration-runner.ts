/**
 * Migration runner for database schema management
 * Part of SPI-371: Create SQLite schema for cross-session state persistence
 */

import type { Migration } from './migrations.js';
import type Database from 'better-sqlite3';


/**
 * MigrationRunner handles applying database migrations in a safe, trackable manner
 * Follows JCVD's linear migration approach with automatic rollback on failure
 */
export class MigrationRunner {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeMigrationTable();
  }

  /**
   * Initialize the migration tracking table
   * This table tracks which migrations have been applied
   */
  private initializeMigrationTable(): void {
    const createMigrationTable = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `;
    
    this.db.exec(createMigrationTable);
  }

  /**
   * Get all applied migrations from the database
   */
  getAppliedMigrations(): Set<string> {
    const query = this.db.prepare(`
      SELECT version FROM schema_migrations ORDER BY version
    `);
    
    const rows = query.all() as { version: string }[];

    return new Set(rows.map(row => row.version));
  }

  /**
   * Apply all pending migrations
   * Returns the number of migrations applied
   */
  async runMigrations(migrations: Migration[]): Promise<number> {
    const applied = this.getAppliedMigrations();
    
    let appliedCount = 0;

    for (const migration of migrations) {
      if (!applied.has(migration.version)) {
        console.log(`Applying migration ${migration.version}: ${migration.description}`);
        
        const transaction = this.db.transaction(() => {
          this.db.exec(migration.sql);
          
          const insertMigration = this.db.prepare(`
            INSERT INTO schema_migrations (version, description)
            VALUES (?, ?)
          `);
          
          insertMigration.run(migration.version, migration.description);
        });

        try {
          transaction();
          console.log(`✅ Migration ${migration.version} completed`);
          appliedCount++;
        } catch (error) {
          console.error(`❌ Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }

    return appliedCount;
  }

  /**
   * Get the current database schema version
   */
  getCurrentVersion(): string {
    const applied = this.getAppliedMigrations();

    if (applied.size === 0) return '000';
    
    const versions = Array.from(applied).sort();

    return versions[versions.length - 1] ?? '000';
  }
}