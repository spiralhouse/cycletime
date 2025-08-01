/**
 * JCVD Provider Configuration Validator
 * Schema-based validation for provider configurations with comprehensive error reporting
 */

import type {
  ProviderConfig,
  ProviderType,
  SQLiteProviderConfig,
  LinearProviderConfig,
  GitHubProviderConfig,
  JiraProviderConfig
} from '../types.js'

// =============================================================================
// Validation Schema Types
// =============================================================================

interface ValidationRule {
  /** Field name being validated */
  field: string
  /** Validation type */
  type: 'required' | 'string' | 'number' | 'boolean' | 'url' | 'email' | 'path' | 'custom'
  /** Custom validation function */
  validator?: (value: any) => boolean | string
  /** Error message for validation failure */
  message?: string
  /** Minimum value for numbers or minimum length for strings */
  min?: number
  /** Maximum value for numbers or maximum length for strings */
  max?: number
  /** Regular expression pattern for strings */
  pattern?: RegExp
  /** Allowed values for enum-like validation */
  allowedValues?: any[]
}

interface ValidationSchema {
  /** Rules that apply to all provider types */
  common: ValidationRule[]
  /** Type-specific validation rules */
  typeSpecific: Record<ProviderType, ValidationRule[]>
}

interface ValidationResult {
  /** Validation passed */
  isValid: boolean
  /** List of validation errors */
  errors: ValidationError[]
  /** List of validation warnings */
  warnings: ValidationWarning[]
  /** Sanitized/normalized configuration */
  sanitizedConfig?: ProviderConfig
}

interface ValidationError {
  /** Field that failed validation */
  field: string
  /** Error message */
  message: string
  /** Provided value that failed */
  value: any
  /** Validation rule that failed */
  rule: string
}

interface ValidationWarning {
  /** Field with potential issue */
  field: string
  /** Warning message */
  message: string
  /** Provided value */
  value: any
  /** Suggested correction */
  suggestion?: string
}

// =============================================================================
// Configuration Validator Implementation
// =============================================================================

/**
 * Comprehensive provider configuration validator with schema enforcement
 */
export class ProviderConfigValidator {
  private schema: ValidationSchema

  constructor() {
    this.schema = this.createValidationSchema()
  }

  // -------------------------------------------------------------------------
  // Main Validation Methods
  // -------------------------------------------------------------------------

  /**
   * Validate provider configuration with comprehensive checking
   */
  validate(config: ProviderConfig): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    let sanitizedConfig: ProviderConfig = { ...config }

