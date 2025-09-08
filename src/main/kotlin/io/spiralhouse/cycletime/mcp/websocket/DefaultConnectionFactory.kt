package io.spiralhouse.cycletime.mcp.websocket

import io.ktor.websocket.DefaultWebSocketSession
import java.time.Instant
import java.util.UUID
import java.util.concurrent.atomic.AtomicReference

/**
 * Default implementation of the ConnectionFactory interface.
 * 
 * Creates WebSocket connections with UUID-based identifiers and
 * proper initialization of tracking metadata.
 * 
 * ## Design Choices
 * - UUID v4 for guaranteed uniqueness
 * - Atomic references for thread-safe activity tracking
 * - Immutable connection metadata
 * 
 * ## Future Enhancements
 * Could be extended to support:
 * - Custom ID generation strategies
 * - Connection pooling
 * - Metadata enrichment
 * - Connection recycling
 */
class DefaultConnectionFactory : ConnectionFactory {
    
    override fun createConnection(session: DefaultWebSocketSession): ActiveWebSocketSession {
        val now = Instant.now()
        return ActiveWebSocketSession(
            id = generateConnectionId(),
            session = session,
            connectedAt = now,
            lastActivity = AtomicReference(now)
        )
    }
    
    override fun generateConnectionId(): String {
        return UUID.randomUUID().toString()
    }
    
    override fun isValidConnectionId(connectionId: String): Boolean {
        // Use regex validation instead of exception control flow to avoid detekt violation
        val uuidRegex = Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
        return connectionId.matches(uuidRegex)
    }
}