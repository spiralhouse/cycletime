package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Represents a JSON-RPC 2.0 response object.
 * 
 * @param jsonrpc A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
 * @param result The result of the method invocation. MUST be null if there was an error.
 * @param error The error object if the method invocation failed. MUST be null if successful.
 * @param id The same id as the request it is responding to.
 */
@Serializable
data class JsonRpcResponse(
    val jsonrpc: String,
    val result: JsonElement? = null,
    val error: JsonRpcError? = null,
    val id: JsonElement
)