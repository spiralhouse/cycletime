/**
 * JCVD Provider Health Monitor
 * Continuous health monitoring and status management for providers
 */

import type { ProviderStatus, ProviderError } from '../types.js';

// =============================================================================
// Health Monitor Interface
// =============================================================================

export interface HealthMonitorOptions {
  /** Health check interval in milliseconds */
  checkInterval?: number;
  /** Maximum number of consecutive failures before marking unhealthy */
  maxRetries?: number;
  /** Health check timeout in milliseconds */
  timeoutMs?: number;
  /** Enable performance metrics collection */
  enableMetrics?: boolean;
  /** History size for performance metrics */
  metricsHistorySize?: number;
}

export interface HealthCheckResult {
  /** Health check succeeded */
  isHealthy: boolean;
  /** Check duration in milliseconds */
  duration: number;
  /** Timestamp of the check */
  timestamp: Date;
  /** Error details if unhealthy */
  error?: ProviderError;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  /** Average response time over recent checks */
  averageResponseTime: number;
  /** Total number of health checks performed */
  totalRequests: number;
  /** Number of failed health checks */
  failedRequests: number;
  /** Provider uptime percentage */
  uptime: number;
  /** Recent response times (limited by history size) */
  recentResponseTimes: number[];
  /** Last successful check timestamp */
  lastSuccessfulCheck?: Date;
  /** Last failed check timestamp */
  lastFailedCheck?: Date;
}

// =============================================================================
// Health Monitor Implementation
// =============================================================================

/**
 * Monitors provider health with continuous checks and metrics collection
 */
export class HealthMonitor {
  private healthCheckFn: () => Promise<boolean>;
  private options: Required<HealthMonitorOptions>;
  private isMonitoring = false;
  private checkTimer?: NodeJS.Timeout;
  private consecutiveFailures = 0;
  private metrics: PerformanceMetrics;
  private currentStatus: ProviderStatus;

  constructor(healthCheckFn: () => Promise<boolean>, options: HealthMonitorOptions = {}) {
    this.healthCheckFn = healthCheckFn;
    this.options = {
      checkInterval: options.checkInterval ?? 30_000, // 30 seconds
      maxRetries: options.maxRetries ?? 3,
      timeoutMs: options.timeoutMs ?? 10_000, // 10 seconds
      enableMetrics: options.enableMetrics ?? true,
      metricsHistorySize: options.metricsHistorySize ?? 100,
    };

    this.metrics = {
      averageResponseTime: 0,
      totalRequests: 0,
      failedRequests: 0,
      uptime: 100,
      recentResponseTimes: [],
    };

    this.currentStatus = {
      isConnected: false,
      isHealthy: false,
      lastHealthCheck: new Date(),
      metrics: this.metrics,
    };
  }

