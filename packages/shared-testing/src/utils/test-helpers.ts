/**
 * Test Helpers - Common contract testing utilities
 * 
 * This utility class provides helper functions for setting up and managing
 * contract tests across different services and test scenarios.
 */

import { ValidationResult, PerformanceMetrics, EndpointConfig } from '../types';

export interface TestTimeout {
  test?: number;
  setup?: number;
  teardown?: number;
}

export interface TestEnvironmentConfig {
  baseUrl?: string;
  timeout?: TestTimeout;
  retries?: number;
  cleanup?: boolean;
}

export class TestHelpers {
  private static readonly DEFAULT_TIMEOUTS: Required<TestTimeout> = {
    test: 30000,
    setup: 10000,
    teardown: 5000
  };

  private static readonly DEFAULT_CONFIG: Required<TestEnvironmentConfig> = {
    baseUrl: 'http://localhost:3000',
    timeout: TestHelpers.DEFAULT_TIMEOUTS,
    retries: 2,
    cleanup: true
  };

  /**
   * Setup contract test environment with standardized configuration
   */
  static setupContractTestEnvironment(config: TestEnvironmentConfig = {}): Required<TestEnvironmentConfig> {
    const mergedConfig = {
      ...TestHelpers.DEFAULT_CONFIG,
      ...config,
      timeout: { ...TestHelpers.DEFAULT_CONFIG.timeout, ...config.timeout }
    };

    // Set Jest timeouts if in Jest environment
    if (typeof jest !== 'undefined') {
      jest.setTimeout(mergedConfig.timeout.test);
    }

    return mergedConfig;
  }

  /**
   * Create a standardized test suite setup with beforeAll/afterAll
   */
  static createTestSuite(
    suiteName: string,
    setupFn: () => Promise<void>,
    teardownFn: () => Promise<void>,
    config: TestEnvironmentConfig = {}
  ): void {
    const mergedConfig = TestHelpers.setupContractTestEnvironment(config);

    describe(suiteName, () => {
      beforeAll(async () => {
        jest.setTimeout(mergedConfig.timeout.setup);
        await setupFn();
      }, mergedConfig.timeout.setup);

      afterAll(async () => {
        jest.setTimeout(mergedConfig.timeout.teardown);
        if (mergedConfig.cleanup) {
          await teardownFn();
        }
      }, mergedConfig.timeout.teardown);
    });
  }

  /**
   * Retry utility for flaky operations
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        await TestHelpers.sleep(delay * Math.pow(2, attempt - 1));
      }
    }

    throw lastError!;
  }

  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await TestHelpers.sleep(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Assert validation result with detailed error reporting
   */
  static assertValidationResult(
    result: ValidationResult,
    context: string = 'Validation'
  ): void {
    if (!result.valid) {
      const errorMessages = result.errors.map(error => 
        `${error.instancePath || '(root)'}: ${error.message}`
      ).join('\n');

      const warningMessages = result.warnings.length > 0 
        ? `\nWarnings:\n${result.warnings.map(warning => warning.message).join('\n')}`
        : '';

      throw new Error(`${context} failed:\n${errorMessages}${warningMessages}`);
    }

    // Log warnings if present
    if (result.warnings.length > 0) {
      console.warn(`${context} warnings:`, result.warnings.map(w => w.message));
    }
  }

  /**
   * Measure performance of an operation
   */
  static async measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string = 'Operation'
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await operation();
      const endTime = Date.now();
      const endMemory = process.memoryUsage();

      const metrics: PerformanceMetrics = {
        responseTime: endTime - startTime,
        throughput: 1000 / (endTime - startTime), // operations per second
        errorRate: 0,
        concurrency: 1,
        timestamp: startTime
      };

      console.log(`Performance: ${operationName} took ${metrics.responseTime}ms`);

