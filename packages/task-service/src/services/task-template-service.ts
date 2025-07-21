import { v4 as uuidv4 } from 'uuid';
import {
  TaskTemplateServiceInterface,
  TaskTemplate,
  CreateTaskTemplateRequest,
  UpdateTaskTemplateRequest,
  ApplyTaskTemplateRequest,
  TaskTemplateListResponse,
  ApplyTaskTemplateResponse,
  TemplateUsageStats,
  TaskTemplateAppliedPayload,
  AIProcessingMetadata
} from '../types/service-types';
import { MockDataService } from './mock-data-service';
import { EventService } from './event-service';
import { logger } from '@cycletime/shared-utils';

/**
 * TaskTemplateService - Task template management service
 * 
 * Provides comprehensive template management functionality:
 * - CRUD operations for task templates
 * - Template variable substitution and validation
 * - Usage analytics and performance tracking
 * - Template matching and recommendation
 * - Batch template operations
 * 
 * Features:
 * - Variable substitution with validation
 * - Template usage statistics
 * - Smart template matching
 * - Template versioning
 * - Audit trail for template changes
 */
export class TaskTemplateService implements TaskTemplateServiceInterface {
  private templateCache: Map<string, TaskTemplate> = new Map();
  private usageStatistics: Map<string, TemplateUsageStats> = new Map();

  constructor(
    private mockDataService: MockDataService,
    private eventService: EventService
  ) {
    this.initializeTemplateCache();
  }

  /**
   * Create a new task template
   * @param request - Template creation request
   * @returns Promise<TaskTemplate> - Created template
   */
  async createTemplate(request: CreateTaskTemplateRequest): Promise<TaskTemplate> {
    try {
      logger.info(`Creating new template: ${request.name}`);
      
      // Validate template structure
      this.validateTemplateRequest(request);
      
      // Create template using mock data service
      const template = await this.mockDataService.createTemplate(request, 'system');
      
      // Cache the template
      this.templateCache.set(template.id, template);
      
      // Initialize usage statistics
      this.usageStatistics.set(template.id, {
        timesUsed: 0,
        lastUsed: undefined,
        averageRating: undefined,
        successRate: undefined,
        averageCompletionTime: undefined
      });
      
      logger.info(`Template created successfully: ${template.id} - ${template.name}`);
      return template;
      
    } catch (error) {
      logger.error('Error creating template:', error as Error);
      throw error;
    }
  }

