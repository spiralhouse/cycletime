/**
 * Main MCP Server Class - Production-ready MCP server implementation
 */

import EventEmitter from 'node:events';

import { createLogger } from '../../utils/logger.js';

import { MessageRouter } from './message-router.js';
import { ProtocolHandler, type JSONRPCRequest, type JSONRPCNotification } from './protocol-handler.js';
import { ServerLifecycle, type ServerConfig, type OperationResult } from './server-lifecycle.js';

import type { Logger } from '../../utils/logger.js';

/**
 * MCP Server capabilities interface
 */
export interface MCPCapabilities {
  resources?: any;
  tools?: any;
  prompts?: any;
}

/**
 * Server status interface
 */
export interface ServerStatus {
  name: string;
  version: string;
  running: boolean;
  uptime: number;
  capabilities: MCPCapabilities;
}

/**
 * Health information interface
 */
export interface HealthInfo {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  messageStats: any;
  lastActivity: number;
}

/**
 * Server event types
 */
export interface ServerEvents {
  start: { serverName: string; timestamp: number };
  stop: { serverName: string; timestamp: number };
  message: { type: 'request' | 'notification'; method: string; id?: string | number; timestamp: number };
  error: { error: any; timestamp: number };
}

/**
 * Configuration update options
 */
export interface ConfigUpdateOptions {
  replace?: boolean;
}

/**
 * Main MCP Server class
 */
export class MCPServer extends EventEmitter {
  private protocolHandler: ProtocolHandler;
  private messageRouter: MessageRouter;
  private lifecycle: ServerLifecycle;
  private config: ServerConfig;
  private logger: Logger;
  private lastActivity: number = 0;

  constructor(config: ServerConfig, logger?: Logger) {
    super();

    this.logger = logger || createLogger('mcp-server');
    this.validateConfig(config);
    
    this.config = {
      ...config,
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
        ...config.capabilities,
      },
    };

    this.protocolHandler = new ProtocolHandler(this.logger);
    this.messageRouter = new MessageRouter(this.logger);
    this.lifecycle = new ServerLifecycle(this.logger);

