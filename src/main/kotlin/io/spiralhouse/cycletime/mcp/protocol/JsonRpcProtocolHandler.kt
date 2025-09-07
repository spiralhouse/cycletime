package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.*

/**
 * JSON-RPC 2.0 Protocol Handler Implementation
 * 
 * This class implements the ProtocolHandler interface for JSON-RPC 2.0 specification compliance.
 * It provides full support for:
 * - Single and batch request parsing
 * - Response generation (success and error)
 * - Notification handling
 * - Request/response correlation via IDs
 * - Standard and custom error codes
 * 
 * Thread Safety: This class is thread-safe and can handle concurrent requests.
 * All operations are stateless and use immutable data structures.
 * 
 * @see ProtocolHandler for the interface definition
 * @see <a href="https://www.jsonrpc.org/specification">JSON-RPC 2.0 Specification</a>
 */
class JsonRpcProtocolHandler : ProtocolHandler {
    
    private val json = Json { ignoreUnknownKeys = true }
    private val validator = JsonRpcRequestValidator()
    
    /**
     * Parses a JSON-RPC 2.0 request from a JSON string.
     * 
     * The method validates both the JSON syntax and the JSON-RPC 2.0 structure,
     * ensuring the request conforms to the specification before returning.
     * 
     * @param json The JSON string to parse
     * @return Parsed JsonRpcRequest object
     * @throws JsonRpcParseError if JSON parsing fails
     * @throws JsonRpcInvalidRequest if request is invalid according to JSON-RPC 2.0 spec
     */
    override fun parseRequest(json: String?): JsonRpcRequest {
        if (json.isNullOrBlank()) {
            throw JsonRpcParseError(JsonRpcErrorCodes.PARSE_ERROR, ErrorMessages.PARSE_ERROR)
        }
        
        val jsonElement = parseJsonElement(json)
        
        if (jsonElement !is JsonObject) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST, 
                ErrorMessages.REQUEST_MUST_BE_OBJECT
            )
        }
        
        return validator.validateAndParse(jsonElement)
    }
    
    /**
     * Parses a batch request containing multiple JSON-RPC 2.0 requests.
     * 
     * Batch requests must be non-empty JSON arrays containing valid request objects.
     * Each request in the batch is validated independently.
     * 
     * @param json The JSON array string to parse
     * @return List of parsed JsonRpcRequest objects
     * @throws JsonRpcParseError if JSON parsing fails
     * @throws JsonRpcInvalidRequest if batch is invalid or empty
     */
    override fun parseBatchRequest(json: String): List<JsonRpcRequest> {
        val jsonElement = parseJsonElement(json)
        
        if (jsonElement !is JsonArray) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST, 
                ErrorMessages.BATCH_MUST_BE_ARRAY
            )
        }
        
        if (jsonElement.isEmpty()) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST, 
                ErrorMessages.BATCH_CANNOT_BE_EMPTY
            )
        }
        
        return jsonElement.mapIndexed { index, element ->
            if (element !is JsonObject) {
                throw JsonRpcInvalidRequest(
                    JsonRpcErrorCodes.INVALID_REQUEST, 
                    ErrorMessages.invalidRequestInBatch(index)
                )
            }
            
            try {
                validator.validateAndParse(element)
            } catch (e: JsonRpcInvalidRequest) {
                throw JsonRpcInvalidRequest(
                    JsonRpcErrorCodes.INVALID_REQUEST, 
                    ErrorMessages.invalidRequestInBatchWithReason(index, e.message)
                )
            }
        }
    }
    
    /**
     * Creates a successful JSON-RPC 2.0 response.
     * 
     * The response will contain the result of the method invocation and correlate
     * to the original request via the ID field.
     * 
     * @param id The request id to respond to (can be null for notifications)
     * @param result The result data (any serializable value)
     * @return JsonRpcResponse object with the result
     */
    override fun createResponse(id: Any?, result: Any?): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = JSON_RPC_VERSION,
            result = JsonElementConverter.toJsonElement(result),
            error = null,
            id = JsonElementConverter.toJsonRpcId(id)
        )
    }
    
    /**
     * Creates an error JSON-RPC 2.0 response.
     * 
     * Error responses indicate that the request could not be processed successfully.
     * The error object contains a code, message, and optional additional data.
     * 
     * @param id The request id to respond to (null for parse errors)
     * @param code The error code (use JsonRpcErrorCodes constants)
     * @param message The error message describing what went wrong
     * @param data Additional error data (optional)
     * @return JsonRpcResponse object with the error
     */
    override fun createErrorResponse(
        id: Any?, 
        code: Int, 
        message: String, 
        data: Any?
    ): JsonRpcResponse {
        val errorData = data?.let { JsonElementConverter.toJsonElement(it) }
        
        return JsonRpcResponse(
            jsonrpc = JSON_RPC_VERSION,
            result = null,
            error = JsonRpcError(code, message, errorData),
            id = JsonElementConverter.toJsonRpcId(id)
        )
    }
    
    /**
     * Serializes a JSON-RPC 2.0 response to JSON string.
     * 
     * @param response The response to serialize
     * @return JSON string representation
     */
    override fun serializeResponse(response: JsonRpcResponse): String {
        return json.encodeToString(JsonRpcResponse.serializer(), response)
    }
    
    /**
     * Serializes a batch of JSON-RPC 2.0 responses to JSON array string.
     * 
     * @param responses List of responses to serialize
     * @return JSON array string representation
     */
    override fun serializeBatchResponse(responses: List<JsonRpcResponse>): String {
        return json.encodeToString(responses)
    }
    
    /**
     * Creates a batch response JSON string from multiple responses.
     * 
     * This is a convenience method that delegates to serializeBatchResponse.
     * 
     * @param responses List of responses to batch
     * @return JSON string containing response array
     */
    override fun createBatchResponse(responses: List<JsonRpcResponse>): String {
        return serializeBatchResponse(responses)
    }
    
    /**
     * Determines if a request is a notification (has no id field).
     * 
     * Notifications are requests that don't expect a response. They are identified
     * by the absence of an id field.
     * 
     * @param request The request to check
     * @return true if the request is a notification, false otherwise
     */
    override fun isNotification(request: JsonRpcRequest): Boolean {
        return request.id == null
    }
    
    /**
     * Handles a notification request by returning null (no response should be sent).
     * 
     * According to the JSON-RPC 2.0 specification, notifications must not
     * generate any response, not even error responses.
     * 
     * @param request The notification request
     * @return null (notifications do not generate responses)
     */
    override fun handleNotification(request: JsonRpcRequest): JsonRpcResponse? {
        return null
    }
    
    // Private helper methods
    
    /**
     * Parses a JSON string into a JsonElement.
     * 
     * @param jsonString The JSON string to parse
     * @return The parsed JsonElement
     * @throws JsonRpcParseError if parsing fails
     */
    private fun parseJsonElement(jsonString: String): JsonElement {
        return try {
            Json.parseToJsonElement(jsonString)
        } catch (e: SerializationException) {
            throw JsonRpcParseError(JsonRpcErrorCodes.PARSE_ERROR, ErrorMessages.PARSE_ERROR)
        }
    }
    
    companion object {
        private const val JSON_RPC_VERSION = "2.0"
    }
}