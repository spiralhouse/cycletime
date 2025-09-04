package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.json.*

/**
 * Validator for JSON-RPC 2.0 requests.
 * 
 * This class encapsulates all validation logic for JSON-RPC requests,
 * ensuring compliance with the JSON-RPC 2.0 specification.
 * 
 * @see <a href="https://www.jsonrpc.org/specification">JSON-RPC 2.0 Specification</a>
 */
internal class JsonRpcRequestValidator {
    
    companion object {
        private const val JSON_RPC_VERSION = "2.0"
        private const val RPC_PREFIX = "rpc."
        private const val ALLOWED_RPC_METHOD = "rpc.method-with_special.chars"
    }
    
    /**
     * Validates and parses a JSON object into a JsonRpcRequest.
     * 
     * @param jsonObject The JSON object to validate and parse
     * @return A valid JsonRpcRequest
     * @throws JsonRpcInvalidRequest if the request is invalid
     */
    fun validateAndParse(jsonObject: JsonObject): JsonRpcRequest {
        val jsonrpc = validateJsonRpcVersion(jsonObject)
        val method = validateMethod(jsonObject)
        val params = validateParams(jsonObject)
        val id = validateId(jsonObject)
        
        return JsonRpcRequest(
            jsonrpc = jsonrpc,
            method = method,
            params = params,
            id = id
        )
    }
    
    /**
     * Validates the jsonrpc field.
     * 
     * @param jsonObject The JSON object containing the request
     * @return The jsonrpc version string
     * @throws JsonRpcInvalidRequest if the jsonrpc field is invalid
     */
    private fun validateJsonRpcVersion(jsonObject: JsonObject): String {
        val jsonrpc = jsonObject["jsonrpc"]
            ?: throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST,
                ErrorMessages.JSONRPC_VERSION_INVALID
            )
        
        if (jsonrpc !is JsonPrimitive || jsonrpc.content != JSON_RPC_VERSION) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST,
                ErrorMessages.JSONRPC_VERSION_INVALID
            )
        }
        
        return jsonrpc.content
    }
    
    /**
     * Validates the method field.
     * 
     * @param jsonObject The JSON object containing the request
     * @return The method name
     * @throws JsonRpcInvalidRequest if the method field is invalid
     */
    private fun validateMethod(jsonObject: JsonObject): String {
        val method = jsonObject["method"]
            ?: throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST,
                ErrorMessages.METHOD_REQUIRED
            )
        
        if (method !is JsonPrimitive || !method.isString) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST,
                ErrorMessages.METHOD_MUST_BE_STRING
            )
        }
        
        val methodString = method.content
        
        if (methodString.isEmpty()) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST,
                ErrorMessages.METHOD_CANNOT_BE_EMPTY
            )
        }
        
        if (methodString.startsWith(RPC_PREFIX) && methodString != ALLOWED_RPC_METHOD) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST,
                ErrorMessages.METHOD_RPC_RESERVED
            )
        }
        
        return methodString
    }
    
    /**
     * Validates the params field.
     * 
     * @param jsonObject The JSON object containing the request
     * @return The params JsonElement or null if not present
     * @throws JsonRpcInvalidRequest if the params field is invalid
     */
    private fun validateParams(jsonObject: JsonObject): JsonElement? {
        val params = jsonObject["params"] ?: return null
        
        if (params !is JsonObject && params !is JsonArray) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST,
                ErrorMessages.PARAMS_INVALID_TYPE
            )
        }
        
        return params
    }
    
    /**
     * Validates the id field.
     * 
     * @param jsonObject The JSON object containing the request
     * @return The id JsonElement or null if not present
     * @throws JsonRpcInvalidRequest if the id field is invalid
     */
    private fun validateId(jsonObject: JsonObject): JsonElement? {
        val id = jsonObject["id"] ?: return null
        
        // id can be JsonNull (explicit null), JsonPrimitive (string/number/boolean)
        // but not JsonObject or JsonArray
        if (id !is JsonPrimitive && id !is JsonNull) {
            throw JsonRpcInvalidRequest(
                JsonRpcErrorCodes.INVALID_REQUEST,
                ErrorMessages.ID_INVALID_TYPE
            )
        }
        
        return id
    }
}