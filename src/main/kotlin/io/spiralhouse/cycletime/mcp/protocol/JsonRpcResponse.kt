package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Represents a JSON-RPC 2.0 response object.
 * 
 * A response is sent for every request that has an id (non-notifications).
 * The response must contain either a result or an error, but never both.
 * 
 * Success response example:
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "result": {"status": "initialized"},
 *   "id": 1
 * }
 * ```
 * 
 * Error response example:
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "error": {"code": -32601, "message": "Method not found"},
 *   "id": 1
 * }
 * ```
 * 
 * @property jsonrpc The JSON-RPC protocol version. Must be exactly "2.0".
 * @property result The successful result of the method invocation. Must be null if error is present.
 * @property error The error object if the method invocation failed. Must be null if result is present.
 * @property id The same id as the request it is responding to. Can be null for parse errors.
 * 
 * @see JsonRpcRequest for the corresponding request structure
 * @see JsonRpcError for error object structure
 * @see <a href="https://www.jsonrpc.org/specification#response_object">JSON-RPC 2.0 Response Object</a>
 */
@Serializable
data class JsonRpcResponse(
    val jsonrpc: String,
    val result: JsonElement? = null,
    val error: JsonRpcError? = null,
    val id: JsonElement
)