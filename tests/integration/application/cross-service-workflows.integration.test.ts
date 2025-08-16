import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  RealIntegrationInfrastructure,
  TestDataBuilder,
  PerformanceMonitor,
  DatabaseVerification,
  type ApplicationServices,
  type Repositories
} from '../../fixtures/real-integration-infrastructure.js';

/**
 * Cross-Service Workflow Integration Tests
 * 
 * These tests verify that application services work together correctly
 * with real database infrastructure (no mocks). They test complete
 * workflows that span multiple services and verify data consistency.
 */
describe('Cross-Service Workflows Integration', () => {
  let infrastructure: RealIntegrationInfrastructure;
  let services: ApplicationServices;
  let repositories: Repositories;
  let dbVerification: DatabaseVerification;

  beforeEach(() => {
    infrastructure = new RealIntegrationInfrastructure();
    services = infrastructure.createApplicationServices();
    repositories = infrastructure.getRepositories();
    dbVerification = new DatabaseVerification(infrastructure.getDatabase());
  });

  afterEach(() => {
    infrastructure.cleanup();
  });

  describe('Complete Project Setup Workflow', () => {
    it('should create project with issues and workflow in correct sequence', async () => {
      // Test the most common workflow: Project → Issues → Workflow
      
      // Step 1: Create project
      const projectResult = await PerformanceMonitor.assertPerformance(
        'create project',
        () => services.projectService.createProject(TestDataBuilder.project({
          name: 'Full Integration Project',
          description: 'Testing complete project setup workflow'
        })),
        50 // Should complete in < 50ms
      );

      if (!projectResult.success) {
        console.log('Project creation failed:', projectResult.error);
      }
      expect(projectResult.success).toBe(true);
      expect(projectResult.data).toBeDefined();
      const project = projectResult.data!;

      // Step 2: Create issue hierarchy (Epic → Story → Subtask)
      const issueHierarchy = TestDataBuilder.issueHierarchy(project.id);

      // Create Epic
      const epicResult = await PerformanceMonitor.assertPerformance(
        'create epic',
        () => services.issueService.createIssue(issueHierarchy.epic),
        50
      );

      expect(epicResult.success).toBe(true);
      const epic = epicResult.data!;

      // Create Story under Epic
      const storyResult = await PerformanceMonitor.assertPerformance(
        'create story',
        () => services.issueService.createIssue(issueHierarchy.story(epic.id)),
        50
      );

      expect(storyResult.success).toBe(true);
      const story = storyResult.data!;

      // Create Subtask under Story
      const subtaskResult = await PerformanceMonitor.assertPerformance(
        'create subtask',
        () => services.issueService.createIssue(issueHierarchy.subtask(story.id)),
        50
      );

      expect(subtaskResult.success).toBe(true);
      const subtask = subtaskResult.data!;

      // Step 3: Create workflow for project
      const workflowResult = await PerformanceMonitor.assertPerformance(
        'create workflow',
        () => services.workflowService.createWorkflow(TestDataBuilder.workflow(project.id, {
          name: 'Project Development Workflow',
          description: 'End-to-end development workflow'
        })),
        50
      );

      expect(workflowResult.success).toBe(true);
      const workflow = workflowResult.data!;

      // Verification: Check data consistency across services
      
      // Verify project exists and is correctly set up
      const retrievedProject = await services.projectService.getProject(project.id);
      expect(retrievedProject).not.toBeNull();
      expect(retrievedProject!.name).toBe('Full Integration Project');

      // Verify issue hierarchy is correctly established
      const projectIssues = await services.issueService.getProjectIssues(project.id);
      expect(projectIssues).toHaveLength(3);

      const epicFromDb = projectIssues.find(i => i.type === 'Epic');
      const storyFromDb = projectIssues.find(i => i.type === 'Story');
      const subtaskFromDb = projectIssues.find(i => i.type === 'Subtask');

      expect(epicFromDb).toBeDefined();
      expect(storyFromDb).toBeDefined();
      expect(subtaskFromDb).toBeDefined();
      expect(storyFromDb!.parentId).toBe(epic.id);
      expect(subtaskFromDb!.parentId).toBe(story.id);
      expect(subtaskFromDb!.estimate).toBe(3);

      // Verify workflow is correctly associated with project
      const retrievedWorkflow = await services.workflowService.getWorkflowByProject(project.id);
      expect(retrievedWorkflow).not.toBeNull();
      expect(retrievedWorkflow!.id).toBe(workflow.id);
      expect(retrievedWorkflow!.name).toBe('Project Development Workflow');

      // Verify database integrity
      dbVerification.verifyForeignKeyConstraints();
      const counts = dbVerification.getRecordCounts();
      expect(counts.projects).toBe(1);
      expect(counts.issues).toBe(3);
      expect(counts.workflows).toBe(1);

      // Verify project-issue relationships at database level
      const relationshipVerification = dbVerification.verifyProjectIssueRelationships(project.id);
      expect(relationshipVerification.totalIssues).toBe(3);
      expect(relationshipVerification.epics).toBe(1);
      expect(relationshipVerification.stories).toBe(1);
      expect(relationshipVerification.subtasks).toBe(1);
    });

    it('should handle multiple projects with overlapping workflows', async () => {
      // Test scenario: Multiple projects with their own issues and workflows
      
      // Create first project
      const project1Result = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Project Alpha',
        description: 'First project for isolation testing'
      }));

      expect(project1Result.success).toBe(true);
      const project1 = project1Result.data!;

      // Create second project
      const project2Result = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Project Beta', 
        description: 'Second project for isolation testing'
      }));

      expect(project2Result.success).toBe(true);
      const project2 = project2Result.data!;

      // Create issues for each project
      const issue1Result = await services.issueService.createIssue(TestDataBuilder.issue(project1.id, {
        title: 'Alpha Issue',
        type: 'Story'
      }));

      const issue2Result = await services.issueService.createIssue(TestDataBuilder.issue(project2.id, {
        title: 'Beta Issue', 
        type: 'Story'
      }));

      expect(issue1Result.success).toBe(true);
      expect(issue2Result.success).toBe(true);

      // Create workflows for each project
      const workflow1Result = await services.workflowService.createWorkflow(TestDataBuilder.workflow(project1.id, {
        name: 'Alpha Workflow'
      }));

      const workflow2Result = await services.workflowService.createWorkflow(TestDataBuilder.workflow(project2.id, {
        name: 'Beta Workflow'
      }));

      expect(workflow1Result.success).toBe(true);
      expect(workflow2Result.success).toBe(true);

      // Verify isolation: Project 1 should only see its own data
      const project1Issues = await services.issueService.getProjectIssues(project1.id);
      expect(project1Issues).toHaveLength(1);
      expect(project1Issues[0].title).toBe('Alpha Issue');

      const project1Workflow = await services.workflowService.getWorkflowByProject(project1.id);
      expect(project1Workflow!.name).toBe('Alpha Workflow');

      // Verify isolation: Project 2 should only see its own data
      const project2Issues = await services.issueService.getProjectIssues(project2.id);
      expect(project2Issues).toHaveLength(1);
      expect(project2Issues[0].title).toBe('Beta Issue');

      const project2Workflow = await services.workflowService.getWorkflowByProject(project2.id);
      expect(project2Workflow!.name).toBe('Beta Workflow');

      // Verify database consistency
      dbVerification.verifyForeignKeyConstraints();
      const counts = dbVerification.getRecordCounts();
      expect(counts.projects).toBe(2);
      expect(counts.issues).toBe(2);
      expect(counts.workflows).toBe(2);
    });
  });

  describe('Workflow State Management Integration', () => {
    it('should manage workflow state changes with issue updates', async () => {
      // Test workflow progression with corresponding issue status changes
      
      // Setup: Create project with workflow and issues
      const projectResult = await services.projectService.createProject(TestDataBuilder.project());
      const project = projectResult.data!;

      const workflowResult = await services.workflowService.createWorkflow(TestDataBuilder.workflow(project.id));
      const workflow = workflowResult.data!;

      const issueResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Feature Implementation',
        type: 'Story'
      }));
      const issue = issueResult.data!;

      // Test: Progress workflow through stages
      const stageExecutionResult = await services.workflowService.executeStage({
        workflowId: workflow.id,
        stageId: 'requirements',
        context: { issueId: issue.id, phase: 'analysis' }
      });

      expect(stageExecutionResult.success).toBe(true);
      expect(stageExecutionResult.status).toBe('in_progress');

      // Complete the stage
      const stageCompletionResult = await services.workflowService.completeStage({
        workflowId: workflow.id,
        stageId: 'requirements',
        success: true,
        output: { requirements: ['REQ-1', 'REQ-2'] },
        context: { autoAdvance: true }
      });

      expect(stageCompletionResult.success).toBe(true);
      expect(stageCompletionResult.status).toBe('completed');

      // Update issue status to reflect workflow progress
      const issueUpdateResult = await services.issueService.updateIssue({
        id: issue.id,
        status: 'Todo' // Move from Backlog to Todo
      });

      expect(issueUpdateResult.success).toBe(true);

      // Verify workflow progress
      const workflowProgress = await services.workflowService.getWorkflowProgress(workflow.id);
      expect(workflowProgress.completionPercentage).toBeGreaterThan(0);
      expect(workflowProgress.availableStages.length).toBeGreaterThan(0);

      // Verify issue status was updated
      const updatedIssue = await services.issueService.getIssue(issue.id);
      expect(updatedIssue!.status).toBe('Todo');

      // Verify database consistency
      dbVerification.verifyForeignKeyConstraints();
    });
  });

  describe('Complex Hierarchy Integration', () => {
    it('should support complex issue hierarchies with multiple levels', async () => {
      // Test deep issue hierarchies with validation
      
      const projectResult = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Complex Hierarchy Project'
      }));
      const project = projectResult.data!;

      // Create Epic
      const epicResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'User Management Epic',
        type: 'Epic',
        description: 'Complete user management system'
      }));
      const epic = epicResult.data!;

      // Create multiple Stories under Epic
      const loginStoryResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Login Story',
        type: 'Story',
        parentId: epic.id,
        description: 'User login functionality'
      }));

      const registrationStoryResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Registration Story', 
        type: 'Story',
        parentId: epic.id,
        description: 'User registration functionality'
      }));

      expect(loginStoryResult.success).toBe(true);
      expect(registrationStoryResult.success).toBe(true);

      const loginStory = loginStoryResult.data!;
      const registrationStory = registrationStoryResult.data!;

      // Create Subtasks under each Story
      const loginSubtask1Result = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Email Validation',
        type: 'Subtask',
        parentId: loginStory.id,
        estimate: 2
      }));

      const loginSubtask2Result = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Password Validation',
        type: 'Subtask', 
        parentId: loginStory.id,
        estimate: 3
      }));

      const registrationSubtaskResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Account Creation',
        type: 'Subtask',
        parentId: registrationStory.id,
        estimate: 5
      }));

      expect(loginSubtask1Result.success).toBe(true);
      expect(loginSubtask2Result.success).toBe(true);
      expect(registrationSubtaskResult.success).toBe(true);

      // Verify hierarchy structure
      const allProjectIssues = await services.issueService.getProjectIssues(project.id);
      expect(allProjectIssues).toHaveLength(6); // 1 epic + 2 stories + 3 subtasks

      // Verify Epic has correct children
      const storiesUnderEpic = allProjectIssues.filter(issue => 
        issue.parentId === epic.id && issue.type === 'Story'
      );
      expect(storiesUnderEpic).toHaveLength(2);

      // Verify Stories have correct children
      const subtasksUnderLogin = allProjectIssues.filter(issue => 
        issue.parentId === loginStory.id && issue.type === 'Subtask'
      );
      expect(subtasksUnderLogin).toHaveLength(2);

      const subtasksUnderRegistration = allProjectIssues.filter(issue => 
        issue.parentId === registrationStory.id && issue.type === 'Subtask'
      );
      expect(subtasksUnderRegistration).toHaveLength(1);

      // Verify estimates are only on subtasks (per Linear business rules)
      const issuesWithEstimates = allProjectIssues.filter(issue => issue.estimate !== undefined);
      expect(issuesWithEstimates).toHaveLength(3); // Only subtasks should have estimates
      issuesWithEstimates.forEach(issue => {
        expect(issue.type).toBe('Subtask');
      });

      // Verify database relationships
      const relationshipVerification = dbVerification.verifyProjectIssueRelationships(project.id);
      expect(relationshipVerification.totalIssues).toBe(6);
      expect(relationshipVerification.epics).toBe(1);
      expect(relationshipVerification.stories).toBe(2);
      expect(relationshipVerification.subtasks).toBe(3);

      // Verify foreign key integrity
      dbVerification.verifyForeignKeyConstraints();
    });
  });

  describe('Service Coordination Performance', () => {
    it('should maintain performance with realistic data volumes', async () => {
      // Test performance with larger data sets
      const startTime = performance.now();

      // Create multiple projects with full hierarchies
      const projectPromises = Array.from({ length: 5 }, (_, i) => 
        services.projectService.createProject(TestDataBuilder.project({
          name: `Performance Test Project ${i + 1}`,
          description: `Project ${i + 1} for performance testing`
        }))
      );

      const projectResults = await Promise.all(projectPromises);
      const projects = projectResults.map(result => result.data!);

      // Create issues for each project
      const issuePromises = projects.flatMap(project => 
        Array.from({ length: 10 }, (_, i) =>
          services.issueService.createIssue(TestDataBuilder.issue(project.id, {
            title: `Issue ${i + 1} for ${project.name}`,
            type: i % 3 === 0 ? 'Epic' : i % 3 === 1 ? 'Story' : 'Subtask'
          }))
        )
      );

      const issueResults = await Promise.all(issuePromises);
      expect(issueResults.every(result => result.success)).toBe(true);

      // Create workflows for each project
      const workflowPromises = projects.map(project => 
        services.workflowService.createWorkflow(TestDataBuilder.workflow(project.id, {
          name: `Workflow for ${project.name}`
        }))
      );

      const workflowResults = await Promise.all(workflowPromises);
      expect(workflowResults.every(result => result.success)).toBe(true);

      const totalTime = performance.now() - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(1000); // Should complete in < 1 second
      
      // Verify data integrity with volume
      const counts = dbVerification.getRecordCounts();
      expect(counts.projects).toBe(5);
      expect(counts.issues).toBe(50); // 5 projects × 10 issues each
      expect(counts.workflows).toBe(5);

      dbVerification.verifyForeignKeyConstraints();

      console.log(`✅ Performance test completed: ${totalTime.toFixed(2)}ms for 5 projects, 50 issues, 5 workflows`);
    });
  });
});