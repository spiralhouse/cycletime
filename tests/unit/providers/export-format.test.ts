/**
 * JCVD Export Format Tests
 * Comprehensive test suite for export data format and validation utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type {
  ExportData,
  ExportProviderInfo,
  ValidationError,
  ValidationWarning
} from '../../../src/providers/export-format.js'
import {
  EXPORT_FORMAT_VERSION,
  DEFAULT_EXPORT_OPTIONS,
  calculateChecksum,
  generateDataChecksums,
  verifyDataIntegrity,
  validateIssueHierarchy,
  detectCircularDependencies,
  validateDependencyGraph,
  validateExportData,
  createExportData,
  serializeExportData,
  deserializeExportData,
  ExportDataSchema
} from '../../../src/providers/export-format.js'
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
} from '../../../src/database/models/schema-types.js'
import type { EnhancedIssue, Dependency } from '../../../src/providers/types.js'

// =============================================================================
// Test Data Fixtures
// =============================================================================

const createMockProject = (id: string = 'proj-1'): Project => ({
  id,
  name: 'Test Project',
  description: 'Test project description',
  key: 'TEST',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z')
})

const createMockWorkflowState = (
  id: string = 'state-1',
  projectId: string = 'proj-1',
  type: WorkflowStateType = 'unstarted'
): WorkflowState => ({
  id,
  project_id: projectId,
  name: 'Todo',
  type,
  position: 0,
  color: '#000000',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z')
})

const createMockIssue = (
  id: string = 'issue-1',
  type: IssueType = 'story',
  projectId: string = 'proj-1',
  parentId?: string
): Issue => ({
  id,
  project_id: projectId,
  parent_id: parentId,
  title: `Test ${type}`,
  description: `Test ${type} description`,
  state_id: 'state-1',
  priority: 3 as IssuePriority,
  estimate: type === 'story' ? 5 : undefined,
  issue_type: type,
  assignee_id: 'user-1',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z')
})

const createMockEnhancedIssue = (
  id: string = 'issue-1',
  type: IssueType = 'story',
  projectId: string = 'proj-1',
  parentId?: string
): EnhancedIssue => ({
  ...createMockIssue(id, type, projectId, parentId),
  labels: [],
  dependencies: [],
  dependents: [],
  comments: [],
  children: []
})

const createMockDependency = (
  id: string = 'dep-1',
  blockerId: string = 'issue-1',
  blockedId: string = 'issue-2'
): Dependency => ({
  id,
  blocker_id: blockerId,
  blocked_id: blockedId,
  dependency_type: 'blocks' as DependencyType,
  created_at: new Date('2024-01-01T00:00:00Z'),
  blocker: createMockIssue(blockerId),
  blocked: createMockIssue(blockedId)
})

const createMockLabel = (
  id: string = 'label-1',
  projectId: string = 'proj-1'
): Label => ({
  id,
  project_id: projectId,
  name: 'Test Label',
  color: '#FF0000',
  description: 'Test label description',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z')
})

const createMockComment = (
  id: string = 'comment-1',
  issueId: string = 'issue-1'
): IssueComment => ({
  id,
  issue_id: issueId,
  body: 'Test comment',
  author_id: 'user-1',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z')
})

const createMockProviderInfo = (): ExportProviderInfo => ({
  type: 'sqlite',
  version: '1.0.0',
  id: 'test-provider',
  name: 'Test Provider',
  capabilities: {
    supportsHierarchy: true,
    supportsDependencies: true,
    supportsEstimation: true,
    supportsLabels: true,
    supportsComments: true
  },
  exportedAt: new Date('2024-01-01T00:00:00Z'),
  exportOptions: DEFAULT_EXPORT_OPTIONS
})

// =============================================================================
// Checksum and Integrity Tests
// =============================================================================

describe('Export Format - Checksums and Integrity', () => {
  it('should calculate consistent SHA-256 checksums', () => {
    const data = { test: 'data', number: 42 }
    const checksum1 = calculateChecksum(data, 'sha256')
    const checksum2 = calculateChecksum(data, 'sha256')
    
    expect(checksum1).toBe(checksum2)
    expect(checksum1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex format
  })

  it('should generate different checksums for different data', () => {
    const data1 = { test: 'data1' }
    const data2 = { test: 'data2' }
    
    const checksum1 = calculateChecksum(data1, 'sha256')
    const checksum2 = calculateChecksum(data2, 'sha256')
    
    expect(checksum1).not.toBe(checksum2)
  })

  it('should generate data checksums for all entity types', () => {
    const exportData = {
      projects: [createMockProject()],
      issues: [createMockEnhancedIssue()],
      dependencies: [createMockDependency()],
      workflowStates: [createMockWorkflowState()],
      labels: [createMockLabel()],
      comments: [createMockComment()]
    }

    const checksums = generateDataChecksums(exportData)

    expect(checksums.projects).toMatch(/^[a-f0-9]{64}$/)
    expect(checksums.issues).toMatch(/^[a-f0-9]{64}$/)
    expect(checksums.dependencies).toMatch(/^[a-f0-9]{64}$/)
    expect(checksums.workflowStates).toMatch(/^[a-f0-9]{64}$/)
    expect(checksums.labels).toMatch(/^[a-f0-9]{64}$/)
    expect(checksums.comments).toMatch(/^[a-f0-9]{64}$/)
    expect(checksums.overall).toMatch(/^[a-f0-9]{64}$/)
    expect(checksums.algorithm).toBe('sha256')
    expect(checksums.generatedAt).toBeInstanceOf(Date)
  })

  it('should verify data integrity correctly', () => {
    const coreData = {
      projects: [createMockProject()],
      issues: [createMockEnhancedIssue()],
      dependencies: [createMockDependency()],
      workflowStates: [createMockWorkflowState()],
      labels: [createMockLabel()],
      comments: [createMockComment()]
    }

    const exportData = createExportData(
      createMockProviderInfo(),
      coreData.projects,
      coreData.issues,
      coreData.dependencies,
      coreData.workflowStates,
      coreData.labels,
      coreData.comments,
      1000,
      100
    )

    expect(verifyDataIntegrity(exportData)).toBe(true)
  })

  it('should detect data integrity violations', () => {
    const coreData = {
      projects: [createMockProject()],
      issues: [createMockEnhancedIssue()],
      dependencies: [createMockDependency()],
      workflowStates: [createMockWorkflowState()],
      labels: [createMockLabel()],
      comments: [createMockComment()]
    }

    const exportData = createExportData(
      createMockProviderInfo(),
      coreData.projects,
      coreData.issues,
      coreData.dependencies,
      coreData.workflowStates,
      coreData.labels,
      coreData.comments,
      1000,
      100
    )

    // Tamper with data after checksum generation
    exportData.issues[0].title = 'Modified title'

    expect(verifyDataIntegrity(exportData)).toBe(false)
  })
})

// =============================================================================
// Issue Hierarchy Validation Tests
// =============================================================================

describe('Export Format - Issue Hierarchy Validation', () => {
  it('should validate correct epic-story-subtask hierarchy', () => {
    const epic = createMockIssue('epic-1', 'epic')
    const story = createMockIssue('story-1', 'story', 'proj-1', 'epic-1')
    const subtask = createMockIssue('subtask-1', 'subtask', 'proj-1', 'story-1')

    const issues = [epic, story, subtask]
    const errors = validateIssueHierarchy(issues)

    expect(errors).toHaveLength(0)
  })

  it('should detect epic with parent (hierarchy violation)', () => {
    const epic = createMockIssue('epic-1', 'epic', 'proj-1', 'some-parent')
    const errors = validateIssueHierarchy([epic])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('hierarchy_violation')
    expect(errors[0].entityId).toBe('epic-1')
    expect(errors[0].message).toContain('Epics cannot have parent issues')
  })

  it('should detect subtask without parent', () => {
    const subtask = createMockIssue('subtask-1', 'subtask')
    const errors = validateIssueHierarchy([subtask])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('hierarchy_violation')
    expect(errors[0].entityId).toBe('subtask-1')
    expect(errors[0].message).toContain('Subtasks must have a parent issue')
  })

  it('should detect story with non-epic parent', () => {
    const story1 = createMockIssue('story-1', 'story')
    const story2 = createMockIssue('story-2', 'story', 'proj-1', 'story-1')
    
    const errors = validateIssueHierarchy([story1, story2])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('hierarchy_violation')
    expect(errors[0].entityId).toBe('story-2')
    expect(errors[0].message).toContain('Stories can only have epic parents')
  })

  it('should detect subtask with non-story parent', () => {
    const epic = createMockIssue('epic-1', 'epic')
    const subtask = createMockIssue('subtask-1', 'subtask', 'proj-1', 'epic-1')
    
    const errors = validateIssueHierarchy([epic, subtask])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('hierarchy_violation')
    expect(errors[0].entityId).toBe('subtask-1')
    expect(errors[0].message).toContain('Subtasks can only have story parents')
  })

  it('should detect missing parent references', () => {
    const story = createMockIssue('story-1', 'story', 'proj-1', 'missing-epic')
    const errors = validateIssueHierarchy([story])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('foreign_key_violation')
    expect(errors[0].entityId).toBe('story-1')
    expect(errors[0].message).toContain('references non-existent parent issue')
  })
})

// =============================================================================
// Dependency Graph Validation Tests
// =============================================================================

describe('Export Format - Dependency Graph Validation', () => {
  it('should detect circular dependencies', () => {
    const dep1 = createMockDependency('dep-1', 'issue-1', 'issue-2')
    const dep2 = createMockDependency('dep-2', 'issue-2', 'issue-3')
    const dep3 = createMockDependency('dep-3', 'issue-3', 'issue-1') // Creates cycle

    const circularPaths = detectCircularDependencies([dep1, dep2, dep3])

    expect(circularPaths.length).toBeGreaterThan(0)
    expect(circularPaths[0]).toContain('issue-1')
    expect(circularPaths[0]).toContain('issue-2')
    expect(circularPaths[0]).toContain('issue-3')
  })

  it('should validate dependency graph without cycles', () => {
    const issue1 = createMockIssue('issue-1')
    const issue2 = createMockIssue('issue-2')
    const issue3 = createMockIssue('issue-3')
    
    const dep1 = createMockDependency('dep-1', 'issue-1', 'issue-2')
    const dep2 = createMockDependency('dep-2', 'issue-2', 'issue-3')

    const errors = validateDependencyGraph([issue1, issue2, issue3], [dep1, dep2])

    expect(errors).toHaveLength(0)
  })

  it('should detect self-dependencies', () => {
    const issue1 = createMockIssue('issue-1')
    const selfDep = createMockDependency('dep-1', 'issue-1', 'issue-1')

    const errors = validateDependencyGraph([issue1], [selfDep])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('dependency_cycle')
    expect(errors[0].message).toContain('cannot depend on itself')
  })

  it('should detect dependencies with missing issues', () => {
    const issue1 = createMockIssue('issue-1')
    const dep = createMockDependency('dep-1', 'issue-1', 'missing-issue')

    const errors = validateDependencyGraph([issue1], [dep])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('foreign_key_violation')
    expect(errors[0].message).toContain('references non-existent blocked issue')
  })

  it('should detect complex circular dependencies', () => {
    // Create a more complex cycle: A -> B -> C -> D -> B
    const deps = [
      createMockDependency('dep1', 'A', 'B'),
      createMockDependency('dep2', 'B', 'C'),
      createMockDependency('dep3', 'C', 'D'),
      createMockDependency('dep4', 'D', 'B') // Creates cycle
    ]

    const circularPaths = detectCircularDependencies(deps)

    expect(circularPaths.length).toBeGreaterThan(0)
    
    // Should find the cycle involving B, C, D
    const cycle = circularPaths.find(path => 
      path.includes('B') && path.includes('C') && path.includes('D')
    )
    expect(cycle).toBeDefined()
  })
})

// =============================================================================
// Comprehensive Validation Tests
// =============================================================================

describe('Export Format - Comprehensive Validation', () => {
  it('should validate complete export data successfully', () => {
    const project = createMockProject()
    const workflowState = createMockWorkflowState()
    const epic = createMockEnhancedIssue('epic-1', 'epic')
    const story = createMockEnhancedIssue('story-1', 'story', 'proj-1', 'epic-1')
    const subtask = createMockEnhancedIssue('subtask-1', 'subtask', 'proj-1', 'story-1')
    // Create dependency that references existing issues
    const dependency = createMockDependency('dep-1', 'story-1', 'subtask-1')
    const label = createMockLabel()
    const comment = createMockComment()

    const exportData = {
      projects: [project],
      issues: [epic, story, subtask],
      dependencies: [dependency],
      workflowStates: [workflowState],
      labels: [label],
      comments: [comment]
    }

    const validation = validateExportData(exportData)

    expect(validation.issueHierarchyValid).toBe(true)
    expect(validation.dependencyGraphValid).toBe(true)
    expect(validation.foreignKeyConstraintsValid).toBe(true)
    expect(validation.dataIntegrityScore).toBeGreaterThan(0.8)
    expect(validation.validationErrors).toHaveLength(0)
  })

  it('should detect multiple validation issues', () => {
    const project = createMockProject()
    const workflowState = createMockWorkflowState()
    
    // Create invalid hierarchy: epic with parent
    const invalidEpic = createMockEnhancedIssue('epic-1', 'epic', 'proj-1', 'some-parent')
    
    // Create subtask without parent
    const invalidSubtask = createMockEnhancedIssue('subtask-1', 'subtask')
    
    // Create dependency with missing issue
    const invalidDependency = createMockDependency('dep-1', 'epic-1', 'missing-issue')
    
    // Create circular dependency
    const dep1 = createMockDependency('dep-2', 'epic-1', 'subtask-1')
    const dep2 = createMockDependency('dep-3', 'subtask-1', 'epic-1')

    const exportData = {
      projects: [project],
      issues: [invalidEpic, invalidSubtask],
      dependencies: [invalidDependency, dep1, dep2],
      workflowStates: [workflowState],
      labels: [],
      comments: []
    }

    const validation = validateExportData(exportData)

    expect(validation.issueHierarchyValid).toBe(false)
    expect(validation.dependencyGraphValid).toBe(false)
    expect(validation.foreignKeyConstraintsValid).toBe(false)
    expect(validation.validationErrors.length).toBeGreaterThan(0)
    
    // Check for specific error types
    const errorTypes = validation.validationErrors.map(e => e.type)
    expect(errorTypes).toContain('hierarchy_violation')
    expect(errorTypes).toContain('foreign_key_violation')
    expect(errorTypes).toContain('dependency_cycle')
  })

  it('should generate performance warnings for large datasets', () => {
    const project = createMockProject()
    const workflowState = createMockWorkflowState()
    
    // Create large number of issues to trigger performance warnings
    const issues = Array.from({ length: 15000 }, (_, i) => 
      createMockEnhancedIssue(`issue-${i}`, 'story')
    )
    
    const exportData = {
      projects: [project],
      issues,
      dependencies: [],
      workflowStates: [workflowState],
      labels: [],
      comments: []
    }

    const validation = validateExportData(exportData)

    expect(validation.validationWarnings.length).toBeGreaterThan(0)
    
    const performanceWarnings = validation.validationWarnings.filter(
      w => w.type === 'performance_concern'
    )
    expect(performanceWarnings.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Export Data Creation and Serialization Tests
// =============================================================================

describe('Export Format - Data Creation and Serialization', () => {
  it('should create complete export data with metadata', () => {
    const providerInfo = createMockProviderInfo()
    const project = createMockProject()
    const issue = createMockEnhancedIssue()
    const dependency = createMockDependency()
    const workflowState = createMockWorkflowState()
    const label = createMockLabel()
    const comment = createMockComment()

    const exportData = createExportData(
      providerInfo,
      [project],
      [issue],
      [dependency],
      [workflowState],
      [label],
      [comment],
      1000, // export duration
      100   // memory usage
    )

    expect(exportData.version).toBe(EXPORT_FORMAT_VERSION)
    expect(exportData.sourceProvider).toEqual(providerInfo)
    expect(exportData.projects).toHaveLength(1)
    expect(exportData.issues).toHaveLength(1)
    expect(exportData.dependencies).toHaveLength(1)
    expect(exportData.workflowStates).toHaveLength(1)
    expect(exportData.labels).toHaveLength(1)
    expect(exportData.comments).toHaveLength(1)
    
    // Check metadata
    expect(exportData.metadata.validation).toBeDefined()
    expect(exportData.metadata.checksums).toBeDefined()
    expect(exportData.metadata.statistics).toBeDefined()
    expect(exportData.metadata.compatibility).toBeDefined()
    
    // Check statistics
    expect(exportData.metadata.statistics.entityCounts.projects).toBe(1)
    expect(exportData.metadata.statistics.entityCounts.issues).toBe(1)
    expect(exportData.metadata.statistics.performanceMetrics.exportDurationMs).toBe(1000)
  })

  it('should serialize export data to JSON', () => {
    const exportData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [createMockEnhancedIssue()],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    const serialized = serializeExportData(exportData, { 
      format: 'json',
      compression: { enabled: false, level: 6, chunkSize: 64 * 1024 }
    })

    expect(typeof serialized).toBe('string')
    expect(() => JSON.parse(serialized as string)).not.toThrow()
  })

  it('should deserialize export data from JSON', () => {
    const originalData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [createMockEnhancedIssue()],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    const serialized = serializeExportData(originalData, { 
      format: 'json',
      compression: { enabled: false, level: 6, chunkSize: 64 * 1024 }
    })
    
    const deserialized = deserializeExportData(serialized as string)

    expect(deserialized.version).toBe(originalData.version)
    expect(deserialized.projects).toHaveLength(originalData.projects.length)
    expect(deserialized.issues).toHaveLength(originalData.issues.length)
    expect(deserialized.dependencies).toHaveLength(originalData.dependencies.length)
    
    // Verify dates are properly restored
    expect(deserialized.sourceProvider.exportedAt).toBeInstanceOf(Date)
    expect(deserialized.projects[0].created_at).toBeInstanceOf(Date)
  })

  it('should handle compressed export data', () => {
    const exportData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [createMockEnhancedIssue()],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    const compressed = serializeExportData(exportData, {
      format: 'compressed-json',
      compression: { enabled: true, level: 6, chunkSize: 64 * 1024 }
    })

    expect(Buffer.isBuffer(compressed)).toBe(true)
    
    const deserialized = deserializeExportData(compressed as Buffer)
    expect(deserialized.version).toBe(exportData.version)
    expect(deserialized.projects).toHaveLength(1)
  })

  it('should validate deserialized data schema', () => {
    const validData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [createMockEnhancedIssue()],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    const serialized = serializeExportData(validData, { 
      format: 'json',
      compression: { enabled: false, level: 6, chunkSize: 64 * 1024 }
    })

    // Should not throw for valid data
    expect(() => deserializeExportData(serialized as string)).not.toThrow()
  })

  it('should reject invalid export data schema', () => {
    const invalidData = {
      version: 'invalid-version', // Invalid semver format
      sourceProvider: {},          // Missing required fields
      projects: [],
      issues: [],
      dependencies: [],
      workflowStates: [],
      labels: [],
      comments: [],
      metadata: {}                 // Missing required metadata fields
    }

    const serialized = JSON.stringify(invalidData)

    expect(() => deserializeExportData(serialized)).toThrow('Invalid export data format')
  })

  it('should detect corrupted export data', () => {
    const exportData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [createMockEnhancedIssue()],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    let serialized = serializeExportData(exportData, { 
      format: 'json',
      compression: { enabled: false, level: 6, chunkSize: 64 * 1024 }
    }) as string

    // Corrupt the data by modifying the JSON
    const parsed = JSON.parse(serialized)
    parsed.projects[0].name = 'Corrupted Name'
    serialized = JSON.stringify(parsed)

    expect(() => deserializeExportData(serialized)).toThrow('Data integrity check failed')
  })
})

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('Export Format - Schema Validation', () => {
  it('should validate correct export data schema', () => {
    const exportData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [createMockEnhancedIssue()],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    const result = ExportDataSchema.safeParse(exportData)
    expect(result.success).toBe(true)
  })

  it('should reject export data with invalid version format', () => {
    const exportData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [createMockEnhancedIssue()],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    exportData.version = 'invalid-version'

    const result = ExportDataSchema.safeParse(exportData)
    expect(result.success).toBe(false)
    
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Version must be in semver format')
    }
  })

  it('should reject export data with invalid issue priority', () => {
    const issue = createMockEnhancedIssue()
    issue.priority = 10 as any // Invalid priority (should be 0-4)

    const exportData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [issue],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    const result = ExportDataSchema.safeParse(exportData)
    expect(result.success).toBe(false)
  })

  it('should reject export data with invalid issue type', () => {
    const issue = createMockEnhancedIssue()
    issue.issue_type = 'invalid-type' as any

    const exportData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [issue],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    const result = ExportDataSchema.safeParse(exportData)
    expect(result.success).toBe(false)
  })

  it('should reject export data with negative entity counts', () => {
    const exportData = createExportData(
      createMockProviderInfo(),
      [createMockProject()],
      [createMockEnhancedIssue()],
      [createMockDependency()],
      [createMockWorkflowState()],
      [createMockLabel()],
      [createMockComment()],
      1000,
      100
    )

    exportData.metadata.statistics.entityCounts.projects = -1

    const result = ExportDataSchema.safeParse(exportData)
    expect(result.success).toBe(false)
  })
})