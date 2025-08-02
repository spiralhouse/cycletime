/**
 * MCP Tool Protocol Handler
 * 
 * Handles MCP tool protocol messages including tool listing,
 * execution, and capability advertisement. Integrates with
 * the tool registry to provide MCP-compliant tool services.
 */

import { createLogger } from '../../utils/logger.js';

import type { 
  JSONRPCRequest, 
  JSONRPCResponse, 
  JSONRPCError 
} from '../server/protocol-handler.js';
import { ProtocolHandler } from '../server/protocol-handler.js';

import type { 
  ToolExecutionContext, 
  ToolExecutionResult 
} from '../tools/tool-interface.js';
import { ToolError } from '../tools/tool-interface.js';
import type { ToolRegistry } from '../tools/tool-registry.js';
import type { MCPToolSchema } from '../tools/tool-metadata.js';
import { ToolMetadataManager } from '../tools/tool-metadata.js';

import type { Logger } from '../../utils/logger.js';

/**
 * MCP tool list request parameters
 */
export interface ToolListParams {
  /** Optional cursor for pagination */
  cursor?: string;
}

/**
 * MCP tool list response
 */
export interface ToolListResponse {
  /** Array of available tools */
  tools: MCPToolSchema[];
  
  /** Optional cursor for next page */
  nextCursor?: string;
}

/**
 * MCP tool call request parameters
 */
export interface ToolCallParams {
  /** Name of the tool to execute */
  name: string;
  
  /** Arguments to pass to the tool */
  arguments?: any;
}

/**
 * MCP tool call response
 */
export interface ToolCallResponse {
  /** Tool execution content/result */
  content: Array<{
    /** Content type */
    type: 'text' | 'resource';
    
    /** Content text or resource reference */
    text?: string;
    resource?: string;
  }>;
  
  /** Whether the tool call was successful */
  isError?: boolean;
}

/**
 * Tool execution statistics
 */
export interface ToolExecutionStats {
  /** Total tool executions */
  totalExecutions: number;
  
  /** Successful executions */
  successfulExecutions: number;
  
  /** Failed executions */
  failedExecutions: number;
  
  /** Average execution time in milliseconds */
  averageExecutionTime: number;
  
  /** Tool execution counts by tool name */
  executionsByTool: Record<string, number>;
}

/**
 * MCP Tool protocol handler
 */
export class ToolHandler {
  private logger: Logger;
  private registry: ToolRegistry;
  private metadataManager: ToolMetadataManager;
  private executionStats: ToolExecutionStats;

  constructor(registry: ToolRegistry) {
    this.logger = createLogger('tool-handler');
    this.registry = registry;
    this.metadataManager = new ToolMetadataManager();
    
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      executionsByTool: {}
    };

