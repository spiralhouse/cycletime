/**
 * Resource Validator Interface
 * Defines the contract for resource validation implementations
 */

import type { ResourceDescriptor } from '../types.js';

/**
 * Validation result with details
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Additional validation context */
  details?: Record<string, unknown>;
}

/**
 * Validation configuration options
 */
export interface ValidationConfig {
  /** Whether to allow empty optional fields */
  allowEmptyOptionals: boolean;
  /** Custom URI schemes to allow */
  allowedSchemes: string[];
  /** Maximum length for string fields */
  maxStringLength: number;
  /** Whether to validate handler methods */
  validateHandlerMethods: boolean;
}

/**
 * Interface for resource validation implementations
 */
export interface ResourceValidator {
  /**
   * Validate a complete resource descriptor
   * @param descriptor - The resource descriptor to validate
   * @returns Validation result with details
   */
  validateDescriptor: (descriptor: ResourceDescriptor) => ValidationResult;

  /**
   * Validate a resource URI
   * @param uri - The URI to validate
   * @returns Validation result with details
   */
  validateUri: (uri: string) => ValidationResult;

  /**
   * Validate resource type string
   * @param type - The type string to validate
   * @returns Validation result with details
   */
  validateType: (type: string) => ValidationResult;

  /**
   * Validate resource name
   * @param name - The name to validate
   * @returns Validation result with details
   */
  validateName: (name: string) => ValidationResult;

  /**
   * Validate resource description
   * @param description - The description to validate
   * @returns Validation result with details
   */
  validateDescription: (description: string) => ValidationResult;

  /**
   * Validate resource handler
   * @param handler - The handler object to validate
   * @returns Validation result with details
   */
  validateHandler: (handler: unknown) => ValidationResult;

  /**
   * Validate resource metadata
   * @param metadata - The metadata object to validate
   * @returns Validation result with details
   */
  validateMetadata: (metadata: unknown) => ValidationResult;

  /**
   * Get validation configuration
   * @returns Current validation configuration
   */
  getConfig: () => ValidationConfig;

  /**
   * Update validation configuration
   * @param config - New validation configuration
   */
  updateConfig: (config: Partial<ValidationConfig>) => void;
}