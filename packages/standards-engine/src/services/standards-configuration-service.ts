import {
  IStandardsConfigurationService,
  TeamStandards,
  StandardsConfigurationRequest,
  StandardsTemplate,
  EnforcementLevelRequest,
  StandardsCategory,
  Language,
  EnforcementLevel
} from '../types/standards-types.js';
import { MockDataService } from './mock-data-service.js';

/**
 * Standards Configuration Service
 * Handles team standards management, templates, and configuration
 */
export class StandardsConfigurationService implements IStandardsConfigurationService {
  private mockDataService: MockDataService;
  private teamStandardsCache: Map<string, TeamStandards> = new Map();
  private teamEnforcementLevels: Map<string, EnforcementLevel> = new Map();

  constructor() {
    this.mockDataService = new MockDataService();
    // Initialize some default enforcement levels
    this.teamEnforcementLevels.set('550e8400-e29b-41d4-a716-446655440000', EnforcementLevel.WARNING);
    this.teamEnforcementLevels.set('6ba7b810-9dad-11d1-80b4-00c04fd430c8', EnforcementLevel.BLOCKING);
  }

  /**
   * Get team-specific standards, optionally filtered by category
   */
  async getTeamStandards(teamId: string, category?: StandardsCategory): Promise<TeamStandards> {
    // Simulate database lookup delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(100, 300));

    // Check cache first
    let teamStandards = this.teamStandardsCache.get(teamId);
    
    if (!teamStandards) {
      // Generate team standards if not cached
      teamStandards = this.mockDataService.generateTeamStandards(teamId);
      
      // Apply any custom enforcement level
      const enforcementLevel = this.teamEnforcementLevels.get(teamId);
      if (enforcementLevel) {
        teamStandards.enforcementLevel = enforcementLevel;
      }
      
      this.teamStandardsCache.set(teamId, teamStandards);
    }

    // Filter by category if specified
    if (category) {
      const filteredStandards = {
        ...teamStandards,
        standards: teamStandards.standards.filter(std => std.category === category),
      };
      
      // Recalculate total rules for filtered standards
      filteredStandards.totalRules = filteredStandards.standards.reduce(
        (total, std) => total + std.rules.length,
        0
      );
      
      return filteredStandards;
    }

    return teamStandards;
  }

