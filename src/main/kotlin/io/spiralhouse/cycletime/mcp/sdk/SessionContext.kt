package io.spiralhouse.cycletime.mcp.sdk

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive

/**
 * Session context extraction for SDK per-request transport.
 *
 * The MCP SDK v0.7.2 uses stateless per-request transport (unlike the previous EventBus
 * architecture which maintained stateful session channels). Session identity is passed
 * via request metadata and session state is retrieved from the database per request.
 *
 * This approach eliminates the need for:
 * - Stateful EventBus channels keyed by session ID
 * - MessageCorrelator for request/response tracking
 * - Complex session lifecycle management in transport layer
 *
 * Session state is now exclusively managed at the application/domain layer through
 * SessionApplicationService and ExposedSessionRepository.
 *
 * Note: Phase 2 establishes infrastructure. Specific request type handling will be
 * implemented in Phase 3 during tool/resource registration.
 */
object SessionContext {
    /**
     * Extracts session ID from request metadata (generic).
     *
     * The session ID should be provided by the client in meta["sessionId"].
     * Returns null if not present, allowing tools to handle missing sessions appropriately.
     *
     * This generic version will be replaced with specific request types in Phase 3.
     *
     * @param meta The request metadata map
     * @return Session ID if present in metadata, null otherwise
     */
    fun extractSessionId(meta: Map<String, JsonElement>?): String? {
        return meta?.get("sessionId")?.jsonPrimitive?.content
    }

    /**
     * Validates and extracts session ID from metadata (throws if missing).
     *
     * Use this method when session context is required for the operation to proceed.
     * Throws IllegalStateException if session ID is not found in request metadata.
     *
     * @param meta The request metadata map
     * @return Session ID from metadata
     * @throws IllegalStateException if session ID is missing
     */
    fun requireSessionId(meta: Map<String, JsonElement>?): String {
        return extractSessionId(meta)
            ?: throw IllegalStateException(
                "No session ID in request metadata. Client must send sessionId in request.meta."
            )
    }
}
