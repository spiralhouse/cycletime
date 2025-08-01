/**
 * JCVD Export Data Format Specification
 * Comprehensive format for seamless provider migration with data integrity validation
 * 
 * This module implements the standardized ExportData format that enables zero-loss
 * migration between any two providers with complete integrity validation.
 * 
 * @version 1.0.0
 * @author JCVD Software Architect Agent
 */

import crypto from 'crypto'
import { z } from 'zod'
import type {
  Project,
  Issue,
  WorkflowState,
  IssueDependency,
  Label,
  IssueComment,
  IssueType,
  IssuePriority,
  WorkflowStateType,
  DependencyType
} from '../database/models/schema-types.js'
import type {
  ProviderType,
  EnhancedIssue,
  Dependency
} from './types.js'

// =============================================================================
// Core Export Data Format
// =============================================================================

/**
 * Export format version for schema evolution and compatibility
 */
export const EXPORT_FORMAT_VERSION = '1.0.0'

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'yaml' | 'compressed-json'

/**
 * Export compression options for large datasets
 */
export interface CompressionOptions {
  /** Enable gzip compression */
  enabled: boolean
  /** Compression level (1-9, 9 = best compression) */
  level: number
  /** Chunk size for streaming compression */
  chunkSize: number
}

/**
 * Export configuration options
 */
export interface ExportOptions {
  /** Include issue comments in export */
  includeComments: boolean
  /** Include historical activity data */
  includeHistory: boolean
  /** Include sensitive data (tokens, private fields) */
  includeSensitiveData: boolean
  /** Export format preference */
  format: ExportFormat
  /** Compression settings for large exports */
  compression: CompressionOptions
  /** Enable streaming for large datasets */
  enableStreaming: boolean
  /** Maximum memory usage for large exports (MB) */
  maxMemoryUsage: number
  /** Validate data integrity during export */
  validateIntegrity: boolean
}

/**
 * Default export options for standard migrations
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeComments: true,
  includeHistory: false,
  includeSensitiveData: false,
  format: 'json',
  compression: {
    enabled: false,
    level: 6,
    chunkSize: 64 * 1024 // 64KB chunks
  },
  enableStreaming: false,
  maxMemoryUsage: 512, // 512MB
  validateIntegrity: true
}

/**
 * Provider information embedded in export
 */
export interface ExportProviderInfo {
  /** Provider type identifier */
  type: ProviderType
  /** Provider version */
  version: string
  /** Provider instance ID */
  id: string
  /** Provider name */
  name: string
  /** Provider capabilities at export time */
  capabilities: {
    supportsHierarchy: boolean
    supportsDependencies: boolean
    supportsEstimation: boolean
    supportsLabels: boolean
    supportsComments: boolean
  }
  /** Export timestamp */
  exportedAt: Date
  /** Export configuration used */
  exportOptions: ExportOptions
}

/**
 * Data integrity checksums for validation
 */
export interface DataChecksums {
  /** Individual entity type checksums */
  projects: string
  issues: string
  dependencies: string
  workflowStates: string
  labels: string
  comments: string
  /** Overall data integrity checksum */
  overall: string
  /** Checksum algorithm used */
  algorithm: 'sha256' | 'sha512'
  /** Checksum generation timestamp */
  generatedAt: Date
}

/**
 * Export validation metadata
 */
export interface ExportValidation {
  /** Issue hierarchy is valid */
  issueHierarchyValid: boolean
  /** Dependency graph has no cycles */
  dependencyGraphValid: boolean
  /** All foreign key constraints satisfied */
  foreignKeyConstraintsValid: boolean
  /** Data integrity score (0-1) */
  dataIntegrityScore: number
  /** Validation errors found */
  validationErrors: ValidationError[]
  /** Validation warnings */
  validationWarnings: ValidationWarning[]
  /** Validation timestamp */
  validatedAt: Date
}

/**
 * Export statistics and metrics
 */
