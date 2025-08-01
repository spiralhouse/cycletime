# Database Migration System Guide for AI Agents

This guide provides comprehensive instructions for AI agents working with JCVD's database migration system. The system is built on semantic versioning principles with robust validation, rollback support, and comprehensive tracking.

## System Overview

### Architecture

The JCVD migration system consists of several key components:

- **Migration Engine** (`migration-engine.ts`) - Core orchestration system
- **CLI Migration Runner** (`migration-runner.ts`) - Command-line interface
- **Schema Versioning** (`schema-versioning.ts`) - Semantic version management
- **Migration Validator** (`migration-validator.ts`) - Safety validation system
- **Migration Types** (`migration-types.ts`) - TypeScript type definitions

### Key Concepts

1. **Semantic Versioning**: All schema changes use semantic versioning (MAJOR.MINOR.PATCH)
2. **Migration Tracking**: Complete audit trail in `schema_migrations` table
3. **Dependency Management**: Explicit migration dependencies with circular detection
4. **Rollback Safety**: Comprehensive analysis and backup creation
5. **Validation System**: Multi-level validation with strict and warning modes

### Database Schema

The migration system uses these core tables:
- `schema_migrations` - Applied migration records
- `migration_history` - Complete audit trail
- `schema_snapshots` - Backup/restore points
- `migration_dependencies` - Dependency relationships
- `schema_versions` - Version registry

## Creating Migrations

### File Structure and Naming

Migration files follow strict naming conventions:

```
src/database/migrations/
├── 001_initial_schema.sql
├── 002_hierarchy_validation.sql  
├── 003_migration_system.sql
└── examples/
    ├── 004_add_user_preferences.sql
    └── rollback_example.sql
```

**Naming Pattern**: `NNN_description_with_underscores.sql`
- `NNN` - Zero-padded sequential number (001, 002, 003...)
- Description in lowercase with underscores
- Always use `.sql` extension

### Migration File Template

```sql
-- Migration Title - Migration NNN
-- Version: X.Y.Z
-- Migration: NNN_migration_name
-- Type: schema|data|hotfix|rollback
-- Description: Brief description of changes
-- Estimated Duration: 2000ms
-- Requires Backup: false|true

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Migration: Your Migration Description
-- =============================================================================

-- Your migration SQL here
CREATE TABLE example_table (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Update Schema Metadata
-- =============================================================================

-- Update schema version
UPDATE schema_metadata SET value = 'X.Y.Z', updated_at = CURRENT_TIMESTAMP WHERE key = 'version';
INSERT OR REPLACE INTO schema_metadata (key, value) VALUES 
    ('migration', 'NNN_migration_name'),
    ('migration_NNN_applied_at', CURRENT_TIMESTAMP),
    ('description', 'Migration description');
```

### Metadata Headers

Include these metadata headers in all migrations:

- **Version**: Semantic version this migration targets
- **Migration**: Migration ID matching filename
- **Type**: `schema` (DDL), `data` (DML), `hotfix`, or `rollback`
- **Description**: Brief description of changes
- **Estimated Duration**: Expected execution time in milliseconds
- **Requires Backup**: Whether backup is needed before execution

### Migration Types

1. **Schema Migrations** (`schema`): DDL changes (CREATE, ALTER, DROP)
2. **Data Migrations** (`data`): DML changes (INSERT, UPDATE, DELETE)
3. **Hotfixes** (`hotfix`): Critical fixes requiring immediate application
4. **Rollbacks** (`rollback`): Explicit rollback migrations

## Running Migrations

### CLI Usage

The migration system provides a comprehensive CLI interface:

```bash
# Basic migration commands
jcvd-migration migrate                    # Run all pending migrations
jcvd-migration migrate --target 2.0.0    # Migrate to specific version
jcvd-migration rollback --target 1.5.0   # Rollback to version 1.5.0

# Validation and status
jcvd-migration status                     # Show current status
jcvd-migration validate                   # Validate all migrations
jcvd-migration history                    # Show migration history

# Migration creation
jcvd-migration create add_users_table     # Create new migration

# Advanced options
jcvd-migration migrate --dry-run          # Test without applying
jcvd-migration migrate --force            # Force despite warnings
jcvd-migration validate --verbose         # Detailed validation output
```

