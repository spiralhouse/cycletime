package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Represents a JSON-RPC 2.0 request object.
 * 
 * @param jsonrpc A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
 * @param method A String containing the name of the method to be invoked.
 * @param params A Structured value that holds the parameter values to be used during the invocation of the method.
 * @param id An identifier established by the Client. If omitted, the request is a notification.
 */
@Serializable
data class JsonRpcRequest(
    val jsonrpc: String,
    val method: String,
    val params: JsonElement? = null,
    val id: JsonElement? = null
)