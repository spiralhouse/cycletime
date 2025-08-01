/**
 * JCVD Provider Connection Manager
 * Handles connection lifecycle, health checks, and reconnection logic
 */

import type {
  ProviderConfig,
  ProviderError,
  OperationResult
} from '../types.js'

// =============================================================================
// Connection Manager Interface
// =============================================================================

export interface ConnectionManagerOptions {
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number
  /** Initial reconnection delay in milliseconds */
  reconnectDelay?: number
  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay?: number
  /** Connection timeout in milliseconds */
  connectionTimeout?: number
  /** Enable automatic reconnection */
  autoReconnect?: boolean
}

export interface ConnectionStatus {
  /** Current connection state */
  isConnected: boolean
  /** Connection establishment timestamp */
  connectedAt?: Date
  /** Last connection attempt timestamp */
  lastAttempt?: Date
  /** Number of connection attempts */
  attemptCount: number
  /** Last error encountered */
  lastError?: ProviderError
  /** Connection performance metrics */
  metrics: {
    totalConnections: number
    failedConnections: number
    totalReconnections: number
    averageConnectionTime: number
    lastConnectionTime: number
  }
}

// =============================================================================
// Connection Manager Implementation
// =============================================================================

/**
 * Manages provider connections with automatic reconnection and monitoring
 */
export class ConnectionManager {
  private config: ProviderConfig
  private options: Required<ConnectionManagerOptions>
  private status: ConnectionStatus
  private reconnectTimer?: NodeJS.Timeout
  private connectionPromise?: Promise<OperationResult<void>>

  constructor(config: ProviderConfig, options: ConnectionManagerOptions = {}) {
    this.config = config
    this.options = {
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectDelay: options.maxReconnectDelay ?? 30000,
      connectionTimeout: options.connectionTimeout ?? 10000,
      autoReconnect: options.autoReconnect ?? true
    }

    this.status = {
      isConnected: false,
      attemptCount: 0,
      metrics: {
        totalConnections: 0,
        failedConnections: 0,
        totalReconnections: 0,
        averageConnectionTime: 0,
        lastConnectionTime: 0
      }
    }
  }

  // -------------------------------------------------------------------------
  // Connection Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Establish connection with retry logic
   */
  async connect(): Promise<OperationResult<void>> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this.performConnection()
    const result = await this.connectionPromise
    this.connectionPromise = undefined

