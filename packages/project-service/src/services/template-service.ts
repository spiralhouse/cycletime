import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';
import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { NotFoundError, ConflictError } from '../utils/error-handler';
import {
  ProjectTemplate,
  TemplateResponse,
  TemplateListResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ApplyTemplateRequest,
  ProjectTemplatesResponse,
  TemplateRecommendation,
  TemplateCategory,
  TemplateCreatedEvent,
  TemplateAppliedEvent
} from '../types';

export interface TemplateFilters {
  category?: TemplateCategory;
  public?: boolean;
  search?: string;
}

export interface TemplateListOptions {
  page?: number;
  limit?: number;
  filters?: TemplateFilters;
}

export class TemplateService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {
    logger.info('TemplateService initialized');
  }

  /**
   * Get paginated list of templates
   */
  async getTemplates(options: TemplateListOptions = {}): Promise<TemplateListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {}
      } = options;

      // Get all templates
      let templates = this.mockDataService.getAllTemplates();

      // Apply filters
      templates = this.applyFilters(templates, filters);

      // Apply pagination
      const total = templates.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTemplates = templates.slice(startIndex, endIndex);

      return {
        templates: paginatedTemplates,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<TemplateResponse> {
    try {
      const template = this.mockDataService.getTemplateById(id);
      
      if (!template) {
        throw new NotFoundError('Template', id);
      }

      return { template };
    } catch (error) {
      logger.error('Error getting template:', error);
      throw error;
    }
  }

  /**
   * Create new template
   */
  async createTemplate(request: CreateTemplateRequest, userId: string): Promise<TemplateResponse> {
    try {
      const templateId = uuidv4();
      const now = moment().toISOString();

      // Check if template with same name already exists
      const existingTemplates = this.mockDataService.getAllTemplates();
      const nameExists = existingTemplates.some(t => t.name === request.name);
      
      if (nameExists) {
        throw new ConflictError('Template with this name already exists');
      }

      // Create template
      const template: ProjectTemplate = {
        id: templateId,
        name: request.name,
        description: request.description,
        category: request.category,
        visibility: request.visibility,
        configuration: request.configuration,
        metadata: {
          author: `User ${userId}`,
          version: '1.0.0',
          tags: request.metadata?.tags || [],
          usageCount: 0
        },
        audit: {
          createdBy: userId,
          createdAt: now,
          updatedBy: userId,
          updatedAt: now
        }
      };

      // Save template
      const createdTemplate = this.mockDataService.createTemplate(template);

      // Publish event
      await this.publishTemplateCreatedEvent(createdTemplate, userId);

      logger.info('Template created:', { templateId, name: template.name });

      return { template: createdTemplate };
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, request: UpdateTemplateRequest, userId: string): Promise<TemplateResponse> {
    try {
      const existingTemplate = this.mockDataService.getTemplateById(id);
      
      if (!existingTemplate) {
        throw new NotFoundError('Template', id);
      }

      // Check if name is being changed and if it conflicts
      if (request.name && request.name !== existingTemplate.name) {
        const existingTemplates = this.mockDataService.getAllTemplates();
        const nameExists = existingTemplates.some(t => t.id !== id && t.name === request.name);
        
        if (nameExists) {
          throw new ConflictError('Template with this name already exists');
        }
      }

      // Update template
      const updatedTemplate = this.mockDataService.updateTemplate(id, {
        ...request,
        metadata: {
          ...existingTemplate.metadata,
          ...request.metadata
        },
        audit: {
          ...existingTemplate.audit,
          updatedBy: userId,
          updatedAt: moment().toISOString()
        }
      });

      if (!updatedTemplate) {
        throw new NotFoundError('Template', id);
      }

      logger.info('Template updated:', { templateId: id });

      return { template: updatedTemplate };
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string, userId: string): Promise<void> {
    try {
      const template = this.mockDataService.getTemplateById(id);
      
      if (!template) {
        throw new NotFoundError('Template', id);
      }

      // Check if template is in use
      const projects = this.mockDataService.getAllProjects();
      const templatesInUse = projects.filter(p => p.template?.id === id);
      
      if (templatesInUse.length > 0) {
        throw new ConflictError('Cannot delete template that is in use by projects');
      }

      // Delete template
      this.mockDataService.deleteTemplate(id);

      logger.info('Template deleted:', { templateId: id });
    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Get templates for a project with recommendations
   */
  async getProjectTemplates(projectId: string, category?: TemplateCategory): Promise<ProjectTemplatesResponse> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Get all templates
      let templates = this.mockDataService.getAllTemplates();

      // Filter by category if specified
      if (category) {
        templates = templates.filter(t => t.category === category);
      }

      // Generate recommendations
      const recommendations = this.generateTemplateRecommendations(project, templates);

      return {
        projectId,
        templates,
        recommendations
      };
    } catch (error) {
      logger.error('Error getting project templates:', error);
      throw error;
    }
  }

  /**
   * Apply template to project
   */
  async applyTemplate(projectId: string, request: ApplyTemplateRequest, userId: string): Promise<void> {
    try {
      // Check if project exists
      const project = this.mockDataService.getProjectById(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      // Check if template exists
      const template = this.mockDataService.getTemplateById(request.templateId);
      if (!template) {
        throw new NotFoundError('Template', request.templateId);
      }

      // Apply template configuration to project
      const updatedProject = this.mockDataService.updateProject(projectId, {
        template: {
          id: template.id,
          name: template.name,
          category: template.category
        },
        audit: {
          ...project.audit,
          updatedBy: userId,
          updatedAt: moment().toISOString(),
          version: project.audit.version + 1
        }
      });

      if (!updatedProject) {
        throw new NotFoundError('Project', projectId);
      }

      // Update template usage count
      this.mockDataService.updateTemplate(request.templateId, {
        metadata: {
          ...template.metadata,
          usageCount: (template.metadata?.usageCount || 0) + 1
        }
      });

      // Publish event
      await this.publishTemplateAppliedEvent(updatedProject, template, userId, request.configuration);

      logger.info('Template applied to project:', { projectId, templateId: request.templateId });
    } catch (error) {
      logger.error('Error applying template:', error);
      throw error;
    }
  }

  /**
   * Apply filters to templates
   */
  private applyFilters(templates: ProjectTemplate[], filters: TemplateFilters): ProjectTemplate[] {
    let filtered = [...templates];

    if (filters.category) {
      filtered = filtered.filter(template => template.category === filters.category);
    }

    if (filters.public !== undefined) {
      filtered = filtered.filter(template => 
        filters.public ? template.visibility === 'public' : template.visibility !== 'public'
      );
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(search) ||
        (template.description && template.description.toLowerCase().includes(search))
      );
    }

    return filtered;
  }

  /**
   * Generate template recommendations for a project
   */
  private generateTemplateRecommendations(project: any, templates: ProjectTemplate[]): TemplateRecommendation[] {
    const recommendations: TemplateRecommendation[] = [];

    for (const template of templates) {
      let score = 0;
      const reasons: string[] = [];

      // Score based on current project template
      if (project.template && project.template.category === template.category) {
        score += 0.3;
        reasons.push('Similar to current template');
      }

      // Score based on project status
      if (project.status === 'planning' && template.category === 'agile') {
        score += 0.2;
        reasons.push('Good for planning phase');
      }

      // Score based on team size
      const teamSize = project.team?.length || 0;
      if (teamSize > 5 && template.category === 'scrum') {
        score += 0.2;
        reasons.push('Suitable for larger teams');
      } else if (teamSize <= 5 && template.category === 'kanban') {
        score += 0.2;
        reasons.push('Suitable for smaller teams');
      }

      // Score based on project complexity
      if (project.metadata?.complexity === 'high' && template.category === 'waterfall') {
        score += 0.2;
        reasons.push('Good for complex projects');
      }

      // Score based on template popularity
      const usageCount = template.metadata?.usageCount || 0;
      if (usageCount > 100) {
        score += 0.1;
        reasons.push('Popular template');
      }

      // Only include templates with reasonable scores
      if (score > 0.2) {
        recommendations.push({
          template,
          score,
          reasons
        });
      }
    }

    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);

    // Return top 3 recommendations
    return recommendations.slice(0, 3);
  }

  /**
   * Publish template created event
   */
  private async publishTemplateCreatedEvent(template: ProjectTemplate, userId: string): Promise<void> {
    const event: TemplateCreatedEvent = {
      eventId: uuidv4(),
      eventType: 'template.created',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId,
      data: {
        templateId: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        visibility: template.visibility,
        createdBy: {
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@cycletime.dev`
        },
        configuration: {
          phases: template.configuration.phases.length,
          taskTemplates: template.configuration.taskTemplates.length,
          roles: template.configuration.roles.length
        },
        metadata: {
          tags: template.metadata?.tags,
          version: template.metadata?.version
        }
      }
    };

    await this.eventService.publishEvent(event);
  }

  /**
   * Publish template applied event
   */
  private async publishTemplateAppliedEvent(
    project: any,
    template: ProjectTemplate,
    userId: string,
    configuration?: any
  ): Promise<void> {
    const event: TemplateAppliedEvent = {
      eventId: uuidv4(),
      eventType: 'project.template.applied',
      timestamp: moment().toISOString(),
      source: 'project-service',
      version: '1.0',
      userId,
      data: {
        projectId: project.id,
        projectName: project.name,
        template: {
          id: template.id,
          name: template.name,
          category: template.category,
          version: template.metadata?.version || '1.0.0'
        },
        appliedBy: {
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@cycletime.dev`
        },
        configuration: configuration || {},
        results: {
          tasksCreated: template.configuration.taskTemplates.length,
          milestonesAdded: template.configuration.phases.length,
          rolesConfigured: template.configuration.roles.length
        }
      }
    };

    await this.eventService.publishEvent(event);
  }
}