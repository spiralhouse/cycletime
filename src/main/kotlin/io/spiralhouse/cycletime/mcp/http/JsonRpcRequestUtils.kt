package io.spiralhouse.cycletime.mcp.http

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.*

/**
 * Exception thrown when JSON-RPC validation fails.
 */
class JsonRpcValidationException(message: String) : Exception(message)

/**
 * Exception thrown when JSON parsing fails.
 */
class JsonParseException(message: String) : Exception(message)

/**
 * Exception thrown when request size exceeds limit.
 */
class RequestTooLargeException(message: String) : Exception(message)

private val json = Json { ignoreUnknownKeys = true }

// Maximum request size: 1MB
private const val MAX_REQUEST_SIZE = 1_000_000

/**
 * List of valid MCP methods.
 */
private val VALID_MCP_METHODS = setOf(
    "initialize",
    "initialized",
    "ping",
    "tools/list",
    "tools/call",
    "resources/list",
    "resources/read",
    "resources/templates/list",
    "resources/subscribe",
    "resources/unsubscribe",
    "prompts/list",
    "prompts/get",
    "logging/setLevel",
    "completion/complete",
    "notifications/cancelled",
    "notifications/progress",
    "notifications/message",
    "notifications/resources/list_changed",
    "notifications/resources/updated",
    "notifications/tools/list_changed",
    "notifications/prompts/list_changed"
)

/**
 * Parses a JSON-RPC request from a JSON string.
 *
 * @param json The JSON string to parse
 * @return Parsed JsonRpcRequest object
 * @throws JsonParseException if JSON parsing fails
 * @throws JsonRpcValidationException if request is invalid
 */
fun parseJsonRpcRequest(json: String): JsonRpcRequest {
    try {
        val jsonElement = Json.parseToJsonElement(json)

        if (jsonElement !is JsonObject) {
            throw JsonRpcValidationException("Request must be a JSON object")
        }

        val jsonrpc = jsonElement["jsonrpc"]?.jsonPrimitive?.content
            ?: throw JsonRpcValidationException("Missing 'jsonrpc' field")

        val method = jsonElement["method"]?.jsonPrimitive?.content
            ?: throw JsonRpcValidationException("Missing 'method' field")

        val params = jsonElement["params"]
        val id = jsonElement["id"]

        return JsonRpcRequest(
            jsonrpc = jsonrpc,
            method = method,
            params = params,
            id = id
        )
    } catch (e: SerializationException) {
        throw JsonParseException("Invalid JSON: ${e.message}")
    } catch (e: IllegalArgumentException) {
        throw JsonParseException("Invalid JSON: ${e.message}")
    }
}

/**
 * Validates a JSON-RPC request.
 *
 * @param json The JSON string to validate
 * @throws JsonRpcValidationException if request is invalid
 */
fun validateJsonRpcRequest(json: String) {
    val request = parseJsonRpcRequest(json)

    // Validate jsonrpc version
    if (request.jsonrpc != "2.0") {
        throw JsonRpcValidationException("jsonrpc version must be '2.0'")
    }

    // Validate method name
    if (request.method.isEmpty()) {
        throw JsonRpcValidationException("Method name cannot be empty")
    }
}

/**
 * Extracts the method name from a JSON-RPC request.
 *
 * @param json The JSON string
 * @return The method name
 */
fun extractMethodName(json: String): String {
    val request = parseJsonRpcRequest(json)
    return request.method
}

/**
 * Extracts the request ID from a JSON-RPC request.
 *
 * @param json The JSON string
 * @return The request ID, or null if not present (notification)
 */
fun extractRequestId(json: String): JsonElement? {
    val request = parseJsonRpcRequest(json)
    return request.id
}

/**
 * Extracts the parameters from a JSON-RPC request.
 *
 * @param json The JSON string
 * @return The parameters, or null if not present
 */
fun extractParams(json: String): JsonElement? {
    val request = parseJsonRpcRequest(json)
    return request.params
}

/**
 * Checks if a request is a notification (no ID field).
 *
 * @param request The JSON-RPC request
 * @return true if notification
 */
fun isNotification(request: JsonRpcRequest): Boolean {
    return request.id == null
}

/**
 * Validates if a method name is a valid MCP method.
 *
 * @param method The method name
 * @return true if valid
 */
fun validateMcpMethod(method: String): Boolean {
    return VALID_MCP_METHODS.contains(method)
}

/**
 * Validates request size to prevent DoS attacks.
 *
 * @param json The JSON string
 * @throws RequestTooLargeException if request is too large
 */
fun validateRequestSize(json: String) {
    if (json.length > MAX_REQUEST_SIZE) {
        throw RequestTooLargeException("Request size exceeds maximum of $MAX_REQUEST_SIZE bytes")
    }
}
