import { describe, it, expect, beforeEach } from 'vitest';

import { Workflow } from '../../src/domain/entities/workflow.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';
import { WorkflowId } from '../../src/domain/value-objects/workflow-id.js';
import { WorkflowStage } from '../../src/domain/value-objects/workflow-stage.js';
import { MockTimeProvider } from '../fixtures/mock-time-provider.js';

describe('Workflow Entity Unit Tests', () => {
  let mockTimeProvider: MockTimeProvider;

  beforeEach(() => {
    mockTimeProvider = new MockTimeProvider();
    mockTimeProvider.setTime('2024-01-01T12:00:00Z');
  });

  describe('Workflow Creation', () => {
    it('should create workflow with factory method', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create(
        'Development Workflow',
        projectId,
        mockTimeProvider
      );

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Development Workflow');
      expect(workflow.projectId).toBe(projectId);
      expect(workflow.currentStage).toBe(WorkflowStage.REQUIREMENTS);
      expect(workflow.stages).toEqual([
        WorkflowStage.REQUIREMENTS,
        WorkflowStage.DESIGN,
        WorkflowStage.IMPLEMENTATION,
        WorkflowStage.TESTING,
        WorkflowStage.DEPLOYMENT
      ]);
      expect(workflow.transitions).toHaveLength(0);
      expect(workflow.isComplete).toBe(false);
      expect(workflow.createdAt).toEqual(mockTimeProvider.now());
      expect(workflow.updatedAt).toEqual(mockTimeProvider.now());
    });

    it('should create workflow with specific ID', () => {
      const workflowId = WorkflowId.generate();
      const projectId = ProjectId.generate();
      const workflow = new Workflow(
        workflowId,
        'Test Workflow',
        projectId,
        WorkflowStage.from(WorkflowStage.REQUIREMENTS),
        [WorkflowStage.from(WorkflowStage.REQUIREMENTS)],
        [],
        false,
        mockTimeProvider.now(),
        mockTimeProvider.now(),
        mockTimeProvider
      );

      expect(workflow.id).toBe(workflowId);
    });

    it('should throw error for empty workflow name', () => {
      const projectId = ProjectId.generate();

      expect(() => Workflow.create('', projectId, mockTimeProvider))
        .toThrow('Workflow name cannot be empty');
    });

    it('should throw error for whitespace-only workflow name', () => {
      const projectId = ProjectId.generate();

      expect(() => Workflow.create('   ', projectId, mockTimeProvider))
        .toThrow('Workflow name cannot be empty');
    });
  });

  describe('Snapshot Pattern', () => {
    it('should create workflow from snapshot', () => {
      const workflowId = WorkflowId.generate();
      const projectId = ProjectId.generate();
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-01T11:00:00Z');

      const snapshot = {
        id: workflowId.toString(),
        name: 'Snapshot Workflow',
        projectId: projectId.toString(),
        currentStage: WorkflowStage.DESIGN,
        stages: [
          WorkflowStage.REQUIREMENTS,
          WorkflowStage.DESIGN,
          WorkflowStage.IMPLEMENTATION
        ],
        transitions: [
          { from: WorkflowStage.REQUIREMENTS, to: WorkflowStage.DESIGN, occurredAt: createdAt }
        ],
        isComplete: false,
        createdAt,
        updatedAt
      };

      const workflow = Workflow.fromSnapshot(snapshot, mockTimeProvider);

      expect(workflow.id.toString()).toBe(workflowId.toString());
      expect(workflow.name).toBe('Snapshot Workflow');
      expect(workflow.projectId.toString()).toBe(projectId.toString());
      expect(workflow.currentStage).toBe(WorkflowStage.DESIGN);
      expect(workflow.stages).toEqual(snapshot.stages);
      expect(workflow.transitions).toHaveLength(1);
      expect(workflow.isComplete).toBe(false);
      expect(workflow.createdAt).toEqual(createdAt);
      expect(workflow.updatedAt).toEqual(updatedAt);
    });

    it('should convert workflow to snapshot', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create(
        'Test Workflow',
        projectId,
        mockTimeProvider
      );
      
      mockTimeProvider.advance(1000);
      workflow.transitionTo(WorkflowStage.DESIGN);

      const snapshot = workflow.toSnapshot();

      expect(snapshot.id).toBe(workflow.id.toString());
      expect(snapshot.name).toBe('Test Workflow');
      expect(snapshot.projectId).toBe(projectId.toString());
      expect(snapshot.currentStage).toBe(WorkflowStage.DESIGN);
      expect(snapshot.stages).toEqual(workflow.stages);
      expect(snapshot.transitions).toHaveLength(1);
      expect(snapshot.isComplete).toBe(false);
      expect(snapshot.createdAt).toEqual(workflow.createdAt);
      expect(snapshot.updatedAt).toEqual(workflow.updatedAt);
    });
  });

  describe('Stage Transitions', () => {
    it('should transition to next stage', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      const originalUpdatedAt = workflow.updatedAt;
      
      mockTimeProvider.advance(1000);
      workflow.transitionTo(WorkflowStage.DESIGN);

      expect(workflow.currentStage).toBe(WorkflowStage.DESIGN);
      expect(workflow.transitions).toHaveLength(1);
      expect(workflow.transitions[0]).toEqual({
        from: WorkflowStage.REQUIREMENTS,
        to: WorkflowStage.DESIGN,
        occurredAt: mockTimeProvider.now()
      });
      expect(workflow.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should allow backward transitions', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      workflow.transitionTo(WorkflowStage.DESIGN);
      workflow.transitionTo(WorkflowStage.IMPLEMENTATION);
      
      mockTimeProvider.advance(1000);
      workflow.transitionTo(WorkflowStage.DESIGN);

      expect(workflow.currentStage).toBe(WorkflowStage.DESIGN);
      expect(workflow.transitions).toHaveLength(3);
    });

    it('should throw error for invalid transition', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);

      expect(() => { workflow.transitionTo('invalid stage!'); })
        .toThrow('WorkflowStage name can only contain letters, numbers, hyphens, and underscores');
    });

    it('should throw error for transition to stage not in workflow', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      // Create a custom workflow with limited stages
      const customWorkflow = Workflow.createCustom(
        'Custom Workflow',
        projectId,
        [WorkflowStage.REQUIREMENTS, WorkflowStage.IMPLEMENTATION],
        mockTimeProvider
      );

      expect(() => { customWorkflow.transitionTo(WorkflowStage.DESIGN); })
        .toThrow('Stage design is not in this workflow');
    });

    it('should not transition if already at target stage', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      const originalUpdatedAt = workflow.updatedAt;
      
      mockTimeProvider.advance(1000);
      workflow.transitionTo(WorkflowStage.REQUIREMENTS);

      expect(workflow.transitions).toHaveLength(0);
      expect(workflow.updatedAt).toEqual(originalUpdatedAt);
    });

    it('should mark workflow as complete when reaching final stage', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      workflow.transitionTo(WorkflowStage.DESIGN);
      workflow.transitionTo(WorkflowStage.IMPLEMENTATION);
      workflow.transitionTo(WorkflowStage.TESTING);
      workflow.transitionTo(WorkflowStage.DEPLOYMENT);

      expect(workflow.currentStage).toBe(WorkflowStage.DEPLOYMENT);
      expect(workflow.isComplete).toBe(true);
    });

    it('should unmark complete when transitioning back from final stage', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      workflow.transitionTo(WorkflowStage.DESIGN);
      workflow.transitionTo(WorkflowStage.IMPLEMENTATION);
      workflow.transitionTo(WorkflowStage.TESTING);
      workflow.transitionTo(WorkflowStage.DEPLOYMENT);
      
      expect(workflow.isComplete).toBe(true);
      
      workflow.transitionTo(WorkflowStage.TESTING);
      
      expect(workflow.isComplete).toBe(false);
    });
  });

  describe('Workflow Queries', () => {
    it('should check if stage can be transitioned to', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);

      expect(workflow.canTransitionTo(WorkflowStage.DESIGN)).toBe(true);
      expect(workflow.canTransitionTo(WorkflowStage.REQUIREMENTS)).toBe(false); // Already there
      expect(workflow.canTransitionTo('invalid-stage')).toBe(false);
    });

    it('should get stage index', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);

      expect(workflow.getStageIndex(WorkflowStage.REQUIREMENTS)).toBe(0);
      expect(workflow.getStageIndex(WorkflowStage.DESIGN)).toBe(1);
      expect(workflow.getStageIndex(WorkflowStage.IMPLEMENTATION)).toBe(2);
      expect(workflow.getStageIndex(WorkflowStage.TESTING)).toBe(3);
      expect(workflow.getStageIndex(WorkflowStage.DEPLOYMENT)).toBe(4);
      expect(workflow.getStageIndex('invalid-stage')).toBe(-1);
    });

    it('should check if stage has been visited', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);

      expect(workflow.hasVisited(WorkflowStage.REQUIREMENTS)).toBe(true); // Started here
      expect(workflow.hasVisited(WorkflowStage.DESIGN)).toBe(false);
      
      workflow.transitionTo(WorkflowStage.DESIGN);
      
      expect(workflow.hasVisited(WorkflowStage.DESIGN)).toBe(true);
      
      workflow.transitionTo(WorkflowStage.IMPLEMENTATION);
      workflow.transitionTo(WorkflowStage.DESIGN); // Go back
      
      expect(workflow.hasVisited(WorkflowStage.IMPLEMENTATION)).toBe(true);
    });

    it('should get transition history', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      workflow.transitionTo(WorkflowStage.DESIGN);
      mockTimeProvider.advance(1000);
      workflow.transitionTo(WorkflowStage.IMPLEMENTATION);
      mockTimeProvider.advance(1000);
      workflow.transitionTo(WorkflowStage.DESIGN); // Go back
      
      const history = workflow.getTransitionHistory();
      
      expect(history).toHaveLength(3);
      expect(history[0].from).toBe(WorkflowStage.REQUIREMENTS);
      expect(history[0].to).toBe(WorkflowStage.DESIGN);
      expect(history[1].from).toBe(WorkflowStage.DESIGN);
      expect(history[1].to).toBe(WorkflowStage.IMPLEMENTATION);
      expect(history[2].from).toBe(WorkflowStage.IMPLEMENTATION);
      expect(history[2].to).toBe(WorkflowStage.DESIGN);
    });

    it('should get progress percentage', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      expect(workflow.getProgress()).toBe(20); // 1/5 stages = 20%
      
      workflow.transitionTo(WorkflowStage.DESIGN);
      expect(workflow.getProgress()).toBe(40); // 2/5 stages = 40%
      
      workflow.transitionTo(WorkflowStage.IMPLEMENTATION);
      expect(workflow.getProgress()).toBe(60); // 3/5 stages = 60%
      
      workflow.transitionTo(WorkflowStage.TESTING);
      expect(workflow.getProgress()).toBe(80); // 4/5 stages = 80%
      
      workflow.transitionTo(WorkflowStage.DEPLOYMENT);
      expect(workflow.getProgress()).toBe(100); // 5/5 stages = 100%
    });
  });

  describe('Custom Workflows', () => {
    it('should create custom workflow with specified stages', () => {
      const projectId = ProjectId.generate();
      const customStages = [
        WorkflowStage.REQUIREMENTS,
        WorkflowStage.IMPLEMENTATION,
        WorkflowStage.DEPLOYMENT
      ];
      
      const workflow = Workflow.createCustom(
        'Fast Track Workflow',
        projectId,
        customStages,
        mockTimeProvider
      );

      expect(workflow.name).toBe('Fast Track Workflow');
      expect(workflow.stages).toEqual(customStages);
      expect(workflow.currentStage).toBe(WorkflowStage.REQUIREMENTS);
    });

    it('should throw error for empty stages array', () => {
      const projectId = ProjectId.generate();
      
      expect(() => Workflow.createCustom('Empty Workflow', projectId, [], mockTimeProvider))
        .toThrow('Workflow must have at least one stage');
    });

    it('should throw error for duplicate stages', () => {
      const projectId = ProjectId.generate();
      const duplicateStages = [
        WorkflowStage.REQUIREMENTS,
        WorkflowStage.DESIGN,
        WorkflowStage.REQUIREMENTS
      ];
      
      expect(() => Workflow.createCustom('Duplicate Workflow', projectId, duplicateStages, mockTimeProvider))
        .toThrow('Workflow cannot have duplicate stages');
    });
  });

  describe('Workflow Updates', () => {
    it('should update workflow name', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Original Name', projectId, mockTimeProvider);
      const originalUpdatedAt = workflow.updatedAt;
      
      mockTimeProvider.advance(1000);
      workflow.updateName('New Name');

      expect(workflow.name).toBe('New Name');
      expect(workflow.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should throw error for empty name update', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);

      expect(() => { workflow.updateName(''); })
        .toThrow('Workflow name cannot be empty');
    });

    it('should reset workflow to initial stage', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      workflow.transitionTo(WorkflowStage.DESIGN);
      workflow.transitionTo(WorkflowStage.IMPLEMENTATION);
      
      const originalUpdatedAt = workflow.updatedAt;

      mockTimeProvider.advance(1000);
      workflow.reset();

      expect(workflow.currentStage).toBe(WorkflowStage.REQUIREMENTS);
      expect(workflow.transitions).toHaveLength(0);
      expect(workflow.isComplete).toBe(false);
      expect(workflow.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Immutability', () => {
    it('should not allow direct modification of stages array', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      const stages = workflow.stages;

      stages.push('extra-stage');
      
      expect(workflow.stages).toHaveLength(5); // Should not be affected
    });

    it('should not allow direct modification of transitions array', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      workflow.transitionTo(WorkflowStage.DESIGN);
      
      const transitions = workflow.transitions;

      transitions.push({ from: 'fake', to: 'transition', occurredAt: new Date() });
      
      expect(workflow.transitions).toHaveLength(1); // Should not be affected
    });

    it('should return new arrays for getters', () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mockTimeProvider);
      
      const stages1 = workflow.stages;
      const stages2 = workflow.stages;
      
      expect(stages1).not.toBe(stages2);
      expect(stages1).toEqual(stages2);
      
      const transitions1 = workflow.transitions;
      const transitions2 = workflow.transitions;
      
      expect(transitions1).not.toBe(transitions2);
      expect(transitions1).toEqual(transitions2);
    });
  });
});