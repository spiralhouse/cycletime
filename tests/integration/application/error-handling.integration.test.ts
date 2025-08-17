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
 * Error Handling Integration Tests
 * 
 * These tests verify that errors are properly handled, propagated, and recovered
 * from across service boundaries with real infrastructure.
 */
describe.sequential('Error Handling Integration', () => {
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

  describe('Business Rule Violation Handling', () => {
    it('should handle epic parent validation errors gracefully', async () => {
      // Create project and epic first
      const projectResult = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Epic Validation Test',
        description: 'Testing epic parent validation'
      }));

      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;

      const epicResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Parent Epic',
        type: 'Epic',
        description: 'This epic will be used as invalid parent'
      }));

      expect(epicResult.success).toBe(true);
      const parentEpic = epicResult.data!;

      // Try to create epic with parent (should fail)
      const invalidEpicResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Child Epic (Invalid)',
        type: 'Epic',
        parentId: parentEpic.id,
        description: 'Epics cannot have parents'
      }));

      expect(invalidEpicResult.success).toBe(false);
      expect(invalidEpicResult.error).toContain('Epic cannot have a parent');

      // Verify database state is consistent - only the valid epic should exist
      const projectIssues = await services.issueService.getProjectIssues(project.id);

      expect(projectIssues).toHaveLength(1);
      expect(projectIssues[0].title).toBe('Parent Epic');
      expect(projectIssues[0].type).toBe('Epic');

      // Verify database integrity
      dbVerification.verifyForeignKeyConstraints();
      const counts = dbVerification.getRecordCounts();

      expect(counts.projects).toBe(1);
      expect(counts.issues).toBe(1);
    });

    it('should handle story with subtask estimation violations', async () => {
      // Create project and epic
      const projectResult = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Estimation Test',
        description: 'Testing estimation business rules'
      }));

      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;

      const epicResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Feature Epic',
        type: 'Epic'
      }));

      expect(epicResult.success).toBe(true);
      const epic = epicResult.data!;

      // Create story under epic
      const storyResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Feature Story',
        type: 'Story',
        parentId: epic.id
      }));

      expect(storyResult.success).toBe(true);
      const story = storyResult.data!;

      // Create subtask under story
      const subtaskResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Implementation Subtask',
        type: 'Subtask',
        parentId: story.id,
        estimate: 3
      }));

      expect(subtaskResult.success).toBe(true);

      // Try to create another story with estimate when it has subtasks (should fail on update)
      // First, try to update the story to have an estimate (should fail due to business rules)
      const updateResult = await services.issueService.updateIssue({
        id: story.id,
        estimate: 5 // Stories with subtasks cannot have estimates
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('Cannot set estimate on Story with children');

      // Verify all valid data persisted
      const projectIssues = await services.issueService.getProjectIssues(project.id);

      expect(projectIssues).toHaveLength(3); // Epic, Story, Subtask

      const storyFromDb = projectIssues.find(i => i.type === 'Story');
      const subtaskFromDb = projectIssues.find(i => i.type === 'Subtask');

      expect(storyFromDb).toBeDefined();
      expect(storyFromDb!.estimate).toBeUndefined(); // Should not have estimate
      expect(subtaskFromDb).toBeDefined();
      expect(subtaskFromDb!.estimate).toBe(3); // Should have estimate

      dbVerification.verifyForeignKeyConstraints();
    });

    it.skip('should handle circular dependency detection', async () => {
      // TODO: Implement circular dependency detection for issue hierarchies
      // Create project and issues
      const projectResult = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Circular Dependency Test',
        description: 'Testing circular dependency detection'
      }));

      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;

      // Create story A
      const storyAResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Story A',
        type: 'Story'
      }));

      expect(storyAResult.success).toBe(true);
      const storyA = storyAResult.data!;

      // Create story B
      const storyBResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Story B',
        type: 'Story'
      }));

      expect(storyBResult.success).toBe(true);
      const storyB = storyBResult.data!;

      // Try to create circular dependency: A -> B -> A
      // First, make B a subtask of A
      const updateBResult = await services.issueService.updateIssue({
        id: storyB.id,
        type: 'Subtask',
        parentId: storyA.id
      });

      expect(updateBResult.success).toBe(true);

      // Now try to make A a subtask of B (should create circular dependency)
      const circularResult = await services.issueService.updateIssue({
        id: storyA.id,
        type: 'Subtask',
        parentId: storyB.id
      });

      expect(circularResult.success).toBe(false);
      expect(circularResult.error).toContain('circular dependency');

      // Verify the valid hierarchy persisted
      const projectIssues = await services.issueService.getProjectIssues(project.id);

      expect(projectIssues).toHaveLength(2);

      const storyAFromDb = projectIssues.find(i => i.title === 'Story A');
      const storyBFromDb = projectIssues.find(i => i.title === 'Story B');

      expect(storyAFromDb).toBeDefined();
      expect(storyAFromDb!.type).toBe('Story'); // Should remain Story
      expect(storyAFromDb!.parentId).toBeUndefined(); // Should not have parent

      expect(storyBFromDb).toBeDefined();
      expect(storyBFromDb!.type).toBe('Subtask'); // Should be Subtask
      expect(storyBFromDb!.parentId).toBe(storyA.id); // Should have storyA as parent

      dbVerification.verifyForeignKeyConstraints();
    });
  });

  describe('Cross-Service Error Propagation', () => {
    it('should propagate project validation errors to issue service', async () => {
      // Try to create issue for non-existent project
      const nonExistentProjectId = 'definitely-does-not-exist';

      const issueResult = await services.issueService.createIssue(TestDataBuilder.issue(nonExistentProjectId, {
        title: 'Orphan Issue',
        type: 'Story',
        description: 'This issue has no project'
      }));

      expect(issueResult.success).toBe(false);
      expect(issueResult.error).toContain('Project does not exist');

      // Verify no data was created
      const counts = dbVerification.getRecordCounts();

      expect(counts.projects).toBe(0);
      expect(counts.issues).toBe(0);

      dbVerification.verifyForeignKeyConstraints();
    });

    it('should propagate project validation errors to workflow service', async () => {
      // Try to create workflow for non-existent project
      const nonExistentProjectId = 'workflow-project-does-not-exist';

      const workflowResult = await services.workflowService.createWorkflow(TestDataBuilder.workflow(nonExistentProjectId, {
        name: 'Orphan Workflow',
        description: 'This workflow has no project'
      }));

      expect(workflowResult.success).toBe(false);
      expect(workflowResult.error).toContain('Project does not exist');

      // Verify no data was created
      const counts = dbVerification.getRecordCounts();

      expect(counts.projects).toBe(0);
      expect(counts.workflows).toBe(0);

      dbVerification.verifyForeignKeyConstraints();
    });

    it('should handle repository-level errors consistently', async () => {
      // Test what happens when we hit database-level constraints
      
      // Create a project
      const projectResult = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Repository Error Test',
        description: 'Testing repository-level error handling'
      }));

      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;

      // Create an issue
      const issueResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Valid Issue',
        type: 'Story'
      }));

      expect(issueResult.success).toBe(true);
      const issue = issueResult.data!;

      // Now try to create issue with same ID (should be handled by business logic, not database)
      // Since we generate UUIDs, let's test a different scenario: 
      // Try to update issue to reference non-existent parent
      const invalidParentId = 'non-existent-parent-issue';

      const updateResult = await services.issueService.updateIssue({
        id: issue.id,
        parentId: invalidParentId
      });

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('Parent issue does not exist');

      // Verify the original issue is unchanged
      const issueFromDb = await services.issueService.getIssue(issue.id);

      expect(issueFromDb).not.toBeNull();
      expect(issueFromDb!.parentId).toBeUndefined();
      expect(issueFromDb!.title).toBe('Valid Issue');

      dbVerification.verifyForeignKeyConstraints();
    });
  });

  describe('Error Recovery and State Consistency', () => {
    it('should maintain consistent state after error recovery', async () => {
      // Create valid baseline data
      const projectResult = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Error Recovery Test',
        description: 'Testing error recovery scenarios'
      }));

      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;

      // Create valid epic and story
      const epicResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Valid Epic',
        type: 'Epic'
      }));

      expect(epicResult.success).toBe(true);
      const epic = epicResult.data!;

      const storyResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Valid Story',
        type: 'Story',
        parentId: epic.id
      }));

      expect(storyResult.success).toBe(true);
      const story = storyResult.data!;

      // Attempt several invalid operations
      const invalidOperations = [
        // Try to create epic with parent
        services.issueService.createIssue(TestDataBuilder.issue(project.id, {
          title: 'Invalid Epic',
          type: 'Epic',
          parentId: story.id
        })),
        // Try to create issue for non-existent project
        services.issueService.createIssue(TestDataBuilder.issue('non-existent', {
          title: 'Orphan Issue',
          type: 'Story'
        })),
        // Try to create workflow for non-existent project
        services.workflowService.createWorkflow(TestDataBuilder.workflow('non-existent', {
          name: 'Orphan Workflow'
        })),
        // Try to update issue with invalid parent
        services.issueService.updateIssue({
          id: story.id,
          parentId: 'non-existent-parent'
        })
      ];

      const results = await Promise.all(invalidOperations);

      // All invalid operations should fail
      results.forEach((result, index) => {
        expect(result.success).toBe(false);
      });

      // Verify the valid data is still intact
      const projectIssues = await services.issueService.getProjectIssues(project.id);

      expect(projectIssues).toHaveLength(2); // Epic and Story

      const epicFromDb = projectIssues.find(i => i.type === 'Epic');
      const storyFromDb = projectIssues.find(i => i.type === 'Story');

      expect(epicFromDb).toBeDefined();
      expect(epicFromDb!.title).toBe('Valid Epic');
      expect(epicFromDb!.parentId).toBeUndefined();

      expect(storyFromDb).toBeDefined();
      expect(storyFromDb!.title).toBe('Valid Story');
      expect(storyFromDb!.parentId).toBe(epic.id);

      // Create valid operations after errors to verify system recovery
      const validSubtaskResult = await services.issueService.createIssue(TestDataBuilder.issue(project.id, {
        title: 'Recovery Subtask',
        type: 'Subtask',
        parentId: story.id,
        estimate: 2
      }));

      expect(validSubtaskResult.success).toBe(true);

      const validWorkflowResult = await services.workflowService.createWorkflow(TestDataBuilder.workflow(project.id, {
        name: 'Recovery Workflow'
      }));

      expect(validWorkflowResult.success).toBe(true);

      // Verify final state
      const finalCounts = dbVerification.getRecordCounts();

      expect(finalCounts.projects).toBe(1);
      expect(finalCounts.issues).toBe(3); // Epic, Story, Subtask
      expect(finalCounts.workflows).toBe(1);

      dbVerification.verifyForeignKeyConstraints();
    });

    it('should handle cascading errors gracefully', async () => {
      // Test multiple related operations where one failure doesn't break the system
      
      const projectResult = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Cascading Error Test',
        description: 'Testing cascading error scenarios'
      }));

      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;

      // Start a series of operations where some will fail
      const operations = [
        // Valid operation
        services.issueService.createIssue(TestDataBuilder.issue(project.id, {
          title: 'Valid Issue 1',
          type: 'Story'
        })),
        // Invalid operation
        services.issueService.createIssue(TestDataBuilder.issue('bad-project', {
          title: 'Invalid Issue',
          type: 'Story'
        })),
        // Valid operation  
        services.issueService.createIssue(TestDataBuilder.issue(project.id, {
          title: 'Valid Issue 2',
          type: 'Epic'
        })),
        // Valid operation
        services.workflowService.createWorkflow(TestDataBuilder.workflow(project.id, {
          name: 'Valid Workflow'
        })),
        // Invalid operation
        services.workflowService.createWorkflow(TestDataBuilder.workflow('bad-project', {
          name: 'Invalid Workflow'
        }))
      ];

      const results = await Promise.all(operations);

      // Check expected success/failure pattern
      expect(results[0].success).toBe(true);  // Valid issue 1
      expect(results[1].success).toBe(false); // Invalid issue
      expect(results[2].success).toBe(true);  // Valid issue 2  
      expect(results[3].success).toBe(true);  // Valid workflow
      expect(results[4].success).toBe(false); // Invalid workflow

      // Verify only valid operations persisted
      const projectIssues = await services.issueService.getProjectIssues(project.id);

      expect(projectIssues).toHaveLength(2);

      const issueNames = projectIssues.map(i => i.title).sort();

      expect(issueNames).toEqual(['Valid Issue 1', 'Valid Issue 2']);

      const projectWorkflow = await services.workflowService.getWorkflowByProject(project.id);

      expect(projectWorkflow).not.toBeNull();
      expect(projectWorkflow!.name).toBe('Valid Workflow');

      // Verify database consistency
      const finalCounts = dbVerification.getRecordCounts();

      expect(finalCounts.projects).toBe(1);
      expect(finalCounts.issues).toBe(2);
      expect(finalCounts.workflows).toBe(1);

      dbVerification.verifyForeignKeyConstraints();
    });
  });

  describe('Error Performance and Resource Management', () => {
    it('should handle error scenarios without performance degradation', async () => {
      // Test that error handling doesn't create performance bottlenecks
      
      const startTime = Date.now();

      // Create a mix of valid and invalid operations
      const operations = Array.from({ length: 20 }, async (_, i) => {
        if (i % 2 === 0) {
          // Valid operations
          const projectResult = await services.projectService.createProject(TestDataBuilder.project({
            name: `Valid Project ${i}`,
            description: `Description ${i}`
          }));

          if (projectResult.success) {
            await services.issueService.createIssue(TestDataBuilder.issue(projectResult.data!.id, {
              title: `Issue ${i}`,
              type: 'Story'
            }));
          }

          return projectResult;
        } else {
          // Invalid operations
          return services.issueService.createIssue(TestDataBuilder.issue('non-existent-project', {
            title: `Invalid Issue ${i}`,
            type: 'Story'
          }));
        }
      });

      const results = await Promise.all(operations);

      const totalTime = Date.now() - startTime;

      // Performance check - should complete quickly even with errors
      expect(totalTime).toBeLessThan(1000); // Should complete in < 1 second

      // Verify success/failure pattern
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(10); // Even-indexed operations (valid)
      expect(failureCount).toBe(10); // Odd-indexed operations (invalid)

      // Verify database state
      const finalCounts = dbVerification.getRecordCounts();

      expect(finalCounts.projects).toBe(10); // Only valid projects
      expect(finalCounts.issues).toBe(10);   // Only valid issues

      dbVerification.verifyForeignKeyConstraints();

      console.log(`✅ Error handling performance test completed: ${totalTime.toFixed(2)}ms for 20 operations (10 valid, 10 invalid)`);
    });

    it('should properly clean up resources after errors', async () => {
      // Verify that error conditions don't lead to resource leaks
      
      const initialCounts = dbVerification.getRecordCounts();

      expect(initialCounts.projects).toBe(0);
      expect(initialCounts.issues).toBe(0);
      expect(initialCounts.workflows).toBe(0);

      // Perform operations that will fail
      const failingOperations = Array.from({ length: 10 }, async (_, i) => {
        return services.issueService.createIssue(TestDataBuilder.issue('non-existent-project', {
          title: `Failing Issue ${i}`,
          type: 'Story'
        }));
      });

      const results = await Promise.all(failingOperations);

      // All should fail
      results.forEach(result => {
        expect(result.success).toBe(false);
      });

      // Verify no data was created (no resource leaks)
      const afterFailureCounts = dbVerification.getRecordCounts();

      expect(afterFailureCounts.projects).toBe(0);
      expect(afterFailureCounts.issues).toBe(0);
      expect(afterFailureCounts.workflows).toBe(0);

      // Verify the system can still perform valid operations
      const projectResult = await services.projectService.createProject(TestDataBuilder.project({
        name: 'Recovery Project',
        description: 'System should still work after failures'
      }));

      expect(projectResult.success).toBe(true);

      const finalCounts = dbVerification.getRecordCounts();

      expect(finalCounts.projects).toBe(1);

      dbVerification.verifyForeignKeyConstraints();
    });
  });
});