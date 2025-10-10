package io.spiralhouse.cycletime.mcp.server

/**
 * Generic session interface for MCP transport layers.
 *
 * Abstracts transport-specific details (WebSocket, SSE) to enable
 * transport-agnostic connection management. This allows MCPConnectionManager
 * to work with any transport implementation without coupling to specific
 * transport technologies.
 *
 * Implementations:
 * - SSEMCPSession: Server-Sent Events transport
 * - Future: HTTP/2, gRPC, etc.
 */
interface MCPSession {
    /**
     * Unique identifier for this session.
     */
    val sessionId: String

    /**
     * Whether this session is currently active and can send messages.
     *
     * **WARNING: This is a LIVE QUERY, not a cached value.**
     * - The value can change between consecutive reads (Time-Of-Check-Time-Of-Use race condition)
     * - Property syntax suggests stability, but this queries live session state on every access
     * - DO NOT rely on this for safety: `if (isActive) send()` has a race condition
     *
     * **Safe Usage Pattern:**
     * ```kotlin
     * // ❌ UNSAFE - race condition between check and send
     * if (session.isActive) {
     *     session.send(message)  // May fail if session closed between check and send
     * }
     *
     * // ✅ SAFE - use defensive error handling
     * try {
     *     session.send(message)  // Let send() handle session state check
     * } catch (e: IllegalStateException) {
     *     // Handle inactive session
     * }
     * ```
     *
     * This property is useful for:
     * - Monitoring/metrics (sampling current state)
     * - Non-critical decisions (logging, UI updates)
     * - Early bailout optimizations (if caller has proper error handling)
     *
     * But NOT for:
     * - Critical correctness decisions
     * - Preventing exceptions (always handle send() exceptions)
     */
    val isActive: Boolean

    /**
     * Send a message to the client via this session.
     *
     * @param message The message content to send (typically JSON-RPC 2.0 format)
     * @throws IllegalStateException if session is not active
     */
    suspend fun send(message: String)

    /**
     * Close this session gracefully.
     *
     * After calling close(), isActive should return false and send() should fail.
     */
    suspend fun close()
}
