/**
 * JCVD SQLite Provider Integration Tests
 * Comprehensive end-to-end testing of the SQLite provider implementation
 *
 * This test suite validates all aspects of the SQLite provider, including
 * performance benchmarks, capability discovery, and integration with all
 * foundation components.
 */

import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

import {
  createSQLiteProvider,
  SQLiteConnectionManager,
  TaskRecommendationEngine,
} from '../../../src/providers/sqlite/index.js';

import type {
  SQLiteProvider} from '../../../src/providers/sqlite/index.js';
import type {
  SQLiteProviderConfig,
  Project,
  EnhancedIssue,
  WorkflowState,
  Label,
  Dependency,
  TaskRecommendation,
} from '../../../src/providers/types.js';

// =============================================================================
// Test Configuration and Setup
// =============================================================================

describe('SQLite Provider Integration Tests', () => {
  let provider: SQLiteProvider;
  let testDatabasePath: string;
  let testProject: Project;
  let testConfig: SQLiteProviderConfig;

  beforeAll(async () => {
    // Create temporary database for testing
    testDatabasePath = join(tmpdir(), `jcvd-test-${Date.now()}.sqlite`);

    testConfig = {
      id: 'test-sqlite-provider',
      type: 'sqlite',
      name: 'Test SQLite Provider',
      databasePath: testDatabasePath,
      enableWAL: true,
      cacheSize: 1000,
      timeout: 5000,
      enableForeignKeys: true,
    };
  });

  beforeEach(async () => {
    // Create fresh provider instance for each test
    provider = createSQLiteProvider(testConfig);
    await provider.initialize(testConfig);

    // Create a test project for most tests
    testProject = await provider.createProject({
      name: 'Test Project',
      description: 'Integration test project',
      key: 'TEST',
    });
  });

  afterEach(async () => {
    // Clean up provider
    if (provider) {
      await provider.cleanup();
    }
  });

  afterAll(async () => {
    // Clean up test database
    try {
      await unlink(testDatabasePath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  // =============================================================================
  // Provider Initialization and Health Tests
  // =============================================================================

  describe('Provider Lifecycle', () => {
    it('should initialize correctly with valid configuration', async () => {
      const providerInfo = provider.getProviderInfo();

      expect(providerInfo.id).toBe(testConfig.id);
      expect(providerInfo.type).toBe('sqlite');
      expect(providerInfo.status.isConnected).toBe(true);
      expect(providerInfo.status.isHealthy).toBe(true);
    });

    it('should pass health checks', async () => {
      const isAvailable = await provider.isAvailable();
      const healthStatus = await provider.healthCheck();

      expect(isAvailable).toBe(true);
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.metrics.uptime).toBeGreaterThan(0);
    });

    it('should handle cleanup gracefully', async () => {
      const cleanupResult = await provider.cleanup();

      expect(cleanupResult.success).toBe(true);

      // Provider should no longer be available after cleanup
      const isAvailable = await provider.isAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  // =============================================================================
  // Project Management Tests
  // =============================================================================

  describe('Project Management', () => {
    it('should create projects with complete metadata', async () => {
      const projectConfig = {
        name: 'New Test Project',
        description: 'A project created during testing',
        key: 'NTP',
      };

      const project = await provider.createProject(projectConfig);

      expect(project.name).toBe(projectConfig.name);
      expect(project.description).toBe(projectConfig.description);
      expect(project.key).toBe(projectConfig.key);
      expect(project.id).toBeTruthy();
      expect(project.created_at).toBeInstanceOf(Date);
      expect(project.updated_at).toBeInstanceOf(Date);
    });

    it('should retrieve projects by ID', async () => {
      const retrieved = await provider.getProject(testProject.id);

      expect(retrieved.id).toBe(testProject.id);
      expect(retrieved.name).toBe(testProject.name);
      expect(retrieved.description).toBe(testProject.description);
    });

    it('should list projects with filtering', async () => {
      // Create additional project
      await provider.createProject({
        name: 'Another Project',
        description: 'Another test project',
        key: 'ANO',
      });

      const allProjects = await provider.listProjects();

      expect(allProjects.length).toBeGreaterThanOrEqual(2);

      const filteredProjects = await provider.listProjects({ name: 'Test' });

      expect(filteredProjects.length).toBeGreaterThanOrEqual(1);
      expect(filteredProjects.every(p => p.name.includes('Test'))).toBe(true);
    });

    it('should update project metadata', async () => {
      const updates = {
        name: 'Updated Test Project',
        description: 'Updated description',
      };

      const updated = await provider.updateProject(testProject.id, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.description).toBe(updates.description);
      expect(updated.updated_at.getTime()).toBeGreaterThan(testProject.updated_at.getTime());
    });

    it('should delete projects successfully', async () => {
      const projectToDelete = await provider.createProject({
        name: 'Project to Delete',
        description: 'This project will be deleted',
        key: 'DEL',
      });

      const deleteResult = await provider.deleteProject(projectToDelete.id);

      expect(deleteResult.success).toBe(true);

      // Verify project is deleted
      await expect(provider.getProject(projectToDelete.id)).rejects.toThrow();
    });
  });

  // =============================================================================
  // Issue Management Tests
  // =============================================================================

  describe('Issue Management', () => {
    let workflowStates: WorkflowState[];

    beforeEach(async () => {
      // Create workflow states for testing
      workflowStates = await Promise.all([
        provider.createWorkflowState(testProject.id, {
          name: 'To Do',
          type: 'unstarted',
          position: 1,
          color: '#cccccc',
        }),
        provider.createWorkflowState(testProject.id, {
          name: 'In Progress',
          type: 'started',
          position: 2,
          color: '#ffaa00',
        }),
        provider.createWorkflowState(testProject.id, {
          name: 'Done',
          type: 'completed',
          position: 3,
          color: '#00ff00',
        }),
      ]);
    });

    it('should create issues with hierarchy validation', async () => {
      const epicConfig = {
        project_id: testProject.id,
        title: 'Test Epic',
        description: 'A test epic for hierarchy validation',
        state_id: workflowStates[0].id,
        issue_type: 'epic' as const,
        priority: 2 as const,
      };

      const epic = await provider.createIssue(epicConfig);

      expect(epic.title).toBe(epicConfig.title);
      expect(epic.issue_type).toBe('epic');
      expect(epic.parent_id).toBeNull();
      expect(epic.workflowState?.name).toBe('To Do');

      // Create a story under the epic
      const storyConfig = {
        project_id: testProject.id,
        parent_id: epic.id,
        title: 'Test Story',
        description: 'A test story under the epic',
        state_id: workflowStates[0].id,
        issue_type: 'story' as const,
        priority: 2 as const,
        estimate: 5,
      };

      const story = await provider.createIssue(storyConfig);

      expect(story.parent_id).toBe(epic.id);
      expect(story.issue_type).toBe('story');
      expect(story.estimate).toBe(5);

      // Create a subtask under the story
      const subtaskConfig = {
        project_id: testProject.id,
        parent_id: story.id,
        title: 'Test Subtask',
        description: 'A test subtask under the story',
        state_id: workflowStates[0].id,
        issue_type: 'subtask' as const,
        priority: 3 as const,
        estimate: 2,
      };

      const subtask = await provider.createIssue(subtaskConfig);

      expect(subtask.parent_id).toBe(story.id);
      expect(subtask.issue_type).toBe('subtask');
    });

    it('should enforce hierarchy validation rules', async () => {
      // Try to create an epic with a parent (should fail)
      const invalidEpicConfig = {
        project_id: testProject.id,
        parent_id: 'some-parent-id',
        title: 'Invalid Epic',
        state_id: workflowStates[0].id,
        issue_type: 'epic' as const,
      };

      await expect(provider.createIssue(invalidEpicConfig)).rejects.toThrow(/hierarchy/i);

      // Try to create a subtask without a parent (should fail)
      const invalidSubtaskConfig = {
        project_id: testProject.id,
        title: 'Invalid Subtask',
        state_id: workflowStates[0].id,
        issue_type: 'subtask' as const,
      };

      await expect(provider.createIssue(invalidSubtaskConfig)).rejects.toThrow(/hierarchy/i);
    });

    it('should list issues with comprehensive filtering', async () => {
      // Create multiple issues for filtering tests
      const epic = await provider.createIssue({
        project_id: testProject.id,
        title: 'Filter Test Epic',
        state_id: workflowStates[0].id,
        issue_type: 'epic',
        priority: 1,
      });

      const story = await provider.createIssue({
        project_id: testProject.id,
        parent_id: epic.id,
        title: 'Filter Test Story',
        state_id: workflowStates[1].id,
        issue_type: 'story',
        priority: 2,
        estimate: 8,
        assignee_id: 'test-user-123',
      });

      // Test various filters
      const allIssues = await provider.listIssues({ project_id: testProject.id });

      expect(allIssues.length).toBeGreaterThanOrEqual(2);

      const epicIssues = await provider.listIssues({
        project_id: testProject.id,
        issue_type: 'epic',
      });

      expect(epicIssues.every(issue => issue.issue_type === 'epic')).toBe(true);

      const inProgressIssues = await provider.listIssues({
        project_id: testProject.id,
        state_id: workflowStates[1].id,
      });

      expect(inProgressIssues.every(issue => issue.state_id === workflowStates[1].id)).toBe(true);

      const estimatedIssues = await provider.listIssues({
        project_id: testProject.id,
        has_estimate: true,
      });

      expect(estimatedIssues.every(issue => issue.estimate !== null)).toBe(true);

      const assignedIssues = await provider.listIssues({
        project_id: testProject.id,
        assignee_id: 'test-user-123',
      });

      expect(assignedIssues.every(issue => issue.assignee_id === 'test-user-123')).toBe(true);
    });

    it('should update issues with validation', async () => {
      const issue = await provider.createIssue({
        project_id: testProject.id,
        title: 'Issue to Update',
        state_id: workflowStates[0].id,
        issue_type: 'story',
        priority: 3,
      });

      const updates = {
        title: 'Updated Issue Title',
        state_id: workflowStates[1].id,
        priority: 1 as const,
        estimate: 5,
      };

      const updated = await provider.updateIssue(issue.id, updates);

      expect(updated.title).toBe(updates.title);
      expect(updated.state_id).toBe(updates.state_id);
      expect(updated.priority).toBe(updates.priority);
      expect(updated.estimate).toBe(updates.estimate);
      expect(updated.workflowState?.name).toBe('In Progress');
    });
  });

  // =============================================================================
  // Dependency Management Tests
  // =============================================================================

  describe('Dependency Management', () => {
    let issueA: EnhancedIssue;
    let issueB: EnhancedIssue;
    let issueC: EnhancedIssue;
    let workflowState: WorkflowState;

    beforeEach(async () => {
      workflowState = await provider.createWorkflowState(testProject.id, {
        name: 'To Do',
        type: 'unstarted',
        position: 1,
        color: '#cccccc',
      });

      // Create test issues for dependency testing
      issueA = await provider.createIssue({
        project_id: testProject.id,
        title: 'Issue A',
        state_id: workflowState.id,
        issue_type: 'story',
      });

      issueB = await provider.createIssue({
        project_id: testProject.id,
        title: 'Issue B',
        state_id: workflowState.id,
        issue_type: 'story',
      });

      issueC = await provider.createIssue({
        project_id: testProject.id,
        title: 'Issue C',
        state_id: workflowState.id,
        issue_type: 'story',
      });
    });

    it('should create and manage dependencies', async () => {
      // Create dependency: A blocks B
      const dependency = await provider.addDependency(issueA.id, issueB.id, 'blocks');

      expect(dependency.blocker_id).toBe(issueA.id);
      expect(dependency.blocked_id).toBe(issueB.id);
      expect(dependency.dependency_type).toBe('blocks');
    });

    it('should build dependency graphs', async () => {
      // Set up dependency chain: A blocks B, B blocks C
      await provider.addDependency(issueA.id, issueB.id, 'blocks');
      await provider.addDependency(issueB.id, issueC.id, 'blocks');

      const dependencyGraph = await provider.getDependencyGraph(testProject.id);

      expect(dependencyGraph.nodes.length).toBe(3);
      expect(dependencyGraph.edges.length).toBe(2);

      // Verify graph structure
      const edgeAB = dependencyGraph.edges.find(e => e.from === issueA.id && e.to === issueB.id);
      const edgeBC = dependencyGraph.edges.find(e => e.from === issueB.id && e.to === issueC.id);

      expect(edgeAB).toBeTruthy();
      expect(edgeBC).toBeTruthy();
    });

    it('should detect circular dependencies', async () => {
      // Create circular dependency: A -> B -> C -> A
      await provider.addDependency(issueA.id, issueB.id, 'blocks');
      await provider.addDependency(issueB.id, issueC.id, 'blocks');

      // This should fail due to circular dependency detection
      await expect(provider.addDependency(issueC.id, issueA.id, 'blocks')).rejects.toThrow(); // The specific error depends on implementation
    });

    it('should validate dependency graph integrity', async () => {
      // Create valid dependencies
      await provider.addDependency(issueA.id, issueB.id, 'blocks');
      await provider.addDependency(issueB.id, issueC.id, 'blocks');

      const validation = await provider.validateDependencyGraph(testProject.id);

      expect(validation.isValid).toBe(true);
      expect(validation.circularDependencies).toHaveLength(0);
      expect(validation.errors).toHaveLength(0);
    });

    it('should remove dependencies correctly', async () => {
      const dependency = await provider.addDependency(issueA.id, issueB.id, 'blocks');

      const removeResult = await provider.removeDependency(dependency.id);

      expect(removeResult.success).toBe(true);

      // Verify dependency is removed
      const dependencyGraph = await provider.getDependencyGraph(testProject.id);

      expect(dependencyGraph.edges.length).toBe(0);
    });
  });

  // =============================================================================
  // Task Recommendation Tests
  // =============================================================================

  describe('Task Recommendation Engine', () => {
    let workflowStates: WorkflowState[];
    let issues: EnhancedIssue[];

    beforeEach(async () => {
      // Set up workflow states
      workflowStates = await Promise.all([
        provider.createWorkflowState(testProject.id, {
          name: 'To Do',
          type: 'unstarted',
          position: 1,
          color: '#cccccc',
        }),
        provider.createWorkflowState(testProject.id, {
          name: 'Done',
          type: 'completed',
          position: 2,
          color: '#00ff00',
        }),
      ]);

      // Create test issues with different priorities and estimates
      issues = await Promise.all([
        provider.createIssue({
          project_id: testProject.id,
          title: 'High Priority Task',
          state_id: workflowStates[0].id,
          issue_type: 'story',
          priority: 1, // Urgent
          estimate: 3,
        }),
        provider.createIssue({
          project_id: testProject.id,
          title: 'Medium Priority Task',
          state_id: workflowStates[0].id,
          issue_type: 'story',
          priority: 2, // High
          estimate: 5,
        }),
        provider.createIssue({
          project_id: testProject.id,
          title: 'Low Priority Task',
          state_id: workflowStates[0].id,
          issue_type: 'subtask',
          priority: 4, // Low
          estimate: 2,
        }),
      ]);
    });

    it('should provide intelligent task recommendations', async () => {
      const recommendation = await provider.getNextTaskRecommendation(testProject.id);

      expect(recommendation.issue).toBeTruthy();
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.rationale).toBeTruthy();
      expect(typeof recommendation.rationale).toBe('string');
    });

    it('should consider context in recommendations', async () => {
      const context = {
        focusArea: 'High Priority',
        recentWork: ['story', 'feature'],
      };

      const recommendation = await provider.getNextTaskRecommendation(testProject.id, context);

      expect(recommendation.issue).toBeTruthy();
      expect(recommendation.context.focusArea).toBe(context.focusArea);
      expect(recommendation.context.recentWork).toEqual(context.recentWork);
    });

    it('should provide available issues for assignment', async () => {
      const availableIssues = await provider.getAvailableIssues(testProject.id);

      expect(availableIssues.length).toBeGreaterThanOrEqual(3);
      expect(availableIssues.every(issue => issue.workflowState?.type !== 'completed')).toBe(true);
    });

    it('should handle issue lifecycle transitions', async () => {
      const issue = issues[0];

      // Start the issue
      const startedIssue = await provider.startIssue(issue.id);

      expect(startedIssue.workflowState?.type).toBe('started');

      // Complete the issue
      const result = await provider.completeIssue(startedIssue.id);

      expect(result.issue.workflowState?.type).toBe('completed');
      expect(Array.isArray(result.unblockedIssues)).toBe(true);
    });
  });

  // =============================================================================
  // Label Management Tests
  // =============================================================================

  describe('Label Management', () => {
    let testLabels: Label[];

    beforeEach(async () => {
      // Create test labels
      testLabels = await Promise.all([
        provider.createLabel({
          project_id: testProject.id,
          name: 'bug',
          color: '#ff0000',
          description: 'Bug reports',
        }),
        provider.createLabel({
          project_id: testProject.id,
          name: 'feature',
          color: '#00ff00',
          description: 'New features',
        }),
        provider.createLabel({
          project_id: testProject.id,
          name: 'enhancement',
          color: '#0000ff',
          description: 'Improvements',
        }),
      ]);
    });

    it('should create and retrieve labels', async () => {
      const labels = await provider.getProjectLabels(testProject.id);

      expect(labels.length).toBe(3);
      expect(labels.find(l => l.name === 'bug')).toBeTruthy();
      expect(labels.find(l => l.name === 'feature')).toBeTruthy();
      expect(labels.find(l => l.name === 'enhancement')).toBeTruthy();
    });

    it('should manage issue-label relationships', async () => {
      const workflowState = await provider.createWorkflowState(testProject.id, {
        name: 'To Do',
        type: 'unstarted',
        position: 1,
        color: '#cccccc',
      });

      const issue = await provider.createIssue({
        project_id: testProject.id,
        title: 'Test Issue with Labels',
        state_id: workflowState.id,
        issue_type: 'story',
      });

      // Add labels to issue
      const bugLabel = testLabels.find(l => l.name === 'bug')!;
      const featureLabel = testLabels.find(l => l.name === 'feature')!;

      await provider.addLabelToIssue(issue.id, bugLabel.id);
      await provider.addLabelToIssue(issue.id, featureLabel.id);

      // Retrieve issue and verify labels
      const retrievedIssue = await provider.getIssue(issue.id);

      expect(retrievedIssue.labels.length).toBe(2);
      expect(retrievedIssue.labels.some(l => l.name === 'bug')).toBe(true);
      expect(retrievedIssue.labels.some(l => l.name === 'feature')).toBe(true);

      // Remove a label
      await provider.removeLabelFromIssue(issue.id, bugLabel.id);

      const updatedIssue = await provider.getIssue(issue.id);

      expect(updatedIssue.labels.length).toBe(1);
      expect(updatedIssue.labels.some(l => l.name === 'feature')).toBe(true);
      expect(updatedIssue.labels.some(l => l.name === 'bug')).toBe(false);
    });
  });

  // =============================================================================
  // Data Integrity and Validation Tests
  // =============================================================================

  describe('Data Integrity and Validation', () => {
    it('should validate project data integrity', async () => {
      // Create some test data
      const workflowState = await provider.createWorkflowState(testProject.id, {
        name: 'To Do',
        type: 'unstarted',
        position: 1,
        color: '#cccccc',
      });

      const epic = await provider.createIssue({
        project_id: testProject.id,
        title: 'Test Epic',
        state_id: workflowState.id,
        issue_type: 'epic',
      });

      const story = await provider.createIssue({
        project_id: testProject.id,
        parent_id: epic.id,
        title: 'Test Story',
        state_id: workflowState.id,
        issue_type: 'story',
      });

      const validation = await provider.validateDataIntegrity(testProject.id);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.statistics.totalIssues).toBe(2);
      expect(validation.statistics.hierarchyViolations).toBe(0);
      expect(validation.statistics.dependencyViolations).toBe(0);
      expect(validation.statistics.orphanedEntities).toBe(0);
    });
  });

  // =============================================================================
  // Data Export/Import Tests
  // =============================================================================

  describe('Data Portability', () => {
    it('should export project data with full integrity', async () => {
      // Create comprehensive test data
      const workflowState = await provider.createWorkflowState(testProject.id, {
        name: 'To Do',
        type: 'unstarted',
        position: 1,
        color: '#cccccc',
      });

      const label = await provider.createLabel({
        project_id: testProject.id,
        name: 'test-label',
        color: '#ff0000',
      });

      const issue = await provider.createIssue({
        project_id: testProject.id,
        title: 'Export Test Issue',
        state_id: workflowState.id,
        issue_type: 'story',
      });

      await provider.addLabelToIssue(issue.id, label.id);

      // Export data
      const exportData = await provider.exportData(testProject.id);

      expect(exportData.metadata.version).toBeTruthy();
      expect(exportData.metadata.projectId).toBe(testProject.id);
      expect(exportData.projects).toHaveLength(1);
      expect(exportData.issues).toHaveLength(1);
      expect(exportData.workflowStates).toHaveLength(1);
      expect(exportData.labels).toHaveLength(1);
      expect(exportData.validation.checksums).toBeTruthy();
    });

    it('should handle import operations', async () => {
      // First export some data
      const exportData = await provider.exportData(testProject.id);

      // Import should complete successfully (even if to same provider)
      const importResult = await provider.importData(exportData);

      expect(importResult.success).toBe(true);
      expect(importResult.duration).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // Performance Benchmarks
  // =============================================================================

  describe('Performance Benchmarks', () => {
    it('should handle large datasets efficiently', async () => {
      const workflowState = await provider.createWorkflowState(testProject.id, {
        name: 'To Do',
        type: 'unstarted',
        position: 1,
        color: '#cccccc',
      });

      // Create multiple issues to test performance
      const issueCount = 100;
      const startTime = Date.now();

      const issues = await Promise.all(
        Array.from({ length: issueCount }, (_, i) =>
          provider.createIssue({
            project_id: testProject.id,
            title: `Performance Test Issue ${i}`,
            state_id: workflowState.id,
            issue_type: 'story',
            estimate: Math.floor(Math.random() * 8) + 1,
          })
        )
      );

      const creationTime = Date.now() - startTime;

      expect(creationTime).toBeLessThan(10_000); // Should complete in under 10 seconds

      // Test query performance
      const queryStartTime = Date.now();
      const retrievedIssues = await provider.listIssues({ project_id: testProject.id });
      const queryTime = Date.now() - queryStartTime;

      expect(retrievedIssues.length).toBe(issueCount);
      expect(queryTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should meet performance targets for operations', async () => {
      const workflowState = await provider.createWorkflowState(testProject.id, {
        name: 'To Do',
        type: 'unstarted',
        position: 1,
        color: '#cccccc',
      });

      // Single issue creation should be very fast
      const startTime = Date.now();
      const issue = await provider.createIssue({
        project_id: testProject.id,
        title: 'Performance Test Issue',
        state_id: workflowState.id,
        issue_type: 'story',
      });
      const creationTime = Date.now() - startTime;

      expect(creationTime).toBeLessThan(50); // Should complete in under 50ms

      // Issue retrieval should be very fast
      const retrievalStartTime = Date.now();

      await provider.getIssue(issue.id);
      const retrievalTime = Date.now() - retrievalStartTime;

      expect(retrievalTime).toBeLessThan(10); // Should complete in under 10ms
    });
  });

  // =============================================================================
  // Capability Discovery Tests
  // =============================================================================

  describe('Capability Discovery', () => {
    it('should discover all supported capabilities', async () => {
      const discoveryResult = await provider.discoverCapabilities({
        probeDepth: 'shallow',
        includeBenchmarks: false,
      });

      expect(discoveryResult.discoverySuccess).toBe(true);
      expect(discoveryResult.capabilities.size).toBeGreaterThan(20);

      // Check key capabilities
      expect(discoveryResult.capabilities.get('projects.create')?.isSupported).toBe(true);
      expect(discoveryResult.capabilities.get('issues.create')?.isSupported).toBe(true);
      expect(discoveryResult.capabilities.get('hierarchy.validation')?.isSupported).toBe(true);
      expect(discoveryResult.capabilities.get('dependencies.graph')?.isSupported).toBe(true);
      expect(discoveryResult.capabilities.get('performance.offline')?.isSupported).toBe(true);
    });

    it('should provide detailed capability information', async () => {
      const capabilityInfo = await provider.getCapabilityInfo('hierarchy.validation');

      expect(capabilityInfo?.isSupported).toBe(true);
      expect(capabilityInfo?.implementationDetails).toBeTruthy();
      expect(capabilityInfo?.version).toBeTruthy();
    });

    it('should benchmark capabilities when requested', async () => {
      const discoveryResult = await provider.discoverCapabilities({
        targetCapabilities: ['projects.read', 'issues.list'],
        probeDepth: 'deep',
        includeBenchmarks: true,
      });

      const projectsCapability = discoveryResult.capabilities.get('projects.read');

      expect(projectsCapability?.performance).toBeTruthy();
      expect(projectsCapability?.performance?.averageResponseTime).toBeGreaterThan(0);
      expect(projectsCapability?.performance?.reliability).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Edge Cases and Error Handling Tests
// =============================================================================

describe('SQLite Provider Edge Cases', () => {
  let provider: SQLiteProvider;
  let testDatabasePath: string;
  let testConfig: SQLiteProviderConfig;

  beforeAll(async () => {
    testDatabasePath = join(tmpdir(), `jcvd-edge-test-${Date.now()}.sqlite`);

    testConfig = {
      id: 'edge-test-sqlite-provider',
      type: 'sqlite',
      name: 'Edge Test SQLite Provider',
      databasePath: testDatabasePath,
      enableWAL: true,
      cacheSize: 1000,
      timeout: 5000,
      enableForeignKeys: true,
    };

    provider = createSQLiteProvider(testConfig);
    await provider.initialize(testConfig);
  });

  afterAll(async () => {
    if (provider) {
      await provider.cleanup();
    }
    try {
      await unlink(testDatabasePath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  it('should handle non-existent resource lookups gracefully', async () => {
    await expect(provider.getProject('non-existent-id')).rejects.toThrow(/not found/i);
    await expect(provider.getIssue('non-existent-id')).rejects.toThrow(/not found/i);
  });

  it('should handle invalid database paths during initialization', async () => {
    const invalidConfig = {
      ...testConfig,
      id: 'invalid-path-provider',
      databasePath: '/invalid/path/that/does/not/exist.sqlite',
    };

    const invalidProvider = createSQLiteProvider(invalidConfig);

    // This should fail during initialization
    await expect(invalidProvider.initialize(invalidConfig)).rejects.toThrow();
  });

  it('should handle concurrent operations safely', async () => {
    const project = await provider.createProject({
      name: 'Concurrency Test Project',
      description: 'Testing concurrent operations',
    });

    const workflowState = await provider.createWorkflowState(project.id, {
      name: 'To Do',
      type: 'unstarted',
      position: 1,
      color: '#cccccc',
    });

    // Create multiple issues concurrently
    const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
      provider.createIssue({
        project_id: project.id,
        title: `Concurrent Issue ${i}`,
        state_id: workflowState.id,
        issue_type: 'story',
      })
    );

    const results = await Promise.all(concurrentOperations);

    expect(results.length).toBe(10);
    expect(results.every(issue => issue.id)).toBe(true);

    // Verify all issues were created correctly
    const allIssues = await provider.listIssues({ project_id: project.id });

    expect(allIssues.length).toBe(10);
  });
});
