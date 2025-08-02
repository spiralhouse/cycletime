-- Add Audit Logging System - Migration 005
-- Version: 1.4.0
-- Migration: 005_add_audit_logging
-- Type: schema
-- Description: Add comprehensive audit logging for all data changes
-- Estimated Duration: 3000ms
-- Requires Backup: false

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Migration: Add Audit Logging System
-- =============================================================================

-- Create audit_logs table for tracking all data changes
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values TEXT, -- JSON of old values (for UPDATE/DELETE)
    new_values TEXT, -- JSON of new values (for INSERT/UPDATE)
    changed_fields TEXT, -- JSON array of changed field names
    user_id TEXT, -- Who made the change
    session_id TEXT, -- Session identifier
    ip_address TEXT, -- Client IP address
    user_agent TEXT, -- Client user agent
    change_reason TEXT, -- Optional reason for change
    metadata TEXT, -- JSON metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_log_settings table for configuration
CREATE TABLE audit_log_settings (
    id TEXT PRIMARY KEY NOT NULL,
    table_name TEXT UNIQUE NOT NULL,
    audit_inserts BOOLEAN NOT NULL DEFAULT TRUE,
    audit_updates BOOLEAN NOT NULL DEFAULT TRUE,
    audit_deletes BOOLEAN NOT NULL DEFAULT TRUE,
    exclude_fields TEXT, -- JSON array of fields to exclude from logging
    retention_days INTEGER NOT NULL DEFAULT 365,
    compress_after_days INTEGER NOT NULL DEFAULT 90,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_log_archive table for compressed/archived logs
CREATE TABLE audit_log_archive (
    id TEXT PRIMARY KEY NOT NULL,
    archive_date DATE NOT NULL,
    table_name TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    compressed_data BLOB, -- Compressed audit data
    checksum TEXT NOT NULL, -- Data integrity checksum
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Performance Indexes
-- =============================================================================

-- Audit logs indexes
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_table_operation ON audit_logs(table_name, operation);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);

-- Archive table indexes
CREATE INDEX idx_audit_log_archive_date ON audit_log_archive(archive_date);
CREATE INDEX idx_audit_log_archive_table ON audit_log_archive(table_name);
CREATE INDEX idx_audit_log_archive_table_date ON audit_log_archive(table_name, archive_date);

-- Settings table indexes
CREATE INDEX idx_audit_log_settings_table ON audit_log_settings(table_name);

-- =============================================================================
-- Audit Triggers for Core Tables
-- =============================================================================

-- Audit trigger for projects table
CREATE TRIGGER audit_projects_insert
    AFTER INSERT ON projects
    BEGIN
        INSERT INTO audit_logs (
            id, table_name, record_id, operation, new_values, 
            user_id, metadata, created_at
        ) VALUES (
            'audit_' || NEW.id || '_' || strftime('%s', 'now'),
            'projects',
            NEW.id,
            'INSERT',
            json_object(
                'id', NEW.id,
                'name', NEW.name,
                'description', NEW.description,
                'key', NEW.key,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at
            ),
            'system', -- TODO: Get from context
            json_object('trigger', 'audit_projects_insert'),
            CURRENT_TIMESTAMP
        );
    END;

CREATE TRIGGER audit_projects_update
    AFTER UPDATE ON projects
    WHEN OLD.updated_at != NEW.updated_at -- Only log actual changes
    BEGIN
        INSERT INTO audit_logs (
            id, table_name, record_id, operation, old_values, new_values,
            changed_fields, user_id, metadata, created_at
        ) VALUES (
            'audit_' || NEW.id || '_' || strftime('%s', 'now'),
            'projects',
            NEW.id,
            'UPDATE',
            json_object(
                'id', OLD.id,
                'name', OLD.name,
                'description', OLD.description,
                'key', OLD.key,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at
            ),
            json_object(
                'id', NEW.id,
                'name', NEW.name,
                'description', NEW.description,
                'key', NEW.key,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at
            ),
            json_array(
                CASE WHEN OLD.name != NEW.name THEN 'name' END,
                CASE WHEN OLD.description != NEW.description THEN 'description' END,
                CASE WHEN OLD.key != NEW.key THEN 'key' END
            ),
            'system',
            json_object('trigger', 'audit_projects_update'),
            CURRENT_TIMESTAMP
        );
    END;

CREATE TRIGGER audit_projects_delete
    AFTER DELETE ON projects
    BEGIN
        INSERT INTO audit_logs (
            id, table_name, record_id, operation, old_values,
            user_id, metadata, created_at
        ) VALUES (
            'audit_' || OLD.id || '_' || strftime('%s', 'now'),
            'projects',
            OLD.id,
            'DELETE',
            json_object(
                'id', OLD.id,
                'name', OLD.name,
                'description', OLD.description,
                'key', OLD.key,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at
            ),
            'system',
            json_object('trigger', 'audit_projects_delete'),
            CURRENT_TIMESTAMP
        );
    END;

-- Audit trigger for issues table
CREATE TRIGGER audit_issues_insert
    AFTER INSERT ON issues
    BEGIN
        INSERT INTO audit_logs (
            id, table_name, record_id, operation, new_values,
            user_id, metadata, created_at
        ) VALUES (
            'audit_' || NEW.id || '_' || strftime('%s', 'now'),
            'issues',
            NEW.id,
            'INSERT',
            json_object(
                'id', NEW.id,
                'project_id', NEW.project_id,
                'parent_id', NEW.parent_id,
                'title', NEW.title,
                'description', NEW.description,
                'state_id', NEW.state_id,
                'priority', NEW.priority,
                'estimate', NEW.estimate,
                'issue_type', NEW.issue_type,
                'assignee_id', NEW.assignee_id,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at
            ),
            COALESCE(NEW.assignee_id, 'system'),
            json_object('trigger', 'audit_issues_insert'),
            CURRENT_TIMESTAMP
        );
    END;

CREATE TRIGGER audit_issues_update
    AFTER UPDATE ON issues
    WHEN OLD.updated_at != NEW.updated_at
    BEGIN
        INSERT INTO audit_logs (
            id, table_name, record_id, operation, old_values, new_values,
            changed_fields, user_id, metadata, created_at
        ) VALUES (
            'audit_' || NEW.id || '_' || strftime('%s', 'now'),
            'issues',
            NEW.id,
            'UPDATE',
            json_object(
                'id', OLD.id,
                'project_id', OLD.project_id,
                'parent_id', OLD.parent_id,
                'title', OLD.title,
                'description', OLD.description,
                'state_id', OLD.state_id,
                'priority', OLD.priority,
                'estimate', OLD.estimate,
                'issue_type', OLD.issue_type,
                'assignee_id', OLD.assignee_id,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at
            ),
            json_object(
                'id', NEW.id,
                'project_id', NEW.project_id,
                'parent_id', NEW.parent_id,
                'title', NEW.title,
                'description', NEW.description,
                'state_id', NEW.state_id,
                'priority', NEW.priority,
                'estimate', NEW.estimate,
                'issue_type', NEW.issue_type,
                'assignee_id', NEW.assignee_id,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at
            ),
            json_array(
                CASE WHEN OLD.title != NEW.title THEN 'title' END,
                CASE WHEN OLD.description != NEW.description THEN 'description' END,
                CASE WHEN OLD.state_id != NEW.state_id THEN 'state_id' END,
                CASE WHEN OLD.priority != NEW.priority THEN 'priority' END,
                CASE WHEN OLD.estimate != NEW.estimate THEN 'estimate' END,
                CASE WHEN OLD.assignee_id != NEW.assignee_id THEN 'assignee_id' END,
                CASE WHEN OLD.parent_id != NEW.parent_id THEN 'parent_id' END
            ),
            COALESCE(NEW.assignee_id, OLD.assignee_id, 'system'),
            json_object('trigger', 'audit_issues_update'),
            CURRENT_TIMESTAMP
        );
    END;

CREATE TRIGGER audit_issues_delete
    AFTER DELETE ON issues
    BEGIN
        INSERT INTO audit_logs (
            id, table_name, record_id, operation, old_values,
            user_id, metadata, created_at
        ) VALUES (
            'audit_' || OLD.id || '_' || strftime('%s', 'now'),
            'issues',
            OLD.id,
            'DELETE',
            json_object(
                'id', OLD.id,
                'project_id', OLD.project_id,
                'parent_id', OLD.parent_id,
                'title', OLD.title,
                'description', OLD.description,
                'state_id', OLD.state_id,
                'priority', OLD.priority,
                'estimate', OLD.estimate,
                'issue_type', OLD.issue_type,
                'assignee_id', OLD.assignee_id,
                'created_at', OLD.created_at,
                'updated_at', OLD.updated_at
            ),
            COALESCE(OLD.assignee_id, 'system'),
            json_object('trigger', 'audit_issues_delete'),
            CURRENT_TIMESTAMP
        );
    END;

-- =============================================================================
-- Default Audit Settings
-- =============================================================================

-- Configure audit settings for all core tables
INSERT INTO audit_log_settings (
    id, table_name, audit_inserts, audit_updates, audit_deletes, 
    exclude_fields, retention_days, compress_after_days
) VALUES 
(
    'audit_settings_projects',
    'projects',
    TRUE, TRUE, TRUE,
    '[]', -- No excluded fields
    365, 90
),
(
    'audit_settings_issues',
    'issues', 
    TRUE, TRUE, TRUE,
    '[]',
    365, 90
),
(
    'audit_settings_workflow_states',
    'workflow_states',
    TRUE, TRUE, TRUE,
    '[]',
    365, 90
),
(
    'audit_settings_labels',
    'labels',
    TRUE, TRUE, TRUE,
    '[]',
    180, 60 -- Less retention for labels
),
(
    'audit_settings_issue_comments',
    'issue_comments',
    TRUE, TRUE, TRUE,
    '["body"]', -- Exclude comment body for privacy
    730, 180 -- Longer retention for comments
),
(
    'audit_settings_user_preferences',
    'user_preferences',
    TRUE, TRUE, TRUE,
    '["preference_value"]', -- Exclude values for privacy
    180, 60
);

-- =============================================================================
-- Audit Helper Views
-- =============================================================================

-- View for recent audit activity
CREATE VIEW recent_audit_activity AS
SELECT 
    al.id,
    al.table_name,
    al.record_id,
    al.operation,
    al.user_id,
    al.created_at,
    json_extract(al.metadata, '$.trigger') as trigger_name,
    CASE 
        WHEN al.changed_fields IS NOT NULL 
        THEN json_array_length(al.changed_fields)
        ELSE 0 
    END as changed_field_count
FROM audit_logs al
ORDER BY al.created_at DESC
LIMIT 100;

-- View for audit summary by table
CREATE VIEW audit_summary_by_table AS
SELECT 
    table_name,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN operation = 'INSERT' THEN 1 END) as inserts,
    COUNT(CASE WHEN operation = 'UPDATE' THEN 1 END) as updates,
    COUNT(CASE WHEN operation = 'DELETE' THEN 1 END) as deletes,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_change,
    MAX(created_at) as last_change
