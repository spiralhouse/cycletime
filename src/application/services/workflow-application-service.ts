
import { Workflow } from '../../domain/entities/workflow.js';
import { ProjectId } from '../../domain/value-objects/project-id.js';
import { WorkflowId } from '../../domain/value-objects/workflow-id.js';
import { WorkflowStage } from '../../domain/value-objects/workflow-stage.js';

import type { TimeProvider } from '../../domain/interfaces/time-provider.js';
import type { ProjectRepository } from '../../domain/repositories/project-repository.js';
import type { UnitOfWork } from '../../domain/repositories/session-repository.js';
import type { WorkflowRepository } from '../../domain/repositories/workflow-repository.js';
import type {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  ExecuteStageRequest,
  CompleteStageRequest,
  WorkflowDto,
  WorkflowOperationResult,
  StageExecutionResult,
  StageCompletionResult,
  WorkflowProgressDto,
  WorkflowStageDto
} from '../dtos/workflow-dto.js';

/**
 * Application service for Workflow-related operations
 * Orchestrates use cases and coordinates between domain entities and infrastructure
 */
export class WorkflowApplicationService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly timeProvider: TimeProvider
  ) {}

  /**
   * Create a new workflow with validation
   */
  async createWorkflow(request: CreateWorkflowRequest): Promise<WorkflowOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const validation = await this.validateCreateWorkflowRequest(request);

        if (!validation.isValid) {
          return this.createErrorResult(validation.error!);
        }

        const workflow = await this.createWorkflowEntity(request, validation.projectId!);

        await this.workflowRepository.save(workflow);

        return this.createSuccessResult(workflow);
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(workflowId: string, request: UpdateWorkflowRequest): Promise<WorkflowOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const workflow = await this.findWorkflowById(workflowId);

        if (!workflow) {
          return this.createErrorResult('Workflow not found');
        }

        // Update name if provided
        if (request.name !== undefined) {
          if (!request.name.trim()) {
            return this.createErrorResult('Workflow name cannot be empty');
          }
          workflow.updateName(request.name.trim());
        }

        // Handle status changes by triggering workflow transitions
        if (request.status !== undefined) {
          if (request.status === 'active' && this.getWorkflowStatus(workflow) === 'draft') {
            // Activate the workflow by creating a self-transition to current stage
            // This creates transition history which marks it as 'active'
            const currentStage = workflow.currentStage;
            const firstStage = workflow.stages[0];
            
            if (currentStage && firstStage && currentStage !== firstStage) {
              // Move to first stage, then back to current
              workflow.transitionTo(firstStage);
              workflow.transitionTo(currentStage);
            } else if (workflow.stages.length > 1) {
              // If at first stage, move to second then back to first
              const secondStage = workflow.stages[1];

              if (secondStage && firstStage) {
                workflow.transitionTo(secondStage);
                workflow.transitionTo(firstStage);
              }
            }
          }
        }

        // Persist changes
        await this.workflowRepository.save(workflow);

        return this.createSuccessResult(workflow);
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Execute a workflow stage
   */
  async executeStage(request: ExecuteStageRequest): Promise<StageExecutionResult> {
    try {
      const workflow = await this.findWorkflowById(request.workflowId);

      if (!workflow) {
        return {
          success: false,
          stageId: request.stageId,
          status: 'failed',
          context: {},
          message: 'Workflow not found'
        };
      }

      // Validate stage exists in workflow
      if (!workflow.stages.includes(request.stageId)) {
        return {
          success: false,
          stageId: request.stageId,
          status: 'failed',
          context: {},
          message: 'Stage not found in workflow'
        };
      }

      // If already at this stage, that's fine (it means we're executing it)
      if (workflow.currentStage === request.stageId) {
        return {
          success: true,
          stageId: request.stageId,
          status: 'in_progress',
          context: request.context || {},
          message: `Stage ${request.stageId} is already in progress`
        };
      }

      // Check if can transition to this stage
      if (!workflow.canTransitionTo(request.stageId)) {
        return {
          success: false,
          stageId: request.stageId,
          status: 'failed',
          context: {},
          message: 'Stage dependencies not met or invalid transition'
        };
      }

      // Additional dependency checking for default workflow stages
      if (!this.areDependenciesMet(workflow, request.stageId)) {
        return {
          success: false,
          stageId: request.stageId,
          status: 'failed',
          context: {},
          message: 'Stage dependencies not met'
        };
      }

      // Execute stage transition
      workflow.transitionTo(request.stageId);
      await this.workflowRepository.save(workflow);

      return {
        success: true,
        stageId: request.stageId,
        status: 'in_progress',
        context: request.context || {},
        message: `Stage ${request.stageId} started successfully`
      };
    } catch (error) {
      return {
        success: false,
        stageId: request.stageId,
        status: 'failed',
        context: {},
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Complete a workflow stage
   */
  async completeStage(request: CompleteStageRequest): Promise<StageCompletionResult> {
    try {
      const workflow = await this.findWorkflowById(request.workflowId);

      if (!workflow) {
        return {
          success: false,
          stageId: request.stageId,
          status: 'failed',
          context: {},
          workflowStatus: 'unknown',
          message: 'Workflow not found'
        };
      }

      // Validate stage is current stage
      if (workflow.currentStage !== request.stageId) {
        return {
          success: false,
          stageId: request.stageId,
          status: 'failed',
          context: {},
          workflowStatus: workflow.isComplete ? 'completed' : 'in_progress',
          message: 'Cannot complete stage that is not currently active'
        };
      }

      const resultStatus = request.success ? 'completed' : 'failed';
      let workflowStatus = workflow.isComplete ? 'completed' : 'active';

      // Auto-advance if requested and successful
      if (request.success && request.context?.autoAdvance) {
        const currentIndex = workflow.getStageIndex(request.stageId);
        const nextStageIndex = currentIndex + 1;
        
        if (nextStageIndex < workflow.stages.length) {
          const nextStage = workflow.stages[nextStageIndex];

          if (nextStage && workflow.canTransitionTo(nextStage)) {
            workflow.transitionTo(nextStage);
            workflowStatus = 'in_progress';
          }
        }
      }

      await this.workflowRepository.save(workflow);

      return {
        success: true,
        stageId: request.stageId,
        status: resultStatus,
        context: request.context || {},
        workflowStatus,
        message: `Stage ${request.stageId} completed successfully`
      };
    } catch (error) {
      return {
        success: false,
        stageId: request.stageId,
        status: 'failed',
        context: {},
        workflowStatus: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get workflow progress information
   */
  async getWorkflowProgress(workflowId: string): Promise<WorkflowProgressDto> {
    const workflow = await this.findWorkflowById(workflowId);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const progress = workflow.getProgress();
    const availableStages = workflow.stages.filter(stage => 
      workflow.canTransitionTo(stage) || stage === workflow.currentStage
    );

    return {
      workflowId: workflow.id.value,
      completionPercentage: progress,
      currentStage: workflow.currentStage,
      isComplete: workflow.isComplete,
      availableStages
    };
  }

  /**
   * Reset workflow to initial state
   */
  async resetWorkflow(workflowId: string): Promise<WorkflowOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const workflow = await this.findWorkflowById(workflowId);

        if (!workflow) {
          return this.createErrorResult('Workflow not found');
        }

        workflow.reset();
        await this.workflowRepository.save(workflow);

        return this.createSuccessResult(workflow);
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<WorkflowDto | null> {
    try {
      if (!workflowId) {
        throw new Error('Workflow ID is required');
      }

      const workflow = await this.findWorkflowById(workflowId);

      return workflow ? this.toDto(workflow) : null;
    } catch {
      // Handle repository errors gracefully
      return null;
    }
  }

  /**
   * Get workflow for a project
   */
  async getWorkflowByProject(projectId: string): Promise<WorkflowDto | null> {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const id = ProjectId.from(projectId);
      const workflow = await this.workflowRepository.findByProjectId(id);
      
      return workflow ? this.toDto(workflow) : null;
    } catch {
      // Handle repository errors gracefully
      return null;
    }
  }

  /**
   * Find workflow by ID safely
   */
  private async findWorkflowById(workflowId: string): Promise<Workflow | null> {
    const id = WorkflowId.from(workflowId);

    return await this.workflowRepository.findById(id);
  }

  /**
   * Check if dependencies are met for a stage
   */
  private areDependenciesMet(workflow: Workflow, stageId: string): boolean {
    const currentIndex = workflow.getStageIndex(workflow.currentStage);
    const targetIndex = workflow.getStageIndex(stageId);
    
    // For sequential stages, can only move to next stage or stay at current
    if (targetIndex > currentIndex + 1) {
      return false; // Skipping stages is not allowed
    }
    
    return true;
  }

  /**
   * Detect circular dependencies in stages
   */
  private detectCircularDependencies(stages: {id: string; dependencies: string[]}[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stageId: string): boolean => {
      if (recursionStack.has(stageId)) {
        return true; // Found cycle
      }
      if (visited.has(stageId)) {
        return false; // Already processed
      }

      visited.add(stageId);
      recursionStack.add(stageId);

      const stage = stages.find(s => s.id === stageId);

      if (stage) {
        for (const dep of stage.dependencies) {
          if (hasCycle(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(stageId);

      return false;
    };

    for (const stage of stages) {
      if (!visited.has(stage.id)) {
        if (hasCycle(stage.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Convert domain entity to DTO
   */
  private toDto(workflow: Workflow): WorkflowDto {
    const stagesDto: WorkflowStageDto[] = workflow.stages.map((stageId, index) => {
      const prevStage = index > 0 ? workflow.stages[index - 1] : undefined;
      const stage: WorkflowStageDto = {
        id: stageId,
        name: this.getStageDisplayName(stageId),
        description: `Stage ${index + 1}: ${this.getStageDisplayName(stageId)}`,
        dependencies: prevStage ? [prevStage] : [],
        required: true,
        parallel: false,
        config: {},
        status: this.getStageStatus(workflow, stageId)
      };
      
      if (workflow.hasVisited(stageId)) {
        stage.startedAt = workflow.createdAt;
      }
      
      const completedAt = this.getStageCompletionDate(workflow, stageId);

      if (completedAt) {
        stage.completedAt = completedAt;
      }
      
      return stage;
    });

    const dto: WorkflowDto = {
      id: workflow.id.value,
      projectId: workflow.projectId.value,
      name: workflow.name,
      description: `Workflow for ${workflow.name}`,
      status: this.getWorkflowStatus(workflow),
      stages: stagesDto,
      context: {},
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    };
    
    if (workflow.isComplete) {
      dto.completedAt = workflow.updatedAt;
    }
    
    return dto;
  }

  /**
   * Get stage display name
   */
  private getStageDisplayName(stageId: string): string {
    const stageNames: Record<string, string> = {
      [WorkflowStage.REQUIREMENTS]: 'Requirements',
      [WorkflowStage.DESIGN]: 'Design',
      [WorkflowStage.IMPLEMENTATION]: 'Implementation',
      [WorkflowStage.TESTING]: 'Testing',
      [WorkflowStage.DEPLOYMENT]: 'Deployment',
      'planning': 'Planning',
      'execution': 'Execution'
    };

    return stageNames[stageId] || stageId.charAt(0).toUpperCase() + stageId.slice(1);
  }

  /**
   * Get stage status
   */
  private getStageStatus(workflow: Workflow, stageId: string): string {
    const currentIndex = workflow.getStageIndex(workflow.currentStage);
    const stageIndex = workflow.getStageIndex(stageId);
    
    if (stageIndex < currentIndex) {
      return 'completed';
    } else if (stageIndex === currentIndex) {
      return 'in_progress';
    } else {
      return 'pending';
    }
  }

  /**
   * Get stage completion date
   */
  private getStageCompletionDate(workflow: Workflow, stageId: string): Date | undefined {
    const transitions = workflow.getTransitionHistory();
    const completion = transitions.find(t => t.from === stageId);

    return completion?.occurredAt;
  }

  /**
   * Get workflow status based on state
   */
  private getWorkflowStatus(workflow: Workflow): string {
    if (workflow.isComplete) {
      return 'completed';
    }
    
    // Check if workflow has transitions (has been actively used)
    const transitions = workflow.getTransitionHistory();

    if (transitions.length > 0) {
      return 'active';
    }
    
    // New workflows start as draft until they have transitions
    return 'draft';
  }

  /**
   * Create error result
   */
  private createErrorResult(error: string): WorkflowOperationResult {
    return { success: false, error };
  }

  /**
   * Create success result
   */
  private createSuccessResult(workflow: Workflow): WorkflowOperationResult {
    return { success: true, data: this.toDto(workflow) };
  }

  /**
   * Validate create workflow request
   */
  private async validateCreateWorkflowRequest(
    request: CreateWorkflowRequest
  ): Promise<{ isValid: boolean; error?: string; projectId?: ProjectId }> {
    // Validate required fields
    if (!request.name?.trim()) {
      return { isValid: false, error: 'Workflow name is required' };
    }

    if (!request.projectId) {
      return { isValid: false, error: 'Project ID is required' };
    }

    // Validate project exists
    const projectId = ProjectId.from(request.projectId);
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return { isValid: false, error: 'Project not found' };
    }

    // Validate custom stages if provided
    if (request.stages && request.stages.length > 0) {
      const hasCircularDependency = this.detectCircularDependencies(request.stages);

      if (hasCircularDependency) {
        return { isValid: false, error: 'Workflow stages contain circular dependency' };
      }
    }

    return { isValid: true, projectId };
  }

  /**
   * Create workflow entity from request
   */
  private async createWorkflowEntity(request: CreateWorkflowRequest, projectId: ProjectId): Promise<Workflow> {
    if (request.stages && request.stages.length > 0) {
      const stageNames = request.stages.map(s => s.id);

      return Workflow.createCustom(
        request.name.trim(),
        projectId,
        stageNames,
        this.timeProvider
      );
    } else {
      return Workflow.create(
        request.name.trim(),
        projectId,
        this.timeProvider
      );
    }
  }
}