export interface ExportStatistics {
  /** Entity counts by type */
  entityCounts: {
    projects: number
    issues: number
    epics: number
    stories: number
    subtasks: number
    dependencies: number
    workflowStates: number
    labels: number
    comments: number
  }
  /** Data size metrics */
  dataSizeMetrics: {
    totalSizeBytes: number
    compressedSizeBytes?: number
    compressionRatio?: number
    estimatedImportTime: number
  }
  /** Complexity metrics */
  complexityMetrics: {
    maxHierarchyDepth: number
    averageIssueComplexity: number
    dependencyGraphComplexity: number
    cyclomaticComplexity: number
  }
  /** Export performance metrics */
  performanceMetrics: {
    exportDurationMs: number
    memoryUsageMB: number
    diskUsageMB: number
    compressionDurationMs?: number
  }
}

/**
 * Complete export metadata package
 */
export interface ExportMetadata {
  /** Export validation results */
  validation: ExportValidation
  /** Data integrity checksums */
  checksums: DataChecksums
  /** Export statistics and metrics */
  statistics: ExportStatistics
  /** Schema compatibility information */
  compatibility: {
    /** Minimum format version required for import */
    minFormatVersion: string
    /** Schema evolution changes */
    schemaChanges: string[]
    /** Breaking changes that affect import */
    breakingChanges: string[]
  }
}

/**
 * Comprehensive export data format with full validation and integrity checking
 */
export interface ExportData {
  /** Export format version for compatibility */
  version: string
  /** Source provider information */
  sourceProvider: ExportProviderInfo
  
  // Core data entities
  /** All projects in the export */
  projects: Project[]
  /** All issues with enhanced relationship data */
  issues: EnhancedIssue[]
  /** All dependencies and relationships */
  dependencies: Dependency[]
  /** Workflow states and configurations */
  workflowStates: WorkflowState[]
  /** Labels and categorization data */
  labels: Label[]
  /** Comments and activity history */
  comments: IssueComment[]
  
  /** Comprehensive export metadata */
  metadata: ExportMetadata
}

// =============================================================================
// Validation Error Types
// =============================================================================

/**
 * Validation error severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * Validation error details
 */
export interface ValidationError {
  /** Error type for programmatic handling */
  type: 'hierarchy_violation' | 'dependency_cycle' | 'foreign_key_violation' | 'data_corruption' | 'missing_required_field'
  /** Severity level */
  severity: ValidationSeverity
  /** Human-readable error message */
  message: string
  /** Entity type that has the error */
  entityType: string
  /** Entity ID with the error */
  entityId: string
  /** Field that has the error */
  field?: string
  /** Expected value */
  expectedValue?: any
  /** Actual value found */
  actualValue?: any
  /** Suggested fix */
  suggestedFix?: string
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  /** Warning type */
  type: 'performance_concern' | 'compatibility_issue' | 'data_inconsistency' | 'deprecated_field'
  /** Warning message */
  message: string
  /** Entity type */
  entityType: string
  /** Entity ID */
  entityId?: string
  /** Impact level */
  impact: 'low' | 'medium' | 'high'
  /** Recommended action */
  recommendation?: string
}

// =============================================================================
// Validation Schema (Zod-based)
// =============================================================================

/**
 * Zod schema for export data validation
 */
