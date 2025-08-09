/**
 * Tests for MCP server initializer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MCPServerInitializer } from '../../../../src/mcp/config/mcp-server-initializer.js';

import type { MCPServerConfig } from '../../../../src/mcp/config/mcp-config.js';

describe('MCPServerInitializer', () => {
  let mockConfig: MCPServerConfig;
  let initializer: MCPServerInitializer;

  beforeEach(() => {
    mockConfig = {
      server: {
        name: 'test-server',
        version: '1.0.0',
        transport: 'stdio',
      },
      resources: {
        enabled: true,
        cacheSize: 100,
        cacheTTL: 300,
      },
      tools: {
        enabled: true,
        validationEnabled: true,
        executionTimeout: 30_000,
      },
      health: {
        checkInterval: 5000,
        timeoutMs: 3000,
      },
      provider: {
        type: 'sqlite',
        config: {
          database: './test.db',
        },
      },
    };

    initializer = new MCPServerInitializer(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize all components in correct order', async () => {
      const initOrder: string[] = [];

      // Mock component initialization
      vi.spyOn(initializer as any, 'initializeConfig').mockImplementation(async () => {
        initOrder.push('config');
      });
      vi.spyOn(initializer as any, 'initializeServer').mockImplementation(async () => {
        initOrder.push('server');
      });
      vi.spyOn(initializer as any, 'initializeResources').mockImplementation(async () => {
        initOrder.push('resources');
      });
      vi.spyOn(initializer as any, 'initializeTools').mockImplementation(async () => {
        initOrder.push('tools');
      });
      vi.spyOn(initializer as any, 'initializeHealthChecks').mockImplementation(async () => {
        initOrder.push('health');
      });

      const result = await initializer.initialize();

      expect(result.success).toBe(true);
      expect(initOrder).toEqual(['config', 'server', 'resources', 'tools', 'health']);
    });

    it('should handle initialization failure gracefully', async () => {
      vi.spyOn(initializer as any, 'initializeServer').mockRejectedValue(
        new Error('Server initialization failed')
      );

      const result = await initializer.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Server initialization failed');
    });

    it('should cleanup on initialization failure', async () => {
      const cleanupSpy = vi.spyOn(initializer as any, 'cleanup');

      vi.spyOn(initializer as any, 'initializeResources').mockRejectedValue(
        new Error('Resource initialization failed')
      );

      const result = await initializer.initialize();

      expect(result.success).toBe(false);
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should not initialize disabled components', async () => {
      const configWithDisabledComponents = {
        ...mockConfig,
        resources: { enabled: false },
        tools: { enabled: false, validationEnabled: false },
      };

      const disabledInitializer = new MCPServerInitializer(configWithDisabledComponents);

      const resourcesSpy = vi.spyOn(disabledInitializer as any, 'initializeResources');
      const toolsSpy = vi.spyOn(disabledInitializer as any, 'initializeTools');

      await disabledInitializer.initialize();

      expect(resourcesSpy).not.toHaveBeenCalled();
      expect(toolsSpy).not.toHaveBeenCalled();
    });
  });

  describe('restart', () => {
    it('should shutdown and reinitialize successfully', async () => {
      // First initialize
      await initializer.initialize();

      const shutdownSpy = vi.spyOn(initializer, 'shutdown');
      const initializeSpy = vi.spyOn(initializer, 'initialize');

      const result = await initializer.restart();

      expect(result.success).toBe(true);
      expect(shutdownSpy).toHaveBeenCalled();
      expect(initializeSpy).toHaveBeenCalledTimes(2); // Once for initial, once for restart
    });

    it('should handle restart failure when shutdown fails', async () => {
      await initializer.initialize();

      vi.spyOn(initializer, 'shutdown').mockRejectedValue(new Error('Shutdown failed'));

      const result = await initializer.restart();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Shutdown failed');
    });
  });

  describe('shutdown', () => {
    it('should shutdown all components in reverse order', async () => {
      await initializer.initialize();

      const shutdownOrder: string[] = [];

      vi.spyOn(initializer as any, 'shutdownHealthChecks').mockImplementation(async () => {
        shutdownOrder.push('health');
      });
      vi.spyOn(initializer as any, 'shutdownTools').mockImplementation(async () => {
        shutdownOrder.push('tools');
      });
      vi.spyOn(initializer as any, 'shutdownResources').mockImplementation(async () => {
        shutdownOrder.push('resources');
      });
      vi.spyOn(initializer as any, 'shutdownServer').mockImplementation(async () => {
        shutdownOrder.push('server');
      });

      const result = await initializer.shutdown();

      expect(result.success).toBe(true);
      expect(shutdownOrder).toEqual(['health', 'tools', 'resources', 'server']);
    });

    it('should handle shutdown errors gracefully', async () => {
      await initializer.initialize();

      vi.spyOn(initializer as any, 'shutdownServer').mockRejectedValue(
        new Error('Server shutdown failed')
      );

      const result = await initializer.shutdown();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Server shutdown failed');
    });
  });

  describe('getStatus', () => {
    it('should return initialization status', async () => {
      const status = initializer.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('components');
      expect(status.initialized).toBe(false);
    });

    it('should track component status during initialization', async () => {
      const initPromise = initializer.initialize();

      // Check status during initialization
      const duringStatus = initializer.getStatus();

      expect(duringStatus.initialized).toBe(false);

      await initPromise;

      const afterStatus = initializer.getStatus();

      expect(afterStatus.initialized).toBe(true);
    });
  });

  describe('reconfigure', () => {
    it('should reconfigure with new configuration', async () => {
      await initializer.initialize();

      const newConfig = {
        ...mockConfig,
        server: {
          ...mockConfig.server,
          name: 'reconfigured-server',
        },
      };

      const result = await initializer.reconfigure(newConfig);

      expect(result.success).toBe(true);
      expect((initializer as any).config.server.name).toBe('reconfigured-server');
    });

    it('should validate new configuration before applying', async () => {
      await initializer.initialize();

      const invalidConfig = {
        ...mockConfig,
        server: {
          ...mockConfig.server,
          name: '', // Invalid empty name
        },
      };

      const result = await initializer.reconfigure(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('server.name is required');
    });
  });

  describe('addDependency', () => {
    it('should add component dependency', () => {
      initializer.addDependency('resources', 'server');

      const dependencies = (initializer as any).getDependencies('resources');

      expect(dependencies).toContain('server');
    });

    it('should prevent circular dependencies', () => {
      initializer.addDependency('server', 'resources');

      expect(() => {
        initializer.addDependency('resources', 'server');
      }).toThrow('Circular dependency detected');
    });
  });
});