    this.logger.debug('Tool handler initialized');
  }

  /**
   * Handle tools/list request
   */
  async handleToolsList(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    try {
      this.logger.debug('Handling tools/list request', { id: request.id });

      // const params = request.params as ToolListParams || {};
      const tools = this.registry.getAllTools();

      // Convert tools to MCP schema format
      const mcpTools: MCPToolSchema[] = tools.map(tool => 
        this.metadataManager.generateMCPSchema(tool.metadata)
      );

      // TODO: Implement pagination if needed
      const response: ToolListResponse = {
        tools: mcpTools
      };

      this.logger.info('Tools list request completed', {
        id: request.id,
        toolCount: mcpTools.length
      });

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: response
      };

    } catch (error) {
      this.logger.error('Tools list request failed', {
        id: request.id,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        jsonrpc: '2.0',
        id: request.id,
        error: this.createError(
          ProtocolHandler.ErrorCodes.INTERNAL_ERROR,
          'Failed to list tools',
          { details: error instanceof Error ? error.message : String(error) }
        )
      };
    }
  }

  /**
   * Handle tools/call request
   */
  async handleToolCall(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Handling tool call request', {
        id: request.id,
        params: request.params
      });

      const params = request.params as ToolCallParams;
      
      if (!params?.name) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: this.createError(
            ProtocolHandler.ErrorCodes.INVALID_PARAMS,
            'Tool name is required',
            { provided: params }
          )
        };
      }

      // Get tool from registry
      const tool = this.registry.get(params.name);
      if (!tool) {
        this.logger.warn('Tool not found', {
          id: request.id,
          toolName: params.name
        });

        return {
          jsonrpc: '2.0',
          id: request.id,
          error: this.createError(
            ProtocolHandler.ErrorCodes.METHOD_NOT_FOUND,
            `Tool not found: ${params.name}`,
            { toolName: params.name }
          )
        };
      }

      // Check tool availability
      const isAvailable = await tool.isAvailable();
      if (!isAvailable) {
        this.logger.warn('Tool unavailable', {
          id: request.id,
          toolName: params.name
        });

        return {
          jsonrpc: '2.0',
          id: request.id,
          error: this.createError(
            ProtocolHandler.ErrorCodes.INTERNAL_ERROR,
            `Tool unavailable: ${params.name}`,
            { toolName: params.name, reason: 'Tool is currently unavailable' }
          )
        };
      }

      // Create execution context
      const context: ToolExecutionContext = {
        requestId: String(request.id),
        timestamp: Date.now(),
        metadata: {
          source: 'mcp',
          protocolVersion: '2024-11-05'
        }
      };

      // Execute tool
      const result = await tool.execute(params.arguments || {}, context);
      const executionTime = Date.now() - startTime;

      // Update statistics
      this.updateExecutionStats(params.name, result.success, executionTime);

      // Convert result to MCP format
      const mcpResponse = this.convertToMCPResponse(result);

      this.logger.info('Tool call completed', {
        id: request.id,
        toolName: params.name,
        success: result.success,
        executionTime
      });

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: mcpResponse
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const params = request.params as ToolCallParams;
      
      // Update statistics for failed execution
      if (params?.name) {
        this.updateExecutionStats(params.name, false, executionTime);
      }

      this.logger.error('Tool call failed', {
        id: request.id,
        toolName: params?.name,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      // Handle specific tool errors
      if (error instanceof ToolError) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: this.createError(
            this.mapToolErrorToMCPCode(error.code),
            error.message,
            { 
              toolName: error.toolName,
              details: error.details 
            }
          )
        };
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        error: this.createError(
          ProtocolHandler.ErrorCodes.INTERNAL_ERROR,
          'Tool execution failed',
          { 
            details: error instanceof Error ? error.message : String(error),
            toolName: params?.name
          }
        )
      };
    }
  }

  /**
   * Get tool execution statistics
   */
  getExecutionStatistics(): ToolExecutionStats {
    return { ...this.executionStats };
  }

  /**
   * Reset execution statistics
   */
  resetExecutionStatistics(): void {
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      executionsByTool: {}
    };

    this.logger.info('Execution statistics reset');
  }

  /**
   * Convert tool execution result to MCP response format
   */
  private convertToMCPResponse(result: ToolExecutionResult): ToolCallResponse {
    const content: ToolCallResponse['content'] = [];

    if (result.success) {
      // For successful results, format the data as text
      if (result.data) {
        content.push({
          type: 'text',
          text: typeof result.data === 'string' 
            ? result.data 
            : JSON.stringify(result.data, null, 2)
        });
      }

      // Add affected resources if available
      if (result.metadata?.affectedResources) {
        for (const resource of result.metadata.affectedResources) {
          content.push({
            type: 'resource',
            resource
          });
        }
      }
    } else {
      // For failed results, include error information
      content.push({
        type: 'text',
        text: result.error?.message || 'Tool execution failed'
      });
    }

    // If no content was generated, provide a default message
    if (content.length === 0) {
      content.push({
        type: 'text',
        text: result.success ? 'Tool executed successfully' : 'Tool execution failed'
      });
    }

    return {
      content,
      isError: !result.success
    };
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(toolName: string, success: boolean, executionTime: number): void {
    this.executionStats.totalExecutions++;
    this.registry.incrementExecutionCount();
    
    if (success) {
      this.executionStats.successfulExecutions++;
    } else {
      this.executionStats.failedExecutions++;
    }

    // Update average execution time
    const totalTime = this.executionStats.averageExecutionTime * (this.executionStats.totalExecutions - 1) + executionTime;
    this.executionStats.averageExecutionTime = totalTime / this.executionStats.totalExecutions;

    // Update per-tool statistics
    this.executionStats.executionsByTool[toolName] = (this.executionStats.executionsByTool[toolName] || 0) + 1;
  }

  /**
   * Map tool error codes to MCP error codes
   */
  private mapToolErrorToMCPCode(toolErrorCode: string): number {
    switch (toolErrorCode) {
      case 'VALIDATION_ERROR':
        return ProtocolHandler.ErrorCodes.INVALID_PARAMS;
      case 'TOOL_UNAVAILABLE':
        return ProtocolHandler.ErrorCodes.INTERNAL_ERROR;
      case 'EXECUTION_ERROR':
        return ProtocolHandler.ErrorCodes.INTERNAL_ERROR;
      case 'INVALID_NAME':
        return ProtocolHandler.ErrorCodes.METHOD_NOT_FOUND;
      default:
        return ProtocolHandler.ErrorCodes.INTERNAL_ERROR;
    }
  }

  /**
   * Create a JSON-RPC error object
   */
  private createError(code: number, message: string, data?: any): JSONRPCError {
    return ProtocolHandler.createError(code, message, data);
  }

  /**
   * Register handler methods with message router
   */
  registerHandlers(messageRouter: any): void {
    messageRouter.registerHandler('tools/list', this.handleToolsList.bind(this));
    messageRouter.registerHandler('tools/call', this.handleToolCall.bind(this));

    this.logger.info('Tool handlers registered with message router');
  }

  /**
   * Get handler capabilities for MCP server
   */
  getCapabilities(): any {
    return {
      tools: {
        listChanged: false // We don't currently support dynamic tool list changes
      }
    };
  }

  /**
   * Validate tool handler configuration
   */
  validateConfiguration(): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!this.registry) {
      errors.push('Tool registry is required');
    }

    if (this.registry && this.registry.isEmpty()) {
      errors.push('No tools registered in registry');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    } as { valid: boolean; errors?: string[] };
  }

  /**
   * Get handler status information
   */
  getStatus(): any {
    const registryStats = this.registry.getStatistics();
    
    return {
      totalTools: registryStats.totalTools,
      availableTools: registryStats.availableTools,
      executionStats: this.executionStats,
      uptime: this.registry.getUptime()
    };
  }
}