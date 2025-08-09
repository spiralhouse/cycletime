/**
 * Connection pool for managing multiple MCP connections
 */

import { createLogger } from '../../utils/logger.js';
import type { Logger } from '../../utils/logger.js';

/**
 * Pool configuration
 */
export interface PoolConfig {
  maxSize?: number;
  cleanupInterval?: number;
  maxIdleTime?: number;
}

/**
 * Pool operation result
 */
export interface PoolResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Pool connection data
 */
export interface PoolConnection {
  id: string;
  type: string;
  createdAt: number;
  lastActivity: number;
  metadata?: Record<string, any>;
}

/**
 * Pool statistics
 */
export interface PoolStatistics {
  totalConnections: number;
  maxSize: number;
  utilizationRate: number;
  averageAge: number;
  oldestConnection: string | undefined;
  newestConnection: string | undefined;
}

/**
 * Simple connection pool for managing multiple connections
 */
export class ConnectionPool {
  private connections: Map<string, PoolConnection> = new Map();
  private config: Required<PoolConfig>;
  private logger: Logger;
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(config: PoolConfig = {}, logger?: Logger) {
    this.config = {
      maxSize: config.maxSize || 100,
      cleanupInterval: config.cleanupInterval || 60000, // 1 minute
      maxIdleTime: config.maxIdleTime || 300000, // 5 minutes
    };

    this.logger = logger || createLogger('connection-pool');
    this.startCleanupTimer();
  }

  /**
   * Add a connection to the pool
   */
  async addConnection(
    id: string, 
    connectionData: { type: string; metadata?: Record<string, any> }
  ): Promise<PoolResult> {
    try {
      if (this.connections.has(id)) {
        return {
          success: false,
          error: `Connection '${id}' already exists in pool`,
        };
      }

      if (this.connections.size >= this.config.maxSize) {
        return {
          success: false,
          error: `Pool is full (max size: ${this.config.maxSize})`,
        };
      }

      const connection: PoolConnection = {
        id,
        type: connectionData.type,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        metadata: connectionData.metadata || {},
      };

      this.connections.set(id, connection);

      this.logger.info('Connection added to pool', { 
        connectionId: id, 
        type: connectionData.type,
        poolSize: this.connections.size 
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to add connection to pool', { 
        connectionId: id,
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        success: false,
        error: `Failed to add connection: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Remove a connection from the pool
   */
  async removeConnection(id: string): Promise<PoolResult> {
    try {
      const connection = this.connections.get(id);
      
      if (!connection) {
        return {
          success: false,
          error: `Connection '${id}' not found in pool`,
        };
      }

      this.connections.delete(id);

      this.logger.info('Connection removed from pool', { 
        connectionId: id,
        poolSize: this.connections.size 
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to remove connection from pool', { 
        connectionId: id,
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        success: false,
        error: `Failed to remove connection: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get a connection from the pool
   */
  getConnection(id: string): PoolConnection | undefined {
    const connection = this.connections.get(id);
    
    if (connection) {
      // Update last activity
      connection.lastActivity = Date.now();
    }

    return connection;
  }

  /**
   * Get all connections in the pool
   */
  getAllConnections(): PoolConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections by type
   */
  getConnectionsByType(type: string): PoolConnection[] {
    return this.getAllConnections().filter(conn => conn.type === type);
  }

  /**
   * Get current pool size
   */
  getSize(): number {
    return this.connections.size;
  }

  /**
   * Get maximum pool size
   */
  getMaxSize(): number {
    return this.config.maxSize;
  }

  /**
   * Check if pool is empty
   */
  isEmpty(): boolean {
    return this.connections.size === 0;
  }

  /**
   * Check if pool is full
   */
  isFull(): boolean {
    return this.connections.size >= this.config.maxSize;
  }

  /**
   * Clear all connections from the pool
   */
  async clear(): Promise<PoolResult> {
    try {
      const removedCount = this.connections.size;
      this.connections.clear();

      this.logger.info('Pool cleared', { removedCount });

      return { 
        success: true,
        data: { removedCount } 
      };
    } catch (error) {
      this.logger.error('Failed to clear pool', { 
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        success: false,
        error: `Failed to clear pool: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get pool statistics
   */
  getStatistics(): PoolStatistics {
    const connections = this.getAllConnections();
    const now = Date.now();
    
    let totalAge = 0;
    let oldestConnection: PoolConnection | undefined;
    let newestConnection: PoolConnection | undefined;

    for (const connection of connections) {
      const age = now - connection.createdAt;
      totalAge += age;

      if (!oldestConnection || connection.createdAt < oldestConnection.createdAt) {
        oldestConnection = connection;
      }

      if (!newestConnection || connection.createdAt > newestConnection.createdAt) {
        newestConnection = connection;
      }
    }

    const averageAge = connections.length > 0 ? totalAge / connections.length : 0;
    const utilizationRate = connections.length / this.config.maxSize;

    return {
      totalConnections: connections.length,
      maxSize: this.config.maxSize,
      utilizationRate,
      averageAge,
      oldestConnection: oldestConnection?.id,
      newestConnection: newestConnection?.id,
    };
  }

  /**
   * Perform cleanup of idle connections
   */
  performCleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [id, connection] of this.connections.entries()) {
      const idleTime = now - connection.lastActivity;
      
      if (idleTime > this.config.maxIdleTime) {
        this.connections.delete(id);
        removedCount++;
        
        this.logger.debug('Removed idle connection from pool', {
          connectionId: id,
          idleTime: `${idleTime}ms`,
          maxIdleTime: `${this.config.maxIdleTime}ms`
        });
      }
    }

    if (removedCount > 0) {
      this.logger.info('Pool cleanup completed', { 
        removedCount,
        remainingConnections: this.connections.size 
      });
    }

    return removedCount;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);

    this.logger.debug('Pool cleanup timer started', { 
      interval: `${this.config.cleanupInterval}ms` 
    });
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      
      this.logger.debug('Pool cleanup timer stopped');
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.connections.clear();
    
    this.logger.info('Connection pool destroyed');
  }
}