export const ExportDataSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format'),
  sourceProvider: z.object({
    type: z.enum(['sqlite', 'linear', 'github', 'jira']),
    version: z.string(),
    id: z.string(),
    name: z.string(),
    capabilities: z.object({
      supportsHierarchy: z.boolean(),
      supportsDependencies: z.boolean(),
      supportsEstimation: z.boolean(),
      supportsLabels: z.boolean(),
      supportsComments: z.boolean()
    }),
    exportedAt: z.date(),
    exportOptions: z.object({
      includeComments: z.boolean(),
      includeHistory: z.boolean(),
      includeSensitiveData: z.boolean(),
      format: z.enum(['json', 'yaml', 'compressed-json']),
      compression: z.object({
        enabled: z.boolean(),
        level: z.number().min(1).max(9),
        chunkSize: z.number().positive()
      }),
      enableStreaming: z.boolean(),
      maxMemoryUsage: z.number().positive(),
      validateIntegrity: z.boolean()
    })
  }),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    key: z.string().optional(),
    created_at: z.date(),
    updated_at: z.date()
  })),
  issues: z.array(z.object({
    id: z.string(),
    project_id: z.string(),
    parent_id: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    state_id: z.string().optional(),
    priority: z.number().min(0).max(4),
    estimate: z.number().optional(),
    issue_type: z.enum(['epic', 'story', 'subtask']),
    assignee_id: z.string().optional(),
    created_at: z.date(),
    updated_at: z.date()
  })),
  dependencies: z.array(z.object({
    id: z.string(),
    blocker_id: z.string(),
    blocked_id: z.string(),
    dependency_type: z.enum(['blocks', 'related', 'duplicate']),
    created_at: z.date()
  })),
  workflowStates: z.array(z.object({
    id: z.string(),
    project_id: z.string(),
    name: z.string(),
    type: z.enum(['backlog', 'unstarted', 'started', 'completed', 'canceled']),
    position: z.number(),
    color: z.string(),
    created_at: z.date(),
    updated_at: z.date()
  })),
  labels: z.array(z.object({
    id: z.string(),
    project_id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.string().optional(),
    created_at: z.date(),
    updated_at: z.date()
  })),
  comments: z.array(z.object({
    id: z.string(),
    issue_id: z.string(),
    body: z.string(),
    author_id: z.string().optional(),
    created_at: z.date(),
    updated_at: z.date()
  })),
  metadata: z.object({
    validation: z.object({
      issueHierarchyValid: z.boolean(),
      dependencyGraphValid: z.boolean(),
      foreignKeyConstraintsValid: z.boolean(),
      dataIntegrityScore: z.number().min(0).max(1),
      validationErrors: z.array(z.object({
        type: z.enum(['hierarchy_violation', 'dependency_cycle', 'foreign_key_violation', 'data_corruption', 'missing_required_field']),
        severity: z.enum(['error', 'warning', 'info']),
        message: z.string(),
        entityType: z.string(),
        entityId: z.string(),
        field: z.string().optional(),
        expectedValue: z.any().optional(),
        actualValue: z.any().optional(),
        suggestedFix: z.string().optional()
      })),
      validationWarnings: z.array(z.object({
        type: z.enum(['performance_concern', 'compatibility_issue', 'data_inconsistency', 'deprecated_field']),
        message: z.string(),
        entityType: z.string(),
        entityId: z.string().optional(),
        impact: z.enum(['low', 'medium', 'high']),
        recommendation: z.string().optional()
      })),
      validatedAt: z.date()
    }),
    checksums: z.object({
      projects: z.string(),
      issues: z.string(),
      dependencies: z.string(),
      workflowStates: z.string(),
      labels: z.string(),
      comments: z.string(),
      overall: z.string(),
      algorithm: z.enum(['sha256', 'sha512']),
      generatedAt: z.date()
    }),
    statistics: z.object({
      entityCounts: z.object({
        projects: z.number().nonnegative(),
        issues: z.number().nonnegative(),
        epics: z.number().nonnegative(),
        stories: z.number().nonnegative(),
        subtasks: z.number().nonnegative(),
        dependencies: z.number().nonnegative(),
        workflowStates: z.number().nonnegative(),
        labels: z.number().nonnegative(),
        comments: z.number().nonnegative()
      }),
      dataSizeMetrics: z.object({
        totalSizeBytes: z.number().nonnegative(),
        compressedSizeBytes: z.number().nonnegative().optional(),
        compressionRatio: z.number().positive().optional(),
        estimatedImportTime: z.number().nonnegative()
      }),
      complexityMetrics: z.object({
        maxHierarchyDepth: z.number().nonnegative(),
        averageIssueComplexity: z.number().nonnegative(),
        dependencyGraphComplexity: z.number().nonnegative(),
        cyclomaticComplexity: z.number().nonnegative()
      }),
      performanceMetrics: z.object({
        exportDurationMs: z.number().nonnegative(),
        memoryUsageMB: z.number().nonnegative(),
        diskUsageMB: z.number().nonnegative(),
        compressionDurationMs: z.number().nonnegative().optional()
      })
    }),
    compatibility: z.object({
      minFormatVersion: z.string(),
      schemaChanges: z.array(z.string()),
      breakingChanges: z.array(z.string())
    })
  })
})

// =============================================================================
// Data Integrity and Validation Utilities
// =============================================================================

/**
 * Calculate SHA-256 checksum for data integrity verification
 */
export function calculateChecksum(data: any, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
  const hash = crypto.createHash(algorithm)
  hash.update(JSON.stringify(data, Object.keys(data).sort()))
  return hash.digest('hex')
}

