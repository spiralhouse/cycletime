package io.spiralhouse.cycletime.mcp.http

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.http.*
import org.slf4j.Logger

/**
 * Validates Mcp-Session-Id header for MCP requests.
 * Returns session ID if valid, null if invalid (and sends error response).
 */
suspend fun ApplicationCall.validateSessionHeader(
    requestType: String,
    logger: Logger
): String? {
    val sessionId = request.headers["Mcp-Session-Id"]

    if (sessionId.isNullOrBlank()) {
        respond(
            HttpStatusCode.BadRequest,
            mapOf("error" to "Mcp-Session-Id header required")
        )
        logger.warn("$requestType request without Mcp-Session-Id header")
        return null
    }

    return sessionId
}
