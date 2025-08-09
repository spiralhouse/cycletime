/**
 * MCP Tools Module
 * 
 * Public exports for the JCVD MCP tools framework.
 * Provides tool interfaces, base implementations, validation,
 * registry management, and MCP protocol integration.
 */

// Core interfaces and types
export type {
  Tool,
  PreviewableTool,
  ToolFactory,
  ToolCapability,
  ToolMetadata,
  ToolParameterSchema,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolParameterValidationResult,
  IToolError
} from './tool-interface.js';

// Tool interface utilities and errors
export {
  ToolName,
  ToolError,
  ToolValidationError,
  ToolExecutionError,
  ToolUnavailableError,
  InvalidToolNameError
} from './tool-interface.js';

// Base tool implementation
export { BaseTool } from './base-tool.js';

// Parameter validation
export type { ValidationError } from './tool-validator.js';
export { ToolValidator } from './tool-validator.js';

// Metadata management
export type {
  MCPToolSchema,
  MetadataValidationResult,
  MetadataComparisonResult
} from './tool-metadata.js';
export { ToolMetadataManager } from './tool-metadata.js';

// Tool registry
export type {
  ToolInfo,
  ToolHealthCheck,
  ToolDiscovery,
  RegistryStatistics,
  BatchRegistrationResult,
  RegistryEvents
} from './tool-registry.js';
export { ToolRegistry } from './tool-registry.js';

// MCP protocol handler (from handlers directory)
export type {
  ToolListParams,
  ToolListResponse,
  ToolCallParams,
  ToolCallResponse,
  ToolExecutionStats
} from '../handlers/tool-handler.js';
export { ToolHandler } from '../handlers/tool-handler.js';

/**
 * Tool framework version
 */
export const TOOL_FRAMEWORK_VERSION = '1.0.0';

/**
 * Standard tool categories used by JCVD
 */
export const TOOL_CATEGORIES = {
  ISSUE_MANAGEMENT: 'issue_management',
  PROJECT_BOOTSTRAP: 'project_bootstrap',
  DEPENDENCY_MANAGEMENT: 'dependency_management',
  GENERAL: 'general'
} as const;

/**
 * Standard tool capabilities supported by the framework
 */
export const TOOL_CAPABILITIES = {
  EXECUTE: 'execute',
  VALIDATE: 'validate',
  PREVIEW: 'preview'
} as const;

/**
 * Common parameter schema patterns for tool development
 */
export const COMMON_PARAMETER_SCHEMAS = {
  /**
   * Schema for issue title parameter
   */
  ISSUE_TITLE: {
    type: 'string' as const,
    description: 'The issue title',
    minLength: 1,
    maxLength: 200
  },
  
  /**
   * Schema for issue type parameter
   */
  ISSUE_TYPE: {
    type: 'string' as const,
    enum: ['epic', 'story', 'subtask'],
    description: 'Issue type in the hierarchy'
  },
  
  /**
   * Schema for priority parameter
   */
  PRIORITY: {
    type: 'number' as const,
    minimum: 1,
    maximum: 4,
    default: 3,
    description: 'Priority level (1=urgent, 2=high, 3=normal, 4=low)'
  },
  
  /**
   * Schema for estimate parameter
   */
  ESTIMATE: {
    type: 'number' as const,
    minimum: 1,
    maximum: 13,
    description: 'Effort estimate in story points'
  },
  
  /**
   * Schema for project ID parameter
   */
  PROJECT_ID: {
    type: 'string' as const,
    pattern: '^proj_[a-zA-Z0-9_-]+$',
    description: 'Project identifier'
  },
  
  /**
   * Schema for issue ID parameter
   */
  ISSUE_ID: {
    type: 'string' as const,
    pattern: '^(issue_|epic_|story_|subtask_)[a-zA-Z0-9_-]+$',
    description: 'Issue identifier'
  }
} as const;

/**
 * Utility functions for tool development
 */
export const ToolUtils = {
  /**
   * Create a basic tool metadata template
   */
  createMetadataTemplate(
    name: string,
    description: string,
    capabilities: string[] = ['execute']
  ): any {
    // Dynamic import to avoid circular dependencies
    const manager = new (require('./tool-metadata.js').ToolMetadataManager)();

    return manager.createFromTemplate(name, description, capabilities as any);
  },
  
  /**
   * Validate tool name format
   */
  isValidToolName(name: string): boolean {
    return /^jcvd_[a-z][\d_a-z]*$/.test(name);
  },
  
  /**
   * Create tool name from operation
   */
  createToolName(operation: string): string {
    return `jcvd_${operation}`;
  },
  
  /**
   * Get operation from tool name
   */
  getOperation(toolName: string): string | null {
    if (!this.isValidToolName(toolName)) {
      return null;
    }

    return toolName.slice(5); // Remove 'jcvd_' prefix
  },
  
  /**
   * Infer category from tool name
   */
  inferCategory(toolName: string): string {
    const operation = this.getOperation(toolName);

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
} as const;