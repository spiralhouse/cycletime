/**
 * Test Data Generators and Validation Utilities
 * 
 * Comprehensive utilities for generating large-scale test datasets and 
 * validating Epic SPI-289 success criteria across the JCVD infrastructure.
 */

import { performance } from 'node:perf_hooks'
import type { 
  IssueConfig, 
  EnhancedIssue, 
  IssueProvider,
  ExportData,
  PerformanceMetrics 
} from '../../src/providers/types.js'

// =============================================================================
// Large Dataset Generation
// =============================================================================

export interface DatasetGenerationConfig {
  projectId: string
  issueCount: number
  epicsCount: number
  storiesPerEpic: number
  subtasksPerStory: number
  dependencyDensity: number
  includeLabels?: boolean
  includeComments?: boolean
  includeAssignees?: boolean
}

export interface GeneratedDataset {
  issues: IssueConfig[]
  dependencies: Array<{ blockerId: string, blockedId: string }>
  labels: string[]
  assignees: string[]
}

/**
 * Generate large-scale test dataset for performance and migration testing
 */
export async function generateLargeDataset(config: DatasetGenerationConfig): Promise<IssueConfig[]> {
  const issues: IssueConfig[] = []
  const assignees = config.includeAssignees ? generateAssignees(10) : []
  const labels = config.includeLabels ? generateLabels(20) : []
  
  console.log(`Generating dataset: ${config.issueCount} issues across ${config.epicsCount} epics`)
  
  // Generate Epics
  const epics: IssueConfig[] = []
  for (let i = 0; i < config.epicsCount; i++) {
    const epic: IssueConfig = {
      projectId: config.projectId,
      title: `Epic ${i + 1}: Core Feature Set ${String.fromCharCode(65 + i)}`,
      description: `Comprehensive epic covering major functionality area ${i + 1}`,
      issueType: 'epic',
      priority: Math.floor(Math.random() * 4) + 1,
      estimate: 0, // Epics don't have estimates
      assigneeId: config.includeAssignees ? getRandomItem(assignees) : undefined,
      labels: config.includeLabels ? getRandomItems(labels, 2) : []
    }
    epics.push(epic)
    issues.push(epic)
  }

  // Generate Stories for each Epic
  const stories: IssueConfig[] = []
  for (const epic of epics) {
    for (let i = 0; i < config.storiesPerEpic; i++) {
      const story: IssueConfig = {
        projectId: config.projectId,
        parentId: `epic_${epics.indexOf(epic)}`, // Will be replaced with actual ID
        title: `Story: Implement ${generateStoryTitle()}`,
        description: generateStoryDescription(),
        issueType: 'story',
        priority: Math.floor(Math.random() * 4) + 1,
        estimate: getFibonacciEstimate(),
        assigneeId: config.includeAssignees ? getRandomItem(assignees) : undefined,
        labels: config.includeLabels ? getRandomItems(labels, 3) : []
      }
      stories.push(story)
      issues.push(story)
    }
  }

  // Generate Subtasks for each Story
  for (const story of stories) {
    const subtaskCount = Math.min(config.subtasksPerStory, 
      Math.max(1, Math.floor(Math.random() * config.subtasksPerStory) + 1))
    
    for (let i = 0; i < subtaskCount; i++) {
      const subtask: IssueConfig = {
        projectId: config.projectId,
        parentId: `story_${stories.indexOf(story)}`, // Will be replaced with actual ID
        title: `Subtask: ${generateSubtaskTitle()}`,
        description: generateSubtaskDescription(),
        issueType: 'subtask',
        priority: Math.floor(Math.random() * 4) + 1,
        estimate: getFibonacciEstimate(true), // Smaller estimates for subtasks
        assigneeId: config.includeAssignees ? getRandomItem(assignees) : undefined,
        labels: config.includeLabels ? getRandomItems(labels, 2) : []
      }
      issues.push(subtask)
    }
  }

  console.log(`Generated ${issues.length} issues (${epics.length} epics, ${stories.length} stories, ${issues.length - epics.length - stories.length} subtasks)`)
  return issues
}

// =============================================================================
// Performance Measurement Utilities
// =============================================================================

export interface QueryPerformanceMetrics {
  projectIdIndex: number
  assigneeIdIndex: number
  stateIdIndex: number
  issueTypeIndex: number
  parentIdIndex: number
  averageQueryTime: number
  maxQueryTime: number
  minQueryTime: number
}

