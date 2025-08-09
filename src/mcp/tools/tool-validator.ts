/**
 * Tool Parameter Validator
 * 
 * Provides JSON Schema-based validation for tool parameters.
 * Supports complex validation rules, default value application,
 * and detailed error reporting with field paths.
 */

import type { 
  ToolParameterSchema, 
  ToolParameterValidationResult 
} from './tool-interface.js';

/**
 * Validation error with field path information
 */
export interface ValidationError {
  /** Field path where the error occurred */
  path: string;
  
  /** Error message */
  message: string;
  
  /** Expected value or constraint */
  expected?: any;
  
  /** Actual value that failed validation */
  actual?: any;
}

/**
 * Tool parameter validator using JSON Schema
 */
export class ToolValidator {
  /**
   * Validate parameters against a JSON schema
   * @param parameters Parameters to validate
   * @param schema JSON schema for validation
   * @returns Validation result with errors and sanitized parameters
   */
  async validate(parameters: any, schema: ToolParameterSchema): Promise<ToolParameterValidationResult> {
    const errors: ValidationError[] = [];
    
    // Apply defaults first
    const sanitizedParameters = this.applyDefaults(parameters, schema);
    
    // Validate against schema
    this.validateValue(sanitizedParameters, schema, '', errors);
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors.map(e => this.formatError(e)) : undefined,
      sanitizedParameters
    } as ToolParameterValidationResult;
  }
  
  /**
   * Apply default values to parameters
   * @param parameters Original parameters
   * @param schema Schema with default values
   * @returns Parameters with defaults applied
   */
  private applyDefaults(parameters: any, schema: ToolParameterSchema): any {
    if (schema.type !== 'object' || !schema.properties) {
      return parameters;
    }
    
    const result = { ...parameters };
    
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (result[key] === undefined && 'default' in propSchema) {
        result[key] = propSchema.default;
      } else if (result[key] !== undefined && propSchema.type === 'object') {
        result[key] = this.applyDefaults(result[key], propSchema);
      }
    }
    
    return result;
  }
  
  /**
   * Validate a value against a schema
   * @param value Value to validate
   * @param schema Schema to validate against
   * @param path Current field path for error reporting
   * @param errors Array to collect validation errors
   */
  private validateValue(
    value: any, 
    schema: ToolParameterSchema, 
    path: string, 
    errors: ValidationError[]
  ): void {
    // Type validation
    if (!this.validateType(value, schema.type)) {
      errors.push({
        path,
        message: `must be of type ${schema.type}`,
        expected: schema.type,
        actual: typeof value
      });

      return; // Skip further validation if type is wrong
    }
    
    // Type-specific validation
    switch (schema.type) {
      case 'object':
        this.validateObject(value, schema, path, errors);
        break;

      case 'array':
        this.validateArray(value, schema, path, errors);
        break;

      case 'string':
        this.validateString(value, schema, path, errors);
        break;

      case 'number':
        this.validateNumber(value, schema, path, errors);
        break;
    }
    
    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        path,
        message: `must be one of: ${schema.enum.join(', ')}`,
        expected: schema.enum,
        actual: value
      });
    }
  }
  
  /**
   * Validate value type
   * @param value Value to check
   * @param expectedType Expected type
   * @returns True if type matches
   */
  private validateType(value: any, expectedType: string): boolean {
    if (value === null) {
      return expectedType === 'null';
    }
    
    switch (expectedType) {
      case 'array':
        return Array.isArray(value);

      case 'object':
        return typeof value === 'object' && !Array.isArray(value);

      case 'string':
        return typeof value === 'string';

      case 'number':
        return typeof value === 'number' && !isNaN(value);

      case 'boolean':
        return typeof value === 'boolean';

      default:
        return false;
    }
  }
  
  /**
   * Validate object value
   * @param value Object to validate
   * @param schema Object schema
   * @param path Current path
   * @param errors Error collection
   */
  private validateObject(
    value: any, 
    schema: ToolParameterSchema, 
    path: string, 
    errors: ValidationError[]
  ): void {
    if (!schema.properties) {
      return;
    }
    
    // Required properties validation
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (value[requiredProp] === undefined) {
          errors.push({
            path: this.joinPath(path, requiredProp),
            message: 'is required',
            expected: 'defined value',
            actual: 'undefined'
          });
        }
      }
    }
    
    // Property validation
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (value[propName] !== undefined) {
        this.validateValue(
          value[propName], 
          propSchema, 
          this.joinPath(path, propName), 
          errors
        );
      }
    }
    
    // Additional properties validation
    if (schema.additionalProperties === false) {
      const allowedProps = Object.keys(schema.properties);

      for (const prop of Object.keys(value)) {
        if (!allowedProps.includes(prop)) {
          errors.push({
            path: this.joinPath(path, prop),
            message: 'is not allowed (additional property)',
            expected: `one of: ${allowedProps.join(', ')}`,
            actual: prop
          });
        }
      }
    }
  }
  
  /**
   * Validate array value
   * @param value Array to validate
   * @param schema Array schema
   * @param path Current path
   * @param errors Error collection
   */
  private validateArray(
    value: any[], 
    schema: ToolParameterSchema, 
    path: string, 
    errors: ValidationError[]
  ): void {
    // Length validation
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({
        path,
        message: `must have at least ${schema.minItems} items`,
        expected: `>= ${schema.minItems}`,
        actual: value.length
      });
    }
    
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({
        path,
        message: `must have at most ${schema.maxItems} items`,
        expected: `<= ${schema.maxItems}`,
        actual: value.length
      });
    }
    
    // Uniqueness validation
    if (schema.uniqueItems) {
      const seen = new Set();
      const duplicates = new Set();
      
      for (const item of value) {
        const key = JSON.stringify(item);

        if (seen.has(key)) {
          duplicates.add(item);
        } else {
          seen.add(key);
        }
      }
      
      if (duplicates.size > 0) {
        errors.push({
          path,
          message: 'items must be unique',
          expected: 'unique items',
          actual: `duplicates: ${Array.from(duplicates).join(', ')}`
        });
      }
    }
    
    // Item validation
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        this.validateValue(
          value[i], 
          schema.items, 
          this.joinPath(path, `[${i}]`), 
          errors
        );
      }
    }
  }
  
  /**
   * Validate string value
   * @param value String to validate
   * @param schema String schema
   * @param path Current path
   * @param errors Error collection
   */
  private validateString(
    value: string, 
    schema: ToolParameterSchema, 
    path: string, 
    errors: ValidationError[]
  ): void {
    // Length validation
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        message: `must be at least ${schema.minLength} characters`,
        expected: `>= ${schema.minLength}`,
        actual: value.length
      });
    }
    
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        message: `must be at most ${schema.maxLength} characters`,
        expected: `<= ${schema.maxLength}`,
        actual: value.length
      });
    }
    
    // Pattern validation
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);

      if (!regex.test(value)) {
        errors.push({
          path,
          message: `must match pattern: ${schema.pattern}`,
          expected: schema.pattern,
          actual: value
        });
      }
    }
    
    // Format validation (basic formats)
    if (schema.format) {
      if (!this.validateFormat(value, schema.format)) {
        errors.push({
          path,
          message: `must be a valid ${schema.format}`,
          expected: schema.format,
          actual: value
        });
      }
    }
  }
  
  /**
   * Validate number value
   * @param value Number to validate
   * @param schema Number schema
   * @param path Current path
   * @param errors Error collection
   */
  private validateNumber(
    value: number, 
    schema: ToolParameterSchema, 
    path: string, 
    errors: ValidationError[]
  ): void {
    // Range validation
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        path,
        message: `must be at least ${schema.minimum}`,
        expected: `>= ${schema.minimum}`,
        actual: value
      });
    }
    
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        path,
        message: `must be at most ${schema.maximum}`,
        expected: `<= ${schema.maximum}`,
        actual: value
      });
    }
  }
  
  /**
   * Validate string format (basic implementation)
   * @param value String value
   * @param format Format to validate
   * @returns True if format is valid
   */
  private validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      case 'uri':
        try {
          new URL(value);

          return true;
        } catch {
          return false;
        }

      case 'date':
        return !isNaN(Date.parse(value));

      case 'uuid':
        return /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value);

      default:
        return true; // Unknown formats pass validation
    }
  }
  
  /**
   * Join path components
   * @param basePath Base path
   * @param component Path component to add
   * @returns Joined path
   */
  private joinPath(basePath: string, component: string): string {
    if (!basePath) {
      return component;
    }
    
    if (component.startsWith('[')) {
      return basePath + component;
    }
    
    return `${basePath  }.${  component}`;
  }
  
  /**
   * Format validation error for display
   * @param error Validation error
   * @returns Formatted error message
   */
  private formatError(error: ValidationError): string {
    const fieldPath = error.path || 'root';

    return `${fieldPath} ${error.message}`;
  }
  
  /**
   * Validate a complete tool parameter schema structure
   * @param schema Schema to validate
   * @returns Validation result
   */
  static validateSchema(schema: ToolParameterSchema): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    // Basic structure validation
    if (!schema.type) {
      errors.push('schema must have a type');
    }
    
    if (schema.type === 'object') {
      if (schema.properties) {
        // Validate each property schema recursively
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          const propValidation = this.validateSchema(propSchema);

          if (!propValidation.valid) {
            errors.push(...(propValidation.errors || []).map(e => `properties.${propName}.${e}`));
          }
        }
      }
      
      // Validate required array
      if (schema.required) {
        if (!Array.isArray(schema.required)) {
          errors.push('required must be an array');
        } else if (schema.properties) {
          const propNames = Object.keys(schema.properties);

          for (const required of schema.required) {
            if (!propNames.includes(required)) {
              errors.push(`required field '${required}' not found in properties`);
            }
          }
        }
      }
    }
    
    if (schema.type === 'array' && schema.items) {
      const itemsValidation = this.validateSchema(schema.items);

      if (!itemsValidation.valid) {
        errors.push(...(itemsValidation.errors || []).map(e => `items.${e}`));
      }
    }
    
    // Validate constraints
    if (schema.minimum !== undefined && schema.maximum !== undefined) {
      if (schema.minimum > schema.maximum) {
        errors.push('minimum cannot be greater than maximum');
      }
    }
    
    if (schema.minLength !== undefined && schema.maxLength !== undefined) {
      if (schema.minLength > schema.maxLength) {
        errors.push('minLength cannot be greater than maxLength');
      }
    }
    
    if (schema.minItems !== undefined && schema.maxItems !== undefined) {
      if (schema.minItems > schema.maxItems) {
        errors.push('minItems cannot be greater than maxItems');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    } as { valid: boolean; errors?: string[] };
  }
}