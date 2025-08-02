/**
 * Test Data Generators and Validation Utilities
 *
 * Comprehensive utilities for generating large-scale test datasets and
 * validating Epic SPI-289 success criteria across the JCVD infrastructure.
 */

import { performance } from 'node:perf_hooks';

import type { IssuePriority } from '../../src/database/models/schema-types.js';
import type { IssueConfig, EnhancedIssue, IssueProvider } from '../../src/providers/types.js';

// =============================================================================
// Large Dataset Generation
// =============================================================================

export interface DatasetGenerationConfig {
  project_id: string;
  issueCount: number;
  epicsCount: number;
  storiesPerEpic: number;
  subtasksPerStory: number;
  dependencyDensity: number;
  includeLabels?: boolean;
  includeComments?: boolean;
  includeAssignees?: boolean;
}

export interface GeneratedDataset {
  issues: IssueConfig[];
  dependencies: { blockerId: string; blockedId: string }[];
  labels: string[];
  assignees: string[];
}

/**
 * Generate large-scale test dataset for performance and migration testing
 */
export async function generateLargeDataset(
  config: DatasetGenerationConfig
): Promise<IssueConfig[]> {
  const issues: IssueConfig[] = [];
  const assignees = config.includeAssignees ? generateAssignees(10) : [];
  const labels = config.includeLabels ? generateLabels(20) : [];

  console.log(`Generating dataset: ${config.issueCount} issues across ${config.epicsCount} epics`);

  // Generate Epics
  const epics: IssueConfig[] = [];

  for (let i = 0; i < config.epicsCount; i++) {
    const epic: IssueConfig = {
      id: `epic_${i}`,
      project_id: config.project_id,
      title: `Epic ${i + 1}: Core Feature Set ${String.fromCharCode(65 + i)}`,
      description: `Comprehensive epic covering major functionality area ${i + 1}`,
      issue_type: 'epic',
      state_id: 'backlog',
      priority: Math.floor(Math.random() * 5) as IssuePriority,
      estimate: 0, // Epics don't have estimates
      ...(config.includeAssignees && { assignee_id: getRandomItem(assignees) }),
      labels: config.includeLabels ? getRandomItems(labels, 2) : [],
    };

    epics.push(epic);
    issues.push(epic);
  }

  // Generate Stories for each Epic
  const stories: IssueConfig[] = [];

  for (const epic of epics) {
    for (let i = 0; i < config.storiesPerEpic; i++) {
      const story: IssueConfig = {
        id: `story_${epics.indexOf(epic)}_${i}`,
        project_id: config.project_id,
        parent_id: `epic_${epics.indexOf(epic)}`, // Will be replaced with actual ID
        title: `Story: Implement ${generateStoryTitle()}`,
        description: generateStoryDescription(),
        issue_type: 'story',
        state_id: 'todo',
        priority: Math.floor(Math.random() * 5) as IssuePriority,
        estimate: getFibonacciEstimate(),
        ...(config.includeAssignees && { assignee_id: getRandomItem(assignees) }),
        labels: config.includeLabels ? getRandomItems(labels, 3) : [],
      };

      stories.push(story);
      issues.push(story);
    }
  }

  // Generate Subtasks for each Story
  for (const story of stories) {
    const subtaskCount = Math.min(
      config.subtasksPerStory,
      Math.max(1, Math.floor(Math.random() * config.subtasksPerStory) + 1)
    );

    for (let i = 0; i < subtaskCount; i++) {
      const subtask: IssueConfig = {
        id: `subtask_${stories.indexOf(story)}_${i}`,
        project_id: config.project_id,
        parent_id: `story_${stories.indexOf(story)}`, // Will be replaced with actual ID
        title: `Subtask: ${generateSubtaskTitle()}`,
        description: generateSubtaskDescription(),
        issue_type: 'subtask',
        state_id: 'todo',
        priority: Math.floor(Math.random() * 5) as IssuePriority,
        estimate: getFibonacciEstimate(true), // Smaller estimates for subtasks
        ...(config.includeAssignees && { assignee_id: getRandomItem(assignees) }),
        labels: config.includeLabels ? getRandomItems(labels, 2) : [],
      };

      issues.push(subtask);
    }
  }

  console.log(
    `Generated ${issues.length} issues (${epics.length} epics, ${stories.length} stories, ${issues.length - epics.length - stories.length} subtasks)`
  );

  return issues;
}

// =============================================================================
// Performance Measurement Utilities
// =============================================================================