  /**
   * Configure or update standards for a team
   */
  async configureStandards(request: StandardsConfigurationRequest): Promise<{ configurationId: string }> {
    // Simulate configuration processing delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(300, 800));

    const configurationId = this.mockDataService.generateUUID();

    // Convert input standards to full standard objects
    const standards = request.standards.map(input => ({
      id: this.mockDataService.generateUUID(),
      name: input.name,
      description: input.description,
      category: input.category,
      rules: input.rules.map(ruleInput => ({
        ...ruleInput,
        examples: ruleInput.examples || {},
        autoFixable: ruleInput.autoFixable || false,
        tags: ruleInput.tags || []
      })),
      active: input.active !== false,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // If inheriting from template, merge with template standards
    if (request.inheritFromTemplate) {
      const templates = await this.getTemplates();
      const template = templates.find(t => t.id === request.inheritFromTemplate);
      
      if (template) {
        // Merge template standards with new standards (ensure type compatibility)
        const mappedTemplateStandards = template.standards.map(std => ({
          id: std.id,
          name: std.name,
          description: std.description,
          category: std.category,
          rules: std.rules.map(rule => ({
            ...rule,
            examples: rule.examples || {},
            autoFixable: rule.autoFixable || false,
            tags: rule.tags || []
          })),
          active: std.active,
          version: std.version || '1.0.0',
          createdAt: std.createdAt || new Date().toISOString(),
          updatedAt: std.updatedAt || new Date().toISOString()
        }));
        standards.push(...mappedTemplateStandards);
      }
    }

    // Create new team standards configuration
    const teamStandards: TeamStandards = {
      teamId: request.teamId,
      standards,
      enforcementLevel: request.enforcementLevel || EnforcementLevel.WARNING,
      lastUpdated: new Date().toISOString(),
      totalRules: standards.reduce((total, std) => total + std.rules.length, 0)
    };

    // Update cache and enforcement level tracking
    this.teamStandardsCache.set(request.teamId, teamStandards);
    
    if (request.enforcementLevel) {
      this.teamEnforcementLevels.set(request.teamId, request.enforcementLevel);
    }

    // Simulate sending notification event
    await this.notifyStandardsUpdated(request.teamId, 'configuration_updated', configurationId);

    return { configurationId };
  }

  /**
   * Get available standards templates
   */
  async getTemplates(language?: Language, framework?: string): Promise<StandardsTemplate[]> {
    // Simulate template lookup delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(100, 400));

    return this.mockDataService.generateStandardsTemplates(language, framework);
  }

  /**
   * Delete a specific standards rule
   */
  async deleteRule(ruleId: string, teamId: string): Promise<void> {
    // Simulate deletion processing delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(200, 500));

    const teamStandards = this.teamStandardsCache.get(teamId);
    
    if (!teamStandards) {
      throw new Error(`Team standards not found for team: ${teamId}`);
    }

    // Find and remove the rule
    let ruleFound = false;
    for (const standard of teamStandards.standards) {
      const ruleIndex = standard.rules.findIndex(rule => rule.id === ruleId);
      if (ruleIndex !== -1) {
        standard.rules.splice(ruleIndex, 1);
        ruleFound = true;
        break;
      }
    }

    if (!ruleFound) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Update total rules count
    teamStandards.totalRules = teamStandards.standards.reduce(
      (total, std) => total + std.rules.length,
      0
    );
    
    teamStandards.lastUpdated = new Date().toISOString();

    // Update cache
    this.teamStandardsCache.set(teamId, teamStandards);

    // Notify of rule deletion
    await this.notifyStandardsUpdated(teamId, 'rule_deleted', ruleId);
  }

  /**
   * Set enforcement level for a team
   */
  async setEnforcementLevel(request: EnforcementLevelRequest): Promise<void> {
    // Simulate enforcement level update delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(100, 300));

    // Update team enforcement level
    this.teamEnforcementLevels.set(request.teamId, request.level);

    // Update cached team standards if present
    const teamStandards = this.teamStandardsCache.get(request.teamId);
    if (teamStandards) {
      teamStandards.enforcementLevel = request.level;
      teamStandards.lastUpdated = new Date().toISOString();
      this.teamStandardsCache.set(request.teamId, teamStandards);
    }

    // Handle rule-specific overrides
    if (request.rulesOverride && request.rulesOverride.length > 0) {
      await this.applyRuleOverrides(request.teamId, request.rulesOverride);
    }

    // Notify of enforcement level change
    await this.notifyStandardsUpdated(request.teamId, 'enforcement_changed', request.level);
  }

  /**
   * Apply template to team standards
   */
  async applyTemplate(teamId: string, templateId: string, inheritanceMode: 'replace' | 'merge' | 'overlay' = 'merge'): Promise<{ appliedRules: number }> {
    // Simulate template application delay
    await this.mockDataService.delay(this.mockDataService.randomBetween(400, 800));

    const templates = await this.getTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let teamStandards = this.teamStandardsCache.get(teamId);
    
    if (!teamStandards) {
      // Create new team standards if none exist
      teamStandards = {
        teamId,
        standards: [],
        enforcementLevel: EnforcementLevel.WARNING,
        lastUpdated: new Date().toISOString(),
        totalRules: 0
      };
    }

    let appliedRules = 0;

    switch (inheritanceMode) {
      case 'replace':
        // Replace all existing standards with template standards
        teamStandards.standards = [...template.standards];
        appliedRules = template.standards.reduce((total, std) => total + std.rules.length, 0);
        break;

      case 'merge':
        // Merge template standards with existing standards
        const existingStandardIds = new Set(teamStandards.standards.map(s => s.id));
        const newStandards = template.standards.filter(s => !existingStandardIds.has(s.id));
        teamStandards.standards.push(...newStandards);
        appliedRules = newStandards.reduce((total, std) => total + std.rules.length, 0);
        break;

      case 'overlay':
        // Update existing standards and add new ones
        for (const templateStandard of template.standards) {
          const existingIndex = teamStandards.standards.findIndex(s => s.id === templateStandard.id);
          if (existingIndex !== -1) {
            // Update existing standard
            teamStandards.standards[existingIndex] = templateStandard;
          } else {
            // Add new standard
            teamStandards.standards.push(templateStandard);
          }
          appliedRules += templateStandard.rules.length;
        }
        break;
    }

    // Update metadata
    teamStandards.totalRules = teamStandards.standards.reduce(
      (total, std) => total + std.rules.length,
      0
    );
    teamStandards.lastUpdated = new Date().toISOString();

    // Update cache
    this.teamStandardsCache.set(teamId, teamStandards);

    // Notify of template application
    await this.notifyStandardsUpdated(teamId, 'template_applied', templateId);

    return { appliedRules };
  }

  /**
   * Get team configuration summary
   */
  async getTeamConfigurationSummary(teamId: string): Promise<{
    standardsCount: number;
    rulesCount: number;
    enforcementLevel: EnforcementLevel;
    lastUpdated: string;
    activeCategories: StandardsCategory[];
  }> {
    const teamStandards = await this.getTeamStandards(teamId);
    
    const activeCategories = Array.from(
      new Set(teamStandards.standards.filter(s => s.active).map(s => s.category))
    );

    return {
      standardsCount: teamStandards.standards.length,
      rulesCount: teamStandards.totalRules,
      enforcementLevel: teamStandards.enforcementLevel,
      lastUpdated: teamStandards.lastUpdated || new Date().toISOString(),
      activeCategories
    };
  }

  /**
   * Validate standards configuration
   */
  async validateConfiguration(request: StandardsConfigurationRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate team ID
    if (!request.teamId || !this.isValidUUID(request.teamId)) {
      errors.push('Invalid team ID format');
    }

    // Validate standards
    if (!request.standards || request.standards.length === 0) {
      errors.push('At least one standard must be provided');
    } else {
      for (let i = 0; i < request.standards.length; i++) {
        const standard = request.standards[i];
        
        if (!standard.name || standard.name.trim().length === 0) {
          errors.push(`Standard at index ${i}: Name is required`);
        }

        if (!standard.rules || standard.rules.length === 0) {
          errors.push(`Standard at index ${i}: At least one rule is required`);
        } else {
          for (let j = 0; j < standard.rules.length; j++) {
            const rule = standard.rules[j];
            
            if (!rule.id || rule.id.trim().length === 0) {
              errors.push(`Standard at index ${i}, rule at index ${j}: Rule ID is required`);
            }
            
            if (!rule.description || rule.description.trim().length === 0) {
              errors.push(`Standard at index ${i}, rule at index ${j}: Description is required`);
            }

            // Warning for rules without patterns
            if (!rule.pattern) {
              warnings.push(`Standard at index ${i}, rule at index ${j}: No pattern defined for validation`);
            }
          }
        }
      }
    }

    // Validate inheritance template if specified
    if (request.inheritFromTemplate) {
      const templates = await this.getTemplates();
      const templateExists = templates.some(t => t.id === request.inheritFromTemplate);
      if (!templateExists) {
        errors.push(`Template not found: ${request.inheritFromTemplate}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Apply rule-specific enforcement overrides
   */
  private async applyRuleOverrides(teamId: string, overrides: Array<{ ruleId: string; level: EnforcementLevel }>): Promise<void> {
    const teamStandards = this.teamStandardsCache.get(teamId);
    
    if (!teamStandards) {
      return;
    }

    // Apply overrides (in a real implementation, this might involve adding metadata to rules)
    // For now, we'll simulate this by logging the overrides
    for (const override of overrides) {
      // Find the rule and apply override logic
      const ruleFound = teamStandards.standards.some(standard =>
        standard.rules.some(rule => rule.id === override.ruleId)
      );
      
      if (!ruleFound) {
        console.warn(`Rule not found for override: ${override.ruleId}`);
      }
    }
  }

  /**
   * Send notification about standards updates
   */
  private async notifyStandardsUpdated(teamId: string, updateType: string, identifier: string): Promise<void> {
    // In a real implementation, this would publish an event
    // For now, we'll simulate the notification
    console.log(`Standards updated for team ${teamId}: ${updateType} - ${identifier}`);
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Clear team standards cache (useful for testing)
   */
  clearCache(): void {
    this.teamStandardsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; teams: string[] } {
    return {
      size: this.teamStandardsCache.size,
      teams: Array.from(this.teamStandardsCache.keys())
    };
  }
}