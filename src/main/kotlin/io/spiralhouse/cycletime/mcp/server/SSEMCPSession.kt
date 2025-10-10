package io.spiralhouse.cycletime.mcp.server

import io.spiralhouse.cycletime.mcp.correlation.EventBus
import io.spiralhouse.cycletime.mcp.sse.SSEEvent
import org.slf4j.LoggerFactory

/**
 * SSE-based implementation of MCPSession.
 *
 * Wraps the EventBus to provide MCP protocol support over Server-Sent Events transport.
 * This implementation publishes messages to the EventBus, which are then streamed to
 * the client via the SSE connection established by the /mcp/events endpoint.
 *
 * Architecture:
 * - SSE endpoint (/mcp/events) subscribes to EventBus and streams events to client
 * - This session publishes events to EventBus for delivery to the client
 * - EventBus manages the connection lifecycle and event distribution
 *
 * @param eventBus The event bus for publishing messages to the SSE stream
 * @param sessionId Unique identifier for this session
 */
class SSEMCPSession(
    private val eventBus: EventBus,
    override val sessionId: String
) : MCPSession {
    private val logger = LoggerFactory.getLogger(SSEMCPSession::class.java)

    /**
     * SSE session is active if there's an active SSE connection subscribed to EventBus.
     *
     * **WARNING: LIVE QUERY - see [MCPSession.isActive] for TOCTOU race condition details.**
     *
     * This property queries EventBus state on every access. The value can change between
     * consecutive reads if the SSE connection closes. Always use defensive error handling
     * in send() rather than relying on this check for correctness.
     */
    override val isActive: Boolean
        get() = eventBus.hasActiveConnection(sessionId)

    /**
     * Send a message to the client via SSE.
     *
     * Publishes the message as an SSEEvent to the EventBus, which delivers it
     * to the active SSE connection for this session.
     *
     * Uses defensive error handling: lets EventBus.publish() determine session state
     * rather than check-then-act pattern, avoiding race condition where session
     * could close between isActive check and publish call.
     *
     * @param message The message to send (typically JSON-RPC 2.0 format)
     * @throws IllegalStateException if session is not active or becomes inactive during send
     */
    override suspend fun send(message: String) {
        logger.debug("Sending message to SSE session $sessionId (${message.length} chars)")

        // Publish message as SSE event - EventBus will fail gracefully if session inactive
        try {
            val event = SSEEvent(data = message)
            eventBus.publish(sessionId, event)
            logger.trace("Message sent successfully to SSE session $sessionId")
        } catch (e: IllegalStateException) {
            // Session became inactive during send - wrap with context for caller
            logger.warn("Failed to send message to SSE session $sessionId: session not active", e)
            throw IllegalStateException(
                "Cannot send message - SSE session $sessionId is not active",
                e
            )
        } catch (e: Exception) {
            // Unexpected error during publish - wrap and rethrow
            logger.error("Unexpected error sending message to SSE session $sessionId: ${e.message}", e)
            throw IllegalStateException(
                "Failed to send message to SSE session $sessionId: ${e.message}",
                e
            )
        }
    }

    /**
     * Close the SSE session.
     *
     * Unsubscribes from the EventBus, which will close the SSE connection
     * and cleanup associated resources.
     */
    override suspend fun close() {
        logger.info("Closing SSE session $sessionId")
        try {
            eventBus.unsubscribe(sessionId)
            logger.debug("SSE session $sessionId closed successfully")
        } catch (e: Exception) {
            logger.warn("Error closing SSE session $sessionId: ${e.message}", e)
            // Don't rethrow - closing should be best-effort
        }
    }
}
