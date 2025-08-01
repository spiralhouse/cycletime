-- JCVD Migration System - Migration 003
-- Comprehensive migration tracking and schema versioning system
-- Version: 1.2.0
-- Migration: 003

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Migration System Tables
-- =============================================================================

-- Schema migrations tracking table
-- Records all applied migrations with detailed execution information
CREATE TABLE schema_migrations (
    id TEXT PRIMARY KEY NOT NULL,
    migration_id TEXT UNIQUE NOT NULL, -- e.g., "003_migration_system"
    version TEXT NOT NULL, -- Semantic version (e.g., "1.2.0")
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('schema', 'data', 'hotfix', 'rollback')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
    direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
    mode TEXT NOT NULL CHECK (mode IN ('normal', 'dry_run', 'force')),
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration INTEGER, -- Execution time in milliseconds
    error_message TEXT,
    error_stack TEXT,
    checksum TEXT NOT NULL, -- SHA-256 hash of migration content
    metadata TEXT, -- JSON metadata
    applied_by TEXT, -- User/system identifier
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migration history audit table
-- Comprehensive audit trail of all migration operations
CREATE TABLE migration_history (
    id TEXT PRIMARY KEY NOT NULL,
    migration_id TEXT NOT NULL, -- References the migration, not schema_migrations.id
    operation TEXT NOT NULL CHECK (operation IN ('apply', 'rollback', 'validate', 'dry_run')),
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    version_before TEXT, -- Schema version before operation
    version_after TEXT, -- Schema version after operation
    execution_plan TEXT, -- JSON representation of execution plan
    validation_results TEXT, -- JSON validation results
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration INTEGER, -- Execution time in milliseconds
    error_details TEXT, -- JSON error information
    warnings TEXT, -- JSON warnings
    backup_id TEXT, -- Reference to backup if created
    applied_by TEXT, -- User/system identifier
    client_info TEXT, -- Client application info
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Schema snapshots for rollback support
-- Complete schema state at specific points in time
CREATE TABLE schema_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    version TEXT NOT NULL, -- Schema version at snapshot time
    snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('automatic', 'manual', 'pre_migration', 'post_migration')),
    schema_ddl TEXT NOT NULL, -- Complete schema DDL
    data_sample TEXT, -- JSON sample of critical data
    description TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    checksum TEXT NOT NULL, -- SHA-256 hash for integrity
    compression TEXT CHECK (compression IN ('none', 'gzip', 'lz4')),
    metadata TEXT, -- JSON metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT, -- User/system identifier
    expires_at DATETIME -- Snapshot expiration (for cleanup)
);

