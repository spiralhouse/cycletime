import { describe, it, expect, vi } from 'vitest';

import { ConnectionPool } from '../../../../src/mcp/connections/connection-pool.js';

import type { PoolConfig } from '../../../../src/mcp/connections/connection-pool.js';
import type { Logger } from '../../../../src/utils/logger.js';

// Mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

describe('ConnectionPool', () => {
  it('should initialize with default configuration', () => {
    const pool = new ConnectionPool({}, mockLogger);
    
    expect(pool.getSize()).toBe(0);
    expect(pool.getMaxSize()).toBe(100);
    expect(pool.isEmpty()).toBe(true);
  });

  it('should initialize with custom configuration', () => {
    const config: PoolConfig = { maxSize: 50, cleanupInterval: 30_000 };
    const pool = new ConnectionPool(config, mockLogger);
    
    expect(pool.getMaxSize()).toBe(50);
  });

  it('should add connections to pool', async () => {
    const pool = new ConnectionPool({}, mockLogger);
    const result = await pool.addConnection('conn-1', { type: 'stdio' });
    
    expect(result.success).toBe(true);
    expect(pool.getSize()).toBe(1);
    expect(pool.isEmpty()).toBe(false);
  });

  it('should prevent duplicate connections', async () => {
    const pool = new ConnectionPool({}, mockLogger);

    await pool.addConnection('conn-1', { type: 'stdio' });
    
    const result = await pool.addConnection('conn-1', { type: 'stdio' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('should respect maximum pool size', async () => {
    const pool = new ConnectionPool({ maxSize: 2 }, mockLogger);
    
    await pool.addConnection('conn-1', { type: 'stdio' });
    await pool.addConnection('conn-2', { type: 'stdio' });
    
    const result = await pool.addConnection('conn-3', { type: 'stdio' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Pool is full');
  });

  it('should retrieve connections from pool', async () => {
    const pool = new ConnectionPool({}, mockLogger);

    await pool.addConnection('conn-1', { type: 'stdio' });
    
    const connection = pool.getConnection('conn-1');

    expect(connection).toBeDefined();
    expect(connection?.id).toBe('conn-1');
  });

  it('should remove connections from pool', async () => {
    const pool = new ConnectionPool({}, mockLogger);

    await pool.addConnection('conn-1', { type: 'stdio' });
    
    const result = await pool.removeConnection('conn-1');

    expect(result.success).toBe(true);
    expect(pool.getSize()).toBe(0);
  });

  it('should list all connections', async () => {
    const pool = new ConnectionPool({}, mockLogger);

    await pool.addConnection('conn-1', { type: 'stdio' });
    await pool.addConnection('conn-2', { type: 'websocket' });
    
    const connections = pool.getAllConnections();

    expect(connections).toHaveLength(2);
    expect(connections.map(c => c.id)).toEqual(['conn-1', 'conn-2']);
  });

  it('should provide pool statistics', async () => {
    const pool = new ConnectionPool({}, mockLogger);

    await pool.addConnection('conn-1', { type: 'stdio' });
    
    const stats = pool.getStatistics();

    expect(stats.totalConnections).toBe(1);
    expect(stats.maxSize).toBe(100);
    expect(stats.utilizationRate).toBe(0.01);
  });

  it('should handle pool cleanup', () => {
    const pool = new ConnectionPool({}, mockLogger);
    const removedCount = pool.performCleanup();
    
    expect(removedCount).toBe(0); // No stale connections to remove
  });

  it('should clear all connections', async () => {
    const pool = new ConnectionPool({}, mockLogger);

    await pool.addConnection('conn-1', { type: 'stdio' });
    await pool.addConnection('conn-2', { type: 'stdio' });
    
    const result = await pool.clear();

    expect(result.success).toBe(true);
    expect(pool.isEmpty()).toBe(true);
  });
});