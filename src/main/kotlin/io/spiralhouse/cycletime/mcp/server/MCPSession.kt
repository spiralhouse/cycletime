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
