/**
 * JCVD SQLite Optimized Query Definitions
 * High-performance, pre-optimized SQL queries for all provider operations
 * 
 * This module contains all SQL queries used by the SQLite provider,
 * optimized for performance with proper indexing and query planning.
 */

// =============================================================================
// Project Queries
// =============================================================================

export const PROJECT_QUERIES = {
  // Create project
  CREATE: `
    INSERT INTO projects (id, name, description, key, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,

  // Get project by ID
  GET_BY_ID: `
    SELECT 
      id, name, description, key, created_at, updated_at
    FROM projects 
    WHERE id = ?
  `,

  // List projects with optional filters
  LIST: `
    SELECT 
      id, name, description, key, created_at, updated_at
    FROM projects
    WHERE 
      (? IS NULL OR name LIKE '%' || ? || '%')
      AND (? IS NULL OR created_at >= ?)
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `,

  // Update project
  UPDATE: `
    UPDATE projects 
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        key = COALESCE(?, key),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // Delete project (cascading handled by foreign keys)
  DELETE: `
    DELETE FROM projects WHERE id = ?
  `,

  // Check if project exists
  EXISTS: `
    SELECT 1 FROM projects WHERE id = ? LIMIT 1
  `,

  // Get project statistics
  STATS: `
    SELECT 
      p.id,
      p.name,
      COUNT(DISTINCT i.id) as total_issues,
      COUNT(DISTINCT CASE WHEN ws.type = 'completed' THEN i.id END) as completed_issues,
      COUNT(DISTINCT CASE WHEN ws.type = 'started' THEN i.id END) as in_progress_issues,
      COUNT(DISTINCT CASE WHEN i.issue_type = 'epic' THEN i.id END) as epics,
      COUNT(DISTINCT CASE WHEN i.issue_type = 'story' THEN i.id END) as stories,
      COUNT(DISTINCT CASE WHEN i.issue_type = 'subtask' THEN i.id END) as subtasks
    FROM projects p
    LEFT JOIN issues i ON p.id = i.project_id
    LEFT JOIN workflow_states ws ON i.state_id = ws.id
    WHERE p.id = ?
    GROUP BY p.id, p.name
  `
} as const

// =============================================================================
// Issue Queries
// =============================================================================

