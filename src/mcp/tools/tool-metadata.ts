/**
 * Tool Metadata Manager
 * 
 * Handles tool metadata validation, serialization, comparison,
 * and MCP schema generation for tool registration.
 */

import type { 
  ToolMetadata, 
  ToolParameterSchema,
  ToolCapability 
} from './tool-interface.js';
import { ToolName } from './tool-interface.js';
import { ToolValidator } from './tool-validator.js';

/**
 * MCP tool schema for tool registration
 */
export interface MCPToolSchema {
  /** Tool name */
  name: string;
  
  /** Tool description */
  description: string;
  
  /** Input schema for parameters */
  inputSchema: ToolParameterSchema;
}

/**
 * Metadata validation result
 */
export interface MetadataValidationResult {
  /** Whether metadata is valid */
  valid: boolean;
  
  /** Validation errors if invalid */
  errors?: string[];
}

/**
 * Metadata comparison result
 */
export interface MetadataComparisonResult {
  /** Whether there are any changes */
  hasChanges: boolean;
  
  /** List of changed field names */
  changedFields: string[];
  
  /** Detailed changes by field */
  changes: Record<string, { from: any; to: any }>;
}

/**
 * Tool metadata manager for validation and manipulation
 */
export class ToolMetadataManager {
  private static readonly VALID_CAPABILITIES: ToolCapability[] = ['execute', 'validate', 'preview'];
  
  /**
   * Validate complete tool metadata
   * @param metadata Metadata to validate
   * @returns Validation result
   */
  validateMetadata(metadata: ToolMetadata): MetadataValidationResult {
    const errors: string[] = [];
    
    // Validate name
    if (!metadata.name) {
      errors.push('name is required');
    } else if (!ToolName.isValid(metadata.name)) {
      errors.push('name must start with jcvd_ and follow naming convention');
    }
    
    // Validate description
    if (!metadata.description) {
      errors.push('description is required');
    } else if (metadata.description.trim().length < 10) {
      errors.push('description must be at least 10 characters');
    }
    
    // Validate version
    if (!metadata.version) {
      errors.push('version is required');
    } else if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      errors.push('version must follow semver format (e.g., 1.0.0)');
    }
    
    // Validate capabilities
    if (!metadata.capabilities) {
      errors.push('capabilities are required');
    } else if (!Array.isArray(metadata.capabilities)) {
      errors.push('capabilities must be an array');
    } else if (metadata.capabilities.length === 0) {
      errors.push('at least one capability is required');
    } else {
      for (const capability of metadata.capabilities) {
        if (!this.isValidCapability(capability)) {
          errors.push(`invalid capability: ${capability}. Must be one of: ${ToolMetadataManager.VALID_CAPABILITIES.join(', ')}`);
        }
      }
    }
    
    // Validate parameter schema
    if (!metadata.parameters) {
      errors.push('parameters schema is required');
    } else {
      const schemaValidation = ToolValidator.validateSchema(metadata.parameters);
      if (!schemaValidation.valid) {
        errors.push(...(schemaValidation.errors || []).map(e => `parameters.${e}`));
      }
    }
    
    // Validate optional fields
    if (metadata.tags && !Array.isArray(metadata.tags)) {
      errors.push('tags must be an array');
    }
    
    if (metadata.category && typeof metadata.category !== 'string') {
      errors.push('category must be a string');
    }
    
    if (metadata.inputSchema) {
      const inputSchemaValidation = ToolValidator.validateSchema(metadata.inputSchema);
      if (!inputSchemaValidation.valid) {
        errors.push(...(inputSchemaValidation.errors || []).map(e => `inputSchema.${e}`));
      }
    }
    
    if (metadata.outputSchema) {
      const outputSchemaValidation = ToolValidator.validateSchema(metadata.outputSchema);
      if (!outputSchemaValidation.valid) {
        errors.push(...(outputSchemaValidation.errors || []).map(e => `outputSchema.${e}`));
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    } as MetadataValidationResult;
  }
  
  /**
   * Validate parameter schema structure
   * @param schema Schema to validate
   * @returns Validation result
   */
  validateParameterSchema(schema: ToolParameterSchema): MetadataValidationResult {
    const validation = ToolValidator.validateSchema(schema);
    return {
      valid: validation.valid,
      errors: validation.errors
    } as MetadataValidationResult;
  }
  
  /**
   * Check if a capability is valid
   * @param capability Capability to check
   * @returns True if valid
   */
  isValidCapability(capability: string): capability is ToolCapability {
    return ToolMetadataManager.VALID_CAPABILITIES.includes(capability as ToolCapability);
  }
  
  /**
   * Serialize metadata to JSON string
   * @param metadata Metadata to serialize
   * @returns JSON string
   */
  serialize(metadata: ToolMetadata): string {
    return JSON.stringify(metadata, null, 2);
  }
  
