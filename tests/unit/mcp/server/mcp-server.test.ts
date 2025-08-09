import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MCPServer } from '../../../../src/mcp/server/mcp-server.js';

import type { Logger } from '../../../../src/utils/logger.js';

// Mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

describe('MCPServer', () => {
  let server: MCPServer;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // If there's an existing server, clean it up first
    if (server) {
      try {
        if (server.isRunning()) {
          await server.stop();
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    
    server = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    }, mockLogger);
  });

  afterEach(async () => {
    try {
      if (server && server.isRunning()) {
        await server.stop();
      }
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('Server initialization', () => {
    it('should create server with valid configuration', () => {
      expect(server).toBeDefined();
      expect(server.isRunning()).toBe(false);
      expect(server.getName()).toBe('test-server');
      expect(server.getVersion()).toBe('1.0.0');
    });

    it('should reject invalid configuration', () => {
      expect(() => {
        new MCPServer({
          name: '',
          version: '1.0.0',
          capabilities: {},
        } as any);
      }).toThrow('Invalid server configuration');
    });

    it('should initialize with default capabilities', () => {
      const basicServer = new MCPServer({
        name: 'basic-server',
        version: '1.0.0',
      });

      const capabilities = basicServer.getCapabilities();

      expect(capabilities).toEqual({
        resources: {},
        tools: {},
        prompts: {},
      });
    });
  });

  describe('Server lifecycle', () => {
    it('should start server successfully', async () => {
      const result = await server.start();
      
      expect(result.success).toBe(true);
      expect(server.isRunning()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'MCP server started',
        expect.objectContaining({ serverName: 'test-server' })
      );
    });

    it('should stop server successfully', async () => {
      await server.start();
      const result = await server.stop();
      
      expect(result.success).toBe(true);
      expect(server.isRunning()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('MCP server stopped');
    });

    it('should handle stop when not running', async () => {
      const result = await server.stop();
      
      expect(result.success).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Server stop requested but server not running');
    });

    it('should prevent double start', async () => {
      await server.start();
      const result = await server.start();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Server already running');
    });

    it('should restart server', async () => {
      await server.start();
      const result = await server.restart();
      
      expect(result.success).toBe(true);
      expect(server.isRunning()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('MCP server restarted');
    });
  });

  describe('Message handling', () => {
    beforeEach(async () => {
      if (!server.isRunning()) {
        const result = await server.start();

        if (!result.success) {
          throw new Error(`Failed to start server in Message handling beforeEach: ${result.error}`);
        }
      }
    });

    afterEach(async () => {
      // Ensure clean state after message handling tests
      if (server.isRunning()) {
        await server.stop();
      }
    });

    it('should handle initialize request', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      };

      const response = await server.handleMessage(JSON.stringify(request));
      const parsedResponse = JSON.parse(response);
      
      expect(parsedResponse.id).toBe(1);
      expect(parsedResponse.result).toEqual({
        protocolVersion: '2024-11-05',
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
        serverInfo: {
          name: 'test-server',
          version: '1.0.0',
        },
      });
    });

    it('should handle ping request', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'ping',
      };

      const response = await server.handleMessage(JSON.stringify(request));
      const parsedResponse = JSON.parse(response);
      
      expect(parsedResponse.id).toBe(2);
      expect(parsedResponse.result).toEqual({});
    });

    it('should handle initialized notification', async () => {
      const notification = {
        jsonrpc: '2.0' as const,
        method: 'notifications/initialized',
      };

      // Should not throw and should not return a response
      const response = await server.handleMessage(JSON.stringify(notification));

      expect(response).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await server.handleMessage('{ invalid json }');
      const parsedResponse = JSON.parse(response);
      
      expect(parsedResponse.error).toEqual({
        code: -32_700,
        message: 'Parse error',
        data: expect.any(Object),
      });
    });

    it('should handle unknown method requests', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 3,
        method: 'unknown/method',
        params: {},
      };

      const response = await server.handleMessage(JSON.stringify(request));
      const parsedResponse = JSON.parse(response);
      
      expect(parsedResponse.id).toBe(3);
      expect(parsedResponse.error).toEqual({
        code: -32_601,
        message: 'Method not found',
        data: { method: 'unknown/method' },
      });
    });

    it('should handle malformed requests', async () => {
      const malformedRequest = {
        jsonrpc: '2.0',
        // Missing id and method
      };

      const response = await server.handleMessage(JSON.stringify(malformedRequest));
      const parsedResponse = JSON.parse(response);
      
      expect(parsedResponse.error).toEqual({
        code: -32_600,
        message: 'Invalid Request',
        data: expect.any(Object),
      });
    });
  });

  describe('Server information', () => {
    it('should provide server status', () => {
      const status = server.getStatus();
      
      expect(status).toEqual({
        name: 'test-server',
        version: '1.0.0',
        running: false,
        uptime: 0,
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      });
    });

    it('should provide server health info', async () => {
      await server.start();
      
      const health = server.getHealthInfo();
      
      expect(health).toEqual({
        status: 'healthy',
        uptime: expect.any(Number),
        memoryUsage: expect.any(Object),
        messageStats: expect.any(Object),
        lastActivity: expect.any(Number),
      });
    });

    it('should track uptime correctly', async () => {
      await server.start();
      
      // Wait a small amount to ensure uptime > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const status = server.getStatus();

      expect(status.uptime).toBeGreaterThan(0);
    });

    it('should provide capabilities information', () => {
      const capabilities = server.getCapabilities();
      
      expect(capabilities).toEqual({
        resources: {},
        tools: {},
        prompts: {},
      });
    });
  });

  describe('Event handling', () => {
    it('should emit server events', async () => {
      const startListener = vi.fn();
      const stopListener = vi.fn();
      
      server.on('start', startListener);
      server.on('stop', stopListener);
      
      await server.start();
      await server.stop();
      
      expect(startListener).toHaveBeenCalledWith({
        serverName: 'test-server',
        timestamp: expect.any(Number),
      });
      expect(stopListener).toHaveBeenCalledWith({
        serverName: 'test-server',
        timestamp: expect.any(Number),
      });
    });

    it('should emit message events', async () => {
      const messageListener = vi.fn();
      
      server.on('message', messageListener);
      await server.start();
      
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'ping',
      };

      await server.handleMessage(JSON.stringify(request));
      
      expect(messageListener).toHaveBeenCalledWith({
        type: 'request',
        method: 'ping',
        id: 1,
        timestamp: expect.any(Number),
      });
    });

    it('should emit error events', async () => {
      const errorListener = vi.fn();
      
      server.on('error', errorListener);
      await server.start();
      
      await server.handleMessage('{ invalid json }');
      
      expect(errorListener).toHaveBeenCalledWith({
        error: expect.any(Object),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Configuration updates', () => {
    it('should update server capabilities', async () => {
      const newCapabilities = {
        resources: { files: true },
        tools: { calculator: true },
        prompts: { assistant: true },
      };

      server.updateCapabilities(newCapabilities);
      
      expect(server.getCapabilities()).toEqual(newCapabilities);
    });

    it('should merge capabilities by default', async () => {
      const newCapabilities = {
        resources: { files: true },
      };

      server.updateCapabilities(newCapabilities);
      
      const capabilities = server.getCapabilities();

      expect(capabilities.resources).toEqual({ files: true });
      expect(capabilities.tools).toEqual({});
      expect(capabilities.prompts).toEqual({});
    });

    it('should replace capabilities when specified', async () => {
      const newCapabilities = {
        resources: { files: true },
      };

      server.updateCapabilities(newCapabilities, { replace: true });
      
      const capabilities = server.getCapabilities();

      expect(capabilities).toEqual({
        resources: { files: true },
      });
    });
  });

  describe('Error scenarios', () => {
    it('should handle startup errors gracefully', async () => {
      const faultyServer = new MCPServer({
        name: 'faulty-server',
        version: '1.0.0',
        capabilities: {},
        simulateStartupError: true, // Test flag
      });

      const result = await faultyServer.start();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(faultyServer.isRunning()).toBe(false);
    });

    it('should handle message processing errors', async () => {
      await server.start();
      
      // Mock a message that will cause an internal error
      const problematicMessage = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: null, // This might cause issues in some scenarios
      });

      const response = await server.handleMessage(problematicMessage);
      
      // Should still return a valid JSON-RPC error response
      expect(() => JSON.parse(response)).not.toThrow();
    });
  });
});