/**
 * Generate checksums for all data sections
 */
export function generateDataChecksums(exportData: Omit<ExportData, 'metadata'>): DataChecksums {
  const generatedAt = new Date()
  const algorithm = 'sha256'
  
  return {
    projects: calculateChecksum(exportData.projects, algorithm),
    issues: calculateChecksum(exportData.issues, algorithm),
    dependencies: calculateChecksum(exportData.dependencies, algorithm),
    workflowStates: calculateChecksum(exportData.workflowStates, algorithm),
    labels: calculateChecksum(exportData.labels, algorithm),
    comments: calculateChecksum(exportData.comments, algorithm),
    overall: calculateChecksum({
      projects: exportData.projects,
      issues: exportData.issues,
      dependencies: exportData.dependencies,
      workflowStates: exportData.workflowStates,
      labels: exportData.labels,
      comments: exportData.comments
    }, algorithm),
    algorithm,
    generatedAt
  }
}

/**
 * Verify data integrity using checksums
 */
export function verifyDataIntegrity(exportData: ExportData): boolean {
  const coreData = {
    projects: exportData.projects,
    issues: exportData.issues,
    dependencies: exportData.dependencies,
    workflowStates: exportData.workflowStates,
    labels: exportData.labels,
    comments: exportData.comments
  }
  
  const currentChecksums = generateDataChecksums(coreData)
  const storedChecksums = exportData.metadata.checksums
  
  return (
    currentChecksums.projects === storedChecksums.projects &&
    currentChecksums.issues === storedChecksums.issues &&
    currentChecksums.dependencies === storedChecksums.dependencies &&
    currentChecksums.workflowStates === storedChecksums.workflowStates &&
    currentChecksums.labels === storedChecksums.labels &&
    currentChecksums.comments === storedChecksums.comments &&
    currentChecksums.overall === storedChecksums.overall
  )
}

/**
 * Validate issue hierarchy constraints
 */
export function validateIssueHierarchy(issues: Issue[]): ValidationError[] {
  const errors: ValidationError[] = []
  const issueMap = new Map(issues.map(issue => [issue.id, issue]))
  
  for (const issue of issues) {
    // Validate hierarchy rules
    switch (issue.issue_type) {
      case 'epic':
        if (issue.parent_id) {
          errors.push({
            type: 'hierarchy_violation',
            severity: 'error',
            message: 'Epics cannot have parent issues',
            entityType: 'issue',
            entityId: issue.id,
            field: 'parent_id',
            actualValue: issue.parent_id,
            expectedValue: null,
            suggestedFix: 'Remove parent_id or change issue_type'
          })
        }
        break
        
      case 'story':
        if (issue.parent_id) {
          const parent = issueMap.get(issue.parent_id)
          if (!parent) {
            errors.push({
              type: 'foreign_key_violation',
              severity: 'error',
              message: 'Story references non-existent parent issue',
              entityType: 'issue',
              entityId: issue.id,
              field: 'parent_id',
              actualValue: issue.parent_id,
              suggestedFix: 'Remove parent_id or create missing parent issue'
            })
          } else if (parent.issue_type !== 'epic') {
            errors.push({
              type: 'hierarchy_violation',
              severity: 'error',
              message: 'Stories can only have epic parents',
              entityType: 'issue',
              entityId: issue.id,
              field: 'parent_id',
              actualValue: parent.issue_type,
              expectedValue: 'epic',
              suggestedFix: 'Change parent to epic or make this issue an epic'
            })
          }
        }
        break
        
      case 'subtask':
        if (!issue.parent_id) {
          errors.push({
            type: 'hierarchy_violation',
            severity: 'error',
            message: 'Subtasks must have a parent issue',
            entityType: 'issue',
            entityId: issue.id,
            field: 'parent_id',
            actualValue: null,
            expectedValue: 'string',
            suggestedFix: 'Add parent_id or change issue_type to story'
          })
        } else {
          const parent = issueMap.get(issue.parent_id)
          if (!parent) {
            errors.push({
              type: 'foreign_key_violation',
              severity: 'error',
              message: 'Subtask references non-existent parent issue',
              entityType: 'issue',
              entityId: issue.id,
              field: 'parent_id',
              actualValue: issue.parent_id,
              suggestedFix: 'Create missing parent issue or change parent_id'
            })
          } else if (parent.issue_type !== 'story') {
            errors.push({
              type: 'hierarchy_violation',
              severity: 'error',
              message: 'Subtasks can only have story parents',
              entityType: 'issue',
              entityId: issue.id,
              field: 'parent_id',
              actualValue: parent.issue_type,
              expectedValue: 'story',
              suggestedFix: 'Change parent to story or make this issue a story'
            })
          }
        }
        break
    }
  }
  
  return errors
}

