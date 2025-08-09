import { describe, it, expect } from 'vitest';

import { ProtocolHandler } from '../../../../src/mcp/server/protocol-handler.js';

describe('ProtocolHandler', () => {
  describe('JSON-RPC message parsing', () => {
    it('should parse valid JSON-RPC request messages', () => {
      const handler = new ProtocolHandler();
      const validRequest = JSON.stringify({
        jsonrpc: '2.0',
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
      });

      const result = handler.parseMessage(validRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        jsonrpc: '2.0',
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
      });
    });

    it('should parse valid JSON-RPC notification messages', () => {
      const handler = new ProtocolHandler();
      const validNotification = JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      });

      const result = handler.parseMessage(validNotification);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      });
    });

    it('should reject messages with invalid JSON', () => {
      const handler = new ProtocolHandler();
      const invalidJson = '{ invalid json }';

      const result = handler.parseMessage(invalidJson);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should reject messages without jsonrpc field', () => {
      const handler = new ProtocolHandler();
      const missingJsonRpc = JSON.stringify({
        id: 1,
        method: 'test',
      });

      const result = handler.parseMessage(missingJsonRpc);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing jsonrpc field');
    });

    it('should reject messages with incorrect jsonrpc version', () => {
      const handler = new ProtocolHandler();
      const wrongVersion = JSON.stringify({
        jsonrpc: '1.0',
        id: 1,
        method: 'test',
      });

      const result = handler.parseMessage(wrongVersion);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported JSON-RPC version');
    });

    it('should reject request messages without method field', () => {
      const handler = new ProtocolHandler();
      const missingMethod = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
      });

      const result = handler.parseMessage(missingMethod);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing method field');
    });
  });

  describe('JSON-RPC response formatting', () => {
    it('should format success responses correctly', () => {
      const handler = new ProtocolHandler();
      const response = handler.formatResponse(123, { result: 'success' });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 123,
        result: { result: 'success' },
      });
    });

    it('should format error responses correctly', () => {
      const handler = new ProtocolHandler();
      const error = {
        code: -32_600,
        message: 'Invalid Request',
        data: { detail: 'Missing required field' },
      };
      const response = handler.formatErrorResponse(123, error);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 123,
        error: {
          code: -32_600,
          message: 'Invalid Request',
          data: { detail: 'Missing required field' },
        },
      });
    });

    it('should handle null id for error responses', () => {
      const handler = new ProtocolHandler();
      const error = {
        code: -32_700,
        message: 'Parse error',
      };
      const response = handler.formatErrorResponse(null, error);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32_700,
          message: 'Parse error',
        },
      });
    });
  });

  describe('Protocol version negotiation', () => {
    it('should support current MCP protocol version', () => {
      const handler = new ProtocolHandler();
      const result = handler.isSupportedProtocolVersion('2024-11-05');

      expect(result).toBe(true);
    });

    it('should reject unsupported protocol versions', () => {
      const handler = new ProtocolHandler();
      const result = handler.isSupportedProtocolVersion('2023-01-01');

      expect(result).toBe(false);
    });

    it('should return supported protocol versions', () => {
      const handler = new ProtocolHandler();
      const versions = handler.getSupportedProtocolVersions();

      expect(versions).toContain('2024-11-05');
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
    });

    it('should negotiate protocol version with client', () => {
      const handler = new ProtocolHandler();
      const clientVersions = ['2024-11-05', '2023-12-01'];
      const negotiated = handler.negotiateProtocolVersion(clientVersions);

      expect(negotiated).toBe('2024-11-05');
    });

    it('should return null when no common protocol version found', () => {
      const handler = new ProtocolHandler();
      const clientVersions = ['2023-01-01', '2022-12-31'];
      const negotiated = handler.negotiateProtocolVersion(clientVersions);

      expect(negotiated).toBeNull();
    });
  });

  describe('Message validation', () => {
    it('should validate request message structure', () => {
      const handler = new ProtocolHandler();
      const validRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
        params: {},
      };

      const result = handler.validateMessage(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.messageType).toBe('request');
    });

    it('should validate notification message structure', () => {
      const handler = new ProtocolHandler();
      const validNotification = {
        jsonrpc: '2.0',
        method: 'notifications/message',
        params: { content: 'test' },
      };

      const result = handler.validateMessage(validNotification);

      expect(result.isValid).toBe(true);
      expect(result.messageType).toBe('notification');
    });

    it('should validate response message structure', () => {
      const handler = new ProtocolHandler();
      const validResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: { status: 'ok' },
      };

      const result = handler.validateMessage(validResponse);

      expect(result.isValid).toBe(true);
      expect(result.messageType).toBe('response');
    });

    it('should reject invalid message structures', () => {
      const handler = new ProtocolHandler();
      const invalidMessage = {
        jsonrpc: '2.0',
        // Missing required fields
      };

      const result = handler.validateMessage(invalidMessage);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
