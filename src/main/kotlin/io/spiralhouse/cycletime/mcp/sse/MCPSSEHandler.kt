package io.spiralhouse.cycletime.mcp.sse

import io.ktor.http.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import io.spiralhouse.cycletime.mcp.correlation.EventBus
import io.spiralhouse.cycletime.mcp.http.validateSessionHeader
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
 * SECURITY FIX (SPI-676): Header validation is performed BEFORE establishing
 * the SSE connection to properly reject invalid requests with 400 Bad Request.
 * Previously, missing headers would result in 200 OK (security issue).
 *
 * @param sessionManager Session manager for tracking active sessions
 * @param eventBus Event bus for subscribing to session events
 */
fun Route.mcpSSEEndpoint(
    sessionManager: MCPSessionManager,
    eventBus: EventBus
) {
    get("/mcp/events") {
        // CRITICAL: Validate session header BEFORE establishing SSE connection
        // This prevents unauthorized connections (matches POST endpoint pattern)
        val sessionId = call.validateSessionHeader("SSE", logger) ?: return@get

        try {
            // Validate and create/get session
            val session = sessionManager.getOrCreateSession(sessionId)
            logger.info("SSE connection established for session: $sessionId")

            // Set SSE headers
            call.response.headers.append(HttpHeaders.CacheControl, "no-cache")
            call.response.headers.append(HttpHeaders.Connection, "keep-alive")
            call.response.headers.append("X-Accel-Buffering", "no")

            // Establish SSE connection using respondTextWriter
            call.respondTextWriter(contentType = ContentType.Text.EventStream) {
                try {
                    // Send initial comment to establish connection and flush headers
                    write(": SSE connection established\n\n")
                    flush()

                    // Stream events from EventBus to SSE client
                    eventBus.subscribe(sessionId)
                        .catch { e ->
                            logger.error("Error streaming events for session $sessionId", e)
                        }
                        .collect { event ->
                            // Format and send SSE event to client
                            val formattedEvent = formatSSEEvent(event)
                            write(formattedEvent)
                            flush()

                            // Update session activity
                            sessionManager.updateActivity(sessionId)
                        }
                } finally {
                    logger.info("SSE connection closed for session: $sessionId")
                    eventBus.unsubscribe(sessionId)
                }
            }
        } catch (e: SecurityException) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid session ID"))
            logger.warn("Invalid session ID: ${e.message}")
        } catch (e: Exception) {
            logger.error("SSE handler error for session $sessionId", e)
            // Connection already established, can't send error response
        }
    }
}
