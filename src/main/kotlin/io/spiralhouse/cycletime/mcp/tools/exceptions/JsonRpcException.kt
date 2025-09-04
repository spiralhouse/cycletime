package io.spiralhouse.cycletime.mcp.tools.exceptions

import kotlinx.serialization.json.JsonElement

/**
 * Exception for JSON-RPC protocol errors.
 */
class JsonRpcException(
    val code: Int,
    message: String,
    val data: JsonElement? = null
) : Exception(message)