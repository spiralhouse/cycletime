/**
 * Tool Registry
 *
 * Manages lifecycle operations, discovery, cleanup, and coordination
 * of JCVD MCP tools. Provides centralized tool management with
 * event-driven architecture and comprehensive discovery capabilities.
 */

import EventEmitter from 'node:events';

import { createLogger } from '../../utils/logger.js';

import { ToolName, ToolError, InvalidToolNameError } from './tool-interface.js';
import { ToolMetadataManager } from './tool-metadata.js';

import type { Tool, ToolCapability } from './tool-interface.js';
import type { Logger } from '../../utils/logger.js';

/**
 * Tool registration information
 */
export interface ToolInfo {
  /** The registered tool */
  tool: Tool;

  /** Registration timestamp */
  registeredAt: number;

  /** Last access timestamp */
  lastAccessed: number;

  /** Access count */
  accessCount: number;

  /** Whether tool is currently available */
  isAvailable?: boolean;

  /** Last health check timestamp */
  lastHealthCheck?: number;
}

/**
 * Tool health check result
 */
export interface ToolHealthCheck {
  /** Whether the tool is available */
  isAvailable: boolean;

  /** Health check timestamp */
  checkedAt: number;

  /** Optional error message if unavailable */
  error?: string;

  /** Health check duration in milliseconds */
  checkDuration?: number;
}

/**
 * Tool discovery interface for finding tools
 */
export interface ToolDiscovery {
  /** Find tools by capability */
  findByCapability: (capability: ToolCapability) => Tool[];

  /** Find tools by category */
  findByCategory: (category: string) => Tool[];

  /** Find tools by name pattern */
  findByPattern: (pattern: string) => Tool[];

  /** Find tools by tag */
  findByTag: (tag: string) => Tool[];

  /** Get all tools */
  getAllTools: () => Tool[];
}

/**
 * Registry statistics
 */
export interface RegistryStatistics {
  /** Total number of registered tools */
  totalTools: number;

  /** Tools grouped by capability */
  toolsByCapability: Record<string, number>;

  /** Tools grouped by category */
  toolsByCategory: Record<string, number>;

  /** Total tool executions */
  totalExecutions: number;

  /** Total access count across all tools */
  totalAccesses: number;

  /** Registry uptime in milliseconds */
  uptime: number;

  /** Available tools count */
  availableTools: number;

  /** Unavailable tools count */
  unavailableTools: number;
}

/**
 * Batch registration result
 */
export interface BatchRegistrationResult {
  /** Successfully registered tools */
  successful: Tool[];

  /** Failed registrations with errors */
  failed: { tool: Tool; error: string }[];
}

/**
 * Registry events
 */
export interface RegistryEvents {
  'tool-registered': { toolName: string; tool: Tool; registeredAt: number };
  'tool-unregistered': { toolName: string; tool: Tool; unregisteredAt: number };
  'batch-registered': { tools: Tool[]; count: number; registeredAt: number };
  'tool-accessed': { toolName: string; accessCount: number; accessedAt: number };
  'tool-health-changed': { toolName: string; isAvailable: boolean; checkedAt: number };
  'cleanup-completed': { cleanupType: string; toolsRemoved: number; completedAt: number };
}

/**
 * Central registry for managing JCVD MCP tools
 */
export class ToolRegistry extends EventEmitter implements ToolDiscovery {
  private tools = new Map<string, ToolInfo>();
  private metadataManager = new ToolMetadataManager();
  private logger: Logger;
  private createdAt = Date.now();
  private executionCount = 0;

  constructor() {
    super();
    this.logger = createLogger('tool-registry');
    this.logger.debug('Tool registry initialized');
  }

