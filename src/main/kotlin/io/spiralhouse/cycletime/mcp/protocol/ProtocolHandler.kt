package io.spiralhouse.cycletime.mcp.protocol

/**
 * Interface for protocol handlers that process requests and generate responses.
 * 
 * This interface defines the contract for JSON-RPC 2.0 protocol handlers,
 * allowing for different implementations and future extensibility for
 * other protocol versions or custom extensions.
 * 
 * @see JsonRpcProtocolHandler for the standard JSON-RPC 2.0 implementation
 */
interface ProtocolHandler {
    
    /**
     * Parses a single request from a JSON string.
     * 
     * @param json The JSON string to parse
     * @return Parsed request object
     * @throws JsonRpcParseError if JSON parsing fails
     * @throws JsonRpcInvalidRequest if request is invalid
     */
    fun parseRequest(json: String?): JsonRpcRequest
    
    /**
     * Parses a batch request containing multiple requests.
     * 
     * @param json The JSON array string to parse
     * @return List of parsed request objects
     * @throws JsonRpcParseError if JSON parsing fails
     * @throws JsonRpcInvalidRequest if batch is invalid
     */
    fun parseBatchRequest(json: String): List<JsonRpcRequest>
    
    /**
     * Creates a successful response.
     * 
     * @param id The request id to respond to
     * @param result The result data
     * @return Response object
     */
    fun createResponse(id: Any?, result: Any?): JsonRpcResponse
    
    /**
     * Creates an error response.
     * 
     * @param id The request id to respond to
     * @param code The error code
     * @param message The error message
     * @param data Additional error data
     * @return Response object
     */
    fun createErrorResponse(id: Any?, code: Int, message: String, data: Any? = null): JsonRpcResponse
    
    /**
     * Serializes a response to JSON string.
     * 
     * @param response The response to serialize
     * @return JSON string representation
     */
    fun serializeResponse(response: JsonRpcResponse): String
    
    /**
     * Serializes a batch of responses to JSON array string.
     * 
     * @param responses List of responses to serialize
     * @return JSON array string representation
     */
    fun serializeBatchResponse(responses: List<JsonRpcResponse>): String
    
    /**
     * Creates a batch response JSON string from multiple responses.
     * 
     * @param responses List of responses to batch
     * @return JSON string containing response array
     */
    fun createBatchResponse(responses: List<JsonRpcResponse>): String
    
    /**
     * Determines if a request is a notification (has no id field).
     * 
     * @param request The request to check
     * @return true if the request is a notification, false otherwise
     */
    fun isNotification(request: JsonRpcRequest): Boolean
    
    /**
     * Handles a notification request.
     * 
     * @param request The notification request
     * @return null for notifications (no response should be sent)
     */
    fun handleNotification(request: JsonRpcRequest): JsonRpcResponse?
}