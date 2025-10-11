package io.spiralhouse.cycletime.mcp.http

import io.ktor.server.application.*
import io.spiralhouse.cycletime.mcp.session.generateSessionId
import org.slf4j.Logger

/**
 * Gets or generates session ID for MCP request based on method type.
 *
 * For 'initialize' method: Uses provided session ID or generates new one (bootstrap)
 * For other methods: Validates existing session ID header (requires session)
 *
 * This implements the MCP Spec 2024-11-05 session bootstrap pattern:
 * - Initialize requests MAY omit Mcp-Session-Id header
 * - If omitted, server generates new session ID
 * - All other methods MUST include Mcp-Session-Id header
 *
 * @param method The JSON-RPC method being invoked
 * @param logger Logger for diagnostics
 * @return Session ID if valid, null if validation fails (error response already sent)
 */
suspend fun ApplicationCall.getOrGenerateSessionId(
    method: String,
    logger: Logger
): String? {
    return if (method == "initialize") {
        // Bootstrap: use provided session or generate new one
        request.headers["Mcp-Session-Id"]
            ?: generateSessionId().also {
                logger.info("Generated new session ID for initialize: $it")
            }
    } else {
        // Normal operation: require existing session
        validateSessionHeader("POST", logger)
    }
}
