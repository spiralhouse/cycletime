/**
 * MCP Tool Interface Definitions
 * 
 * Defines the core contracts for JCVD MCP tools following the MCP specification.
 * Tools provide operations that Claude Code can execute to modify project state.
 */

/**
 * Tool capability types that define what operations are supported
 */
export type ToolCapability = 'execute' | 'validate' | 'preview';

/**
 * JSON Schema definition for tool parameters
 */
export interface ToolParameterSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, ToolParameterSchema>;
  items?: ToolParameterSchema;
  required?: string[];
  additionalProperties?: boolean;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  pattern?: string;
  format?: string;
  default?: any;
  description?: string;
}

/**
 * Tool metadata containing descriptive information and capabilities
 */
export interface ToolMetadata {
  /** Tool name following jcvd_ naming convention */
  name: string;
  
  /** Human-readable description of the tool's purpose */
  description: string;
  
  /** Tool version for compatibility tracking */
  version: string;
  
  /** List of operations this tool supports */
  capabilities: ToolCapability[];
  
  /** JSON Schema for parameter validation */
  parameters: ToolParameterSchema;
  
  /** Optional tags for categorization and discovery */
  tags?: string[];
  
  /** Optional category for grouping related tools */
  category?: string;
  
  /** Optional input schema for MCP integration */
  inputSchema?: ToolParameterSchema;
  
  /** Optional output schema for result validation */
  outputSchema?: ToolParameterSchema;
}

/**
 * Execution context provided to tools during execution
 */
export interface ToolExecutionContext {
  /** Unique request identifier for tracking */
  requestId: string;
  
  /** Execution timestamp */
  timestamp: number;
  
  /** Project ID if available */
  projectId?: string;
  
  /** User ID if available */
  userId?: string;
  
  /** Optional additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of tool parameter validation
 */
export interface ToolParameterValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Validation error messages if validation failed */
  errors?: string[];
  
  /** Sanitized/normalized parameters with defaults applied */
  sanitizedParameters?: any;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  
  /** Result data if successful */
  data?: any;
  
  /** Error information if execution failed */
  error?: IToolError;
  
  /** Optional execution metadata */
  metadata?: {
    /** Execution time in milliseconds */
    executionTime?: number;
    
    /** Resources affected by this operation */
    affectedResources?: string[];
    
    /** Additional tool-specific metadata */
    [key: string]: any;
  };
}

/**
 * Tool-specific error information
 */
export interface IToolError {
  /** Error name */
  name: string;
  
  /** Error message */
  message: string;
  
  /** Error code for programmatic handling */
  code: string;
  
  /** Tool that generated the error */
  toolName?: string;
  
  /** Additional error details */
  details?: any;
}

/**
 * Core Tool interface that all JCVD tools must implement
 */
export interface Tool {
  /** Tool name following jcvd_ naming convention */
  readonly name: string;
  
  /** Tool metadata including capabilities and parameter schema */
  readonly metadata: ToolMetadata;
  
  /**
   * Check if this tool is currently available for execution
   * @returns Promise that resolves to true if tool can be executed
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Validate parameters against the tool's parameter schema
   * @param parameters Parameters to validate
   * @returns Promise that resolves to validation result
   */
  validateParameters(parameters: any): Promise<ToolParameterValidationResult>;
  
  /**
   * Execute the tool with validated parameters
   * @param parameters Tool parameters (should be pre-validated)
   * @param context Execution context
   * @returns Promise that resolves to execution result
   */
  execute(parameters: any, context: ToolExecutionContext): Promise<ToolExecutionResult>;
  
  /**
   * Get the capabilities supported by this tool
   * @returns Array of supported capabilities
   */
  getCapabilities(): ToolCapability[];
}

/**
 * Extended tool interface for tools that support execution preview
 */
export interface PreviewableTool extends Tool {
  /**
   * Preview what the tool would do without actually executing
   * @param parameters Tool parameters
   * @param context Execution context
   * @returns Promise that resolves to preview result
   */
  preview(parameters: any, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}

/**
 * Tool factory function type for creating tool instances
 */
export type ToolFactory = (...args: any[]) => Promise<Tool>;

/**
 * Tool name utilities for validating JCVD tool naming conventions
 */
export class ToolName {
  private static readonly NAME_PATTERN = /^jcvd_[a-z][a-z0-9_]*$/;
  
  /**
   * Validate if a tool name follows JCVD naming conventions
   * @param name Tool name to validate
   * @returns True if name is valid
   */
  static isValid(name: string): boolean {
    return this.NAME_PATTERN.test(name);
  }
  
  /**
   * Extract the operation part from a tool name
   * @param name Tool name (e.g., 'jcvd_create_issue')
   * @returns Operation part (e.g., 'create_issue') or null if invalid
   */
  static getOperation(name: string): string | null {
    if (!this.isValid(name)) {
      return null;
    }
    return name.substring(5); // Remove 'jcvd_' prefix
  }
  
  /**
   * Create a JCVD tool name from operation
   * @param operation Operation name (e.g., 'create_issue')
   * @returns JCVD tool name (e.g., 'jcvd_create_issue')
   */
  static create(operation: string): string {
    return `jcvd_${operation}`;
  }
  
  /**
   * Get the category from a tool name based on naming patterns
   * @param name Tool name
   * @returns Inferred category or 'general'
   */
  static inferCategory(name: string): string {
    const operation = this.getOperation(name);
    if (!operation) {
      return 'general';
    }
    
    if (operation.includes('issue') || operation.includes('task')) {
      return 'issue_management';
    }
    if (operation.includes('project') || operation.includes('init')) {
      return 'project_bootstrap';
    }
    if (operation.includes('dependency') || operation.includes('relation')) {
      return 'dependency_management';
    }
    
    return 'general';
  }
}

/**
 * Error types for tool operations
 */
export class ToolError extends Error {
  public readonly code: string;
  public readonly toolName?: string;
  public readonly details?: any;
  
  constructor(
    message: string,
    code: string,
    toolName?: string,
    details?: any
  ) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    if (toolName !== undefined) {
      this.toolName = toolName;
    }
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export class ToolValidationError extends ToolError {
  constructor(message: string, toolName?: string, details?: any) {
    super(message, 'VALIDATION_ERROR', toolName, details);
    this.name = 'ToolValidationError';
  }
}

export class ToolExecutionError extends ToolError {
  constructor(message: string, toolName?: string, details?: any) {
    super(message, 'EXECUTION_ERROR', toolName, details);
    this.name = 'ToolExecutionError';
  }
}

export class ToolUnavailableError extends ToolError {
  constructor(toolName: string, reason?: string) {
    super(
      `Tool unavailable: ${toolName}${reason ? ` (${reason})` : ''}`,
      'TOOL_UNAVAILABLE',
      toolName
    );
    this.name = 'ToolUnavailableError';
  }
}

export class InvalidToolNameError extends ToolError {
  constructor(name: string) {
    super(`Invalid tool name: ${name} (must follow jcvd_[a-z][a-z0-9_]* pattern)`, 'INVALID_NAME');
    this.name = 'InvalidToolNameError';
  }
}