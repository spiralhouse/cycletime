-- Rollback Migration for SPI-873: Database Schema Migration for Soft-Deletion
--
-- Purpose: Safely revert schema changes if needed during deployment
-- Database: H2 in PostgreSQL compatibility mode (migrated from SQLite in SPI-439)
--
-- IMPORTANT: This script is idempotent - safe to run multiple times
-- Execute this script to revert changes if needed before data population begins
--
-- ⚠️ WARNING: Dropping these columns will PERMANENTLY DELETE any soft-deletion
-- timestamps stored in deleted_at. This data CANNOT be recovered after execution.
-- Ensure you want to LOSE this data before proceeding.
-- This is NOT a safe operation if soft-deleted records need to be preserved.

-- ============================================================================
-- Step 1: Drop Composite Indexes (Must drop before columns)
-- ============================================================================

-- Drop composite index on projects table
DROP INDEX IF EXISTS projects_deleted_at_id;

-- Drop composite index on issues table
DROP INDEX IF EXISTS issues_deleted_at_parent_id;

-- Drop composite index on workflows table
DROP INDEX IF EXISTS workflows_deleted_at_id;

-- ============================================================================
-- Step 2: Drop Columns from Tables
-- ============================================================================

-- Remove deleted_at column from projects table
ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at;

-- Remove deleted_at column from issues table
ALTER TABLE issues DROP COLUMN IF EXISTS deleted_at;

-- Remove deleted_at column from workflows table
ALTER TABLE workflows DROP COLUMN IF EXISTS deleted_at;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
--
-- The database schema has been reverted to the pre-SPI-873 state.
-- All soft-deletion infrastructure has been removed.
--
-- Next Steps:
-- 1. Verify schema state: SELECT * FROM INFORMATION_SCHEMA.COLUMNS
--    WHERE TABLE_NAME IN ('projects', 'issues', 'workflows');
-- 2. Restart application to verify functionality
-- 3. Run full test suite to ensure no regressions
--
-- ============================================================================
