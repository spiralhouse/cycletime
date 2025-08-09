import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ServerLifecycle } from '../../../../src/mcp/server/server-lifecycle.js';

import type { Logger } from '../../../../src/utils/logger.js';

// Mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

describe('ServerLifecycle', () => {
  let lifecycle: ServerLifecycle;

  beforeEach(() => {
    vi.clearAllMocks();
    lifecycle = new ServerLifecycle(mockLogger);
  });

  afterEach(() => {
    // Ensure cleanup after each test
    if (lifecycle.isRunning()) {
      lifecycle.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize server successfully', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      };

      const result = await lifecycle.initialize(config);

      expect(result.success).toBe(true);
      expect(lifecycle.isInitialized()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Server initializing',
        expect.objectContaining({ serverName: 'test-server' })
      );
    });

    it('should reject initialization with invalid config', async () => {
      const invalidConfig = {
        // Missing required fields
        version: '1.0.0',
      };

      const result = await lifecycle.initialize(invalidConfig as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid server configuration');
      expect(lifecycle.isInitialized()).toBe(false);
    });

    it('should prevent double initialization', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      await lifecycle.initialize(config);
      const secondResult = await lifecycle.initialize(config);

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('Server already initialized');
    });

    it('should set initialization timestamp', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      const beforeInit = Date.now();

      await lifecycle.initialize(config);
      const afterInit = Date.now();

      const timestamp = lifecycle.getInitializationTimestamp();

      expect(timestamp).toBeGreaterThanOrEqual(beforeInit);
      expect(timestamp).toBeLessThanOrEqual(afterInit);
    });
  });

  describe('Startup', () => {
    it('should start server after initialization', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      await lifecycle.initialize(config);
      const result = await lifecycle.start();

      expect(result.success).toBe(true);
      expect(lifecycle.isRunning()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Server started successfully');
    });

    it('should reject start without initialization', async () => {
      const result = await lifecycle.start();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Server not initialized');
      expect(lifecycle.isRunning()).toBe(false);
    });

    it('should prevent double start', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      await lifecycle.initialize(config);
      await lifecycle.start();
      const secondResult = await lifecycle.start();

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('Server already running');
    });

    it('should handle startup errors gracefully', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
        simulateStartupError: true, // Test flag
      };

      await lifecycle.initialize(config);
      const result = await lifecycle.start();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(lifecycle.isRunning()).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown running server gracefully', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      await lifecycle.initialize(config);
      await lifecycle.start();
      const result = await lifecycle.shutdown();

      expect(result.success).toBe(true);
      expect(lifecycle.isRunning()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Server shutdown completed');
    });

    it('should handle shutdown when server not running', async () => {
      const result = await lifecycle.shutdown();

      expect(result.success).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Server shutdown requested but server not running'
      );
    });

    it('should cleanup resources during shutdown', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      await lifecycle.initialize(config);
      await lifecycle.start();

      // Verify server is running before shutdown
      expect(lifecycle.isRunning()).toBe(true);

      await lifecycle.shutdown();

      // Verify cleanup
      expect(lifecycle.isRunning()).toBe(false);
      expect(lifecycle.isInitialized()).toBe(false);
    });

    it('should handle graceful shutdown timeout', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
        shutdownTimeout: 100, // Short timeout for testing
        simulateSlowShutdown: true, // Test flag
      };

      await lifecycle.initialize(config);
      await lifecycle.start();
      const result = await lifecycle.shutdown();

      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Shutdown timeout'),
        expect.any(Object)
      );
    });
  });

  describe('Status and health', () => {
    it('should return correct server status', async () => {
      expect(lifecycle.getStatus()).toBe('stopped');

      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      await lifecycle.initialize(config);
      expect(lifecycle.getStatus()).toBe('initialized');

      await lifecycle.start();
      expect(lifecycle.getStatus()).toBe('running');

      await lifecycle.shutdown();
      expect(lifecycle.getStatus()).toBe('stopped');
    });

    it('should provide server health information', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      await lifecycle.initialize(config);
      await lifecycle.start();

      const health = lifecycle.getHealthInfo();

      expect(health).toEqual({
        status: 'running',
        uptime: expect.any(Number),
        initialized: true,
        initializationTime: expect.any(Number),
        serverInfo: {
          name: 'test-server',
          version: '1.0.0',
        },
      });
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should track uptime correctly', async () => {
      const config = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      await lifecycle.initialize(config);
      await lifecycle.start();

      // Wait a small amount to ensure uptime > 0
      await new Promise(resolve => setTimeout(resolve, 10));

      const uptime = lifecycle.getUptime();

      expect(uptime).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle initialization errors', async () => {
      const invalidConfig = null;

      const result = await lifecycle.initialize(invalidConfig as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should recover from failed initialization', async () => {
      // First attempt with invalid config
      await lifecycle.initialize(null as any);
      expect(lifecycle.isInitialized()).toBe(false);

      // Second attempt with valid config
      const validConfig = {
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {}, prompts: {} },
      };

      const result = await lifecycle.initialize(validConfig);

      expect(result.success).toBe(true);
      expect(lifecycle.isInitialized()).toBe(true);
    });
  });
});
