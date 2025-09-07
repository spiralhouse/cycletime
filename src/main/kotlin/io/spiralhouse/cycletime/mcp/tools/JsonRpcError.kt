package io.spiralhouse.cycletime.mcp.tools

import kotlinx.serialization.json.JsonObject

/**
 * JSON-RPC error response structure.
 */
data class JsonRpcError(
    val code: Int,
    val message: String,
    val data: JsonObject? = null
)