/**
 * Detect circular dependencies in dependency graph
 */
export function detectCircularDependencies(dependencies: Dependency[]): string[][] {
  const graph = new Map<string, string[]>()
  const circularPaths: string[][] = []
  
  // Build adjacency list
  for (const dep of dependencies) {
    if (!graph.has(dep.blocker.id)) {
      graph.set(dep.blocker.id, [])
    }
    graph.get(dep.blocker.id)!.push(dep.blocked.id)
  }
  
  // DFS to detect cycles
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  
  function dfs(node: string, path: string[]): void {
    visited.add(node)
    recursionStack.add(node)
    path.push(node)
    
    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path])
      } else if (recursionStack.has(neighbor)) {
        // Found cycle - extract the circular path
        const cycleStart = path.indexOf(neighbor)
        const cyclePath = path.slice(cycleStart).concat([neighbor])
        circularPaths.push(cyclePath)
      }
    }
    
    recursionStack.delete(node)
  }
  
  // Check all nodes for cycles
  for (const [node] of graph) {
    if (!visited.has(node)) {
      dfs(node, [])
    }
  }
  
  return circularPaths
}

/**
 * Validate dependency graph integrity
 */
export function validateDependencyGraph(
  issues: Issue[], 
  dependencies: Dependency[]
): ValidationError[] {
  const errors: ValidationError[] = []
  const issueIds = new Set(issues.map(issue => issue.id))
  
  // Check foreign key constraints and self-dependencies
  for (const dependency of dependencies) {
    // Check for self-dependencies first
    if (dependency.blocker.id === dependency.blocked.id) {
      errors.push({
        type: 'dependency_cycle',
        severity: 'error',
        message: 'Issue cannot depend on itself',
        entityType: 'dependency',
        entityId: dependency.id,
        field: 'blocked_id',
        actualValue: dependency.blocked.id,
        expectedValue: 'different issue id',
        suggestedFix: 'Remove self-dependency'
      })
      continue // Skip foreign key checks for self-dependencies
    }
    
    if (!issueIds.has(dependency.blocker.id)) {
      errors.push({
        type: 'foreign_key_violation',
        severity: 'error',
        message: 'Dependency references non-existent blocker issue',
        entityType: 'dependency',
        entityId: dependency.id,
        field: 'blocker_id',
        actualValue: dependency.blocker.id,
        suggestedFix: 'Remove dependency or create missing issue'
      })
    }
    
    if (!issueIds.has(dependency.blocked.id)) {
      errors.push({
        type: 'foreign_key_violation',
        severity: 'error',
        message: 'Dependency references non-existent blocked issue',
        entityType: 'dependency',
        entityId: dependency.id,
        field: 'blocked_id',
        actualValue: dependency.blocked.id,
        suggestedFix: 'Remove dependency or create missing issue'
      })
    }
  }
  
  // Check for circular dependencies
  const circularPaths = detectCircularDependencies(dependencies)
  for (const path of circularPaths) {
    const pathStr = path.join(' -> ')
    errors.push({
      type: 'dependency_cycle',
      severity: 'error',
      message: `Circular dependency detected: ${pathStr}`,
      entityType: 'dependency',
      entityId: `cycle-${path[0]}`,
      suggestedFix: 'Remove one of the dependencies in the cycle'
    })
  }
  
  return errors
}

/**
 * Calculate comprehensive export statistics
 */
