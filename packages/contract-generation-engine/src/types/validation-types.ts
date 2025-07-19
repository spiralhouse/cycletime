import { z } from 'zod';

export const ValidationSeverityEnum = z.enum(['error', 'warning', 'info']);
export const ValidationTypeEnum = z.enum(['improvement', 'optimization', 'best-practice']);
export const ValidationImpactEnum = z.enum(['low', 'medium', 'high']);
export const ValidationEffortEnum = z.enum(['low', 'medium', 'high']);

export const ValidationOptionsSchema = z.object({
  strict: z.boolean().default(false),
  rules: z.array(z.string()).optional(),
  skipRules: z.array(z.string()).optional(),
});

export const ValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.string().optional(),
  severity: ValidationSeverityEnum,
});

export const ValidationWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.string().optional(),
  recommendation: z.string().optional(),
});

export const ValidationSuggestionSchema = z.object({
  type: ValidationTypeEnum,
  message: z.string(),
  impact: ValidationImpactEnum,
  effort: ValidationEffortEnum,
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema),
  score: z.number().min(0).max(100),
  suggestions: z.array(ValidationSuggestionSchema).optional(),
});

// Type definitions
export type ValidationSeverity = z.infer<typeof ValidationSeverityEnum>;
export type ValidationType = z.infer<typeof ValidationTypeEnum>;
export type ValidationImpact = z.infer<typeof ValidationImpactEnum>;
export type ValidationEffort = z.infer<typeof ValidationEffortEnum>;
export type ValidationOptions = z.infer<typeof ValidationOptionsSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>;
export type ValidationSuggestion = z.infer<typeof ValidationSuggestionSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Validation rule definitions
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'content' | 'style' | 'security' | 'performance';
  severity: ValidationSeverity;
  enabled: boolean;
  validate: (contract: any) => ValidationError[];
}

// Pre-defined validation rules
export const VALIDATION_RULES: Record<string, ValidationRule> = {
  'openapi-version': {
    id: 'openapi-version',
    name: 'OpenAPI Version',
    description: 'Ensure OpenAPI specification uses supported version',
    category: 'structure',
    severity: 'error',
    enabled: true,
    validate: (contract: any) => {
      const errors: ValidationError[] = [];
      if (contract.openapi && !contract.openapi.match(/^3\.[0-9]+\.[0-9]+$/)) {
        errors.push({
          code: 'openapi-version',
          message: 'OpenAPI version must be 3.x.x',
          path: 'openapi',
          severity: 'error',
        });
      }
      return errors;
    },
  },
  'required-info': {
    id: 'required-info',
    name: 'Required Info',
    description: 'Ensure required information fields are present',
    category: 'structure',
    severity: 'error',
    enabled: true,
    validate: (contract: any) => {
      const errors: ValidationError[] = [];
      if (!contract.info) {
        errors.push({
          code: 'required-info',
          message: 'Info object is required',
          path: 'info',
          severity: 'error',
        });
      } else {
        if (!contract.info.title) {
          errors.push({
            code: 'required-info-title',
            message: 'Info title is required',
            path: 'info.title',
            severity: 'error',
          });
        }
        if (!contract.info.version) {
          errors.push({
            code: 'required-info-version',
            message: 'Info version is required',
            path: 'info.version',
            severity: 'error',
          });
        }
      }
      return errors;
    },
  },
  'operation-ids': {
    id: 'operation-ids',
    name: 'Operation IDs',
    description: 'Ensure all operations have unique operationId',
    category: 'structure',
    severity: 'warning',
    enabled: true,
    validate: (contract: any) => {
      const errors: ValidationError[] = [];
      const operationIds = new Set<string>();
      
      if (contract.paths) {
        Object.keys(contract.paths).forEach(path => {
          Object.keys(contract.paths[path]).forEach(method => {
            const operation = contract.paths[path][method];
            if (operation.operationId) {
              if (operationIds.has(operation.operationId)) {
                errors.push({
                  code: 'duplicate-operation-id',
                  message: `Duplicate operationId: ${operation.operationId}`,
                  path: `paths.${path}.${method}.operationId`,
                  severity: 'error',
                });
              } else {
                operationIds.add(operation.operationId);
              }
            } else {
              errors.push({
                code: 'missing-operation-id',
                message: `Missing operationId for ${method.toUpperCase()} ${path}`,
                path: `paths.${path}.${method}`,
                severity: 'warning',
              });
            }
          });
        });
      }
      
      return errors;
    },
  },
  'response-schemas': {
    id: 'response-schemas',
    name: 'Response Schemas',
    description: 'Ensure all responses have proper schema definitions',
    category: 'content',
    severity: 'warning',
    enabled: true,
    validate: (contract: any) => {
      const errors: ValidationError[] = [];
      
      if (contract.paths) {
        Object.keys(contract.paths).forEach(path => {
          Object.keys(contract.paths[path]).forEach(method => {
            const operation = contract.paths[path][method];
            if (operation.responses) {
              Object.keys(operation.responses).forEach(statusCode => {
                const response = operation.responses[statusCode];
                if (response.content) {
                  Object.keys(response.content).forEach(mediaType => {
                    const mediaTypeObj = response.content[mediaType];
                    if (!mediaTypeObj.schema) {
                      errors.push({
                        code: 'missing-response-schema',
                        message: `Missing schema for ${statusCode} response in ${method.toUpperCase()} ${path}`,
                        path: `paths.${path}.${method}.responses.${statusCode}.content.${mediaType}`,
                        severity: 'warning',
                      });
                    }
                  });
                }
              });
            }
          });
        });
      }
      
      return errors;
    },
  },
  'security-schemes': {
    id: 'security-schemes',
    name: 'Security Schemes',
    description: 'Ensure proper security scheme definitions',
    category: 'security',
    severity: 'warning',
    enabled: true,
    validate: (contract: any) => {
      const errors: ValidationError[] = [];
      
      if (contract.security && contract.security.length > 0) {
        if (!contract.components?.securitySchemes) {
          errors.push({
            code: 'missing-security-schemes',
            message: 'Security requirements defined but no security schemes found',
            path: 'components.securitySchemes',
            severity: 'error',
          });
        }
      }
      
      return errors;
    },
  },
};

// Contract validation context
export interface ValidationContext {
  contractId: string;
  serviceName: string;
  serviceType: string;
  timestamp: Date;
  rules: ValidationRule[];
  options: ValidationOptions;
}