/**
 * JCVD SQLite Database Operations Layer
 * High-performance database operations with optimized queries and caching
 * 
 * This module provides a high-level database operations interface that sits
 * between the SQLite provider and the raw database connection, implementing
 * caching, batch operations, and performance optimizations.
 */

import type {
  Project,
  Issue,
  EnhancedIssue,
  WorkflowState,
  Label,
  IssueComment,
  IssueDependency,
  Dependency,
  IssueFilters,
  CreateProjectInput,
  CreateIssueInput,
  UpdateProjectInput,
  UpdateIssueInput,
  CreateLabelInput,
  DependencyType,
  ProviderError
} from '../types.js'

import type { SQLiteConnectionManager } from './sqlite-connection.js'
import { 
  PROJECT_QUERIES,
  ISSUE_QUERIES,
  DEPENDENCY_QUERIES,
  WORKFLOW_QUERIES,
  LABEL_QUERIES,
  COMMENT_QUERIES,
  ANALYTICS_QUERIES,
  VALIDATION_QUERIES,
  buildIssueFilterQuery
} from './sqlite-queries.js'

// Note: Hierarchy validation will be available when the validator module is implemented
// import { validateIssueHierarchy, validateIssueHierarchyBatch } from '../../database/models/hierarchy-validator.js'

// Temporary placeholder for hierarchy validation
function validateIssueHierarchy(issue: any, existingIssues: any[]): { isValid: boolean; errors: any[] } {
  // Basic validation - epics cannot have parents, subtasks must have parents
  const errors: any[] = []
  
  if (issue.issue_type === 'epic' && issue.parent_id !== null) {
    errors.push({ message: 'Epics cannot have parent issues' })
  }
  
  if (issue.issue_type === 'subtask' && issue.parent_id === null) {
    errors.push({ message: 'Subtasks must have a parent issue' })
  }
  
  return { isValid: errors.length === 0, errors }
}

// =============================================================================
// Database Operations Interface
// =============================================================================

/**
 * High-performance SQLite database operations with caching and optimization
 */
export class SQLiteOperations {
  private connectionManager: SQLiteConnectionManager
  private queryCache = new Map<string, { result: any; timestamp: number }>()
  private cacheTimeout = 30000 // 30 seconds
  private performanceMetrics = {
    totalQueries: 0,
    cachedQueries: 0,
    averageQueryTime: 0
  }

  constructor(connectionManager: SQLiteConnectionManager) {
    this.connectionManager = connectionManager
  }

  // =============================================================================
  // Project Operations
  // =============================================================================

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const startTime = Date.now()

