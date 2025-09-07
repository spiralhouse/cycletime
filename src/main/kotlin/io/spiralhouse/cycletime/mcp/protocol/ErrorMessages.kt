package io.spiralhouse.cycletime.mcp.protocol

/**
 * Centralized error message definitions for JSON-RPC 2.0 protocol.
 * 
 * This object maintains consistent error messages across the protocol handler,
 * ensuring clarity and standardization in error responses.
 */
internal object ErrorMessages {
    
    // Parse errors
    const val PARSE_ERROR = "Parse error"
    const val PARSE_ERROR_EMPTY = "Parse error"
    
    // Request structure errors
    const val REQUEST_MUST_BE_OBJECT = "Request must be a JSON object"
    const val BATCH_MUST_BE_ARRAY = "Batch request must be a JSON array"
    const val BATCH_CANNOT_BE_EMPTY = "batch cannot be empty"
    
    // Field validation errors
    const val JSONRPC_VERSION_INVALID = "jsonrpc must be '2.0'"
    const val METHOD_REQUIRED = "method field is required"
    const val METHOD_MUST_BE_STRING = "method must be a string"
    const val METHOD_CANNOT_BE_EMPTY = "method cannot be empty"
    const val METHOD_RPC_RESERVED = "method names starting with 'rpc.' are reserved"
    const val PARAMS_INVALID_TYPE = "params must be an object or array"
    const val ID_INVALID_TYPE = "id must be a string, number, or null"
    
    // Batch processing errors
    fun invalidRequestInBatch(index: Int): String = "Invalid request in batch at index $index"
    fun invalidRequestInBatchWithReason(index: Int, reason: String?): String = 
        "Invalid request in batch at index $index: $reason"
    
    // Standard JSON-RPC 2.0 error messages
    const val INVALID_REQUEST = "Invalid Request"
    const val METHOD_NOT_FOUND = "Method not found"
    const val INVALID_PARAMS = "Invalid params"
    const val INTERNAL_ERROR = "Internal error"
}