/**
 * Health check system for MCP server components
 */

import EventEmitter from 'node:events';

import { createLogger } from '../../utils/logger.js';

import type { Logger } from '../../utils/logger.js';

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<HealthCheckResult>;

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Whether the component is healthy */
  healthy: boolean;
  /** Optional error message if unhealthy */
  error?: string;
  /** Additional metadata about the health check */
  metadata?: Record<string, unknown>;
}

/**
 * Overall health status
 */
export interface HealthStatus {
  /** Overall health status */
  status: 'healthy' | 'unhealthy';
  /** Timestamp of the health check */
  timestamp: number;
  /** Health status of individual components */
  components: Record<string, HealthCheckResult & { timestamp: number }>;
  /** Overall system metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Interval between health checks in milliseconds */
  checkInterval?: number;
  /** Timeout for individual health checks in milliseconds */
  timeoutMs?: number;
}

/**
 * Health check operation result
 */
export interface HealthCheckOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Health checker events
 */
export interface HealthCheckerEvents {
  'health-check': HealthStatus;
  'component-unhealthy': { component: string; result: HealthCheckResult };
  'component-healthy': { component: string; result: HealthCheckResult };
}

/**
 * Health checker system for monitoring component health
 */
export class HealthChecker extends EventEmitter {
  private logger: Logger;
  private config: Required<HealthCheckConfig>;
  private components = new Map<string, HealthCheckFunction>();
  private intervalId: NodeJS.Timeout | undefined;
  private running = false;
  private lastHealthStatus?: HealthStatus;

  constructor(config: HealthCheckConfig = {}) {
    super();

    this.logger = createLogger('health-checker');
    this.config = {
      checkInterval: config.checkInterval ?? 30_000, // 30 seconds
      timeoutMs: config.timeoutMs ?? 5000, // 5 seconds
    };
  }

  /**
   * Start health monitoring
   */
  async start(): Promise<HealthCheckOperationResult> {
    if (this.running) {
      return {
        success: false,
        error: 'Health checker is already running',
      };
    }

    try {
      this.running = true;

      // Perform initial health check (only if components are registered)
      if (this.components.size > 0) {
        await this.performHealthCheck();
      }

      // Start periodic health checks
      this.intervalId = setInterval(async () => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          this.logger.error('Error during periodic health check', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }, this.config.checkInterval);

      this.logger.info('Health checker started', {
        checkInterval: this.config.checkInterval,
        timeoutMs: this.config.timeoutMs,
        components: this.components.size,
      });

      return { success: true };
    } catch (error) {
      this.running = false;

      return {
        success: false,
        error: `Failed to start health checker: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Stop health monitoring
   */
  async stop(): Promise<HealthCheckOperationResult> {
    if (!this.running) {
      return { success: true };
    }

    try {
      this.running = false;

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }

      this.logger.info('Health checker stopped');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to stop health checker: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Register a component for health checking
   */
  registerComponent(componentName: string, healthCheck: HealthCheckFunction): void {
    this.components.set(componentName, healthCheck);

    this.logger.debug('Component registered for health checking', {
      componentName,
      totalComponents: this.components.size,
    });
  }

  /**
   * Unregister a component from health checking
   */
  unregisterComponent(componentName: string): void {
    this.components.delete(componentName);

    this.logger.debug('Component unregistered from health checking', {
      componentName,
      totalComponents: this.components.size,
    });
  }

  /**
   * Get list of registered components
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Check if health checker is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Perform health check on all registered components
   */
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const componentResults: Record<string, HealthCheckResult & { timestamp: number }> = {};
    let overallHealthy = true;

    this.logger.debug('Starting health check', {
      components: this.components.size,
    });

    // Check each component
    for (const [componentName, healthCheckFn] of this.components.entries()) {
      try {
        const result = await this.runHealthCheckWithTimeout(healthCheckFn);
        const timestamp = Date.now();

        componentResults[componentName] = {
          ...result,
          timestamp,
        };

        if (!result.healthy) {
          overallHealthy = false;
          this.emit('component-unhealthy', { component: componentName, result });
        } else {
          this.emit('component-healthy', { component: componentName, result });
        }
      } catch (error) {
        const timestamp = Date.now();
        const result: HealthCheckResult = {
          healthy: false,
          error: error instanceof Error ? error.message : String(error),
        };

        componentResults[componentName] = {
          ...result,
          timestamp,
        };

        overallHealthy = false;
        this.emit('component-unhealthy', { component: componentName, result });

        this.logger.warn('Health check failed for component', {
          componentName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const healthStatus: HealthStatus = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      components: componentResults,
      metadata: {
        checkDuration: Date.now() - startTime,
        componentCount: this.components.size,
      },
    };

    this.lastHealthStatus = healthStatus;

    this.logger.debug('Health check completed', {
      status: healthStatus.status,
      duration: healthStatus.metadata?.checkDuration,
      componentCount: Object.keys(componentResults).length,
    });

    return healthStatus;
  }

  /**
   * Get cached health status (from last check)
   */
  getHealthStatus(): HealthStatus | undefined {
    return this.lastHealthStatus;
  }

  /**
   * Perform health check and emit event
   */
  private async performHealthCheck(): Promise<void> {
    const healthStatus = await this.checkHealth();

    this.emit('health-check', healthStatus);
  }

  /**
   * Run health check function with timeout
   */
  private async runHealthCheckWithTimeout(
    healthCheckFn: HealthCheckFunction
  ): Promise<HealthCheckResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Health check timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      healthCheckFn()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}
