package io.spiralhouse.cycletime.mcp.websocket

import io.ktor.websocket.DefaultWebSocketSession

/**
 * Factory interface for creating and configuring connections.
 * 
 * This abstraction follows the Factory pattern to encapsulate the creation
 * logic for connections, allowing for different connection types and
 * initialization strategies.
 * 
 * ## Design Benefits
 * - Centralized connection creation logic
 * - Consistent connection initialization
 * - Support for different connection types
 * - Testability through mock implementations
 * 
 * ## Future Extensibility
 * Could support:
 * - Connection pooling
 * - Different transport protocols
 * - Custom connection metadata
 * - Connection recycling
 */
interface ConnectionFactory {
    
    /**
     * Creates a new connection wrapper for a WebSocket session.
     * 
     * @param session the underlying WebSocket session
     * @return a new connection wrapper with unique ID and tracking
     */
    fun createConnection(session: DefaultWebSocketSession): ActiveWebSocketSession
    
    /**
     * Generates a unique identifier for a new connection.
     * 
     * @return a unique connection identifier
     */
    fun generateConnectionId(): String
    
    /**
     * Validates if a connection ID is valid.
     * 
     * @param connectionId the ID to validate
     * @return true if the ID is valid, false otherwise
     */
    fun isValidConnectionId(connectionId: String): Boolean
}