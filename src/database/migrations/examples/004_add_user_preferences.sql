-- Add User Preferences System - Migration 004
-- Version: 1.3.0
-- Migration: 004_add_user_preferences
-- Type: schema
-- Description: Add user preferences table for customizable settings
-- Estimated Duration: 2000ms
-- Requires Backup: false

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Migration: Add User Preferences System
-- =============================================================================

-- Create user_preferences table
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL, -- External user reference
    preference_key TEXT NOT NULL,
    preference_value TEXT NOT NULL,
    preference_type TEXT NOT NULL CHECK (preference_type IN ('string', 'number', 'boolean', 'json')),
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

-- Create preference_templates table for default settings
CREATE TABLE preference_templates (
    id TEXT PRIMARY KEY NOT NULL,
    template_name TEXT UNIQUE NOT NULL,
    preference_key TEXT NOT NULL,
    default_value TEXT NOT NULL,
    preference_type TEXT NOT NULL CHECK (preference_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    validation_rules TEXT, -- JSON validation rules
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_name, preference_key)
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- User preferences indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);
CREATE INDEX idx_user_preferences_type ON user_preferences(preference_type);
CREATE INDEX idx_user_preferences_user_key ON user_preferences(user_id, preference_key);

-- Preference templates indexes
CREATE INDEX idx_preference_templates_name ON preference_templates(template_name);
CREATE INDEX idx_preference_templates_key ON preference_templates(preference_key);
CREATE INDEX idx_preference_templates_required ON preference_templates(is_required);

-- =============================================================================
-- Data Integrity Triggers
-- =============================================================================

-- Update timestamps automatically
CREATE TRIGGER update_user_preferences_timestamp 
    AFTER UPDATE ON user_preferences
    BEGIN
        UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_preference_templates_timestamp 
    AFTER UPDATE ON preference_templates
    BEGIN
        UPDATE preference_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Validate preference value format based on type
CREATE TRIGGER validate_preference_value_format
    BEFORE INSERT ON user_preferences
    BEGIN
        -- Validate boolean values
        SELECT CASE 
            WHEN NEW.preference_type = 'boolean' AND NEW.preference_value NOT IN ('true', 'false')
            THEN RAISE(ABORT, 'Boolean preference must be "true" or "false"')
        END;
        
        -- Validate number values
        SELECT CASE 
            WHEN NEW.preference_type = 'number' AND NEW.preference_value NOT GLOB '*[0-9]*'
            THEN RAISE(ABORT, 'Number preference must be a valid number')
        END;
        
        -- Validate JSON values (basic check)
        SELECT CASE 
            WHEN NEW.preference_type = 'json' AND NEW.preference_value NOT GLOB '*{*'
            AND NEW.preference_value NOT GLOB '*[*'
            THEN RAISE(ABORT, 'JSON preference must be valid JSON format')
        END;
    END;

CREATE TRIGGER validate_preference_value_format_update
    BEFORE UPDATE ON user_preferences
    BEGIN
        -- Same validation as insert
        SELECT CASE 
            WHEN NEW.preference_type = 'boolean' AND NEW.preference_value NOT IN ('true', 'false')
            THEN RAISE(ABORT, 'Boolean preference must be "true" or "false"')
        END;
        
        SELECT CASE 
            WHEN NEW.preference_type = 'number' AND NEW.preference_value NOT GLOB '*[0-9]*'
            THEN RAISE(ABORT, 'Number preference must be a valid number')
        END;
        
        SELECT CASE 
            WHEN NEW.preference_type = 'json' AND NEW.preference_value NOT GLOB '*{*'
            AND NEW.preference_value NOT GLOB '*[*'
            THEN RAISE(ABORT, 'JSON preference must be valid JSON format')
        END;
    END;

-- =============================================================================
-- Default Preference Templates
-- =============================================================================

-- Insert default preference templates
INSERT INTO preference_templates (
    id, template_name, preference_key, default_value, preference_type, 
    description, is_required
) VALUES 
(
    'pref_theme_default',
    'default_user',
    'theme',
    'light',
    'string',
    'User interface theme preference',
    TRUE
),
(
    'pref_notifications_default',
    'default_user',
    'notifications_enabled',
    'true',
    'boolean',
    'Enable/disable all notifications',
    TRUE
),
(
    'pref_timezone_default',
    'default_user',
    'timezone',
    'UTC',
    'string',
    'User timezone preference',
    TRUE
),
(
    'pref_language_default',
    'default_user',
    'language',
    'en',
    'string',
    'User language preference',
    TRUE
),
(
    'pref_items_per_page_default',
    'default_user',
    'items_per_page',
    '25',
    'number',
    'Default items per page in lists',
    FALSE
),
(
    'pref_dashboard_layout_default',
    'default_user',
    'dashboard_layout',
    '{"layout": "default", "widgets": ["summary", "recent_activity"]}',
    'json',
    'Dashboard layout configuration',
    FALSE
);

-- =============================================================================
-- Helper Views
-- =============================================================================

-- View for easy preference retrieval with defaults
CREATE VIEW user_preferences_with_defaults AS
SELECT 
    up.user_id,
    COALESCE(up.preference_key, pt.preference_key) as preference_key,
    COALESCE(up.preference_value, pt.default_value) as preference_value,
    COALESCE(up.preference_type, pt.preference_type) as preference_type,
    up.is_encrypted,
    pt.description,
    pt.is_required,
    CASE WHEN up.id IS NOT NULL THEN 'user_custom' ELSE 'template_default' END as source
FROM preference_templates pt
LEFT JOIN user_preferences up ON pt.preference_key = up.preference_key 
    AND pt.template_name = 'default_user'
UNION
SELECT 
    up.user_id,
    up.preference_key,
    up.preference_value,
    up.preference_type,
    up.is_encrypted,
    pt.description,
    pt.is_required,
    'user_custom' as source
FROM user_preferences up
LEFT JOIN preference_templates pt ON up.preference_key = pt.preference_key 
    AND pt.template_name = 'default_user'
WHERE pt.preference_key IS NULL; -- User-specific preferences not in templates

-- =============================================================================
-- Update Schema Metadata
-- =============================================================================

-- Update schema version to v1.3.0
UPDATE schema_metadata SET value = '1.3.0', updated_at = CURRENT_TIMESTAMP WHERE key = 'version';
INSERT OR REPLACE INTO schema_metadata (key, value) VALUES 
    ('migration', '004_add_user_preferences'),
    ('migration_004_applied_at', CURRENT_TIMESTAMP),
    ('user_preferences_version', '1.0'),
    ('description', 'User preferences system with customizable settings and templates');

-- Performance validation query
-- This should complete under 5ms for normal operations
-- SELECT COUNT(*) FROM user_preferences_with_defaults WHERE user_id = 'test_user';