  /**
   * Deserialize metadata from JSON string
   * @param json JSON string to deserialize
   * @returns Parsed metadata
   */
  deserialize(json: string): ToolMetadata {
    try {
      const metadata = JSON.parse(json);
      
      // Validate the deserialized metadata
      const validation = this.validateMetadata(metadata);
      if (!validation.valid) {
        throw new Error(`Invalid metadata: ${validation.errors?.join(', ')}`);
      }
      
      return metadata;
    } catch (error) {
      throw new Error(`Failed to deserialize metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate MCP tool schema for registration
   * @param metadata Tool metadata
   * @returns MCP-compatible tool schema
   */
  generateMCPSchema(metadata: ToolMetadata): MCPToolSchema {
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: metadata.inputSchema || metadata.parameters
    };
  }
  
  /**
   * Compare two metadata objects and identify changes
   * @param original Original metadata
   * @param updated Updated metadata
   * @returns Comparison result
   */
  compareMetadata(
    original: ToolMetadata, 
    updated: ToolMetadata
  ): MetadataComparisonResult {
    const changedFields: string[] = [];
    const changes: Record<string, { from: any; to: any }> = {};
    
    // Compare primitive fields
    const fieldsToCompare: (keyof ToolMetadata)[] = [
      'name', 'description', 'version', 'category'
    ];
    
    for (const field of fieldsToCompare) {
      if (original[field] !== updated[field]) {
        changedFields.push(field);
        changes[field] = { from: original[field], to: updated[field] };
      }
    }
    
    // Compare arrays (capabilities, tags)
    if (!this.arraysEqual(original.capabilities, updated.capabilities)) {
      changedFields.push('capabilities');
      changes.capabilities = { from: original.capabilities, to: updated.capabilities };
    }
    
    if (!this.arraysEqual(original.tags, updated.tags)) {
      changedFields.push('tags');
      changes.tags = { from: original.tags, to: updated.tags };
    }
    
    // Compare complex objects (parameters, inputSchema, outputSchema)
    if (!this.objectsEqual(original.parameters, updated.parameters)) {
      changedFields.push('parameters');
      changes.parameters = { from: original.parameters, to: updated.parameters };
    }
    
    if (!this.objectsEqual(original.inputSchema, updated.inputSchema)) {
      changedFields.push('inputSchema');
      changes.inputSchema = { from: original.inputSchema, to: updated.inputSchema };
    }
    
    if (!this.objectsEqual(original.outputSchema, updated.outputSchema)) {
      changedFields.push('outputSchema');
      changes.outputSchema = { from: original.outputSchema, to: updated.outputSchema };
    }
    
    return {
      hasChanges: changedFields.length > 0,
      changedFields,
      changes
    };
  }
  
  /**
   * Create metadata from template
   * @param name Tool name
   * @param description Tool description
   * @param capabilities Tool capabilities
   * @returns Basic metadata template
   */
  createFromTemplate(
    name: string,
    description: string,
    capabilities: ToolCapability[] = ['execute']
  ): ToolMetadata {
    if (!ToolName.isValid(name)) {
      throw new Error(`Invalid tool name: ${name}`);
    }
    
    return {
      name,
      description,
      version: '1.0.0',
      capabilities,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false
      },
      category: ToolName.inferCategory(name)
    };
  }
  
  /**
   * Merge metadata with updates
   * @param original Original metadata
   * @param updates Updates to apply
   * @returns Merged metadata
   */
  mergeMetadata(original: ToolMetadata, updates: Partial<ToolMetadata>): ToolMetadata {
    const merged: ToolMetadata = {
      ...original,
      ...updates
    };
    
    // Deep merge for complex objects
    if (updates.parameters) {
      merged.parameters = { ...original.parameters, ...updates.parameters };
    }
    
    if (updates.inputSchema) {
      merged.inputSchema = { ...original.inputSchema, ...updates.inputSchema };
    }
    
    if (updates.outputSchema) {
      merged.outputSchema = { ...original.outputSchema, ...updates.outputSchema };
    }
    
    // Validate merged metadata
    const validation = this.validateMetadata(merged);
    if (!validation.valid) {
      throw new Error(`Invalid merged metadata: ${validation.errors?.join(', ')}`);
    }
    
    return merged;
  }
  
  /**
   * Extract metadata summary for display
   * @param metadata Tool metadata
   * @returns Human-readable summary
   */
  createSummary(metadata: ToolMetadata): string {
    const capabilities = metadata.capabilities.join(', ');
    const category = metadata.category || 'general';
    const paramCount = Object.keys(metadata.parameters.properties || {}).length;
    const requiredCount = metadata.parameters.required?.length || 0;
    
    return `${metadata.name} v${metadata.version} - ${metadata.description} ` +
           `[${category}] Capabilities: ${capabilities}, ` +
           `Parameters: ${paramCount} (${requiredCount} required)`;
  }
  
  /**
   * Compare arrays for equality
   * @param a First array
   * @param b Second array
   * @returns True if equal
   */
  private arraysEqual(a?: any[], b?: any[]): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    
    return true;
  }
  
  /**
   * Compare objects for deep equality
   * @param a First object
   * @param b Second object
   * @returns True if equal
   */
  private objectsEqual(a?: any, b?: any): boolean {
    if (a === b) return true;
    if (!a || !b) return a === b;
    
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
}