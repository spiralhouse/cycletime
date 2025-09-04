package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Represents a JSON-RPC 2.0 request object.
 * 
 * This data class encapsulates all components of a JSON-RPC request as defined
 * in the specification. Requests can be either regular method calls (with an id)
 * or notifications (without an id).
 * 
 * Example JSON representation:
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "initialize",
 *   "params": {"clientInfo": {"name": "example"}},
 *   "id": 1
 * }
 * ```
 * 
 * @property jsonrpc The JSON-RPC protocol version. Must be exactly "2.0".
 * @property method The name of the method to be invoked. Cannot be empty or start with "rpc." (reserved).
 * @property params Optional structured parameters for the method. Can be object or array.
 * @property id Optional request identifier. If null, the request is a notification.
 * 
 * @see JsonRpcResponse for the corresponding response structure
 * @see <a href="https://www.jsonrpc.org/specification#request_object">JSON-RPC 2.0 Request Object</a>
 */
@Serializable
data class JsonRpcRequest(
    val jsonrpc: String,
    val method: String,
    val params: JsonElement? = null,
    val id: JsonElement? = null
)