export function calculateExportStatistics(
  exportData: Omit<ExportData, 'metadata'>,
  exportDurationMs: number,
  memoryUsageMB: number
): ExportStatistics {
  const issueTypeCounts = exportData.issues.reduce((counts, issue) => {
    counts[issue.issue_type]++
    return counts
  }, { epic: 0, story: 0, subtask: 0 })
  
  const totalSizeBytes = JSON.stringify(exportData).length
  const maxHierarchyDepth = calculateMaxHierarchyDepth(exportData.issues)
  const dependencyGraphComplexity = calculateDependencyComplexity(exportData.dependencies)
  
  return {
    entityCounts: {
      projects: exportData.projects.length,
      issues: exportData.issues.length,
      epics: issueTypeCounts.epic,
      stories: issueTypeCounts.story,
      subtasks: issueTypeCounts.subtask,
      dependencies: exportData.dependencies.length,
      workflowStates: exportData.workflowStates.length,
      labels: exportData.labels.length,
      comments: exportData.comments.length
    },
    dataSizeMetrics: {
      totalSizeBytes,
      estimatedImportTime: Math.max(1000, totalSizeBytes / 1000) // Rough estimate: 1ms per KB
    },
    complexityMetrics: {
      maxHierarchyDepth,
      averageIssueComplexity: calculateAverageIssueComplexity(exportData.issues),
      dependencyGraphComplexity,
      cyclomaticComplexity: dependencyGraphComplexity + maxHierarchyDepth
    },
    performanceMetrics: {
      exportDurationMs,
      memoryUsageMB,
      diskUsageMB: totalSizeBytes / (1024 * 1024)
    }
  }
}

/**
 * Calculate maximum hierarchy depth
 */
function calculateMaxHierarchyDepth(issues: Issue[]): number {
  const issueMap = new Map(issues.map(issue => [issue.id, issue]))
  let maxDepth = 0
  
  function getDepth(issueId: string, visited = new Set<string>()): number {
    if (visited.has(issueId)) return 0 // Prevent infinite recursion
    visited.add(issueId)
    
    const issue = issueMap.get(issueId)
    if (!issue || !issue.parent_id) return 1
    
    return 1 + getDepth(issue.parent_id, visited)
  }
  
  for (const issue of issues) {
    const depth = getDepth(issue.id)
    maxDepth = Math.max(maxDepth, depth)
  }
  
  return maxDepth
}

/**
 * Calculate average issue complexity based on relationships and content
 */
function calculateAverageIssueComplexity(issues: Issue[]): number {
  if (issues.length === 0) return 0
  
  const totalComplexity = issues.reduce((sum, issue) => {
    let complexity = 1 // Base complexity
    
    // Add complexity for description length
    if (issue.description) {
      complexity += Math.min(2, issue.description.length / 500)
    }
    
    // Add complexity for estimates
    if (issue.estimate) {
      complexity += issue.estimate / 10
    }
    
    // Add complexity for hierarchy
    if (issue.parent_id) complexity += 0.5
    
    return sum + complexity
  }, 0)
  
  return totalComplexity / issues.length
}

/**
 * Calculate dependency graph complexity
 */
function calculateDependencyComplexity(dependencies: Dependency[]): number {
  if (dependencies.length === 0) return 0
  
  // Build adjacency lists
  const outgoing = new Map<string, number>()
  const incoming = new Map<string, number>()
  
  for (const dep of dependencies) {
    outgoing.set(dep.blocker.id, (outgoing.get(dep.blocker.id) || 0) + 1)
    incoming.set(dep.blocked.id, (incoming.get(dep.blocked.id) || 0) + 1)
  }
  
  // Calculate complexity as sum of node degrees
  const nodes = new Set([...outgoing.keys(), ...incoming.keys()])
  let totalDegree = 0
  
  for (const node of nodes) {
    const outDegree = outgoing.get(node) || 0
    const inDegree = incoming.get(node) || 0
    totalDegree += outDegree + inDegree
  }
  
  return nodes.size > 0 ? totalDegree / nodes.size : 0
}

/**
 * Perform comprehensive validation of export data
 */
