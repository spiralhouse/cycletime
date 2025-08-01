/**
 * JCVD Provider System Types
 * Comprehensive type definitions for the unified IssueProvider interface
 * 
 * This module defines the complete API contract for all provider implementations,
 * ensuring feature parity across SQLite, Linear, GitHub, and Jira providers.
 */

import type {
  Project,
  Issue,
  WorkflowState,
  IssueDependency,
  Label,
  IssueComment,
  IssueFilters,
  CreateProjectInput,
  CreateIssueInput,
  UpdateProjectInput,
  UpdateIssueInput,
  CreateWorkflowStateInput,
  CreateDependencyInput,
  DependencyType,
  IssueType,
  IssuePriority,
  WorkflowStateType
} from '../database/models/schema-types.js'

import type {
  ExportData,
  ExportOptions
} from './export-format.js'

// =============================================================================
// Provider Metadata and Capability System
// =============================================================================

/**
 * Provider type identifiers for all supported issue tracking systems
 */
export type ProviderType = 'sqlite' | 'linear' | 'github' | 'jira'

/**
 * Provider capability flags for feature discovery
 */
export interface ProviderCapabilities {
  /** Supports creating and managing projects */
  supportsProjects: boolean
  /** Supports issue hierarchy (epics, stories, subtasks) */
  supportsHierarchy: boolean
  /** Supports issue dependencies and blocking relationships */
  supportsDependencies: boolean
  /** Supports custom workflow states */
  supportsCustomWorkflows: boolean
  /** Supports issue estimation (story points) */
  supportsEstimation: boolean
  /** Supports issue labels and tagging */
  supportsLabels: boolean
  /** Supports comments and activity tracking */
  supportsComments: boolean
  /** Supports assignee management */
  supportsAssignees: boolean
  /** Supports data export functionality */
  supportsExport: boolean
  /** Supports data import functionality */
  supportsImport: boolean
  /** Supports real-time synchronization */
  supportsSync: boolean
  /** Supports offline operation */
  supportsOffline: boolean
}

/**
 * Provider connection and health status
 */
export interface ProviderStatus {
  /** Current connection state */
  isConnected: boolean
  /** Provider is available and responding */
  isHealthy: boolean
  /** Last successful health check timestamp */
  lastHealthCheck?: Date
  /** Current error if unhealthy */
  lastError?: ProviderError
  /** Performance metrics */
  metrics?: {
    averageResponseTime: number
    totalRequests: number
    failedRequests: number
    uptime: number
  }
}

/**
 * Complete provider information and metadata
 */
export interface ProviderInfo {
  /** Unique provider identifier */
  id: string
  /** Provider type classification */
  type: ProviderType
  /** Human-readable provider name */
  name: string
  /** Provider version information */
  version: string
  /** Detailed description of provider capabilities */
  description: string
  /** Feature capability matrix */
  capabilities: ProviderCapabilities
  /** Current operational status */
  status: ProviderStatus
  /** Provider-specific configuration schema */
  configSchema?: Record<string, any>
  /** Authentication requirements */
  authRequired: boolean
  /** API rate limit information */
  rateLimits?: {
    requestsPerHour: number
    requestsPerMinute: number
    burstLimit: number
  }
}

// =============================================================================
// Configuration and Authentication Types
// =============================================================================

/**
 * Base configuration interface for all providers
 */
export interface BaseProviderConfig {
  /** Provider type identifier */
  type: ProviderType
  /** Provider instance ID */
  id: string
  /** Human-readable name for this provider instance */
  name: string
  /** Enable/disable this provider */
  enabled: boolean
}

/**
 * SQLite provider configuration
 */
export interface SQLiteProviderConfig extends BaseProviderConfig {
  type: 'sqlite'
  /** Database file path */
  databasePath: string
  /** Enable WAL mode for better concurrency */
  enableWAL?: boolean
  /** Database page cache size */
  cacheSize?: number
  /** Connection timeout in milliseconds */
  timeout?: number
  /** Enable foreign key constraints */
  enableForeignKeys?: boolean
}

