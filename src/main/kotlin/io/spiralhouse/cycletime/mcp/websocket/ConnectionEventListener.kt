package io.spiralhouse.cycletime.mcp.websocket

/**
 * Observer interface for connection lifecycle events.
 * 
 * Implements the Observer pattern to allow external components to react
 * to connection events without tight coupling to the connection manager.
 * 
 * ## Design Pattern
 * This follows the Observer pattern where:
 * - WebSocketConnectionManager is the Subject
 * - ConnectionEventListener implementations are Observers
 * - Events are pushed to all registered listeners
 * 
 * ## Use Cases
 * - Logging and monitoring
 * - Analytics and metrics collection
 * - Resource cleanup on disconnection
 * - Session state management
 * - Alert generation for connection issues
 */
interface ConnectionEventListener {
    
    /**
     * Called when a new connection is established.
     * 
     * @param connection the newly established connection
     */
    fun onConnectionEstablished(connection: WebSocketConnection)
    
    /**
     * Called when a connection is closed.
     * 
     * @param connectionId the ID of the closed connection
     * @param reason the reason for closure, if available
     */
    fun onConnectionClosed(connectionId: String, reason: String?)
    
    /**
     * Called when a message is received from a connection.
     * 
     * @param connectionId the ID of the connection
     * @param messageSize the size of the message in bytes
     */
    fun onMessageReceived(connectionId: String, messageSize: Int)
    
    /**
     * Called when a message is sent to a connection.
     * 
     * @param connectionId the ID of the connection
     * @param messageSize the size of the message in bytes
     */
    fun onMessageSent(connectionId: String, messageSize: Int)
    
    /**
     * Called when an error occurs on a connection.
     * 
     * @param connectionId the ID of the connection
     * @param error the error that occurred
     */
    fun onConnectionError(connectionId: String, error: Throwable)
    
    /**
     * Called when a connection times out.
     * 
     * @param connectionId the ID of the timed-out connection
     */
    fun onConnectionTimeout(connectionId: String)
}