### Programmatic API

Use the migration system programmatically:

```typescript
import { DefaultMigrationEngineFactory } from './migrations/migration-engine'
import { MigrationEngineConfig } from './migrations/migration-types'

// Create migration engine
const config: MigrationEngineConfig = {
  database: {
    path: 'jcvd.db',
    enableWAL: true,
    enableForeignKeys: true,
    timeout: 30_000
  },
  migration_directories: ['./src/database/migrations'],
  max_execution_time: 300_000,
  auto_backup: true,
  validation_mode: 'strict'
}

const factory = new DefaultMigrationEngineFactory()
const engine = await factory.create(config)

// Run migrations
const currentVersion = await engine.getCurrentVersion()
const plan = await engine.createMigrationPlan(targetVersion, 'up')
const result = await engine.executePlan(plan, 'normal')

// Check results
if (result.success) {
  console.log(`Migration completed: ${result.final_version}`)
} else {
  console.error('Migration failed:', result.errors)
}
```

### Migration Context

When writing programmatic migrations, use the `MigrationContext`:

```typescript
import { MigrationFunction, MigrationContext } from './migration-types'

const migration: MigrationFunction = async (context: MigrationContext) => {
  const { db, logger, currentVersion, targetVersion } = context
  
  logger.info('Starting migration', { 
    from: currentVersion, 
    to: targetVersion 
  })
  
  // Execute database operations
  await db.exec('CREATE TABLE users (id TEXT PRIMARY KEY)')
  
  // Validate changes
  const tables = await db.query('SELECT name FROM sqlite_master WHERE type="table"')
  if (!tables.find(t => t.name === 'users')) {
    throw new Error('Users table not created')
  }
  
  logger.info('Migration completed successfully')
}
```

## Best Practices

### Schema Change Patterns

#### Safe Changes (PATCH version)
- Add nullable columns with defaults
- Create new indexes
- Add new triggers
- Create new tables (non-breaking)

```sql
-- Safe: Add nullable column with default
ALTER TABLE issues ADD COLUMN priority_score INTEGER DEFAULT 0;

-- Safe: Create new index
CREATE INDEX idx_issues_priority_score ON issues(priority_score);
```

#### Additive Changes (MINOR version)
- Add new tables with relationships
- Add new columns (nullable)
- Add new constraints (non-breaking)

```sql
-- Minor: Add new table with foreign key
CREATE TABLE issue_attachments (
    id TEXT PRIMARY KEY NOT NULL,
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### Breaking Changes (MAJOR version)
- Remove tables or columns
- Change data types
- Add NOT NULL constraints to existing columns
- Rename tables or columns

```sql
-- Major: Remove column (breaking change)
-- Note: This requires careful handling in SQLite
ALTER TABLE issues DROP COLUMN deprecated_field;

-- Major: Change data type (requires table recreation in SQLite)
-- This would be implemented as a complex migration with data migration
```

### Rollback Safety Guidelines

1. **Always provide rollback scripts** for reversible changes:

```sql
-- Migration 004: Add user_preferences table
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value TEXT NOT NULL
);

-- Rollback script (in separate rollback migration):
DROP TABLE IF EXISTS user_preferences;
```

2. **Create backups for risky operations**:

```sql
-- Before dropping table, create backup
CREATE TABLE projects_backup AS SELECT * FROM projects;
DROP TABLE projects;
```

3. **Use transactions for complex migrations**:

```sql
BEGIN TRANSACTION;

-- Complex migration steps
ALTER TABLE issues ADD COLUMN new_field TEXT;
UPDATE issues SET new_field = 'default_value';
ALTER TABLE issues ADD CONSTRAINT check_new_field CHECK (new_field IS NOT NULL);

-- Validate changes
SELECT CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pragma_table_info('issues') WHERE name = 'new_field')
    THEN RAISE(ABORT, 'Migration validation failed: new_field not added')
