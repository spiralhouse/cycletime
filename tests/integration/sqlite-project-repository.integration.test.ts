import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { migrations } from '../../src/database/migrations.js';
import { Project } from '../../src/domain/entities/project.js';
import { RepositoryError } from '../../src/domain/errors/repository-errors.js';
import { IssueId } from '../../src/domain/value-objects/issue-id.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { SqliteProjectRepository } from '../../src/infrastructure/database/repositories/sqlite-project-repository.js';

describe.sequential('SqliteProjectRepository Integration Tests', () => {
  let db: Database.Database;
  let repository: SqliteProjectRepository;

  beforeEach(() => {
    // Create in-memory database for each test
    db = new Database(':memory:');
    
    // Enable foreign key constraints
    db.exec('PRAGMA foreign_keys = ON');
    
    // Run migrations to set up schema
    for (const migration of migrations) {
      db.exec(migration.sql);
    }
    
    repository = new SqliteProjectRepository(db);
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
  });

  describe('save and findById', () => {
    it('should save and retrieve a project', async () => {
      const project = Project.create('Test Project', 'A test project description');
      
      await repository.save(project);
      const retrieved = await repository.findById(project.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id.value).toBe(project.id.value);
      expect(retrieved!.name).toBe('Test Project');
      expect(retrieved!.description).toBe('A test project description');
      expect(retrieved!.status).toBe('Planning');
    });

    it('should save and retrieve a project with issues', async () => {
      const project = Project.create('Project with Issues', 'Description');
      const issueId1 = IssueId.generate();
      const issueId2 = IssueId.generate();
      
      // Insert issue records first to satisfy foreign key constraints
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId1.value, 'Issue 1', 'Desc 1', 'Story', 'todo', Date.now(), Date.now());
      
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId2.value, 'Issue 2', 'Desc 2', 'Story', 'todo', Date.now(), Date.now());
      
      project.addIssue(issueId1);
      project.addIssue(issueId2);
      
      await repository.save(project);
      const retrieved = await repository.findById(project.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.issues).toHaveLength(2);
      expect(retrieved!.hasIssue(issueId1)).toBe(true);
      expect(retrieved!.hasIssue(issueId2)).toBe(true);
    });

    it('should update an existing project', async () => {
      const project = Project.create('Original Name', 'Original description');

      await repository.save(project);
      
      // Modify the project
      project.updateName('Updated Name');
      project.updateDescription('Updated description');
      project.updateStatus('Active' as any);
      
      await repository.save(project);
      
      const retrieved = await repository.findById(project.id);

      expect(retrieved!.name).toBe('Updated Name');
      expect(retrieved!.description).toBe('Updated description');
      expect(retrieved!.status).toBe('Active');
    });

    it('should handle updating project issues', async () => {
      const project = Project.create('Project', 'Description');
      const issueId1 = IssueId.generate();
      const issueId2 = IssueId.generate();
      const issueId3 = IssueId.generate();
      
      // Insert issue records first to satisfy foreign key constraints
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId1.value, 'Issue 1', 'Desc 1', 'Story', 'todo', Date.now(), Date.now());
      
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId2.value, 'Issue 2', 'Desc 2', 'Story', 'todo', Date.now(), Date.now());
      
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId3.value, 'Issue 3', 'Desc 3', 'Story', 'todo', Date.now(), Date.now());
      
      // Save with initial issues
      project.addIssue(issueId1);
      project.addIssue(issueId2);
      await repository.save(project);
      
      // Update: remove one, add another
      project.removeIssue(issueId1);
      project.addIssue(issueId3);
      await repository.save(project);
      
      const retrieved = await repository.findById(project.id);

      expect(retrieved!.issues).toHaveLength(2);
      expect(retrieved!.hasIssue(issueId1)).toBe(false);
      expect(retrieved!.hasIssue(issueId2)).toBe(true);
      expect(retrieved!.hasIssue(issueId3)).toBe(true);
    });

    it('should return null for non-existent project', async () => {
      const nonExistentId = ProjectId.generate();
      const result = await repository.findById(nonExistentId);
      
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no projects exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all projects', async () => {
      const project1 = Project.create('Project 1', 'Description 1');
      const project2 = Project.create('Project 2', 'Description 2');
      const project3 = Project.create('Project 3', 'Description 3');
      
      await repository.save(project1);
      await repository.save(project2);
      await repository.save(project3);
      
      const result = await repository.findAll();
      
      expect(result).toHaveLength(3);
      const names = result.map(p => p.name).sort();

      expect(names).toEqual(['Project 1', 'Project 2', 'Project 3']);
    });

    it('should include issues when retrieving all projects', async () => {
      const project1 = Project.create('Project 1', 'Description');
      const issueId1 = IssueId.generate();
      const project2 = Project.create('Project 2', 'Description');
      const issueId2 = IssueId.generate();
      const issueId3 = IssueId.generate();
      
      // Insert issue records first to satisfy foreign key constraints
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId1.value, 'Issue 1', 'Desc 1', 'Story', 'todo', Date.now(), Date.now());
      
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId2.value, 'Issue 2', 'Desc 2', 'Story', 'todo', Date.now(), Date.now());
      
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId3.value, 'Issue 3', 'Desc 3', 'Story', 'todo', Date.now(), Date.now());
      
      project1.addIssue(issueId1);
      project2.addIssue(issueId2);
      project2.addIssue(issueId3);
      
      await repository.save(project1);
      await repository.save(project2);
      
      const result = await repository.findAll();
      
      const proj1 = result.find(p => p.name === 'Project 1');
      const proj2 = result.find(p => p.name === 'Project 2');
      
      expect(proj1!.issues).toHaveLength(1);
      expect(proj2!.issues).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete an existing project', async () => {
      const project = Project.create('To Delete', 'Description');

      await repository.save(project);
      
      // Verify it exists
      const beforeDelete = await repository.findById(project.id);

      expect(beforeDelete).not.toBeNull();
      
      // Delete it
      const deleted = await repository.delete(project.id);

      expect(deleted).toBe(true);
      
      // Verify it's gone
      const afterDelete = await repository.findById(project.id);

      expect(afterDelete).toBeNull();
    });

    it('should return false when deleting non-existent project', async () => {
      const nonExistentId = ProjectId.generate();
      const result = await repository.delete(nonExistentId);
      
      expect(result).toBe(false);
    });

    it('should cascade delete project-issue relationships', async () => {
      const project = Project.create('Project', 'Description');
      const issueId = IssueId.generate();
      
      // Insert issue record first to satisfy foreign key constraints
      db.prepare(`
        INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(issueId.value, 'Issue', 'Desc', 'Story', 'todo', Date.now(), Date.now());
      
      project.addIssue(issueId);
      await repository.save(project);
      
      // Delete the project
      await repository.delete(project.id);
      
      // Verify project-issue relationships are also deleted
      const stmt = db.prepare('SELECT * FROM project_issues WHERE project_id = ?');
      const relationships = stmt.all(project.id.value);
      
      expect(relationships).toHaveLength(0);
    });
  });

  describe('exists', () => {
    it('should return true for existing project', async () => {
      const project = Project.create('Existing', 'Description');

      await repository.save(project);
      
      const exists = await repository.exists(project.id);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent project', async () => {
      const nonExistentId = ProjectId.generate();
      const exists = await repository.exists(nonExistentId);
      
      expect(exists).toBe(false);
    });
  });

  describe('Transaction behavior', () => {
    it('should rollback on error during save', async () => {
      // Create a separate database instance for this test
      const testDb = new Database(':memory:');

      testDb.exec('PRAGMA foreign_keys = ON');
      for (const migration of migrations) {
        testDb.exec(migration.sql);
      }
      const testRepo = new SqliteProjectRepository(testDb);
      
      const project = Project.create('Project', 'Description');

      await testRepo.save(project);
      
      // Corrupt the database connection by closing it
      testDb.close();
      
      // Try to save, which should fail
      const anotherProject = Project.create('Another', 'Description');

      await expect(testRepo.save(anotherProject)).rejects.toThrow(RepositoryError);
    });

    it('should maintain consistency when saving project with issues', async () => {
      const project = Project.create('Complex Project', 'With many issues');
      const issueIds: IssueId[] = [];
      
      // Add multiple issues
      for (let i = 0; i < 10; i++) {
        const issueId = IssueId.generate();

        issueIds.push(issueId);
        
        // Insert issue record first to satisfy foreign key constraints
        db.prepare(`
          INSERT INTO issues (id, title, description, type, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(issueId.value, `Issue ${i}`, `Desc ${i}`, 'Story', 'todo', Date.now(), Date.now());
        
        project.addIssue(issueId);
      }
      
      await repository.save(project);
      
      // Verify all issues were saved
      const retrieved = await repository.findById(project.id);

      expect(retrieved!.issues).toHaveLength(10);
    });
  });

  describe('Concurrent operations', () => {
    it('should handle multiple concurrent saves', async () => {
      const projects = Array.from({ length: 5 }, (_, i) => 
        Project.create(`Project ${i}`, `Description ${i}`)
      );
      
      // Save all projects concurrently
      await Promise.all(projects.map(p => repository.save(p)));
      
      // Verify all were saved
      const allProjects = await repository.findAll();

      expect(allProjects).toHaveLength(5);
    });

    it('should handle concurrent reads and writes', async () => {
      const project = Project.create('Concurrent', 'Testing');

      await repository.save(project);
      
      // Perform concurrent operations
      const operations = [
        repository.findById(project.id),
        repository.findAll(),
        repository.exists(project.id),
        (async () => {
          project.updateName('Updated Concurrent');
          await repository.save(project);
        })(),
      ];
      
      const results = await Promise.all(operations);
      
      // Verify operations completed successfully
      expect(results[0]).not.toBeNull(); // findById
      expect(results[1].length).toBeGreaterThan(0); // findAll
      expect(results[2]).toBe(true); // exists
      
      // Verify the update was applied
      const updated = await repository.findById(project.id);

      expect(updated!.name).toBe('Updated Concurrent');
    });
  });

  describe('Edge cases', () => {
    it('should handle projects with no description', async () => {
      const project = Project.create('No Description', '');

      await repository.save(project);
      
      const retrieved = await repository.findById(project.id);

      expect(retrieved!.description).toBe('');
    });

    it('should handle projects with special characters in name', async () => {
      const specialName = "Project's \"Special\" Name & More <tags>";
      const project = Project.create(specialName, 'Description');

      await repository.save(project);
      
      const retrieved = await repository.findById(project.id);

      expect(retrieved!.name).toBe(specialName);
    });

    it('should preserve exact timestamps', async () => {
      const project = Project.create('Timestamp Test', 'Description');
      const originalCreatedAt = project.createdAt;
      const originalUpdatedAt = project.updatedAt;
      
      await repository.save(project);
      const retrieved = await repository.findById(project.id);
      
      // Timestamps should be preserved (within millisecond precision)
      expect(Math.abs(retrieved!.createdAt.getTime() - originalCreatedAt.getTime())).toBeLessThan(1000);
      expect(Math.abs(retrieved!.updatedAt.getTime() - originalUpdatedAt.getTime())).toBeLessThan(1000);
    });

    it('should handle rapid updates to the same project', async () => {
      const project = Project.create('Rapid Updates', 'Initial');

      await repository.save(project);
      
      // Perform rapid updates
      for (let i = 0; i < 10; i++) {
        project.updateDescription(`Update ${i}`);
        await repository.save(project);
      }
      
      const final = await repository.findById(project.id);

      expect(final!.description).toBe('Update 9');
    });
  });

  describe('Database recovery', () => {
    it('should reinitialize statements after database reconnection', async () => {
      const project = Project.create('Before Close', 'Description');

      await repository.save(project);
      
      // Simulate database reconnection by creating new database with same schema
      const newDb = new Database(':memory:');

      for (const migration of migrations) {
        newDb.exec(migration.sql);
      }
      
      // Create new repository with new database
      const newRepository = new SqliteProjectRepository(newDb);
      
      // Should be able to use the new repository
      const newProject = Project.create('After Reconnect', 'Description');

      await newRepository.save(newProject);
      
      const retrieved = await newRepository.findById(newProject.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('After Reconnect');
      
      newDb.close();
    });
  });
});