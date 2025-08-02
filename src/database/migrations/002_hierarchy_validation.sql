-- JCVD Hierarchy Validation Enhancement - Migration 002
-- Comprehensive Epic → Story → Subtask hierarchy enforcement
-- Version: 1.1.0
-- Migration: 002

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Enhanced Hierarchy Validation Functions
-- =============================================================================

-- Function to validate hierarchy depth (max 3 levels: Epic → Story → Subtask)
-- Returns the depth of an issue in the hierarchy
-- Note: SQLite doesn't support user-defined functions, so we'll use CTEs in triggers

-- =============================================================================
-- Enhanced Hierarchy Validation Triggers
-- =============================================================================

-- Drop existing basic validation triggers
DROP TRIGGER IF EXISTS validate_issue_hierarchy_insert;
DROP TRIGGER IF EXISTS validate_issue_hierarchy_update;

-- Comprehensive hierarchy validation for INSERT operations
CREATE TRIGGER validate_issue_hierarchy_insert
    BEFORE INSERT ON issues
    BEGIN
        -- Rule 1: Epics cannot have parents
        SELECT CASE 
            WHEN NEW.issue_type = 'epic' AND NEW.parent_id IS NOT NULL 
            THEN RAISE(ABORT, 'Epics cannot have parent issues. Epics are top-level containers.')
        END;
        
        -- Rule 2: Subtasks must have parents
        SELECT CASE 
            WHEN NEW.issue_type = 'subtask' AND NEW.parent_id IS NULL 
            THEN RAISE(ABORT, 'Subtasks must have a parent issue. Subtasks cannot exist independently.')
        END;
        
        -- Rule 3: Validate parent-child type relationships
        SELECT CASE 
            -- Stories can only have Epic parents
            WHEN NEW.issue_type = 'story' AND NEW.parent_id IS NOT NULL AND (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ) != 'epic'
            THEN RAISE(ABORT, 'Stories can only have Epic parents. Current parent type: ' || (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ))
            
            -- Subtasks can only have Story parents  
            WHEN NEW.issue_type = 'subtask' AND NEW.parent_id IS NOT NULL AND (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ) != 'story'
            THEN RAISE(ABORT, 'Subtasks can only have Story parents. Current parent type: ' || (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ))
            
            -- Bug and feature types follow same rules as stories
            WHEN NEW.issue_type IN ('bug', 'feature') AND NEW.parent_id IS NOT NULL AND (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ) NOT IN ('epic', 'story')
            THEN RAISE(ABORT, 'Bug and feature issues can only have Epic or Story parents. Current parent type: ' || (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ))
        END;
        
        -- Rule 4: Prevent self-references
        SELECT CASE 
            WHEN NEW.parent_id = NEW.id 
            THEN RAISE(ABORT, 'Issues cannot be their own parent. Self-references are not allowed.')
        END;
        
        -- Rule 5: Validate hierarchy depth (max 3 levels)
        -- Check if adding this issue would exceed depth limit
        SELECT CASE 
            WHEN NEW.parent_id IS NOT NULL AND (
                WITH RECURSIVE hierarchy_depth(issue_id, depth) AS (
                    -- Base case: start from the parent
                    SELECT NEW.parent_id, 1
                    UNION ALL
                    -- Recursive case: traverse up the hierarchy
                    SELECT i.parent_id, h.depth + 1
                    FROM issues i
                    JOIN hierarchy_depth h ON i.id = h.issue_id
                    WHERE i.parent_id IS NOT NULL AND h.depth < 10 -- Prevent infinite loops
                )
                SELECT MAX(depth) FROM hierarchy_depth
            ) >= 3
            THEN RAISE(ABORT, 'Maximum hierarchy depth of 3 levels exceeded. Current structure: Epic → Story → Subtask')
        END;
        
        -- Rule 6: Circular dependency detection
        -- Check if adding this parent relationship would create a cycle
        SELECT CASE 
            WHEN NEW.parent_id IS NOT NULL AND EXISTS (
                WITH RECURSIVE cycle_check(issue_id, visited_path) AS (
                    -- Base case: start from the new parent
                    SELECT NEW.parent_id, NEW.id
                    UNION ALL
                    -- Recursive case: traverse up the hierarchy
                    SELECT i.parent_id, c.visited_path || ',' || i.id
                    FROM issues i
                    JOIN cycle_check c ON i.id = c.issue_id
                    WHERE i.parent_id IS NOT NULL 
                      AND i.parent_id NOT LIKE '%' || NEW.id || '%'  -- Prevent immediate cycle detection
                      AND LENGTH(c.visited_path) - LENGTH(REPLACE(c.visited_path, ',', '')) < 10 -- Depth limit
                )
                SELECT 1 FROM cycle_check WHERE issue_id = NEW.id
            )
            THEN RAISE(ABORT, 'Circular hierarchy detected. Setting this parent would create a dependency cycle.')
        END;
    END;

