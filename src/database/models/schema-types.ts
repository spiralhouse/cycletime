/**
 * JCVD Database Schema Types
 * TypeScript interfaces for all database entities
 */

// =============================================================================
// Core Entity Types
// =============================================================================

/**
 * Project - Root container for all project data
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  key?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Workflow state types following Linear patterns
 */
export type WorkflowStateType = 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';

/**
 * WorkflowState - Configurable issue states
 */
export interface WorkflowState {
  id: string;
  project_id: string;
  name: string;
  type: WorkflowStateType;
  position: number;
  color: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Issue types following Linear hierarchy
 */
export type IssueType = 'epic' | 'story' | 'subtask' | 'bug' | 'feature';

/**
 * Issue priority levels (0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low)
 */
export type IssuePriority = 0 | 1 | 2 | 3 | 4;

/**
 * Issue - Core issue entity with hierarchy support
 */
export interface Issue {
  id: string;
  project_id: string;
  parent_id?: string;
  title: string;
  description?: string;
  state_id: string;
  priority: IssuePriority;
  estimate?: number;
  issue_type: IssueType;
  assignee_id?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Dependency relationship types
 */
export type DependencyType = 'blocks' | 'duplicate' | 'relates';

/**
 * IssueDependency - Task orchestration relationships
 */
export interface IssueDependency {
  id: string;
  blocker_id: string;
  blocked_id: string;
  dependency_type: DependencyType;
  created_at: Date;
}

/**
 * Label - Issue categorization
 */
export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * IssueLabel - Many-to-many relationship between issues and labels
 */
export interface IssueLabel {
  issue_id: string;
  label_id: string;
  created_at: Date;
}

/**
 * IssueComment - Activity tracking and collaboration
 */
export interface IssueComment {
  id: string;
  issue_id: string;
  body: string;
  author_id: string;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Input Types for CRUD Operations
// =============================================================================

export interface CreateProjectInput {
  id: string;
  name: string;
  description?: string;
  key?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  key?: string;
}

export interface CreateWorkflowStateInput {
  id: string;
  project_id: string;
  name: string;
  type: WorkflowStateType;
  position?: number;
  color?: string;
}

export interface CreateIssueInput {
  id: string;
  project_id: string;
  parent_id?: string;
  title: string;
  description?: string;
  state_id: string;
  priority?: IssuePriority;
  estimate?: number;
  issue_type: IssueType;
  assignee_id?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  state_id?: string;
  priority?: IssuePriority;
  estimate?: number;
  assignee_id?: string;
  parent_id?: string;
}

export interface CreateDependencyInput {
  id: string;
  blocker_id: string;
  blocked_id: string;
  dependency_type?: DependencyType;
}

export interface CreateLabelInput {
  id: string;
  project_id: string;
  name: string;
  color?: string;
  description?: string;
}

export interface CreateCommentInput {
  id: string;
  issue_id: string;
  body: string;
  author_id: string;
}

// =============================================================================
// Query Filter Types
// =============================================================================

export interface IssueFilters {
  project_id?: string;
  parent_id?: string;
  state_id?: string;
  issue_type?: IssueType;
  assignee_id?: string;
  priority?: IssuePriority;
  has_estimate?: boolean;
  created_after?: Date;
  created_before?: Date;
  updated_after?: Date;
  updated_before?: Date;
  search?: string;
  labels?: string[];
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'updated_at' | 'priority' | 'title';
  order_direction?: 'asc' | 'desc';
}

export interface ProjectFilters {
  name?: string;
  key?: string;
  created_after?: Date;
  created_before?: Date;
  limit?: number;
  offset?: number;
}

export interface DependencyFilters {
  project_id?: string;
  blocker_id?: string;
  blocked_id?: string;
  dependency_type?: DependencyType;
}

// =============================================================================
// Schema Metadata Types
// =============================================================================

export interface SchemaMetadata {
  key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// Hierarchy Validation Types
// =============================================================================

/**
 * Hierarchy validation result
 */
export interface HierarchyValidationResult {
  isValid: boolean;
  errors: HierarchyValidationError[];
  warnings: HierarchyValidationWarning[];
}

/**
 * Hierarchy validation error
 */
export interface HierarchyValidationError {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, any>;
}

/**
 * Hierarchy validation warning
 */
export interface HierarchyValidationWarning {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, any>;
}

/**
 * Hierarchy tree node for visualization
 */
export interface HierarchyTreeNode {
  issue: Issue;
  children: HierarchyTreeNode[];
  depth: number;
  path: string[];
}

/**
 * Hierarchy validation rule definition
 */
export interface HierarchyRule {
  code: string;
  description: string;
  validator: (issue: Issue, context: Issue[]) => boolean;
  errorMessage: string;
}

// =============================================================================
// Utility Types for Database Operations
// =============================================================================

/**
 * Database row type for raw SQLite results
 */
export type DatabaseRow = Record<string, any>;

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = () => T | Promise<T>;

/**
 * Migration definition
 */
export interface Migration {
  version: string;
  name: string;
  up: string;
  down?: string;
  description?: string;
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  path: string;
  enableWAL?: boolean;
  cacheSize?: number;
  timeout?: number;
  enableForeignKeys?: boolean;
  enableTriggers?: boolean;
}
