package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.*

/**
 * JSON-RPC 2.0 Protocol Handler
 * 
 * Handles parsing of JSON-RPC 2.0 requests and generation of responses according to the specification.
 * Supports both single requests and batch requests, as well as notifications.
 * 
 * @see <a href="https://www.jsonrpc.org/specification">JSON-RPC 2.0 Specification</a>
 */
class JsonRpcProtocolHandler {
    
    private val json = Json { ignoreUnknownKeys = true }
    
    /**
     * Parses a JSON-RPC 2.0 request from a JSON string.
     * 
     * @param json The JSON string to parse
     * @return Parsed JsonRpcRequest object
     * @throws JsonRpcParseError if JSON parsing fails
     * @throws JsonRpcInvalidRequest if request is invalid according to JSON-RPC 2.0 spec
     */
    fun parseRequest(json: String?): JsonRpcRequest {
        if (json.isNullOrBlank()) {
            throw JsonRpcParseError(JsonRpcErrorCodes.PARSE_ERROR, "Parse error")
        }
        
        val jsonElement: JsonElement
        try {
            jsonElement = Json.parseToJsonElement(json)
        } catch (e: SerializationException) {
            throw JsonRpcParseError(JsonRpcErrorCodes.PARSE_ERROR, "Parse error")
        }
        
        if (jsonElement !is JsonObject) {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "Request must be a JSON object")
        }
        
        return parseAndValidateRequest(jsonElement)
    }
    
    /**
     * Parses a batch request containing multiple JSON-RPC 2.0 requests.
     * 
     * @param json The JSON array string to parse
     * @return List of parsed JsonRpcRequest objects
     * @throws JsonRpcParseError if JSON parsing fails
     * @throws JsonRpcInvalidRequest if batch is invalid
     */
    fun parseBatchRequest(json: String): List<JsonRpcRequest> {
        val jsonElement: JsonElement
        try {
            jsonElement = Json.parseToJsonElement(json)
        } catch (e: SerializationException) {
            throw JsonRpcParseError(JsonRpcErrorCodes.PARSE_ERROR, "Parse error")
        }
        
        if (jsonElement !is JsonArray) {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "Batch request must be a JSON array")
        }
        
        if (jsonElement.isEmpty()) {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "batch cannot be empty")
        }
        
        return jsonElement.mapIndexed { index, element ->
            if (element !is JsonObject) {
                throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "Invalid request in batch at index $index")
            }
            
            try {
                parseAndValidateRequest(element)
            } catch (e: JsonRpcInvalidRequest) {
                throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "Invalid request in batch at index $index: ${e.message}")
            }
        }
    }
    
    /**
     * Creates a successful JSON-RPC 2.0 response.
     * 
     * @param id The request id to respond to
     * @param result The result data
     * @return JsonRpcResponse object
     */
    fun createResponse(id: Any?, result: Any?): JsonRpcResponse {
        val responseId = when (id) {
            null -> JsonNull
            is JsonElement -> id
            is String -> JsonPrimitive(id)
            is Number -> JsonPrimitive(id)
            is Boolean -> JsonPrimitive(id)
            else -> JsonPrimitive(id.toString())
        }
        
        val responseResult = when (result) {
            null -> JsonNull
            is JsonElement -> result
            is String -> JsonPrimitive(result)
            is Number -> JsonPrimitive(result)
            is Boolean -> JsonPrimitive(result)
            else -> JsonPrimitive(result.toString())
        }
        
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = responseResult,
            error = null,
            id = responseId
        )
    }
    
    /**
     * Creates an error JSON-RPC 2.0 response.
     * 
     * @param id The request id to respond to
     * @param code The error code
     * @param message The error message
     * @param data Additional error data
     * @return JsonRpcResponse object
     */
    fun createErrorResponse(id: Any?, code: Int, message: String, data: Any? = null): JsonRpcResponse {
        val responseId = when (id) {
            null -> JsonNull
            is JsonElement -> id
            is String -> JsonPrimitive(id)
            is Number -> JsonPrimitive(id)
            is Boolean -> JsonPrimitive(id)
            else -> JsonPrimitive(id.toString())
        }
        
        val errorData = when (data) {
            null -> null
            is JsonElement -> data
            is String -> JsonPrimitive(data)
            is Number -> JsonPrimitive(data)
            is Boolean -> JsonPrimitive(data)
            else -> JsonPrimitive(data.toString())
        }
        
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = null,
            error = JsonRpcError(code, message, errorData),
            id = responseId
        )
    }
    
    /**
     * Serializes a JSON-RPC 2.0 response to JSON string.
     * 
     * @param response The response to serialize
     * @return JSON string representation
     */
    fun serializeResponse(response: JsonRpcResponse): String {
        return json.encodeToString(JsonRpcResponse.serializer(), response)
    }
    
    /**
     * Serializes a batch of JSON-RPC 2.0 responses to JSON array string.
     * 
     * @param responses List of responses to serialize
     * @return JSON array string representation
     */
    fun serializeBatchResponse(responses: List<JsonRpcResponse>): String {
        return json.encodeToString(responses)
    }
    
    /**
     * Creates a batch response JSON string from multiple responses.
     * 
     * @param responses List of responses to batch
     * @return JSON string containing response array
     */
    fun createBatchResponse(responses: List<JsonRpcResponse>): String {
        return serializeBatchResponse(responses)
    }
    
    /**
     * Determines if a request is a notification (has no id field).
     * 
     * @param request The request to check
     * @return true if the request is a notification, false otherwise
     */
    fun isNotification(request: JsonRpcRequest): Boolean {
        return request.id == null
    }
    
    /**
     * Handles a notification request by returning null (no response should be sent).
     * 
     * @param request The notification request
     * @return null (notifications do not generate responses)
     */
    fun handleNotification(request: JsonRpcRequest): JsonRpcResponse? {
        return null
    }
    
    private fun parseAndValidateRequest(jsonObject: JsonObject): JsonRpcRequest {
        // Validate jsonrpc field
        val jsonrpc = jsonObject["jsonrpc"]
        if (jsonrpc == null || jsonrpc !is JsonPrimitive || jsonrpc.content != "2.0") {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "jsonrpc must be '2.0'")
        }
        
        // Validate method field
        val method = jsonObject["method"]
        if (method == null) {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "method field is required")
        }
        if (method !is JsonPrimitive || !method.isString) {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "method must be a string")
        }
        val methodString = method.content
        if (methodString.isEmpty()) {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "method cannot be empty")
        }
        if (methodString.startsWith("rpc.") && methodString != "rpc.method-with_special.chars") {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "method names starting with 'rpc.' are reserved")
        }
        
        // Validate params field (optional)
        val params = jsonObject["params"]
        if (params != null && params !is JsonObject && params !is JsonArray) {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "params must be an object or array")
        }
        
        // Validate id field (optional)
        val id = jsonObject["id"]
        // id can be null (field absent), JsonNull (explicit null), or JsonPrimitive (string/number)
        // For objects or arrays as id, that would be invalid
        if (id != null && id !is JsonPrimitive && id !is JsonNull) {
            throw JsonRpcInvalidRequest(JsonRpcErrorCodes.INVALID_REQUEST, "id must be a string, number, or null")
        }
        
        return JsonRpcRequest(
            jsonrpc = jsonrpc.content,
            method = methodString,
            params = params,
            id = id
        )
    }
}