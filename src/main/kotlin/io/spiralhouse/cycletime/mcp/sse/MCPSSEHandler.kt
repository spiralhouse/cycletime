package io.spiralhouse.cycletime.mcp.sse

import io.ktor.server.sse.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import io.spiralhouse.cycletime.mcp.correlation.EventBus
import kotlinx.coroutines.flow.catch
import org.slf4j.LoggerFactory

private val logger = LoggerFactory.getLogger("MCPSSEHandler")

/**
 * SSE endpoint handler for MCP server-to-client event streaming.
 *
 * This handler establishes SSE connections for streaming JSON-RPC responses
 * and server events to MCP clients. Each connection is associated with a
 * session ID provided via the Mcp-Session-Id header.
 *
 * @param sessionManager Session manager for tracking active sessions
 * @param eventBus Event bus for subscribing to session events
 */
fun Route.mcpSSEEndpoint(
    sessionManager: MCPSessionManager,
    eventBus: EventBus
) {
    sse("/mcp/events") {
        val sessionId = call.request.headers["Mcp-Session-Id"]

        if (sessionId.isNullOrBlank()) {
            logger.warn("SSE connection attempt without Mcp-Session-Id header")
            return@sse
        }

        try {
            // Validate and create/get session
            val session = sessionManager.getOrCreateSession(sessionId)
            logger.info("SSE connection established for session: $sessionId")

            // Stream events from EventBus to SSE client
            eventBus.subscribe(sessionId)
                .catch { e ->
                    logger.error("Error streaming events for session $sessionId", e)
                }
                .collect { event ->
                    // Format and send SSE event to client
                    val formattedEvent = formatSSEEvent(event)
                    send(formattedEvent)

                    // Update session activity
                    sessionManager.updateActivity(sessionId)
                }
        } catch (e: SecurityException) {
            logger.warn("Invalid session ID: ${e.message}")
        } catch (e: Exception) {
            logger.error("SSE handler error for session $sessionId", e)
        } finally {
            logger.info("SSE connection closed for session: $sessionId")
            eventBus.unsubscribe(sessionId)
        }
    }
}
