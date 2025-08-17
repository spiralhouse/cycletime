import type { Issue } from '../../domain/entities/issue.js';

/**
 * Data Transfer Object for Issue entities
 */
export interface IssueDto {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  parentId?: string;
  estimate?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Command for creating a new issue
 */
export interface CreateIssueCommand {
  title: string;
  description: string;
  type: string;
  projectId: string;
  parentId?: string;
  estimate?: number;
}

/**
 * Command for updating an issue
 */
export interface UpdateIssueCommand {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  parentId?: string;
  estimate?: number;
}

/**
 * Command for updating issue status
 */
export interface UpdateIssueStatusCommand {
  id: string;
  status: string;
}

/**
 * Command for adding an issue to a project
 */
export interface AddIssueToProjectCommand {
  projectId: string;
  issueId: string;
}

/**
 * Result type for issue operations
 */
export interface IssueOperationResult {
  success: boolean;
  error?: string;
  data?: IssueDto;
}

/**
 * Utility class for converting between domain entities and DTOs
 */
export class IssueDtoMapper {
  /**
   * Convert an Issue domain entity to a DTO
   */
  static toDto(issue: Issue): IssueDto {
    const dto: IssueDto = {
      id: issue.id.value,
      title: issue.title,
      description: issue.description,
      type: issue.type.toString(),
      status: issue.status.toString(),
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    };
    
    if (issue.parentId) {
      dto.parentId = issue.parentId.value;
    }
    
    if (issue.estimate !== undefined) {
      dto.estimate = issue.estimate;
    }
    
    return dto;
  }

  /**
   * Convert a DTO to an Issue domain entity
   * Note: This is primarily for testing; normally entities are created through domain logic
   */
  static fromDto(_dto: IssueDto): Issue {
    // This would typically use a factory method or reconstitution pattern
    throw new Error('IssueDtoMapper.fromDto not implemented - use domain factories instead');
  }

  /**
   * Create a command from a partial issue DTO
   */
  static toCreateCommand(data: Partial<IssueDto> & { projectId: string }): CreateIssueCommand {
    if (!data.title) {
      throw new Error('Issue title is required');
    }
    if (!data.type) {
      throw new Error('Issue type is required');
    }

    const command: CreateIssueCommand = {
      title: data.title,
      description: data.description || '',
      type: data.type,
      projectId: data.projectId,
    };
    
    if (data.parentId) {
      command.parentId = data.parentId;
    }
    
    if (data.estimate !== undefined) {
      command.estimate = data.estimate;
    }
    
    return command;
  }

  /**
   * Create an update command from a partial issue DTO
   */
  static toUpdateCommand(id: string, data: Partial<IssueDto>): UpdateIssueCommand {
    const command: UpdateIssueCommand = { id };
    
    if (data.title !== undefined) {
      command.title = data.title;
    }
    
    if (data.description !== undefined) {
      command.description = data.description;
    }
    
    if (data.type !== undefined) {
      command.type = data.type;
    }
    
    if (data.status !== undefined) {
      command.status = data.status;
    }
    
    if (data.parentId !== undefined) {
      command.parentId = data.parentId;
    }
    
    if (data.estimate !== undefined) {
      command.estimate = data.estimate;
    }
    
    return command;
  }

  /**
   * Create a status update command
   */
  static toStatusUpdateCommand(id: string, status: string): UpdateIssueStatusCommand {
    return {
      id,
      status,
    };
  }
}