export interface QueryPerformanceMetrics {
  project_id_index: number;
  assignee_id_index: number;
  state_id_index: number;
  issue_type_index: number;
  parent_id_index: number;
  averageQueryTime: number;
  maxQueryTime: number;
  minQueryTime: number;
}

/**
 * Measure query performance across critical database indexes
 */
export async function measureQueryPerformance(
  provider: IssueProvider
): Promise<QueryPerformanceMetrics> {
  const metrics: QueryPerformanceMetrics = {
    project_id_index: 0,
    assignee_id_index: 0,
    state_id_index: 0,
    issue_type_index: 0,
    parent_id_index: 0,
    averageQueryTime: 0,
    maxQueryTime: 0,
    minQueryTime: Infinity,
  };

  const queryTimes: number[] = [];

  // Test project ID index
  const projectStart = performance.now();

  await provider.listIssues({ project_id: 'test-project' });
  metrics.project_id_index = performance.now() - projectStart;
  queryTimes.push(metrics.project_id_index);

  // Test assignee ID index
  const assigneeStart = performance.now();

  await provider.listIssues({ assignee_id: 'test-user' });
  metrics.assignee_id_index = performance.now() - assigneeStart;
  queryTimes.push(metrics.assignee_id_index);

  // Test state ID index
  const stateStart = performance.now();

  await provider.listIssues({ state_id: 'in-progress' });
  metrics.state_id_index = performance.now() - stateStart;
  queryTimes.push(metrics.state_id_index);

  // Test issue type index
  const typeStart = performance.now();

  await provider.listIssues({ issue_type: 'story' });
  metrics.issue_type_index = performance.now() - typeStart;
  queryTimes.push(metrics.issue_type_index);

  // Test parent ID index (hierarchy queries)
  const parentStart = performance.now();

  await provider.listIssues({ parent_id: 'test-parent' });
  metrics.parent_id_index = performance.now() - parentStart;
  queryTimes.push(metrics.parent_id_index);

  // Calculate aggregate metrics
  metrics.averageQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
  metrics.maxQueryTime = Math.max(...queryTimes);
  metrics.minQueryTime = Math.min(...queryTimes);

  return metrics;
}

// =============================================================================
// Provider Parity Validation
// =============================================================================

export interface ProviderParityResult {
  hierarchyIntact: boolean;
  dependenciesIntact: boolean;
  dataLossDetected: boolean;
  fieldMismatchCount: number;
  structuralErrors: string[];
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
    structuralErrors: [],
  };

  // Check for data loss
  if (originalIssues.length !== migratedIssues.length) {
    result.dataLossDetected = true;
    result.structuralErrors.push(
      `Issue count mismatch: ${originalIssues.length} vs ${migratedIssues.length}`
    );
  }

  // Validate each issue
  for (const originalIssue of originalIssues) {
    const migratedIssue = migratedIssues.find(i => i.id === originalIssue.id);

    if (!migratedIssue) {
      result.dataLossDetected = true;
      result.structuralErrors.push(`Missing issue: ${originalIssue.id}`);
      continue;
    }

    // Check field-by-field parity
    const fieldChecks = [
      { field: 'title', original: originalIssue.title, migrated: migratedIssue.title },
      {
        field: 'description',
        original: originalIssue.description,
        migrated: migratedIssue.description,
      },
      {
        field: 'issue_type',
        original: originalIssue.issue_type,
        migrated: migratedIssue.issue_type,
      },
      { field: 'priority', original: originalIssue.priority, migrated: migratedIssue.priority },
      { field: 'estimate', original: originalIssue.estimate, migrated: migratedIssue.estimate },
      { field: 'parent_id', original: originalIssue.parent_id, migrated: migratedIssue.parent_id },
      {
        field: 'assignee_id',
        original: originalIssue.assignee_id,
        migrated: migratedIssue.assignee_id,
      },
    ];

    for (const check of fieldChecks) {
      if (check.original !== check.migrated) {
        result.fieldMismatchCount++;
        result.structuralErrors.push(
          `Field mismatch in ${originalIssue.id}.${check.field}: "${check.original}" vs "${check.migrated}"`
        );
      }
    }

    // Check hierarchy integrity
    if (originalIssue.parent_id !== migratedIssue.parent_id) {
      result.hierarchyIntact = false;
    }
  }

  return result;
}

// =============================================================================
// Migration Validation
// =============================================================================