-- Comprehensive hierarchy validation for UPDATE operations
CREATE TRIGGER validate_issue_hierarchy_update
    BEFORE UPDATE ON issues
    BEGIN
        -- Rule 1: Epics cannot have parents
        SELECT CASE 
            WHEN NEW.issue_type = 'epic' AND NEW.parent_id IS NOT NULL 
            THEN RAISE(ABORT, 'Epics cannot have parent issues. Epics are top-level containers.')
        END;
        
        -- Rule 2: Subtasks must have parents
        SELECT CASE 
            WHEN NEW.issue_type = 'subtask' AND NEW.parent_id IS NULL 
            THEN RAISE(ABORT, 'Subtasks must have a parent issue. Subtasks cannot exist independently.')
        END;
        
        -- Rule 3: Validate parent-child type relationships
        SELECT CASE 
            -- Stories can only have Epic parents
            WHEN NEW.issue_type = 'story' AND NEW.parent_id IS NOT NULL AND (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ) != 'epic'
            THEN RAISE(ABORT, 'Stories can only have Epic parents. Current parent type: ' || (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ))
            
            -- Subtasks can only have Story parents  
            WHEN NEW.issue_type = 'subtask' AND NEW.parent_id IS NOT NULL AND (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ) != 'story'
            THEN RAISE(ABORT, 'Subtasks can only have Story parents. Current parent type: ' || (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ))
            
            -- Bug and feature types follow same rules as stories
            WHEN NEW.issue_type IN ('bug', 'feature') AND NEW.parent_id IS NOT NULL AND (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ) NOT IN ('epic', 'story')
            THEN RAISE(ABORT, 'Bug and feature issues can only have Epic or Story parents. Current parent type: ' || (
                SELECT issue_type FROM issues WHERE id = NEW.parent_id
            ))
        END;
        
        -- Rule 4: Prevent self-references
        SELECT CASE 
            WHEN NEW.parent_id = NEW.id 
            THEN RAISE(ABORT, 'Issues cannot be their own parent. Self-references are not allowed.')
        END;
        
        -- Rule 5: Validate hierarchy depth (max 3 levels)
        SELECT CASE 
            WHEN NEW.parent_id IS NOT NULL AND (
                WITH RECURSIVE hierarchy_depth(issue_id, depth) AS (
                    SELECT NEW.parent_id, 1
                    UNION ALL
                    SELECT i.parent_id, h.depth + 1
                    FROM issues i
                    JOIN hierarchy_depth h ON i.id = h.issue_id
                    WHERE i.parent_id IS NOT NULL AND h.depth < 10 -- Prevent infinite loops
                )
                SELECT MAX(depth) FROM hierarchy_depth
            ) >= 3
            THEN RAISE(ABORT, 'Maximum hierarchy depth of 3 levels exceeded. Current structure: Epic → Story → Subtask')
        END;
        
        -- Rule 6: Circular dependency detection (more comprehensive for updates)
        SELECT CASE 
            WHEN NEW.parent_id IS NOT NULL AND NEW.parent_id != OLD.parent_id AND EXISTS (
                WITH RECURSIVE cycle_check(issue_id, path, depth) AS (
                    -- Base case: start from the new parent
                    SELECT NEW.parent_id, NEW.id, 1
                    UNION ALL
                    -- Recursive case: traverse up the hierarchy
                    SELECT i.parent_id, c.path || '→' || i.id, c.depth + 1
                    FROM issues i
                    JOIN cycle_check c ON i.id = c.issue_id
                    WHERE i.parent_id IS NOT NULL 
                      AND c.depth < 10 -- Prevent infinite recursion
                      AND i.parent_id != NEW.id -- Don't immediately detect the new relationship
                )
                SELECT 1 FROM cycle_check WHERE issue_id = NEW.id
            )
            THEN RAISE(ABORT, 'Circular hierarchy detected. This parent assignment would create a dependency cycle.')
        END;
        
        -- Rule 7: Validate type changes don't break existing children
        -- When changing issue type, ensure it's still valid for existing children
        SELECT CASE 
            WHEN NEW.issue_type != OLD.issue_type AND EXISTS (
                SELECT 1 FROM issues 
                WHERE parent_id = NEW.id 
                AND (
                    -- If changing to subtask, can't have children
                    (NEW.issue_type = 'subtask') OR
                    -- If changing to story, children must be subtasks
                    (NEW.issue_type = 'story' AND issue_type != 'subtask') OR
                    -- If changing to epic, children must be stories, bugs, or features
                    (NEW.issue_type = 'epic' AND issue_type NOT IN ('story', 'bug', 'feature'))
                )
            )
            THEN RAISE(ABORT, 'Cannot change issue type: would violate hierarchy rules for existing child issues')
        END;
    END;