    try {
      // Validate common fields
      this.validateRules(config, this.schema.common, errors, warnings)

      // Validate type-specific fields
      if (config.type && this.schema.typeSpecific[config.type]) {
        this.validateRules(config, this.schema.typeSpecific[config.type], errors, warnings)
      } else if (config.type) {
        errors.push({
          field: 'type',
          message: `Unsupported provider type: ${config.type}`,
          value: config.type,
          rule: 'type_support'
        })
      }

      // Perform cross-field validation
      this.performCrossFieldValidation(config, errors, warnings)

      // Sanitize and normalize config
      sanitizedConfig = this.sanitizeConfig(config, warnings)

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedConfig: errors.length === 0 ? sanitizedConfig : undefined
      }

    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Validation process failed: ${error.message}`,
        value: null,
        rule: 'validation_error'
      })

      return {
        isValid: false,
        errors,
        warnings
      }
    }
  }

  /**
   * Validate specific provider type configuration
   */
  validateProviderType(config: ProviderConfig, type: ProviderType): ValidationResult {
    // Create a copy with the specified type for validation
    const typedConfig = { ...config, type }
    return this.validate(typedConfig)
  }

  /**
   * Quick validation for basic requirements
   */
  quickValidate(config: ProviderConfig): { isValid: boolean; errors: string[] } {
    const result = this.validate(config)
    return {
      isValid: result.isValid,
      errors: result.errors.map(error => `${error.field}: ${error.message}`)
    }
  }

  // -------------------------------------------------------------------------
  // Schema Creation
  // -------------------------------------------------------------------------

  /**
   * Create comprehensive validation schema
   */
  private createValidationSchema(): ValidationSchema {
    return {
      common: [
        {
          field: 'type',
          type: 'required',
          message: 'Provider type is required'
        },
        {
          field: 'type',
          type: 'string',
          allowedValues: ['sqlite', 'linear', 'github', 'jira'],
          message: 'Provider type must be one of: sqlite, linear, github, jira'
        },
        {
          field: 'id',
          type: 'required',
          message: 'Provider ID is required'
        },
        {
          field: 'id',
          type: 'string',
          min: 1,
          max: 100,
          pattern: /^[a-zA-Z0-9_-]+$/,
          message: 'Provider ID must be 1-100 characters, alphanumeric with underscores and hyphens only'
        },
        {
          field: 'name',
          type: 'required',
          message: 'Provider name is required'
        },
        {
          field: 'name',
          type: 'string',
          min: 1,
          max: 200,
          message: 'Provider name must be 1-200 characters'
        },
        {
          field: 'enabled',
          type: 'boolean',
          message: 'Enabled field must be a boolean'
        }
      ],
      typeSpecific: {
        sqlite: [
          {
            field: 'databasePath',
            type: 'required',
            message: 'SQLite database path is required'
          },
          {
            field: 'databasePath',
            type: 'string',
            min: 1,
            message: 'Database path cannot be empty'
          },
          {
            field: 'enableWAL',
            type: 'boolean',
            message: 'enableWAL must be a boolean'
          },
          {
            field: 'cacheSize',
            type: 'number',
            min: 100,
            max: 1000000,
            message: 'Cache size must be between 100 and 1,000,000'
          },
          {
            field: 'timeout',
            type: 'number',
            min: 1000,
            max: 300000,
            message: 'Timeout must be between 1,000ms and 300,000ms'
          }
        ],
        linear: [
          {
            field: 'apiToken',
            type: 'required',
            message: 'Linear API token is required'
          },
          {
            field: 'apiToken',
            type: 'string',
            min: 10,
            message: 'API token appears to be too short'
          },
          {
            field: 'teamId',
            type: 'required',
            message: 'Linear team ID is required'
          },
          {
            field: 'teamId',
            type: 'string',
            pattern: /^[a-f0-9-]{36}$/,
            message: 'Team ID must be a valid UUID format'
          },
          {
            field: 'apiUrl',
            type: 'url',
            message: 'API URL must be a valid URL'
          },
          {
            field: 'timeout',
            type: 'number',
            min: 1000,
            max: 120000,
            message: 'Timeout must be between 1,000ms and 120,000ms'
          }
        ],
        github: [
          {
            field: 'apiToken',
            type: 'required',
            message: 'GitHub API token is required'
          },
          {
            field: 'apiToken',
            type: 'string',
            min: 10,
            message: 'API token appears to be too short'
          },
          {
            field: 'owner',
            type: 'required',
            message: 'Repository owner is required'
          },
          {
            field: 'owner',
            type: 'string',
            pattern: /^[a-zA-Z0-9._-]+$/,
            message: 'Owner must contain only alphanumeric characters, dots, underscores, and hyphens'
          },
          {
            field: 'repo',
            type: 'required',
            message: 'Repository name is required'
          },
          {
            field: 'repo',
            type: 'string',
            pattern: /^[a-zA-Z0-9._-]+$/,
            message: 'Repository name must contain only alphanumeric characters, dots, underscores, and hyphens'
          },
          {
            field: 'apiUrl',
            type: 'url',
            message: 'API URL must be a valid URL'
          }
        ],
        jira: [
          {
            field: 'baseUrl',
            type: 'required',
            message: 'Jira base URL is required'
          },
          {
            field: 'baseUrl',
            type: 'url',
            message: 'Base URL must be a valid URL'
          },
          {
            field: 'username',
            type: 'required',
            message: 'Jira username is required'
          },
          {
            field: 'username',
            type: 'string',
            min: 1,
            message: 'Username cannot be empty'
          },
          {
            field: 'apiToken',
            type: 'required',
            message: 'Jira API token is required'
          },
          {
            field: 'apiToken',
            type: 'string',
            min: 10,
            message: 'API token appears to be too short'
          },
          {
            field: 'projectKey',
            type: 'required',
            message: 'Jira project key is required'
          },
          {
            field: 'projectKey',
            type: 'string',
            pattern: /^[A-Z][A-Z0-9_]*$/,
            message: 'Project key must start with a letter and contain only uppercase letters, numbers, and underscores'
          }
        ]
      }
    }
  }

  // -------------------------------------------------------------------------
  // Validation Logic
  // -------------------------------------------------------------------------

  /**
   * Validate configuration against a set of rules
   */
  private validateRules(
    config: any,
    rules: ValidationRule[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    for (const rule of rules) {
      const value = config[rule.field]
      const error = this.validateField(value, rule)

      if (error) {
        errors.push({
          field: rule.field,
          message: error,
          value,
          rule: rule.type
        })
      }

      // Generate warnings for optional improvements
      this.generateWarnings(rule.field, value, rule, warnings)
    }
  }

  /**
   * Validate individual field against a rule
   */
  private validateField(value: any, rule: ValidationRule): string | null {
    // Required field validation
    if (rule.type === 'required' && (value === undefined || value === null || value === '')) {
      return rule.message || `${rule.field} is required`
    }

    // Skip further validation if field is not required and empty
    if ((value === undefined || value === null || value === '') && rule.type !== 'required') {
      return null
    }

    // Type-specific validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return rule.message || `${rule.field} must be a string`
        }
        if (rule.min !== undefined && value.length < rule.min) {
          return rule.message || `${rule.field} must be at least ${rule.min} characters`
        }
        if (rule.max !== undefined && value.length > rule.max) {
          return rule.message || `${rule.field} cannot exceed ${rule.max} characters`
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          return rule.message || `${rule.field} format is invalid`
        }
        if (rule.allowedValues && !rule.allowedValues.includes(value)) {
          return rule.message || `${rule.field} must be one of: ${rule.allowedValues.join(', ')}`
        }
        break

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return rule.message || `${rule.field} must be a number`
        }
        if (rule.min !== undefined && value < rule.min) {
          return rule.message || `${rule.field} must be at least ${rule.min}`
        }
        if (rule.max !== undefined && value > rule.max) {
          return rule.message || `${rule.field} cannot exceed ${rule.max}`
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          return rule.message || `${rule.field} must be a boolean`
        }
        break

      case 'url':
        if (typeof value !== 'string') {
          return rule.message || `${rule.field} must be a string`
        }
        try {
          new URL(value)
        } catch {
          return rule.message || `${rule.field} must be a valid URL`
        }
        break

      case 'email':
        if (typeof value !== 'string') {
          return rule.message || `${rule.field} must be a string`
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(value)) {
          return rule.message || `${rule.field} must be a valid email address`
        }
        break

      case 'path':
        if (typeof value !== 'string') {
          return rule.message || `${rule.field} must be a string`
        }
        // Basic path validation - could be enhanced based on OS
        if (value.includes('\0')) {
          return rule.message || `${rule.field} contains invalid characters`
        }
        break

      case 'custom':
        if (rule.validator) {
          const result = rule.validator(value)
          if (result !== true) {
            return typeof result === 'string' ? result : (rule.message || `${rule.field} is invalid`)
          }
        }
        break
    }

    return null
  }

  /**
   * Generate warnings for potential improvements
   */
  private generateWarnings(
    field: string,
    value: any,
    rule: ValidationRule,
    warnings: ValidationWarning[]
  ): void {
    // Warning for weak tokens
    if (field.includes('token') && typeof value === 'string') {
      if (value.length < 20) {
        warnings.push({
          field,
          message: 'Token appears to be short - ensure it has sufficient entropy',
          value,
          suggestion: 'Consider using a longer, more secure token'
        })
      }
      if (value.toLowerCase().includes('test') || value.toLowerCase().includes('demo')) {
        warnings.push({
          field,
          message: 'Token appears to be for testing - ensure production tokens are used in production',
          value,
          suggestion: 'Use production-grade tokens for production environments'
        })
      }
    }

    // Warning for development databases in production
    if (field === 'databasePath' && typeof value === 'string') {
      if (value.includes('test') || value.includes('dev') || value === ':memory:') {
        warnings.push({
          field,
          message: 'Database path suggests development/testing usage',
          value,
          suggestion: 'Ensure production databases are used in production environments'
        })
      }
    }

    // Warning for default timeouts
    if (field === 'timeout' && typeof value === 'number') {
      if (value < 5000) {
        warnings.push({
          field,
          message: 'Timeout is quite short and may cause issues with slow networks',
          value,
          suggestion: 'Consider increasing timeout for production use'
        })
      }
    }
  }

  /**
   * Perform cross-field validation
   */
  private performCrossFieldValidation(
    config: ProviderConfig,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate ID uniqueness constraints
    if (config.id && config.name && config.id === config.name) {
      warnings.push({
        field: 'id',
        message: 'ID and name are identical',
        value: config.id,
        suggestion: 'Consider using different values for ID and name for clarity'
      })
    }

    // Provider-specific cross-field validation
    switch (config.type) {
      case 'linear':
        const linearConfig = config as LinearProviderConfig
        if (linearConfig.apiUrl && !linearConfig.apiUrl.includes('linear.app')) {
          warnings.push({
            field: 'apiUrl',
            message: 'Custom API URL detected',
            value: linearConfig.apiUrl,
            suggestion: 'Ensure this is correct for Linear on-premise installations'
          })
        }
        break

      case 'github':
        const githubConfig = config as GitHubProviderConfig
        if (githubConfig.apiUrl && !githubConfig.apiUrl.includes('github.com')) {
          warnings.push({
            field: 'apiUrl',
            message: 'Custom API URL detected',
            value: githubConfig.apiUrl,
            suggestion: 'Ensure this is correct for GitHub Enterprise installations'
          })
        }
        break
    }
  }

  /**
   * Sanitize and normalize configuration
   */
  private sanitizeConfig(config: ProviderConfig, warnings: ValidationWarning[]): ProviderConfig {
    const sanitized = { ...config }

    // Trim string fields
    if (sanitized.id) sanitized.id = sanitized.id.trim()
    if (sanitized.name) sanitized.name = sanitized.name.trim()

    // Normalize URLs
    if (config.type === 'linear' || config.type === 'github' || config.type === 'jira') {
      const apiUrlConfig = config as any
      if (apiUrlConfig.apiUrl) {
        apiUrlConfig.apiUrl = apiUrlConfig.apiUrl.replace(/\/+$/, '') // Remove trailing slashes
      }
    }

    // Set defaults
    if (sanitized.enabled === undefined) {
      sanitized.enabled = true
    }

    // Type-specific sanitization
    switch (config.type) {
      case 'sqlite':
        const sqliteConfig = sanitized as SQLiteProviderConfig
        if (sqliteConfig.enableWAL === undefined) {
          sqliteConfig.enableWAL = true
        }
        if (sqliteConfig.enableForeignKeys === undefined) {
          sqliteConfig.enableForeignKeys = true
        }
        break
    }

    return sanitized
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick validation function for simple use cases
 */
export function validateProviderConfig(config: ProviderConfig): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const validator = new ProviderConfigValidator()
  const result = validator.validate(config)

  return {
    isValid: result.isValid,
    errors: result.errors.map(error => `${error.field}: ${error.message}`),
    warnings: result.warnings.map(warning => `${warning.field}: ${warning.message}`)
  }
}

/**
 * Create a validator instance with custom schema
 */
export function createCustomValidator(customRules?: Partial<ValidationSchema>): ProviderConfigValidator {
  const validator = new ProviderConfigValidator()
  
  // In a full implementation, we would merge custom rules with default schema
  // For now, return the standard validator
  return validator
}