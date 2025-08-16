import { describe, it, expect, beforeEach } from 'vitest';

import { WorkflowApplicationService } from '../../../src/application/services/workflow-application-service.js';
import { Project } from '../../../src/domain/entities/project.js';
import { Workflow } from '../../../src/domain/entities/workflow.js';
import { ProjectId } from '../../../src/domain/value-objects/project-id.js';
import { WorkflowId } from '../../../src/domain/value-objects/workflow-id.js';
import { WorkflowStage } from '../../../src/domain/value-objects/workflow-stage.js';
import { ApplicationServiceMockFactory } from '../../fixtures/mock-application-service-infrastructure.js';

import type { 
  CreateWorkflowRequest, 
  UpdateWorkflowRequest,
  ExecuteStageRequest,
  CompleteStageRequest 
} from '../../../src/application/dtos/workflow-dto.js';

describe('WorkflowApplicationService', () => {
  let service: WorkflowApplicationService;
  let mocks: ApplicationServiceMockFactory;

  beforeEach(() => {
    mocks = ApplicationServiceMockFactory.create();
    service = new WorkflowApplicationService(
      mocks.workflowRepository,
      mocks.projectRepository,
      mocks.unitOfWork,
      mocks.timeProvider
    );
  });

  describe('Workflow Creation', () => {
    it('should create workflow with default stages successfully', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);

      mocks.projectRepository.mockProject(projectId.value, project);

      const request: CreateWorkflowRequest = {
        projectId: projectId.value,
        name: 'Feature Development Workflow',
        description: 'Standard development workflow'
      };

      const result = await service.createWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Feature Development Workflow');
      expect(result.data!.stages).toHaveLength(5); // Default stages
      expect(result.data!.status).toBe('draft');
    });

    it('should create workflow with custom stages successfully', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);

      mocks.projectRepository.mockProject(projectId.value, project);

      const customStages = [
        {
          id: 'planning',
          name: 'Planning',
          description: 'Plan the work',
          dependencies: [],
          required: true,
          parallel: false,
          config: { estimatedHours: 8 }
        },
        {
          id: 'execution',
          name: 'Execution',
          description: 'Execute the plan',
          dependencies: ['planning'],
          required: true,
          parallel: false,
          config: { estimatedHours: 40 }
        }
      ];

      const request: CreateWorkflowRequest = {
        projectId: projectId.value,
        name: 'Custom Workflow',
        description: 'Custom workflow with specific stages',
        stages: customStages
      };

      const result = await service.createWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.data!.stages).toHaveLength(2);
      expect(result.data!.stages[0].name).toBe('Planning');
      expect(result.data!.stages[1].dependencies).toContain('planning');
    });

    it('should fail when project does not exist', async () => {
      const nonExistentProjectId = ProjectId.generate().value;

      const request: CreateWorkflowRequest = {
        projectId: nonExistentProjectId,
        name: 'Test Workflow',
        description: 'Description'
      };

      const result = await service.createWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project not found');
    });

    it('should fail when workflow name is empty', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);

      mocks.projectRepository.mockProject(projectId.value, project);

      const request: CreateWorkflowRequest = {
        projectId: projectId.value,
        name: '',
        description: 'Description'
      };

      const result = await service.createWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workflow name is required');
    });

    it('should fail when custom stages have circular dependencies', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);

      mocks.projectRepository.mockProject(projectId.value, project);

      const circularStages = [
        {
          id: 'stage1',
          name: 'Stage 1',
          dependencies: ['stage2'],
          required: true,
          parallel: false,
          config: {}
        },
        {
          id: 'stage2',
          name: 'Stage 2',
          dependencies: ['stage1'],
          required: true,
          parallel: false,
          config: {}
        }
      ];

      const request: CreateWorkflowRequest = {
        projectId: projectId.value,
        name: 'Circular Workflow',
        stages: circularStages
      };

      const result = await service.createWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('circular dependency');
    });
  });

  describe('Workflow Stage Transitions', () => {
    it('should execute workflow stage successfully', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);

      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const request: ExecuteStageRequest = {
        workflowId: workflow.id.value,
        stageId: WorkflowStage.REQUIREMENTS,
        context: { notes: 'Requirements gathering started' }
      };

      const result = await service.executeStage(request);

      expect(result.success).toBe(true);
      expect(result.stageId).toBe(WorkflowStage.REQUIREMENTS);
      expect(result.status).toBe('in_progress');
    });

    it('should complete workflow stage successfully', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);

      workflow.transitionTo(WorkflowStage.REQUIREMENTS);
      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const request: CompleteStageRequest = {
        workflowId: workflow.id.value,
        stageId: WorkflowStage.REQUIREMENTS,
        success: true,
        output: { requirements: ['REQ-1', 'REQ-2'] }
      };

      const result = await service.completeStage(request);

      expect(result.success).toBe(true);
      expect(result.stageId).toBe(WorkflowStage.REQUIREMENTS);
      expect(result.status).toBe('completed');
    });

    it('should transition to next stage after completion', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);

      workflow.transitionTo(WorkflowStage.REQUIREMENTS);
      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const request: CompleteStageRequest = {
        workflowId: workflow.id.value,
        stageId: WorkflowStage.REQUIREMENTS,
        success: true,
        output: { requirements: ['REQ-1'] },
        context: { autoAdvance: true }
      };

      const result = await service.completeStage(request);

      expect(result.success).toBe(true);
      expect(result.workflowStatus).toBe('in_progress');
    });

    it('should fail to execute non-existent stage', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);

      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const request: ExecuteStageRequest = {
        workflowId: workflow.id.value,
        stageId: 'non-existent-stage',
        context: {}
      };

      const result = await service.executeStage(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Stage not found');
    });

    it('should fail to execute stage with unmet dependencies', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);

      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      // Try to execute IMPLEMENTATION without completing REQUIREMENTS first
      const request: ExecuteStageRequest = {
        workflowId: workflow.id.value,
        stageId: WorkflowStage.IMPLEMENTATION,
        context: {}
      };

      const result = await service.executeStage(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('dependencies not met');
    });
  });

  describe('Workflow Progress Tracking', () => {
    it('should calculate workflow progress correctly', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);
      
      // Simulate partial completion
      workflow.transitionTo(WorkflowStage.DESIGN);
      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const progress = await service.getWorkflowProgress(workflow.id.value);

      expect(progress).toBeDefined();
      expect(progress.workflowId).toBe(workflow.id.value);
      expect(progress.completionPercentage).toBeGreaterThan(0);
      expect(progress.currentStage).toBe(WorkflowStage.DESIGN);
    });

    it('should identify completed workflow', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);
      
      // Complete all stages
      workflow.transitionTo(WorkflowStage.DEPLOYMENT);
      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const progress = await service.getWorkflowProgress(workflow.id.value);

      expect(progress.completionPercentage).toBe(100);
      expect(progress.isComplete).toBe(true);
    });

    it('should list available next stages', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);

      workflow.transitionTo(WorkflowStage.REQUIREMENTS);
      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const progress = await service.getWorkflowProgress(workflow.id.value);

      expect(progress.availableStages).toBeDefined();
      expect(progress.availableStages.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow Updates', () => {
    it('should update workflow name successfully', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Original Name', projectId, mocks.timeProvider);

      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const request: UpdateWorkflowRequest = {
        name: 'Updated Name'
      };

      const result = await service.updateWorkflow(workflow.id.value, request);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Updated Name');
    });

    it('should update workflow status successfully', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);

      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const request: UpdateWorkflowRequest = {
        status: 'active'
      };

      const result = await service.updateWorkflow(workflow.id.value, request);

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('active');
    });

    it('should fail to update non-existent workflow', async () => {
      const nonExistentId = WorkflowId.generate().value;

      const request: UpdateWorkflowRequest = {
        name: 'New Name'
      };

      const result = await service.updateWorkflow(nonExistentId, request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workflow not found');
    });
  });

  describe('Workflow Queries', () => {
    it('should get workflow by id successfully', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);

      mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);

      const result = await service.getWorkflow(workflow.id.value);

      expect(result).toBeDefined();
      expect(result!.id).toBe(workflow.id.value);
      expect(result!.name).toBe('Test Workflow');
    });

    it('should return null for non-existent workflow', async () => {
      const nonExistentId = WorkflowId.generate().value;

      const result = await service.getWorkflow(nonExistentId);

      expect(result).toBeNull();
    });

    it('should get workflow by project id successfully', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Project Workflow', projectId, mocks.timeProvider);

      mocks.workflowRepository.mockProjectWorkflows(projectId.value, [workflow]);

      const result = await service.getWorkflowByProject(projectId.value);

      expect(result).toBeDefined();
      expect(result!.projectId).toBe(projectId.value);
      expect(result!.name).toBe('Project Workflow');
    });

    it('should return null when project has no workflow', async () => {
      const projectId = ProjectId.generate().value;

      const result = await service.getWorkflowByProject(projectId);

      expect(result).toBeNull();
    });
  });

  describe('Workflow Reset', () => {
    it('should reset workflow to initial state successfully', async () => {
      const projectId = ProjectId.generate();
      const workflow = Workflow.create('Test Workflow', projectId, mocks.timeProvider);
      const workflowId = workflow.id.value; // Capture ID before transitions
      
      // Reset any error mocks from previous tests
      mocks.workflowRepository.reset();
      
      // Mock the workflow first
      mocks.workflowRepository.mockWorkflow(workflowId, workflow);
      
      // Advance workflow partially
      workflow.transitionTo(WorkflowStage.DESIGN);
      workflow.transitionTo(WorkflowStage.IMPLEMENTATION);

      const result = await service.resetWorkflow(workflowId);

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('draft');
    });

    it('should fail to reset non-existent workflow', async () => {
      const nonExistentId = WorkflowId.generate().value;

      const result = await service.resetWorkflow(nonExistentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workflow not found');
    });
  });

  describe('Repository Integration', () => {
    it('should handle repository save errors gracefully', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.workflowRepository.mockSaveThrows(new Error('Database connection failed'));

      const request: CreateWorkflowRequest = {
        projectId: projectId.value,
        name: 'Test Workflow',
        description: 'Description'
      };

      const result = await service.createWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle repository find errors gracefully', async () => {
      mocks.workflowRepository.mockFindByIdThrows(new Error('Database query failed'));

      const result = await service.getWorkflow(WorkflowId.generate().value);

      expect(result).toBeNull(); // Should handle error gracefully
    });
  });

  describe('Unit of Work Integration', () => {
    it('should execute operations within transaction', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);

      const request: CreateWorkflowRequest = {
        projectId: projectId.value,
        name: 'Transactional Workflow',
        description: 'Description'
      };

      await service.createWorkflow(request);

      const executeCalls = mocks.unitOfWork.getExecuteCalls();

      expect(executeCalls.length).toBeGreaterThan(0);
    });

    it('should handle transaction failures', async () => {
      const projectId = ProjectId.generate();
      const project = Project.create('Test Project', 'Description', mocks.timeProvider);
      
      mocks.projectRepository.mockProject(projectId.value, project);
      mocks.unitOfWork.mockExecuteThrows(new Error('Transaction failed'));

      const request: CreateWorkflowRequest = {
        projectId: projectId.value,
        name: 'Failed Transaction',
        description: 'Description'
      };

      const result = await service.createWorkflow(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');
    });
  });
});