FROM audit_logs
GROUP BY table_name
ORDER BY total_changes DESC;

-- View for user activity summary
CREATE VIEW audit_user_activity AS
SELECT 
    user_id,
    COUNT(*) as total_changes,
    COUNT(DISTINCT table_name) as tables_modified,
    COUNT(CASE WHEN operation = 'INSERT' THEN 1 END) as inserts,
    COUNT(CASE WHEN operation = 'UPDATE' THEN 1 END) as updates,
    COUNT(CASE WHEN operation = 'DELETE' THEN 1 END) as deletes,
    MIN(created_at) as first_activity,
    MAX(created_at) as last_activity
FROM audit_logs
WHERE user_id IS NOT NULL AND user_id != 'system'
GROUP BY user_id
ORDER BY total_changes DESC;

-- =============================================================================
-- Cleanup and Maintenance Triggers
-- =============================================================================

-- Automatic cleanup trigger for old audit logs
CREATE TRIGGER audit_log_cleanup
    AFTER INSERT ON audit_logs
    WHEN NEW.created_at < date('now', '-1 year')
    BEGIN
        -- Archive old logs before deletion (simplified version)
        DELETE FROM audit_logs 
        WHERE created_at < date('now', '-1 year')
        AND table_name = NEW.table_name;
    END;

-- Update timestamp trigger for settings
CREATE TRIGGER update_audit_log_settings_timestamp
    AFTER UPDATE ON audit_log_settings
    BEGIN
        UPDATE audit_log_settings 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END;

-- =============================================================================
-- Update Schema Metadata
-- =============================================================================

-- Update schema version to v1.4.0
UPDATE schema_metadata SET value = '1.4.0', updated_at = CURRENT_TIMESTAMP WHERE key = 'version';
INSERT OR REPLACE INTO schema_metadata (key, value) VALUES 
    ('migration', '005_add_audit_logging'),
    ('migration_005_applied_at', CURRENT_TIMESTAMP),
    ('audit_logging_version', '1.0'),
    ('audit_retention_default_days', '365'),
    ('description', 'Comprehensive audit logging system for tracking all data changes');

-- Performance validation query
-- This should complete under 10ms for normal operations
-- SELECT COUNT(*) FROM recent_audit_activity WHERE table_name = 'issues';