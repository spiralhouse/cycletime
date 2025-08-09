/**
 * Connection state management for MCP client connections
 */

/**
 * Connection status enumeration
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error',
}

/**
 * Message type for counting statistics
 */
export type MessageType = 'request' | 'response' | 'notification';

/**
 * Connection metadata interface
 */
export type ConnectionMetadata = Record<string, any>;

/**
 * Message count statistics
 */
export interface MessageCount {
  request: number;
  response: number;
  notification: number;
}

/**
 * Connection statistics interface
 */
export interface ConnectionStatistics {
  id: string;
  status: ConnectionStatus;
  connectedAt: number | undefined;
  lastActivity: number | undefined;
  uptime: number;
  messageCount: MessageCount;
  metadata: ConnectionMetadata;
}

/**
 * Manages the state of a single MCP client connection
 */
export class ConnectionState {
  private id: string;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private connectedAt: number | undefined;
  private lastActivity: number | undefined;
  private error: Error | undefined;
  private metadata: ConnectionMetadata;
  private messageCount: MessageCount = {
    request: 0,
    response: 0,
    notification: 0,
  };

  constructor(id: string, metadata: ConnectionMetadata = {}) {
    this.id = id;
    this.metadata = { ...metadata };
  }

  /**
   * Get connection ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Set connection status
   */
  setStatus(status: ConnectionStatus, error?: Error): void {
    const previousStatus = this.status;

    this.status = status;

    // Handle status-specific logic
    if (status === ConnectionStatus.CONNECTED && previousStatus !== ConnectionStatus.CONNECTED) {
      this.connectedAt = Date.now();
      this.error = undefined;
    }

    if (status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.ERROR) {
      this.connectedAt = undefined;
    }

    if (status === ConnectionStatus.ERROR && error) {
      this.error = error;
    }
  }

  /**
   * Check if connection is currently connected
   */
  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  /**
   * Get connection established timestamp
   */
  getConnectedAt(): number | undefined {
    return this.connectedAt;
  }

  /**
   * Get last activity timestamp
   */
  getLastActivity(): number | undefined {
    return this.lastActivity;
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Get connection uptime in milliseconds
   */
  getUptime(): number {
    if (!this.connectedAt || !this.isConnected()) {
      return 0;
    }

    return Date.now() - this.connectedAt;
  }

  /**
   * Get current error (if any)
   */
  getError(): Error | undefined {
    return this.error;
  }

  /**
   * Get connection metadata
   */
  getMetadata(): ConnectionMetadata {
    return { ...this.metadata };
  }

  /**
   * Update connection metadata
   */
  updateMetadata(newMetadata: ConnectionMetadata): void {
    this.metadata = { ...this.metadata, ...newMetadata };
  }

  /**
   * Increment message count for a specific type
   */
  incrementMessageCount(type: MessageType): void {
    this.messageCount[type]++;
  }

  /**
   * Get comprehensive connection statistics
   */
  getStatistics(): ConnectionStatistics {
    return {
      id: this.id,
      status: this.status,
      connectedAt: this.connectedAt,
      lastActivity: this.lastActivity,
      uptime: this.getUptime(),
      messageCount: { ...this.messageCount },
      metadata: this.getMetadata(),
    };
  }
}