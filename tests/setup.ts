/**
 * Test setup configuration for JCVD framework
 */

import { beforeAll, afterAll, beforeEach, afterEach, expect, vi } from 'vitest';

// import { createLogger } from '@/utils/logger';

// Set up test environment
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';

  // Initialize test database or other global setup
  // const testLogger = createLogger('test-setup');
  // testLogger.debug('Test environment initialized');
  console.log('Test environment initialized');
});

afterAll(async () => {
  // Clean up global resources
  // const testLogger = createLogger('test-setup');
  // testLogger.debug('Test environment cleaned up');
  console.log('Test environment cleaned up');
});

beforeEach(async () => {
  // Reset state before each test
});

afterEach(async () => {
  // Clean up after each test
});

// Global test utilities
declare global {
  namespace Vi {
    interface CustomMatchers<R = unknown> {
      toBeValidJCVDConfig(): R;
      toBeValidAgentConfig(): R;
      toBeValidProviderConfig(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidJCVDConfig(received: any) {
    const required = [
      'name',
      'version',
      'database',
      'logging',
      'taskCoordination',
      'providers',
      'workflows',
    ];
    const missing = required.filter(key => !(key in received));

    if (missing.length > 0) {
      return {
        message: () => `Expected valid JCVD config, but missing keys: ${missing.join(', ')}`,
        pass: false,
      };
    }

    return {
      message: () => 'Expected invalid JCVD config',
      pass: true,
    };
  },

  toBeValidAgentConfig(received: any) {
    const required = ['id', 'type', 'name', 'enabled', 'config'];
    const missing = required.filter(key => !(key in received));

    if (missing.length > 0) {
      return {
        message: () => `Expected valid agent config, but missing keys: ${missing.join(', ')}`,
        pass: false,
      };
    }

    return {
      message: () => 'Expected invalid agent config',
      pass: true,
    };
  },

  toBeValidProviderConfig(received: any) {
    const required = ['id', 'type', 'name', 'enabled', 'config'];
    const missing = required.filter(key => !(key in received));

    if (missing.length > 0) {
      return {
        message: () => `Expected valid provider config, but missing keys: ${missing.join(', ')}`,
        pass: false,
      };
    }

    return {
      message: () => 'Expected invalid provider config',
      pass: true,
    };
  },
});

// Test data factories
export const testData = {
  createAgentConfig: (overrides: Record<string, any> = {}) => ({
    id: 'test-agent',
    type: 'product-manager' as const,
    name: 'Test Agent',
    enabled: true,
    config: {},
    ...overrides,
  }),

  createProviderConfig: (overrides: Record<string, any> = {}) => ({
    id: 'test-provider',
    type: 'local' as const,
    name: 'Test Provider',
    enabled: true,
    config: {
      rootDir: '/tmp/test',
    },
    ...overrides,
  }),

  createWorkflowConfig: (overrides: Record<string, any> = {}) => ({
    id: 'test-workflow',
    name: 'Test Workflow',
    enabled: true,
    triggers: [],
    stages: [],
    ...overrides,
  }),

  createJCVDConfig: (overrides: Record<string, any> = {}) => ({
    name: 'Test JCVD',
    version: '0.1.0-test',
    database: {
      path: ':memory:',
      walMode: false,
      migrations: {
        autoRun: false,
        directory: './migrations',
      },
    },
    logging: {
      level: 'silent' as const,
      format: 'json' as const,
      outputs: [],
    },
    taskCoordination: {
      defaultAgent: 'developer',
      fallbackAgent: 'general-purpose',
    },
    providers: [],
    workflows: [],
    ...overrides,
  }),
};

// Test utilities
export const testUtils = {
  /**
   * Wait for a specific amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create a mock logger for testing
   */
  createMockLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  }),

  /**
   * Create a temporary directory for testing
   */
  createTempDir: async () => {
    const { mkdtemp } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    return mkdtemp(join(tmpdir(), 'jcvd-test-'));
  },

  /**
   * Clean up temporary directory
   */
  cleanupTempDir: async (dir: string) => {
    const { rm } = await import('node:fs/promises');

    await rm(dir, { recursive: true, force: true });
  },
};