export const ISSUE_QUERIES = {
  // Create issue
  CREATE: `
    INSERT INTO issues (
      id, project_id, parent_id, title, description, state_id, 
      priority, estimate, issue_type, assignee_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,

  // Get issue by ID with relationships
  GET_BY_ID: `
    SELECT 
      i.id, i.project_id, i.parent_id, i.title, i.description,
      i.state_id, i.priority, i.estimate, i.issue_type, i.assignee_id,
      i.created_at, i.updated_at,
      ws.name as state_name, ws.type as state_type, ws.color as state_color,
      p.name as project_name
    FROM issues i
    JOIN workflow_states ws ON i.state_id = ws.id
    JOIN projects p ON i.project_id = p.id
    WHERE i.id = ?
  `,

  // List issues with comprehensive filtering
  LIST: `
    SELECT 
      i.id, i.project_id, i.parent_id, i.title, i.description,
      i.state_id, i.priority, i.estimate, i.issue_type, i.assignee_id,
      i.created_at, i.updated_at,
      ws.name as state_name, ws.type as state_type, ws.color as state_color
    FROM issues i
    JOIN workflow_states ws ON i.state_id = ws.id
    WHERE 
      (? IS NULL OR i.project_id = ?)
      AND (? IS NULL OR i.parent_id = ?)
      AND (? IS NULL OR i.state_id = ?)
      AND (? IS NULL OR i.issue_type = ?)
      AND (? IS NULL OR i.assignee_id = ?)
      AND (? IS NULL OR i.priority = ?)
      AND (? IS NULL OR i.estimate IS NOT NULL)
      AND (? IS NULL OR i.created_at >= ?)
      AND (? IS NULL OR i.created_at <= ?)
      AND (? IS NULL OR i.updated_at >= ?)
      AND (? IS NULL OR i.updated_at <= ?)
      AND (? IS NULL OR (i.title LIKE '%' || ? || '%' OR i.description LIKE '%' || ? || '%'))
    ORDER BY 
      CASE WHEN ? = 'created_at' THEN i.created_at END ASC,
      CASE WHEN ? = 'created_at' AND ? = 'desc' THEN i.created_at END DESC,
      CASE WHEN ? = 'updated_at' THEN i.updated_at END ASC,
      CASE WHEN ? = 'updated_at' AND ? = 'desc' THEN i.updated_at END DESC,
      CASE WHEN ? = 'priority' THEN i.priority END ASC,
      CASE WHEN ? = 'priority' AND ? = 'desc' THEN i.priority END DESC,
      CASE WHEN ? = 'title' THEN i.title END ASC,
      CASE WHEN ? = 'title' AND ? = 'desc' THEN i.title END DESC,
      i.created_at DESC
    LIMIT ? OFFSET ?
  `,

  // Update issue
  UPDATE: `
    UPDATE issues 
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        state_id = COALESCE(?, state_id),
        priority = COALESCE(?, priority),
        estimate = COALESCE(?, estimate),
        assignee_id = COALESCE(?, assignee_id),
        parent_id = COALESCE(?, parent_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // Delete issue
  DELETE: `
    DELETE FROM issues WHERE id = ?
  `,

  // Check if issue exists
  EXISTS: `
    SELECT 1 FROM issues WHERE id = ? LIMIT 1
  `,

  // Get issue children (direct children only)
  GET_CHILDREN: `
    SELECT 
      i.id, i.project_id, i.parent_id, i.title, i.description,
      i.state_id, i.priority, i.estimate, i.issue_type, i.assignee_id,
      i.created_at, i.updated_at,
      ws.name as state_name, ws.type as state_type, ws.color as state_color
    FROM issues i
    JOIN workflow_states ws ON i.state_id = ws.id
    WHERE i.parent_id = ?
    ORDER BY i.created_at ASC
  `,

  // Get issue hierarchy path (from root to current issue)
  GET_HIERARCHY_PATH: `
    WITH RECURSIVE issue_path AS (
      -- Base case: start with the target issue
      SELECT id, parent_id, title, issue_type, 0 as level
      FROM issues 
      WHERE id = ?
      
      UNION ALL
      
      -- Recursive case: get parent issues
      SELECT i.id, i.parent_id, i.title, i.issue_type, ip.level + 1
      FROM issues i
      JOIN issue_path ip ON i.id = ip.parent_id
      WHERE ip.level < 10 -- Prevent infinite loops
    )
    SELECT id, parent_id, title, issue_type, level
    FROM issue_path
    ORDER BY level DESC
  `,

  // Get all issues for a project (for dependency analysis)
  GET_PROJECT_ISSUES: `
    SELECT 
      i.id, i.parent_id, i.title, i.issue_type, i.state_id, i.estimate,
      ws.type as state_type
    FROM issues i
    JOIN workflow_states ws ON i.state_id = ws.id
    WHERE i.project_id = ?
  `,

  // Get available issues (not blocked by dependencies and not completed)
  GET_AVAILABLE_ISSUES: `
    SELECT DISTINCT
      i.id, i.project_id, i.parent_id, i.title, i.description,
      i.state_id, i.priority, i.estimate, i.issue_type, i.assignee_id,
      i.created_at, i.updated_at,
      ws.name as state_name, ws.type as state_type, ws.color as state_color
    FROM issues i
    JOIN workflow_states ws ON i.state_id = ws.id
    WHERE 
      i.project_id = ?
      AND (? IS NULL OR i.assignee_id = ?)
      AND ws.type NOT IN ('completed', 'canceled')
      AND i.id NOT IN (
        -- Exclude issues that are blocked by incomplete dependencies
        SELECT DISTINCT d.blocked_id
        FROM issue_dependencies d
        JOIN issues blocker ON d.blocker_id = blocker.id
        JOIN workflow_states blocker_ws ON blocker.state_id = blocker_ws.id
        WHERE blocker_ws.type NOT IN ('completed', 'canceled')
      )
    ORDER BY 
      i.priority ASC, 
      i.created_at ASC
  `
} as const

// =============================================================================
// Dependency Queries
// =============================================================================

export const DEPENDENCY_QUERIES = {
  // Create dependency
  CREATE: `
    INSERT INTO issue_dependencies (id, blocker_id, blocked_id, dependency_type, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `,

  // Get dependency by ID
  GET_BY_ID: `
    SELECT 
      d.id, d.blocker_id, d.blocked_id, d.dependency_type, d.created_at,
      blocker.title as blocker_title,
      blocked.title as blocked_title
    FROM issue_dependencies d
    JOIN issues blocker ON d.blocker_id = blocker.id
    JOIN issues blocked ON d.blocked_id = blocked.id
    WHERE d.id = ?
  `,

  // Delete dependency
  DELETE: `
    DELETE FROM issue_dependencies WHERE id = ?
  `,

  // Get all dependencies for a project (for graph analysis)
  GET_PROJECT_DEPENDENCIES: `
    SELECT 
      d.id, d.blocker_id, d.blocked_id, d.dependency_type,
      blocker.title as blocker_title, blocker.issue_type as blocker_type,
      blocked.title as blocked_title, blocked.issue_type as blocked_type,
      blocker_ws.type as blocker_state_type,
      blocked_ws.type as blocked_state_type
    FROM issue_dependencies d
    JOIN issues blocker ON d.blocker_id = blocker.id
    JOIN issues blocked ON d.blocked_id = blocked.id
    JOIN workflow_states blocker_ws ON blocker.state_id = blocker_ws.id
    JOIN workflow_states blocked_ws ON blocked.state_id = blocked_ws.id
    WHERE blocker.project_id = ?
  `,

  // Get dependencies blocking a specific issue
  GET_BLOCKERS: `
    SELECT 
      d.id, d.blocker_id, d.blocked_id, d.dependency_type,
      blocker.title as blocker_title,
      blocker_ws.type as blocker_state_type
    FROM issue_dependencies d
    JOIN issues blocker ON d.blocker_id = blocker.id
    JOIN workflow_states blocker_ws ON blocker.state_id = blocker_ws.id
    WHERE d.blocked_id = ?
  `,

  // Get dependencies blocked by a specific issue
  GET_BLOCKED: `
    SELECT 
      d.id, d.blocker_id, d.blocked_id, d.dependency_type,
      blocked.title as blocked_title,
      blocked_ws.type as blocked_state_type
    FROM issue_dependencies d
    JOIN issues blocked ON d.blocked_id = blocked.id
    JOIN workflow_states blocked_ws ON blocked.state_id = blocked_ws.id
    WHERE d.blocker_id = ?
  `,

  // Check for existing dependency (to prevent duplicates)
  EXISTS: `
    SELECT 1 FROM issue_dependencies 
    WHERE blocker_id = ? AND blocked_id = ?
    LIMIT 1
  `
} as const

// =============================================================================
// Workflow State Queries
// =============================================================================

export const WORKFLOW_QUERIES = {
  // Create workflow state
  CREATE: `
    INSERT INTO workflow_states (id, project_id, name, type, position, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,

  // Get workflow state by ID
  GET_BY_ID: `
    SELECT id, project_id, name, type, position, color, created_at, updated_at
    FROM workflow_states
    WHERE id = ?
  `,

  // Get all workflow states for a project
  LIST_BY_PROJECT: `
    SELECT id, project_id, name, type, position, color, created_at, updated_at
    FROM workflow_states
    WHERE project_id = ?
    ORDER BY position ASC, created_at ASC
  `,

  // Update workflow state
  UPDATE: `
    UPDATE workflow_states 
    SET name = COALESCE(?, name),
        type = COALESCE(?, type),
        position = COALESCE(?, position),
        color = COALESCE(?, color),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // Delete workflow state (only if no issues use it)
  DELETE: `
    DELETE FROM workflow_states 
    WHERE id = ? 
    AND NOT EXISTS (SELECT 1 FROM issues WHERE state_id = ?)
  `
} as const

// =============================================================================
// Label Queries
// =============================================================================

export const LABEL_QUERIES = {
  // Create label
  CREATE: `
    INSERT INTO labels (id, project_id, name, color, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,

  // Get label by ID
  GET_BY_ID: `
    SELECT id, project_id, name, color, description, created_at, updated_at
    FROM labels
    WHERE id = ?
  `,

  // List labels by project
  LIST_BY_PROJECT: `
    SELECT id, project_id, name, color, description, created_at, updated_at
    FROM labels
    WHERE project_id = ?
    ORDER BY name ASC
  `,

  // Get labels for an issue
  GET_ISSUE_LABELS: `
    SELECT l.id, l.project_id, l.name, l.color, l.description, l.created_at, l.updated_at
    FROM labels l
    JOIN issue_labels il ON l.id = il.label_id
    WHERE il.issue_id = ?
    ORDER BY l.name ASC
  `,

  // Add label to issue
  ADD_TO_ISSUE: `
    INSERT OR IGNORE INTO issue_labels (issue_id, label_id, created_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `,

  // Remove label from issue
  REMOVE_FROM_ISSUE: `
    DELETE FROM issue_labels 
    WHERE issue_id = ? AND label_id = ?
  `,

  // Update label
  UPDATE: `
    UPDATE labels 
    SET name = COALESCE(?, name),
        color = COALESCE(?, color),
        description = COALESCE(?, description),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // Delete label (cascading handled by foreign keys)
  DELETE: `
    DELETE FROM labels WHERE id = ?
  `
} as const

// =============================================================================
// Comment Queries
// =============================================================================

export const COMMENT_QUERIES = {
  // Create comment
  CREATE: `
    INSERT INTO issue_comments (id, issue_id, body, author_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,

  // Get comment by ID
  GET_BY_ID: `
    SELECT id, issue_id, body, author_id, created_at, updated_at
    FROM issue_comments
    WHERE id = ?
  `,

  // List comments for an issue
  LIST_BY_ISSUE: `
    SELECT id, issue_id, body, author_id, created_at, updated_at
    FROM issue_comments
    WHERE issue_id = ?
    ORDER BY created_at ASC
  `,

  // Update comment
  UPDATE: `
    UPDATE issue_comments 
    SET body = COALESCE(?, body),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // Delete comment
  DELETE: `
    DELETE FROM issue_comments WHERE id = ?
  `
} as const

// =============================================================================
// Analytics and Recommendation Queries
// =============================================================================

export const ANALYTICS_QUERIES = {
  // Get project progress statistics
  PROJECT_PROGRESS: `
    SELECT 
      COUNT(DISTINCT i.id) as total_issues,
      COUNT(DISTINCT CASE WHEN ws.type = 'backlog' THEN i.id END) as backlog_issues,
      COUNT(DISTINCT CASE WHEN ws.type = 'unstarted' THEN i.id END) as todo_issues,
      COUNT(DISTINCT CASE WHEN ws.type = 'started' THEN i.id END) as in_progress_issues,
      COUNT(DISTINCT CASE WHEN ws.type = 'completed' THEN i.id END) as completed_issues,
      COUNT(DISTINCT CASE WHEN ws.type = 'canceled' THEN i.id END) as canceled_issues,
      SUM(CASE WHEN i.estimate IS NOT NULL THEN i.estimate ELSE 0 END) as total_estimate,
      SUM(CASE WHEN ws.type = 'completed' AND i.estimate IS NOT NULL THEN i.estimate ELSE 0 END) as completed_estimate
    FROM issues i
    JOIN workflow_states ws ON i.state_id = ws.id
    WHERE i.project_id = ?
  `,

  // Get issue velocity (completed issues per time period)
  ISSUE_VELOCITY: `
    SELECT 
      DATE(updated_at) as completion_date,
      COUNT(*) as completed_count,
      SUM(COALESCE(estimate, 0)) as completed_points
    FROM issues i
    JOIN workflow_states ws ON i.state_id = ws.id
    WHERE 
      i.project_id = ?
      AND ws.type = 'completed'
      AND i.updated_at >= datetime('now', '-30 days')
    GROUP BY DATE(updated_at)
    ORDER BY completion_date DESC
  `,

  // Get dependency bottlenecks (issues blocking the most other issues)
  DEPENDENCY_BOTTLENECKS: `
    SELECT 
      blocker.id,
      blocker.title,
      blocker.issue_type,
      COUNT(d.blocked_id) as blocked_count,
      ws.type as state_type
    FROM issue_dependencies d
    JOIN issues blocker ON d.blocker_id = blocker.id
    JOIN workflow_states ws ON blocker.state_id = ws.id
    WHERE 
      blocker.project_id = ?
      AND ws.type NOT IN ('completed', 'canceled')
    GROUP BY blocker.id, blocker.title, blocker.issue_type, ws.type
    HAVING blocked_count > 0
    ORDER BY blocked_count DESC, blocker.priority ASC
    LIMIT 10
  `,

  // Get recommended next tasks based on priority and dependencies
  TASK_RECOMMENDATIONS: `
    SELECT DISTINCT
      i.id, i.title, i.issue_type, i.priority, i.estimate,
      ws.name as state_name, ws.type as state_type,
      -- Score calculation: priority (inverse) + has estimate + not epic
      (5 - i.priority) * 2 + 
      CASE WHEN i.estimate IS NOT NULL THEN 3 ELSE 0 END +
      CASE WHEN i.issue_type IN ('subtask', 'story') THEN 2 ELSE 0 END +
      CASE WHEN i.issue_type = 'epic' THEN -1 ELSE 0 END as recommendation_score
    FROM issues i
    JOIN workflow_states ws ON i.state_id = ws.id
    WHERE 
      i.project_id = ?
      AND (? IS NULL OR i.assignee_id = ?)
      AND ws.type IN ('unstarted', 'started')
      -- Not blocked by incomplete dependencies
      AND i.id NOT IN (
        SELECT DISTINCT d.blocked_id
        FROM issue_dependencies d
        JOIN issues blocker ON d.blocker_id = blocker.id
        JOIN workflow_states blocker_ws ON blocker.state_id = blocker_ws.id
        WHERE blocker_ws.type NOT IN ('completed', 'canceled')
      )
      -- Focus area filter (if provided)
      AND (? IS NULL OR i.title LIKE '%' || ? || '%' OR i.description LIKE '%' || ? || '%')
    ORDER BY recommendation_score DESC, i.priority ASC, i.created_at ASC
    LIMIT 5
  `
} as const

// =============================================================================
// Validation and Integrity Queries
// =============================================================================

export const VALIDATION_QUERIES = {
  // Check for circular dependencies using recursive CTE
  CIRCULAR_DEPENDENCIES: `
    WITH RECURSIVE dependency_path AS (
      -- Base case: all direct dependencies
      SELECT 
        blocker_id,
        blocked_id,
        blocker_id as root_blocker,
        blocked_id as path,
        1 as depth
      FROM issue_dependencies
      
      UNION ALL
      
      -- Recursive case: follow dependency chains
      SELECT 
        d.blocker_id,
        d.blocked_id,
        dp.root_blocker,
        dp.path || ',' || d.blocked_id,
        dp.depth + 1
      FROM issue_dependencies d
      JOIN dependency_path dp ON d.blocker_id = dp.blocked_id
      WHERE 
        dp.depth < 20  -- Prevent infinite recursion
        AND dp.path NOT LIKE '%' || d.blocked_id || '%'  -- Prevent cycles in path
    )
    SELECT DISTINCT
      root_blocker as cycle_start,
      blocked_id as cycle_end,
      path as cycle_path
    FROM dependency_path
    WHERE blocked_id = root_blocker
  `,

  // Check hierarchy violations
  HIERARCHY_VIOLATIONS: `
    SELECT 
      i.id,
      i.title,
      i.issue_type,
      i.parent_id,
      parent.issue_type as parent_type,
      CASE 
        WHEN i.issue_type = 'epic' AND i.parent_id IS NOT NULL 
          THEN 'Epics cannot have parents'
        WHEN i.issue_type = 'subtask' AND i.parent_id IS NULL 
          THEN 'Subtasks must have parents'
        WHEN i.issue_type = 'story' AND parent.issue_type != 'epic' 
          THEN 'Stories must have epic parents'
        WHEN i.issue_type = 'subtask' AND parent.issue_type != 'story' 
          THEN 'Subtasks must have story parents'
        ELSE NULL
      END as violation_reason
    FROM issues i
    LEFT JOIN issues parent ON i.parent_id = parent.id
    WHERE i.project_id = ?
    AND (
      (i.issue_type = 'epic' AND i.parent_id IS NOT NULL) OR
      (i.issue_type = 'subtask' AND i.parent_id IS NULL) OR
      (i.issue_type = 'story' AND parent.issue_type != 'epic') OR
      (i.issue_type = 'subtask' AND parent.issue_type != 'story')
    )
  `,

  // Check orphaned entities
  ORPHANED_ENTITIES: `
    SELECT 
      'issue' as entity_type,
      i.id as entity_id,
      i.title as entity_name,
      'Parent issue not found' as issue_reason
    FROM issues i
    WHERE 
      i.project_id = ?
      AND i.parent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM issues parent WHERE parent.id = i.parent_id)
    
    UNION ALL
    
    SELECT 
      'issue' as entity_type,
      i.id as entity_id,
      i.title as entity_name,
      'Workflow state not found' as issue_reason
    FROM issues i
    WHERE 
      i.project_id = ?
      AND NOT EXISTS (SELECT 1 FROM workflow_states ws WHERE ws.id = i.state_id)
  `
} as const

// =============================================================================
// Utility Functions for Query Building
// =============================================================================

/**
 * Build dynamic WHERE clause for issue filtering
 */
export function buildIssueFilterQuery(filters: any): { 
  sql: string 
  params: any[] 
} {
  const conditions: string[] = []
  const params: any[] = []

  // Add parameter pairs for nullable filters
  if (filters.project_id !== undefined) {
    conditions.push('i.project_id = ?')
    params.push(filters.project_id)
  }

  if (filters.parent_id !== undefined) {
    if (filters.parent_id === null) {
      conditions.push('i.parent_id IS NULL')
    } else {
      conditions.push('i.parent_id = ?')
      params.push(filters.parent_id)
    }
  }

  if (filters.state_id !== undefined) {
    conditions.push('i.state_id = ?')
    params.push(filters.state_id)
  }

  if (filters.issue_type !== undefined) {
    conditions.push('i.issue_type = ?')
    params.push(filters.issue_type)
  }

  if (filters.assignee_id !== undefined) {
    if (filters.assignee_id === null) {
      conditions.push('i.assignee_id IS NULL')
    } else {
      conditions.push('i.assignee_id = ?')
      params.push(filters.assignee_id)
    }
  }

  if (filters.priority !== undefined) {
    conditions.push('i.priority = ?')
    params.push(filters.priority)
  }

  if (filters.has_estimate !== undefined) {
    if (filters.has_estimate) {
      conditions.push('i.estimate IS NOT NULL')
    } else {
      conditions.push('i.estimate IS NULL')
    }
  }

  if (filters.created_after) {
    conditions.push('i.created_at >= ?')
    params.push(filters.created_after.toISOString())
  }

  if (filters.created_before) {
    conditions.push('i.created_at <= ?')
    params.push(filters.created_before.toISOString())
  }

  if (filters.updated_after) {
    conditions.push('i.updated_at >= ?')
    params.push(filters.updated_after.toISOString())
  }

  if (filters.updated_before) {
    conditions.push('i.updated_at <= ?')
    params.push(filters.updated_before.toISOString())
  }

  if (filters.search) {
    conditions.push('(i.title LIKE ? OR i.description LIKE ?)')
    const searchPattern = `%${filters.search}%`
    params.push(searchPattern, searchPattern)
  }

  const whereClause = conditions.length > 0 ? 
    `WHERE ${conditions.join(' AND ')}` : ''

  return { sql: whereClause, params }
}