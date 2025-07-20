import Ajv from 'ajv';
import { OpenAPIV3 } from 'openapi-types';
import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  ValidationSuggestion,
  ValidationOptions,
  ValidationRule,
  VALIDATION_RULES,
  ValidationContext
} from '../types/validation-types';
import { logger } from '@cycletime/shared-utils';

export class ValidationEngine {
  private ajv: Ajv;
  private rules: Map<string, ValidationRule>;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.rules = new Map();
    
    // Load default validation rules
    Object.values(VALIDATION_RULES).forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  async validateContract(
    contract: OpenAPIV3.Document | any,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const context: ValidationContext = {
      contractId: 'validation-' + Date.now(),
      serviceName: contract.info?.title || 'Unknown',
      serviceType: 'rest-api',
      timestamp: new Date(),
      rules: this.getEnabledRules(options),
      options,
    };

    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const suggestions: ValidationSuggestion[] = [];

      // Run structural validation
      const structuralErrors = await this.validateStructure(contract, context);
      errors.push(...structuralErrors);

      // Run content validation
      const contentErrors = await this.validateContent(contract, context);
      errors.push(...contentErrors);

      // Run custom rule validation
      const ruleErrors = await this.validateRules(contract, context);
      errors.push(...ruleErrors);

      // Generate suggestions
      const contractSuggestions = this.generateSuggestions(contract, context);
      suggestions.push(...contractSuggestions);

      // Calculate validation score
      const score = this.calculateValidationScore(errors, warnings, suggestions);

      return {
        valid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
        warnings,
        score,
        suggestions,
      };
    } catch (error) {
      logger.error('Contract validation failed' + ": " + error.message);
      return {
        valid: false,
        errors: [{
          code: 'validation-error',
          message: 'Validation process failed',
          severity: 'error',
        }],
        warnings: [],
        score: 0,
        suggestions: [],
      };
    }
  }

  private async validateStructure(
    contract: OpenAPIV3.Document | any,
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check OpenAPI version
    if (contract.openapi && !contract.openapi.match(/^3\.[0-9]+\.[0-9]+$/)) {
      errors.push({
        code: 'invalid-openapi-version',
        message: `Invalid OpenAPI version: ${contract.openapi}. Expected 3.x.x`,
        path: 'openapi',
        severity: 'error',
      });
    }

    // Check required fields
    if (!contract.info) {
      errors.push({
        code: 'missing-info',
        message: 'Info object is required',
        path: 'info',
        severity: 'error',
      });
    } else {
      if (!contract.info.title) {
        errors.push({
          code: 'missing-title',
          message: 'Info title is required',
          path: 'info.title',
          severity: 'error',
        });
      }
      if (!contract.info.version) {
        errors.push({
          code: 'missing-version',
          message: 'Info version is required',
          path: 'info.version',
          severity: 'error',
        });
      }
    }

    // Check paths
    if (!contract.paths || Object.keys(contract.paths).length === 0) {
      errors.push({
        code: 'missing-paths',
        message: 'At least one path is required',
        path: 'paths',
        severity: 'error',
      });
    }

    return errors;
  }

  private async validateContent(
    contract: OpenAPIV3.Document | any,
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (contract.paths) {
      for (const [path, pathItem] of Object.entries(contract.paths)) {
        if (typeof pathItem === 'object' && pathItem !== null) {
          for (const [method, operation] of Object.entries(pathItem)) {
            if (typeof operation === 'object' && operation !== null) {
              // Check operation ID
              if (!(operation as any).operationId) {
                errors.push({
                  code: 'missing-operation-id',
                  message: `Missing operationId for ${method.toUpperCase()} ${path}`,
                  path: `paths.${path}.${method}`,
                  severity: 'warning',
                });
              }

              // Check responses
              if (!(operation as any).responses) {
                errors.push({
                  code: 'missing-responses',
                  message: `Missing responses for ${method.toUpperCase()} ${path}`,
                  path: `paths.${path}.${method}.responses`,
                  severity: 'error',
                });
              }

              // Check 200 response
              if ((operation as any).responses && !(operation as any).responses['200']) {
                errors.push({
                  code: 'missing-success-response',
                  message: `Missing 200 response for ${method.toUpperCase()} ${path}`,
                  path: `paths.${path}.${method}.responses.200`,
                  severity: 'warning',
                });
              }
            }
          }
        }
      }
    }

    return errors;
  }

  private async validateRules(
    contract: OpenAPIV3.Document | any,
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const rule of context.rules) {
      if (!rule.enabled) continue;

      try {
        const ruleErrors = rule.validate(contract);
        errors.push(...ruleErrors);
      } catch (error) {
        logger.warn('Rule validation failed', { rule: rule.id, errorMessage: error.message });
        errors.push({
          code: 'rule-validation-error',
          message: `Rule validation failed: ${rule.id}`,
          severity: 'warning',
        });
      }
    }

    return errors;
  }

  private generateSuggestions(
    contract: OpenAPIV3.Document | any,
    context: ValidationContext
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // Suggest adding examples
    if (contract.paths) {
      let missingExamples = 0;
      for (const [path, pathItem] of Object.entries(contract.paths)) {
        if (typeof pathItem === 'object' && pathItem !== null) {
          for (const [method, operation] of Object.entries(pathItem)) {
            if (typeof operation === 'object' && operation !== null) {
              const responses = (operation as any).responses;
              if (responses && responses['200'] && responses['200'].content) {
                const content = responses['200'].content['application/json'];
                if (content && !content.examples && !content.example) {
                  missingExamples++;
                }
              }
            }
          }
        }
      }

      if (missingExamples > 0) {
        suggestions.push({
          type: 'improvement',
          message: `Add response examples to ${missingExamples} endpoint(s) for better documentation`,
          impact: 'medium',
          effort: 'low',
        });
      }
    }

    // Suggest adding descriptions
    if (contract.info && (!contract.info.description || contract.info.description.length < 20)) {
      suggestions.push({
        type: 'improvement',
        message: 'Add a more detailed description to help users understand the API',
        impact: 'medium',
        effort: 'low',
      });
    }

    // Suggest adding tags
    if (contract.paths) {
      let untaggedOperations = 0;
      for (const [path, pathItem] of Object.entries(contract.paths)) {
        if (typeof pathItem === 'object' && pathItem !== null) {
          for (const [method, operation] of Object.entries(pathItem)) {
            if (typeof operation === 'object' && operation !== null) {
              if (!(operation as any).tags || (operation as any).tags.length === 0) {
                untaggedOperations++;
              }
            }
          }
        }
      }

      if (untaggedOperations > 0) {
        suggestions.push({
          type: 'improvement',
          message: `Add tags to ${untaggedOperations} operation(s) for better organization`,
          impact: 'low',
          effort: 'low',
        });
      }
    }

    // Suggest security improvements
    if (!contract.security || contract.security.length === 0) {
      suggestions.push({
        type: 'best-practice',
        message: 'Add security requirements to protect your API endpoints',
        impact: 'high',
        effort: 'medium',
      });
    }

    return suggestions;
  }

  private calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): number {
    let score = 100;

    // Deduct points for errors
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    const infoCount = errors.filter(e => e.severity === 'info').length;

    score -= errorCount * 20; // 20 points per error
    score -= warningCount * 10; // 10 points per warning
    score -= infoCount * 5; // 5 points per info

    // Deduct points for missing best practices
    const bestPracticeCount = suggestions.filter(s => s.type === 'best-practice').length;
    score -= bestPracticeCount * 5; // 5 points per best practice

    return Math.max(0, Math.min(100, score));
  }

  private getEnabledRules(options: ValidationOptions): ValidationRule[] {
    const rules = Array.from(this.rules.values());
    
    if (options.rules) {
      return rules.filter(rule => options.rules!.includes(rule.id));
    }
    
    if (options.skipRules) {
      return rules.filter(rule => !options.skipRules!.includes(rule.id));
    }
    
    return rules.filter(rule => rule.enabled);
  }

  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  async validateAsyncAPI(asyncApiSpec: any, options: ValidationOptions = {}): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check AsyncAPI version
    if (!asyncApiSpec.asyncapi || !asyncApiSpec.asyncapi.match(/^2\.[0-9]+\.[0-9]+$/)) {
      errors.push({
        code: 'invalid-asyncapi-version',
        message: `Invalid AsyncAPI version: ${asyncApiSpec.asyncapi}. Expected 2.x.x`,
        path: 'asyncapi',
        severity: 'error',
      });
    }

    // Check required fields
    if (!asyncApiSpec.info) {
      errors.push({
        code: 'missing-info',
        message: 'Info object is required',
        path: 'info',
        severity: 'error',
      });
    }

    if (!asyncApiSpec.channels || Object.keys(asyncApiSpec.channels).length === 0) {
      errors.push({
        code: 'missing-channels',
        message: 'At least one channel is required',
        path: 'channels',
        severity: 'error',
      });
    }

    const score = this.calculateValidationScore(errors, warnings, suggestions);

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      score,
      suggestions,
    };
  }
}