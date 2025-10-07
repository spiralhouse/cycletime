package io.spiralhouse.cycletime.mcp.sse

import kotlinx.serialization.Serializable

/**
 * Represents a Server-Sent Events (SSE) event according to the SSE specification.
 *
 * SSE events are used to stream data from server to client over HTTP. Each event
 * can contain data, an event type, an ID, a retry interval, and comments.
 *
 * @property data The event data (required). Can span multiple lines.
 * @property event Optional event type. Must not contain spaces or special characters.
 * @property id Optional event ID for client-side event tracking and reconnection.
 * @property retry Optional reconnection time in milliseconds.
 * @property comment Optional comment for debugging (not sent to EventSource API).
 *
 * @see <a href="https://html.spec.whatwg.org/multipage/server-sent-events.html">SSE Specification</a>
 */
@Serializable
data class SSEEvent(
    val data: String,
    val event: String? = null,
    val id: String? = null,
    val retry: Int? = null,
    val comment: String? = null
) {
    init {
        // Validate event type format
        event?.let { eventType ->
            if (eventType.contains(' ')) {
                throw IllegalArgumentException("Event type cannot contain spaces: '$eventType'")
            }
        }
    }

    companion object {
        /**
         * Creates an SSEEvent from a JSON-RPC response.
         *
         * @param jsonRpcResponse The serialized JSON-RPC response
         * @param requestId The original request ID for correlation
         * @return SSEEvent with the JSON-RPC response as data
         */
        fun fromJsonRpcResponse(jsonRpcResponse: String, requestId: String): SSEEvent {
            return SSEEvent(
                data = jsonRpcResponse,
                event = "message",
                id = requestId
            )
        }
    }
}

/**
 * Formats an SSE event according to the Server-Sent Events specification.
 *
 * The SSE format uses field:value pairs, with special handling for multiline data:
 * - Each line of data must be prefixed with "data: "
 * - Event, id, retry, and comment fields are single-line
 * - Events are terminated with a blank line (\n\n)
 *
 * Example output:
 * ```
 * data: {"jsonrpc":"2.0","result":"success","id":1}
 * event: message
 * id: evt-123
 *
 * ```
 *
 * @param event The SSE event to format
 * @return Formatted SSE event string
 */
fun formatSSEEvent(event: SSEEvent): String {
    return buildString {
        // Handle multiline data: each line must be prefixed with "data: "
        val dataLines = event.data.split("\n")
        dataLines.forEach { line ->
            append("data: $line\n")
        }

        // Add optional comment field (format: ": comment text\n")
        event.comment?.let { comment ->
            val commentLines = comment.split("\n")
            commentLines.forEach { line ->
                append(": $line\n")
            }
        }

        // Add optional event type (must not contain newlines)
        event.event?.let { eventType ->
            append("event: ${eventType.replace("\n", "")}\n")
        }

        // Add optional event ID (must not contain newlines)
        event.id?.let { eventId ->
            append("id: ${eventId.replace("\n", "")}\n")
        }

        // Add optional retry interval
        event.retry?.let { retryMs ->
            append("retry: $retryMs\n")
        }

        // Terminate event with blank line
        append("\n")
    }
}

/**
 * Formats a batch of SSE events into a single string.
 *
 * Each event in the batch is formatted according to the SSE specification
 * and properly terminated. The events are concatenated in order.
 *
 * @param events List of SSE events to format
 * @return Formatted batch of SSE events
 */
fun formatSSEBatch(events: List<SSEEvent>): String {
    return buildString {
        events.forEach { event ->
            append(formatSSEEvent(event))
        }
    }
}
