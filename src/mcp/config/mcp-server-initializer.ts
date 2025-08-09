/**
 * MCP server initialization system with proper sequencing and dependency management
 */

import { createLogger } from '../../utils/logger.js';
import { ComponentStatus } from '../health/component-status.js';
import { HealthChecker } from '../health/health-check.js';
import { ResourceRegistry } from '../resources/resource-registry.js';
import { MCPServer } from '../server/mcp-server.js';
import { ToolRegistry } from '../tools/tool-registry.js';

import { MCPConfigManager } from './mcp-config-manager.js';

import type { MCPServerConfig } from './mcp-config.js';
import type { Logger } from '../../utils/logger.js';

/**
 * Initialization result
 */
export interface InitializationResult {
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Component initialization status
 */
export interface ComponentInitStatus {
  initialized: boolean;
  error?: string;
  timestamp?: number;
}

/**
 * Overall initialization status
 */
export interface InitializationStatus {
  initialized: boolean;
  components: Record<string, ComponentInitStatus>;
  errors: string[];
  timestamp: number;
}

/**
 * Dependency graph for component initialization
 */
type DependencyGraph = Record<string, string[]>;

/**
 * MCP Server initializer with dependency management and proper sequencing
 */
export class MCPServerInitializer {
  private logger: Logger;
  private config: MCPServerConfig;
  private server: MCPServer | undefined;
  private healthChecker: HealthChecker | undefined;
  private componentStatus: ComponentStatus;
  private resourceRegistry: ResourceRegistry | undefined;
  private toolRegistry: ToolRegistry | undefined;
  private initialized = false;
  private componentStatuses = new Map<string, ComponentInitStatus>();
  private dependencies: DependencyGraph = {};

  constructor(config: MCPServerConfig) {
    this.logger = createLogger('mcp-initializer');
    this.config = config;
    this.componentStatus = new ComponentStatus();

    // Set up default dependencies
    this.setupDefaultDependencies();
  }