  /**
   * Register a tool in the registry
   */
  register(tool: Tool): void {
    // Validate tool name
    if (!ToolName.isValid(tool.name)) {
      throw new InvalidToolNameError(tool.name);
    }

    // Check for duplicate registration
    if (this.tools.has(tool.name)) {
      throw new ToolError(
        `Tool already registered: ${tool.name}`,
        'DUPLICATE_REGISTRATION',
        tool.name
      );
    }

    // Validate tool metadata
    const validation = this.metadataManager.validateMetadata(tool.metadata);

    if (!validation.valid) {
      throw new ToolError(
        `Invalid tool metadata: ${validation.errors?.join(', ')}`,
        'INVALID_METADATA',
        tool.name
      );
    }

    const now = Date.now();
    const toolInfo: ToolInfo = {
      tool,
      registeredAt: now,
      lastAccessed: 0,
      accessCount: 0,
    };

    this.tools.set(tool.name, toolInfo);

    this.logger.info('Tool registered', {
      toolName: tool.name,
      version: tool.metadata.version,
      capabilities: tool.metadata.capabilities,
    });

    this.emit('tool-registered', {
      toolName: tool.name,
      tool,
      registeredAt: now,
    });
  }

  /**
   * Unregister a tool from the registry
   */
  unregister(toolName: string): void {
    const toolInfo = this.tools.get(toolName);

    if (!toolInfo) {
      this.logger.debug('Tool unregister requested but tool not found', { toolName });

      return; // Gracefully handle non-existent tools
    }

    this.tools.delete(toolName);

    this.logger.info('Tool unregistered', { toolName });

    this.emit('tool-unregistered', {
      toolName,
      tool: toolInfo.tool,
      unregisteredAt: Date.now(),
    });
  }

  /**
   * Check if a tool is registered
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get a registered tool and update access tracking
   */
  get(toolName: string): Tool | undefined {
    const toolInfo = this.tools.get(toolName);

    if (toolInfo) {
      // Update access tracking
      const now = Date.now();

      toolInfo.lastAccessed = now;
      toolInfo.accessCount++;

      this.emit('tool-accessed', {
        toolName,
        accessCount: toolInfo.accessCount,
        accessedAt: now,
      });

      return toolInfo.tool;
    }

    return undefined;
  }