/**
 * Linear provider configuration
 */
export interface LinearProviderConfig extends BaseProviderConfig {
  type: 'linear'
  /** Linear API token */
  apiToken: string
  /** Linear team ID */
  teamId: string
  /** API base URL (for Linear on-premise) */
  apiUrl?: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** Enable webhook synchronization */
  enableWebhooks?: boolean
}

/**
 * GitHub provider configuration
 */
export interface GitHubProviderConfig extends BaseProviderConfig {
  type: 'github'
  /** GitHub API token */
  apiToken: string
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** GitHub API base URL (for GitHub Enterprise) */
  apiUrl?: string
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Jira provider configuration
 */
export interface JiraProviderConfig extends BaseProviderConfig {
  type: 'jira'
  /** Jira base URL */
  baseUrl: string
  /** Jira username or email */
  username: string
  /** Jira API token or password */
  apiToken: string
  /** Jira project key */
  projectKey: string
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Union type for all provider configurations
 */
export type ProviderConfig = 
  | SQLiteProviderConfig 
  | LinearProviderConfig 
  | GitHubProviderConfig 
  | JiraProviderConfig

// =============================================================================
// Provider-Agnostic Data Model Extensions
// =============================================================================

/**
 * Enhanced project configuration for provider-agnostic creation
 */
export interface ProjectConfig extends CreateProjectInput {
  /** Project visibility settings */
  visibility?: 'private' | 'internal' | 'public'
  /** Project template to use for initialization */
  template?: string
  /** Default workflow states to create */
  defaultWorkflowStates?: Omit<CreateWorkflowStateInput, 'project_id'>[]
  /** Default labels to create */
  defaultLabels?: CreateLabelInput[]
  /** Project settings and preferences */
  settings?: Record<string, any>
}

/**
 * Enhanced issue configuration for provider-agnostic creation
 */
export interface IssueConfig extends CreateIssueInput {
  /** Labels to apply to the issue */
  labels?: string[]
  /** Initial comment body */
  initialComment?: string
  /** Dependencies to create with this issue */
  dependencies?: Omit<CreateDependencyInput, 'blocked_id'>[]
  /** Custom fields for provider-specific data */
  customFields?: Record<string, any>
}

/**
 * Enhanced issue with relationships and metadata
 */
export interface EnhancedIssue extends Issue {
  /** Associated labels */
  labels?: Label[]
  /** Issue dependencies (outgoing) */
  dependencies?: Dependency[]
  /** Issues that depend on this one (incoming) */
  dependents?: Dependency[]
  /** Recent comments */
  comments?: IssueComment[]
  /** Current workflow state */
  workflowState?: WorkflowState
  /** Child issues (for epics and stories) */
  children?: EnhancedIssue[]
  /** Provider-specific metadata */
  providerMetadata?: Record<string, any>
}

/**
 * Standardized dependency relationship
 */
export interface Dependency extends IssueDependency {
  /** The issue that blocks */
  blocker?: Issue
  /** The issue that is blocked */
  blocked?: Issue
}

/**
 * Create label input with provider-agnostic options
 */
export interface CreateLabelInput {
  id: string
  project_id: string
  name: string
  color?: string
  description?: string
}

// =============================================================================
// Operation Result Types
// =============================================================================

/**
 * Standardized result for operations that may fail
 */
export interface OperationResult<T = void> {
  /** Operation succeeded */
  success: boolean
  /** Result data if successful */
  data?: T
  /** Error information if failed */
  error?: ProviderError
  /** Additional metadata about the operation */
  metadata?: {
    duration: number
    timestamp: Date
    operationType: string
    affectedResources?: string[]
  }
}

/**
 * Result of data import operations
 */
export interface ImportResult {
  /** Import operation succeeded */
  success: boolean
  /** Number of entities imported by type */
  imported: {
    projects: number
    issues: number
    dependencies: number
    workflowStates: number
    labels: number
    comments: number
  }
  /** Entities that failed to import */
  failed: {
    projects: string[]
    issues: string[]
    dependencies: string[]
    workflowStates: string[]
    labels: string[]
    comments: string[]
  }
  /** Import warnings and non-fatal issues */
  warnings: string[]
  /** Detailed error information */
  errors: ProviderError[]
  /** Import duration in milliseconds */
  duration: number
}

/**
 * Result of synchronization operations
 */
export interface SyncResult {
  /** Synchronization succeeded */
  success: boolean
  /** Number of entities synchronized */
  synchronized: {
    created: number
    updated: number
    deleted: number
  }
  /** Conflicts that required resolution */
  conflicts: {
    resolved: number
    unresolved: ConflictResolution[]
  }
  /** Sync warnings and non-fatal issues */
  warnings: string[]
  /** Detailed error information */
  errors: ProviderError[]
  /** Sync duration in milliseconds */
  duration: number
  /** Last successful sync timestamp */
  lastSyncAt: Date
}

/**
 * Conflict resolution information
 */
export interface ConflictResolution {
  /** Type of conflict */
  type: 'data_conflict' | 'schema_conflict' | 'permission_conflict'
  /** Entity that had the conflict */
  entityId: string
  /** Entity type */
  entityType: string
  /** Description of the conflict */
  description: string
  /** Suggested resolution strategy */
  suggestedResolution: 'use_source' | 'use_target' | 'merge' | 'manual'
  /** Conflict details */
  details: {
    sourceValue: any
    targetValue: any
    conflictField: string
  }
}

// =============================================================================
// Data Export and Migration Types (Re-export from export-format module)
// =============================================================================

// Re-export comprehensive export format types from dedicated module
export type {
  ExportData,
  ExportOptions,
  ExportFormat,
  ExportProviderInfo,
  ExportMetadata,
  ExportStatistics,
  ExportValidation,
  DataChecksums,
  ValidationError,
  ValidationWarning,
  ValidationSeverity,
  CompressionOptions
} from './export-format.js'

// =============================================================================
// Query and Analysis Types
// =============================================================================

/**
 * Dependency graph structure for analysis
 */
export interface DependencyGraph {
  /** Project this graph represents */
  projectId: string
  /** All nodes (issues) in the graph */
  nodes: {
    id: string
    title: string
    type: IssueType
    state: string
    estimate?: number
  }[]
  /** All edges (dependencies) in the graph */
  edges: {
    from: string
    to: string
    type: DependencyType
  }[]
  /** Graph analysis results */
  analysis: {
    /** Issues with no dependencies (can start immediately) */
    rootNodes: string[]
    /** Issues that nothing depends on (final deliverables) */
    leafNodes: string[]
    /** Critical path through the project */
    criticalPath: string[]
    /** Circular dependencies detected */
    circularDependencies: string[][]
    /** Issues blocking the most other issues */
    bottlenecks: {
      issueId: string
      blockedCount: number
    }[]
  }
}

/**
 * Task recommendation with context and rationale
 */
export interface TaskRecommendation {
  /** Recommended issue to work on */
  issue: EnhancedIssue
  /** Confidence score (0-1) for this recommendation */
  confidence: number
  /** Human-readable rationale for the recommendation */
  rationale: string
  /** Alternative tasks if this one is not suitable */
  alternatives: {
    issue: EnhancedIssue
    confidence: number
    rationale: string
  }[]
  /** Context information used for recommendation */
  context: {
    /** Available (unblocked) issues considered */
    availableIssues: number
    /** User's current focus area */
    focusArea?: string
    /** Recent work history */
    recentWork?: string[]
    /** Project phase or milestone */
    projectPhase?: string
  }
}

// =============================================================================
// Error Handling and Status Types
// =============================================================================

/**
 * Standardized provider error with detailed context
 */
export interface ProviderError extends Error {
  /** Error code for programmatic handling */
  code: ProviderErrorCode
  /** Provider that generated the error */
  providerId: string
  /** Provider type */
  providerType: ProviderType
  /** HTTP status code if applicable */
  statusCode?: number
  /** Retry information */
  retryable: boolean
  /** Context data for debugging */
  context?: {
    operation: string
    parameters?: Record<string, any>
    timestamp: Date
    requestId?: string
  }
  /** Suggested user actions */
  userActions?: string[]
}

/**
 * Comprehensive error codes for all provider operations
 */
export type ProviderErrorCode =
  // Connection and authentication errors
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  
  // Data validation errors
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FIELD_VALUE'
  | 'CONSTRAINT_VIOLATION'
  