END;

COMMIT;
```

### Validation and Testing

1. **Use validation functions** in migrations:

```sql
-- Validate that required tables exist
SELECT CASE 
    WHEN NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users')
    THEN RAISE(ABORT, 'Required table users does not exist')
END;
```

2. **Include performance validation queries**:

```sql
-- Performance validation - should complete under 10ms
-- SELECT COUNT(*) FROM issues WHERE state_id IN (SELECT id FROM workflow_states WHERE type = 'started');
```

3. **Test migrations in isolation**:

```typescript
// Test migration validation
const validator = new MigrationValidator(true) // strict mode
const result = await validator.validateMigration(migration)

expect(result.errors).toHaveLength(0)
expect(result.warnings.length).toBeLessThan(3)
```

### Error Handling

1. **Use descriptive error messages**:

```sql
SELECT CASE 
    WHEN COUNT(*) = 0 
    THEN RAISE(ABORT, 'Migration 004 failed: No default workflow states found. Please run migration 002 first.')
END
FROM workflow_states WHERE type = 'unstarted';
```

2. **Implement proper cleanup** on failure:

```typescript
const migration: MigrationFunction = async (context: MigrationContext) => {
  const { db, logger } = context
  
  try {
    await db.exec('CREATE TABLE temp_migration_table (id INTEGER)')
    await db.exec('INSERT INTO temp_migration_table VALUES (1)')
    
    // Migration logic here
    
    await db.exec('DROP TABLE temp_migration_table')
  } catch (error) {
    // Cleanup on failure
    await db.exec('DROP TABLE IF EXISTS temp_migration_table')
    logger.error('Migration failed, cleaned up temp table', error)
    throw error
  }
}
```

## Integration Points

### Embedded SQLite Provider

The migration system integrates with JCVD's embedded SQLite provider:

```typescript
import { EmbeddedProvider } from '../providers/embedded-provider'
import { MigrationEngine } from './migrations/migration-engine'

class DatabaseManager {
  private provider: EmbeddedProvider
  private migrationEngine: MigrationEngine
  
