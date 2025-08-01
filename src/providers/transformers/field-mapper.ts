/**
 * JCVD Field Mapping System
 * Intelligent field mapping and transformation utilities
 * 
 * This module provides a flexible and powerful field mapping system that enables
 * complex data transformations between different provider formats and the unified
 * JCVD data model.
 * 
 * @version 1.0.0
 * @author JCVD Software Architect Agent
 */

import type {
  FieldMapping,
  FieldMappingStrategy,
  TypeConversion,
  FieldCondition,
  FieldValidation,
  TransformationContext,
  TransformationError,
  TransformationWarning,
  TransformationErrorCode,
  ValidationResult
} from './transformer-interface.js'

// =============================================================================
// Field Mapper Implementation
// =============================================================================

/**
 * Advanced field mapper supporting multiple transformation strategies
 */
export class FieldMapper {
  private readonly cache = new Map<string, any>()
  private readonly lookupTables = new Map<string, Map<any, any>>()
  
  /**
   * Map a single field from source to target using the provided mapping configuration
   */
  async mapField<TSource, TTarget>(
    source: TSource,
    mapping: FieldMapping<TSource, TTarget>,
    context: TransformationContext
  ): Promise<FieldMappingResult<TTarget>> {
    const result: FieldMappingResult<TTarget> = {
      success: false,
      value: undefined,
      errors: [],
      warnings: []
    }
    
    try {
      // Check conditions if any
      if (mapping.conditions && mapping.conditions.length > 0) {
        const activeMapping = this.evaluateConditions(source, mapping, context)
        if (activeMapping) {
          // Recursively apply conditional mapping
          const conditionalResult = await this.mapField(source, activeMapping, context)
          return conditionalResult
        }
      }
      
      // Extract source value(s)
      const sourceValue = this.extractSourceValue(source, mapping.sourceField)
      
      // Handle required field validation
      if (mapping.required && (sourceValue === undefined || sourceValue === null)) {
        result.errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Required field '${mapping.targetField}' is missing`,
          field: mapping.targetField,
          recoverable: false
        })
        return result
      }
      
      // Use default value if source is missing
      if ((sourceValue === undefined || sourceValue === null) && mapping.defaultValue !== undefined) {
        result.success = true
        result.value = mapping.defaultValue
        return result
      }
      
      // Skip if source value is null/undefined and not required
      if (sourceValue === undefined || sourceValue === null) {
        result.success = true
        result.value = undefined
        return result
      }
      
      // Apply transformation strategy
      let transformedValue: TTarget
      
      switch (mapping.strategy) {
        case 'identity':
          transformedValue = await this.applyIdentityMapping(sourceValue, mapping, context)
          break
          
        case 'computed':
          transformedValue = await this.applyComputedMapping(source, mapping, context)
          break
          
        case 'conditional':
          transformedValue = await this.applyConditionalMapping(source, mapping, context)
          break
          
        case 'lookup':
          transformedValue = await this.applyLookupMapping(sourceValue, mapping, context)
          break
          
        case 'custom':
          transformedValue = await this.applyCustomMapping(source, mapping, context)
          break
          
        default:
          throw new Error(`Unsupported field mapping strategy: ${mapping.strategy}`)
      }
      
      // Apply type conversion if specified
      if (mapping.typeConversion) {
        transformedValue = await this.applyTypeConversion(transformedValue, mapping.typeConversion, context)
      }
      
      // Validate the transformed value
      if (mapping.validation) {
        const validationResult = await this.validateFieldValue(transformedValue, mapping.validation, context)
        if (!validationResult.isValid) {
          result.errors.push(...validationResult.errors)
          result.warnings.push(...validationResult.warnings)
          if (result.errors.some(e => e.code === 'VALIDATION_FAILED')) {
            return result
          }
        }
      }
      
      result.success = true
      result.value = transformedValue
      
    } catch (error) {
      const sourceValue = this.extractSourceValue(source, mapping.sourceField)
      result.errors.push({
        code: 'FIELD_MAPPING_FAILED',
        message: `Field mapping failed for '${mapping.targetField}': ${error.message}`,
        field: mapping.targetField,
        sourceValue,
        recoverable: false,
        context: {
          entityType: context.projectContext ? 'issue' : 'unknown',
          transformationStep: 'field_mapping',
          stackTrace: error.stack
        }
      })
    }
    
    return result
  }
  
  /**
   * Map multiple fields in batch for performance optimization
   */
  async mapFields<TSource, TTarget>(
    source: TSource,
    mappings: FieldMapping<TSource, TTarget>[],
    context: TransformationContext
  ): Promise<BatchFieldMappingResult<TTarget>> {
    const result: BatchFieldMappingResult<TTarget> = {
      success: true,
      mappedObject: {} as TTarget,
      fieldResults: new Map(),
      errors: [],
      warnings: []
    }
    
    // Process mappings in parallel for performance
    const mappingPromises = mappings.map(async (mapping) => {
      const fieldResult = await this.mapField(source, mapping, context)
      return { mapping, result: fieldResult }
    })
    
    const mappingResults = await Promise.all(mappingPromises)
    
    // Combine results
    for (const { mapping, result: fieldResult } of mappingResults) {
      result.fieldResults.set(mapping.targetField, fieldResult)
      
      if (fieldResult.success && fieldResult.value !== undefined) {
        this.setNestedValue(result.mappedObject, mapping.targetField, fieldResult.value)
      }
      
      if (fieldResult.errors.length > 0) {
        result.errors.push(...fieldResult.errors)
        result.success = false
      }
      
      if (fieldResult.warnings.length > 0) {
        result.warnings.push(...fieldResult.warnings)
      }
    }
    
    return result
  }
  
  // =============================================================================
  // Mapping Strategy Implementations
  // =============================================================================
  
  /**
   * Apply identity mapping (direct field copy)
   */
  private async applyIdentityMapping<TSource, TTarget>(
    sourceValue: any,
    mapping: FieldMapping<TSource, TTarget>,
    context: TransformationContext
  ): Promise<TTarget> {
    return sourceValue as TTarget
  }
  
  /**
   * Apply computed mapping (derive from multiple fields)
   */
  private async applyComputedMapping<TSource, TTarget>(
    source: TSource,
    mapping: FieldMapping<TSource, TTarget>,
    context: TransformationContext
  ): Promise<TTarget> {
    if (!mapping.transform) {
      throw new Error('Computed mapping requires a transform function')
    }
    
    return await mapping.transform(source, context)
  }
  
  /**
   * Apply conditional mapping based on field conditions
   */
  private async applyConditionalMapping<TSource, TTarget>(
    source: TSource,
    mapping: FieldMapping<TSource, TTarget>,
    context: TransformationContext
  ): Promise<TTarget> {
    if (!mapping.conditions || mapping.conditions.length === 0) {
      throw new Error('Conditional mapping requires conditions')
    }
    
    const activeMapping = this.evaluateConditions(source, mapping, context)
    if (!activeMapping) {
      return mapping.defaultValue as TTarget
    }
    
    return await this.mapField(source, activeMapping, context).then(r => r.value as TTarget)
  }
  
  /**
   * Apply lookup mapping using lookup tables
   */
  private async applyLookupMapping<TSource, TTarget>(
    sourceValue: any,
    mapping: FieldMapping<TSource, TTarget>,
    context: TransformationContext
  ): Promise<TTarget> {
    const lookupKey = `${context.sourceProvider}_${context.targetProvider}_${mapping.targetField}`
    const lookupTable = this.lookupTables.get(lookupKey)
    
    if (!lookupTable) {
      throw new Error(`Lookup table not found for mapping: ${lookupKey}`)
    }
    
    const mappedValue = lookupTable.get(sourceValue)
    if (mappedValue === undefined) {
      throw new Error(`No lookup value found for source value: ${sourceValue}`)
    }
    
    return mappedValue as TTarget
  }
  
  /**
   * Apply custom mapping using provided transform function
   */
  private async applyCustomMapping<TSource, TTarget>(
    source: TSource,
    mapping: FieldMapping<TSource, TTarget>,
    context: TransformationContext
  ): Promise<TTarget> {
    if (!mapping.transform) {
      throw new Error('Custom mapping requires a transform function')
    }
    
    return await mapping.transform(source, context)
  }
  
  // =============================================================================
  // Type Conversion System
  // =============================================================================
  
  /**
   * Apply type conversion between different data types
   */
  private async applyTypeConversion<T>(
    value: any,
    conversion: TypeConversion,
    context: TransformationContext
  ): Promise<T> {
    if (value === null || value === undefined) {
      return value
    }
    
    try {
      switch (conversion.targetType) {
        case 'string':
          return this.convertToString(value, conversion) as T
          
        case 'number':
          return this.convertToNumber(value, conversion) as T
          
        case 'boolean':
          return this.convertToBoolean(value, conversion) as T
          
        case 'date':
          return this.convertToDate(value, conversion) as T
          
        case 'object':
          return this.convertToObject(value, conversion) as T
          
        case 'array':
          return this.convertToArray(value, conversion) as T
          
        default:
          throw new Error(`Unsupported target type: ${conversion.targetType}`)
      }
    } catch (error) {
      throw new Error(`Type conversion failed from ${conversion.sourceType} to ${conversion.targetType}: ${error.message}`)
    }
  }
  
  private convertToString(value: any, conversion: TypeConversion): string {
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value.toString(conversion.options?.numberBase || 10)
    if (typeof value === 'boolean') return value.toString()
    if (value instanceof Date) return conversion.options?.dateFormat ? this.formatDate(value, conversion.options.dateFormat) : value.toISOString()
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }
  
  private convertToNumber(value: any, conversion: TypeConversion): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = conversion.options?.numberBase ? parseInt(value, conversion.options.numberBase) : parseFloat(value)
      if (isNaN(parsed)) throw new Error(`Cannot convert '${value}' to number`)
      return parsed
    }
    if (typeof value === 'boolean') return value ? 1 : 0
    throw new Error(`Cannot convert ${typeof value} to number`)
  }
  
  private convertToBoolean(value: any, conversion: TypeConversion): boolean {
    if (typeof value === 'boolean') return value
    if (conversion.options?.booleanTrueValues) {
      return conversion.options.booleanTrueValues.includes(value)
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'on'
    }
    if (typeof value === 'number') return value !== 0
    return Boolean(value)
  }
  
  private convertToDate(value: any, conversion: TypeConversion): Date {
    if (value instanceof Date) return value
    if (typeof value === 'string') {
      const date = new Date(value)
      if (isNaN(date.getTime())) throw new Error(`Invalid date string: ${value}`)
      return date
    }
    if (typeof value === 'number') return new Date(value)
    throw new Error(`Cannot convert ${typeof value} to Date`)
  }
  
  private convertToObject(value: any, conversion: TypeConversion): object {
    if (typeof value === 'object' && value !== null) {
      if (conversion.options?.objectKeyMapping) {
        return this.remapObjectKeys(value, conversion.options.objectKeyMapping)
      }
      return value
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        throw new Error(`Cannot parse string as JSON: ${value}`)
      }
    }
    throw new Error(`Cannot convert ${typeof value} to object`)
  }
  
  private convertToArray(value: any, conversion: TypeConversion): any[] {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // If JSON parsing fails, split by comma
        return value.split(',').map(s => s.trim())
      }
    }
    return [value]
  }
  
  // =============================================================================
  // Utility Methods
  // =============================================================================
  
  /**
   * Extract value from source object using field path
   */
  private extractSourceValue(source: any, fieldPath?: string | string[]): any {
    if (!fieldPath) return undefined
    
    const paths = Array.isArray(fieldPath) ? fieldPath : [fieldPath]
    
    for (const path of paths) {
      const value = this.getNestedValue(source, path)
      if (value !== undefined) return value
    }
    
    return undefined
  }
  
  /**
   * Get nested value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined
    
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current === null || current === undefined) return undefined
      current = current[key]
    }
    
    return current
  }
  
  /**
   * Set nested value using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }
    
    current[keys[keys.length - 1]] = value
  }
  
  /**
   * Evaluate field conditions to determine active mapping
   */
  private evaluateConditions<TSource, TTarget>(
    source: TSource,
    mapping: FieldMapping<TSource, TTarget>,
    context: TransformationContext
  ): FieldMapping<TSource, TTarget> | null {
    if (!mapping.conditions) return null
    
    for (const condition of mapping.conditions) {
      if (this.evaluateCondition(source, condition)) {
        return { ...mapping, ...condition.mapping }
      }
    }
    
    return null
  }
  
  /**
   * Evaluate a single field condition
   */
  private evaluateCondition<TSource>(source: TSource, condition: FieldCondition<TSource>): boolean {
    const fieldValue = this.getNestedValue(source, condition.field)
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      case 'not_equals':
        return fieldValue !== condition.value
      case 'contains':
        return String(fieldValue).includes(String(condition.value))
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value))
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value)
      case 'less_than':
        return Number(fieldValue) < Number(condition.value)
      default:
        return false
    }
  }
  
  /**
   * Validate field value against validation rules
   */
  private async validateFieldValue<T>(
    value: T,
    validation: FieldValidation<T>,
    context: TransformationContext
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 1.0
    }
    
    // Required validation
    if (validation.required && (value === undefined || value === null)) {
      result.errors.push({
        code: 'VALIDATION_FAILED',
        message: 'Required field is missing',
        recoverable: false
      })
      result.isValid = false
    }
    
    if (value === undefined || value === null) {
      return result
    }
    
    // Type-specific validations
    if (typeof value === 'string' || typeof value === 'number' || Array.isArray(value)) {
      const length = typeof value === 'string' ? value.length : 
                    Array.isArray(value) ? value.length : 
                    Math.abs(value)
      
      if (validation.min !== undefined && length < validation.min) {
        result.errors.push({
          code: 'VALIDATION_FAILED',
          message: `Value length/size ${length} is below minimum ${validation.min}`,
          recoverable: false
        })
        result.isValid = false
      }
      
      if (validation.max !== undefined && length > validation.max) {
        result.errors.push({
          code: 'VALIDATION_FAILED',
          message: `Value length/size ${length} exceeds maximum ${validation.max}`,
          recoverable: false
        })
        result.isValid = false
      }
    }
    
    // Pattern validation for strings
    if (typeof value === 'string' && validation.pattern) {
      if (!validation.pattern.test(value)) {
        result.errors.push({
          code: 'VALIDATION_FAILED',
          message: `Value '${value}' does not match required pattern`,
          recoverable: false
        })
        result.isValid = false
      }
    }
    
    // Allowed values validation
    if (validation.allowedValues && !validation.allowedValues.includes(value)) {
      result.errors.push({
        code: 'VALIDATION_FAILED',
        message: `Value '${value}' is not in allowed values: ${validation.allowedValues.join(', ')}`,
        recoverable: false
      })
      result.isValid = false
    }
    
    // Custom validation
    if (validation.custom) {
      const customResult = validation.custom(value)
      if (typeof customResult === 'string') {
        result.errors.push({
          code: 'VALIDATION_FAILED',
          message: customResult,
          recoverable: false
        })
        result.isValid = false
      } else if (!customResult) {
        result.errors.push({
          code: 'VALIDATION_FAILED',
          message: 'Custom validation failed',
          recoverable: false
        })
        result.isValid = false
      }
    }
    
    // Calculate validation score
    const totalChecks = [
      validation.required,
      validation.min,
      validation.max,
      validation.pattern,
      validation.allowedValues,
      validation.custom
    ].filter(Boolean).length
    
    result.score = totalChecks > 0 ? Math.max(0, (totalChecks - result.errors.length) / totalChecks) : 1.0
    
    return result
  }
  
  /**
   * Format date according to specified format
   */
  private formatDate(date: Date, format: string): string {
    // Simple date formatting - in production you might use a library like date-fns
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
  }
  
  /**
   * Remap object keys according to mapping
   */
  private remapObjectKeys(obj: any, keyMapping: Record<string, string>): any {
    const result: any = {}
    
    for (const [oldKey, newKey] of Object.entries(keyMapping)) {
      if (oldKey in obj) {
        result[newKey] = obj[oldKey]
      }
    }
    
    // Copy unmapped keys
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in keyMapping)) {
        result[key] = value
      }
    }
    
    return result
  }
  
  /**
   * Register a lookup table for field mapping
   */
  registerLookupTable(key: string, lookupTable: Map<any, any>): void {
    this.lookupTables.set(key, lookupTable)
  }
  
  /**
   * Clear all caches and lookup tables
   */
  clearCache(): void {
    this.cache.clear()
    this.lookupTables.clear()
  }
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of mapping a single field
 */
export interface FieldMappingResult<T> {
  success: boolean
  value?: T
  errors: TransformationError[]
  warnings: TransformationWarning[]
}

/**
 * Result of mapping multiple fields in batch
 */
export interface BatchFieldMappingResult<T> {
  success: boolean
  mappedObject: T
  fieldResults: Map<string, FieldMappingResult<any>>
  errors: TransformationError[]
  warnings: TransformationWarning[]
}

// =============================================================================
// Factory and Utilities
// =============================================================================

/**
 * Create a field mapper instance with default configuration
 */
export function createFieldMapper(): FieldMapper {
  return new FieldMapper()
}

/**
 * Create a standard field mapping for common scenarios
 */
export function createStandardMapping<TSource, TTarget>(
  sourceField: string | string[],
  targetField: string,
  options: {
    required?: boolean
    defaultValue?: TTarget
    typeConversion?: TypeConversion
    validation?: FieldValidation<TTarget>
  } = {}
): FieldMapping<TSource, TTarget> {
  return {
    sourceField,
    targetField,
    strategy: 'identity',
    required: options.required ?? false,
    defaultValue: options.defaultValue,
    typeConversion: options.typeConversion,
    validation: options.validation
  }
}

/**
 * Create a computed field mapping with custom transformation
 */
export function createComputedMapping<TSource, TTarget>(
  targetField: string,
  transform: (source: TSource, context: TransformationContext) => TTarget | Promise<TTarget>,
  reverseTransform?: (target: TTarget, context: TransformationContext) => TSource | Promise<TSource>,
  options: {
    required?: boolean
    validation?: FieldValidation<TTarget>
  } = {}
): FieldMapping<TSource, TTarget> {
  return {
    targetField,
    strategy: 'computed',
    required: options.required ?? false,
    transform,
    reverseTransform,
    validation: options.validation
  }
}

/**
 * Create a lookup field mapping with predefined value mapping
 */
export function createLookupMapping<TSource, TTarget>(
  sourceField: string,
  targetField: string,
  lookupTable: Record<string, TTarget>,
  options: {
    required?: boolean
    defaultValue?: TTarget
  } = {}
): FieldMapping<TSource, TTarget> {
  return {
    sourceField,
    targetField,
    strategy: 'lookup',
    required: options.required ?? false,
    defaultValue: options.defaultValue
  }
}