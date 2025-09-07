package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Represents a JSON-RPC 2.0 error object.
 * 
 * Error objects provide structured information about why a request failed.
 * The code field uses predefined values for common errors, with ranges
 * reserved for implementation-specific errors.
 * 
 * Error code ranges:
 * - -32768 to -32000: Reserved for pre-defined errors
 * - -32000 to -32099: Reserved for implementation-defined server errors
 * - Other codes: Available for application-defined errors
 * 
 * Example:
 * ```json
 * {
 *   "code": -32601,
 *   "message": "Method not found",
 *   "data": "The method 'unknownMethod' does not exist"
 * }
 * ```
 * 
 * @property code A number indicating the error type. Use JsonRpcErrorCodes constants for standard errors.
 * @property message A short description of the error. Should be limited to a concise single sentence.
 * @property data Optional additional information about the error. Can be any JSON value.
 * 
 * @see JsonRpcErrorCodes for standard error code constants
 * @see JsonRpcResponse which contains error objects
 * @see <a href="https://www.jsonrpc.org/specification#error_object">JSON-RPC 2.0 Error Object</a>
 */
@Serializable
data class JsonRpcError(
    val code: Int,
    val message: String,
    val data: JsonElement? = null
)