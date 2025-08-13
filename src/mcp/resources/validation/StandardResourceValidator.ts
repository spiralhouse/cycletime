/**
 * Standard Resource Validator Implementation
 * Default validation logic for resource descriptors
 */

import type { 
  ResourceValidator, 
  ValidationResult, 
  ValidationConfig 
} from '../interfaces/ResourceValidator.js';
import type { ResourceDescriptor } from '../types.js';

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: ValidationConfig = {
  allowEmptyOptionals: true,
  allowedSchemes: ['http', 'https', 'file', 'mcp', 'jcvd'],
  maxStringLength: 1000,
  validateHandlerMethods: true,
};

/**
 * Standard validator implementation
 */
export class StandardResourceValidator implements ResourceValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate a complete resource descriptor
   */
  validateDescriptor(descriptor: ResourceDescriptor): ValidationResult {
    if (!descriptor) {
      return {
        isValid: false,
        error: 'Resource descriptor cannot be null or undefined',
        details: { descriptor },
      };
    }

    // Validate required fields
    const typeResult = this.validateType(descriptor.type);

    if (!typeResult.isValid) {
      return typeResult;
    }

    const nameResult = this.validateName(descriptor.name);

    if (!nameResult.isValid) {
      return nameResult;
    }

    const descriptionResult = this.validateDescription(descriptor.description);

    if (!descriptionResult.isValid) {
      return descriptionResult;
    }

    // Validate handler if validation is enabled
    if (this.config.validateHandlerMethods) {
      const handlerResult = this.validateHandler(descriptor.handler);

      if (!handlerResult.isValid) {
        return handlerResult;
      }
    }

    // Validate optional fields
    if (descriptor.metadata !== undefined) {
      const metadataResult = this.validateMetadata(descriptor.metadata);

      if (!metadataResult.isValid) {
        return metadataResult;
      }
    }

    return { isValid: true };
  }

  /**
   * Validate a resource URI
   */
  validateUri(uri: string): ValidationResult {
    if (!uri || typeof uri !== 'string') {
      return {
        isValid: false,
        error: 'URI must be a non-empty string',
        details: { uri, type: typeof uri },
      };
    }

    if (uri.trim() === '') {
      return {
        isValid: false,
        error: 'URI cannot be empty or whitespace-only',
        details: { uri },
      };
    }

    if (uri.length > this.config.maxStringLength) {
      return {
        isValid: false,
        error: `URI exceeds maximum length of ${this.config.maxStringLength} characters`,
        details: { uri, length: uri.length },
      };
    }

    // Check for whitespace characters
    if (/\s/.test(uri)) {
      return {
        isValid: false,
        error: 'URI cannot contain whitespace characters',
        details: { uri },
      };
    }

    // Validate URI format with named capture groups
    const uriRegex = /^(?<scheme>[A-Za-z][\d+.A-Za-z-]*):\/\/(?<host>[^\s/]+)(?<path>\/.*)?$/;
    const match = uri.match(uriRegex);
    
    if (!match?.groups) {
      return {
        isValid: false,
        error: 'URI must be a valid URI format (scheme://host/path)',
        details: { uri },
      };
    }

    // Validate scheme if allowedSchemes is configured
    if (this.config.allowedSchemes.length > 0 && match.groups.scheme) {
      const scheme = match.groups.scheme.toLowerCase();

      if (!this.config.allowedSchemes.includes(scheme)) {
        return {
          isValid: false,
          error: `URI scheme '${scheme}' is not allowed`,
          details: { 
            uri, 
            scheme, 
            allowedSchemes: this.config.allowedSchemes 
          },
        };
      }
    }

    // Additional URL validation for http/https schemes
    if (match.groups.scheme && ['http', 'https'].includes(match.groups.scheme.toLowerCase())) {
      try {
        new URL(uri);
      } catch {
        return {
          isValid: false,
          error: 'Invalid HTTP/HTTPS URL format',
          details: { uri },
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate resource type string
   */
  validateType(type: string): ValidationResult {
    if (!type || typeof type !== 'string') {
      return {
        isValid: false,
        error: 'Resource type is required and must be a non-empty string',
        details: { type, typeOf: typeof type },
      };
    }

    if (type.trim() === '') {
      return {
        isValid: false,
        error: 'Resource type cannot be empty or whitespace-only',
        details: { type },
      };
    }

    if (type.length > this.config.maxStringLength) {
      return {
        isValid: false,
        error: `Resource type exceeds maximum length of ${this.config.maxStringLength} characters`,
        details: { type, length: type.length },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate resource name
   */
  validateName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return {
        isValid: false,
        error: 'Resource name is required and must be a non-empty string',
        details: { name, typeOf: typeof name },
      };
    }

    if (name.trim() === '') {
      return {
        isValid: false,
        error: 'Resource name cannot be empty or whitespace-only',
        details: { name },
      };
    }

    if (name.length > this.config.maxStringLength) {
      return {
        isValid: false,
        error: `Resource name exceeds maximum length of ${this.config.maxStringLength} characters`,
        details: { name, length: name.length },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate resource description
   */
  validateDescription(description: string): ValidationResult {
    if (!description || typeof description !== 'string') {
      return {
        isValid: false,
        error: 'Resource description is required and must be a non-empty string',
        details: { description, typeOf: typeof description },
      };
    }

    if (description.trim() === '') {
      return {
        isValid: false,
        error: 'Resource description cannot be empty or whitespace-only',
        details: { description },
      };
    }

    if (description.length > this.config.maxStringLength) {
      return {
        isValid: false,
        error: `Resource description exceeds maximum length of ${this.config.maxStringLength} characters`,
        details: { description, length: description.length },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate resource handler
   */
  validateHandler(handler: unknown): ValidationResult {
    if (!handler || typeof handler !== 'object') {
      return {
        isValid: false,
        error: 'Resource handler is required and must be an object',
        details: { handler, typeOf: typeof handler },
      };
    }

    if (!this.config.validateHandlerMethods) {
      return { isValid: true };
    }

    const handlerObj = handler as Record<string, unknown>;

    // Check for required methods
    const requiredMethods = ['list', 'read'];

    for (const method of requiredMethods) {
      if (typeof handlerObj[method] !== 'function') {
        return {
          isValid: false,
          error: `Resource handler must have a '${method}' method`,
          details: { 
            handler, 
            method, 
            methodType: typeof handlerObj[method] 
          },
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate resource metadata
   */
  validateMetadata(metadata: unknown): ValidationResult {
    if (metadata === null) {
      return {
        isValid: false,
        error: 'Resource metadata cannot be null (use undefined for no metadata)',
        details: { metadata },
      };
    }

    if (metadata !== undefined && typeof metadata !== 'object') {
      return {
        isValid: false,
        error: 'Resource metadata must be an object if provided',
        details: { metadata, typeOf: typeof metadata },
      };
    }

    return { isValid: true };
  }

  /**
   * Get validation configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Update validation configuration
   */
  updateConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}