  // Resource errors
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_ALREADY_EXISTS'
  | 'RESOURCE_CONFLICT'
  | 'RESOURCE_LOCKED'
  | 'INSUFFICIENT_PERMISSIONS'
  
  // Operation errors
  | 'OPERATION_FAILED'
  | 'OPERATION_NOT_SUPPORTED'
  | 'CIRCULAR_DEPENDENCY'
  | 'HIERARCHY_VIOLATION'
  | 'STATE_TRANSITION_INVALID'
  
  // Provider-specific errors
  | 'PROVIDER_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_CONFIGURATION_ERROR'
  | 'PROVIDER_FEATURE_NOT_SUPPORTED'
  
  // Data integrity errors
  | 'DATA_CORRUPTION'
  | 'MIGRATION_FAILED'
  | 'SYNC_FAILED'
  | 'EXPORT_FAILED'
  | 'IMPORT_FAILED'

// =============================================================================
// Core Provider Interface
// =============================================================================

/**
 * Unified IssueProvider interface for all issue tracking backends
 * 
 * This interface defines the complete API contract that all provider implementations
 * must support, ensuring feature parity across SQLite, Linear, GitHub, and Jira.
 * 
 * The interface follows async/await patterns throughout and provides comprehensive
 * error handling with standardized error types and status codes.
 */
export interface IssueProvider {
  // -------------------------------------------------------------------------
  // Provider Metadata and Health Management
  // -------------------------------------------------------------------------
  
