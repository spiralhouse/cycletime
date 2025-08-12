import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { migrations } from '../../src/database/migrations.js';
import { Workflow } from '../../src/domain/entities/workflow.js';
import { RepositoryError } from '../../src/domain/errors/repository-errors.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { SqliteWorkflowRepository } from '../../src/infrastructure/database/repositories/sqlite-workflow-repository.js';

describe.sequential('SqliteWorkflowRepository Integration Tests', () => {
  let db: Database.Database;
  let repository: SqliteWorkflowRepository;

  beforeEach(() => {
    // Create in-memory database for each test
    db = new Database(':memory:');
    
    // Enable foreign key constraints
    db.exec('PRAGMA foreign_keys = ON');
    
    // Run migrations to set up schema
    for (const migration of migrations) {
      db.exec(migration.sql);
    }
    
    repository = new SqliteWorkflowRepository(db);
  });

  // Helper function to create a project record
  function createProjectRecord(projectId: ProjectId): void {
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
  }

  afterEach(() => {
    if (db.open) {
      db.close();
    }
  });

  describe('save and findByProjectId', () => {
    it('should save and retrieve a workflow', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Test Workflow', projectId);
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id.value).toBe(workflow.id.value);
      expect(retrieved!.name).toBe('Test Workflow');
      expect(retrieved!.projectId.value).toBe(projectId.value);
      expect(retrieved!.currentStage).toBe('requirements');
      expect(retrieved!.isComplete).toBe(false);
    });

    it('should save and retrieve custom workflow stages', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const customStages = ['planning', 'development', 'review', 'deployment'];
      const workflow = Workflow.createCustom('Custom Workflow', projectId, customStages);
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.stages).toEqual(customStages);
      expect(retrieved!.currentStage).toBe('planning');
    });

    it('should persist workflow transitions', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Workflow with Transitions', projectId);
      
      // Make some transitions
      workflow.transitionTo('design');
      workflow.transitionTo('implementation');
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.currentStage).toBe('implementation');
      expect(retrieved!.transitions).toHaveLength(2);
      expect(retrieved!.transitions[0]!.from).toBe('requirements');
      expect(retrieved!.transitions[0]!.to).toBe('design');
      expect(retrieved!.transitions[1]!.from).toBe('design');
      expect(retrieved!.transitions[1]!.to).toBe('implementation');
    });

    it('should update an existing workflow', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Original Name', projectId);
      
      await repository.save(workflow);
      
      // Modify the workflow
      workflow.updateName('Updated Name');
      workflow.transitionTo('design');
      
      await repository.save(workflow);
      
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved!.name).toBe('Updated Name');
      expect(retrieved!.currentStage).toBe('design');
      expect(retrieved!.transitions).toHaveLength(1);
    });

    it('should handle workflow completion', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Complete Workflow', projectId);
      
      // Transition through all stages to completion
      workflow.transitionTo('design');
      workflow.transitionTo('implementation');
      workflow.transitionTo('testing');
      workflow.transitionTo('deployment');
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.currentStage).toBe('deployment');
      expect(retrieved!.isComplete).toBe(true);
      expect(retrieved!.transitions).toHaveLength(4);
    });

    it('should return null for non-existent project', async () => {
      const nonExistentProjectId = ProjectId.generate();
      const result = await repository.findByProjectId(nonExistentProjectId);
      
      expect(result).toBeNull();
    });

    it('should replace workflow when saving different workflow for same project', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow1 = Workflow.create('First Workflow', projectId);
      const workflow2 = Workflow.create('Second Workflow', projectId);
      
      await repository.save(workflow1);
      await repository.save(workflow2);
      
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('Second Workflow');
      expect(retrieved!.id.value).toBe(workflow2.id.value);
    });
  });

  describe('Workflow state management', () => {
    it('should preserve workflow progress through save/load cycles', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      let workflow = Workflow.create('Progress Test', projectId);
      
      // Initial save
      await repository.save(workflow);
      
      // Load, progress, save
      workflow = (await repository.findByProjectId(projectId))!;
      expect(workflow.getProgress()).toBe(20); // 1/5 stages
      
      workflow.transitionTo('design');
      await repository.save(workflow);
      
      // Load and check progress
      workflow = (await repository.findByProjectId(projectId))!;
      expect(workflow.getProgress()).toBe(40); // 2/5 stages
      
      workflow.transitionTo('implementation');
      await repository.save(workflow);
      
      workflow = (await repository.findByProjectId(projectId))!;
      expect(workflow.getProgress()).toBe(60); // 3/5 stages
    });

    it('should handle workflow reset', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Reset Test', projectId);
      
      // Progress the workflow
      workflow.transitionTo('design');
      workflow.transitionTo('implementation');
      await repository.save(workflow);
      
      // Load and reset
      const loaded = (await repository.findByProjectId(projectId))!;

      loaded.reset();
      await repository.save(loaded);
      
      // Verify reset
      const reset = (await repository.findByProjectId(projectId))!;

      expect(reset.currentStage).toBe('requirements');
      expect(reset.transitions).toHaveLength(0);
      expect(reset.isComplete).toBe(false);
    });

    it('should track visited stages', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Visit Tracking', projectId);
      
      workflow.transitionTo('design');
      workflow.transitionTo('implementation');
      workflow.transitionTo('design'); // Go back
      
      await repository.save(workflow);
      const retrieved = (await repository.findByProjectId(projectId))!;
      
      expect(retrieved.hasVisited('requirements')).toBe(true);
      expect(retrieved.hasVisited('design')).toBe(true);
      expect(retrieved.hasVisited('implementation')).toBe(true);
      expect(retrieved.hasVisited('testing')).toBe(false);
    });
  });

  describe('JSON serialization', () => {
    it('should handle empty stages and transitions', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.createCustom('Empty Workflow', projectId, ['single-stage']);
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.stages).toEqual(['single-stage']);
      expect(retrieved!.transitions).toEqual([]);
    });

    it('should preserve transition timestamps', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Timestamp Test', projectId);
      
      const beforeTransition = new Date();

      workflow.transitionTo('design');
      const afterTransition = new Date();
      
      await repository.save(workflow);
      const retrieved = (await repository.findByProjectId(projectId))!;
      
      const transition = retrieved.transitions[0]!;

      expect(transition.occurredAt).toBeInstanceOf(Date);
      expect(transition.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeTransition.getTime());
      expect(transition.occurredAt.getTime()).toBeLessThanOrEqual(afterTransition.getTime());
    });

    it('should handle special characters in workflow names', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const specialName = "Workflow's \"Special\" Name & More <tags>";
      const workflow = Workflow.create(specialName, projectId);
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved!.name).toBe(specialName);
    });

    it('should handle complex stage names', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const complexStages = [
        'stage-1',
        'stage_2',
        'stage3',
        'complex-stage-name',
        'final_stage'
      ];
      const workflow = Workflow.createCustom('Complex Stages', projectId, complexStages);
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved!.stages).toEqual(complexStages);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid transitions', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Rapid Transitions', projectId);
      
      // Perform rapid transitions
      for (const stage of ['design', 'implementation', 'testing', 'deployment']) {
        workflow.transitionTo(stage);
      }
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved!.transitions).toHaveLength(4);
      expect(retrieved!.currentStage).toBe('deployment');
      expect(retrieved!.isComplete).toBe(true);
    });

    it('should handle very long workflow names', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const longName = 'A'.repeat(250); // Just under the 255 limit
      const workflow = Workflow.create(longName, projectId);
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved!.name).toBe(longName);
    });

    it('should preserve exact timestamps', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Timestamp Precision', projectId);
      const originalCreatedAt = workflow.createdAt;
      const originalUpdatedAt = workflow.updatedAt;
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      // Timestamps should be preserved (within second precision due to SQLite storage)
      expect(Math.abs(retrieved!.createdAt.getTime() - originalCreatedAt.getTime())).toBeLessThan(1000);
      expect(Math.abs(retrieved!.updatedAt.getTime() - originalUpdatedAt.getTime())).toBeLessThan(1000);
    });

    it('should handle invalid transitions gracefully', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Invalid Transition', projectId);
      
      // Try to transition to a non-existent stage
      const canTransition = workflow.canTransitionTo('non-existent');

      expect(canTransition).toBe(false);
      
      // Try to transition to current stage
      const canTransitionToCurrent = workflow.canTransitionTo('requirements');

      expect(canTransitionToCurrent).toBe(false);
      
      await repository.save(workflow);
      const retrieved = await repository.findByProjectId(projectId);
      
      expect(retrieved!.currentStage).toBe('requirements');
      expect(retrieved!.transitions).toHaveLength(0);
    });
  });

  describe('Concurrent operations', () => {
    it('should handle multiple saves to same project', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Concurrent Test', projectId);
      
      // Save initial state
      await repository.save(workflow);
      
      // Simulate concurrent modifications
      const workflow1 = (await repository.findByProjectId(projectId))!;
      const workflow2 = (await repository.findByProjectId(projectId))!;
      
      workflow1.transitionTo('design');
      workflow2.transitionTo('implementation');
      
      // Last save wins
      await repository.save(workflow1);
      await repository.save(workflow2);
      
      const final = await repository.findByProjectId(projectId);

      expect(final!.currentStage).toBe('implementation');
    });

    it('should handle saves for different projects', async () => {
      const projectId1 = ProjectId.generate();
      const projectId2 = ProjectId.generate();
      const projectId3 = ProjectId.generate();
      
      createProjectRecord(projectId1);
      createProjectRecord(projectId2);
      createProjectRecord(projectId3);
      
      const workflow1 = Workflow.create('Workflow 1', projectId1);
      const workflow2 = Workflow.create('Workflow 2', projectId2);
      const workflow3 = Workflow.create('Workflow 3', projectId3);
      
      // Save all workflows concurrently
      await Promise.all([
        repository.save(workflow1),
        repository.save(workflow2),
        repository.save(workflow3)
      ]);
      
      // Verify all were saved independently
      const retrieved1 = await repository.findByProjectId(projectId1);
      const retrieved2 = await repository.findByProjectId(projectId2);
      const retrieved3 = await repository.findByProjectId(projectId3);
      
      expect(retrieved1!.name).toBe('Workflow 1');
      expect(retrieved2!.name).toBe('Workflow 2');
      expect(retrieved3!.name).toBe('Workflow 3');
    });
  });

  describe('Database recovery', () => {
    it('should reinitialize statements after database reconnection', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const workflow = Workflow.create('Before Close', projectId);
      
      await repository.save(workflow);
      
      // Simulate database reconnection by creating new database with same schema
      const newDb = new Database(':memory:');

      for (const migration of migrations) {
        newDb.exec(migration.sql);
      }
      
      // Create new repository with new database
      const newRepository = new SqliteWorkflowRepository(newDb);
      
      // Should be able to use the new repository
      const newProjectId = ProjectId.generate();
      
      // Create project record in new database
      newDb.prepare(`
        INSERT INTO projects (id, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        newProjectId.value,
        'Test Project',
        'Test Description',
        'Planning',
        Date.now(),
        Date.now()
      );
      
      const newWorkflow = Workflow.create('After Reconnect', newProjectId);
      
      await newRepository.save(newWorkflow);
      
      const retrieved = await newRepository.findByProjectId(newProjectId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe('After Reconnect');
      
      newDb.close();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of transitions efficiently', async () => {
      const projectId = ProjectId.generate();

      createProjectRecord(projectId);
      const stages = Array.from({ length: 50 }, (_, i) => `stage-${i}`);
      const workflow = Workflow.createCustom('Performance Test', projectId, stages);
      
      // Make many transitions
      for (let i = 1; i < 30; i++) {
        workflow.transitionTo(stages[i]!);
      }
      
      const startSave = Date.now();

      await repository.save(workflow);
      const saveDuration = Date.now() - startSave;
      
      const startLoad = Date.now();
      const retrieved = await repository.findByProjectId(projectId);
      const loadDuration = Date.now() - startLoad;
      
      expect(retrieved!.transitions).toHaveLength(29);
      expect(saveDuration).toBeLessThan(100); // Should save in less than 100ms
      expect(loadDuration).toBeLessThan(50); // Should load in less than 50ms
    });
  });
});