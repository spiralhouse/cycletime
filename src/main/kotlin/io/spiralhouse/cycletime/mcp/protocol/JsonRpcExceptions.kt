package io.spiralhouse.cycletime.mcp.protocol

/**
 * Exception thrown when JSON parsing fails.
 * 
 * This exception is used when the received data cannot be parsed as valid JSON.
 * Common causes include:
 * - Malformed JSON syntax
 * - Unexpected end of input
 * - Invalid character encoding
 * - Empty or null input
 * 
 * @property code The error code to use in the JSON-RPC error response (always PARSE_ERROR: -32700)
 * @property message Human-readable error message describing the parse failure
 * 
 * @see JsonRpcErrorCodes.PARSE_ERROR
 */
class JsonRpcParseError(
    val code: Int = JsonRpcErrorCodes.PARSE_ERROR,
    message: String = ErrorMessages.PARSE_ERROR
) : Exception(message)

/**
 * Exception thrown when a request is invalid according to JSON-RPC 2.0 specification.
 * 
 * This exception indicates that while the JSON was valid, the request structure
 * does not conform to JSON-RPC 2.0 requirements. Common causes include:
 * - Missing or invalid jsonrpc version field
 * - Missing or invalid method field  
 * - Invalid parameter structure
 * - Invalid id field type
 * - Empty batch requests
 * 
 * @property code The error code to use in the JSON-RPC error response (always INVALID_REQUEST: -32600)
 * @property message Human-readable error message describing why the request is invalid
 * 
 * @see JsonRpcErrorCodes.INVALID_REQUEST
 */
class JsonRpcInvalidRequest(
    val code: Int = JsonRpcErrorCodes.INVALID_REQUEST,
    message: String = ErrorMessages.INVALID_REQUEST
) : Exception(message)