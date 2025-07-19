import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';
import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { NotFoundError, ConflictError, ValidationError } from '../utils/error-handler';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListResponse,
  ProjectResponse,
  Pagination,
  ProjectCreatedEvent,
  ProjectUpdatedEvent,
  ProjectDeletedEvent,
  ProjectStatusChangedEvent
} from '../types';

export interface ProjectFilters {
  search?: string;
  status?: string;
  owner?: string;
  template?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectListOptions {
  page?: number;
  limit?: number;
  filters?: ProjectFilters;
}

export class ProjectService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {
    logger.info('ProjectService initialized');
  }

  /**
   * Get paginated list of projects
   */
  async getProjects(options: ProjectListOptions = {}): Promise<ProjectListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {}
      } = options;

      // Get all projects
      let projects = this.mockDataService.getAllProjects();

      // Apply filters
      projects = this.applyFilters(projects, filters);

      // Apply sorting
      projects = this.applySorting(projects, filters.sortBy, filters.sortOrder);

      // Apply pagination
      const total = projects.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProjects = projects.slice(startIndex, endIndex);

      const pagination: Pagination = {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      };

      return {
        projects: paginatedProjects,
        pagination,
        filters: {
          status: filters.status,
          owner: filters.owner,
          search: filters.search
        }
      };
    } catch (error) {
      logger.error('Error getting projects:', error);
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<ProjectResponse> {
    try {
      const project = this.mockDataService.getProjectById(id);
      
      if (!project) {
        throw new NotFoundError('Project', id);
      }

      return { project };
    } catch (error) {
      logger.error('Error getting project:', error);
      throw error;
    }
  }

  /**
   * Create new project
   */
  async createProject(request: CreateProjectRequest, userId: string): Promise<ProjectResponse> {
    try {
      const projectId = uuidv4();
      const now = moment().toISOString();

      // Check if project with same name already exists
      const existingProjects = this.mockDataService.getAllProjects();
      const nameExists = existingProjects.some(p => p.name === request.name);
      
      if (nameExists) {
        throw new ConflictError('Project with this name already exists');
      }

      // Create project
      const project: Project = {
        id: projectId,
        name: request.name,
        description: request.description,
        status: 'planning',
        visibility: request.visibility || 'private',
        priority: request.priority || 'medium',
        progress: 0,
        tags: request.tags || [],
        metadata: request.metadata || {},
        owner: {
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@cycletime.dev`
        },
        template: request.templateId ? {
          id: request.templateId,
          name: 'Template Name',
          category: 'agile'
        } : undefined,
        timeline: request.timeline,
        resources: request.resources,
        integrations: request.integrations,
        settings: {
          notifications: {
            email: true,
            slack: false,
            inApp: true
          },
          permissions: {
            allowGuestAccess: false,
            requireApproval: false
          },
          automation: {
            autoAssign: false,
            autoProgress: false,
            autoNotify: true
          }
        },
        audit: {
          createdBy: userId,
          createdAt: now,
          updatedBy: userId,
          updatedAt: now,
          version: 1
        }
      };

      // Save project
      const createdProject = this.mockDataService.createProject(project);

      // Publish event
      await this.publishProjectCreatedEvent(createdProject, userId);

      logger.info('Project created:', { projectId, name: project.name });

      return { project: createdProject };
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Update project
   */
  async updateProject(id: string, request: UpdateProjectRequest, userId: string): Promise<ProjectResponse> {
    try {
      const existingProject = this.mockDataService.getProjectById(id);
      
      if (!existingProject) {
        throw new NotFoundError('Project', id);
      }

      // Check version for optimistic locking
      if (request.version && existingProject.audit.version !== request.version) {
        throw new ConflictError('Project has been modified by another user');
      }

      // Track changes for event
      const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
      
      if (request.name && request.name !== existingProject.name) {
        changes.push({ field: 'name', oldValue: existingProject.name, newValue: request.name });
      }
      
      if (request.status && request.status !== existingProject.status) {
        changes.push({ field: 'status', oldValue: existingProject.status, newValue: request.status });
      }

      if (request.priority && request.priority !== existingProject.priority) {
        changes.push({ field: 'priority', oldValue: existingProject.priority, newValue: request.priority });
      }

      // Update project
      const updatedProject = this.mockDataService.updateProject(id, {
        ...request,
        audit: {
          ...existingProject.audit,
          updatedBy: userId,
          updatedAt: moment().toISOString(),
          version: existingProject.audit.version + 1
        }
      });

      if (!updatedProject) {
        throw new NotFoundError('Project', id);
      }

      // Publish update event
      await this.publishProjectUpdatedEvent(updatedProject, changes, userId);

      // Publish status change event if status changed
      if (request.status && request.status !== existingProject.status) {
        await this.publishProjectStatusChangedEvent(
          updatedProject,
          existingProject.status,
          request.status,
          userId
        );
      }

      logger.info('Project updated:', { projectId: id, changes: changes.length });

      return { project: updatedProject };
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(id: string, permanent: boolean = false, userId: string): Promise<void> {
    try {
      const project = this.mockDataService.getProjectById(id);
      
      if (!project) {
        throw new NotFoundError('Project', id);
      }

      if (permanent) {
        // Permanently delete project
        this.mockDataService.deleteProject(id);
      } else {
        // Archive project
        this.mockDataService.updateProject(id, {
          status: 'archived',
          audit: {
            ...project.audit,
            updatedBy: userId,
            updatedAt: moment().toISOString(),
            version: project.audit.version + 1
          }
        });
      }

      // Publish event
      await this.publishProjectDeletedEvent(project, permanent, userId);

      logger.info('Project deleted:', { projectId: id, permanent });
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Apply filters to projects
   */
  private applyFilters(projects: Project[], filters: ProjectFilters): Project[] {
    let filtered = [...projects];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(search) ||
        (project.description && project.description.toLowerCase().includes(search))
      );
    }

    if (filters.status) {
      filtered = filtered.filter(project => project.status === filters.status);
    }

    if (filters.owner) {
      filtered = filtered.filter(project => project.owner.id === filters.owner);
    }

    if (filters.template) {
      filtered = filtered.filter(project => project.template?.id === filters.template);
    }

    return filtered;
  }

  /**
   * Apply sorting to projects
   */
  private applySorting(projects: Project[], sortBy?: string, sortOrder?: 'asc' | 'desc'): Project[] {
    if (!sortBy) return projects;

    const order = sortOrder === 'asc' ? 1 : -1;

    return projects.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        case 'createdAt':
          aValue = a.audit.createdAt;
          bValue = b.audit.createdAt;
          break;
        case 'updatedAt':
          aValue = a.audit.updatedAt;
          bValue = b.audit.updatedAt;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * order;
      }

      if (aValue < bValue) return -1 * order;
      if (aValue > bValue) return 1 * order;
      return 0;
    });
  }

  /**
   * Publish project created event
   */
  private async publishProjectCreatedEvent(project: Project, userId: string): Promise<void> {
    const event: ProjectCreatedEvent = {
      eventId: uuidv4(),
      eventType: 'project.created',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId,
      data: {
        projectId: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        visibility: project.visibility,
        priority: project.priority,
        owner: project.owner,
        template: project.template || undefined,
        timeline: project.timeline,
        resources: project.resources,
        tags: project.tags
      }
    };

    await this.eventService.publishEvent(event);
  }

  /**
   * Publish project updated event
   */
  private async publishProjectUpdatedEvent(
    project: Project,
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    userId: string
  ): Promise<void> {
    const event: ProjectUpdatedEvent = {
      eventId: uuidv4(),
      eventType: 'project.updated',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId,
      data: {
        projectId: project.id,
        projectName: project.name,
        changes: changes.map(change => ({
          field: change.field,
          oldValue: String(change.oldValue),
          newValue: String(change.newValue)
        })),
        currentState: {
          name: project.name,
          description: project.description,
          status: project.status,
          visibility: project.visibility,
          priority: project.priority,
          progress: project.progress,
          updatedAt: project.audit.updatedAt
        }
      }
    };

    await this.eventService.publishEvent(event);
  }

  /**
   * Publish project deleted event
   */
  private async publishProjectDeletedEvent(
    project: Project,
    permanent: boolean,
    userId: string
  ): Promise<void> {
    const event: ProjectDeletedEvent = {
      eventId: uuidv4(),
      eventType: 'project.deleted',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId,
      data: {
        projectId: project.id,
        projectName: project.name,
        permanent,
        deletedAt: moment().toISOString(),
        owner: project.owner
      }
    };

    await this.eventService.publishEvent(event);
  }

  /**
   * Publish project status changed event
   */
  private async publishProjectStatusChangedEvent(
    project: Project,
    oldStatus: string,
    newStatus: string,
    userId: string
  ): Promise<void> {
    const event: ProjectStatusChangedEvent = {
      eventId: uuidv4(),
      eventType: 'project.status_changed',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId,
      data: {
        projectId: project.id,
        projectName: project.name,
        oldStatus,
        newStatus,
        statusChangedAt: moment().toISOString(),
        owner: project.owner
      }
    };

    await this.eventService.publishEvent(event);
  }
}