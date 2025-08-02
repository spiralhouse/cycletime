/**
 * MCP Protocol Handler - JSON-RPC parsing and protocol version negotiation
 */

import type { Logger } from '../../utils/logger.js';

/**
 * JSON-RPC message types
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export type JSONRPCMessage = JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;

/**
 * Message parsing result
 */
export interface ParseResult {
  success: boolean;
  data?: JSONRPCMessage;
  error?: string;
}

/**
 * Message validation result
 */
export interface ValidationResult {
  isValid: boolean;
  messageType?: 'request' | 'notification' | 'response';
  error?: string;
}

/**
 * Protocol handler for MCP server
 */
export class ProtocolHandler {
  private readonly supportedVersions = ['2024-11-05'];

  constructor(_logger?: Logger) {}

  /**
   * Parse JSON-RPC message from string
   */
  parseMessage(messageString: string): ParseResult {
    try {
      const message = JSON.parse(messageString);
      const validation = this.validateMessage(message);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || 'Validation failed',
        };
      }

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      return {
        success: false,
        error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Validate JSON-RPC message structure
   */
  validateMessage(message: any): ValidationResult {
    if (!message || typeof message !== 'object') {
      return {
        isValid: false,
        error: 'Message must be an object',
      };
    }

    if (message.jsonrpc !== '2.0') {
      return {
        isValid: false,
        error: message.jsonrpc ? 'Unsupported JSON-RPC version' : 'Missing jsonrpc field',
      };
    }

    if (!message.method && message.result === undefined && message.error === undefined) {
      return {
        isValid: false,
        error: 'Missing method field',
      };
    }

    // Determine message type
    let messageType: 'request' | 'notification' | 'response';
    
    if (message.result !== undefined || message.error !== undefined) {
      messageType = 'response';
    } else if (message.id !== undefined) {
      messageType = 'request';
    } else {
      messageType = 'notification';
    }

    return {
      isValid: true,
      messageType,
    };
  }

  /**
   * Format successful JSON-RPC response
   */
  formatResponse(id: string | number | null, result: any): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  /**
   * Format JSON-RPC error response
   */
  formatErrorResponse(id: string | number | null, error: JSONRPCError): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error,
    };
  }

  /**
   * Check if protocol version is supported
   */
  isSupportedProtocolVersion(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  /**
   * Get list of supported protocol versions
   */
  getSupportedProtocolVersions(): string[] {
    return [...this.supportedVersions];
  }

  /**
   * Negotiate protocol version with client
   */
  negotiateProtocolVersion(clientVersions: string[]): string | null {
    // Find the highest common version
    for (const clientVersion of clientVersions) {
      if (this.isSupportedProtocolVersion(clientVersion)) {
        return clientVersion;
      }
    }
    
    return null;
  }

  /**
   * Create standard JSON-RPC error objects
   */
  static createError(code: number, message: string, data?: any): JSONRPCError {
    const error: JSONRPCError = { code, message };

    if (data !== undefined) {
      error.data = data;
    }

    return error;
  }

  /**
   * Standard JSON-RPC error codes
   */
  static readonly ErrorCodes = {
    PARSE_ERROR: -32_700,
    INVALID_REQUEST: -32_600,
    METHOD_NOT_FOUND: -32_601,
    INVALID_PARAMS: -32_602,
    INTERNAL_ERROR: -32_603,
  } as const;
}