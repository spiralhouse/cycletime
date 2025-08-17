import { Project } from '../../domain/entities/project.js';
import { ProjectId } from '../../domain/value-objects/project-id.js';

import type { TimeProvider } from '../../domain/interfaces/time-provider.js';
import type { ProjectRepository } from '../../domain/repositories/project-repository.js';
import type { UnitOfWork } from '../../domain/repositories/session-repository.js';
import type {
  CreateProjectCommand,
  UpdateProjectCommand,
  ProjectDto,
  ProjectOperationResult
} from '../dtos/project-dto.js';

/**
 * Application service for Project-related operations
 * Orchestrates use cases and coordinates between domain entities and infrastructure
 */
export class ProjectApplicationService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly timeProvider: TimeProvider
  ) {}

  /**
   * Create a new project with validation
   */
  async createProject(command: CreateProjectCommand): Promise<ProjectOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const validation = await this.validateCreateProjectCommand(command);
        
        if (!validation.isValid) {
          return this.createErrorResult(validation.error!);
        }

        const project = this.createDomainProject(command);

        await this.projectRepository.save(project);

        return this.createSuccessResult(project);
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(command: UpdateProjectCommand): Promise<ProjectOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const project = await this.findProjectById(command.id);
        
        if (!project) {
          return this.createErrorResult('Project does not exist');
        }

        const validation = await this.validateUpdateProjectCommand(command);
        
        if (!validation.isValid) {
          return this.createErrorResult(validation.error!);
        }

        this.applyProjectUpdates(project, command);
        await this.projectRepository.save(project);

        return this.createSuccessResult(project);
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<ProjectOperationResult> {
    try {
      return await this.unitOfWork.execute(async () => {
        const project = await this.findProjectById(projectId);
        
        if (!project) {
          return this.createErrorResult('Project does not exist');
        }

        const id = ProjectId.from(projectId);

        await this.projectRepository.delete(id);

        return { success: true };
      });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<ProjectDto | null> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    try {
      const project = await this.findProjectById(projectId);

      return project ? this.toDto(project) : null;
    } catch {
      // Handle repository errors gracefully
      return null;
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<ProjectDto[]> {
    try {
      const projects = await this.projectRepository.findAll();

      return projects.map(project => this.toDto(project));
    } catch {
      // Handle repository errors gracefully
      return [];
    }
  }

  /**
   * Find project by ID safely
   */
  private async findProjectById(projectId: string): Promise<Project | null> {
    const id = ProjectId.from(projectId);

    return await this.projectRepository.findById(id);
  }

  /**
   * Validate create project command
   */
  private async validateCreateProjectCommand(
    command: CreateProjectCommand
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!command.name?.trim()) {
      return { isValid: false, error: 'Project name is required' };
    }

    return { isValid: true };
  }

  /**
   * Validate update project command
   */
  private async validateUpdateProjectCommand(
    command: UpdateProjectCommand
  ): Promise<{ isValid: boolean; error?: string }> {
    if (command.name !== undefined && !command.name.trim()) {
      return { isValid: false, error: 'Project name cannot be empty' };
    }

    return { isValid: true };
  }

  /**
   * Create domain project from command
   */
  private createDomainProject(command: CreateProjectCommand): Project {
    return Project.create(
      command.name.trim(),
      command.description || '',
      this.timeProvider
    );
  }

  /**
   * Apply updates to project entity
   */
  private applyProjectUpdates(project: Project, command: UpdateProjectCommand): void {
    if (command.name !== undefined) {
      project.updateName(command.name.trim());
    }

    if (command.description !== undefined) {
      project.updateDescription(command.description);
    }

    if (command.status !== undefined) {
      project.updateStatus(command.status);
    }
  }

  /**
   * Convert domain entity to DTO
   */
  private toDto(project: Project): ProjectDto {
    return {
      id: project.id.value,
      name: project.name,
      description: project.description,
      status: project.status.toString(),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(error: string): ProjectOperationResult {
    return { success: false, error };
  }

  /**
   * Create success result
   */
  private createSuccessResult(project: Project): ProjectOperationResult {
    return { success: true, data: this.toDto(project) };
  }
}