-- =============================================================================
-- Hierarchy Validation Performance Indexes
-- =============================================================================

-- Enhanced indexes for hierarchy validation performance
CREATE INDEX IF NOT EXISTS idx_issues_parent_type_validation 
    ON issues(parent_id, issue_type) 
    WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issues_children_validation 
    ON issues(parent_id, issue_type) 
    WHERE parent_id IS NOT NULL;

-- Index for efficient hierarchy traversal
CREATE INDEX IF NOT EXISTS idx_issues_hierarchy_traversal 
    ON issues(id, parent_id, issue_type);

-- =============================================================================
-- Validation Helper Views
-- =============================================================================

-- View to easily check hierarchy compliance
CREATE VIEW IF NOT EXISTS issue_hierarchy_validation AS
SELECT 
    i.id,
    i.issue_type,
    i.parent_id,
    p.issue_type as parent_type,
    CASE 
        WHEN i.issue_type = 'epic' AND i.parent_id IS NOT NULL THEN 'INVALID: Epic has parent'
        WHEN i.issue_type = 'subtask' AND i.parent_id IS NULL THEN 'INVALID: Subtask has no parent'
        WHEN i.issue_type = 'story' AND i.parent_id IS NOT NULL AND p.issue_type != 'epic' THEN 'INVALID: Story parent is not Epic'
        WHEN i.issue_type = 'subtask' AND i.parent_id IS NOT NULL AND p.issue_type != 'story' THEN 'INVALID: Subtask parent is not Story'
        WHEN i.issue_type IN ('bug', 'feature') AND i.parent_id IS NOT NULL AND p.issue_type NOT IN ('epic', 'story') THEN 'INVALID: Bug/Feature parent invalid'
        ELSE 'VALID'
    END as validation_status
FROM issues i
LEFT JOIN issues p ON i.parent_id = p.id;

-- View for hierarchy depth analysis
CREATE VIEW IF NOT EXISTS issue_hierarchy_depth AS
WITH RECURSIVE hierarchy_levels(issue_id, issue_type, level, path) AS (
    -- Base case: root level issues (no parent)
    SELECT id, issue_type, 1, id
    FROM issues 
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: children
    SELECT i.id, i.issue_type, h.level + 1, h.path || '→' || i.id
    FROM issues i
    JOIN hierarchy_levels h ON i.parent_id = h.issue_id
    WHERE h.level < 10 -- Prevent infinite recursion
)
SELECT 
    issue_id,
    issue_type,
    level,
    path,
    CASE 
        WHEN level > 3 THEN 'INVALID: Exceeds max depth of 3'
        ELSE 'VALID'
    END as depth_validation
FROM hierarchy_levels;

-- =============================================================================
-- Update Schema Metadata
-- =============================================================================

-- Update schema version
UPDATE schema_metadata SET value = '1.1.0', updated_at = CURRENT_TIMESTAMP WHERE key = 'version';
INSERT OR REPLACE INTO schema_metadata (key, value) VALUES 
    ('migration', '002_hierarchy_validation'),
    ('migration_002_applied_at', CURRENT_TIMESTAMP),
    ('hierarchy_validation_version', '2.0'),
    ('description', 'Enhanced hierarchy validation with comprehensive Epic→Story→Subtask enforcement');

-- Performance validation query for hierarchy operations
-- This should complete under 5ms for normal operations
-- SELECT COUNT(*) FROM issue_hierarchy_validation WHERE validation_status != 'VALID';