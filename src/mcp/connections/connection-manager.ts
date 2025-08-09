/**
 * Main connection manager for MCP client connections
 */

import { createLogger } from '../../utils/logger.js';

import { ConnectionState, ConnectionStatus, type ConnectionMetadata } from './connection-state.js';
import { MessageQueue, type Message, type QueuedMessage, MessagePriority } from './message-queue.js';

import type { Logger } from '../../utils/logger.js';

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  maxConnections?: number;
  messageTimeout?: number;
  connectionTimeout?: number;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
}

/**
 * Operation result interface
 */
export interface ConnectionResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Connection statistics
 */
export interface ConnectionManagerStatistics {
  totalConnections: number;
  activeConnections: number;
  maxConnections: number;
  averageUptime: number;
  totalMessagesProcessed: number;
}

/**
 * Health information
 */
export interface HealthInfo {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionCount: number;
  atCapacity: boolean;
  errorCount: number;
  lastActivity: number;
}

/**
 * Connection data structure
 */
interface ConnectionData {
  state: ConnectionState;
  messageQueue: MessageQueue;
  lastActivity: number;
}

/**
 * Main connection manager for MCP client connections
 */
export class ConnectionManager {
  private connections: Map<string, ConnectionData> = new Map();
  private config: Required<ConnectionConfig>;
  private logger: Logger;
  private totalMessagesProcessed: number = 0;

  constructor(config: ConnectionConfig = {}, logger?: Logger) {
    this.config = {
      maxConnections: config.maxConnections ?? 100,
      messageTimeout: config.messageTimeout ?? 30_000, // 30 seconds
      connectionTimeout: config.connectionTimeout ?? 60_000, // 60 seconds
      enableHeartbeat: config.enableHeartbeat ?? false,
      heartbeatInterval: config.heartbeatInterval ?? 30_000, // 30 seconds
    };

    this.logger = logger ?? createLogger('connection-manager');
  }