  /**
   * Get comprehensive provider information and capabilities
   * @returns Provider metadata including capabilities and status
   */
  getProviderInfo(): ProviderInfo
  
  /**
   * Check if provider is available and can handle requests
   * @returns Promise resolving to availability status
   */
  isAvailable(): Promise<boolean>
  
  /**
   * Perform health check and update provider status
   * @returns Promise resolving to current health status
   */
  healthCheck(): Promise<ProviderStatus>
  
  /**
   * Initialize provider connection and perform setup
   * @param config Provider-specific configuration
   * @returns Promise resolving to initialization result
   */
  initialize(config: ProviderConfig): Promise<OperationResult<void>>
  
  /**
   * Cleanup provider resources and close connections
   * @returns Promise resolving when cleanup is complete
   */
  cleanup(): Promise<OperationResult<void>>

  // -------------------------------------------------------------------------
  // Capability Discovery and Validation
  // -------------------------------------------------------------------------
  
  /**
   * Discover and validate provider capabilities dynamically
   * @param options Discovery configuration options
   * @returns Promise resolving to capability discovery results
   */
  discoverCapabilities?(options?: {
    targetCapabilities?: string[]
    skipCached?: boolean
    timeout?: number
    includeBenchmarks?: boolean
    probeDepth?: 'shallow' | 'deep'
  }): Promise<{
    capabilities: Map<string, {
      capabilityId: string
      isSupported: boolean
      version?: string
      performance?: {
        averageResponseTime: number
        reliability: number
        throughput: number
      }
      metadata?: Record<string, any>
      error?: ProviderError
      probedAt: Date
    }>
    discoverySuccess: boolean
    discoveryDuration: number
    discoveredAt: Date
    errors: ProviderError[]
    warnings: string[]
  }>

  /**
   * Check if a specific capability is supported
   * @param capabilityId Capability identifier to check
   * @returns Promise resolving to capability support status
   */
  supportsCapability?(capabilityId: string): Promise<boolean>

  /**
   * Get detailed information about a capability implementation
   * @param capabilityId Capability identifier
   * @returns Capability implementation details or undefined if not supported
   */
  getCapabilityInfo?(capabilityId: string): Promise<{
    isSupported: boolean
    implementationDetails?: string
    limitations?: string[]
    performanceNotes?: string
    version?: string
  } | undefined>

