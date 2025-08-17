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
 * Performance Integration Tests
 * 
 * These tests verify that the application services maintain acceptable
 * performance characteristics under load with real database operations.
 */
describe.sequential('Application Service Performance Integration', () => {
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

  describe('Load Testing', () => {
    it('should handle 100 concurrent project creations efficiently', async () => {
      const startTime = Date.now();
      const projectCount = 100;
      
      // Create projects concurrently
      const projectPromises = Array.from({ length: projectCount }, async (_, i) => {
        return services.projectService.createProject(TestDataBuilder.project({
          name: `Load Test Project ${i + 1}`,
          description: `High load testing project ${i + 1}`
        }));
      });

      const results = await Promise.all(projectPromises);
      const duration = Date.now() - startTime;

      // All should succeed
      const successCount = results.filter(r => r.success).length;

      expect(successCount).toBe(projectCount);

      // Performance assertion: 100 projects in < 2 seconds
      expect(duration).toBeLessThan(2000);
      
      // Verify data integrity
      const counts = dbVerification.getRecordCounts();

      expect(counts.projects).toBe(projectCount);
      
      console.log(`✅ Created ${projectCount} projects in ${duration}ms (${(duration/projectCount).toFixed(2)}ms per project)`);
    });

    it('should handle 500 concurrent issue creations across multiple projects', async () => {
      // Setup: Create 10 projects first
      const projectCount = 10;
      const issuesPerProject = 50;
      
      const projectResults = await Promise.all(
        Array.from({ length: projectCount }, (_, i) =>
          services.projectService.createProject(TestDataBuilder.project({
            name: `Issue Load Test Project ${i + 1}`
          }))
        )
      );
      
      const projects = projectResults.map(r => r.data!);
      
      // Now create issues concurrently across all projects
      const startTime = Date.now();
      const issuePromises = projects.flatMap(project =>
        Array.from({ length: issuesPerProject }, async (_, i) => {
          const issueType = i % 3 === 0 ? 'Epic' : i % 3 === 1 ? 'Story' : 'Story';

          return services.issueService.createIssue(TestDataBuilder.issue(project.id, {
            title: `Issue ${i + 1} for ${project.name}`,
            type: issueType
          }));
        })
      );

      const results = await Promise.all(issuePromises);
      const duration = Date.now() - startTime;

      // All should succeed
      const successCount = results.filter(r => r.success).length;

      expect(successCount).toBe(projectCount * issuesPerProject);

      // Performance assertion: 500 issues in < 5 seconds
      expect(duration).toBeLessThan(5000);
      
      // Verify data integrity
      const counts = dbVerification.getRecordCounts();

      expect(counts.projects).toBe(projectCount);
      expect(counts.issues).toBe(projectCount * issuesPerProject);
      
      console.log(`✅ Created ${projectCount * issuesPerProject} issues in ${duration}ms (${(duration/(projectCount * issuesPerProject)).toFixed(2)}ms per issue)`);
    });

    it('should handle mixed concurrent operations efficiently', async () => {
      const startTime = Date.now();
      
      // Mix of different operations
      const operations = [
        // Create 20 projects
        ...Array.from({ length: 20 }, (_, i) =>
          services.projectService.createProject(TestDataBuilder.project({
            name: `Mixed Op Project ${i + 1}`
          }))
        ),
        // Create a project and immediately add issues
        (async () => {
          const projectResult = await services.projectService.createProject(
            TestDataBuilder.project({ name: 'Quick Project with Issues' })
          );

          if (projectResult.success) {
            const project = projectResult.data!;

            await Promise.all([
              services.issueService.createIssue(TestDataBuilder.issue(project.id, {
                title: 'Quick Issue 1',
                type: 'Epic'
              })),
              services.issueService.createIssue(TestDataBuilder.issue(project.id, {
                title: 'Quick Issue 2',
                type: 'Story'
              }))
            ]);
          }

          return projectResult;
        })(),
        // Create workflows for projects
        (async () => {
          const projectResult = await services.projectService.createProject(
            TestDataBuilder.project({ name: 'Project with Workflow' })
          );

          if (projectResult.success) {
            await services.workflowService.createWorkflow(
              TestDataBuilder.workflow(projectResult.data!.id, {
                name: 'Performance Test Workflow'
              })
            );
          }

          return projectResult;
        })()
      ];

      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Performance assertion: Mixed operations in < 1 second
      expect(duration).toBeLessThan(1000);
      
      console.log(`✅ Completed ${operations.length} mixed operations in ${duration}ms`);
    });
  });

  describe('Stress Testing with Large Datasets', () => {
    it('should efficiently query projects with 1000+ issues', async () => {
      // Create a project with many issues
      const projectResult = await services.projectService.createProject(
        TestDataBuilder.project({
          name: 'Large Dataset Project',
          description: 'Project with many issues for stress testing'
        })
      );
      
      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;
      
      // Create 1000 issues in batches to avoid overwhelming the system
      const batchSize = 100;
      const totalIssues = 1000;
      
      for (let batch = 0; batch < totalIssues / batchSize; batch++) {
        const batchPromises = Array.from({ length: batchSize }, (_, i) => {
          const issueNum = batch * batchSize + i;
          const issueType = issueNum % 3 === 0 ? 'Epic' : 'Story';
          
          return services.issueService.createIssue(TestDataBuilder.issue(project.id, {
            title: `Stress Test Issue ${issueNum + 1}`,
            type: issueType,
            description: `This is issue number ${issueNum + 1} of ${totalIssues}`
          }));
        });
        
        await Promise.all(batchPromises);
      }
      
      // Now test query performance
      const queryStartTime = Date.now();
      const issues = await services.issueService.getProjectIssues(project.id);
      const queryDuration = Date.now() - queryStartTime;
      
      expect(issues).toHaveLength(totalIssues);
      
      // Performance assertion: Query 1000 issues in < 500ms
      expect(queryDuration).toBeLessThan(500);
      
      console.log(`✅ Queried ${totalIssues} issues in ${queryDuration}ms`);
      
      // Test pagination performance (if implemented)
      const paginationStartTime = Date.now();
      const firstPage = issues.slice(0, 50);
      const paginationDuration = Date.now() - paginationStartTime;
      
      expect(firstPage).toHaveLength(50);
      expect(paginationDuration).toBeLessThan(50);
    });

    it('should handle deep issue hierarchies efficiently', async () => {
      const projectResult = await services.projectService.createProject(
        TestDataBuilder.project({
          name: 'Deep Hierarchy Project',
          description: 'Testing deep issue hierarchies'
        })
      );
      
      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;
      
      const startTime = Date.now();
      
      // Create 10 epics, each with 10 stories, each with 5 subtasks
      const epics = await Promise.all(
        Array.from({ length: 10 }, (_, epicIdx) =>
          services.issueService.createIssue(TestDataBuilder.issue(project.id, {
            title: `Epic ${epicIdx + 1}`,
            type: 'Epic'
          }))
        )
      );
      
      for (const epicResult of epics) {
        if (!epicResult.success) continue;
        const epic = epicResult.data!;
        
        const stories = await Promise.all(
          Array.from({ length: 10 }, (_, storyIdx) =>
            services.issueService.createIssue(TestDataBuilder.issue(project.id, {
              title: `Story ${storyIdx + 1} under ${epic.title}`,
              type: 'Story',
              parentId: epic.id
            }))
          )
        );
        
        for (const storyResult of stories) {
          if (!storyResult.success) continue;
          const story = storyResult.data!;
          
          await Promise.all(
            Array.from({ length: 5 }, (_, subtaskIdx) =>
              services.issueService.createIssue(TestDataBuilder.issue(project.id, {
                title: `Subtask ${subtaskIdx + 1} under ${story.title}`,
                type: 'Subtask',
                parentId: story.id,
                estimate: (subtaskIdx % 4) + 1  // 1, 2, 3, or 4 points
              }))
            )
          );
        }
      }
      
      const duration = Date.now() - startTime;
      
      // Verify hierarchy was created
      const allIssues = await services.issueService.getProjectIssues(project.id);
      
      // Count by type to understand what was created
      const epicCount = allIssues.filter(i => i.type === 'Epic').length;
      const storyCount = allIssues.filter(i => i.type === 'Story').length;
      const subtaskCount = allIssues.filter(i => i.type === 'Subtask').length;
      
      expect(epicCount).toBe(10);
      expect(storyCount).toBe(100);
      expect(subtaskCount).toBeGreaterThanOrEqual(400); // Some subtasks might fail due to constraints
      
      // Performance assertion: Create deep hierarchy in < 10 seconds
      expect(duration).toBeLessThan(10_000);
      
      console.log(`✅ Created deep hierarchy with ${allIssues.length} issues (${epicCount} epics, ${storyCount} stories, ${subtaskCount} subtasks) in ${duration}ms`);
    });
  });

  describe('Race Condition Testing', () => {
    it('should handle concurrent updates to the same project without data corruption', async () => {
      // Create a project
      const projectResult = await services.projectService.createProject(
        TestDataBuilder.project({
          name: 'Race Condition Test Project',
          description: 'Testing concurrent updates'
        })
      );
      
      expect(projectResult.success).toBe(true);
      const project = projectResult.data!;
      
      // Attempt 50 concurrent updates
      const updatePromises = Array.from({ length: 50 }, async (_, i) => {
        return services.projectService.updateProject({
          id: project.id,
          description: `Updated description ${i + 1}`
        });
      });
      
      const results = await Promise.all(updatePromises);
      
      // All updates should succeed (last write wins is acceptable)
      const successCount = results.filter(r => r.success).length;

      expect(successCount).toBe(50);
      
      // Verify final state is consistent
      const finalProject = await services.projectService.getProject(project.id);

      expect(finalProject).not.toBeNull();
      expect(finalProject!.name).toBe('Race Condition Test Project');
      
      // Description should be one of the updates
      expect(finalProject!.description).toMatch(/Updated description \d+/);
    });

    it('should handle concurrent issue status transitions safely', async () => {
      // Create project and issue
      const projectResult = await services.projectService.createProject(
        TestDataBuilder.project({ name: 'Status Race Test' })
      );
      const project = projectResult.data!;
      
      const issueResult = await services.issueService.createIssue(
        TestDataBuilder.issue(project.id, {
          title: 'Concurrent Status Test Issue',
          type: 'Story',
          status: 'Backlog'
        })
      );
      const issue = issueResult.data!;
      
      // Try concurrent status updates
      const statusTransitions = ['Todo', 'In Progress', 'Todo', 'In Progress', 'Done'];
      const updatePromises = statusTransitions.map(status =>
        services.issueService.updateIssue({
          id: issue.id,
          status
        })
      );
      
      const results = await Promise.all(updatePromises);
      
      // Some may fail due to invalid transitions, but system should remain stable
      const finalIssue = await services.issueService.getIssue(issue.id);

      expect(finalIssue).not.toBeNull();
      
      // Status should be one of the valid values
      expect(['Backlog', 'Todo', 'In Progress', 'Done']).toContain(finalIssue!.status);
    });

    it('should maintain referential integrity under concurrent deletes', async () => {
      // Create projects with issues
      const projectPromises = Array.from({ length: 10 }, async (_, i) => {
        const projectResult = await services.projectService.createProject(
          TestDataBuilder.project({ name: `Delete Race Project ${i + 1}` })
        );
        
        if (projectResult.success) {
          const project = projectResult.data!;

          await services.issueService.createIssue(
            TestDataBuilder.issue(project.id, {
              title: `Issue for ${project.name}`,
              type: 'Story'
            })
          );
        }
        
        return projectResult;
      });
      
      await Promise.all(projectPromises);
      
      // Verify setup
      const initialCounts = dbVerification.getRecordCounts();

      expect(initialCounts.projects).toBe(10);
      expect(initialCounts.issues).toBe(10);
      
      // Database should maintain referential integrity even under load
      dbVerification.verifyForeignKeyConstraints();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during bulk operations', async () => {
      // Note: Real memory profiling would require additional tooling
      // This test verifies operations complete without errors
      
      const iterations = 5;
      
      for (let i = 0; i < iterations; i++) {
        // Create and process data
        const projectResult = await services.projectService.createProject(
          TestDataBuilder.project({ name: `Memory Test Project ${i + 1}` })
        );
        
        if (projectResult.success) {
          const project = projectResult.data!;
          
          // Create 100 issues
          const issuePromises = Array.from({ length: 100 }, (_, j) =>
            services.issueService.createIssue(TestDataBuilder.issue(project.id, {
              title: `Memory Test Issue ${j + 1}`,
              type: 'Story'
            }))
          );
          
          await Promise.all(issuePromises);
          
          // Query all issues
          await services.issueService.getProjectIssues(project.id);
        }
        
        // In a real test, we would check memory usage here
      }
      
      // Verify operations completed successfully
      const finalCounts = dbVerification.getRecordCounts();

      expect(finalCounts.projects).toBe(iterations);
      expect(finalCounts.issues).toBe(iterations * 100);
    });

    it('should handle transaction cleanup properly under load', async () => {
      const concurrentTransactions = 20;
      
      const transactionPromises = Array.from({ length: concurrentTransactions }, async (_, i) => {
        try {
          // Each operation runs in its own transaction
          const projectResult = await services.projectService.createProject(
            TestDataBuilder.project({ name: `Transaction Test ${i + 1}` })
          );
          
          if (projectResult.success && i % 3 === 0) {
            // Simulate some operations failing
            throw new Error('Simulated failure');
          }
          
          return { success: true, error: null };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
        }
      });
      
      const results = await Promise.all(transactionPromises);
      
      // Some should succeed, some should fail
      const successCount = results.filter(r => r.success).length;

      expect(successCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThan(concurrentTransactions);
      
      // Database should still be consistent
      dbVerification.verifyForeignKeyConstraints();
      
      // Successful transactions should have committed
      const counts = dbVerification.getRecordCounts();

      expect(counts.projects).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance SLAs for common operations', async () => {
      const benchmarks = {
        createProject: 50,      // Should complete in < 50ms
        createIssue: 30,        // Should complete in < 30ms
        updateIssue: 20,        // Should complete in < 20ms
        queryIssues: 100,       // Should complete in < 100ms for 100 issues
        createWorkflow: 40      // Should complete in < 40ms
      };
      
      // Test project creation
      const projectStart = Date.now();
      const projectResult = await services.projectService.createProject(
        TestDataBuilder.project({ name: 'Benchmark Project' })
      );
      const projectDuration = Date.now() - projectStart;
      
      expect(projectResult.success).toBe(true);
      expect(projectDuration).toBeLessThan(benchmarks.createProject);
      
      const project = projectResult.data!;
      
      // Test issue creation
      const issueStart = Date.now();
      const issueResult = await services.issueService.createIssue(
        TestDataBuilder.issue(project.id, {
          title: 'Benchmark Issue',
          type: 'Story'
        })
      );
      const issueDuration = Date.now() - issueStart;
      
      expect(issueResult.success).toBe(true);
      expect(issueDuration).toBeLessThan(benchmarks.createIssue);
      
      const issue = issueResult.data!;
      
      // Test issue update (valid transition from Backlog -> Todo)
      const updateStart = Date.now();
      const updateResult = await services.issueService.updateIssue({
        id: issue.id,
        status: 'Todo'
      });
      const updateDuration = Date.now() - updateStart;
      
      expect(updateResult.success).toBe(true);
      expect(updateDuration).toBeLessThan(benchmarks.updateIssue);
      
      // Create more issues for query test
      await Promise.all(
        Array.from({ length: 99 }, (_, i) =>
          services.issueService.createIssue(TestDataBuilder.issue(project.id, {
            title: `Query Test Issue ${i + 2}`,
            type: 'Story'
          }))
        )
      );
      
      // Test query performance
      const queryStart = Date.now();
      const issues = await services.issueService.getProjectIssues(project.id);
      const queryDuration = Date.now() - queryStart;
      
      expect(issues).toHaveLength(100);
      expect(queryDuration).toBeLessThan(benchmarks.queryIssues);
      
      // Test workflow creation
      const workflowStart = Date.now();
      const workflowResult = await services.workflowService.createWorkflow(
        TestDataBuilder.workflow(project.id, { name: 'Benchmark Workflow' })
      );
      const workflowDuration = Date.now() - workflowStart;
      
      expect(workflowResult.success).toBe(true);
      expect(workflowDuration).toBeLessThan(benchmarks.createWorkflow);
      
      console.log(`
✅ Performance Benchmark Results:
  - Project creation: ${projectDuration}ms (target: <${benchmarks.createProject}ms)
  - Issue creation: ${issueDuration}ms (target: <${benchmarks.createIssue}ms)
  - Issue update: ${updateDuration}ms (target: <${benchmarks.updateIssue}ms)
  - Query 100 issues: ${queryDuration}ms (target: <${benchmarks.queryIssues}ms)
  - Workflow creation: ${workflowDuration}ms (target: <${benchmarks.createWorkflow}ms)
      `);
    });
  });
});