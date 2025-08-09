/**
 * Tests for MCP configuration manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MCPConfigManager } from '../../../../src/mcp/config/mcp-config-manager.js';

import type { MCPServerConfig } from '../../../../src/mcp/config/mcp-config.js';

describe('MCPConfigManager', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.JCVD_MCP_SERVER_NAME;
    delete process.env.JCVD_MCP_TRANSPORT;
    delete process.env.JCVD_MCP_RESOURCES_ENABLED;
    delete process.env.JCVD_MCP_TOOLS_ENABLED;
    delete process.env.JCVD_MCP_PORT;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadMCPConfig', () => {
    it('should load default MCP configuration when no overrides provided', async () => {
      const config = await MCPConfigManager.loadMCPConfig();

      expect(config).toBeDefined();
      expect(config.server.name).toBe('jcvd-mcp-server');
      expect(config.server.transport).toBe('stdio');
      expect(config.resources.enabled).toBe(true);
      expect(config.tools.enabled).toBe(true);
    });

    it('should apply environment variable overrides', async () => {
      process.env.JCVD_MCP_SERVER_NAME = 'custom-server';
      process.env.JCVD_MCP_TRANSPORT = 'websocket';
      process.env.JCVD_MCP_PORT = '9000';
      process.env.JCVD_MCP_RESOURCES_ENABLED = 'false';

      const config = await MCPConfigManager.loadMCPConfig();

      expect(config.server.name).toBe('custom-server');
      expect(config.server.transport).toBe('websocket');
      expect(config.server.port).toBe(9000);
      expect(config.resources.enabled).toBe(false);
    });

    it('should apply configuration overrides', async () => {
      const overrides: Partial<MCPServerConfig> = {
        server: {
          name: 'override-server',
          version: '2.0.0',
          transport: 'websocket',
          port: 8080,
        },
        tools: {
          enabled: false,
          validationEnabled: false,
        },
      };

      const config = await MCPConfigManager.loadMCPConfig(overrides);

      expect(config.server.name).toBe('override-server');
      expect(config.server.version).toBe('2.0.0');
      expect(config.server.port).toBe(8080);
      expect(config.tools.enabled).toBe(false);
    });

    it('should merge configurations in correct precedence order', async () => {
      // Environment variable
      process.env.JCVD_MCP_SERVER_NAME = 'env-server';
      process.env.JCVD_MCP_TRANSPORT = 'stdio';

      // Override should take precedence
      const overrides: Partial<MCPServerConfig> = {
        server: {
          name: 'override-server',
          version: '1.0.0',
          transport: 'websocket',
        },
      };

      const config = await MCPConfigManager.loadMCPConfig(overrides);

      expect(config.server.name).toBe('override-server'); // Override wins
      expect(config.server.transport).toBe('websocket'); // Override wins
    });
  });

  describe('validateMCPConfig', () => {
    it('should pass validation for valid configuration', () => {
      const validConfig: MCPServerConfig = {
        server: {
          name: 'test-server',
          version: '1.0.0',
          transport: 'stdio',
        },
        resources: {
          enabled: true,
        },
        tools: {
          enabled: true,
          validationEnabled: true,
        },
        health: {},
        provider: {
          type: 'sqlite',
          config: {},
        },
      };

      expect(() => {
        MCPConfigManager.validateMCPConfig(validConfig);
      }).not.toThrow();
    });

    it('should throw for missing required server.name', () => {
      const invalidConfig = {
        server: {
          version: '1.0.0',
          transport: 'stdio' as const,
        },
        resources: { enabled: true },
        tools: { enabled: true, validationEnabled: true },
        health: {},
        provider: { type: 'sqlite' as const, config: {} },
      };

      expect(() => {
        MCPConfigManager.validateMCPConfig(invalidConfig as any);
      }).toThrow('server.name is required and must be non-empty');
    });

    it('should throw for invalid transport type', () => {
      const invalidConfig = {
        server: {
          name: 'test-server',
          version: '1.0.0',
          transport: 'invalid-transport',
        },
        resources: { enabled: true },
        tools: { enabled: true, validationEnabled: true },
        health: {},
        provider: { type: 'sqlite', config: {} },
      };

      expect(() => {
        MCPConfigManager.validateMCPConfig(invalidConfig as any);
      }).toThrow('transport must be either "stdio" or "websocket"');
    });

    it('should throw for websocket transport without port', () => {
      const invalidConfig: MCPServerConfig = {
        server: {
          name: 'test-server',
          version: '1.0.0',
          transport: 'websocket',
          // port is missing
        },
        resources: { enabled: true },
        tools: { enabled: true, validationEnabled: true },
        health: {},
        provider: { type: 'sqlite', config: {} },
      };

      expect(() => {
        MCPConfigManager.validateMCPConfig(invalidConfig);
      }).toThrow('port is required when transport is "websocket"');
    });

    it('should throw for invalid port range', () => {
      const invalidConfig: MCPServerConfig = {
        server: {
          name: 'test-server',
          version: '1.0.0',
          transport: 'websocket',
          port: 70_000, // Invalid port
        },
        resources: { enabled: true },
        tools: { enabled: true, validationEnabled: true },
        health: {},
        provider: { type: 'sqlite', config: {} },
      };

      expect(() => {
        MCPConfigManager.validateMCPConfig(invalidConfig);
      }).toThrow('port must be between 1 and 65535');
    });
  });

  describe('getEnvironmentVariables', () => {
    it('should return empty object when no MCP environment variables set', () => {
      const envVars = MCPConfigManager.getEnvironmentVariables();

      expect(envVars).toEqual({});
    });

    it('should parse MCP environment variables correctly', () => {
      process.env.JCVD_MCP_SERVER_NAME = 'env-server';
      process.env.JCVD_MCP_TRANSPORT = 'websocket';
      process.env.JCVD_MCP_PORT = '8080';
      process.env.JCVD_MCP_RESOURCES_ENABLED = 'false';
      process.env.JCVD_MCP_TOOLS_ENABLED = 'true';
      process.env.JCVD_MCP_TOOLS_VALIDATION_ENABLED = 'false';
      process.env.JCVD_MCP_HEALTH_CHECK_INTERVAL = '10000';
      process.env.JCVD_MCP_HEALTH_TIMEOUT = '5000';

      const envVars = MCPConfigManager.getEnvironmentVariables();

      expect(envVars).toEqual({
        server: {
          name: 'env-server',
          transport: 'websocket',
          port: 8080,
        },
        resources: {
          enabled: false,
        },
        tools: {
          enabled: true,
          validationEnabled: false,
        },
        health: {
          checkInterval: 10_000,
          timeoutMs: 5000,
        },
      });
    });

    it('should handle boolean environment variables correctly', () => {
      process.env.JCVD_MCP_RESOURCES_ENABLED = 'true';
      process.env.JCVD_MCP_TOOLS_ENABLED = 'false';

      const envVars = MCPConfigManager.getEnvironmentVariables();

      expect(envVars.resources?.enabled).toBe(true);
      expect(envVars.tools?.enabled).toBe(false);
    });

    it('should handle numeric environment variables correctly', () => {
      process.env.JCVD_MCP_PORT = '3000';
      process.env.JCVD_MCP_HEALTH_CHECK_INTERVAL = '15000';

      const envVars = MCPConfigManager.getEnvironmentVariables();

      expect(envVars.server?.port).toBe(3000);
      expect(envVars.health?.checkInterval).toBe(15_000);
    });
  });
});