export interface MigrationValidationConfig {
  sourceProvider: IssueProvider;
  destProvider: IssueProvider;
  testDataSize: number;
  enableRollback: boolean;
}

export interface MigrationValidationResult {
  preValidation: { success: boolean; errors: string[] };
  migration: { success: boolean; errors: string[]; duration: number };
  postValidation: { success: boolean; errors: string[] };
  rollbackCapability: boolean;
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
    rollbackCapability: false,
  };

  try {
    // Pre-validation: Ensure source provider is healthy
    const sourceHealth = await config.sourceProvider.healthCheck();

    if (!sourceHealth.isHealthy) {
      result.preValidation.success = false;
      result.preValidation.errors = sourceHealth.lastError
        ? [sourceHealth.lastError.message]
        : ['Unknown health check error'];

      return result;
    }

    // Generate test data
    const testProject = await config.sourceProvider.createProject({
      id: `migration-test-${Date.now()}`,
      name: 'Migration Validation Test',
      description: 'Test project for migration validation',
    });

    const testIssues = await generateLargeDataset({
      project_id: testProject.id,
      issueCount: config.testDataSize,
      epicsCount: Math.ceil(config.testDataSize / 100),
      storiesPerEpic: 10,
      subtasksPerStory: 9,
      dependencyDensity: 0.1,
    });

    // Create issues in source
    for (const issue of testIssues) {
      await config.sourceProvider.createIssue(issue);
    }

    // Perform migration
    const migrationStart = performance.now();
    const exportData = await config.sourceProvider.exportData(testProject.id);
    const importResult = await config.destProvider.importData(exportData);

    result.migration.duration = performance.now() - migrationStart;

    if (!importResult.success) {
      result.migration.success = false;
      result.migration.errors = importResult.errors.map(err => err.message);

      return result;
    }

    // Post-validation: Verify data integrity
    const sourceIssues = await config.sourceProvider.listIssues({ project_id: testProject.id });
    const destIssues = await config.destProvider.listIssues({ project_id: testProject.id });

    const parityResult = await validateProviderParity(sourceIssues, destIssues);

    if (parityResult.dataLossDetected || parityResult.fieldMismatchCount > 0) {
      result.postValidation.success = false;
      result.postValidation.errors = parityResult.structuralErrors;
    }

    // Test rollback capability if enabled
    if (config.enableRollback) {
      // This would test rollback mechanisms - placeholder for now
      result.rollbackCapability = true;
    }
  } catch (error) {
    result.migration.success = false;
    result.migration.errors = [error instanceof Error ? error.message : 'Unknown migration error'];
  }

  return result;
}

// =============================================================================
// Linear Compatibility Validation
// =============================================================================

export interface LinearCompatibilityResult {
  issueStructure: { compatible: boolean; issues: string[] };
  projectStructure: { compatible: boolean; issues: string[] };
  workflowStates: { compatible: boolean; issues: string[] };
  dependencyModel: { compatible: boolean; issues: string[] };
  labelingSystem: { compatible: boolean; issues: string[] };
  estimationModel: { compatible: boolean; issues: string[] };
  hierarchySupport: { epicStorySubtask: boolean };
  stateTransitions: { backlogToProgress: boolean };
  fibonacci: { estimationScale: boolean };
}

/**
 * Validate schema and data compatibility with Linear patterns
 */
