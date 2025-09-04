package io.spiralhouse.cycletime.mcp.protocol

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Represents a JSON-RPC 2.0 error object.
 * 
 * @param code A Number that indicates the error type that occurred.
 * @param message A String providing a short description of the error.
 * @param data A Primitive or Structured value that contains additional information about the error.
 */
@Serializable
data class JsonRpcError(
    val code: Int,
    val message: String,
    val data: JsonElement? = null
)