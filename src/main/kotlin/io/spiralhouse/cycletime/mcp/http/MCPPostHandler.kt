package io.spiralhouse.cycletime.mcp.http

import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import io.spiralhouse.cycletime.mcp.correlation.EventBus
import io.spiralhouse.cycletime.mcp.correlation.MessageCorrelator
import io.spiralhouse.cycletime.mcp.sse.SSEEvent
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory

private val logger = LoggerFactory.getLogger("MCPPostHandler")
private val json = Json { ignoreUnknownKeys = true }

/**
 * POST endpoint handler for MCP client-to-server requests.
 *
 * This handler processes JSON-RPC requests submitted via POST to /mcp.
 * When an active SSE connection exists for the session, responses are
 * queued for delivery via SSE. Otherwise, responses are returned directly.
 *
 * @param sessionManager Session manager for tracking active sessions
 * @param eventBus Event bus for publishing responses to SSE connections
 * @param correlator Message correlator for tracking request/response pairs
 * @param methodHandler MCP method handler for processing JSON-RPC requests
 */
fun Route.mcpPostEndpoint(
    sessionManager: MCPSessionManager,
    eventBus: EventBus,
    correlator: MessageCorrelator,
    methodHandler: McpMethodHandler
) {
    post("/mcp") {
        val sessionId = call.request.headers["Mcp-Session-Id"]

        if (sessionId.isNullOrBlank()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Missing Mcp-Session-Id header"))
            logger.warn("POST request without Mcp-Session-Id header")
            return@post
        }

        try {
            // Validate and get/create session
            sessionManager.getOrCreateSession(sessionId)

            // Read and parse request body
            val requestBody = call.receiveText()
            logger.debug("POST request from session $sessionId: $requestBody")

            // Validate request size
            validateRequestSize(requestBody)

            // Parse JSON-RPC request
            val jsonRpcRequest = parseJsonRpcRequest(requestBody)

            // Register pending request for correlation (if not a notification)
            if (jsonRpcRequest.id != null) {
                correlator.registerPendingRequest(
                    sessionId = sessionId,
                    requestId = jsonRpcRequest.id,
                    method = jsonRpcRequest.method
                )
            }

            // Process request through method handler
            val jsonRpcResponse = methodHandler.handleRequest(jsonRpcRequest)

            // If SSE connection active, queue response for delivery
            if (eventBus.hasActiveConnection(sessionId)) {
                val responseJson = Json.encodeToString(
                    io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse.serializer(),
                    jsonRpcResponse
                )

                val sseEvent = SSEEvent(
                    data = responseJson,
                    event = "message",
                    id = jsonRpcRequest.id?.toString()
                )

                eventBus.publish(sessionId, sseEvent)

                // Return 202 Accepted (response sent via SSE)
                call.respond(HttpStatusCode.Accepted)
                logger.debug("Response queued for SSE delivery to session $sessionId")
            } else {
                // No SSE connection - return response directly
                call.respond(HttpStatusCode.OK, jsonRpcResponse)
                logger.debug("Response sent directly to session $sessionId (no SSE)")
            }

        } catch (e: SecurityException) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid session ID"))
            logger.warn("Security error: ${e.message}")
        } catch (e: JsonParseException) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid JSON-RPC format"))
            logger.warn("JSON parsing error: ${e.message}")
        } catch (e: JsonRpcValidationException) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "JSON-RPC validation failed"))
            logger.warn("JSON-RPC validation error: ${e.message}")
        } catch (e: RequestTooLargeException) {
            call.respond(HttpStatusCode.PayloadTooLarge, mapOf("error" to e.message))
            logger.warn("Request too large: ${e.message}")
        } catch (e: Exception) {
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "Internal server error"))
            logger.error("POST handler error for session $sessionId", e)
        }
    }
}