  async initialize(): Promise<void> {
    // Initialize database connection
    await this.provider.initialize()
    
    // Setup migration engine
    const config = {
      database: { path: this.provider.getDbPath() },
      migration_directories: ['./src/database/migrations'],
      validation_mode: 'strict'
    }
    
    this.migrationEngine = await factory.create(config)
    
    // Run pending migrations
    await this.migrationEngine.migrate()
  }
}
```

### Provider System Integration

The migration system works across different providers:

```typescript
// Provider-specific migration configurations
const getProviderConfig = (provider: string): MigrationEngineConfig => {
  switch (provider) {
    case 'embedded':
      return {
        database: { path: 'jcvd.db' },
        migration_directories: ['./src/database/migrations'],
        validation_mode: 'strict'
      }
    case 'linear':
      // Linear provider might have different migration needs
      return {
        database: { path: ':memory:' }, // For local caching
        migration_directories: ['./src/database/migrations/linear'],
        validation_mode: 'warn'
      }
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
```

### Multi-Layer State Management

Migrations support the multi-layer architecture:

```sql
-- Migration for provider synchronization
CREATE TABLE provider_sync_status (
    provider_id TEXT PRIMARY KEY NOT NULL,
    last_sync_at DATETIME,
    sync_version TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Track synchronization between embedded and cloud providers
INSERT INTO provider_sync_status (provider_id, sync_version) VALUES 
    ('embedded', '1.0.0'),
    ('linear', '1.0.0');
```

## Common Patterns

### Adding New Tables

```sql
-- Pattern: Add new table with full structure
CREATE TABLE table_name (
    id TEXT PRIMARY KEY NOT NULL,
    -- Foreign key relationships
    parent_id TEXT REFERENCES parent_table(id) ON DELETE CASCADE,
    -- Required fields
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    -- Optional fields
    description TEXT,
    metadata TEXT, -- JSON data
    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_table_name_parent_id ON table_name(parent_id);
CREATE INDEX idx_table_name_status ON table_name(status);
CREATE INDEX idx_table_name_created_at ON table_name(created_at);

-- Add timestamp trigger
CREATE TRIGGER update_table_name_timestamp 
    AFTER UPDATE ON table_name
    BEGIN
        UPDATE table_name SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
```

### Modifying Existing Tables

```sql
-- SQLite pattern for complex table modifications
-- (SQLite doesn't support all ALTER TABLE operations)

-- 1. Create new table with desired structure
CREATE TABLE issues_new (
    id TEXT PRIMARY KEY NOT NULL,
    -- ... existing columns ...
    new_column TEXT NOT NULL DEFAULT 'default_value',
    -- ... modified columns ...
    modified_column INTEGER NOT NULL -- changed from TEXT
);

-- 2. Copy data with transformations
INSERT INTO issues_new (id, existing_col, new_column, modified_column)
SELECT 
    id, 
    existing_col,
    'default_value' as new_column,
    CAST(old_modified_column AS INTEGER) as modified_column
FROM issues;

-- 3. Drop old table and rename new one
DROP TABLE issues;
ALTER TABLE issues_new RENAME TO issues;

-- 4. Recreate indexes and triggers
CREATE INDEX idx_issues_new_column ON issues(new_column);
-- ... recreate all indexes and triggers ...
```

### Data Migrations with Validation

```sql
-- Pattern: Data migration with comprehensive validation
BEGIN TRANSACTION;

-- Pre-migration validation
SELECT CASE 
    WHEN COUNT(*) = 0 
    THEN RAISE(ABORT, 'No source data found for migration')
END
FROM source_table;

-- Data transformation
UPDATE target_table 
SET computed_field = (
    SELECT COUNT(*) 
    FROM related_table r 
    WHERE r.target_id = target_table.id
);

-- Post-migration validation
SELECT CASE 
    WHEN COUNT(*) > 0 
    THEN RAISE(ABORT, 'Data migration failed: found NULL computed_field values')
END
FROM target_table 
WHERE computed_field IS NULL;

-- Performance validation
SELECT CASE 
    WHEN COUNT(*) != (SELECT COUNT(*) FROM source_table)
    THEN RAISE(ABORT, 'Data migration failed: record count mismatch')
END
FROM target_table;

COMMIT;
```

### Rollback Migrations

```sql
-- Pattern: Safe rollback with data preservation
-- Create backup tables before rollback
CREATE TABLE backup_table_name AS 
SELECT *, datetime('now') as backup_created_at 
FROM table_name;

-- Remove new features in reverse order
DROP VIEW IF EXISTS dependent_view;
DROP TRIGGER IF EXISTS related_trigger;
DROP INDEX IF EXISTS new_index;
DROP TABLE IF EXISTS new_table;

-- Revert schema metadata
UPDATE schema_metadata SET value = 'previous_version' WHERE key = 'version';
DELETE FROM schema_metadata WHERE key = 'new_feature_version';

-- Validation that rollback completed successfully
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE name = 'new_table')
    THEN RAISE(ABORT, 'Rollback failed: new_table still exists')
END;
```

### Version Bumping Logic

Use this logic for determining version bumps:

```typescript
// Determine version bump based on changes
const determineVersionBump = (changes: SchemaComparison): 'major' | 'minor' | 'patch' => {
  // Breaking changes = MAJOR
  if (changes.removed_tables.length > 0 || 
      changes.removed_columns.length > 0 ||
      changes.breaking_modifications.length > 0) {
    return 'major'
  }
  
  // New features = MINOR  
  if (changes.added_tables.length > 0 ||
      changes.added_columns.length > 0 ||
      changes.new_relationships.length > 0) {
    return 'minor'
  }
  
  // Bug fixes, indexes, etc = PATCH
  return 'patch'
}
```

This guide provides comprehensive coverage of JCVD's database migration system. Use these patterns and practices to ensure safe, reliable database evolution while maintaining data integrity and system performance.