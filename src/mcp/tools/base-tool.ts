/**
 * Base Tool Implementation
 * 
 * Abstract base class providing common functionality for JCVD tools.
 * Handles parameter validation, metadata management, and execution coordination.
 */

import { createLogger } from '../../utils/logger.js';

import { 
  ToolName, 
  ToolValidationError, 
  ToolExecutionError, 
  ToolUnavailableError,
  InvalidToolNameError 
} from './tool-interface.js';
import { ToolValidator } from './tool-validator.js';

import type { 
  Tool, 
  ToolMetadata, 
  ToolExecutionContext, 
  ToolExecutionResult, 
  ToolParameterValidationResult,
  ToolCapability 
} from './tool-interface.js';
import type { Logger } from '../../utils/logger.js';

/**
 * Abstract base implementation for JCVD tools
 */
export abstract class BaseTool implements Tool {
  protected readonly logger: Logger;
  private readonly validator: ToolValidator;
  private readonly _metadata: ToolMetadata;

  constructor(metadata: ToolMetadata) {
    this.logger = createLogger(`tool:${metadata.name}`);
    this.validator = new ToolValidator();
    
    // Validate metadata during construction
    this.validateMetadata(metadata);
    
    // Store metadata as immutable
    this._metadata = Object.freeze({ ...metadata });
    
    this.logger.debug('Tool initialized', {
      name: metadata.name,
      version: metadata.version,
      capabilities: metadata.capabilities
    });
  }

  /**
   * Tool name (from metadata)
   */
  get name(): string {
    return this._metadata.name;
  }

  /**
   * Tool metadata (immutable copy)
   */
  get metadata(): ToolMetadata {
    return { ...this._metadata };
  }

