import { describe, it, expect, vi } from 'vitest';

import { ConnectionManager } from '../../../../src/mcp/connections/connection-manager.js';
import { ConnectionStatus } from '../../../../src/mcp/connections/connection-state.js';

import type { ConnectionConfig } from '../../../../src/mcp/connections/connection-manager.js';
import type { Logger } from '../../../../src/utils/logger.js';

// Mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

describe('ConnectionManager - Simple Tests', () => {
  const mockConfig: ConnectionConfig = {
    maxConnections: 10,
    messageTimeout: 5000,
    connectionTimeout: 10_000,
  };

  it('should initialize with correct configuration', () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);

    expect(connectionManager.getMaxConnections()).toBe(mockConfig.maxConnections);
    expect(connectionManager.getActiveConnectionCount()).toBe(0);
    expect(connectionManager.isAtCapacity()).toBe(false);
  });

  it('should initialize with default configuration', () => {
    const defaultManager = new ConnectionManager();

    expect(defaultManager.getMaxConnections()).toBe(100); // default
  });

  it('should create connection successfully', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);
    const result = await connectionManager.createConnection('client-1', { clientType: 'test' });

    expect(result.success).toBe(true);
    expect(result.data?.connectionId).toBe('client-1');
    expect(connectionManager.getActiveConnectionCount()).toBe(1);
  });

  it('should prevent duplicate connections', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);

    await connectionManager.createConnection('client-1');
    const result = await connectionManager.createConnection('client-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
    expect(connectionManager.getActiveConnectionCount()).toBe(1);
  });

  it('should connect successfully', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);

    await connectionManager.createConnection('client-1');
    const result = await connectionManager.connect('client-1');

    expect(result.success).toBe(true);
  });

  it('should handle connection not found', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);
    const result = await connectionManager.connect('non-existent');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection not found');
  });

  it('should respect maximum connection limit', async () => {
    const smallManager = new ConnectionManager({ maxConnections: 2 });

    await smallManager.createConnection('client-1');
    await smallManager.createConnection('client-2');

    expect(smallManager.isAtCapacity()).toBe(true);

    const result = await smallManager.createConnection('client-3');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Maximum connections reached');
  });

  it('should queue messages successfully', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);

    await connectionManager.createConnection('client-1');
    await connectionManager.connect('client-1');

    const message = { id: 'msg-1', type: 'request', data: { method: 'test' } };
    const result = await connectionManager.queueMessage('client-1', message);

    expect(result.success).toBe(true);
  });

  it('should process queued messages', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);

    await connectionManager.createConnection('client-1');
    await connectionManager.connect('client-1');

    const message = { id: 'msg-1', type: 'request', data: { method: 'test' } };

    await connectionManager.queueMessage('client-1', message);

    const processedMessage = await connectionManager.processNextMessage('client-1');

    expect(processedMessage).toBeDefined();
    expect(processedMessage?.message.id).toBe('msg-1');
  });

  it('should handle message for non-existent connection', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);
    const message = { id: 'msg-1', type: 'request', data: { method: 'test' } };
    const result = await connectionManager.queueMessage('non-existent', message);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection not found');
  });

  it('should return connection statistics', () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);
    const stats = connectionManager.getStatistics();

    expect(stats).toEqual({
      totalConnections: 0,
      activeConnections: 0,
      maxConnections: mockConfig.maxConnections,
      averageUptime: 0,
      totalMessagesProcessed: 0,
    });
  });

  it('should return health information', () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);
    const health = connectionManager.getHealthInfo();

    expect(health.status).toBe('healthy');
    expect(health.connectionCount).toBe(0);
    expect(health.atCapacity).toBe(false);
  });

  it('should list all connections', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);

    await connectionManager.createConnection('client-1');
    await connectionManager.createConnection('client-2');

    const connections = connectionManager.getAllConnections();

    expect(connections).toHaveLength(2);
    expect(connections.map(c => c.getId())).toEqual(['client-1', 'client-2']);
  });

  it('should remove connections', async () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);

    await connectionManager.createConnection('client-1');

    expect(connectionManager.getActiveConnectionCount()).toBe(1);

    const result = await connectionManager.removeConnection('client-1');

    expect(result.success).toBe(true);
    expect(connectionManager.getActiveConnectionCount()).toBe(0);
  });

  it('should cleanup stale connections', () => {
    const connectionManager = new ConnectionManager(mockConfig, mockLogger);
    const staleCount = connectionManager.cleanupStaleConnections();

    expect(staleCount).toBe(0); // No stale connections in fresh test
  });
});
