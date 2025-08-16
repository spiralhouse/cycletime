import { Project } from '../../domain/entities/project.js';
import { ProjectId } from '../../domain/value-objects/project-id.js';
import { ProjectDtoMapper, type CreateProjectCommand, type ProjectDto } from '../dtos/project-dto.js';

import type { TimeProvider } from '../../domain/interfaces/time-provider.js';
import type { ProjectRepository } from '../../domain/repositories/project-repository.js';

/**
 * Application service for Project-related operations
 * Orchestrates use cases and coordinates between domain entities and infrastructure
 */
export class ProjectApplicationService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly timeProvider: TimeProvider
  ) {}

  /**
   * Create a new project
   */
  async createProject(command: CreateProjectCommand): Promise<ProjectDto> {
    // Validation - fail fast for invalid data
    if (!command.name || command.name.trim() === '') {
      throw new Error('Project name is required');
    }

    // Create domain entity using factory method
    const project = Project.create(
      command.name.trim(),
      command.description || '',
      this.timeProvider
    );

    // Persist through repository
    await this.projectRepository.save(project);

    // Return DTO representation
    return ProjectDtoMapper.toDto(project);
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<ProjectDto | null> {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const id = ProjectId.from(projectId);
    const project = await this.projectRepository.findById(id);

    return project ? ProjectDtoMapper.toDto(project) : null;
  }

  /**
   * List all active projects
   */
  async listActiveProjects(): Promise<ProjectDto[]> {
    const projects = await this.projectRepository.findAll();

    return projects.map(project => ProjectDtoMapper.toDto(project));
  }
}