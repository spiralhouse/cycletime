/**
 * MCP Server Lifecycle Management
 */

import type { Logger } from '../../utils/logger.js';

/**
 * Server configuration interface
 */
export interface ServerConfig {
  name: string;
  version: string;
  capabilities: {
    resources?: any;
    tools?: any;
    prompts?: any;
  };
  shutdownTimeout?: number;
  simulateStartupError?: boolean; // Test flag
  simulateSlowShutdown?: boolean; // Test flag
}

/**
 * Operation result interface
 */
export interface OperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Server status enum
 */
export type ServerStatus = 'stopped' | 'initialized' | 'running';

/**
 * Health information interface
 */
export interface HealthInfo {
  status: ServerStatus;
  uptime: number;
  initialized: boolean;
  initializationTime: number | undefined;
  serverInfo: {
    name: string;
    version: string;
  };
}

/**
 * Manages server lifecycle (initialization, startup, shutdown)
 */
export class ServerLifecycle {
  private status: ServerStatus = 'stopped';
  private config: ServerConfig | undefined = undefined;
  private initializationTime: number | undefined = undefined;
  private startTime: number | undefined = undefined;

  constructor(private logger: Logger) {}

  /**
   * Initialize the server with configuration
   */
  async initialize(config: ServerConfig): Promise<OperationResult> {
    try {
      if (this.status !== 'stopped') {
        return {
          success: false,
          error: 'Server already initialized',
        };
      }

      // Validate configuration
      const validation = this.validateConfig(config);

      if (!validation.success) {
        return validation;
      }

      this.logger.info('Server initializing', {
        serverName: config.name,
        version: config.version,
      });

      this.config = config;
      this.initializationTime = Date.now();
      this.status = 'initialized';

      this.logger.info('Server initialization completed', {
        serverName: config.name,
        initializationTime: this.initializationTime,
      });

      return {
        success: true,
        data: {
          status: this.status,
          initializationTime: this.initializationTime,
        },
      };
    } catch (error) {
      this.logger.error('Server initialization failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<OperationResult> {
    try {
      if (this.status === 'stopped') {
        return {
          success: false,
          error: 'Server not initialized',
        };
      }

      if (this.status === 'running') {
        return {
          success: false,
          error: 'Server already running',
        };
      }

      // Test error simulation
      if (this.config?.simulateStartupError) {
        throw new Error('Simulated startup error');
      }

      this.logger.info('Server starting');

      this.startTime = Date.now();
      this.status = 'running';

      this.logger.info('Server started successfully', {
        serverName: this.config?.name,
        startTime: this.startTime,
      });

      return {
        success: true,
        data: {
          status: this.status,
          startTime: this.startTime,
        },
      };
    } catch (error) {
      this.logger.error('Server startup failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: `Startup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Shutdown the server
   */
  async shutdown(): Promise<OperationResult> {
    try {
      if (this.status === 'stopped') {
        this.logger.debug('Server shutdown requested but server not running');

        return {
          success: true,
          data: { message: 'Server was already stopped' },
        };
      }

      this.logger.info('Server shutdown initiated');

      // Handle graceful shutdown with timeout
      const shutdownTimeout = this.config?.shutdownTimeout || 5000;
      const shutdownPromise = this.performShutdown();

      let shutdownResult: any;

      try {
        if (this.config?.simulateSlowShutdown) {
          // Simulate slow shutdown that exceeds timeout
          await new Promise(resolve => setTimeout(resolve, shutdownTimeout + 100));
        }

        shutdownResult = await Promise.race([
          shutdownPromise,
          new Promise((_, reject) =>
            setTimeout(() => {
              reject(new Error('Shutdown timeout'));
            }, shutdownTimeout)
          ),
        ]);
      } catch (error) {
        if (error instanceof Error && error.message === 'Shutdown timeout') {
          this.logger.warn('Shutdown timeout exceeded, forcing shutdown', {
            timeout: shutdownTimeout,
          });
          // Force shutdown
          this.forceShutdown();
        } else {
          throw error;
        }
      }

      this.logger.info('Server shutdown completed');

      return {
        success: true,
        data: shutdownResult,
      };
    } catch (error) {
      this.logger.error('Server shutdown failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Force shutdown on error
      this.forceShutdown();

      return {
        success: false,
        error: `Shutdown failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get current server status
   */
  getStatus(): ServerStatus {
    return this.status;
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.status !== 'stopped';
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.status === 'running';
  }

  /**
   * Get initialization timestamp
   */
  getInitializationTimestamp(): number | undefined {
    return this.initializationTime;
  }

  /**
   * Get server uptime in milliseconds
   */
  getUptime(): number {
    if (!this.startTime || this.status !== 'running') {
      return 0;
    }

    return Date.now() - this.startTime;
  }

  /**
   * Get comprehensive health information
   */
  getHealthInfo(): HealthInfo {
    return {
      status: this.status,
      uptime: this.getUptime(),
      initialized: this.isInitialized(),
      initializationTime: this.initializationTime,
      serverInfo: {
        name: this.config?.name || 'unknown',
        version: this.config?.version || 'unknown',
      },
    };
  }

  /**
   * Validate server configuration
   */
  private validateConfig(config: any): OperationResult {
    if (!config) {
      return {
        success: false,
        error: 'Invalid server configuration: config is required',
      };
    }

    if (!config.name || typeof config.name !== 'string') {
      return {
        success: false,
        error: 'Invalid server configuration: name is required and must be a string',
      };
    }

    if (!config.version || typeof config.version !== 'string') {
      return {
        success: false,
        error: 'Invalid server configuration: version is required and must be a string',
      };
    }

    if (!config.capabilities || typeof config.capabilities !== 'object') {
      return {
        success: false,
        error: 'Invalid server configuration: capabilities is required and must be an object',
      };
    }

    return { success: true };
  }

  /**
   * Perform graceful shutdown
   */
  private async performShutdown(): Promise<any> {
    // Cleanup resources
    this.cleanup();

    return {
      shutdownTime: Date.now(),
      graceful: true,
    };
  }

  /**
   * Force immediate shutdown
   */
  private forceShutdown(): void {
    this.cleanup();
  }

  /**
   * Cleanup server resources and reset state
   */
  private cleanup(): void {
    this.status = 'stopped';
    this.startTime = undefined;
    this.initializationTime = undefined;
    this.config = undefined;
  }
}
