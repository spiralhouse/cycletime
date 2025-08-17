import type { Project } from '../../domain/entities/project.js';

/**
 * Data Transfer Object for Project entities
 */
export interface ProjectDto {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Command for creating a new project
 */
export interface CreateProjectCommand {
  name: string;
  description: string;
  status?: string;
}

/**
 * Command for updating a project
 */
export interface UpdateProjectCommand {
  id: string;
  name?: string;
  description?: string;
  status?: string;
}

/**
 * DTO for project context with aggregated information
 */
export interface ProjectContextDto {
  project: ProjectDto;
  issueCount: number;
  activeIssueCount: number;
  completedIssueCount: number;
  workflowCount: number;
  lastActivity: Date;
}

/**
 * Result type for project operations
 */
export interface ProjectOperationResult {
  success: boolean;
  error?: string;
  data?: ProjectDto;
}

/**
 * Utility class for converting between domain entities and DTOs
 */
export class ProjectDtoMapper {
  /**
   * Convert a Project domain entity to a DTO
   */
  static toDto(project: Project): ProjectDto {
    return {
      id: project.id.value,
      name: project.name,
      description: project.description,
      status: project.status.toString(),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  /**
   * Convert a DTO to a Project domain entity
   * Note: This is primarily for testing; normally entities are created through domain logic
   */
  static fromDto(_dto: ProjectDto): Project {
    // This would typically use a factory method or reconstitution pattern
    throw new Error('ProjectDtoMapper.fromDto not implemented - use domain factories instead');
  }

  /**
   * Create a command from a partial project DTO
   */
  static toCreateCommand(data: Partial<ProjectDto>): CreateProjectCommand {
    if (!data.name) {
      throw new Error('Project name is required');
    }

    const command: CreateProjectCommand = {
      name: data.name,
      description: data.description || '',
    };
    
    if (data.status !== undefined) {
      command.status = data.status;
    }
    
    return command;
  }

  /**
   * Create an update command from a partial project DTO
   */
  static toUpdateCommand(id: string, data: Partial<ProjectDto>): UpdateProjectCommand {
    const command: UpdateProjectCommand = { id };
    
    if (data.name !== undefined) {
      command.name = data.name;
    }
    
    if (data.description !== undefined) {
      command.description = data.description;
    }
    
    if (data.status !== undefined) {
      command.status = data.status;
    }
    
    return command;
  }
}