  /**
   * Get tool information including metadata
   */
  getToolInfo(toolName: string): ToolInfo | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map(info => info.tool);
  }

  /**
   * Register multiple tools in batch
   */
  registerBatch(tools: Tool[]): void {
    const registeredAt = Date.now();

    try {
      for (const tool of tools) {
        this.register(tool);
      }

      this.logger.info('Batch registration completed', {
        toolCount: tools.length,
        totalTools: this.tools.size,
      });

      this.emit('batch-registered', {
        tools,
        count: tools.length,
        registeredAt,
      });
    } catch (error) {
      // If any registration fails, rollback all tools registered in this batch
      const failedTool = tools.find(t => t.name === (error as any).toolName);
      const toolsToRollback = tools.slice(0, failedTool ? tools.indexOf(failedTool) : 0);

      for (const tool of toolsToRollback) {
        this.unregister(tool.name);
      }

      this.logger.error('Batch registration failed, rolled back', {
        attemptedCount: tools.length,
        rolledBack: toolsToRollback.length,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Register multiple tools with partial failure handling
   */
  registerBatchSafe(tools: Tool[]): BatchRegistrationResult {
    const successful: Tool[] = [];
    const failed: { tool: Tool; error: string }[] = [];

    for (const tool of tools) {
      try {
        this.register(tool);
        successful.push(tool);
      } catch (error) {
        failed.push({
          tool,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (successful.length > 0) {
      this.logger.info('Safe batch registration completed', {
        successful: successful.length,
        failed: failed.length,
        totalTools: this.tools.size,
      });

      this.emit('batch-registered', {
        tools: successful,
        count: successful.length,
        registeredAt: Date.now(),
      });
    }

    return { successful, failed };
  }

  /**
   * Unregister multiple tools in batch
   */
  unregisterBatch(toolNames: string[]): void {
    for (const toolName of toolNames) {
      this.unregister(toolName);
    }

    this.logger.info('Batch unregistration completed', {
      toolCount: toolNames.length,
      totalTools: this.tools.size,
    });
  }

  /**
   * Find tools by capability
   */
  findByCapability(capability: ToolCapability): Tool[] {
    const results: Tool[] = [];

    for (const toolInfo of this.tools.values()) {
      if (toolInfo.tool.metadata.capabilities.includes(capability)) {
        results.push(toolInfo.tool);
      }
    }

    this.logger.debug('Tools found by capability', {
      capability,
      count: results.length,
    });

    return results;
  }

  /**
   * Find tools by category
   */
  findByCategory(category: string): Tool[] {
    const results: Tool[] = [];

    for (const toolInfo of this.tools.values()) {
      const toolCategory =
        toolInfo.tool.metadata.category || ToolName.inferCategory(toolInfo.tool.name);

      if (toolCategory === category) {
        results.push(toolInfo.tool);
      }
    }

    this.logger.debug('Tools found by category', {
      category,
      count: results.length,
    });

    return results;
  }

  /**
   * Find tools matching a name pattern
   */
  findByPattern(pattern: string): Tool[] {
    const results: Tool[] = [];

    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[$()+.?[\\\]^{|}]/g, '\\$&') // Escape special regex chars
      .replace(/\\\*/g, '.*'); // Convert \* back to .* for wildcards

    const regex = new RegExp(`^${regexPattern}$`);

    for (const [toolName, toolInfo] of this.tools) {
      if (regex.test(toolName)) {
        results.push(toolInfo.tool);
      }
    }

    this.logger.debug('Tools found by pattern', {
      pattern,
      count: results.length,
    });

    return results;
  }

  /**
   * Find tools by tag
   */
  findByTag(tag: string): Tool[] {
    const results: Tool[] = [];

    for (const toolInfo of this.tools.values()) {
      if (toolInfo.tool.metadata.tags?.includes(tag)) {
        results.push(toolInfo.tool);
      }
    }

    this.logger.debug('Tools found by tag', {
      tag,
      count: results.length,
    });

    return results;
  }

  /**
   * Check tool health
   */
  async checkToolHealth(toolName: string): Promise<ToolHealthCheck> {
    const toolInfo = this.tools.get(toolName);

    if (!toolInfo) {
      return {
        isAvailable: false,
        checkedAt: Date.now(),
        error: 'Tool not found in registry',
      };
    }

    const startTime = Date.now();

    try {
      const isAvailable = await toolInfo.tool.isAvailable();
      const checkedAt = Date.now();
      const checkDuration = checkedAt - startTime;

      // Update tool info
      const wasAvailable = toolInfo.isAvailable;

      toolInfo.isAvailable = isAvailable;
      toolInfo.lastHealthCheck = checkedAt;

      // Emit event if availability changed
      if (wasAvailable !== undefined && wasAvailable !== isAvailable) {
        this.emit('tool-health-changed', {
          toolName,
          isAvailable,
          checkedAt,
        });
      }

      this.logger.debug('Tool health checked', {
        toolName,
        isAvailable,
        checkDuration,
      });

      return {
        isAvailable,
        checkedAt,
        checkDuration,
      };
    } catch (error) {
      const checkedAt = Date.now();
      const checkDuration = checkedAt - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update tool info
      toolInfo.isAvailable = false;
      toolInfo.lastHealthCheck = checkedAt;

      this.logger.warn('Tool health check failed', {
        toolName,
        error: errorMessage,
        checkDuration,
      });

      return {
        isAvailable: false,
        checkedAt,
        error: errorMessage,
        checkDuration,
      };
    }
  }

  /**
   * Check health of all tools
   */
  async checkAllToolsHealth(): Promise<Record<string, ToolHealthCheck>> {
    const results: Record<string, ToolHealthCheck> = {};
    const promises: Promise<void>[] = [];

    for (const toolName of this.tools.keys()) {
      promises.push(
        this.checkToolHealth(toolName).then(result => {
          results[toolName] = result;
        })
      );
    }

    await Promise.all(promises);

    this.logger.info('All tools health checked', {
      totalTools: Object.keys(results).length,
      availableTools: Object.values(results).filter(r => r.isAvailable).length,
    });

    return results;
  }

  /**
   * Get registry statistics
   */
  getStatistics(): RegistryStatistics {
    const toolsByCapability: Record<string, number> = {};
    const toolsByCategory: Record<string, number> = {};
    let totalAccesses = 0;
    let availableTools = 0;
    let unavailableTools = 0;

    for (const toolInfo of this.tools.values()) {
      const tool = toolInfo.tool;

      // Count by capabilities
      for (const capability of tool.metadata.capabilities) {
        toolsByCapability[capability] = (toolsByCapability[capability] || 0) + 1;
      }

      // Count by category
      const category = tool.metadata.category || ToolName.inferCategory(tool.name);

      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;

      // Sum total accesses
      totalAccesses += toolInfo.accessCount;

      // Count availability
      if (toolInfo.isAvailable === true) {
        availableTools++;
      } else if (toolInfo.isAvailable === false) {
        unavailableTools++;
      }
    }

    return {
      totalTools: this.tools.size,
      toolsByCapability,
      toolsByCategory,
      totalExecutions: this.executionCount,
      totalAccesses,
      uptime: Date.now() - this.createdAt,
      availableTools,
      unavailableTools,
    };
  }

  /**
   * Increment execution count (called externally when tools are executed)
   */
  incrementExecutionCount(): void {
    this.executionCount++;
  }

  /**
   * Clean up all tools
   */
  cleanup(): void {
    const toolCount = this.tools.size;

    this.tools.clear();
    this.executionCount = 0;

    this.logger.info('Registry cleanup completed', { toolsRemoved: toolCount });

    this.emit('cleanup-completed', {
      cleanupType: 'full',
      toolsRemoved: toolCount,
      completedAt: Date.now(),
    });
  }

  /**
   * Clean up tools by category
   */
  cleanupByCategory(category: string): void {
    const toolsToRemove: string[] = [];

    for (const [toolName, toolInfo] of this.tools) {
      const toolCategory = toolInfo.tool.metadata.category || ToolName.inferCategory(toolName);

      if (toolCategory === category) {
        toolsToRemove.push(toolName);
      }
    }

    for (const toolName of toolsToRemove) {
      this.tools.delete(toolName);
    }

    this.logger.info('Category cleanup completed', {
      category,
      toolsRemoved: toolsToRemove.length,
    });

    this.emit('cleanup-completed', {
      cleanupType: `category:${category}`,
      toolsRemoved: toolsToRemove.length,
      completedAt: Date.now(),
    });
  }

  /**
   * Clean up stale tools based on age
   */
  cleanupStale(maxAgeMs: number): number {
    const cutoffTime = Date.now() - maxAgeMs;
    const toolsToRemove: string[] = [];

    for (const [toolName, toolInfo] of this.tools) {
      if (toolInfo.registeredAt < cutoffTime) {
        toolsToRemove.push(toolName);
      }
    }

    for (const toolName of toolsToRemove) {
      this.tools.delete(toolName);
    }

    if (toolsToRemove.length > 0) {
      this.logger.info('Stale tools cleanup completed', {
        toolsRemoved: toolsToRemove.length,
        maxAgeMs,
      });

      this.emit('cleanup-completed', {
        cleanupType: 'stale',
        toolsRemoved: toolsToRemove.length,
        completedAt: Date.now(),
      });
    }

    return toolsToRemove.length;
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Check if registry is empty
   */
  isEmpty(): boolean {
    return this.tools.size === 0;
  }

  /**
   * Get registry uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.createdAt;
  }
}
