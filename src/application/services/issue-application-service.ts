
import { Issue } from '../../domain/entities/issue.js';
import { IssueId } from '../../domain/value-objects/issue-id.js';
import { IssueStatus } from '../../domain/value-objects/issue-status.js';
import { IssueType } from '../../domain/value-objects/issue-type.js';
import { ProjectId } from '../../domain/value-objects/project-id.js';
import { IssueDtoMapper } from '../dtos/issue-dto.js';

import type { TimeProvider } from '../../domain/interfaces/time-provider.js';
import type { IssueRepository } from '../../domain/repositories/issue-repository.js';
import type { ProjectRepository } from '../../domain/repositories/project-repository.js';
import type { UnitOfWork } from '../../domain/repositories/session-repository.js';
import type { 
  CreateIssueCommand, 
  UpdateIssueCommand, 
  IssueDto, 
  IssueOperationResult 
} from '../dtos/issue-dto.js';

/**
 * Application service for Issue-related operations
 * Orchestrates use cases and coordinates between domain entities and infrastructure
 */
export class IssueApplicationService {
  constructor(
    private readonly issueRepository: IssueRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly timeProvider: TimeProvider
  ) {}

  /**
   * Create a new issue with hierarchy and estimation validation
   */
  async createIssue(command: CreateIssueCommand): Promise<IssueOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const validation = await this.validateCreateIssueCommand(command);

        if (!validation.isValid) {
          return this.createErrorResult(validation.error!);
        }

        const { projectId, parentId } = validation;
        const issue = this.createDomainIssue(command, projectId!);

        if (parentId) {
          await this.setIssueParent(issue, parentId);
        }

        await this.persistIssue(issue, projectId!);

        return this.createSuccessResult(issue);
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Update an existing issue with validation
   */
  async updateIssue(command: UpdateIssueCommand): Promise<IssueOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const issue = await this.findIssueById(command.id);

        if (!issue) {
          return this.createErrorResult('Issue not found');
        }

        const updateResult = this.applyIssueUpdates(issue, command);

        if (!updateResult.isValid) {
          return this.createErrorResult(updateResult.error!);
        }

        await this.issueRepository.save(issue);

        return this.createSuccessResult(issue);
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Get an issue by ID
   */
  async getIssue(issueId: string): Promise<IssueDto | null> {
    try {
      if (!issueId) {
        throw new Error('Issue ID is required');
      }

      const id = IssueId.from(issueId);
      const issue = await this.issueRepository.findById(id);
      
      return issue ? IssueDtoMapper.toDto(issue) : null;
    } catch {
      // Handle repository errors gracefully
      return null;
    }
  }

