import { describe, it, expect, vi } from 'vitest';

import { TransportHandler, TransportType } from '../../../../src/mcp/connections/transport-handler.js';

import type { TransportConfig } from '../../../../src/mcp/connections/transport-handler.js';
import type { Logger } from '../../../../src/utils/logger.js';

// Mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

describe('TransportHandler', () => {
  it('should initialize with stdio transport', async () => {
    const config: TransportConfig = { type: TransportType.STDIO };
    const handler = new TransportHandler(config, mockLogger);
    
    expect(handler.getType()).toBe(TransportType.STDIO);
    expect(handler.isReady()).toBe(false); // Not ready until initialized
    
    const result = await handler.initialize();

    expect(result.success).toBe(true);
    expect(handler.isReady()).toBe(true);
  });

  it('should initialize with websocket transport', () => {
    const config: TransportConfig = { 
      type: TransportType.WEBSOCKET,
      port: 8080,
      host: 'localhost'
    };
    const handler = new TransportHandler(config, mockLogger);
    
    expect(handler.getType()).toBe(TransportType.WEBSOCKET);
    expect(handler.getConfig()).toEqual(config);
  });

  it('should handle connection initialization', async () => {
    const handler = new TransportHandler({ type: TransportType.STDIO }, mockLogger);
    const result = await handler.initialize();
    
    expect(result.success).toBe(true);
  });

  it('should handle message sending', async () => {
    const handler = new TransportHandler({ type: TransportType.STDIO }, mockLogger);

    await handler.initialize();
    
    const message = { id: '1', method: 'test', jsonrpc: '2.0' };
    const result = await handler.send('conn-1', JSON.stringify(message));
    
    expect(result.success).toBe(true);
  });

  it('should provide transport statistics', () => {
    const handler = new TransportHandler({ type: TransportType.STDIO }, mockLogger);
    const stats = handler.getStatistics();
    
    expect(stats.type).toBe(TransportType.STDIO);
    expect(stats.messagesReceived).toBe(0);
    expect(stats.messagesSent).toBe(0);
  });

  it('should handle cleanup properly', async () => {
    const handler = new TransportHandler({ type: TransportType.STDIO }, mockLogger);

    await handler.initialize();
    
    const result = await handler.cleanup();

    expect(result.success).toBe(true);
  });
});