  /**
   * Validate that required capabilities are available before operation
   * @param requiredCapabilities List of capability IDs required
   * @returns Promise resolving to validation result
   */
  validateCapabilities?(requiredCapabilities: string[]): Promise<{
    isValid: boolean
    supportedCapabilities: string[]
    unsupportedCapabilities: string[]
    warnings: string[]
  }>
  
  // -------------------------------------------------------------------------
  // Project Lifecycle Management
  // -------------------------------------------------------------------------
  
  /**
   * Create a new project with initial configuration
   * @param config Project configuration and settings
   * @returns Promise resolving to created project
   */
  createProject(config: ProjectConfig): Promise<Project>
  
  /**
   * Retrieve project by ID with complete metadata
   * @param id Project identifier
   * @returns Promise resolving to project details
   */
  getProject(id: string): Promise<Project>
  
  /**
   * Update existing project with partial updates
   * @param id Project identifier
   * @param updates Partial project data to update
   * @returns Promise resolving to updated project
   */
  updateProject(id: string, updates: UpdateProjectInput): Promise<Project>
  
  /**
   * List all projects with optional filtering
   * @param filters Optional project filtering criteria
   * @returns Promise resolving to array of projects
   */
  listProjects(filters?: { name?: string; createdAfter?: Date }): Promise<Project[]>
  
  /**
   * Delete project and all associated data
   * @param id Project identifier
   * @returns Promise resolving to operation result
   */
  deleteProject(id: string): Promise<OperationResult<void>>
  
  // -------------------------------------------------------------------------
  // Issue Lifecycle Operations
  // -------------------------------------------------------------------------
  
  /**
   * Create a new issue with full configuration
   * @param config Issue configuration including relationships
   * @returns Promise resolving to created issue
   */
  createIssue(config: IssueConfig): Promise<EnhancedIssue>
  
  /**
   * Retrieve issue by ID with complete relationships
   * @param id Issue identifier
   * @returns Promise resolving to enhanced issue details
   */
  getIssue(id: string): Promise<EnhancedIssue>
  
  /**
   * Update existing issue with partial updates
   * @param id Issue identifier
   * @param updates Partial issue data to update
   * @returns Promise resolving to updated issue
   */
  updateIssue(id: string, updates: UpdateIssueInput): Promise<EnhancedIssue>
  
  /**
   * List issues with comprehensive filtering and sorting
   * @param filters Issue filtering and query options
   * @returns Promise resolving to array of issues
   */
  listIssues(filters: IssueFilters): Promise<EnhancedIssue[]>
  
  /**
   * Delete issue and handle dependency cleanup
   * @param id Issue identifier
   * @returns Promise resolving to operation result
   */
  deleteIssue(id: string): Promise<OperationResult<void>>
  
  // -------------------------------------------------------------------------
  // Dependency Graph Management
  // -------------------------------------------------------------------------
  
  /**
   * Add dependency relationship between issues
   * @param blockerId Issue that must complete first
   * @param blockedId Issue that waits for blocker
   * @param type Type of dependency relationship
   * @returns Promise resolving to created dependency
   */
  addDependency(
    blockerId: string, 
    blockedId: string, 
    type?: DependencyType
  ): Promise<Dependency>
  
  /**
   * Remove dependency relationship
   * @param dependencyId Dependency identifier
   * @returns Promise resolving to operation result
   */
  removeDependency(dependencyId: string): Promise<OperationResult<void>>
  
  /**
   * Get complete dependency graph for project with analysis
   * @param projectId Project identifier
   * @returns Promise resolving to dependency graph and analysis
   */
  getDependencyGraph(projectId: string): Promise<DependencyGraph>
  
  /**
   * Validate dependency graph for circular dependencies
   * @param projectId Project identifier
   * @returns Promise resolving to validation results
   */
  validateDependencyGraph(projectId: string): Promise<{
    isValid: boolean
    circularDependencies: string[][]
    errors: string[]
  }>
  