  // -------------------------------------------------------------------------
  // Monitoring Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.scheduleNextCheck();
    console.log(`Health monitoring started with ${this.options.checkInterval}ms interval`);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      delete this.checkTimer;
    }

    console.log('Health monitoring stopped');
  }

  /**
   * Perform immediate health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Implement timeout for health checks
      const healthPromise = this.healthCheckFn();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          reject(new Error('Health check timeout'));
        }, this.options.timeoutMs)
      );

      await Promise.race([healthPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      // Update metrics and status
      this.consecutiveFailures = 0;
      this.updateMetrics(duration, true);
      this.updateStatus(true, undefined, duration);

      return {
        isHealthy: true,
        duration,
        timestamp: new Date(),
        metadata: {
          consecutiveFailures: this.consecutiveFailures,
          uptime: this.metrics.uptime,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.consecutiveFailures++;

      const providerError: ProviderError = {
        name: 'HealthCheckError',
        message: error instanceof Error ? error.message : String(error),
        code: 'PROVIDER_UNAVAILABLE',
        providerId: 'unknown',
        providerType: 'linear' as const,
        retryable: true,
        context: {
          operation: 'health_check',
          timestamp: new Date(),
          requestId: `health-check-${Date.now()}`,
        },
      };

      // Update metrics and status
      this.updateMetrics(duration, false);
      this.updateStatus(false, providerError, duration);

      return {
        isHealthy: false,
        duration,
        timestamp: new Date(),
        error: providerError,
        metadata: {
          consecutiveFailures: this.consecutiveFailures,
          uptime: this.metrics.uptime,
        },
      };
    }
  }

  // -------------------------------------------------------------------------
  // Status and Metrics Access
  // -------------------------------------------------------------------------

  /**
   * Get current health status
   */
  isHealthy(): boolean {
    // For simple implementations, return true if not monitoring yet
    if (!this.isMonitoring) {
      return true;
    }

    return this.currentStatus.isHealthy && this.consecutiveFailures < this.options.maxRetries;
  }

  /**
   * Get current provider status
   */
  getCurrentStatus(): ProviderStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics and status
   */
  reset(): void {
    this.consecutiveFailures = 0;
    this.metrics = {
      averageResponseTime: 0,
      totalRequests: 0,
      failedRequests: 0,
      uptime: 100,
      recentResponseTimes: [],
    };

    this.currentStatus = {
      isConnected: false,
      isHealthy: false,
      lastHealthCheck: new Date(),
      metrics: this.metrics,
    };
  }

  // -------------------------------------------------------------------------
  // Private Implementation
  // -------------------------------------------------------------------------

  /**
   * Schedule next health check
   */
  private scheduleNextCheck(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.checkTimer = setTimeout(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }

      // Schedule next check if still monitoring
      if (this.isMonitoring) {
        this.scheduleNextCheck();
      }
    }, this.options.checkInterval);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    if (!this.options.enableMetrics) {
      return;
    }

    this.metrics.totalRequests++;

    if (success) {
      // Update response time metrics
      this.metrics.recentResponseTimes.push(responseTime);

      // Limit history size
      if (this.metrics.recentResponseTimes.length > this.options.metricsHistorySize) {
        this.metrics.recentResponseTimes.shift();
      }

      // Calculate average response time
      this.metrics.averageResponseTime =
        this.metrics.recentResponseTimes.reduce((sum, time) => sum + time, 0) /
        this.metrics.recentResponseTimes.length;

      this.metrics.lastSuccessfulCheck = new Date();
    } else {
      this.metrics.failedRequests++;
      this.metrics.lastFailedCheck = new Date();
    }

    // Calculate uptime percentage
    this.metrics.uptime =
      ((this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests) *
      100;
  }

  /**
   * Update provider status
   */
  private updateStatus(isHealthy: boolean, error?: ProviderError, _responseTime?: number): void {
    this.currentStatus = {
      isConnected: isHealthy,
      isHealthy: isHealthy && this.consecutiveFailures < this.options.maxRetries,
      lastHealthCheck: new Date(),
      ...(error && { lastError: error }),
      ...(this.options.enableMetrics && { metrics: { ...this.metrics } }),
    };

    // Log status changes
    if (this.currentStatus.isHealthy !== isHealthy) {
      const status = this.currentStatus.isHealthy ? 'HEALTHY' : 'UNHEALTHY';

      console.log(`Provider health status changed to: ${status}`);

      if (!this.currentStatus.isHealthy && error) {
        console.error(`Health check failed: ${error.message}`);
      }
    }
  }
}

// =============================================================================
// Specialized Health Monitors
// =============================================================================

/**
 * Database-specific health monitor
 */
export class DatabaseHealthMonitor extends HealthMonitor {
  constructor(connectionTestFn: () => Promise<boolean>, options: HealthMonitorOptions = {}) {
    super(connectionTestFn, {
      checkInterval: 60_000, // 1 minute for databases
      maxRetries: 2, // Databases should be more reliable
      timeoutMs: 5000, // Shorter timeout for database operations
      ...options,
    });
  }

  /**
   * Perform database-specific health checks
   */
  async performDatabaseHealthCheck(): Promise<
    HealthCheckResult & {
      connectionPool?: {
        active: number;
        idle: number;
        total: number;
      };
      queryPerformance?: {
        averageQueryTime: number;
        slowQueries: number;
      };
    }
  > {
    const baseResult = await this.performHealthCheck();

    // Add database-specific metrics
    return {
      ...baseResult,
      connectionPool: {
        active: 0, // Would be implemented with actual database driver
        idle: 0,
        total: 0,
      },
      queryPerformance: {
        averageQueryTime: this.getMetrics().averageResponseTime,
        slowQueries: 0, // Would track queries > threshold
      },
    };
  }
}

/**
 * API-specific health monitor
 */
export class APIHealthMonitor extends HealthMonitor {
  constructor(apiHealthCheckFn: () => Promise<boolean>, options: HealthMonitorOptions = {}) {
    super(apiHealthCheckFn, {
      checkInterval: 30_000, // 30 seconds for APIs
      maxRetries: 3,
      timeoutMs: 15_000, // Longer timeout for API calls
      ...options,
    });
  }

  /**
   * Perform API-specific health checks
   */
  async performAPIHealthCheck(): Promise<
    HealthCheckResult & {
      rateLimits?: {
        remaining: number;
        resetTime: Date;
      };
      apiVersion?: string;
    }
  > {
    const baseResult = await this.performHealthCheck();

    // Add API-specific metrics
    return {
      ...baseResult,
      rateLimits: {
        remaining: 1000, // Would be from actual API response headers
        resetTime: new Date(Date.now() + 3_600_000), // 1 hour from now
      },
      apiVersion: '1.0.0', // Would be from API response
    };
  }
}
