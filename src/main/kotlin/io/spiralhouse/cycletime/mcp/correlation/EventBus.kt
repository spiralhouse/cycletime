package io.spiralhouse.cycletime.mcp.correlation

import io.spiralhouse.cycletime.mcp.sse.SSEEvent
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.runBlocking
import java.util.concurrent.ConcurrentHashMap

/**
 * Event bus for correlating POST requests with SSE responses.
 *
 * This class manages event distribution to active SSE connections,
 * ensuring each session receives only its own events.
 *
 * @property maxEventsPerSession Maximum events to store per session (default 1000)
 */
class EventBus(
    private val maxEventsPerSession: Int = DEFAULT_MAX_EVENTS_PER_SESSION,
    private val channelCapacity: Int = DEFAULT_CHANNEL_CAPACITY
) {
    private val channels = ConcurrentHashMap<String, Channel<SSEEvent>>()
    private val eventStorage = ConcurrentHashMap<String, MutableList<SSEEvent>>()
    private val eventStorageLock = Mutex()

    companion object {
        const val DEFAULT_MAX_EVENTS_PER_SESSION = 1000
        const val DEFAULT_CHANNEL_CAPACITY = 100
    }

    /**
     * Subscribes to events for a specific session.
     *
     * @param sessionId The session identifier
     * @return Flow of SSE events for this session
     */
    fun subscribe(sessionId: String): Flow<SSEEvent> {
        val channel = channels.getOrPut(sessionId) {
            Channel(
                capacity = channelCapacity,
                onBufferOverflow = BufferOverflow.DROP_OLDEST
            )
        }
        return channel.receiveAsFlow()
    }

    /**
     * Publishes an event to a specific session.
     *
     * Implements FIFO eviction when maxEventsPerSession is exceeded.
     *
     * @param sessionId The session identifier
     * @param event The SSE event to publish
     */
    suspend fun publish(sessionId: String, event: SSEEvent) {
        // Protect storage with lock
        eventStorageLock.withLock {
            val events = eventStorage.getOrPut(sessionId) { mutableListOf() }
            if (events.size >= maxEventsPerSession) {
                events.removeAt(0)
            }
            events.add(event)
        }

        // Send to channel (outside lock - already thread-safe)
        channels[sessionId]?.send(event)
    }

    /**
     * Gets all events for a session (for testing purposes).
     *
     * @param sessionId The session identifier
     * @return List of events for this session
     */
    fun getEvents(sessionId: String): List<SSEEvent> {
        return runBlocking {
            eventStorageLock.withLock {
                eventStorage[sessionId]?.toList() ?: emptyList()
            }
        }
    }

    /**
     * Unsubscribes from events for a session.
     *
     * @param sessionId The session identifier
     */
    suspend fun unsubscribe(sessionId: String) {
        channels.remove(sessionId)?.close()
        eventStorageLock.withLock {
            eventStorage.remove(sessionId)
        }
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