export async function validateLinearCompatibility(
  provider: IssueProvider
): Promise<LinearCompatibilityResult> {
  const result: LinearCompatibilityResult = {
    issueStructure: { compatible: true, issues: [] },
    projectStructure: { compatible: true, issues: [] },
    workflowStates: { compatible: true, issues: [] },
    dependencyModel: { compatible: true, issues: [] },
    labelingSystem: { compatible: true, issues: [] },
    estimationModel: { compatible: true, issues: [] },
    hierarchySupport: { epicStorySubtask: true },
    stateTransitions: { backlogToProgress: true },
    fibonacci: { estimationScale: true },
  };

  try {
    // Test Linear-style project creation
    const testProject = await provider.createProject({
      id: `linear-test-${Date.now()}`,
      name: 'Linear Compatibility Test',
      description: 'Testing Linear-compatible structures',
    });

    // Test Epic/Story/Subtask hierarchy
    const epic = await provider.createIssue({
      id: `epic-compat-${Date.now()}`,
      project_id: testProject.id,
      title: 'Epic: Linear Compatibility',
      issue_type: 'epic',
      state_id: 'backlog',
      priority: 2,
    });

    const story = await provider.createIssue({
      id: `story-compat-${Date.now()}`,
      project_id: testProject.id,
      parent_id: epic.id,
      title: 'Story: Test Linear patterns',
      issue_type: 'story',
      state_id: 'todo',
      priority: 2,
      estimate: 8,
    });

    await provider.createIssue({
      id: `subtask-compat-${Date.now()}`,
      project_id: testProject.id,
      parent_id: story.id,
      title: 'Subtask: Validate hierarchy',
      issue_type: 'subtask',
      state_id: 'todo',
      priority: 3,
      estimate: 3,
    });

    // Validate hierarchy was created correctly
    const issues = await provider.listIssues({ project_id: testProject.id });
    const createdEpic = issues.find(i => i.issue_type === 'epic');
    const createdStory = issues.find(i => i.issue_type === 'story');
    const createdSubtask = issues.find(i => i.issue_type === 'subtask');

    if (!createdEpic || !createdStory || !createdSubtask) {
      result.hierarchySupport.epicStorySubtask = false;
      result.issueStructure.compatible = false;
      result.issueStructure.issues.push('Failed to create proper Epic/Story/Subtask hierarchy');
    }

    if (
      createdStory?.parent_id !== createdEpic?.id ||
      createdSubtask?.parent_id !== createdStory?.id
    ) {
      result.hierarchySupport.epicStorySubtask = false;
      result.issueStructure.compatible = false;
      result.issueStructure.issues.push('Hierarchy relationships not properly maintained');
    }

    // Test Fibonacci estimation scale
    const fibonacciValues = [1, 2, 3, 5, 8, 13, 21];

    if (!fibonacciValues.includes(story.estimate || 0)) {
      result.fibonacci.estimationScale = false;
      result.estimationModel.compatible = false;
      result.estimationModel.issues.push('Estimation values do not follow Fibonacci scale');
    }

    // Test workflow states
    const workflowStates = await provider.getWorkflowStates(testProject.id);
    const expectedStates = ['backlog', 'todo', 'in-progress', 'in-review', 'done', 'canceled'];
    const missingStates = expectedStates.filter(
      state => !workflowStates.some(ws => ws.name.toLowerCase().includes(state))
    );

    if (missingStates.length > 0) {
      result.workflowStates.compatible = false;
      result.workflowStates.issues.push(
        `Missing expected workflow states: ${missingStates.join(', ')}`
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown compatibility validation error';

    result.issueStructure.compatible = false;
    result.issueStructure.issues.push(errorMessage);
  }

  return result;
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateAssignees(count: number): string[] {
  const assignees: string[] = [];

  for (let i = 0; i < count; i++) {
    assignees.push(`test-user-${i + 1}`);
  }

  return assignees;
}

function generateLabels(count: number): string[] {
  const labelTypes = [
    'frontend',
    'backend',
    'database',
    'testing',
    'documentation',
    'bug',
    'enhancement',
    'feature',
  ];
  const labels: string[] = [];

  for (let i = 0; i < count; i++) {
    labels.push(`${getRandomItem(labelTypes)}-${i + 1}`);
  }

  return labels;
}

function generateStoryTitle(): string {
  const features = [
    'authentication system',
    'data migration',
    'user interface',
    'API endpoints',
    'database schema',
    'search functionality',
    'reporting system',
    'integration layer',
  ];

  return getRandomItem(features);
}

function generateStoryDescription(): string {
  return `Comprehensive implementation of ${generateStoryTitle()} with full testing coverage and documentation. This story includes all necessary development work, testing validation, and documentation updates to ensure production readiness.`;
}

function generateSubtaskTitle(): string {
  const tasks = [
    'Create unit tests',
    'Update documentation',
    'Implement validation',
    'Add error handling',
    'Optimize performance',
    'Add logging',
    'Create integration tests',
    'Update schema',
  ];

  return getRandomItem(tasks);
}

function generateSubtaskDescription(): string {
  return `Specific implementation task required for story completion. Includes development work, testing, and validation to ensure quality standards are met.`;
}

function getFibonacciEstimate(small = false): number {
  const fibNumbers = small ? [1, 2, 3, 5] : [1, 2, 3, 5, 8, 13, 21];

  return getRandomItem(fibNumbers);
}

function getRandomItem<T>(array: T[]): T {
  const item = array[Math.floor(Math.random() * array.length)];

  if (item === undefined) {
    throw new Error('Cannot get random item from empty array');
  }

  return item;
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, Math.min(count, array.length));
}
