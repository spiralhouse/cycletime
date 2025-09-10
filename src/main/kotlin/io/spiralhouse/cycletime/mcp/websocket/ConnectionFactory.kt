package io.spiralhouse.cycletime.mcp.websocket

import io.ktor.websocket.DefaultWebSocketSession
import java.time.Instant
import java.util.UUID
import java.util.concurrent.atomic.AtomicReference

/**
 * Factory for creating and configuring WebSocket connections.
 * 
 * Creates WebSocket connections with UUID-based identifiers and
 * proper initialization of tracking metadata.
 * 
 * ## Design Benefits
 * - Centralized connection creation logic
 * - Consistent connection initialization
 * - UUID v4 for guaranteed uniqueness
 * - Atomic references for thread-safe activity tracking
 * 
 * ## Future Extensibility
 * Could support:
 * - Connection pooling
 * - Different transport protocols
 * - Custom connection metadata
 * - Connection recycling
 */
class ConnectionFactory {
    
    /**
     * Creates a new connection wrapper for a WebSocket session.
     * 
     * @param session the underlying WebSocket session
     * @return a new connection wrapper with unique ID and tracking
     */
    fun createConnection(session: DefaultWebSocketSession): ActiveWebSocketSession {
        val now = Instant.now()
        return ActiveWebSocketSession(
            id = generateConnectionId(),
            session = session,
            connectedAt = now,
            lastActivity = AtomicReference(now)
        )
    }
    
    /**
     * Generates a unique identifier for a new connection.
     * 
     * @return a unique connection identifier
     */
    fun generateConnectionId(): String {
        return UUID.randomUUID().toString()
    }
    
    /**
     * Validates if a connection ID is valid.
     * 
     * @param connectionId the ID to validate
     * @return true if the ID is valid, false otherwise
     */
    fun isValidConnectionId(connectionId: String): Boolean {
        // Use regex validation instead of exception control flow to avoid detekt violation
        val uuidRegex = Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
        return connectionId.matches(uuidRegex)
    }
}