export function validateExportData(exportData: Omit<ExportData, 'metadata'>): ExportValidation {
  const validationErrors: ValidationError[] = []
  const validationWarnings: ValidationWarning[] = []
  
  // Validate issue hierarchy
  const hierarchyErrors = validateIssueHierarchy(exportData.issues)
  validationErrors.push(...hierarchyErrors)
  
  // Validate dependency graph
  const dependencyErrors = validateDependencyGraph(exportData.issues, exportData.dependencies)
  validationErrors.push(...dependencyErrors)
  
  // Validate foreign key constraints
  const fkErrors = validateForeignKeyConstraints(exportData)
  validationErrors.push(...fkErrors)
  
  // Generate warnings for performance concerns
  const performanceWarnings = generatePerformanceWarnings(exportData)
  validationWarnings.push(...performanceWarnings)
  
  // Calculate data integrity score
  const totalChecks = validationErrors.length + validationWarnings.length + 10 // Base checks
  const failedChecks = validationErrors.filter(e => e.severity === 'error').length
  const dataIntegrityScore = Math.max(0, (totalChecks - failedChecks) / totalChecks)
  
  return {
    issueHierarchyValid: hierarchyErrors.length === 0,
    dependencyGraphValid: dependencyErrors.length === 0,
    foreignKeyConstraintsValid: validationErrors.filter(e => e.type === 'foreign_key_violation').length === 0,
    dataIntegrityScore,
    validationErrors,
    validationWarnings,
    validatedAt: new Date()
  }
}

/**
 * Validate foreign key constraints across all entities
 */
function validateForeignKeyConstraints(exportData: Omit<ExportData, 'metadata'>): ValidationError[] {
  const errors: ValidationError[] = []
  const projectIds = new Set(exportData.projects.map(p => p.id))
  const issueIds = new Set(exportData.issues.map(i => i.id))
  const stateIds = new Set(exportData.workflowStates.map(s => s.id))
  const labelIds = new Set(exportData.labels.map(l => l.id))
  
  // Validate issue foreign keys
  for (const issue of exportData.issues) {
    if (!projectIds.has(issue.project_id)) {
      errors.push({
        type: 'foreign_key_violation',
        severity: 'error',
        message: 'Issue references non-existent project',
        entityType: 'issue',
        entityId: issue.id,
        field: 'project_id',
        actualValue: issue.project_id,
        suggestedFix: 'Create missing project or fix project_id'
      })
    }
    
    if (issue.state_id && !stateIds.has(issue.state_id)) {
      errors.push({
        type: 'foreign_key_violation',
        severity: 'error',
        message: 'Issue references non-existent workflow state',
        entityType: 'issue',
        entityId: issue.id,
        field: 'state_id',
        actualValue: issue.state_id,
        suggestedFix: 'Create missing workflow state or fix state_id'
      })
    }
  }
  
  // Validate workflow state foreign keys
  for (const state of exportData.workflowStates) {
    if (!projectIds.has(state.project_id)) {
      errors.push({
        type: 'foreign_key_violation',
        severity: 'error',
        message: 'Workflow state references non-existent project',
        entityType: 'workflowState',
        entityId: state.id,
        field: 'project_id',
        actualValue: state.project_id,
        suggestedFix: 'Create missing project or fix project_id'
      })
    }
  }
  
  // Validate label foreign keys
  for (const label of exportData.labels) {
    if (!projectIds.has(label.project_id)) {
      errors.push({
        type: 'foreign_key_violation',
        severity: 'error',
        message: 'Label references non-existent project',
        entityType: 'label',
        entityId: label.id,
        field: 'project_id',
        actualValue: label.project_id,
        suggestedFix: 'Create missing project or fix project_id'
      })
    }
  }
  
  // Validate comment foreign keys
  for (const comment of exportData.comments) {
    if (!issueIds.has(comment.issue_id)) {
      errors.push({
        type: 'foreign_key_violation',
        severity: 'error',
        message: 'Comment references non-existent issue',
        entityType: 'comment',
        entityId: comment.id,
        field: 'issue_id',
        actualValue: comment.issue_id,
        suggestedFix: 'Create missing issue or fix issue_id'
      })
    }
  }
  
  return errors
}

/**
 * Generate performance warnings for large datasets
 */