  /**
   * Get all issues for a project
   */
  async getProjectIssues(projectId: string): Promise<IssueDto[]> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    try {
      const id = ProjectId.from(projectId);
      const issues = await this.issueRepository.findByProjectId(id);
      
      return issues.map(issue => IssueDtoMapper.toDto(issue));
    } catch {
      // Handle repository errors gracefully
      return [];
    }
  }

  /**
   * Validate issue hierarchy rules
   */
  private async validateIssueHierarchy(
    type: string, 
    parentId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    // Epic cannot have parent
    if (type === IssueType.Epic && parentId) {
      return {
        isValid: false,
        error: 'Epic cannot have a parent'
      };
    }

    // Subtask must have parent
    if (type === IssueType.Subtask && !parentId) {
      return {
        isValid: false,
        error: 'Subtask must have a parent'
      };
    }

    // If parent is specified, validate parent-child relationship
    if (parentId) {
      const parentIssueId = IssueId.from(parentId);
      const parent = await this.issueRepository.findById(parentIssueId);
      
      if (!parent) {
        return {
          isValid: false,
          error: 'Parent issue not found'
        };
      }

      // Subtask can only have Story parent
      if (type === IssueType.Subtask && parent.type !== IssueType.Story) {
        return {
          isValid: false,
          error: 'Subtask must have a Story parent'
        };
      }

      // Story cannot have Subtask parent
      if (type === IssueType.Story && parent.type === IssueType.Subtask) {
        return {
          isValid: false,
          error: 'Story cannot have Subtask parent'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate estimation rules
   */
  private validateEstimationRules(
    type: string, 
    estimate?: number
  ): { isValid: boolean; error?: string } {
    // Epic cannot have estimate
    if (type === IssueType.Epic && estimate !== undefined) {
      return {
        isValid: false,
        error: 'Epic cannot have estimate'
      };
    }

    // If estimate is provided, validate it's a valid Fibonacci number
    if (estimate !== undefined) {
      const fibonacciSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

      if (!fibonacciSequence.includes(estimate)) {
        return {
          isValid: false,
          error: 'Estimate must follow Fibonacci sequence (1, 2, 3, 5, 8, 13, etc.)'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate create issue command comprehensively
   */
  private async validateCreateIssueCommand(
    command: CreateIssueCommand
  ): Promise<{ isValid: boolean; error?: string; projectId?: ProjectId; parentId?: IssueId }> {
    // Validate required fields
    if (!command.title?.trim()) {
      return { isValid: false, error: 'Issue title is required' };
    }

    if (!command.projectId) {
      return { isValid: false, error: 'Project ID is required' };
    }

    // Validate project exists
    const projectId = ProjectId.from(command.projectId);
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return { isValid: false, error: 'Project not found' };
    }

    // Validate hierarchy rules
    const hierarchyValidation = await this.validateIssueHierarchy(command.type, command.parentId);

    if (!hierarchyValidation.isValid) {
      return { isValid: false, error: hierarchyValidation.error || 'Hierarchy validation failed' };
    }

    // Validate estimation rules
    const estimationValidation = this.validateEstimationRules(command.type, command.estimate);

    if (!estimationValidation.isValid) {
      return { isValid: false, error: estimationValidation.error || 'Estimation validation failed' };
    }

    const result: { isValid: boolean; error?: string; projectId?: ProjectId; parentId?: IssueId } = { isValid: true, projectId };
    
    if (command.parentId) {
      result.parentId = IssueId.from(command.parentId);
    }
    
    return result;
  }

  /**
   * Create domain issue entity from command
   */
  private createDomainIssue(command: CreateIssueCommand, projectId: ProjectId): Issue {
    const issue = Issue.create(
      command.title.trim(),
      command.description || '',
      command.type,
      this.timeProvider,
      projectId
    );

    if (command.estimate !== undefined) {
      issue.setEstimate(command.estimate);
    }

    return issue;
  }

  /**
   * Set parent relationship for issue
   */
  private async setIssueParent(issue: Issue, parentId: IssueId): Promise<void> {
    issue.setParent(parentId);
    
    // Update parent's children list
    const parent = await this.issueRepository.findById(parentId);

    if (parent) {
      parent.addChild(issue.id);
      await this.issueRepository.save(parent);
    }
  }

  /**
   * Persist issue to repository
   */
  private async persistIssue(issue: Issue, projectId: ProjectId): Promise<void> {
    await this.issueRepository.saveToProject(issue, projectId);
  }

  /**
   * Find issue by ID safely
   */
  private async findIssueById(issueId: string): Promise<Issue | null> {
    const id = IssueId.from(issueId);

    return await this.issueRepository.findById(id);
  }

  /**
   * Apply updates to an issue with validation
   */
  private applyIssueUpdates(
    issue: Issue, 
    command: UpdateIssueCommand
  ): { isValid: boolean; error?: string } {
    // Update title if provided
    if (command.title !== undefined) {
      if (!command.title.trim()) {
        return { isValid: false, error: 'Issue title cannot be empty' };
      }
      issue.updateTitle(command.title.trim());
    }

    // Update description if provided
    if (command.description !== undefined) {
      issue.updateDescription(command.description);
    }

    // Update status if provided
    if (command.status !== undefined) {
      if (!IssueStatus.canTransition(issue.status, command.status)) {
        return { 
          isValid: false, 
          error: `Invalid status transition from ${issue.status} to ${command.status}` 
        };
      }
      issue.updateStatus(command.status);
    }

    // Update estimate if provided
    if (command.estimate !== undefined) {
      const estimationValidation = this.validateEstimationRules(issue.type, command.estimate);

      if (!estimationValidation.isValid) {
        return { isValid: false, error: estimationValidation.error || 'Estimation validation failed' };
      }
      issue.setEstimate(command.estimate);
    }

    return { isValid: true };
  }

  /**
   * Create error result
   */
  private createErrorResult(error: string): IssueOperationResult {
    return { success: false, error };
  }

  /**
   * Create success result
   */
  private createSuccessResult(issue: Issue): IssueOperationResult {
    return { success: true, data: IssueDtoMapper.toDto(issue) };
  }
}