package io.spiralhouse.cycletime.mcp.tools

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * Asynchronous tool variant that supports suspend functions.
 * 
 * AsyncTools can perform long-running operations using Kotlin coroutines
 * and support timeout handling.
 */
data class AsyncTool(
    val name: String,
    val description: String, 
    val parametersSchema: JsonObject,
    val handler: suspend (JsonElement) -> Result<JsonElement>
) {
    init {
        require(name.matches(Regex("^[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*)*$"))) {
            "Tool name must be lowercase with optional dots for namespacing: $name"
        }
    }

    suspend fun handlerAsync(params: JsonElement): Result<JsonElement> = handler(params)
}