    try {
      await this.connectionManager.executeQuery(PROJECT_QUERIES.CREATE, [
        input.id,
        input.name,
        input.description || null,
        input.key || null
      ])

      const result = await this.connectionManager.executeQuery<Project>(
        PROJECT_QUERIES.GET_BY_ID,
        [input.id]
      )

      this.updateMetrics(Date.now() - startTime)
      
      if (result.rows.length === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', 'Project creation failed')
      }

      return this.mapProjectRow(result.rows[0])

    } catch (error) {
      throw this.handleDatabaseError(error, 'createProject')
    }
  }

  /**
   * Get project by ID
   */
  async getProject(id: string): Promise<Project> {
    const cacheKey = `project:${id}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      this.performanceMetrics.cachedQueries++
      return cached
    }

    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery<Project>(
        PROJECT_QUERIES.GET_BY_ID,
        [id]
      )

      this.updateMetrics(Date.now() - startTime)

      if (result.rows.length === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', `Project ${id} not found`)
      }

      const project = this.mapProjectRow(result.rows[0])
      this.setCachedResult(cacheKey, project)
      
      return project

    } catch (error) {
      throw this.handleDatabaseError(error, 'getProject')
    }
  }

  /**
   * Update project
   */
  async updateProject(id: string, updates: UpdateProjectInput): Promise<Project> {
    const startTime = Date.now()

    try {
      await this.connectionManager.executeQuery(PROJECT_QUERIES.UPDATE, [
        updates.name || null,
        updates.description || null,
        updates.key || null,
        id
      ])

      // Clear cache for this project
      this.clearCachePattern(`project:${id}`)

      const result = await this.connectionManager.executeQuery<Project>(
        PROJECT_QUERIES.GET_BY_ID,
        [id]
      )

      this.updateMetrics(Date.now() - startTime)

      if (result.rows.length === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', `Project ${id} not found`)
      }

      return this.mapProjectRow(result.rows[0])

    } catch (error) {
      throw this.handleDatabaseError(error, 'updateProject')
    }
  }

  /**
   * List projects with optional filtering
   */
  async listProjects(filters?: { name?: string; createdAfter?: Date }): Promise<Project[]> {
    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery<Project>(
        PROJECT_QUERIES.LIST,
        [
          filters?.name || null,
          filters?.name || null,
          filters?.createdAfter?.toISOString() || null,
          filters?.createdAfter?.toISOString() || null,
          1000, // limit
          0     // offset
        ]
      )

      this.updateMetrics(Date.now() - startTime)

      return result.rows.map(row => this.mapProjectRow(row))

    } catch (error) {
      throw this.handleDatabaseError(error, 'listProjects')
    }
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<void> {
    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery(
        PROJECT_QUERIES.DELETE,
        [id]
      )

      this.updateMetrics(Date.now() - startTime)

      if (result.changes === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', `Project ${id} not found`)
      }

      // Clear all caches related to this project
      this.clearCachePattern(`project:${id}`)
      this.clearCachePattern(`issues:project:${id}`)

    } catch (error) {
      throw this.handleDatabaseError(error, 'deleteProject')
    }
  }

  /**
   * Check if project exists
   */
  async projectExists(id: string): Promise<boolean> {
    try {
      const result = await this.connectionManager.executeQuery(
        PROJECT_QUERIES.EXISTS,
        [id]
      )
      return result.rows.length > 0
    } catch (error) {
      return false
    }
  }

  // =============================================================================
  // Issue Operations
  // =============================================================================

  /**
   * Create a new issue with hierarchy validation
   */
  async createIssue(input: CreateIssueInput): Promise<EnhancedIssue> {
    const startTime = Date.now()

    try {
      // Validate hierarchy before creating
      const issueForValidation: Issue = {
        id: input.id,
        project_id: input.project_id,
        parent_id: input.parent_id || null,
        title: input.title,
        description: input.description || null,
        state_id: input.state_id,
        priority: input.priority || 3,
        estimate: input.estimate || null,
        issue_type: input.issue_type,
        assignee_id: input.assignee_id || null,
        created_at: new Date(),
        updated_at: new Date()
      }

      // Get existing issues for validation context
      const existingIssues = await this.getProjectIssuesForValidation(input.project_id)
      const validationResult = validateIssueHierarchy(issueForValidation, existingIssues)

      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors.map(e => e.message).join(', ')
        throw this.createOperationError('HIERARCHY_VIOLATION', errorMessages)
      }

      await this.connectionManager.executeQuery(ISSUE_QUERIES.CREATE, [
        input.id,
        input.project_id,
        input.parent_id || null,
        input.title,
        input.description || null,
        input.state_id,
        input.priority || 3,
        input.estimate || null,
        input.issue_type,
        input.assignee_id || null
      ])

      this.updateMetrics(Date.now() - startTime)

      // Clear related caches
      this.clearCachePattern(`issues:project:${input.project_id}`)
      
      return await this.getIssue(input.id)

    } catch (error) {
      throw this.handleDatabaseError(error, 'createIssue')
    }
  }

  /**
   * Get issue by ID with complete relationships
   */
  async getIssue(id: string): Promise<EnhancedIssue> {
    const cacheKey = `issue:${id}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      this.performanceMetrics.cachedQueries++
      return cached
    }

    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery(
        ISSUE_QUERIES.GET_BY_ID,
        [id]
      )

      if (result.rows.length === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', `Issue ${id} not found`)
      }

      const issueRow = result.rows[0]
      
      // Get related data in parallel
      const [labels, dependencies, dependents, comments, children] = await Promise.all([
        this.getIssueLabels(id),
        this.getIssueDependencies(id),
        this.getIssueDependents(id),
        this.getIssueComments(id),
        this.getIssueChildren(id)
      ])

      this.updateMetrics(Date.now() - startTime)

      const enhancedIssue = this.mapEnhancedIssueRow(issueRow, {
        labels,
        dependencies,
        dependents,
        comments,
        children
      })

      this.setCachedResult(cacheKey, enhancedIssue)
      
      return enhancedIssue

    } catch (error) {
      throw this.handleDatabaseError(error, 'getIssue')
    }
  }

  /**
   * Update issue with hierarchy validation
   */
  async updateIssue(id: string, updates: UpdateIssueInput): Promise<EnhancedIssue> {
    const startTime = Date.now()

    try {
      // If updating hierarchy, validate first
      if (updates.parent_id !== undefined) {
        const currentIssue = await this.getIssue(id)
        const updatedIssue: Issue = {
          ...currentIssue,
          parent_id: updates.parent_id
        }

        const existingIssues = await this.getProjectIssuesForValidation(currentIssue.project_id)
        const validationResult = validateIssueHierarchy(updatedIssue, existingIssues)

        if (!validationResult.isValid) {
          const errorMessages = validationResult.errors.map(e => e.message).join(', ')
          throw this.createOperationError('HIERARCHY_VIOLATION', errorMessages)
        }
      }

      await this.connectionManager.executeQuery(ISSUE_QUERIES.UPDATE, [
        updates.title || null,
        updates.description || null,
        updates.state_id || null,
        updates.priority || null,
        updates.estimate || null,
        updates.assignee_id || null,
        updates.parent_id || null,
        id
      ])

      this.updateMetrics(Date.now() - startTime)

      // Clear related caches
      this.clearCachePattern(`issue:${id}`)
      this.clearCachePattern(`issues:`)
      
      return await this.getIssue(id)

    } catch (error) {
      throw this.handleDatabaseError(error, 'updateIssue')
    }
  }

  /**
   * List issues with comprehensive filtering
   */
  async listIssues(filters: IssueFilters): Promise<EnhancedIssue[]> {
    const startTime = Date.now()

    try {
      const limit = filters.limit || 100
      const offset = filters.offset || 0
      const orderBy = filters.order_by || 'created_at'
      const orderDirection = filters.order_direction || 'desc'

      // Build dynamic query parameters
      const params = [
        // Project filter (doubled for LIKE pattern)
        filters.project_id || null, filters.project_id || null,
        // Parent filter (doubled for LIKE pattern)
        filters.parent_id || null, filters.parent_id || null,
        // State filter (doubled for LIKE pattern)
        filters.state_id || null, filters.state_id || null,
        // Issue type filter (doubled for LIKE pattern)
        filters.issue_type || null, filters.issue_type || null,
        // Assignee filter (doubled for LIKE pattern)
        filters.assignee_id || null, filters.assignee_id || null,
        // Priority filter (doubled for LIKE pattern)
        filters.priority || null, filters.priority || null,
        // Has estimate filter (doubled for LIKE pattern)
        filters.has_estimate || null, filters.has_estimate || null,
        // Date filters (doubled for LIKE pattern)
        filters.created_after?.toISOString() || null, filters.created_after?.toISOString() || null,
        filters.created_before?.toISOString() || null, filters.created_before?.toISOString() || null,
        filters.updated_after?.toISOString() || null, filters.updated_after?.toISOString() || null,
        filters.updated_before?.toISOString() || null, filters.updated_before?.toISOString() || null,
        // Search filter (tripled for title/description search)
        filters.search || null, filters.search || null, filters.search || null,
        // Order by parameters (multiple for CASE statements)
        orderBy, orderBy, orderDirection,
        orderBy, orderBy, orderDirection,
        orderBy, orderBy, orderDirection,
        orderBy, orderBy, orderDirection,
        limit, offset
      ]

      const result = await this.connectionManager.executeQuery(
        ISSUE_QUERIES.LIST,
        params
      )

      this.updateMetrics(Date.now() - startTime)

      // Convert to enhanced issues (without full relationship loading for performance)
      const enhancedIssues = result.rows.map(row => this.mapEnhancedIssueRow(row))

      return enhancedIssues

    } catch (error) {
      throw this.handleDatabaseError(error, 'listIssues')
    }
  }

  /**
   * Delete issue
   */
  async deleteIssue(id: string): Promise<void> {
    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery(
        ISSUE_QUERIES.DELETE,
        [id]
      )

      this.updateMetrics(Date.now() - startTime)

      if (result.changes === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', `Issue ${id} not found`)
      }

      // Clear related caches
      this.clearCachePattern(`issue:${id}`)
      this.clearCachePattern(`issues:`)

    } catch (error) {
      throw this.handleDatabaseError(error, 'deleteIssue')
    }
  }

  /**
   * Check if issue exists
   */
  async issueExists(id: string): Promise<boolean> {
    try {
      const result = await this.connectionManager.executeQuery(
        ISSUE_QUERIES.EXISTS,
        [id]
      )
      return result.rows.length > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Get available issues (not blocked by dependencies)
   */
  async getAvailableIssues(projectId: string, assigneeId?: string): Promise<EnhancedIssue[]> {
    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery(
        ISSUE_QUERIES.GET_AVAILABLE_ISSUES,
        [projectId, assigneeId || null, assigneeId || null]
      )

      this.updateMetrics(Date.now() - startTime)

      return result.rows.map(row => this.mapEnhancedIssueRow(row))

    } catch (error) {
      throw this.handleDatabaseError(error, 'getAvailableIssues')
    }
  }

  // =============================================================================
  // Dependency Operations
  // =============================================================================

  /**
   * Create dependency relationship
   */
  async createDependency(
    id: string,
    blockerId: string, 
    blockedId: string, 
    type: DependencyType = 'blocks'
  ): Promise<Dependency> {
    const startTime = Date.now()

    try {
      // Check if dependency already exists
      const existsResult = await this.connectionManager.executeQuery(
        DEPENDENCY_QUERIES.EXISTS,
        [blockerId, blockedId]
      )

      if (existsResult.rows.length > 0) {
        throw this.createOperationError('RESOURCE_ALREADY_EXISTS', 'Dependency already exists')
      }

      // Create the dependency
      await this.connectionManager.executeQuery(DEPENDENCY_QUERIES.CREATE, [
        id,
        blockerId,
        blockedId,
        type
      ])

      this.updateMetrics(Date.now() - startTime)

      // Get the created dependency
      const result = await this.connectionManager.executeQuery(
        DEPENDENCY_QUERIES.GET_BY_ID,
        [id]
      )

      if (result.rows.length === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', 'Dependency creation failed')
      }

      // Clear dependency-related caches
      this.clearCachePattern(`dependencies:`)
      
      return this.mapDependencyRow(result.rows[0])

    } catch (error) {
      throw this.handleDatabaseError(error, 'createDependency')
    }
  }

  /**
   * Delete dependency
   */
  async deleteDependency(id: string): Promise<void> {
    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery(
        DEPENDENCY_QUERIES.DELETE,
        [id]
      )

      this.updateMetrics(Date.now() - startTime)

      if (result.changes === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', `Dependency ${id} not found`)
      }

      // Clear dependency-related caches
      this.clearCachePattern(`dependencies:`)

    } catch (error) {
      throw this.handleDatabaseError(error, 'deleteDependency')
    }
  }

  /**
   * Get all dependencies for a project
   */
  async getProjectDependencies(projectId: string): Promise<Dependency[]> {
    const cacheKey = `dependencies:project:${projectId}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      this.performanceMetrics.cachedQueries++
      return cached
    }

    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery(
        DEPENDENCY_QUERIES.GET_PROJECT_DEPENDENCIES,
        [projectId]
      )

      this.updateMetrics(Date.now() - startTime)

      const dependencies = result.rows.map(row => this.mapDependencyRow(row))
      this.setCachedResult(cacheKey, dependencies)
      
      return dependencies

    } catch (error) {
      throw this.handleDatabaseError(error, 'getProjectDependencies')
    }
  }

  // =============================================================================
  // Workflow State Operations
  // =============================================================================

  /**
   * Get workflow states for a project
   */
  async getWorkflowStates(projectId: string): Promise<WorkflowState[]> {
    const cacheKey = `workflow_states:${projectId}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      this.performanceMetrics.cachedQueries++
      return cached
    }

    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery<WorkflowState>(
        WORKFLOW_QUERIES.LIST_BY_PROJECT,
        [projectId]
      )

      this.updateMetrics(Date.now() - startTime)

      const workflowStates = result.rows.map(row => this.mapWorkflowStateRow(row))
      this.setCachedResult(cacheKey, workflowStates)
      
      return workflowStates

    } catch (error) {
      throw this.handleDatabaseError(error, 'getWorkflowStates')
    }
  }

  /**
   * Create workflow state
   */
  async createWorkflowState(
    id: string,
    projectId: string,
    state: Omit<WorkflowState, 'id' | 'project_id' | 'created_at' | 'updated_at'>
  ): Promise<WorkflowState> {
    const startTime = Date.now()

    try {
      await this.connectionManager.executeQuery(WORKFLOW_QUERIES.CREATE, [
        id,
        projectId,
        state.name,
        state.type,
        state.position || 0,
        state.color || '#000000'
      ])

      this.updateMetrics(Date.now() - startTime)

      // Clear workflow states cache
      this.clearCachePattern(`workflow_states:${projectId}`)
      
      const result = await this.connectionManager.executeQuery<WorkflowState>(
        WORKFLOW_QUERIES.GET_BY_ID,
        [id]
      )

      if (result.rows.length === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', 'Workflow state creation failed')
      }

      return this.mapWorkflowStateRow(result.rows[0])

    } catch (error) {
      throw this.handleDatabaseError(error, 'createWorkflowState')
    }
  }

  // =============================================================================
  // Label Operations
  // =============================================================================

  /**
   * Create label
   */
  async createLabel(input: CreateLabelInput): Promise<Label> {
    const startTime = Date.now()

    try {
      await this.connectionManager.executeQuery(LABEL_QUERIES.CREATE, [
        input.id,
        input.project_id,
        input.name,
        input.color || '#cccccc',
        input.description || null
      ])

      this.updateMetrics(Date.now() - startTime)

      // Clear labels cache
      this.clearCachePattern(`labels:${input.project_id}`)
      
      const result = await this.connectionManager.executeQuery<Label>(
        LABEL_QUERIES.GET_BY_ID,
        [input.id]
      )

      if (result.rows.length === 0) {
        throw this.createOperationError('RESOURCE_NOT_FOUND', 'Label creation failed')
      }

      return this.mapLabelRow(result.rows[0])

    } catch (error) {
      throw this.handleDatabaseError(error, 'createLabel')
    }
  }

  /**
   * Get labels for a project
   */
  async getProjectLabels(projectId: string): Promise<Label[]> {
    const cacheKey = `labels:${projectId}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      this.performanceMetrics.cachedQueries++
      return cached
    }

    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery<Label>(
        LABEL_QUERIES.LIST_BY_PROJECT,
        [projectId]
      )

      this.updateMetrics(Date.now() - startTime)

      const labels = result.rows.map(row => this.mapLabelRow(row))
      this.setCachedResult(cacheKey, labels)
      
      return labels

    } catch (error) {
      throw this.handleDatabaseError(error, 'getProjectLabels')
    }
  }

  /**
   * Add label to issue
   */
  async addLabelToIssue(issueId: string, labelId: string): Promise<void> {
    const startTime = Date.now()

    try {
      await this.connectionManager.executeQuery(LABEL_QUERIES.ADD_TO_ISSUE, [
        issueId,
        labelId
      ])

      this.updateMetrics(Date.now() - startTime)

      // Clear issue cache
      this.clearCachePattern(`issue:${issueId}`)

    } catch (error) {
      throw this.handleDatabaseError(error, 'addLabelToIssue')
    }
  }

  /**
   * Remove label from issue
   */
  async removeLabelFromIssue(issueId: string, labelId: string): Promise<void> {
    const startTime = Date.now()

    try {
      await this.connectionManager.executeQuery(LABEL_QUERIES.REMOVE_FROM_ISSUE, [
        issueId,
        labelId
      ])

      this.updateMetrics(Date.now() - startTime)

      // Clear issue cache
      this.clearCachePattern(`issue:${issueId}`)

    } catch (error) {
      throw this.handleDatabaseError(error, 'removeLabelFromIssue')
    }
  }

  // =============================================================================
  // Analytics and Recommendations
  // =============================================================================

  /**
   * Get task recommendations for a project
   */
  async getTaskRecommendations(
    projectId: string, 
    assigneeId?: string, 
    focusArea?: string
  ): Promise<EnhancedIssue[]> {
    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery(
        ANALYTICS_QUERIES.TASK_RECOMMENDATIONS,
        [
          projectId,
          assigneeId || null, assigneeId || null,
          focusArea || null, focusArea || null, focusArea || null
        ]
      )

      this.updateMetrics(Date.now() - startTime)

      return result.rows.map(row => this.mapEnhancedIssueRow(row))

    } catch (error) {
      throw this.handleDatabaseError(error, 'getTaskRecommendations')
    }
  }

  /**
   * Get dependency bottlenecks for a project
   */
  async getDependencyBottlenecks(projectId: string): Promise<Array<{
    issueId: string
    title: string
    issueType: string
    blockedCount: number
    stateType: string
  }>> {
    const startTime = Date.now()

    try {
      const result = await this.connectionManager.executeQuery(
        ANALYTICS_QUERIES.DEPENDENCY_BOTTLENECKS,
        [projectId]
      )

      this.updateMetrics(Date.now() - startTime)

      return result.rows.map(row => ({
        issueId: row.id,
        title: row.title,
        issueType: row.issue_type,
        blockedCount: row.blocked_count,
        stateType: row.state_type
      }))

    } catch (error) {
      throw this.handleDatabaseError(error, 'getDependencyBottlenecks')
    }
  }

  // =============================================================================
  // Validation Operations
  // =============================================================================

  /**
   * Validate project data integrity
   */
  async validateProjectIntegrity(projectId: string): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    statistics: {
      totalIssues: number
      hierarchyViolations: number
      dependencyViolations: number
      orphanedEntities: number
    }
  }> {
    const startTime = Date.now()

    try {
      // Check for circular dependencies
      const circularDepsResult = await this.connectionManager.executeQuery(
        VALIDATION_QUERIES.CIRCULAR_DEPENDENCIES
      )

      // Check for hierarchy violations
      const hierarchyResult = await this.connectionManager.executeQuery(
        VALIDATION_QUERIES.HIERARCHY_VIOLATIONS,
        [projectId]
      )

      // Check for orphaned entities
      const orphanedResult = await this.connectionManager.executeQuery(
        VALIDATION_QUERIES.ORPHANED_ENTITIES,
        [projectId, projectId]
      )

      // Get project statistics
      const statsResult = await this.connectionManager.executeQuery(
        PROJECT_QUERIES.STATS,
        [projectId]
      )

      this.updateMetrics(Date.now() - startTime)

      const errors: string[] = []
      const warnings: string[] = []

      // Process circular dependencies
      for (const row of circularDepsResult.rows) {
        errors.push(`Circular dependency detected: ${row.cycle_path}`)
      }

      // Process hierarchy violations
      for (const row of hierarchyResult.rows) {
        errors.push(`Hierarchy violation in issue ${row.id}: ${row.violation_reason}`)
      }

      // Process orphaned entities
      for (const row of orphanedResult.rows) {
        warnings.push(`Orphaned ${row.entity_type} ${row.entity_id}: ${row.issue_reason}`)
      }

      const stats = statsResult.rows[0] || {
        total_issues: 0,
        epics: 0,
        stories: 0,
        subtasks: 0
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics: {
          totalIssues: stats.total_issues || 0,
          hierarchyViolations: hierarchyResult.rows.length,
          dependencyViolations: circularDepsResult.rows.length,
          orphanedEntities: orphanedResult.rows.length
        }
      }

    } catch (error) {
      throw this.handleDatabaseError(error, 'validateProjectIntegrity')
    }
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Get project issues for validation context
   */
  private async getProjectIssuesForValidation(projectId: string): Promise<Issue[]> {
    const result = await this.connectionManager.executeQuery<Issue>(
      ISSUE_QUERIES.GET_PROJECT_ISSUES,
      [projectId]
    )

    return result.rows.map(row => ({
      id: row.id,
      project_id: projectId,
      parent_id: row.parent_id,
      title: row.title,
      description: null,
      state_id: row.state_id,
      priority: 3,
      estimate: row.estimate,
      issue_type: row.issue_type,
      assignee_id: null,
      created_at: new Date(),
      updated_at: new Date()
    }))
  }

  /**
   * Get labels for an issue
   */
  private async getIssueLabels(issueId: string): Promise<Label[]> {
    const result = await this.connectionManager.executeQuery<Label>(
      LABEL_QUERIES.GET_ISSUE_LABELS,
      [issueId]
    )
    return result.rows.map(row => this.mapLabelRow(row))
  }

  /**
   * Get dependencies for an issue (outgoing)
   */
  private async getIssueDependencies(issueId: string): Promise<Dependency[]> {
    const result = await this.connectionManager.executeQuery(
      DEPENDENCY_QUERIES.GET_BLOCKED,
      [issueId]
    )
    return result.rows.map(row => this.mapDependencyRow(row))
  }

  /**
   * Get dependents for an issue (incoming)
   */
  private async getIssueDependents(issueId: string): Promise<Dependency[]> {
    const result = await this.connectionManager.executeQuery(
      DEPENDENCY_QUERIES.GET_BLOCKERS,
      [issueId]
    )
    return result.rows.map(row => this.mapDependencyRow(row))
  }

  /**
   * Get comments for an issue
   */
  private async getIssueComments(issueId: string): Promise<IssueComment[]> {
    const result = await this.connectionManager.executeQuery<IssueComment>(
      COMMENT_QUERIES.LIST_BY_ISSUE,
      [issueId]
    )
    return result.rows.map(row => this.mapCommentRow(row))
  }

  /**
   * Get children for an issue
   */
  private async getIssueChildren(issueId: string): Promise<EnhancedIssue[]> {
    const result = await this.connectionManager.executeQuery(
      ISSUE_QUERIES.GET_CHILDREN,
      [issueId]
    )
    return result.rows.map(row => this.mapEnhancedIssueRow(row))
  }

  // =============================================================================
  // Row Mapping Functions
  // =============================================================================

  private mapProjectRow(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      key: row.key,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }
  }

  private mapEnhancedIssueRow(row: any, relationships?: {
    labels?: Label[]
    dependencies?: Dependency[]
    dependents?: Dependency[]
    comments?: IssueComment[]
    children?: EnhancedIssue[]
  }): EnhancedIssue {
    const issue: Issue = {
      id: row.id,
      project_id: row.project_id,
      parent_id: row.parent_id,
      title: row.title,
      description: row.description,
      state_id: row.state_id,
      priority: row.priority,
      estimate: row.estimate,
      issue_type: row.issue_type,
      assignee_id: row.assignee_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }

    const workflowState = row.state_name ? {
      id: row.state_id,
      project_id: row.project_id,
      name: row.state_name,
      type: row.state_type,
      position: 0,
      color: row.state_color || '#000000',
      created_at: new Date(),
      updated_at: new Date()
    } : undefined

    return {
      ...issue,
      labels: relationships?.labels || [],
      dependencies: relationships?.dependencies || [],
      dependents: relationships?.dependents || [],
      comments: relationships?.comments || [],
      workflowState,
      children: relationships?.children || []
    }
  }

  private mapDependencyRow(row: any): Dependency {
    return {
      id: row.id,
      blocker_id: row.blocker_id,
      blocked_id: row.blocked_id,
      dependency_type: row.dependency_type,
      created_at: new Date(row.created_at),
      blocker: row.blocker_title ? {
        id: row.blocker_id,
        title: row.blocker_title
      } as any : undefined,
      blocked: row.blocked_title ? {
        id: row.blocked_id,
        title: row.blocked_title
      } as any : undefined
    }
  }

  private mapWorkflowStateRow(row: any): WorkflowState {
    return {
      id: row.id,
      project_id: row.project_id,
      name: row.name,
      type: row.type,
      position: row.position,
      color: row.color,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }
  }

  private mapLabelRow(row: any): Label {
    return {
      id: row.id,
      project_id: row.project_id,
      name: row.name,
      color: row.color,
      description: row.description,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }
  }

  private mapCommentRow(row: any): IssueComment {
    return {
      id: row.id,
      issue_id: row.issue_id,
      body: row.body,
      author_id: row.author_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }
  }

  // =============================================================================
  // Cache Management
  // =============================================================================

  private getCachedResult(key: string): any | null {
    const cached = this.queryCache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result
    }
    return null
  }

  private setCachedResult(key: string, result: any): void {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now()
    })
  }

  private clearCachePattern(pattern: string): void {
    for (const [key] of this.queryCache) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key)
      }
    }
  }

  // =============================================================================
  // Error Handling and Metrics
  // =============================================================================

  private updateMetrics(duration: number): void {
    this.performanceMetrics.totalQueries++
    const currentAverage = this.performanceMetrics.averageQueryTime
    const queryCount = this.performanceMetrics.totalQueries
    
    this.performanceMetrics.averageQueryTime = (
      (currentAverage * (queryCount - 1)) + duration
    ) / queryCount
  }

  private createOperationError(code: string, message: string): ProviderError {
    return {
      name: 'SQLiteOperationError',
      message,
      code: code as any,
      providerId: 'sqlite',
      providerType: 'sqlite',
      retryable: false,
      context: {
        operation: 'database_operation',
        timestamp: new Date()
      }
    }
  }

  private handleDatabaseError(error: any, operation: string): ProviderError {
    if (error.code) {
      // Already a provider error
      return error
    }

    return {
      name: 'SQLiteDatabaseError',
      message: error.message || 'Database operation failed',
      code: 'OPERATION_FAILED' as any,
      providerId: 'sqlite',
      providerType: 'sqlite',
      retryable: false,
      context: {
        operation,
        timestamp: new Date(),
        originalError: error.message
      }
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalQueries > 0 ? 
        this.performanceMetrics.cachedQueries / this.performanceMetrics.totalQueries : 0,
      cachedEntries: this.queryCache.size
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.queryCache.clear()
  }
}