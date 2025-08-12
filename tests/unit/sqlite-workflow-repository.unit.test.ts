import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Workflow } from '../../src/domain/entities/workflow.js';
import { RepositoryError } from '../../src/domain/errors/repository-errors.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { WorkflowId } from '../../src/domain/value-objects/workflow-id.js';
import { WorkflowStage } from '../../src/domain/value-objects/workflow-stage.js';
import { SqliteWorkflowRepository } from '../../src/infrastructure/database/repositories/sqlite-workflow-repository.js';

import type { WorkflowTransition } from '../../src/domain/entities/workflow.js';

describe('SqliteWorkflowRepository Unit Tests', () => {
  let mockDb: any;
  let mockStmt: any;
  let mockTransaction: any;
  let repository: SqliteWorkflowRepository;

  beforeEach(() => {
    // Mock the database statement
    mockStmt = {
      get: vi.fn(),
      run: vi.fn().mockReturnValue({ changes: 1 }),
      all: vi.fn().mockReturnValue([])
    };

    // Mock transaction function that returns a function that executes the passed function
    mockTransaction = vi.fn((fn: any) => {
      return () => fn();
    });

    // Mock the database
    mockDb = {
      open: true,
      prepare: vi.fn().mockReturnValue(mockStmt),
      transaction: mockTransaction,
      inTransaction: false
    };

    repository = new SqliteWorkflowRepository(mockDb);
  });

  describe('findByProjectId', () => {
    it('should return null when no workflow found for project', async () => {
      mockStmt.get.mockReturnValue(undefined);
      
      const result = await repository.findByProjectId(ProjectId.generate());
      
      expect(result).toBeNull();
      expect(mockStmt.get).toHaveBeenCalled();
    });

    it('should reconstitute workflow from database row', async () => {
      const workflowId = WorkflowId.generate();
      const projectId = ProjectId.generate();
      const stages = ['requirements', 'design', 'implementation'];
      const transitions: WorkflowTransition[] = [
        { from: 'requirements', to: 'design', occurredAt: new Date() }
      ];
      
      const mockRow = {
        id: workflowId.value,
        project_id: projectId.value,
        name: 'Test Workflow',
        current_stage: 'design',
        stages: JSON.stringify(stages),
        transitions: JSON.stringify(transitions),
        is_complete: 0,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      mockStmt.get.mockReturnValue(mockRow);
      
      const result = await repository.findByProjectId(projectId);
      
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Workflow');
      expect(result!.projectId.value).toBe(projectId.value);
      expect(result!.stages).toHaveLength(3);
      expect(result!.transitions).toHaveLength(1);
      expect(result!.currentStage).toBe('design');
      expect(result!.isComplete).toBe(false);
    });

    it('should handle workflow marked as complete', async () => {
      const workflowId = WorkflowId.generate();
      const projectId = ProjectId.generate();
      
      const mockRow = {
        id: workflowId.value,
        project_id: projectId.value,
        name: 'Completed Workflow',
        current_stage: 'deployment',
        stages: JSON.stringify(['requirements', 'design', 'implementation', 'testing', 'deployment']),
        transitions: JSON.stringify([]),
        is_complete: 1, // SQLite uses 1 for true
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      mockStmt.get.mockReturnValue(mockRow);
      
      const result = await repository.findByProjectId(projectId);
      
      expect(result).not.toBeNull();
      expect(result!.isComplete).toBe(true);
    });

    it('should handle database errors', async () => {
      mockStmt.get.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await expect(repository.findByProjectId(ProjectId.generate()))
        .rejects.toThrow(RepositoryError);
    });

    it('should re-initialize statements if database is closed', async () => {
      mockDb.open = false;
      mockStmt.get.mockReturnValue(undefined);
      
      const projectId = ProjectId.generate();
      const result = await repository.findByProjectId(projectId);
      
      expect(result).toBeNull();
      // Should have tried to reinitialize
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });



  describe('save', () => {
    it('should insert new workflow', async () => {
      const projectId = ProjectId.generate();
      const mockTimeProvider = {
        now: vi.fn().mockReturnValue(new Date())
      };
      const workflow = Workflow.create(
        'New Workflow',
        projectId,
        mockTimeProvider
      );
      
      // Mock findByProjectId to return null (no existing workflow)
      mockStmt.get.mockReturnValue(undefined);
      
      await repository.save(workflow);
      
      expect(mockStmt.run).toHaveBeenCalled();
    });

    it('should update existing workflow', async () => {
      const projectId = ProjectId.generate();
      const mockTimeProvider = {
        now: vi.fn().mockReturnValue(new Date())
      };
      const workflow = Workflow.create(
        'Existing Workflow',
        projectId,
        mockTimeProvider
      );
      
      // Mock findByProjectId to return an existing workflow
      const existingRow = {
        id: workflow.id.value,
        project_id: projectId.value,
        name: 'Old Name',
        current_stage: 'requirements',
        stages: JSON.stringify(['requirements', 'design']),
        transitions: JSON.stringify([]),
        is_complete: 0,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };

      mockStmt.get.mockReturnValue(existingRow);
      
      await repository.save(workflow);
      
      expect(mockStmt.run).toHaveBeenCalled();
    });

    it('should serialize stages and transitions as JSON', async () => {
      const projectId = ProjectId.generate();
      const mockTimeProvider = {
        now: vi.fn().mockReturnValue(new Date())
      };
      const workflow = Workflow.createCustom(
        'Workflow with stages',
        projectId,
        ['requirements', 'testing', 'deployment'],
        mockTimeProvider
      );
      
      // Mock no existing workflow
      mockStmt.get.mockReturnValue(undefined);
      
      // Capture the arguments passed to run
      let runArgs: any[] = [];

      mockStmt.run.mockImplementation((...args: any[]) => {
        runArgs = args;

        return { changes: 1 };
      });
      
      await repository.save(workflow);
      
      // Check that stages and transitions were JSON stringified
      const stagesIndex = 4; // Adjust based on actual SQL parameter order
      const transitionsIndex = 5;

      expect(typeof runArgs[stagesIndex]).toBe('string');
      expect(typeof runArgs[transitionsIndex]).toBe('string');
      const parsedStages = JSON.parse(runArgs[stagesIndex]);

      expect(parsedStages).toContain('requirements');
      expect(parsedStages).toContain('testing');
    });

    it('should handle boolean fields correctly', async () => {
      const projectId = ProjectId.generate();
      const mockTimeProvider = {
        now: vi.fn().mockReturnValue(new Date())
      };
      const workflow = Workflow.create(
        'Workflow',
        projectId,
        mockTimeProvider
      );
      
      // Transition to final stage to mark as complete
      workflow.transitionTo('deployment');
      
      // Mock no existing workflow
      mockStmt.get.mockReturnValue(undefined);
      
      // Capture the arguments passed to run
      let runArgs: any[] = [];

      mockStmt.run.mockImplementation((...args: any[]) => {
        runArgs = args;

        return { changes: 1 };
      });
      
      await repository.save(workflow);
      
      // Check that is_complete was saved as 1 (SQLite boolean)
      const isCompleteIndex = 6; // Adjust based on actual SQL parameter order

      expect(runArgs[isCompleteIndex]).toBe(1);
    });

    it('should handle database errors', async () => {
      const projectId = ProjectId.generate();
      const mockTimeProvider = {
        now: vi.fn().mockReturnValue(new Date())
      };
      const workflow = Workflow.create(
        'Workflow',
        projectId,
        mockTimeProvider
      );
      
      // Set up the mock to fail during existence check
      mockStmt.get.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await expect(repository.save(workflow))
        .rejects.toThrow(RepositoryError);
    });
  });


  describe('Statement Management', () => {
    it('should initialize statements when database is open', () => {
      const newRepository = new SqliteWorkflowRepository(mockDb);
      
      // Should have prepared statements
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should not initialize statements when database is closed', () => {
      mockDb.open = false;
      const prepareCalls = mockDb.prepare.mock.calls.length;
      
      const newRepository = new SqliteWorkflowRepository(mockDb);
      
      // Should not have prepared any new statements
      expect(mockDb.prepare).toHaveBeenCalledTimes(prepareCalls);
    });

    it('should handle statement preparation errors gracefully', () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Cannot prepare statement');
      });
      
      // Should not throw during construction
      expect(() => new SqliteWorkflowRepository(mockDb)).not.toThrow();
    });
  });

  describe('JSON Serialization', () => {
    it('should handle malformed JSON gracefully', async () => {
      const projectId = ProjectId.generate();
      
      const mockRow = {
        id: WorkflowId.generate().value,
        project_id: projectId.value,
        name: 'Bad JSON Workflow',
        current_stage: 'requirements',
        stages: 'not valid json',
        transitions: 'also not valid',
        is_complete: 0,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      mockStmt.get.mockReturnValue(mockRow);
      
      await expect(repository.findByProjectId(projectId))
        .rejects.toThrow(RepositoryError);
    });

    it('should preserve complex transition properties', async () => {
      const projectId = ProjectId.generate();
      const mockTimeProvider = {
        now: vi.fn().mockReturnValue(new Date())
      };
      const workflow = Workflow.createCustom(
        'Complex Workflow',
        projectId,
        ['stage-1', 'stage-2', 'stage-3'],
        mockTimeProvider
      );
      
      // Add a transition
      workflow.transitionTo('stage-2');
      
      // Mock no existing workflow
      mockStmt.get.mockReturnValue(undefined);
      
      // Capture the arguments passed to run
      let runArgs: any[] = [];

      mockStmt.run.mockImplementation((...args: any[]) => {
        runArgs = args;

        return { changes: 1 };
      });
      
      await repository.save(workflow);
      
      // Parse the saved JSON and verify structure
      const transitionsIndex = 5;
      const savedTransitions = JSON.parse(runArgs[transitionsIndex]);
      
      expect(savedTransitions[0]).toHaveProperty('from');
      expect(savedTransitions[0]).toHaveProperty('to');
      expect(savedTransitions[0]).toHaveProperty('occurredAt');
      expect(savedTransitions[0].from).toBe('stage-1');
      expect(savedTransitions[0].to).toBe('stage-2');
    });
  });
});