    this.setupDefaultHandlers();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<OperationResult> {
    try {
      // Check if already running
      if (this.lifecycle.isRunning()) {
        return {
          success: false,
          error: 'Server already running',
        };
      }

      // Initialize if stopped
      if (this.lifecycle.getStatus() === 'stopped') {
        const initResult = await this.lifecycle.initialize(this.config);

        if (!initResult.success) {
          return initResult;
        }
      }

      // Test error simulation
      if (this.config.simulateStartupError) {
        throw new Error('Simulated startup error');
      }

      // Start the server
      const startResult = await this.lifecycle.start();

      if (!startResult.success) {
        return startResult;
      }

      this.logger.info('MCP server started', {
        serverName: this.config.name,
        version: this.config.version,
      });

      this.emit('start', {
        serverName: this.config.name,
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to start MCP server', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: `Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<OperationResult> {
    try {
      if (!this.lifecycle.isRunning()) {
        this.logger.debug('Server stop requested but server not running');

        return { success: true };
      }

      const result = await this.lifecycle.shutdown();
      
      this.logger.info('MCP server stopped');
      
      this.emit('stop', {
        serverName: this.config.name,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to stop MCP server', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: `Failed to stop server: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Restart the MCP server
   */
  async restart(): Promise<OperationResult> {
    const stopResult = await this.stop();

    if (!stopResult.success) {
      return stopResult;
    }

    const startResult = await this.start();

    if (!startResult.success) {
      return startResult;
    }

    this.logger.info('MCP server restarted');
    
    return { success: true };
  }

  /**
   * Handle incoming message
   */
  async handleMessage(messageString: string): Promise<string | null> {
    this.lastActivity = Date.now();

    try {
      // First, try to parse JSON
      let message: any;
      try {
        message = JSON.parse(messageString);
      } catch (error) {
        const errorResponse = this.protocolHandler.formatErrorResponse(
          null,
          ProtocolHandler.createError(
            ProtocolHandler.ErrorCodes.PARSE_ERROR,
            'Parse error',
            { details: error instanceof Error ? error.message : String(error) }
          )
        );
        
        // Emit error event for parse errors
        this.emit('error', {
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: Date.now(),
        });

        return JSON.stringify(errorResponse);
      }

      // Then validate the JSON-RPC structure
      const validation = this.protocolHandler.validateMessage(message);

      if (!validation.isValid) {
        const errorResponse = this.protocolHandler.formatErrorResponse(
          'id' in message ? message.id : null,
          ProtocolHandler.createError(
            ProtocolHandler.ErrorCodes.INVALID_REQUEST,
            'Invalid Request',
            { details: validation.error }
          )
        );

        // Don't emit error event for validation errors - they're handled gracefully

        return JSON.stringify(errorResponse);
      }

      // Route the message based on type
      if (validation.messageType === 'request') {
        const request = message as JSONRPCRequest;
        
        this.emit('message', {
          type: 'request',
          method: request.method,
          id: request.id,
          timestamp: Date.now(),
        });

        const response = await this.messageRouter.routeRequest(request);

        return JSON.stringify(response);
      } else if (validation.messageType === 'notification') {
        const notification = message as JSONRPCNotification;
        
        this.emit('message', {
          type: 'notification',
          method: notification.method,
          timestamp: Date.now(),
        });

        await this.messageRouter.routeNotification(notification);

        return null; // Notifications don't return responses
      }

      return null;
    } catch (error) {
      this.logger.error('Error handling message', {
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit('error', {
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: Date.now(),
      });

      const errorResponse = this.protocolHandler.formatErrorResponse(
        null,
        ProtocolHandler.createError(
          ProtocolHandler.ErrorCodes.INTERNAL_ERROR,
          'Internal error',
          { details: error instanceof Error ? error.message : String(error) }
        )
      );

      return JSON.stringify(errorResponse);
    }
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.lifecycle.isRunning();
  }

  /**
   * Get server name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get server version
   */
  getVersion(): string {
    return this.config.version;
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): MCPCapabilities {
    return { ...this.config.capabilities };
  }

  /**
   * Update server capabilities
   */
  updateCapabilities(newCapabilities: MCPCapabilities, options: ConfigUpdateOptions = {}): void {
    this.config.capabilities = options.replace ? { ...newCapabilities } : {
        ...this.config.capabilities,
        ...newCapabilities,
      };

    this.logger.debug('Server capabilities updated', {
      capabilities: this.config.capabilities,
    });
  }

  /**
   * Get server status
   */
  getStatus(): ServerStatus {
    return {
      name: this.config.name,
      version: this.config.version,
      running: this.lifecycle.isRunning(),
      uptime: this.lifecycle.getUptime(),
      capabilities: this.getCapabilities(),
    };
  }

  /**
   * Get health information
   */
  getHealthInfo(): HealthInfo {
    return {
      status: this.lifecycle.isRunning() ? 'healthy' : 'unhealthy',
      uptime: this.lifecycle.getUptime(),
      memoryUsage: process.memoryUsage(),
      messageStats: this.messageRouter.getStatistics(),
      lastActivity: this.lastActivity,
    };
  }

  /**
   * Setup default MCP handlers
   */
  private setupDefaultHandlers(): void {
    // Initialize handler
    this.messageRouter.registerHandler('initialize', async (params) => {
      const protocolVersion = params?.protocolVersion;

      // Validate protocol version
      if (protocolVersion && !this.protocolHandler.isSupportedProtocolVersion(protocolVersion)) {
        throw new Error(`Unsupported protocol version: ${protocolVersion}`);
      }

      return {
        protocolVersion: protocolVersion || '2024-11-05',
        capabilities: this.getCapabilities(),
        serverInfo: {
          name: this.config.name,
          version: this.config.version,
        },
      };
    });

    // Ping handler
    this.messageRouter.registerHandler('ping', async () => {
      return {};
    });

    // Initialized notification handler
    this.messageRouter.registerNotificationHandler('notifications/initialized', async () => {
      this.logger.debug('Client initialized notification received');
    });

    // Add more default handlers as needed...
  }

  /**
   * Validate server configuration
   */
  private validateConfig(config: any): void {
    if (!config) {
      throw new Error('Invalid server configuration: config is required');
    }

    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error('Invalid server configuration: name is required and must be a non-empty string');
    }

    if (!config.version || typeof config.version !== 'string') {
      throw new Error('Invalid server configuration: version is required and must be a string');
    }
  }
}