  /**
   * Check if tool is available (default implementation)
   * Override in subclasses for custom availability logic
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Validate parameters against tool schema
   */
  async validateParameters(parameters: any): Promise<ToolParameterValidationResult> {
    try {
      this.logger.debug('Validating parameters', { parameters });
      
      const result = await this.validator.validate(parameters, this._metadata.parameters);
      
      if (!result.valid) {
        this.logger.debug('Parameter validation failed', { 
          errors: result.errors 
        });
      } else {
        this.logger.debug('Parameter validation passed');
      }
      
      return result;
    } catch (error) {
      this.logger.error('Parameter validation error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      throw new ToolValidationError(
        `Parameter validation failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        { originalError: error }
      );
    }
  }

  /**
   * Execute the tool with parameter validation
   */
  async execute(parameters: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Executing tool', {
        requestId: context.requestId,
        parameters: this.sanitizeParametersForLogging(parameters)
      });

      // Check availability
      const available = await this.isAvailable();

      if (!available) {
        throw new ToolUnavailableError(this.name, 'Tool is currently unavailable');
      }

      // Validate parameters
      const validation = await this.validateParameters(parameters);

      if (!validation.valid) {
        const errorMessage = `Parameter validation failed: ${validation.errors?.join(', ')}`;

        this.logger.warn('Tool execution aborted due to validation errors', {
          errors: validation.errors
        });
        
        return {
          success: false,
          error: {
            name: 'ToolValidationError',
            message: errorMessage,
            code: 'VALIDATION_ERROR',
            toolName: this.name,
            details: { validationErrors: validation.errors }
          }
        };
      }

      // Execute with validated parameters
      const result = await this.executeImpl(
        validation.sanitizedParameters || parameters, 
        context
      );

      const executionTime = Date.now() - startTime;
      
      this.logger.info('Tool execution completed', {
        requestId: context.requestId,
        success: result.success,
        executionTime
      });

      // Add execution metadata
      return {
        ...result,
        metadata: {
          executionTime,
          ...result.metadata
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error('Tool execution failed', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      // Handle known tool errors
      if (error instanceof ToolValidationError || 
          error instanceof ToolExecutionError ||
          error instanceof ToolUnavailableError) {
        return {
          success: false,
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            toolName: this.name,
            details: error.details
          },
          metadata: { executionTime }
        };
      }

      // Handle unexpected errors
      return {
        success: false,
        error: {
          name: 'ToolExecutionError',
          message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
          code: 'EXECUTION_ERROR',
          toolName: this.name,
          details: { originalError: error }
        },
        metadata: { executionTime }
      };
    }
  }

  /**
   * Get tool capabilities
   */
  getCapabilities(): ToolCapability[] {
    return [...this._metadata.capabilities];
  }

  /**
   * Check if tool has a specific capability
   */
  hasCapability(capability: ToolCapability): boolean {
    return this._metadata.capabilities.includes(capability);
  }

  /**
   * Get immutable metadata copy
   */
  getMetadata(): ToolMetadata {
    return { ...this._metadata };
  }

  /**
   * Abstract method for tool-specific implementation
   * Must be implemented by subclasses
   */
  protected abstract executeImpl(
    parameters: any, 
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>;

  /**
   * Validate tool metadata during construction
   */
  private validateMetadata(metadata: ToolMetadata): void {
    // Validate tool name
    if (!ToolName.isValid(metadata.name)) {
      throw new InvalidToolNameError(metadata.name);
    }

    // Validate description
    if (!metadata.description || metadata.description.trim().length < 10) {
      throw new Error('Tool description must be at least 10 characters');
    }

    // Validate version
    if (!metadata.version || !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      throw new Error('Tool version must follow semver format (e.g., 1.0.0)');
    }

    // Validate capabilities
    if (!metadata.capabilities || metadata.capabilities.length === 0) {
      throw new Error('Tool must have at least one capability');
    }

    const validCapabilities: ToolCapability[] = ['execute', 'validate', 'preview'];

    for (const capability of metadata.capabilities) {
      if (!validCapabilities.includes(capability)) {
        throw new Error(`Invalid capability: ${capability}. Must be one of: ${validCapabilities.join(', ')}`);
      }
    }

    // Validate parameter schema
    if (!metadata.parameters) {
      throw new Error('Tool must have a parameter schema');
    }

    const schemaValidation = ToolValidator.validateSchema(metadata.parameters);

    if (!schemaValidation.valid) {
      throw new Error(`Invalid parameter schema: ${schemaValidation.errors?.join(', ')}`);
    }
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParametersForLogging(parameters: any): any {
    if (!parameters || typeof parameters !== 'object') {
      return parameters;
    }

    const sanitized = { ...parameters };
    
    // Remove common sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Create a standardized success result
   */
  protected createSuccessResult(data: any, affectedResources?: string[]): ToolExecutionResult {
    const metadata: any = {};

    if (affectedResources !== undefined) {
      metadata.affectedResources = affectedResources;
    }
    
    return {
      success: true,
      data,
      metadata
    };
  }

  /**
   * Create a standardized error result
   */
  protected createErrorResult(
    message: string, 
    code: string = 'EXECUTION_ERROR', 
    details?: any
  ): ToolExecutionResult {
    return {
      success: false,
      error: {
        name: 'ToolExecutionError',
        message,
        code,
        toolName: this.name,
        details
      }
    };
  }

  /**
   * Validate that required parameters are present
   */
  protected validateRequiredParameters(parameters: any, required: string[]): void {
    for (const param of required) {
      if (parameters[param] === undefined || parameters[param] === null) {
        throw new ToolValidationError(
          `Required parameter '${param}' is missing`,
          this.name,
          { missingParameter: param }
        );
      }
    }
  }

  /**
   * Apply parameter defaults if not provided
   */
  protected applyParameterDefaults(parameters: any, defaults: Record<string, any>): any {
    const result = { ...parameters };
    
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (result[key] === undefined) {
        result[key] = defaultValue;
      }
    }
    
    return result;
  }
}