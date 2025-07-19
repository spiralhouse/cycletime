import { logger } from '@cycletime/shared-utils';
import { EventService } from './event-service';
import { MockDataService } from './mock-data-service';
import { NotificationTemplate, TemplatePreview } from '../types';

export class TemplateService {
  constructor(
    private eventService: EventService,
    private mockDataService: MockDataService
  ) {}

  async createTemplate(templateData: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      const template = this.mockDataService.addTemplate({
        ...templateData,
        variables: this.extractVariables(templateData.content || ''),
      });

      await this.eventService.publishTemplateCreated(template);

      logger.info({
        templateId: template.id,
        name: template.name,
        channel: template.channel,
        category: template.category,
      }, 'Template created');

      return template;
    } catch (error) {
      logger.error({
        error: error.message,
        templateData,
      }, 'Failed to create template');
      throw error;
    }
  }

  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | undefined> {
    try {
      const original = this.mockDataService.getTemplateById(templateId);
      if (!original) {
        return undefined;
      }

      if (updates.content) {
        updates.variables = this.extractVariables(updates.content);
      }

      const template = this.mockDataService.updateTemplate(templateId, updates);

      if (template) {
        const changes = this.getChanges(original, template);
        await this.eventService.publishTemplateUpdated(template, changes);

        logger.info({
          templateId,
          name: template.name,
          changes,
        }, 'Template updated');
      }

      return template;
    } catch (error) {
      logger.error({
        error: error.message,
        templateId,
        updates,
      }, 'Failed to update template');
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const template = this.mockDataService.getTemplateById(templateId);
      if (!template) {
        return false;
      }

      const success = this.mockDataService.deleteTemplate(templateId);

      if (success) {
        await this.eventService.publishTemplateDeleted(template);

        logger.info({
          templateId,
          name: template.name,
        }, 'Template deleted');
      }

      return success;
    } catch (error) {
      logger.error({
        error: error.message,
        templateId,
      }, 'Failed to delete template');
      throw error;
    }
  }

  async previewTemplate(templateId: string, data: Record<string, any>): Promise<TemplatePreview> {
    try {
      const template = this.mockDataService.getTemplateById(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const preview = this.renderTemplate(template, data);

      logger.debug({
        templateId,
        dataKeys: Object.keys(data),
        missingVariables: preview.missingVariables,
      }, 'Template preview generated');

      return preview;
    } catch (error) {
      logger.error({
        error: error.message,
        templateId,
        data,
      }, 'Failed to preview template');
      throw error;
    }
  }

  private extractVariables(content: string): string[] {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }

  private renderTemplate(template: NotificationTemplate, data: Record<string, any>): TemplatePreview {
    const missingVariables: string[] = [];
    const providedVariables: string[] = [];

    // Check for missing variables
    for (const variable of template.variables) {
      if (data[variable] !== undefined) {
        providedVariables.push(variable);
      } else {
        missingVariables.push(variable);
      }
    }

    // Simple template rendering (replace {{variable}} with values)
    let renderedSubject = template.subject;
    let renderedContent = template.content;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      renderedSubject = renderedSubject.replace(regex, String(value));
      renderedContent = renderedContent.replace(regex, String(value));
    }

    return {
      subject: renderedSubject,
      content: renderedContent,
      variables: providedVariables,
      missingVariables,
    };
  }

  private getChanges(original: NotificationTemplate, updated: NotificationTemplate): string[] {
    const changes: string[] = [];

    if (original.name !== updated.name) changes.push('name');
    if (original.description !== updated.description) changes.push('description');
    if (original.subject !== updated.subject) changes.push('subject');
    if (original.content !== updated.content) changes.push('content');
    if (original.isActive !== updated.isActive) changes.push('isActive');
    if (original.category !== updated.category) changes.push('category');

    return changes;
  }
}