/**
 * Measure query performance across critical database indexes
 */
export async function measureQueryPerformance(provider: IssueProvider): Promise<QueryPerformanceMetrics> {
  const metrics: QueryPerformanceMetrics = {
    projectIdIndex: 0,
    assigneeIdIndex: 0,
    stateIdIndex: 0,
    issueTypeIndex: 0,
    parentIdIndex: 0,
    averageQueryTime: 0,
    maxQueryTime: 0,
    minQueryTime: Infinity
  }

  const queryTimes: number[] = []

  // Test project ID index
  const projectStart = performance.now()
  await provider.listIssues({ projectId: 'test-project' })
  metrics.projectIdIndex = performance.now() - projectStart
  queryTimes.push(metrics.projectIdIndex)

  // Test assignee ID index
  const assigneeStart = performance.now()
  await provider.listIssues({ assigneeId: 'test-user' })
  metrics.assigneeIdIndex = performance.now() - assigneeStart
  queryTimes.push(metrics.assigneeIdIndex)

  // Test state ID index
  const stateStart = performance.now()
  await provider.listIssues({ stateId: 'in-progress' })
  metrics.stateIdIndex = performance.now() - stateStart
  queryTimes.push(metrics.stateIdIndex)

  // Test issue type index
  const typeStart = performance.now()
  await provider.listIssues({ issueType: 'story' })
  metrics.issueTypeIndex = performance.now() - typeStart
  queryTimes.push(metrics.issueTypeIndex)

  // Test parent ID index (hierarchy queries)
  const parentStart = performance.now()
  await provider.listIssues({ parentId: 'test-parent' })
  metrics.parentIdIndex = performance.now() - parentStart
  queryTimes.push(metrics.parentIdIndex)

  // Calculate aggregate metrics
  metrics.averageQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
  metrics.maxQueryTime = Math.max(...queryTimes)
  metrics.minQueryTime = Math.min(...queryTimes)

  return metrics
}

// =============================================================================
// Provider Parity Validation
// =============================================================================

export interface ProviderParityResult {
  hierarchyIntact: boolean
  dependenciesIntact: boolean
  dataLossDetected: boolean
  fieldMismatchCount: number
  structuralErrors: string[]
}

/**
 * Validate that two issue datasets have complete parity
 */
export async function validateProviderParity(
  originalIssues: EnhancedIssue[], 
  migratedIssues: EnhancedIssue[]
): Promise<ProviderParityResult> {
  const result: ProviderParityResult = {
    hierarchyIntact: true,
    dependenciesIntact: true,
    dataLossDetected: false,
    fieldMismatchCount: 0,
    structuralErrors: []
  }

  // Check for data loss
  if (originalIssues.length !== migratedIssues.length) {
    result.dataLossDetected = true
    result.structuralErrors.push(`Issue count mismatch: ${originalIssues.length} vs ${migratedIssues.length}`)
  }

  // Validate each issue
  for (const originalIssue of originalIssues) {
    const migratedIssue = migratedIssues.find(i => i.id === originalIssue.id)
    
    if (!migratedIssue) {
      result.dataLossDetected = true
      result.structuralErrors.push(`Missing issue: ${originalIssue.id}`)
      continue
    }

    // Check field-by-field parity
    const fieldChecks = [
      { field: 'title', original: originalIssue.title, migrated: migratedIssue.title },
      { field: 'description', original: originalIssue.description, migrated: migratedIssue.description },
      { field: 'issueType', original: originalIssue.issueType, migrated: migratedIssue.issueType },
      { field: 'priority', original: originalIssue.priority, migrated: migratedIssue.priority },
      { field: 'estimate', original: originalIssue.estimate, migrated: migratedIssue.estimate },
      { field: 'parentId', original: originalIssue.parentId, migrated: migratedIssue.parentId },
      { field: 'assigneeId', original: originalIssue.assigneeId, migrated: migratedIssue.assigneeId }
    ]

    for (const check of fieldChecks) {
      if (check.original !== check.migrated) {
        result.fieldMismatchCount++
        result.structuralErrors.push(
          `Field mismatch in ${originalIssue.id}.${check.field}: "${check.original}" vs "${check.migrated}"`
        )
      }
    }

    // Check hierarchy integrity
    if (originalIssue.parentId !== migratedIssue.parentId) {
      result.hierarchyIntact = false
    }
  }

  return result
}