  /**
   * Initialize all components in proper order
   */
  async initialize(): Promise<InitializationResult> {
    this.logger.info('Starting MCP server initialization...', {
      serverName: this.config.server.name,
      transport: this.config.server.transport,
    });

    try {
      // Reset state
      this.initialized = false;
      this.componentStatuses.clear();
      this.componentStatus.clear();

      // Initialize in dependency order
      const initOrder = this.getInitializationOrder();

      for (const component of initOrder) {
        await this.initializeComponent(component);
      }

      this.initialized = true;

      this.logger.info('MCP server initialization completed successfully');

      return {
        success: true,
        details: {
          initOrder,
          componentCount: this.componentStatuses.size,
        },
      };
    } catch (error) {
      this.logger.error('MCP server initialization failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Cleanup on failure
      await this.cleanup();

      return {
        success: false,
        error: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Shutdown all components in reverse order
   */
  async shutdown(): Promise<InitializationResult> {
    this.logger.info('Starting MCP server shutdown...');

    try {
      // Shutdown in reverse dependency order
      const shutdownOrder = this.getInitializationOrder().reverse();

      for (const component of shutdownOrder) {
        await this.shutdownComponent(component);
      }

      this.initialized = false;
      this.componentStatuses.clear();
      this.componentStatus.clear();

      this.logger.info('MCP server shutdown completed successfully');

      return { success: true };
    } catch (error) {
      this.logger.error('MCP server shutdown failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: `Shutdown failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Restart the server
   */
  async restart(): Promise<InitializationResult> {
    this.logger.info('Restarting MCP server...');

    const shutdownResult = await this.shutdown();

    if (!shutdownResult.success) {
      return shutdownResult;
    }

    return await this.initialize();
  }

  /**
   * Reconfigure the server with new configuration
   */
  async reconfigure(newConfig: MCPServerConfig): Promise<InitializationResult> {
    this.logger.info('Reconfiguring MCP server...');

    try {
      // Validate new configuration
      MCPConfigManager.validateMCPConfig(newConfig);

      // Store old config for rollback
      const oldConfig = this.config;

      try {
        // Apply new configuration
        this.config = newConfig;

        // Restart with new configuration
        const restartResult = await this.restart();

        if (!restartResult.success) {
          // Rollback on failure
          this.config = oldConfig;
          await this.restart();
          throw new Error(`Reconfiguration failed: ${restartResult.error}`);
        }

        this.logger.info('MCP server reconfiguration completed successfully');

        return { success: true };
      } catch (error) {
        // Rollback configuration
        this.config = oldConfig;
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: `Reconfiguration failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get initialization status
   */
  getStatus(): InitializationStatus {
    const components: Record<string, ComponentInitStatus> = {};
    const errors: string[] = [];

    for (const [component, status] of this.componentStatuses.entries()) {
      components[component] = status;
      if (status.error) {
        errors.push(`${component}: ${status.error}`);
      }
    }

    return {
      initialized: this.initialized,
      components,
      errors,
      timestamp: Date.now(),
    };
  }

  /**
   * Add component dependency
   */
  addDependency(component: string, dependency: string): void {
    if (!this.dependencies[component]) {
      this.dependencies[component] = [];
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(component, dependency)) {
      throw new Error(`Circular dependency detected: ${component} -> ${dependency}`);
    }

    this.dependencies[component].push(dependency);
  }

  /**
   * Get dependencies for a component
   */
  private getDependencies(component: string): string[] {
    return this.dependencies[component] || [];
  }

  /**
   * Setup default component dependencies
   */
  private setupDefaultDependencies(): void {
    // Resources depend on server
    if (this.config.resources.enabled) {
      this.addDependency('resources', 'server');
    }

    // Tools depend on server
    if (this.config.tools.enabled) {
      this.addDependency('tools', 'server');
    }

    // Health checks depend on all other components
    this.addDependency('health', 'server');
    if (this.config.resources.enabled) {
      this.addDependency('health', 'resources');
    }
    if (this.config.tools.enabled) {
      this.addDependency('health', 'tools');
    }
  }

  /**
   * Get initialization order based on dependencies
   */
  private getInitializationOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (component: string) => {
      if (visiting.has(component)) {
        throw new Error(`Circular dependency detected involving: ${component}`);
      }
      if (visited.has(component)) {
        return;
      }

      visiting.add(component);

      const deps = this.getDependencies(component);

      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(component);
      visited.add(component);
      order.push(component);
    };

    // Visit all components
    const allComponents = ['config', 'server', 'resources', 'tools', 'health'];

    for (const component of allComponents) {
      if (!visited.has(component)) {
        visit(component);
      }
    }

    return order;
  }

  /**
   * Check for circular dependencies
   */
  private hasCircularDependency(component: string, newDep: string): boolean {
    const visited = new Set<string>();

    const checkCycle = (current: string): boolean => {
      if (current === component) {
        return true;
      }
      if (visited.has(current)) {
        return false;
      }

      visited.add(current);

      const deps = this.getDependencies(current);

      for (const dep of deps) {
        if (checkCycle(dep)) {
          return true;
        }
      }

      return false;
    };

    return checkCycle(newDep);
  }

  /**
   * Initialize a specific component
   */
  private async initializeComponent(component: string): Promise<void> {
    this.logger.debug(`Initializing component: ${component}`);

    this.componentStatuses.set(component, {
      initialized: false,
      timestamp: Date.now(),
    });

    this.componentStatus.setStatus(component, 'initializing');

    try {
      switch (component) {
        case 'config':
          await this.initializeConfig();
          break;

        case 'server':
          await this.initializeServer();
          break;

        case 'resources':
          if (this.config.resources.enabled) {
            await this.initializeResources();
          }
          break;

        case 'tools':
          if (this.config.tools.enabled) {
            await this.initializeTools();
          }
          break;

        case 'health':
          await this.initializeHealthChecks();
          break;

        default:
          throw new Error(`Unknown component: ${component}`);
      }

      this.componentStatuses.set(component, {
        initialized: true,
        timestamp: Date.now(),
      });

      this.componentStatus.setStatus(component, 'running');

      this.logger.debug(`Component initialized successfully: ${component}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.componentStatuses.set(component, {
        initialized: false,
        error: errorMessage,
        timestamp: Date.now(),
      });

      this.componentStatus.setStatus(component, 'error', {}, errorMessage);

      throw new Error(`Failed to initialize ${component}: ${errorMessage}`);
    }
  }

  /**
   * Shutdown a specific component
   */
  private async shutdownComponent(component: string): Promise<void> {
    this.logger.debug(`Shutting down component: ${component}`);

    this.componentStatus.setStatus(component, 'stopping');

    try {
      switch (component) {
        case 'health':
          await this.shutdownHealthChecks();
          break;

        case 'tools':
          await this.shutdownTools();
          break;

        case 'resources':
          await this.shutdownResources();
          break;

        case 'server':
          await this.shutdownServer();
          break;

        case 'config':
          // Config doesn't need shutdown
          break;

        default:
          this.logger.warn(`Unknown component for shutdown: ${component}`);
      }

      this.componentStatus.setStatus(component, 'stopped');

      this.logger.debug(`Component shut down successfully: ${component}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.componentStatus.setStatus(component, 'error', {}, errorMessage);
      throw new Error(`Failed to shutdown ${component}: ${errorMessage}`);
    }
  }

  /**
   * Initialize configuration
   */
  private async initializeConfig(): Promise<void> {
    // Validate configuration again
    MCPConfigManager.validateMCPConfig(this.config);
  }

  /**
   * Initialize MCP server
   */
  private async initializeServer(): Promise<void> {
    this.server = new MCPServer({
      name: this.config.server.name,
      version: this.config.server.version,
      capabilities: {
        resources: this.config.resources.enabled ? {} : undefined,
        tools: this.config.tools.enabled ? {} : undefined,
      },
    });

    const result = await this.server.start();

    if (!result.success) {
      throw new Error(result.error || 'Server failed to start');
    }
  }

  /**
   * Initialize resources system
   */
  private async initializeResources(): Promise<void> {
    this.resourceRegistry = new ResourceRegistry();
    // Additional resource initialization logic here
  }

  /**
   * Initialize tools system
   */
  private async initializeTools(): Promise<void> {
    this.toolRegistry = new ToolRegistry();
    // Additional tool initialization logic here
  }

  /**
   * Initialize health checks
   */
  private async initializeHealthChecks(): Promise<void> {
    this.healthChecker = new HealthChecker({
      checkInterval: this.config.health.checkInterval ?? 30_000,
      timeoutMs: this.config.health.timeoutMs ?? 5000,
    });

    // Register component health checks
    if (this.server) {
      this.healthChecker.registerComponent('server', async () => ({
        healthy: this.server!.isRunning(),
      }));
    }

    if (this.resourceRegistry) {
      this.healthChecker.registerComponent('resources', async () => ({
        healthy: true, // Add actual resource health check
      }));
    }

    if (this.toolRegistry) {
      this.healthChecker.registerComponent('tools', async () => ({
        healthy: !this.toolRegistry!.isEmpty(),
      }));
    }

    const result = await this.healthChecker.start();

    if (!result.success) {
      throw new Error(result.error || 'Health checker failed to start');
    }
  }

  /**
   * Shutdown health checks
   */
  private async shutdownHealthChecks(): Promise<void> {
    if (this.healthChecker) {
      await this.healthChecker.stop();
      this.healthChecker = undefined;
    }
  }

  /**
   * Shutdown tools system
   */
  private async shutdownTools(): Promise<void> {
    // Tool registry cleanup if needed
    this.toolRegistry = undefined;
  }

  /**
   * Shutdown resources system
   */
  private async shutdownResources(): Promise<void> {
    // Resource registry cleanup if needed
    this.resourceRegistry = undefined;
  }

  /**
   * Shutdown MCP server
   */
  private async shutdownServer(): Promise<void> {
    if (this.server) {
      const result = await this.server.stop();

      if (!result.success) {
        throw new Error(result.error || 'Server failed to stop');
      }
      this.server = undefined;
    }
  }

  /**
   * Cleanup all components (for error recovery)
   */
  private async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up after initialization failure...');

    try {
      if (this.healthChecker) {
        await this.healthChecker.stop();
        this.healthChecker = undefined;
      }
    } catch (error) {
      this.logger.warn('Error cleaning up health checker', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      if (this.server) {
        await this.server.stop();
        this.server = undefined;
      }
    } catch (error) {
      this.logger.warn('Error cleaning up server', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.toolRegistry = undefined;
    this.resourceRegistry = undefined;
    this.initialized = false;
  }
}