  // -------------------------------------------------------------------------
  // Workflow State Management
  // -------------------------------------------------------------------------
  
  /**
   * Get all workflow states for a project
   * @param projectId Project identifier
   * @returns Promise resolving to workflow states
   */
  getWorkflowStates(projectId: string): Promise<WorkflowState[]>
  
  /**
   * Create new workflow state
   * @param projectId Project identifier
   * @param state Workflow state configuration
   * @returns Promise resolving to created state
   */
  createWorkflowState(
    projectId: string, 
    state: Omit<WorkflowState, 'id' | 'project_id' | 'created_at' | 'updated_at'>
  ): Promise<WorkflowState>
  
  /**
   * Update issue workflow state with validation
   * @param issueId Issue identifier
   * @param stateId New workflow state identifier
   * @returns Promise resolving to updated issue
   */
  updateIssueState(issueId: string, stateId: string): Promise<EnhancedIssue>
  
  /**
   * Get valid state transitions for an issue
   * @param issueId Issue identifier
   * @returns Promise resolving to available transitions
   */
  getValidStateTransitions(issueId: string): Promise<WorkflowState[]>
  
  // -------------------------------------------------------------------------
  // Label and Categorization Management
  // -------------------------------------------------------------------------
  
  /**
   * Create new label
   * @param label Label configuration
   * @returns Promise resolving to created label
   */
  createLabel(label: CreateLabelInput): Promise<Label>
  
  /**
   * Get all labels for a project
   * @param projectId Project identifier
   * @returns Promise resolving to project labels
   */
  getProjectLabels(projectId: string): Promise<Label[]>
  
  /**
   * Add label to issue
   * @param issueId Issue identifier
   * @param labelId Label identifier
   * @returns Promise resolving to operation result
   */
  addLabelToIssue(issueId: string, labelId: string): Promise<OperationResult<void>>
  
  /**
   * Remove label from issue
   * @param issueId Issue identifier
   * @param labelId Label identifier
   * @returns Promise resolving to operation result
   */
  removeLabelFromIssue(issueId: string, labelId: string): Promise<OperationResult<void>>
  
  // -------------------------------------------------------------------------
  // Task Orchestration and Recommendations
  // -------------------------------------------------------------------------
  
  /**
   * Get intelligent next task recommendation based on project state
   * @param projectId Project identifier
   * @param context Additional context for recommendation
   * @returns Promise resolving to task recommendation
   */
  getNextTaskRecommendation(
    projectId: string, 
    context?: { focusArea?: string; recentWork?: string[] }
  ): Promise<TaskRecommendation>
  
  /**
   * Get all available (unblocked) issues for immediate work
   * @param projectId Project identifier
   * @param assigneeId Optional assignee filter
   * @returns Promise resolving to available issues
   */
  getAvailableIssues(
    projectId: string, 
    assigneeId?: string
  ): Promise<EnhancedIssue[]>
  
  /**
   * Mark issue as started and update dependencies
   * @param issueId Issue identifier
   * @returns Promise resolving to updated issue
   */
  startIssue(issueId: string): Promise<EnhancedIssue>
  
  /**
   * Mark issue as completed and unblock dependents
   * @param issueId Issue identifier
   * @returns Promise resolving to completion result with unblocked issues
   */
  completeIssue(issueId: string): Promise<{
    issue: EnhancedIssue
    unblockedIssues: EnhancedIssue[]
  }>
  
  // -------------------------------------------------------------------------
  // Data Portability and Migration
  // -------------------------------------------------------------------------
  
  /**
   * Export complete project data for migration
   * @param projectId Project identifier
   * @param options Export configuration options
   * @returns Promise resolving to export data
   */
  exportData(
    projectId: string, 
    options?: Partial<ExportOptions>
  ): Promise<ExportData>
  
