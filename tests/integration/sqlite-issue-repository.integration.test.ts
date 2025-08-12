import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { migrations } from '../../src/database/migrations.js';
import { Issue } from '../../src/domain/entities/issue.js';
import { RepositoryError } from '../../src/domain/errors/repository-errors.js';
import { IssueId } from '../../src/domain/value-objects/issue-id.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { SqliteIssueRepository } from '../../src/infrastructure/database/repositories/sqlite-issue-repository.js';

describe.sequential('SqliteIssueRepository Integration Tests', () => {
  let db: Database.Database;
  let repository: SqliteIssueRepository;

  beforeEach(() => {
    // Create in-memory database for each test
    db = new Database(':memory:');
    
    // Enable foreign key constraints
    db.exec('PRAGMA foreign_keys = ON');
    
    // Run migrations to set up schema
    for (const migration of migrations) {
      db.exec(migration.sql);
    }
    
    repository = new SqliteIssueRepository(db);
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
  });

  describe('save and findById', () => {
    it('should save and retrieve an issue', async () => {
      const issue = Issue.create('Test Issue', 'A test issue description', 'Story');
      
      await repository.save(issue);
      const retrieved = await repository.findById(issue.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id.value).toBe(issue.id.value);
      expect(retrieved!.title).toBe('Test Issue');
      expect(retrieved!.description).toBe('A test issue description');
      expect(retrieved!.type).toBe('Story');
      expect(retrieved!.status).toBe('Backlog');
    });

    it('should save and retrieve an issue with estimate', async () => {
      const issue = Issue.create('Story with Estimate', 'Description', 'Story');

      issue.setEstimate(5);
      
      await repository.save(issue);
      const retrieved = await repository.findById(issue.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.estimate).toBe(5);
    });

    it('should update an existing issue', async () => {
      const issue = Issue.create('Original Title', 'Original description', 'Story');

      await repository.save(issue);
      
      // Modify the issue
      issue.updateTitle('Updated Title');
      issue.updateDescription('Updated description');
      issue.updateStatus('Todo');  // Valid transition from Backlog to Todo
      issue.setEstimate(8);
      
      await repository.save(issue);
      
      const retrieved = await repository.findById(issue.id);

      expect(retrieved!.title).toBe('Updated Title');
      expect(retrieved!.description).toBe('Updated description');
      expect(retrieved!.status).toBe('Todo');
      expect(retrieved!.estimate).toBe(8);
    });

    it('should return null for non-existent issue', async () => {
      const nonExistentId = IssueId.generate();
      const result = await repository.findById(nonExistentId);
      
      expect(result).toBeNull();
    });
  });

  describe('Hierarchy Management', () => {
    it('should save and retrieve parent-child relationships', async () => {
      const parent = Issue.create('Epic', 'Epic description', 'Epic');
      const child1 = Issue.create('Story 1', 'Story 1 description', 'Story');
      const child2 = Issue.create('Story 2', 'Story 2 description', 'Story');
      
      // Save all issues first
      await repository.save(parent);
      await repository.save(child1);
      await repository.save(child2);
      
      // Set up relationships
      parent.addChild(child1.id);
      parent.addChild(child2.id);
      child1.setParent(parent.id);
      child2.setParent(parent.id);
      
      // Save relationships
      await repository.save(parent);
      await repository.save(child1);
      await repository.save(child2);
      
      // Retrieve and verify
      const retrievedParent = await repository.findById(parent.id);
      const retrievedChild1 = await repository.findById(child1.id);
      
      expect(retrievedParent).not.toBeNull();
      expect(retrievedParent!.childIds).toHaveLength(2);
      expect(retrievedParent!.hasChild(child1.id)).toBe(true);
      expect(retrievedParent!.hasChild(child2.id)).toBe(true);
      
      expect(retrievedChild1).not.toBeNull();
      expect(retrievedChild1!.parentId).toBeDefined();
      expect(retrievedChild1!.parentId!.equals(parent.id)).toBe(true);
    });

    it('should handle three-level hierarchy (Epic -> Story -> Subtask)', async () => {
      const epic = Issue.create('Epic', 'Epic description', 'Epic');
      const story = Issue.create('Story', 'Story description', 'Story');
      const subtask1 = Issue.create('Subtask 1', 'Subtask 1 description', 'Subtask');
      const subtask2 = Issue.create('Subtask 2', 'Subtask 2 description', 'Subtask');
      
      // Save all issues
      await repository.save(epic);
      await repository.save(story);
      await repository.save(subtask1);
      await repository.save(subtask2);
      
      // Set up hierarchy
      epic.addChild(story.id);
      story.setParent(epic.id);
      story.addChild(subtask1.id);
      story.addChild(subtask2.id);
      subtask1.setParent(story.id);
      subtask2.setParent(story.id);
      
      // Save relationships
      await repository.save(epic);
      await repository.save(story);
      await repository.save(subtask1);
      await repository.save(subtask2);
      
      // Verify hierarchy
      const retrievedEpic = await repository.findById(epic.id);
      const retrievedStory = await repository.findById(story.id);
      const retrievedSubtask1 = await repository.findById(subtask1.id);
      
      expect(retrievedEpic!.childIds).toHaveLength(1);
      expect(retrievedEpic!.hasChild(story.id)).toBe(true);
      
      expect(retrievedStory!.parentId!.equals(epic.id)).toBe(true);
      expect(retrievedStory!.childIds).toHaveLength(2);
      expect(retrievedStory!.hasChild(subtask1.id)).toBe(true);
      expect(retrievedStory!.hasChild(subtask2.id)).toBe(true);
      
      expect(retrievedSubtask1!.parentId!.equals(story.id)).toBe(true);
      expect(retrievedSubtask1!.childIds).toHaveLength(0);
    });

    it('should update parent-child relationships', async () => {
      const parent1 = Issue.create('Parent 1', 'Description', 'Story');
      const parent2 = Issue.create('Parent 2', 'Description', 'Story');
      const child = Issue.create('Child', 'Description', 'Subtask');
      
      // Initial setup
      await repository.save(parent1);
      await repository.save(parent2);
      await repository.save(child);
      
      // Set initial parent
      parent1.addChild(child.id);
      child.setParent(parent1.id);
      await repository.save(parent1);
      await repository.save(child);
      
      // Change parent
      parent1.removeChild(child.id);
      parent2.addChild(child.id);
      child.setParent(parent2.id);
      await repository.save(parent1);
      await repository.save(parent2);
      await repository.save(child);
      
      // Verify the change
      const retrievedParent1 = await repository.findById(parent1.id);
      const retrievedParent2 = await repository.findById(parent2.id);
      const retrievedChild = await repository.findById(child.id);
      
      expect(retrievedParent1!.hasChild(child.id)).toBe(false);
      expect(retrievedParent2!.hasChild(child.id)).toBe(true);
      expect(retrievedChild!.parentId!.equals(parent2.id)).toBe(true);
    });
  });

  describe('Dependency Management', () => {
    it('should save and retrieve issue dependencies', async () => {
      const issue1 = Issue.create('Issue 1', 'Description', 'Story');
      const issue2 = Issue.create('Issue 2', 'Description', 'Story');
      const issue3 = Issue.create('Issue 3', 'Description', 'Story');
      
      // Save all issues
      await repository.save(issue1);
      await repository.save(issue2);
      await repository.save(issue3);
      
      // Set up dependencies: issue1 depends on issue2 and issue3
      issue1.addDependency(issue2.id);
      issue1.addDependency(issue3.id);
      await repository.save(issue1);
      
      // Retrieve and verify
      const retrieved = await repository.findById(issue1.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.dependencies).toHaveLength(2);
      expect(retrieved!.hasDependency(issue2.id)).toBe(true);
      expect(retrieved!.hasDependency(issue3.id)).toBe(true);
      expect(retrieved!.isBlocked()).toBe(true);
    });

    it('should update dependencies', async () => {
      const issue = Issue.create('Main Issue', 'Description', 'Story');
      const dep1 = Issue.create('Dependency 1', 'Description', 'Story');
      const dep2 = Issue.create('Dependency 2', 'Description', 'Story');
      const dep3 = Issue.create('Dependency 3', 'Description', 'Story');
      
      // Save all issues
      await repository.save(issue);
      await repository.save(dep1);
      await repository.save(dep2);
      await repository.save(dep3);
      
      // Initial dependencies
      issue.addDependency(dep1.id);
      issue.addDependency(dep2.id);
      await repository.save(issue);
      
      // Update: remove dep1, add dep3
      issue.removeDependency(dep1.id);
      issue.addDependency(dep3.id);
      await repository.save(issue);
      
      // Verify
      const retrieved = await repository.findById(issue.id);

      expect(retrieved!.dependencies).toHaveLength(2);
      expect(retrieved!.hasDependency(dep1.id)).toBe(false);
      expect(retrieved!.hasDependency(dep2.id)).toBe(true);
      expect(retrieved!.hasDependency(dep3.id)).toBe(true);
    });

    it('should handle clearing all dependencies', async () => {
      const issue = Issue.create('Issue', 'Description', 'Story');
      const dep1 = Issue.create('Dep 1', 'Description', 'Story');
      const dep2 = Issue.create('Dep 2', 'Description', 'Story');
      
      await repository.save(issue);
      await repository.save(dep1);
      await repository.save(dep2);
      
      // Add dependencies
      issue.addDependency(dep1.id);
      issue.addDependency(dep2.id);
      await repository.save(issue);
      
      // Clear all dependencies
      issue.removeDependency(dep1.id);
      issue.removeDependency(dep2.id);
      await repository.save(issue);
      
      const retrieved = await repository.findById(issue.id);

      expect(retrieved!.dependencies).toHaveLength(0);
      expect(retrieved!.isBlocked()).toBe(false);
    });
  });

  describe('findByProjectId', () => {
    it('should return empty array when no issues exist for project', async () => {
      const projectId = ProjectId.generate();
      const result = await repository.findByProjectId(projectId);
      
      expect(result).toEqual([]);
    });

    it('should return all issues for a project', async () => {
      const projectId = ProjectId.generate();
      
      // Create a project first
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId.value, 'Test Project', 'Description', 'Planning', Date.now(), Date.now());
      
      // Create issues
      const issue1 = Issue.create('Issue 1', 'Description 1', 'Story');
      const issue2 = Issue.create('Issue 2', 'Description 2', 'Story');
      const issue3 = Issue.create('Issue 3', 'Description 3', 'Story');
      
      await repository.save(issue1);
      await repository.save(issue2);
      await repository.save(issue3);
      
      // Link issues to project
      db.prepare('INSERT INTO project_issues (project_id, issue_id) VALUES (?, ?)')
        .run(projectId.value, issue1.id.value);
      db.prepare('INSERT INTO project_issues (project_id, issue_id) VALUES (?, ?)')
        .run(projectId.value, issue2.id.value);
      db.prepare('INSERT INTO project_issues (project_id, issue_id) VALUES (?, ?)')
        .run(projectId.value, issue3.id.value);
      
      const result = await repository.findByProjectId(projectId);
      
      expect(result).toHaveLength(3);
      const titles = result.map(i => i.title).sort();

      expect(titles).toEqual(['Issue 1', 'Issue 2', 'Issue 3']);
    });

    it('should include hierarchy and dependencies for project issues', async () => {
      const projectId = ProjectId.generate();
      
      // Create project
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId.value, 'Test Project', 'Description', 'Planning', Date.now(), Date.now());
      
      // Create issues with hierarchy
      const epic = Issue.create('Epic', 'Epic desc', 'Epic');
      const story = Issue.create('Story', 'Story desc', 'Story');
      const dependency = Issue.create('Dependency', 'Dep desc', 'Story');
      
      await repository.save(epic);
      await repository.save(story);
      await repository.save(dependency);
      
      // Set up relationships
      epic.addChild(story.id);
      story.setParent(epic.id);
      story.addDependency(dependency.id);
      
      await repository.save(epic);
      await repository.save(story);
      
      // Link to project
      db.prepare('INSERT INTO project_issues (project_id, issue_id) VALUES (?, ?)')
        .run(projectId.value, epic.id.value);
      db.prepare('INSERT INTO project_issues (project_id, issue_id) VALUES (?, ?)')
        .run(projectId.value, story.id.value);
      db.prepare('INSERT INTO project_issues (project_id, issue_id) VALUES (?, ?)')
        .run(projectId.value, dependency.id.value);
      
      const result = await repository.findByProjectId(projectId);
      
      expect(result).toHaveLength(3);
      
      const retrievedEpic = result.find(i => i.type === 'Epic');
      const retrievedStory = result.find(i => i.title === 'Story');
      
      expect(retrievedEpic!.hasChild(story.id)).toBe(true);
      expect(retrievedStory!.parentId!.equals(epic.id)).toBe(true);
      expect(retrievedStory!.hasDependency(dependency.id)).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true for existing issue', async () => {
      const issue = Issue.create('Existing', 'Description', 'Story');

      await repository.save(issue);
      
      const exists = await repository.exists(issue.id);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent issue', async () => {
      const nonExistentId = IssueId.generate();
      const exists = await repository.exists(nonExistentId);
      
      expect(exists).toBe(false);
    });
  });

  describe('Transaction behavior', () => {
    it('should maintain consistency when saving issue with relationships', async () => {
      const parent = Issue.create('Parent', 'Description', 'Epic');
      const child = Issue.create('Child', 'Description', 'Story');
      const dependency = Issue.create('Dependency', 'Description', 'Story');
      
      // Save all issues first
      await repository.save(parent);
      await repository.save(child);
      await repository.save(dependency);
      
      // Set up complex relationships
      parent.addChild(child.id);
      child.setParent(parent.id);
      child.addDependency(dependency.id);
      
      // Save all in proper order
      await repository.save(parent);
      await repository.save(child);
      
      // Verify all relationships are preserved
      const retrievedChild = await repository.findById(child.id);

      expect(retrievedChild!.parentId!.equals(parent.id)).toBe(true);
      expect(retrievedChild!.hasDependency(dependency.id)).toBe(true);
    });

    it('should rollback on error during save', async () => {
      // Create a separate database instance for this test
      const testDb = new Database(':memory:');

      testDb.exec('PRAGMA foreign_keys = ON');
      for (const migration of migrations) {
        testDb.exec(migration.sql);
      }
      const testRepo = new SqliteIssueRepository(testDb);
      
      const issue = Issue.create('Issue', 'Description', 'Story');

      await testRepo.save(issue);
      
      // Close database to cause error
      testDb.close();
      
      // Try to save, which should fail
      const anotherIssue = Issue.create('Another', 'Description', 'Story');

      await expect(testRepo.save(anotherIssue)).rejects.toThrow(RepositoryError);
    });
  });

  describe('Edge cases', () => {
    it('should handle issues with no description', async () => {
      const issue = Issue.create('No Description', '', 'Story');

      await repository.save(issue);
      
      const retrieved = await repository.findById(issue.id);

      expect(retrieved!.description).toBe('');
    });

    it('should handle issues with special characters in title', async () => {
      const specialTitle = "Issue's \"Special\" Title & More <tags>";
      const issue = Issue.create(specialTitle, 'Description', 'Story');

      await repository.save(issue);
      
      const retrieved = await repository.findById(issue.id);

      expect(retrieved!.title).toBe(specialTitle);
    });

    it('should preserve exact timestamps', async () => {
      const issue = Issue.create('Timestamp Test', 'Description', 'Story');
      const originalCreatedAt = issue.createdAt;
      const originalUpdatedAt = issue.updatedAt;
      
      await repository.save(issue);
      const retrieved = await repository.findById(issue.id);
      
      // Timestamps should be preserved (within second precision due to Unix timestamp conversion)
      expect(Math.abs(retrieved!.createdAt.getTime() - originalCreatedAt.getTime())).toBeLessThan(1000);
      expect(Math.abs(retrieved!.updatedAt.getTime() - originalUpdatedAt.getTime())).toBeLessThan(1000);
    });

    it('should handle rapid updates to the same issue', async () => {
      const issue = Issue.create('Rapid Updates', 'Initial', 'Story');

      await repository.save(issue);
      
      // Perform rapid updates
      for (let i = 0; i < 10; i++) {
        issue.updateDescription(`Update ${i}`);
        await repository.save(issue);
      }
      
      const final = await repository.findById(issue.id);

      expect(final!.description).toBe('Update 9');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle a complete project hierarchy', async () => {
      const projectId = ProjectId.generate();
      
      // Create project
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId.value, 'Complex Project', 'Description', 'Active', Date.now(), Date.now());
      
      // Create a complex hierarchy
      const epic1 = Issue.create('Epic 1', 'First epic', 'Epic');
      const epic2 = Issue.create('Epic 2', 'Second epic', 'Epic');
      const story1 = Issue.create('Story 1', 'Under epic 1', 'Story');
      const story2 = Issue.create('Story 2', 'Under epic 1', 'Story');
      const story3 = Issue.create('Story 3', 'Under epic 2', 'Story');
      const subtask1 = Issue.create('Subtask 1', 'Under story 1', 'Subtask');
      const subtask2 = Issue.create('Subtask 2', 'Under story 1', 'Subtask');
      
      // Save all issues
      await repository.save(epic1);
      await repository.save(epic2);
      await repository.save(story1);
      await repository.save(story2);
      await repository.save(story3);
      await repository.save(subtask1);
      await repository.save(subtask2);
      
      // Set up hierarchy
      epic1.addChild(story1.id);
      epic1.addChild(story2.id);
      epic2.addChild(story3.id);
      story1.setParent(epic1.id);
      story2.setParent(epic1.id);
      story3.setParent(epic2.id);
      story1.addChild(subtask1.id);
      story1.addChild(subtask2.id);
      subtask1.setParent(story1.id);
      subtask2.setParent(story1.id);
      
      // Set up some dependencies
      story2.addDependency(story1.id);
      story3.addDependency(story2.id);
      
      // Save all relationships
      await repository.save(epic1);
      await repository.save(epic2);
      await repository.save(story1);
      await repository.save(story2);
      await repository.save(story3);
      await repository.save(subtask1);
      await repository.save(subtask2);
      
      // Link all to project
      const issues = [epic1, epic2, story1, story2, story3, subtask1, subtask2];

      for (const issue of issues) {
        db.prepare('INSERT INTO project_issues (project_id, issue_id) VALUES (?, ?)')
          .run(projectId.value, issue.id.value);
      }
      
      // Retrieve all project issues
      const projectIssues = await repository.findByProjectId(projectId);
      
      expect(projectIssues).toHaveLength(7);
      
      // Verify hierarchy is preserved
      const retrievedEpic1 = projectIssues.find(i => i.title === 'Epic 1');
      const retrievedStory1 = projectIssues.find(i => i.title === 'Story 1');
      const retrievedStory2 = projectIssues.find(i => i.title === 'Story 2');
      
      expect(retrievedEpic1!.childIds).toHaveLength(2);
      expect(retrievedStory1!.childIds).toHaveLength(2);
      expect(retrievedStory2!.hasDependency(story1.id)).toBe(true);
    });
  });

  describe('saveToProject', () => {
    it('should save issue and associate with project in one transaction', async () => {
      const projectId = ProjectId.generate();
      
      // Create project first
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        projectId.value,
        'Test Project',
        'Test Description',
        'Planning',
        Date.now(),
        Date.now()
      );
      
      const issue = Issue.create('New Issue', 'Created with project association', 'Story');
      
      await repository.saveToProject(issue, projectId);
      
      // Verify issue was saved
      const savedIssue = await repository.findById(issue.id);

      expect(savedIssue).not.toBeNull();
      expect(savedIssue!.title).toBe('New Issue');
      
      // Verify project association was created
      const projectIssues = await repository.findByProjectId(projectId);

      expect(projectIssues).toHaveLength(1);
      expect(projectIssues[0]!.id.value).toBe(issue.id.value);
    });

    it('should update existing issue and add project association', async () => {
      const projectId = ProjectId.generate();
      
      // Create project
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        projectId.value,
        'Test Project',
        'Test Description',
        'Planning',
        Date.now(),
        Date.now()
      );
      
      // Create and save issue first without project association
      const issue = Issue.create('Existing Issue', 'Will be associated', 'Story');

      await repository.save(issue);
      
      // Update and associate with project
      issue.updateTitle('Updated Issue');
      await repository.saveToProject(issue, projectId);
      
      // Verify update
      const savedIssue = await repository.findById(issue.id);

      expect(savedIssue!.title).toBe('Updated Issue');
      
      // Verify association
      const projectIssues = await repository.findByProjectId(projectId);

      expect(projectIssues).toHaveLength(1);
    });

    it('should handle multiple issues for same project', async () => {
      const projectId = ProjectId.generate();
      
      // Create project
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        projectId.value,
        'Multi Issue Project',
        'Test Description',
        'Planning',
        Date.now(),
        Date.now()
      );
      
      const issue1 = Issue.create('Issue 1', 'First issue', 'Story');
      const issue2 = Issue.create('Issue 2', 'Second issue', 'Story');
      const issue3 = Issue.create('Issue 3', 'Third issue', 'Story');
      
      await repository.saveToProject(issue1, projectId);
      await repository.saveToProject(issue2, projectId);
      await repository.saveToProject(issue3, projectId);
      
      const projectIssues = await repository.findByProjectId(projectId);

      expect(projectIssues).toHaveLength(3);
      
      const titles = projectIssues.map(i => i.title);

      expect(titles).toContain('Issue 1');
      expect(titles).toContain('Issue 2');
      expect(titles).toContain('Issue 3');
    });

    it('should fail if project does not exist', async () => {
      const nonExistentProjectId = ProjectId.generate();
      const issue = Issue.create('Orphan Issue', 'No project', 'Story');
      
      await expect(repository.saveToProject(issue, nonExistentProjectId))
        .rejects.toThrow(RepositoryError);
    });

    it('should provide meaningful error message for foreign key constraint failures', async () => {
      const nonExistentProjectId = ProjectId.generate();
      const issue = Issue.create('Orphan Issue', 'No project', 'Story');
      
      try {
        await repository.saveToProject(issue, nonExistentProjectId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryError);
        expect((error as RepositoryError).message).toContain('project does not exist');
      }
    });

    it('should handle re-association to same project', async () => {
      const projectId = ProjectId.generate();
      
      // Create project
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        projectId.value,
        'Test Project',
        'Test Description',
        'Planning',
        Date.now(),
        Date.now()
      );
      
      const issue = Issue.create('Issue', 'Description', 'Story');
      
      // Save to project twice
      await repository.saveToProject(issue, projectId);
      await repository.saveToProject(issue, projectId);
      
      // Should only have one association
      const projectIssues = await repository.findByProjectId(projectId);

      expect(projectIssues).toHaveLength(1);
    });

    it('should preserve projectId when reconstructing issue from database', async () => {
      const projectId = ProjectId.generate();
      
      // Create project
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        projectId.value,
        'Test Project',
        'Test Description',
        'Planning',
        Date.now(),
        Date.now()
      );
      
      // Create issue with projectId
      const issue = Issue.create('Issue with Project', 'Description', 'Story', undefined, projectId);
      
      // Save to project
      await repository.saveToProject(issue, projectId);
      
      // Retrieve issue by ID
      const retrievedIssue = await repository.findById(issue.id);
      
      expect(retrievedIssue).not.toBeNull();
      expect(retrievedIssue!.projectId).toBeDefined();
      expect(retrievedIssue!.projectId!.value).toBe(projectId.value);
      
      // Also verify when retrieved via findByProjectId
      const projectIssues = await repository.findByProjectId(projectId);
      
      expect(projectIssues).toHaveLength(1);
      expect(projectIssues[0]!.projectId).toBeDefined();
      expect(projectIssues[0]!.projectId!.value).toBe(projectId.value);
    });

    it('should efficiently handle large projects with 100+ issues', async () => {
      const projectId = ProjectId.generate();
      
      // Create project
      db.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        projectId.value,
        'Large Project',
        'Test Description',
        'Active',
        Date.now(),
        Date.now()
      );
      
      // Create 100 issues with some having children and dependencies
      const issues: Issue[] = [];

      for (let i = 0; i < 100; i++) {
        const issue = Issue.create(`Issue ${i}`, `Description ${i}`, i % 10 === 0 ? 'Epic' : 'Story');

        issues.push(issue);
        await repository.saveToProject(issue, projectId);
      }
      
      // Add some children and dependencies
      for (let i = 1; i < 10; i++) {
        issues[0]!.addChild(issues[i]!.id);
        issues[i]!.setParent(issues[0]!.id);
        await repository.save(issues[0]!);
        await repository.save(issues[i]!);
      }
      
      // Measure performance of findByProjectId
      const startTime = Date.now();
      const projectIssues = await repository.findByProjectId(projectId);
      const endTime = Date.now();
      
      expect(projectIssues).toHaveLength(100);
      // Should complete in under 100ms even with 100 issues
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});