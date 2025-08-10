/**
 * Database migrations for cross-session state persistence
 * Part of SPI-371: Create SQLite schema for cross-session state persistence
 */

export interface Migration {
  version: string;
  description: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: '002',
    description: 'Add session state tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS session_states (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        session_key TEXT UNIQUE NOT NULL,
        project_id TEXT,
        current_context TEXT,
        last_activity INTEGER NOT NULL DEFAULT (unixepoch()),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
    `,
  },
  {
    version: '003',
    description: 'Add resource metadata tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS resource_metadata (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        last_accessed INTEGER NOT NULL DEFAULT (unixepoch()),
        access_count INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        UNIQUE(resource_type, resource_id)
      );
    `,
  },
  {
    version: '004',
    description: 'Add resource access logging',
    sql: `
      CREATE TABLE IF NOT EXISTS resource_access_logs (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        session_key TEXT,
        resource_uri TEXT NOT NULL,
        operation TEXT NOT NULL,
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT,
        timestamp INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `,
  },
  {
    version: '005',
    description: 'Add performance indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_resource_metadata_type 
        ON resource_metadata(resource_type);
      CREATE INDEX IF NOT EXISTS idx_resource_metadata_access 
        ON resource_metadata(last_accessed);
      CREATE INDEX IF NOT EXISTS idx_session_states_key 
        ON session_states(session_key);
      CREATE INDEX IF NOT EXISTS idx_session_states_activity 
        ON session_states(last_activity);
      CREATE INDEX IF NOT EXISTS idx_resource_logs_uri 
        ON resource_access_logs(resource_uri);
      CREATE INDEX IF NOT EXISTS idx_resource_logs_timestamp 
        ON resource_access_logs(timestamp);
    `,
  },
];