  /**
   * Import data from another provider
   * @param data Export data to import
   * @param options Import configuration options
   * @returns Promise resolving to import results
   */
  importData(
    data: ExportData, 
    options?: {
      overwriteExisting?: boolean
      validateData?: boolean
      createMissingWorkflowStates?: boolean
      enableStreaming?: boolean
      chunkSize?: number
      maxMemoryUsage?: number
    }
  ): Promise<ImportResult>
  
  /**
   * Synchronize data with another provider
   * @param otherProvider Target provider for synchronization
   * @param projectId Project to synchronize
   * @param options Synchronization options
   * @returns Promise resolving to sync results
   */
  syncWith(
    otherProvider: IssueProvider, 
    projectId: string,
    options?: {
      direction: 'push' | 'pull' | 'bidirectional'
      conflictResolution: 'source_wins' | 'target_wins' | 'manual'
      dryRun?: boolean
    }
  ): Promise<SyncResult>
  
  /**
   * Validate data integrity and consistency
   * @param projectId Project identifier
   * @returns Promise resolving to validation results
   */
  validateDataIntegrity(projectId: string): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    statistics: {
      totalIssues: number
      hierarchyViolations: number
      dependencyViolations: number
      orphanedEntities: number
    }
  }>
}

// =============================================================================
// Provider Factory and Management Types
// =============================================================================

/**
 * Provider factory interface for creating provider instances
 */
export interface ProviderFactory {
  /**
   * Create provider instance from configuration
   * @param config Provider configuration
   * @returns Promise resolving to provider instance
   */
  createProvider(config: ProviderConfig): Promise<IssueProvider>
  
  /**
   * Create provider instance with capability validation
   * @param config Provider configuration
   * @param requiredCapabilities Capabilities that must be supported
   * @returns Promise resolving to provider instance with capability validation
   */
  createProviderWithCapabilities?(
    config: ProviderConfig,
    requiredCapabilities: string[]
  ): Promise<{
    provider: IssueProvider
    capabilityValidation: {
      isValid: boolean
      supportedCapabilities: string[]
      unsupportedCapabilities: string[]
      warnings: string[]
    }
  }>
  
  /**
   * Get supported provider types
   * @returns Array of supported provider types
   */
  getSupportedTypes(): ProviderType[]
  
  /**
   * Get provider type capabilities without creating instance
   * @param providerType Provider type to check
   * @returns Promise resolving to provider type capabilities
   */
  getProviderTypeCapabilities?(providerType: ProviderType): Promise<{
    capabilities: Map<string, {
      isSupported: boolean
      limitations?: string[]
      implementationNotes?: string
    }>
    overallScore: number
  }>
  
  /**
   * Validate provider configuration
   * @param config Provider configuration to validate
   * @returns Validation result with errors if invalid
   */
  validateConfig(config: ProviderConfig): {
    isValid: boolean
    errors: string[]
  }

  /**
   * Find best provider for required capabilities
   * @param requiredCapabilities List of required capability IDs
   * @param availableConfigs Available provider configurations
   * @returns Promise resolving to best provider recommendation
   */
  findBestProviderForCapabilities?(
    requiredCapabilities: string[],
    availableConfigs: ProviderConfig[]
  ): Promise<{
    recommendedConfig: ProviderConfig | null
    compatibilityScore: number
    analysis: {
      supportedCapabilities: string[]
      unsupportedCapabilities: string[]
      alternatives: {
        config: ProviderConfig
        score: number
        gaps: string[]
      }[]
    }
  }>
}

/**
 * Provider registry for managing multiple provider instances
 */
export interface ProviderRegistry {
  /**
   * Register provider instance
   * @param provider Provider to register
   * @returns Registration result
   */
  registerProvider(provider: IssueProvider): Promise<OperationResult<void>>
  
  /**
   * Get provider by ID
   * @param id Provider identifier
   * @returns Provider instance or undefined
   */
  getProvider(id: string): IssueProvider | undefined
  
  /**
   * List all registered providers
   * @returns Array of provider information
   */
  listProviders(): ProviderInfo[]
  
  /**
   * Remove provider from registry
   * @param id Provider identifier
   * @returns Removal result
   */
  unregisterProvider(id: string): Promise<OperationResult<void>>
}