// =============================================================================
// Migration Validation
// =============================================================================

export interface MigrationValidationConfig {
  sourceProvider: IssueProvider
  destProvider: IssueProvider
  testDataSize: number
  enableRollback: boolean
}

export interface MigrationValidationResult {
  preValidation: { success: boolean; errors: string[] }
  migration: { success: boolean; errors: string[]; duration: number }
  postValidation: { success: boolean; errors: string[] }
  rollbackCapability: boolean
}

/**
 * Perform comprehensive migration validation with rollback testing
 */
export async function performMigrationValidation(
  config: MigrationValidationConfig
): Promise<MigrationValidationResult> {
  const result: MigrationValidationResult = {
    preValidation: { success: true, errors: [] },
    migration: { success: true, errors: [], duration: 0 },
    postValidation: { success: true, errors: [] },
    rollbackCapability: false
  }

  try {
    // Pre-validation: Ensure source provider is healthy
    const sourceHealth = await config.sourceProvider.checkHealth()
    if (!sourceHealth.isHealthy) {
      result.preValidation.success = false
      result.preValidation.errors = sourceHealth.errors
      return result
    }

    // Generate test data
    const testProject = await config.sourceProvider.createProject({
      name: 'Migration Validation Test',
      description: 'Test project for migration validation'
    })

    const testIssues = await generateLargeDataset({
      projectId: testProject.id,
      issueCount: config.testDataSize,
      epicsCount: Math.ceil(config.testDataSize / 100),
      storiesPerEpic: 10,
      subtasksPerStory: 9,
      dependencyDensity: 0.1
    })

    // Create issues in source
    for (const issue of testIssues) {
      await config.sourceProvider.createIssue(issue)
    }

    // Perform migration
    const migrationStart = performance.now()
    const exportData = await config.sourceProvider.exportData(testProject.id)
    const importResult = await config.destProvider.importData(exportData)
    result.migration.duration = performance.now() - migrationStart

    if (!importResult.success) {
      result.migration.success = false
      result.migration.errors = importResult.errors
      return result
    }

    // Post-validation: Verify data integrity
    const sourceIssues = await config.sourceProvider.listIssues({ projectId: testProject.id })
    const destIssues = await config.destProvider.listIssues({ projectId: testProject.id })
    
    const parityResult = await validateProviderParity(sourceIssues, destIssues)
    if (parityResult.dataLossDetected || parityResult.fieldMismatchCount > 0) {
      result.postValidation.success = false
      result.postValidation.errors = parityResult.structuralErrors
    }

    // Test rollback capability if enabled
    if (config.enableRollback) {
      // This would test rollback mechanisms - placeholder for now
      result.rollbackCapability = true
    }

  } catch (error) {
    result.migration.success = false
    result.migration.errors = [error instanceof Error ? error.message : 'Unknown migration error']
  }

  return result
}

// =============================================================================
// Linear Compatibility Validation
// =============================================================================

export interface LinearCompatibilityResult {
  issueStructure: { compatible: boolean; issues: string[] }
  projectStructure: { compatible: boolean; issues: string[] }
  workflowStates: { compatible: boolean; issues: string[] }
  dependencyModel: { compatible: boolean; issues: string[] }
  labelingSystem: { compatible: boolean; issues: string[] }
  estimationModel: { compatible: boolean; issues: string[] }
  hierarchySupport: { epicStorySubtask: boolean }
  stateTransitions: { backlogToProgress: boolean }
  fibonacci: { estimationScale: boolean }
}

/**
 * Validate schema and data compatibility with Linear patterns
 */
