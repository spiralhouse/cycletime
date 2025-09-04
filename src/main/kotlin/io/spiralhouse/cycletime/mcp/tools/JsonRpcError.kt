package io.spiralhouse.cycletime.mcp.tools

import kotlinx.serialization.json.JsonElement

/**
 * JSON-RPC error response structure.
 */
data class JsonRpcError(
    val code: Int,
    val message: String,
    val data: JsonElement? = null
)