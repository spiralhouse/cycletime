package io.spiralhouse.cycletime.mcp.websocket

import io.ktor.websocket.*
import kotlinx.coroutines.channels.SendChannel
import java.time.Instant
import java.util.concurrent.atomic.AtomicReference

/**
 * Represents a WebSocket connection state.
 * 
 * @property id Unique identifier for this connection
 * @property isActive Whether the connection is currently active
 * @property connectedAt When the connection was established
 * @property lastActivity When the connection was last active
 */
data class WebSocketConnection(
    val id: String,
    val isActive: Boolean,
    val connectedAt: Instant,
    val lastActivity: Instant
)

/**
 * Internal wrapper for active WebSocket sessions with state tracking.
 */
internal data class ActiveWebSocketSession(
    val id: String,
    val session: DefaultWebSocketSession,
    val connectedAt: Instant,
    val lastActivity: AtomicReference<Instant>
) {
    fun toConnection(): WebSocketConnection {
        return WebSocketConnection(
            id = id,
            isActive = !session.closeReason.isCompleted,
            connectedAt = connectedAt,
            lastActivity = lastActivity.get()
        )
    }
    
    fun updateActivity() {
        lastActivity.set(Instant.now())
    }
}