      return { result, metrics };
    } catch (error) {
      const endTime = Date.now();
      const metrics: PerformanceMetrics = {
        responseTime: endTime - startTime,
        throughput: 0,
        errorRate: 1,
        concurrency: 1,
        timestamp: startTime
      };

      console.error(`Performance: ${operationName} failed after ${metrics.responseTime}ms`);
      throw error;
    }
  }

  /**
   * Generate unique test identifiers
   */
  static generateTestId(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create mock HTTP headers for testing
   */
  static createMockHeaders(overrides: Record<string, string> = {}): Record<string, string> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'CycleTime-Contract-Test/1.0',
      'X-Test-Id': TestHelpers.generateTestId(),
      ...overrides
    };

    return defaultHeaders;
  }

  /**
   * Validate endpoint configuration
   */
  static validateEndpointConfig(endpoint: EndpointConfig): void {
    if (!endpoint.path) {
      throw new Error('Endpoint path is required');
    }

    if (!endpoint.method) {
      throw new Error('Endpoint method is required');
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(endpoint.method.toUpperCase())) {
      throw new Error(`Invalid HTTP method: ${endpoint.method}`);
    }

    if (endpoint.timeout && endpoint.timeout <= 0) {
      throw new Error('Endpoint timeout must be positive');
    }

    if (endpoint.retries && endpoint.retries < 0) {
      throw new Error('Endpoint retries must be non-negative');
    }
  }

  /**
   * Format validation errors for readable output
   */
  static formatValidationErrors(errors: ValidationResult['errors']): string {
    if (errors.length === 0) {
      return 'No validation errors';
    }

    return errors.map((error, index) => {
      const path = error.instancePath || '(root)';
      const location = error.schemaPath ? ` (schema: ${error.schemaPath})` : '';
      return `${index + 1}. ${path}: ${error.message}${location}`;
    }).join('\n');
  }

  /**
   * Sleep utility for delays in tests
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Deep clone utility for test data
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => TestHelpers.deepClone(item)) as any;
    }

    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = TestHelpers.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * Compare objects for testing equality with detailed diff
   */
  static compareObjects(
    expected: any,
    actual: any,
    path: string = ''
  ): { equal: boolean; differences: string[] } {
    const differences: string[] = [];

    if (expected === actual) {
      return { equal: true, differences: [] };
    }

    if (typeof expected !== typeof actual) {
      differences.push(`${path}: type mismatch - expected ${typeof expected}, got ${typeof actual}`);
      return { equal: false, differences };
    }

    if (expected === null || actual === null) {
      differences.push(`${path}: null mismatch - expected ${expected}, got ${actual}`);
      return { equal: false, differences };
    }

    if (typeof expected === 'object') {
      if (Array.isArray(expected) !== Array.isArray(actual)) {
        differences.push(`${path}: array/object mismatch`);
        return { equal: false, differences };
      }

      if (Array.isArray(expected)) {
        if (expected.length !== actual.length) {
          differences.push(`${path}: array length mismatch - expected ${expected.length}, got ${actual.length}`);
        }

        const maxLength = Math.max(expected.length, actual.length);
        for (let i = 0; i < maxLength; i++) {
          const result = TestHelpers.compareObjects(
            expected[i],
            actual[i],
            `${path}[${i}]`
          );
          differences.push(...result.differences);
        }
      } else {
        const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
        
        for (const key of allKeys) {
          const result = TestHelpers.compareObjects(
            expected[key],
            actual[key],
            path ? `${path}.${key}` : key
          );
          differences.push(...result.differences);
        }
      }
    } else {
      differences.push(`${path}: value mismatch - expected ${expected}, got ${actual}`);
    }

    return { equal: differences.length === 0, differences };
  }

  /**
   * Create a test data snapshot for comparison
   */
  static createSnapshot(data: any, name: string): void {
    // In a real implementation, this would integrate with Jest snapshots
    // or create custom snapshot files
    console.log(`Snapshot ${name}:`, JSON.stringify(data, null, 2));
  }
}