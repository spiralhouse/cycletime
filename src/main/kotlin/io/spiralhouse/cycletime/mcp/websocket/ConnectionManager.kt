package io.spiralhouse.cycletime.mcp.websocket

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler

/**
 * Core interface for managing connections in the MCP server.
 * 
 * This abstraction allows for different transport mechanisms beyond WebSocket
 * (e.g., TCP sockets, named pipes, HTTP long polling) while maintaining
 * a consistent connection management API.
 * 
 * ## Design Principles
 * - Transport-agnostic connection management
 * - Lifecycle management with proper resource cleanup
 * - Support for multiple concurrent connections
 * - Integration with protocol handlers for message processing
 * 
 * ## Implementation Requirements
 * - Thread-safe connection tracking
 * - Graceful shutdown with connection cleanup
 * - Proper error propagation through exceptions
 * - Resource lifecycle management
 */
interface ConnectionManager {
    
    /**
     * Starts the connection manager and begins accepting connections.
     * 
     * @throws WebSocketServerException if the server fails to start
     */
    suspend fun start()
    
    /**
     * Stops the connection manager and closes all active connections.
     * 
     * This method should:
     * - Close all active connections gracefully
     * - Clean up any resources
     * - Cancel any background jobs
     * - Be idempotent (safe to call multiple times)
     */
    suspend fun stop()
    
    /**
     * Checks if the connection manager is currently running.
     * 
     * @return true if the manager is accepting connections, false otherwise
     */
    fun isRunning(): Boolean
    
    /**
     * Gets the port number the server is listening on.
     * 
     * @return the configured port number
     */
    fun getPort(): Int
    
    /**
     * Checks if SSL/TLS is supported by this connection manager.
     * 
     * @return true if SSL is enabled, false otherwise
     */
    fun supportsSSL(): Boolean
    
    /**
     * Sets the protocol handler for processing messages.
     * 
     * The protocol handler is responsible for:
     * - Parsing incoming messages
     * - Routing to appropriate handlers
     * - Generating responses
     * - Managing protocol-specific concerns
     * 
     * @param handler the protocol handler to use for message processing
     */
    fun setProtocolHandler(handler: JsonRpcProtocolHandler)
    
    /**
     * Gets all currently active connections.
     * 
     * @return a list of active connection states
     */
    suspend fun getActiveConnections(): List<WebSocketConnection>
    
    /**
     * Gets a specific connection by its unique identifier.
     * 
     * @param id the connection identifier
     * @return the connection if found, null otherwise
     */
    suspend fun getConnectionById(id: String): WebSocketConnection?
    
    /**
     * Gets the maximum message queue size for connections.
     * 
     * @return the configured message queue size
     */
    fun getMessageQueueSize(): Int
    
    /**
     * Sets the logger for connection manager operations.
     * 
     * @param logger the logger implementation to use
     */
    fun setLogger(logger: WebSocketLogger)
}