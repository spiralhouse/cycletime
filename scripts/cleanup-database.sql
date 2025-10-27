-- CycleTime Database Cleanup SQL
-- Deletes all records except Chess Demo project

-- Show current state
SELECT 'Current state:' AS info;
SELECT COUNT(*) AS project_count FROM projects;
SELECT COUNT(*) AS issue_count FROM issues;
SELECT COUNT(*) AS dependency_count FROM issue_dependencies;
SELECT COUNT(*) AS session_count FROM session_states;

-- Delete in correct order (respecting foreign keys)

-- 1. Delete ALL session states (references projects)
DELETE FROM session_states;

-- 2. Delete ALL issue dependencies
DELETE FROM issue_dependencies;

-- 3. Delete ALL issues (including Chess Demo issues)
DELETE FROM issues;

-- 4. Delete all projects EXCEPT Chess Demo
DELETE FROM projects WHERE name != 'Chess Demo';

-- Show final state
SELECT 'Final state:' AS info;
SELECT COUNT(*) AS project_count FROM projects;
SELECT COUNT(*) AS issue_count FROM issues;
SELECT COUNT(*) AS dependency_count FROM issue_dependencies;

SELECT 'Remaining project:' AS info;
SELECT id, name FROM projects;