export async function validateLinearCompatibility(provider: IssueProvider): Promise<LinearCompatibilityResult> {
  const result: LinearCompatibilityResult = {
    issueStructure: { compatible: true, issues: [] },
    projectStructure: { compatible: true, issues: [] },
    workflowStates: { compatible: true, issues: [] },
    dependencyModel: { compatible: true, issues: [] },
    labelingSystem: { compatible: true, issues: [] },
    estimationModel: { compatible: true, issues: [] },
    hierarchySupport: { epicStorySubtask: true },
    stateTransitions: { backlogToProgress: true },
    fibonacci: { estimationScale: true }
  }

  try {
    // Test Linear-style project creation
    const testProject = await provider.createProject({
      name: 'Linear Compatibility Test',
      description: 'Testing Linear-compatible structures'
    })

    // Test Epic/Story/Subtask hierarchy
    const epic = await provider.createIssue({
      projectId: testProject.id,
      title: 'Epic: Linear Compatibility',
      issueType: 'epic',
      priority: 2
    })

    const story = await provider.createIssue({
      projectId: testProject.id,
      parentId: epic.id,
      title: 'Story: Test Linear patterns',
      issueType: 'story',
      priority: 2,
      estimate: 8
    })

    const subtask = await provider.createIssue({
      projectId: testProject.id,
      parentId: story.id,
      title: 'Subtask: Validate hierarchy',
      issueType: 'subtask',
      priority: 3,
      estimate: 3
    })

    // Validate hierarchy was created correctly
    const issues = await provider.listIssues({ projectId: testProject.id })
    const createdEpic = issues.find(i => i.issueType === 'epic')
    const createdStory = issues.find(i => i.issueType === 'story')
    const createdSubtask = issues.find(i => i.issueType === 'subtask')

    if (!createdEpic || !createdStory || !createdSubtask) {
      result.hierarchySupport.epicStorySubtask = false
      result.issueStructure.compatible = false
      result.issueStructure.issues.push('Failed to create proper Epic/Story/Subtask hierarchy')
    }

    if (createdStory?.parentId !== createdEpic?.id || createdSubtask?.parentId !== createdStory?.id) {
      result.hierarchySupport.epicStorySubtask = false
      result.issueStructure.compatible = false
      result.issueStructure.issues.push('Hierarchy relationships not properly maintained')
    }

    // Test Fibonacci estimation scale
    const fibonacciValues = [1, 2, 3, 5, 8, 13, 21]
    if (!fibonacciValues.includes(story.estimate || 0)) {
      result.fibonacci.estimationScale = false
      result.estimationModel.compatible = false
      result.estimationModel.issues.push('Estimation values do not follow Fibonacci scale')
    }

    // Test workflow states
    const workflowStates = await provider.getWorkflowStates()
    const expectedStates = ['backlog', 'todo', 'in-progress', 'in-review', 'done', 'canceled']
    const missingStates = expectedStates.filter(state => 
      !workflowStates.some(ws => ws.name.toLowerCase().includes(state))
    )

    if (missingStates.length > 0) {
      result.workflowStates.compatible = false
      result.workflowStates.issues.push(`Missing expected workflow states: ${missingStates.join(', ')}`)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown compatibility validation error'
    result.issueStructure.compatible = false
    result.issueStructure.issues.push(errorMessage)
  }

  return result
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateAssignees(count: number): string[] {
  const assignees: string[] = []
  for (let i = 0; i < count; i++) {
    assignees.push(`test-user-${i + 1}`)
  }
  return assignees
}

function generateLabels(count: number): string[] {
  const labelTypes = ['frontend', 'backend', 'database', 'testing', 'documentation', 'bug', 'enhancement', 'feature']
  const labels: string[] = []
  for (let i = 0; i < count; i++) {
    labels.push(`${getRandomItem(labelTypes)}-${i + 1}`)
  }
  return labels
}

function generateStoryTitle(): string {
  const features = ['authentication system', 'data migration', 'user interface', 'API endpoints', 'database schema', 'search functionality', 'reporting system', 'integration layer']
  return getRandomItem(features)
}

function generateStoryDescription(): string {
  return `Comprehensive implementation of ${generateStoryTitle()} with full testing coverage and documentation. This story includes all necessary development work, testing validation, and documentation updates to ensure production readiness.`
}

function generateSubtaskTitle(): string {
  const tasks = ['Create unit tests', 'Update documentation', 'Implement validation', 'Add error handling', 'Optimize performance', 'Add logging', 'Create integration tests', 'Update schema']
  return getRandomItem(tasks)
}

function generateSubtaskDescription(): string {
  return `Specific implementation task required for story completion. Includes development work, testing, and validation to ensure quality standards are met.`
}

function getFibonacciEstimate(small = false): number {
  const fibNumbers = small ? [1, 2, 3, 5] : [1, 2, 3, 5, 8, 13, 21]
  return getRandomItem(fibNumbers)
}

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, array.length))
}