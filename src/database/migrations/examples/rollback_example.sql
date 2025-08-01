-- Example Rollback Migration - Remove User Preferences System
-- This demonstrates proper rollback patterns for migration 004
-- Version: Rollback from 1.3.0 to 1.2.0
-- Migration: rollback_004_remove_user_preferences
-- Type: rollback
-- Description: Safely rollback user preferences system with data preservation

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Pre-Rollback Data Preservation
-- =============================================================================

-- Create temporary backup table for user preferences (optional data preservation)
CREATE TABLE IF NOT EXISTS user_preferences_backup AS
SELECT 
    user_id,
    preference_key,
    preference_value,
    preference_type,
    is_encrypted,
    created_at,
    updated_at,
    datetime('now') as backup_created_at
FROM user_preferences;

-- Create backup of preference templates
CREATE TABLE IF NOT EXISTS preference_templates_backup AS
SELECT 
    template_name,
    preference_key,
    default_value,
    preference_type,
    description,
    is_required,
    validation_rules,
    created_at,
    updated_at,
    datetime('now') as backup_created_at
FROM preference_templates;

-- =============================================================================
-- Rollback Migration: Remove User Preferences System
-- =============================================================================

-- Drop dependent views first
DROP VIEW IF EXISTS user_preferences_with_defaults;

-- Drop triggers (in reverse order of creation)
DROP TRIGGER IF EXISTS validate_preference_value_format_update;
DROP TRIGGER IF EXISTS validate_preference_value_format;
DROP TRIGGER IF EXISTS update_preference_templates_timestamp;
DROP TRIGGER IF EXISTS update_user_preferences_timestamp;

-- Drop indexes (in reverse order)
DROP INDEX IF EXISTS idx_preference_templates_required;
DROP INDEX IF EXISTS idx_preference_templates_key;
DROP INDEX IF EXISTS idx_preference_templates_name;
DROP INDEX IF EXISTS idx_user_preferences_user_key;
DROP INDEX IF EXISTS idx_user_preferences_type;
DROP INDEX IF EXISTS idx_user_preferences_key;
DROP INDEX IF EXISTS idx_user_preferences_user_id;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS preference_templates;

-- =============================================================================
-- Rollback Schema Metadata
-- =============================================================================

-- Revert schema version to v1.2.0
UPDATE schema_metadata SET value = '1.2.0', updated_at = CURRENT_TIMESTAMP WHERE key = 'version';

-- Remove migration-specific metadata
DELETE FROM schema_metadata WHERE key = 'migration_004_applied_at';
DELETE FROM schema_metadata WHERE key = 'user_preferences_version';

-- Update migration reference
UPDATE schema_metadata SET value = '003_migration_system', updated_at = CURRENT_TIMESTAMP WHERE key = 'migration';
INSERT OR REPLACE INTO schema_metadata (key, value) VALUES 
    ('rollback_004_applied_at', CURRENT_TIMESTAMP),
    ('description', 'Schema versioning and migration system (user preferences rolled back)');

-- =============================================================================
-- Post-Rollback Verification
-- =============================================================================

-- Verify tables are removed
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user_preferences')
    THEN RAISE(ABORT, 'Rollback failed: user_preferences table still exists')
END;

SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'preference_templates')
    THEN RAISE(ABORT, 'Rollback failed: preference_templates table still exists')
END;

-- Verify core schema integrity after rollback
SELECT CASE 
    WHEN NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations')
    THEN RAISE(ABORT, 'Rollback failed: core migration tables missing')
END;

-- =============================================================================
-- Data Recovery Instructions
-- =============================================================================

-- Instructions for manual data recovery if needed:
-- 
-- 1. User preferences data is preserved in user_preferences_backup table
-- 2. Template data is preserved in preference_templates_backup table
-- 3. To restore data after re-applying migration 004, run:
--
-- INSERT INTO user_preferences (
--     id, user_id, preference_key, preference_value, preference_type, 
--     is_encrypted, created_at, updated_at
-- )
-- SELECT 
--     'restored_' || user_id || '_' || preference_key || '_' || strftime('%s', 'now'),
--     user_id, preference_key, preference_value, preference_type,
--     is_encrypted, created_at, CURRENT_TIMESTAMP
-- FROM user_preferences_backup;
--
-- 4. Cleanup backup tables when no longer needed:
-- DROP TABLE user_preferences_backup;
-- DROP TABLE preference_templates_backup;

-- Performance validation - should be fast with tables removed
-- SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name LIKE '%preference%';