function generatePerformanceWarnings(exportData: Omit<ExportData, 'metadata'>): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  
  // Check for large dataset warnings
  if (exportData.issues.length > 10000) {
    warnings.push({
      type: 'performance_concern',
      message: 'Large number of issues may impact import performance',
      entityType: 'issue',
      impact: 'medium',
      recommendation: 'Consider splitting into multiple exports or enabling compression'
    })
  }
  
  if (exportData.dependencies.length > 5000) {
    warnings.push({
      type: 'performance_concern',
      message: 'Large number of dependencies may slow dependency analysis',
      entityType: 'dependency',
      impact: 'medium',
      recommendation: 'Review dependency graph for optimization opportunities'
    })
  }
  
  if (exportData.comments.length > 50000) {
    warnings.push({
      type: 'performance_concern',
      message: 'Large number of comments will increase import time significantly',
      entityType: 'comment',
      impact: 'high',
      recommendation: 'Consider excluding comments or filtering by date range'
    })
  }
  
  // Check for complexity warnings
  const maxDepth = calculateMaxHierarchyDepth(exportData.issues)
  if (maxDepth > 5) {
    warnings.push({
      type: 'performance_concern',
      message: 'Deep issue hierarchy may impact UI performance',
      entityType: 'issue',
      impact: 'low',
      recommendation: 'Consider flattening hierarchy or limiting depth'
    })
  }
  
  return warnings
}

// =============================================================================
// Export Data Creation and Serialization
// =============================================================================

/**
 * Create complete export data with full validation and metadata
 */
export function createExportData(
  sourceProvider: ExportProviderInfo,
  projects: Project[],
  issues: EnhancedIssue[],
  dependencies: Dependency[],
  workflowStates: WorkflowState[],
  labels: Label[],
  comments: IssueComment[],
  exportDurationMs: number,
  memoryUsageMB: number
): ExportData {
  const coreData = {
    projects,
    issues,
    dependencies,
    workflowStates,
    labels,
    comments
  }
  
  // Generate validation metadata
  const validation = validateExportData(coreData)
  
  // Generate data checksums
  const checksums = generateDataChecksums(coreData)
  
  // Calculate statistics
  const statistics = calculateExportStatistics(coreData, exportDurationMs, memoryUsageMB)
  
  return {
    version: EXPORT_FORMAT_VERSION,
    sourceProvider,
    ...coreData,
    metadata: {
      validation,
      checksums,
      statistics,
      compatibility: {
        minFormatVersion: '1.0.0',
        schemaChanges: [],
        breakingChanges: []
      }
    }
  }
}

/**
 * Serialize export data to JSON with optional compression
 */
export function serializeExportData(
  exportData: ExportData, 
  options: Pick<ExportOptions, 'format' | 'compression'> = { format: 'json', compression: { enabled: false, level: 6, chunkSize: 64 * 1024 } }
): string | Buffer {
  switch (options.format) {
    case 'json':
      return JSON.stringify(exportData, null, 2)
    
    case 'compressed-json':
      const jsonString = JSON.stringify(exportData)
      if (options.compression.enabled) {
        const zlib = require('zlib')
        return zlib.gzipSync(jsonString, { level: options.compression.level })
      }
      return jsonString
    
    case 'yaml':
      // YAML serialization would go here
      throw new Error('YAML format not yet implemented')
    
    default:
      throw new Error(`Unsupported export format: ${options.format}`)
  }
}

/**
 * Deserialize export data from JSON with validation
 */
export function deserializeExportData(data: string | Buffer): ExportData {
  let jsonString: string
  
  if (Buffer.isBuffer(data)) {
    // Try to decompress if it's a buffer
    try {
      const zlib = require('zlib')
      jsonString = zlib.gunzipSync(data).toString()
    } catch {
      jsonString = data.toString()
    }
  } else {
    jsonString = data
  }
  
  const parsed = JSON.parse(jsonString)
  
  // Convert date strings back to Date objects
  const convertDates = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj
    
    if (Array.isArray(obj)) {
      return obj.map(convertDates)
    }
    
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        result[key] = new Date(value)
      } else if (typeof value === 'object') {
        result[key] = convertDates(value)
      } else {
        result[key] = value
      }
    }
    return result
  }
  
  const exportData = convertDates(parsed) as ExportData
  
  // Validate the deserialized data
  const validationResult = ExportDataSchema.safeParse(exportData)
  if (!validationResult.success) {
    throw new Error(`Invalid export data format: ${validationResult.error.message}`)
  }
  
  // Verify data integrity
  if (!verifyDataIntegrity(exportData)) {
    throw new Error('Data integrity check failed - export data may be corrupted')
  }
  
  return exportData
}