package io.spiralhouse.cycletime.mcp.correlation

import io.spiralhouse.cycletime.mcp.sse.SSEEvent
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import java.util.concurrent.ConcurrentHashMap

/**
 * Event bus for correlating POST requests with SSE responses.
 *
 * This class manages event distribution to active SSE connections,
 * ensuring each session receives only its own events.
 */
class EventBus {
    private val channels = ConcurrentHashMap<String, Channel<SSEEvent>>()
    private val eventStorage = ConcurrentHashMap<String, MutableList<SSEEvent>>()

    /**
     * Subscribes to events for a specific session.
     *
     * @param sessionId The session identifier
     * @return Flow of SSE events for this session
     */
    fun subscribe(sessionId: String): Flow<SSEEvent> {
        val channel = channels.getOrPut(sessionId) {
            Channel(
                capacity = 100,
                onBufferOverflow = BufferOverflow.DROP_OLDEST
            )
        }
        return channel.receiveAsFlow()
    }

    /**
     * Publishes an event to a specific session.
     *
     * @param sessionId The session identifier
     * @param event The SSE event to publish
     */
    suspend fun publish(sessionId: String, event: SSEEvent) {
        // Store event for getEvents() testing
        eventStorage.getOrPut(sessionId) { mutableListOf() }.add(event)

        // Send to active channel if exists (ignore if no active connection)
        channels[sessionId]?.send(event)
    }

    /**
     * Gets all events for a session (for testing purposes).
     *
     * @param sessionId The session identifier
     * @return List of events for this session
     */
    fun getEvents(sessionId: String): List<SSEEvent> {
        return eventStorage[sessionId]?.toList() ?: emptyList()
    }

    /**
     * Unsubscribes from events for a session.
     *
     * @param sessionId The session identifier
     */
    fun unsubscribe(sessionId: String) {
        channels.remove(sessionId)?.close()
        eventStorage.remove(sessionId)
    }

    /**
     * Checks if a session has an active SSE connection.
     *
     * @param sessionId The session identifier
     * @return true if active connection exists
     */
    fun hasActiveConnection(sessionId: String): Boolean {
        return channels.containsKey(sessionId)
    }
}