  /**
   * Get a template by ID
   * @param templateId - Template ID
   * @returns Promise<TaskTemplate | null> - Template or null if not found
   */
  async getTemplate(templateId: string): Promise<TaskTemplate | null> {
    try {
      // Check cache first
      const cachedTemplate = this.templateCache.get(templateId);
      if (cachedTemplate) {
        logger.info(`Template retrieved from cache: ${templateId}`);
        return cachedTemplate;
      }
      
      // Get from data service
      const template = await this.mockDataService.getTemplate(templateId);
      
      if (template) {
        // Cache the template
        this.templateCache.set(templateId, template);
        logger.info(`Template retrieved: ${templateId} - ${template.name}`);
      } else {
        logger.warn(`Template not found: ${templateId}`);
      }
      
      return template;
      
    } catch (error) {
      logger.error(`Error retrieving template ${templateId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Update an existing template
   * @param templateId - Template ID to update
   * @param request - Update request
   * @returns Promise<TaskTemplate> - Updated template
   */
  async updateTemplate(templateId: string, request: UpdateTaskTemplateRequest): Promise<TaskTemplate> {
    try {
      logger.info(`Updating template: ${templateId}`);
      
      // Validate template exists
      const existingTemplate = await this.getTemplate(templateId);
      if (!existingTemplate) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      // Validate update request
      this.validateTemplateUpdateRequest(request);
      
      // Update template using mock data service
      const updatedTemplate = await this.mockDataService.updateTemplate(templateId, request, 'system');
      
      if (!updatedTemplate) {
        throw new Error(`Failed to update template: ${templateId}`);
      }
      
      // Update cache
      this.templateCache.set(templateId, updatedTemplate);
      
      logger.info(`Template updated successfully: ${templateId} - ${updatedTemplate.name}`);
      return updatedTemplate;
      
    } catch (error) {
      logger.error(`Error updating template ${templateId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Delete a template
   * @param templateId - Template ID to delete
   * @returns Promise<boolean> - Success status
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      logger.info(`Deleting template: ${templateId}`);
      
      // Check if template exists
      const template = await this.getTemplate(templateId);
      if (!template) {
        logger.warn(`Template not found for deletion: ${templateId}`);
        return false;
      }
      
      // Delete from data service
      const success = await this.mockDataService.deleteTemplate(templateId);
      
      if (success) {
        // Remove from cache and statistics
        this.templateCache.delete(templateId);
        this.usageStatistics.delete(templateId);
        
        logger.info(`Template deleted successfully: ${templateId}`);
      }
      
      return success;
      
    } catch (error) {
      logger.error(`Error deleting template ${templateId}:`, error as Error);
      throw error;
    }
  }

  /**
   * List templates with filtering and pagination
   * @param query - Query parameters for filtering and pagination
   * @returns Promise<TaskTemplateListResponse> - List of templates with pagination
   */
  async listTemplates(query: any): Promise<TaskTemplateListResponse> {
    try {
      logger.info('Listing templates', { query });
      
      // Get templates from data service
      const response = await this.mockDataService.getTemplates(query);
      
      // Enhance templates with real-time usage statistics
      const enhancedTemplates = response.templates.map(template => ({
        ...template,
        usage: this.usageStatistics.get(template.id) || template.usage
      }));
      
      const enhancedResponse: TaskTemplateListResponse = {
        ...response,
        templates: enhancedTemplates
      };
      
      logger.info(`Listed ${enhancedTemplates.length} templates`);
      return enhancedResponse;
      
    } catch (error) {
      logger.error('Error listing templates:', error as Error);
      throw error;
    }
  }

  /**
   * Apply a template to create tasks
   * @param templateId - Template ID to apply
   * @param request - Application request with variables and options
   * @returns Promise<ApplyTaskTemplateResponse> - Created tasks and summary
   */
  async applyTemplate(templateId: string, request: ApplyTaskTemplateRequest): Promise<ApplyTaskTemplateResponse> {
    const startTime = performance.now();
    
    try {
      logger.info(`Applying template: ${templateId}`);
      
      // Get template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      // Validate variables
      this.validateTemplateVariables(template, request.variables);
      
      // Apply template using mock data service
      const response = await this.mockDataService.applyTemplate(templateId, request, 'system');
      
      if (!response) {
        throw new Error(`Failed to apply template: ${templateId}`);
      }
      
      // Update usage statistics
      await this.updateTemplateUsageStats(templateId, true);
      
      // Publish template applied event
      await this.publishTemplateAppliedEvent(template, request, response);
      
      const processingTime = performance.now() - startTime;
      logger.info(`Template applied successfully: ${templateId} (${response.createdTasks.length} tasks, ${Math.round(processingTime)}ms)`);
      
      return response;
      
    } catch (error) {
      logger.error(`Error applying template ${templateId}:`, error as Error);
      
      // Update usage statistics for failed application
      await this.updateTemplateUsageStats(templateId, false);
      
      throw error;
    }
  }

  /**
   * Find suitable templates for a task
   * @param taskTitle - Task title to match
   * @param taskType - Task type to match
   * @param context - Additional context for matching
   * @returns Promise<TaskTemplate[]> - Matching templates sorted by relevance
   */
  async findSuitableTemplates(
    taskTitle: string, 
    taskType: string, 
    context?: any
  ): Promise<TaskTemplate[]> {
    try {
      logger.info(`Finding templates for task: ${taskTitle} (${taskType})`);
      
      // Get all templates
      const allTemplates = await this.listTemplates({ limit: 100 });
      
      // Calculate relevance scores
      const scoredTemplates = allTemplates.templates.map(template => ({
        template,
        score: this.calculateTemplateRelevance(template, taskTitle, taskType, context)
      }));
      
      // Filter and sort by relevance
      const suitableTemplates = scoredTemplates
        .filter(item => item.score > 0.3) // Minimum relevance threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // Top 5 matches
        .map(item => item.template);
      
      logger.info(`Found ${suitableTemplates.length} suitable templates`);
      return suitableTemplates;
      
    } catch (error) {
      logger.error('Error finding suitable templates:', error as Error);
      throw error;
    }
  }

  /**
   * Get template usage analytics
   * @param templateId - Optional template ID for specific analytics
   * @returns Promise<any> - Usage analytics data
   */
  async getTemplateAnalytics(templateId?: string): Promise<any> {
    try {
      if (templateId) {
        // Get analytics for specific template
        const template = await this.getTemplate(templateId);
        if (!template) {
          throw new Error(`Template not found: ${templateId}`);
        }
        
        const usage = this.usageStatistics.get(templateId) || template.usage;
        
        return {
          templateId,
          name: template.name,
          category: template.category,
          usage,
          performance: {
            successRate: usage.successRate || 0,
            averageRating: usage.averageRating || 0,
            averageCompletionTime: usage.averageCompletionTime || 0
          }
        };
      } else {
        // Get analytics for all templates
        const allTemplates = await this.listTemplates({ limit: 1000 });
        
        const analytics = {
          totalTemplates: allTemplates.templates.length,
          totalUsage: allTemplates.templates.reduce((sum, t) => sum + t.usage.timesUsed, 0),
          averageRating: this.calculateOverallAverageRating(allTemplates.templates),
          categoryBreakdown: this.generateCategoryBreakdown(allTemplates.templates),
          mostUsedTemplates: this.getMostUsedTemplates(allTemplates.templates, 5),
          recentActivity: this.getRecentTemplateActivity(allTemplates.templates)
        };
        
        return analytics;
      }
      
    } catch (error) {
      logger.error('Error getting template analytics:', error as Error);
      throw error;
    }
  }

  /**
   * Validate template variables and substitution
   * @param template - Template to validate
   * @param variables - Variables to validate
   * @returns boolean - Validation result
   */
  validateTemplateVariables(template: TaskTemplate, variables?: Record<string, any>): boolean {
    if (!template.variables || template.variables.length === 0) {
      return true; // No variables to validate
    }
    
    const providedVariables = variables || {};
    const errors: string[] = [];
    
    for (const variable of template.variables) {
      const value = providedVariables[variable.name];
      
      // Check required variables
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required variable '${variable.name}' is missing`);
        continue;
      }
      
      // Skip validation for optional missing variables
      if (value === undefined || value === null) {
        continue;
      }
      
      // Type validation
      if (!this.validateVariableType(value, variable.type)) {
        errors.push(`Variable '${variable.name}' has invalid type. Expected: ${variable.type}`);
      }
      
      // Custom validation
      if (variable.validation && !this.validateVariableConstraints(value, variable.validation)) {
        errors.push(`Variable '${variable.name}' does not meet validation constraints`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Template variable validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }

  // Private helper methods

  private async initializeTemplateCache(): Promise<void> {
    try {
      // Load existing templates into cache
      const templates = await this.mockDataService.getTemplates({ limit: 1000 });
      
      templates.templates.forEach(template => {
        this.templateCache.set(template.id, template);
        this.usageStatistics.set(template.id, template.usage);
      });
      
      logger.info(`Initialized template cache with ${templates.templates.length} templates`);
    } catch (error) {
      logger.error('Error initializing template cache:', error as Error);
    }
  }

  private validateTemplateRequest(request: CreateTaskTemplateRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Template name is required');
    }
    
    if (!request.template.title || request.template.title.trim().length === 0) {
      throw new Error('Template title is required');
    }
    
    if (!request.template.type) {
      throw new Error('Template type is required');
    }
    
    // Validate variable definitions
    if (request.variables) {
      for (const variable of request.variables) {
        if (!variable.name || !variable.type) {
          throw new Error('Variable name and type are required');
        }
      }
    }
  }

  private validateTemplateUpdateRequest(request: UpdateTaskTemplateRequest): void {
    if (request.name !== undefined && request.name.trim().length === 0) {
      throw new Error('Template name cannot be empty');
    }
    
    if (request.template?.title !== undefined && request.template.title.trim().length === 0) {
      throw new Error('Template title cannot be empty');
    }
  }

  private validateVariableType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true; // Unknown type, assume valid
    }
  }

  private validateVariableConstraints(value: any, validation: any): boolean {
    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return false;
      }
    }
    
    // Min/Max validation for numbers
    if (validation.min !== undefined && typeof value === 'number') {
      if (value < validation.min) {
        return false;
      }
    }
    
    if (validation.max !== undefined && typeof value === 'number') {
      if (value > validation.max) {
        return false;
      }
    }
    
    // Options validation
    if (validation.options && Array.isArray(validation.options)) {
      if (!validation.options.includes(value)) {
        return false;
      }
    }
    
    return true;
  }

  private calculateTemplateRelevance(
    template: TaskTemplate, 
    taskTitle: string, 
    taskType: string, 
    context?: any
  ): number {
    let score = 0;
    
    // Type matching (most important)
    if (template.category === taskType) {
      score += 0.4;
    }
    
    // Title similarity
    const titleSimilarity = this.calculateTextSimilarity(template.name, taskTitle);
    score += titleSimilarity * 0.3;
    
    // Description similarity
    const descriptionSimilarity = this.calculateTextSimilarity(template.description, taskTitle);
    score += descriptionSimilarity * 0.2;
    
    // Usage-based scoring (popular templates score higher)
    const usageScore = Math.min(template.usage.timesUsed / 100, 1.0);
    score += usageScore * 0.1;
    
    // Success rate bonus
    if (template.usage.successRate && template.usage.successRate > 0.8) {
      score += 0.05;
    }
    
    // Tag matching
    if (context?.tags && template.tags) {
      const tagMatches = context.tags.filter((tag: string) => 
        template.tags.some(templateTag => 
          templateTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      score += (tagMatches.length / context.tags.length) * 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  private async updateTemplateUsageStats(templateId: string, success: boolean): Promise<void> {
    const currentStats = this.usageStatistics.get(templateId) || {
      timesUsed: 0,
      lastUsed: undefined,
      averageRating: undefined,
      successRate: undefined,
      averageCompletionTime: undefined
    };
    
    const updatedStats: TemplateUsageStats = {
      timesUsed: currentStats.timesUsed + 1,
      lastUsed: new Date().toISOString(),
      averageRating: currentStats.averageRating, // Would be updated based on user feedback
      successRate: this.calculateNewSuccessRate(currentStats, success),
      averageCompletionTime: currentStats.averageCompletionTime
    };
    
    this.usageStatistics.set(templateId, updatedStats);
    
    // Update cached template
    const template = this.templateCache.get(templateId);
    if (template) {
      template.usage = updatedStats;
    }
  }

  private calculateNewSuccessRate(currentStats: TemplateUsageStats, success: boolean): number {
    if (!currentStats.successRate) {
      return success ? 1.0 : 0.0;
    }
    
    const previousSuccesses = currentStats.successRate * (currentStats.timesUsed - 1);
    const newSuccesses = previousSuccesses + (success ? 1 : 0);
    
    return newSuccesses / currentStats.timesUsed;
  }

  private calculateOverallAverageRating(templates: TaskTemplate[]): number {
    const templatesWithRating = templates.filter(t => t.usage.averageRating !== undefined);
    if (templatesWithRating.length === 0) return 0;
    
    const totalRating = templatesWithRating.reduce((sum, t) => sum + (t.usage.averageRating || 0), 0);
    return totalRating / templatesWithRating.length;
  }

  private generateCategoryBreakdown(templates: TaskTemplate[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    templates.forEach(template => {
      breakdown[template.category] = (breakdown[template.category] || 0) + 1;
    });
    
    return breakdown;
  }

  private getMostUsedTemplates(templates: TaskTemplate[], limit: number): TaskTemplate[] {
    return templates
      .sort((a, b) => b.usage.timesUsed - a.usage.timesUsed)
      .slice(0, limit);
  }

  private getRecentTemplateActivity(templates: TaskTemplate[]): any[] {
    return templates
      .filter(t => t.usage.lastUsed)
      .sort((a, b) => new Date(b.usage.lastUsed!).getTime() - new Date(a.usage.lastUsed!).getTime())
      .slice(0, 10)
      .map(t => ({
        templateId: t.id,
        name: t.name,
        lastUsed: t.usage.lastUsed,
        timesUsed: t.usage.timesUsed
      }));
  }

  private async publishTemplateAppliedEvent(
    template: TaskTemplate, 
    request: ApplyTaskTemplateRequest, 
    response: ApplyTaskTemplateResponse
  ): Promise<void> {
    const aiProcessing: AIProcessingMetadata = {
      model: 'template-application-v1',
      processingTime: 800,
      confidenceScore: 0.9,
      dataQuality: {
        score: 0.95,
        issues: []
      }
    };

    const payload: TaskTemplateAppliedPayload = {
      eventId: uuidv4(),
      eventType: 'task.template_applied',
      timestamp: new Date().toISOString(),
      source: 'task-template-service',
      version: '1.0',
      userId: 'template-system',
      correlationId: uuidv4(),
      data: {
        taskId: response.createdTasks[0]?.id || 'unknown',
        taskTitle: response.createdTasks[0]?.title || 'Template Application',
        templateId: template.id,
        template: {
          name: template.name,
          version: template.audit.version.toString(),
          category: template.category as any,
          description: template.description,
          matchingCriteria: {
            taskType: template.category,
            keywords: template.tags,
            complexity: 'medium',
            domain: 'general',
            matchScore: 0.85
          }
        },
        application: {
          changes: {
            structure: [
              {
                field: 'title',
                oldValue: undefined,
                newValue: response.createdTasks[0]?.title || '',
                reason: 'Template application'
              }
            ],
            subtasks: {
              added: response.createdTasks.slice(1).map(task => ({
                title: task.title,
                description: task.description,
                type: task.type,
                priority: task.priority,
                estimatedHours: task.estimatedHours
              })),
              modified: []
            },
            checklists: [],
            acceptanceCriteria: [],
            testCases: [],
            documentation: []
          },
          customizations: {
            applied: [
              {
                type: 'variable_substitution',
                description: 'Applied template variables',
                reason: 'Template customization'
              }
            ],
            skipped: []
          },
          validation: {
            completeness: 0.95,
            consistency: 0.9,
            issues: []
          }
        },
        aiProcessing,
        project: response.createdTasks[0]?.project || undefined,
        assignee: response.createdTasks[0]?.assignee || undefined
      }
    };

    await this.eventService.publish('task.template_applied', payload);
  }

  /**
   * Get template cache statistics
   * @returns Object containing cache statistics
   */
  getCacheStatistics(): any {
    return {
      cachedTemplates: this.templateCache.size,
      usageStatistics: this.usageStatistics.size,
      totalCacheMemory: this.templateCache.size * 1024 // Rough estimate
    };
  }

  /**
   * Clear template cache (for testing purposes)
   */
  clearCache(): void {
    this.templateCache.clear();
    this.usageStatistics.clear();
    logger.info('Template cache cleared');
  }
}