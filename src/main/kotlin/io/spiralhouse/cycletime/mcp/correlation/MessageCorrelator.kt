package io.spiralhouse.cycletime.mcp.correlation

import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcError
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.datetime.Instant
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

/**
 * Exception thrown when a duplicate request ID is detected within a session.
 */
class DuplicateRequestIdException(message: String) : Exception(message)

/**
 * Represents a pending request awaiting correlation with its response.
 */
private data class PendingRequest(
    val requestId: JsonElement?,
    val method: String,
    val timestamp: Instant,
    val metadata: Map<String, Any>
)

/**
 * Correlates JSON-RPC requests with their responses for the SSE transport.
 *
 * This class tracks pending requests per session and ensures responses
 * are properly matched to their originating requests.
 *
 * @property timeProvider Time provider for testable time handling
 * @property requestTimeout Timeout for pending requests (default 30 seconds)
 */
class MessageCorrelator(
    private val timeProvider: TimeProvider,
    private val requestTimeout: Duration = 30.seconds
) {
    private val pendingRequests = ConcurrentHashMap<String, MutableMap<String, PendingRequest>>()

    /**
     * Registers a pending request for correlation.
     *
     * @param sessionId The session identifier
     * @param requestId The request ID (null for notifications)
     * @param method The method name
     * @param metadata Optional metadata for debugging
     * @throws DuplicateRequestIdException if request ID already exists in session
     */
    suspend fun registerPendingRequest(
        sessionId: String,
        requestId: JsonElement?,
        method: String,
        metadata: Map<String, Any> = emptyMap()
    ) {
        // Notifications don't need correlation
        if (isNotification(requestId)) {
            return
        }

        val requestKey = requestId.toString()
        val sessionRequests = pendingRequests.getOrPut(sessionId) { mutableMapOf() }

        // Check for duplicate request ID
        if (sessionRequests.containsKey(requestKey)) {
            throw DuplicateRequestIdException("Duplicate request ID in session $sessionId: $requestId")
        }

        sessionRequests[requestKey] = PendingRequest(
            requestId = requestId,
            method = method,
            timestamp = timeProvider.now(),
            metadata = metadata
        )
    }

    /**
     * Correlates a response with its pending request.
     *
     * @param sessionId The session identifier
     * @param requestId The request ID
     * @param response The response data
     */
    suspend fun correlate(sessionId: String, requestId: JsonElement, response: JsonElement) {
        val requestKey = requestId.toString()
        pendingRequests[sessionId]?.remove(requestKey)
    }

    /**
     * Checks if a session has pending requests.
     *
     * @param sessionId The session identifier
     * @return true if pending requests exist
     */
    suspend fun hasPendingRequests(sessionId: String): Boolean {
        return (pendingRequests[sessionId]?.size ?: 0) > 0
    }

    /**
     * Gets the count of pending requests for a session.
     *
     * @param sessionId The session identifier
     * @return Number of pending requests
     */
    suspend fun getPendingCount(sessionId: String): Int {
        return pendingRequests[sessionId]?.size ?: 0
    }

    /**
     * Cleans up stale pending requests that have exceeded the timeout.
     */
    suspend fun cleanupStaleRequests() {
        val now = timeProvider.now()
        pendingRequests.values.forEach { sessionRequests ->
            sessionRequests.entries.removeIf { (_, request) ->
                val age = now - request.timestamp
                age > requestTimeout
            }
        }
    }

    /**
     * Checks if a request is a notification (no response expected).
     *
     * @param requestId The request ID
     * @return true if notification
     */
    suspend fun isNotification(requestId: JsonElement?): Boolean {
        return requestId == null
    }

    /**
     * Clears all pending requests for a session.
     *
     * @param sessionId The session identifier
     */
    suspend fun clearSession(sessionId: String) {
        pendingRequests.remove(sessionId)
    }

    /**
     * Gets metadata for a pending request.
     *
     * @param sessionId The session identifier
     * @param requestId The request ID
     * @return Request metadata, or null if not found
     */
    suspend fun getRequestMetadata(sessionId: String, requestId: JsonElement): Map<String, Any>? {
        val requestKey = requestId.toString()
        return pendingRequests[sessionId]?.get(requestKey)?.metadata
    }
}

/**
 * Correlates a response with its request ID.
 *
 * @param requestId The request ID
 * @param responseData The response data
 * @return JSON-RPC response object
 */
fun correlateResponse(requestId: JsonElement, responseData: JsonElement): JsonRpcResponse {
    return JsonRpcResponse(
        jsonrpc = "2.0",
        result = responseData,
        error = null,
        id = requestId
    )
}

/**
 * Creates a JSON-RPC success response.
 *
 * @param id The request ID
 * @param result The result data
 * @return JSON-RPC response object
 */
fun createJsonRpcResponse(id: JsonElement, result: JsonElement): JsonRpcResponse {
    return JsonRpcResponse(
        jsonrpc = "2.0",
        result = result,
        error = null,
        id = id
    )
}

/**
 * Creates a JSON-RPC error response.
 *
 * @param id The request ID
 * @param code The error code
 * @param message The error message
 * @return JSON-RPC response object
 */
fun createJsonRpcError(id: JsonElement, code: Int, message: String): JsonRpcResponse {
    return JsonRpcResponse(
        jsonrpc = "2.0",
        result = null,
        error = JsonRpcError(code = code, message = message, data = null),
        id = id
    )
}