-- Migration dependencies tracking
-- Explicit dependency relationships between migrations
CREATE TABLE migration_dependencies (
    id TEXT PRIMARY KEY NOT NULL,
    migration_id TEXT NOT NULL, -- The migration that has dependencies
    depends_on_migration_id TEXT NOT NULL, -- The migration it depends on
    dependency_type TEXT NOT NULL CHECK (dependency_type IN ('required', 'optional', 'conflicts')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(migration_id, depends_on_migration_id),
    CHECK(migration_id != depends_on_migration_id) -- Prevent self-dependencies
);

-- Schema version registry
-- Tracks current and historical schema versions
CREATE TABLE schema_versions (
    id TEXT PRIMARY KEY NOT NULL,
    version TEXT UNIQUE NOT NULL, -- Semantic version (e.g., "1.2.0")
    major_version INTEGER NOT NULL,
    minor_version INTEGER NOT NULL,
    patch_version INTEGER NOT NULL,
    prerelease TEXT, -- Pre-release identifier
    build_metadata TEXT, -- Build metadata
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    migration_count INTEGER NOT NULL DEFAULT 0, -- Number of migrations in this version
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_at DATETIME, -- When this version became current
    deactivated_at DATETIME -- When this version was superseded
);

-- =============================================================================
-- Performance Indexes for Migration System
-- =============================================================================

-- Schema migrations indexes
CREATE INDEX idx_schema_migrations_migration_id ON schema_migrations(migration_id);
CREATE INDEX idx_schema_migrations_version ON schema_migrations(version);
CREATE INDEX idx_schema_migrations_status ON schema_migrations(status);
CREATE INDEX idx_schema_migrations_type ON schema_migrations(type);
CREATE INDEX idx_schema_migrations_started_at ON schema_migrations(started_at);
CREATE INDEX idx_schema_migrations_checksum ON schema_migrations(checksum);

-- Migration history indexes
CREATE INDEX idx_migration_history_migration_id ON migration_history(migration_id);
CREATE INDEX idx_migration_history_operation ON migration_history(operation);
CREATE INDEX idx_migration_history_status ON migration_history(status);
CREATE INDEX idx_migration_history_started_at ON migration_history(started_at);
CREATE INDEX idx_migration_history_version_before ON migration_history(version_before);
CREATE INDEX idx_migration_history_version_after ON migration_history(version_after);

-- Schema snapshots indexes
CREATE INDEX idx_schema_snapshots_version ON schema_snapshots(version);
CREATE INDEX idx_schema_snapshots_type ON schema_snapshots(snapshot_type);
CREATE INDEX idx_schema_snapshots_created_at ON schema_snapshots(created_at);
CREATE INDEX idx_schema_snapshots_expires_at ON schema_snapshots(expires_at);
CREATE INDEX idx_schema_snapshots_checksum ON schema_snapshots(checksum);

-- Migration dependencies indexes
CREATE INDEX idx_migration_dependencies_migration_id ON migration_dependencies(migration_id);
CREATE INDEX idx_migration_dependencies_depends_on ON migration_dependencies(depends_on_migration_id);
CREATE INDEX idx_migration_dependencies_type ON migration_dependencies(dependency_type);

-- Schema versions indexes
CREATE INDEX idx_schema_versions_version ON schema_versions(version);
CREATE INDEX idx_schema_versions_current ON schema_versions(is_current);
CREATE INDEX idx_schema_versions_major_minor ON schema_versions(major_version, minor_version);
CREATE INDEX idx_schema_versions_activated_at ON schema_versions(activated_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_schema_migrations_status_version ON schema_migrations(status, version);
CREATE INDEX idx_migration_history_migration_operation ON migration_history(migration_id, operation);
CREATE INDEX idx_schema_snapshots_version_type ON schema_snapshots(version, snapshot_type);

-- =============================================================================
-- Data Integrity Triggers for Migration System
-- =============================================================================

-- Update timestamps automatically
CREATE TRIGGER update_schema_migrations_timestamp 
    AFTER UPDATE ON schema_migrations
    BEGIN
        UPDATE schema_migrations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Automatically set completion time when status changes to completed/failed
CREATE TRIGGER set_migration_completion_time
    AFTER UPDATE OF status ON schema_migrations
    WHEN NEW.status IN ('completed', 'failed', 'rolled_back') AND OLD.completed_at IS NULL
    BEGIN
        UPDATE schema_migrations 
        SET completed_at = CURRENT_TIMESTAMP,
            duration = CASE 
                WHEN NEW.started_at IS NOT NULL 
                THEN CAST((julianday(CURRENT_TIMESTAMP) - julianday(NEW.started_at)) * 86400000 AS INTEGER)
                ELSE NULL 
            END
        WHERE id = NEW.id;
    END;

-- Automatically set completion time for migration history
CREATE TRIGGER set_migration_history_completion_time
    AFTER UPDATE OF status ON migration_history
    WHEN NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.completed_at IS NULL
    BEGIN
        UPDATE migration_history 
        SET completed_at = CURRENT_TIMESTAMP,
            duration = CASE 
                WHEN NEW.started_at IS NOT NULL 
                THEN CAST((julianday(CURRENT_TIMESTAMP) - julianday(NEW.started_at)) * 86400000 AS INTEGER)
                ELSE NULL 
            END
        WHERE id = NEW.id;
    END;

-- Ensure only one current schema version
CREATE TRIGGER ensure_single_current_version
    BEFORE UPDATE OF is_current ON schema_versions
    WHEN NEW.is_current = TRUE
    BEGIN
        -- Deactivate all other current versions
        UPDATE schema_versions 
        SET is_current = FALSE, 
            deactivated_at = CURRENT_TIMESTAMP 
        WHERE is_current = TRUE AND id != NEW.id;
        
        -- Set activation time for new current version
        UPDATE schema_versions 
        SET activated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id AND OLD.activated_at IS NULL;
    END;

-- Prevent deletion of applied migrations
CREATE TRIGGER prevent_applied_migration_deletion
    BEFORE DELETE ON schema_migrations
    WHEN OLD.status IN ('completed', 'running')
    BEGIN
        SELECT RAISE(ABORT, 'Cannot delete applied or running migrations. Use rollback instead.');
    END;

-- Validate semantic version format
CREATE TRIGGER validate_semantic_version
    BEFORE INSERT ON schema_versions
    BEGIN
        -- Basic semantic version validation (major.minor.patch)
        SELECT CASE 
            WHEN NEW.version NOT GLOB '[0-9]*.[0-9]*.[0-9]*' AND 
                 NEW.version NOT GLOB '[0-9]*.[0-9]*.[0-9]*-*' AND
                 NEW.version NOT GLOB '[0-9]*.[0-9]*.[0-9]*+*'
            THEN RAISE(ABORT, 'Invalid semantic version format. Expected: MAJOR.MINOR.PATCH[-prerelease][+build]')
        END;
        
        -- Ensure version components match parsed values
        SELECT CASE 
            WHEN NEW.major_version < 0 OR NEW.minor_version < 0 OR NEW.patch_version < 0
            THEN RAISE(ABORT, 'Version components must be non-negative integers')
        END;
    END;

-- Cascade migration deletion to history (but not applied migrations)
CREATE TRIGGER cascade_migration_history_cleanup
    AFTER DELETE ON schema_migrations
    WHEN OLD.status NOT IN ('completed', 'running')
    BEGIN
        DELETE FROM migration_history 
        WHERE migration_id = OLD.migration_id 
        AND status NOT IN ('completed');
    END;

-- =============================================================================
-- Migration System Views
-- =============================================================================

-- Current migration status overview
CREATE VIEW migration_status_overview AS
SELECT 
    v.version as current_version,
    v.description as version_description,
    v.activated_at as version_activated_at,
    COUNT(m.id) as total_migrations,
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completed_migrations,
    COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as failed_migrations,
    COUNT(CASE WHEN m.status = 'running' THEN 1 END) as running_migrations,
    MAX(m.completed_at) as last_migration_at,
    COUNT(s.id) as available_snapshots
FROM schema_versions v
LEFT JOIN schema_migrations m ON m.version = v.version
LEFT JOIN schema_snapshots s ON s.version = v.version
WHERE v.is_current = TRUE
GROUP BY v.id, v.version, v.description, v.activated_at;

-- Migration dependency graph
CREATE VIEW migration_dependency_graph AS
SELECT 
    m.migration_id,
    m.name as migration_name,
    m.version,
    m.status,
    d.depends_on_migration_id as dependency,
    dep.name as dependency_name,
    dep.status as dependency_status,
    d.dependency_type
FROM schema_migrations m
LEFT JOIN migration_dependencies d ON m.migration_id = d.migration_id
LEFT JOIN schema_migrations dep ON d.depends_on_migration_id = dep.migration_id
ORDER BY m.migration_id, d.dependency_type;

-- Migration execution timeline
CREATE VIEW migration_execution_timeline AS
SELECT 
    m.migration_id,
    m.name,
    m.version,
    m.type,
    m.status,
    m.started_at,
    m.completed_at,
    m.duration,
    COALESCE(m.duration, 
        CASE 
            WHEN m.status = 'running' 
            THEN CAST((julianday(CURRENT_TIMESTAMP) - julianday(m.started_at)) * 86400000 AS INTEGER)
            ELSE NULL 
        END
    ) as current_duration,
    m.applied_by
FROM schema_migrations m
ORDER BY m.started_at DESC;

-- Schema evolution history
CREATE VIEW schema_evolution_history AS
SELECT 
    v.version,
    v.major_version,
    v.minor_version, 
    v.patch_version,
    v.description,
    v.migration_count,
    v.activated_at,
    v.deactivated_at,
    CASE 
        WHEN v.is_current THEN 'CURRENT'
        WHEN v.deactivated_at IS NULL THEN 'INACTIVE'
        ELSE 'SUPERSEDED'
    END as status,
    COUNT(s.id) as snapshot_count
FROM schema_versions v
LEFT JOIN schema_snapshots s ON s.version = v.version
GROUP BY v.id, v.version, v.major_version, v.minor_version, v.patch_version, 
         v.description, v.migration_count, v.activated_at, v.deactivated_at, v.is_current
ORDER BY v.major_version DESC, v.minor_version DESC, v.patch_version DESC;

-- =============================================================================
-- Initialize Migration System
-- =============================================================================

-- Create initial schema version entry for v1.1.0 (current state before migration system)
INSERT INTO schema_versions (
    id, version, major_version, minor_version, patch_version, 
    is_current, description, migration_count, activated_at
) VALUES (
    'version_1_1_0',
    '1.1.0',
    1, 1, 0,
    FALSE, -- Will be updated when migration completes
    'Enhanced hierarchy validation system',
    2, -- 001_initial_schema and 002_hierarchy_validation
    '2025-08-01 00:00:00'
);

-- Create new schema version entry for v1.2.0 (with migration system)
INSERT INTO schema_versions (
    id, version, major_version, minor_version, patch_version, 
    is_current, description, migration_count
) VALUES (
    'version_1_2_0',
    '1.2.0',
    1, 2, 0,
    TRUE, -- This becomes current when migration completes
    'Schema versioning and migration system',
    3 -- 001, 002, and 003
);

-- Record historical migrations in the new system
INSERT INTO schema_migrations (
    id, migration_id, version, name, type, status, direction, mode,
    started_at, completed_at, duration, checksum, applied_by
) VALUES 
(
    'migration_001', '001_initial_schema', '1.0.0',
    'Initial JCVD database schema', 'schema', 'completed', 'up', 'normal',
    '2025-08-01 00:00:00', '2025-08-01 00:00:01', 1000,
    'sha256_hash_001', 'system'
),
(
    'migration_002', '002_hierarchy_validation', '1.1.0', 
    'Enhanced hierarchy validation', 'schema', 'completed', 'up', 'normal',
    '2025-08-01 00:00:02', '2025-08-01 00:00:03', 500,
    'sha256_hash_002', 'system'
);

-- Create initial snapshot of current schema state
INSERT INTO schema_snapshots (
    id, version, snapshot_type, schema_ddl, description, 
    size_bytes, checksum, created_by
) VALUES (
    'snapshot_pre_migration_system',
    '1.1.0',
    'pre_migration', 
    '-- Schema DDL would be captured here automatically',
    'Schema snapshot before migration system installation',
    0, -- Would be calculated automatically
    'sha256_hash_snapshot_pre',
    'migration_system'
);

-- =============================================================================
-- Update Schema Metadata
-- =============================================================================

-- Update schema version to v1.2.0
UPDATE schema_metadata SET value = '1.2.0', updated_at = CURRENT_TIMESTAMP WHERE key = 'version';
INSERT OR REPLACE INTO schema_metadata (key, value) VALUES 
    ('migration', '003_migration_system'),
    ('migration_003_applied_at', CURRENT_TIMESTAMP),
    ('migration_system_version', '1.0'),
    ('schema_versioning_enabled', 'true'),
    ('description', 'Schema versioning and migration system with comprehensive tracking and rollback support');

-- Performance validation query for migration system
-- This should complete under 10ms for normal migration operations
-- SELECT COUNT(*) FROM migration_status_overview WHERE current_version = '1.2.0';