  /**
   * Create a new connection
   */
  async createConnection(
    connectionId: string, 
    metadata: ConnectionMetadata = {}
  ): Promise<ConnectionResult<{ connectionId: string }>> {
    try {
      if (this.connections.has(connectionId)) {
        return {
          success: false,
          error: `Connection '${connectionId}' already exists`,
        };
      }

      if (this.connections.size >= this.config.maxConnections) {
        return {
          success: false,
          error: `Maximum connections reached (${this.config.maxConnections})`,
        };
      }

      const state = new ConnectionState(connectionId, metadata);
      const messageQueue = new MessageQueue(connectionId);

      this.connections.set(connectionId, {
        state,
        messageQueue,
        lastActivity: Date.now(),
      });

      this.logger.info('Connection created', { connectionId });

      return {
        success: true,
        data: { connectionId },
      };
    } catch (error) {
      this.logger.error('Failed to create connection', { 
        connectionId, 
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        success: false,
        error: `Failed to create connection: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Connect an existing connection
   */
  async connect(connectionId: string): Promise<ConnectionResult> {
    try {
      const connectionData = this.connections.get(connectionId);
      
      if (!connectionData) {
        return {
          success: false,
          error: `Connection not found: ${connectionId}`,
        };
      }

      connectionData.state.setStatus(ConnectionStatus.CONNECTING);
      
      // Simulate connection process with a minimal delay
      await new Promise(resolve => setImmediate(resolve));
      
      connectionData.state.setStatus(ConnectionStatus.CONNECTED);
      connectionData.state.updateActivity();
      connectionData.lastActivity = Date.now();

      this.logger.info('Connection established', { connectionId });

      return { success: true };
    } catch (error) {
      const connectionData = this.connections.get(connectionId);

      if (connectionData) {
        connectionData.state.setStatus(ConnectionStatus.ERROR, error as Error);
      }

      this.logger.error('Failed to connect', { 
        connectionId, 
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        success: false,
        error: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Disconnect a connection
   */
  async disconnect(connectionId: string): Promise<ConnectionResult> {
    try {
      const connectionData = this.connections.get(connectionId);
      
      if (!connectionData) {
        return {
          success: false,
          error: `Connection not found: ${connectionId}`,
        };
      }

      connectionData.state.setStatus(ConnectionStatus.DISCONNECTING);
      
      // Simulate disconnection process with minimal delay
      await new Promise(resolve => setImmediate(resolve));
      
      connectionData.state.setStatus(ConnectionStatus.DISCONNECTED);
      connectionData.lastActivity = Date.now();

      this.logger.info('Connection disconnected', { connectionId });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to disconnect', { 
        connectionId, 
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        success: false,
        error: `Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Reconnect a connection
   */
  async reconnect(connectionId: string): Promise<ConnectionResult> {
    const disconnectResult = await this.disconnect(connectionId);

    if (!disconnectResult.success) {
      return disconnectResult;
    }

    // Wait a moment before reconnecting
    await new Promise(resolve => setTimeout(resolve, 100));

    return this.connect(connectionId);
  }

  /**
   * Remove a connection completely
   */
  async removeConnection(connectionId: string): Promise<ConnectionResult> {
    try {
      const connectionData = this.connections.get(connectionId);
      
      if (!connectionData) {
        return {
          success: false,
          error: `Connection not found: ${connectionId}`,
        };
      }

      // Disconnect first if connected
      if (connectionData.state.isConnected()) {
        await this.disconnect(connectionId);
      }

      // Clear message queue
      connectionData.messageQueue.clear();
      
      // Remove from connections
      this.connections.delete(connectionId);

      this.logger.info('Connection removed', { connectionId });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to remove connection', { 
        connectionId, 
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        success: false,
        error: `Failed to remove connection: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Queue a message for a connection
   */
  async queueMessage(
    connectionId: string, 
    message: Message, 
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<ConnectionResult> {
    try {
      const connectionData = this.connections.get(connectionId);
      
      if (!connectionData) {
        return {
          success: false,
          error: `Connection not found: ${connectionId}`,
        };
      }

      const result = connectionData.messageQueue.enqueue(message, priority);

      if (!result.success) {
        return result;
      }

      connectionData.state.incrementMessageCount('request');
      connectionData.state.updateActivity();
      connectionData.lastActivity = Date.now();

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to queue message', { 
        connectionId, 
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        success: false,
        error: `Failed to queue message: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Process the next message for a connection
   */
  async processNextMessage(connectionId: string): Promise<QueuedMessage | null> {
    try {
      const connectionData = this.connections.get(connectionId);
      
      if (!connectionData) {
        this.logger.warn('Attempted to process message for non-existent connection', { connectionId });

        return null;
      }

      const queuedMessage = connectionData.messageQueue.dequeue();

      if (queuedMessage) {
        connectionData.state.incrementMessageCount('response');
        connectionData.state.updateActivity();
        connectionData.lastActivity = Date.now();
        this.totalMessagesProcessed++;
      }

      return queuedMessage;
    } catch (error) {
      this.logger.error('Failed to process message', { 
        connectionId, 
        error: error instanceof Error ? error.message : String(error) 
      });

      return null;
    }
  }

  /**
   * Get a connection by ID
   */
  getConnection(connectionId: string): ConnectionState | undefined {
    const connectionData = this.connections.get(connectionId);

    return connectionData?.state;
  }

  /**
   * Get all connections
   */
  getAllConnections(): ConnectionState[] {
    return Array.from(this.connections.values()).map(data => data.state);
  }

  /**
   * Get connections by status
   */
  getConnectionsByStatus(status: ConnectionStatus): ConnectionState[] {
    return this.getAllConnections().filter(conn => conn.getStatus() === status);
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connected connection count
   */
  getConnectedConnectionCount(): number {
    return this.getConnectionsByStatus(ConnectionStatus.CONNECTED).length;
  }

  /**
   * Get maximum connections allowed
   */
  getMaxConnections(): number {
    return this.config.maxConnections;
  }

  /**
   * Check if at capacity
   */
  isAtCapacity(): boolean {
    return this.connections.size >= this.config.maxConnections;
  }

  /**
   * Get manager statistics
   */
  getStatistics(): ConnectionManagerStatistics {
    const connections = this.getAllConnections();
    const activeConnections = this.getConnectedConnectionCount();
    
    const totalUptime = connections
      .filter(conn => conn.isConnected())
      .reduce((sum, conn) => sum + conn.getUptime(), 0);
    
    const averageUptime = activeConnections > 0 ? totalUptime / activeConnections : 0;

    return {
      totalConnections: connections.length,
      activeConnections,
      maxConnections: this.config.maxConnections,
      averageUptime,
      totalMessagesProcessed: this.totalMessagesProcessed,
    };
  }

  /**
   * Get health information
   */
  getHealthInfo(): HealthInfo {
    const connections = this.getAllConnections();
    const errorConnections = connections.filter(conn => conn.getStatus() === ConnectionStatus.ERROR);
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (errorConnections.length > 0) {
      const errorRate = errorConnections.length / connections.length;

      if (errorRate >= 0.5) {
        status = 'unhealthy';
      } else if (errorRate >= 0.2) {
        status = 'degraded';
      }
    }

    const lastActivity = Math.max(
      ...Array.from(this.connections.values()).map(data => data.lastActivity),
      0
    );

    return {
      status,
      connectionCount: connections.length,
      atCapacity: this.isAtCapacity(),
      errorCount: errorConnections.length,
      lastActivity,
    };
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(): number {
    const now = Date.now();
    const staleThreshold = this.config.connectionTimeout;
    let removedCount = 0;

    for (const [connectionId, connectionData] of this.connections.entries()) {
      const inactiveTime = now - connectionData.lastActivity;
      
      if (inactiveTime > staleThreshold) {
        this.logger.info('Removing stale connection', { 
          connectionId, 
          inactiveTime: `${inactiveTime}ms` 
        });

        this.removeConnection(connectionId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.info('Cleaned up stale connections', { removedCount });
    }

    return removedCount;
  }
}