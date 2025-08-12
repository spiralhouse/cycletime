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
  {
    version: '006',
    description: 'Add domain entity tables',
    sql: `
      -- Projects table
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        path TEXT, -- Added for backward compatibility with SqliteStore
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Issues table with hierarchy support
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        project_id TEXT, -- Added for SqliteStore compatibility
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL CHECK (type IN ('Epic', 'Story', 'Subtask')),
        status TEXT NOT NULL,
        priority TEXT, -- Added for SqliteStore compatibility
        parent_id TEXT,
        estimate INTEGER,
        assignee TEXT, -- Added for SqliteStore compatibility
        labels TEXT, -- Added for SqliteStore compatibility
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES issues(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Project-Issue relationship table
      CREATE TABLE IF NOT EXISTS project_issues (
        project_id TEXT NOT NULL,
        issue_id TEXT NOT NULL,
        added_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (project_id, issue_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
      );

      -- Workflows table
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        project_id TEXT NOT NULL,
        current_stage TEXT NOT NULL,
        stages TEXT NOT NULL, -- JSON array
        transitions TEXT NOT NULL, -- JSON array
        is_complete BOOLEAN NOT NULL DEFAULT false,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Issue dependencies table
      CREATE TABLE IF NOT EXISTS issue_dependencies (
        dependent_id TEXT NOT NULL,
        dependency_id TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (dependent_id, dependency_id),
        FOREIGN KEY (dependent_id) REFERENCES issues(id) ON DELETE CASCADE,
        FOREIGN KEY (dependency_id) REFERENCES issues(id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_issues_parent 
        ON issues(parent_id);
      CREATE INDEX IF NOT EXISTS idx_issues_type 
        ON issues(type);
      CREATE INDEX IF NOT EXISTS idx_issues_status 
        ON issues(status);
      CREATE INDEX IF NOT EXISTS idx_project_issues_project 
        ON project_issues(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_issues_issue 
        ON project_issues(issue_id);
      CREATE INDEX IF NOT EXISTS idx_workflows_project 
        ON workflows(project_id);
      CREATE INDEX IF NOT EXISTS idx_dependencies_dependent 
        ON issue_dependencies(dependent_id);
      CREATE INDEX IF NOT EXISTS idx_dependencies_dependency 
        ON issue_dependencies(dependency_id);
    `,
  },
];
