package io.spiralhouse.cycletime.mcp.protocol

/**
 * Exception thrown when JSON parsing fails.
 */
class JsonRpcParseError(
    val code: Int = JsonRpcErrorCodes.PARSE_ERROR,
    message: String = "Parse error"
) : Exception(message)

/**
 * Exception thrown when a request is invalid according to JSON-RPC 2.0 specification.
 */
class JsonRpcInvalidRequest(
    val code: Int = JsonRpcErrorCodes.INVALID_REQUEST,
    message: String = "Invalid Request"
) : Exception(message)