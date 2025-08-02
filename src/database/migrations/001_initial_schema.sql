-- JCVD SQLite Database Schema - Initial Migration
-- Linear-inspired structure optimized for embedded usage
-- Version: 1.0.0
-- Migration: 001

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =============================================================================
-- Core Tables
-- =============================================================================

-- Projects table - Root container for all project data
CREATE TABLE projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    key TEXT UNIQUE, -- Short identifier (e.g., 'PROJ')
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Workflow states table - Configurable issue states
CREATE TABLE workflow_states (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('backlog', 'unstarted', 'started', 'completed', 'canceled')),
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#000000',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

-- Issues table with strict hierarchy support
CREATE TABLE issues (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES issues(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    state_id TEXT NOT NULL REFERENCES workflow_states(id),
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 0 AND priority <= 4),
    estimate INTEGER CHECK (estimate > 0),
    issue_type TEXT NOT NULL CHECK (issue_type IN ('epic', 'story', 'subtask', 'bug', 'feature')),
    assignee_id TEXT, -- User ID reference (external)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Issue dependencies for task orchestration
CREATE TABLE issue_dependencies (
    id TEXT PRIMARY KEY NOT NULL,
    blocker_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'duplicate', 'relates')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id),
    CHECK(blocker_id != blocked_id) -- Prevent self-dependencies
);

-- Labels for issue categorization
CREATE TABLE labels (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#cccccc',
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

-- Issue-label many-to-many relationship
CREATE TABLE issue_labels (
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (issue_id, label_id)
);

-- Issue comments for activity tracking
CREATE TABLE issue_comments (
    id TEXT PRIMARY KEY NOT NULL,
    issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    author_id TEXT NOT NULL, -- User ID reference (external)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Performance Indexes
-- =============================================================================

-- Project-based queries
CREATE INDEX idx_workflow_states_project_id ON workflow_states(project_id);
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_labels_project_id ON labels(project_id);

-- Hierarchy and relationship indexes
CREATE INDEX idx_issues_parent_id ON issues(parent_id);
CREATE INDEX idx_issues_type_parent ON issues(issue_type, parent_id);
CREATE INDEX idx_issue_dependencies_blocker ON issue_dependencies(blocker_id);
CREATE INDEX idx_issue_dependencies_blocked ON issue_dependencies(blocked_id);

-- State and workflow indexes
CREATE INDEX idx_issues_state_id ON issues(state_id);
CREATE INDEX idx_issues_assignee_id ON issues(assignee_id);
CREATE INDEX idx_workflow_states_type ON workflow_states(type);

-- Activity and temporal indexes
CREATE INDEX idx_issues_created_at ON issues(created_at);
CREATE INDEX idx_issues_updated_at ON issues(updated_at);
CREATE INDEX idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX idx_issue_comments_created_at ON issue_comments(created_at);

-- Label relationship indexes
CREATE INDEX idx_issue_labels_issue_id ON issue_labels(issue_id);
CREATE INDEX idx_issue_labels_label_id ON issue_labels(label_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_issues_project_type_state ON issues(project_id, issue_type, state_id);
CREATE INDEX idx_issues_parent_type_state ON issues(parent_id, issue_type, state_id);
CREATE INDEX idx_workflow_states_project_position ON workflow_states(project_id, position);

-- =============================================================================
-- Data Integrity Triggers
-- =============================================================================

-- Update timestamps automatically
CREATE TRIGGER update_projects_timestamp 
    AFTER UPDATE ON projects
    BEGIN
        UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_workflow_states_timestamp 
    AFTER UPDATE ON workflow_states
    BEGIN
        UPDATE workflow_states SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_issues_timestamp 
    AFTER UPDATE ON issues
    BEGIN
        UPDATE issues SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_labels_timestamp 
    AFTER UPDATE ON labels
    BEGIN
        UPDATE labels SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_issue_comments_timestamp 
    AFTER UPDATE ON issue_comments
    BEGIN
        UPDATE issue_comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Hierarchy validation triggers
CREATE TRIGGER validate_issue_hierarchy_insert
    BEFORE INSERT ON issues
    BEGIN
        -- Epics cannot have parents
        SELECT CASE 
            WHEN NEW.issue_type = 'epic' AND NEW.parent_id IS NOT NULL 
            THEN RAISE(ABORT, 'Epics cannot have parent issues')
        END;
        
        -- Subtasks must have parents
        SELECT CASE 
            WHEN NEW.issue_type = 'subtask' AND NEW.parent_id IS NULL 
            THEN RAISE(ABORT, 'Subtasks must have a parent issue')
        END;
    END;

CREATE TRIGGER validate_issue_hierarchy_update
    BEFORE UPDATE ON issues
    BEGIN
        -- Epics cannot have parents
        SELECT CASE 
            WHEN NEW.issue_type = 'epic' AND NEW.parent_id IS NOT NULL 
            THEN RAISE(ABORT, 'Epics cannot have parent issues')
        END;
        
        -- Subtasks must have parents
        SELECT CASE 
            WHEN NEW.issue_type = 'subtask' AND NEW.parent_id IS NULL 
            THEN RAISE(ABORT, 'Subtasks must have a parent issue')
        END;
    END;

-- =============================================================================
-- Schema Metadata
-- =============================================================================

-- Schema version tracking
CREATE TABLE schema_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_metadata (key, value) VALUES 
    ('version', '1.0.0'),
    ('migration', '001_initial_schema'),
    ('created_at', CURRENT_TIMESTAMP),
    ('description', 'Initial JCVD database schema with Linear-inspired structure');

-- Performance validation query (should complete under 100ms for 10,000+ issues)
-- SELECT COUNT(*) FROM issues i 
-- JOIN workflow_states ws ON i.state_id = ws.id 
-- WHERE i.project_id = ? AND ws.type = 'started';