    return result
  }

  /**
   * Disconnect and cleanup resources
   */
  async disconnect(): Promise<OperationResult<void>> {
    try {
      // Stop automatic reconnection
      this.stopReconnection()

      // Perform provider-specific disconnection
      if (this.status.isConnected) {
        await this.performDisconnection()
      }

      this.status.isConnected = false
      this.status.connectedAt = undefined

      return {
        success: true,
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'disconnect'
        }
      }

    } catch (error) {
      return {
        success: false,
        error: this.createConnectionError('CONNECTION_FAILED', error.message, { operation: 'disconnect' }),
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operationType: 'disconnect'
        }
      }
    }
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<OperationResult<void>> {
    await this.disconnect()
    return this.connect()
  }

  // -------------------------------------------------------------------------
  // Connection Status and Monitoring
  // -------------------------------------------------------------------------

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.status.isConnected
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status }
  }

  /**
   * Test connection health
   */
  async testConnection(): Promise<boolean> {
    if (!this.status.isConnected) {
      return false
    }

    try {
      return await this.performConnectionTest()
    } catch (error) {
      this.handleConnectionError(error)
      return false
    }
  }

  // -------------------------------------------------------------------------
  // Private Implementation
  // -------------------------------------------------------------------------

  /**
   * Perform actual connection establishment
   */
  private async performConnection(): Promise<OperationResult<void>> {
    const startTime = Date.now()
    this.status.attemptCount++
    this.status.lastAttempt = new Date()

    try {
      // Implement connection timeout
      const connectionPromise = this.establishConnection()
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), this.options.connectionTimeout)
      )

      await Promise.race([connectionPromise, timeoutPromise])

      // Connection successful
      const connectionTime = Date.now() - startTime
      this.status.isConnected = true
      this.status.connectedAt = new Date()
      this.status.lastError = undefined

      // Update metrics
      this.status.metrics.totalConnections++
      this.status.metrics.lastConnectionTime = connectionTime
      this.status.metrics.averageConnectionTime = 
        (this.status.metrics.averageConnectionTime * (this.status.metrics.totalConnections - 1) + connectionTime) / 
        this.status.metrics.totalConnections

      return {
        success: true,
        metadata: {
          duration: connectionTime,
          timestamp: new Date(),
          operationType: 'connect',
          affectedResources: [this.config.id]
        }
      }

    } catch (error) {
      const connectionTime = Date.now() - startTime
      const providerError = this.createConnectionError('CONNECTION_FAILED', error.message, { 
        operation: 'connect',
        duration: connectionTime 
      })

      this.status.lastError = providerError
      this.status.metrics.failedConnections++

      // Start automatic reconnection if enabled
      if (this.options.autoReconnect && this.status.attemptCount < this.options.maxReconnectAttempts) {
        this.scheduleReconnection()
      }

      return {
        success: false,
        error: providerError,
        metadata: {
          duration: connectionTime,
          timestamp: new Date(),
          operationType: 'connect'
        }
      }
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.status.attemptCount - 1),
      this.options.maxReconnectDelay
    )

    this.reconnectTimer = setTimeout(async () => {
      try {
        this.status.metrics.totalReconnections++
        const result = await this.connect()
        
        if (result.success) {
          console.log(`Provider ${this.config.id} reconnected successfully`)
        }
      } catch (error) {
        console.error(`Provider ${this.config.id} reconnection failed:`, error)
      }
    }, delay)
  }

  /**
   * Stop automatic reconnection
   */
  private stopReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: any): void {
    this.status.isConnected = false
    this.status.lastError = this.createConnectionError('CONNECTION_FAILED', error.message)

    // Start reconnection if enabled
    if (this.options.autoReconnect && this.status.attemptCount < this.options.maxReconnectAttempts) {
      this.scheduleReconnection()
    }
  }

  /**
   * Create standardized connection error
   */
  private createConnectionError(code: string, message: string, context?: Record<string, any>): ProviderError {
    return {
      name: 'ConnectionError',
      message: `Provider ${this.config.id}: ${message}`,
      code: code as any,
      providerId: this.config.id,
      providerType: this.config.type,
      retryable: code !== 'AUTHENTICATION_FAILED',
      context: {
        operation: 'connection',
        timestamp: new Date(),
        ...context
      }
    }
  }

  // -------------------------------------------------------------------------
  // Abstract Methods - Provider-specific implementation required
  // -------------------------------------------------------------------------

  /**
   * Establish provider-specific connection
   * Override in provider-specific connection managers
   */
  protected async establishConnection(): Promise<void> {
    // Default implementation for testing
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Provider-specific connection logic would go here
    // For example:
    // - Database connection establishment
    // - API authentication
    // - WebSocket connection setup
    // - Credential validation
  }

  /**
   * Perform provider-specific disconnection
   * Override in provider-specific connection managers
   */
  protected async performDisconnection(): Promise<void> {
    // Default implementation for testing
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Provider-specific disconnection logic would go here
    // For example:
    // - Close database connections
    // - Revoke API tokens
    // - Close WebSocket connections
    // - Cleanup resources
  }

  /**
   * Test provider-specific connection health
   * Override in provider-specific connection managers
   */
  protected async performConnectionTest(): Promise<boolean> {
    // Default implementation for testing
    return true
    
    // Provider-specific health check logic would go here
    // For example:
    // - Database ping
    // - API health endpoint call
    // - WebSocket ping/pong
    // - Credential validation
  }
}

// =============================================================================
// Provider-Specific Connection Managers
// =============================================================================

/**
 * SQLite-specific connection manager
 */
export class SQLiteConnectionManager extends ConnectionManager {
  protected async establishConnection(): Promise<void> {
    // SQLite connection logic would be implemented here
    // For now, this is a placeholder
    console.log(`Establishing SQLite connection to ${(this.config as any).databasePath}`)
  }

  protected async performDisconnection(): Promise<void> {
    console.log(`Closing SQLite connection`)
  }

  protected async performConnectionTest(): Promise<boolean> {
    // Test SQLite connection with a simple query
    console.log(`Testing SQLite connection`)
    return true
  }
}

/**
 * Linear-specific connection manager
 */
export class LinearConnectionManager extends ConnectionManager {
  protected async establishConnection(): Promise<void> {
    // Linear API authentication would be implemented here
    console.log(`Establishing Linear API connection for team ${(this.config as any).teamId}`)
  }

  protected async performDisconnection(): Promise<void> {
    console.log(`Closing Linear API connection`)
  }

  protected async performConnectionTest(): Promise<boolean> {
    // Test Linear API connection with viewer query
    console.log(`Testing Linear API connection`)
    return true
  }
}

/**
 * GitHub-specific connection manager
 */
export class GitHubConnectionManager extends ConnectionManager {
  protected async establishConnection(): Promise<void> {
    // GitHub API authentication would be implemented here
    console.log(`Establishing GitHub API connection for ${(this.config as any).owner}/${(this.config as any).repo}`)
  }

  protected async performDisconnection(): Promise<void> {
    console.log(`Closing GitHub API connection`)
  }

  protected async performConnectionTest(): Promise<boolean> {
    // Test GitHub API connection with repository query
    console.log(`Testing GitHub API connection`)
    return true
  }
}

/**
 * Jira-specific connection manager
 */
export class JiraConnectionManager extends ConnectionManager {
  protected async establishConnection(): Promise<void> {
    // Jira API authentication would be implemented here
    console.log(`Establishing Jira API connection to ${(this.config as any).baseUrl}`)
  }

  protected async performDisconnection(): Promise<void> {
    console.log(`Closing Jira API connection`)
  }

  protected async performConnectionTest(): Promise<boolean> {
    // Test Jira API connection with project query
    console.log(`Testing Jira API connection`)
    return true
  }
}