package io.spiralhouse.cycletime.mcp.tools

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * Base interface for synchronous tools in the MCP Tool Registration System.
 * 
 * Tools are registered components that can be invoked with parameters to perform
 * specific operations and return JSON results.
 */
data class Tool(
    val name: String,
    val description: String,
    val parametersSchema: JsonObject,
    val handler: (JsonElement) -> Result<JsonElement>
) {
    init {
        require(name.matches(Regex("^[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*)*$"))) {
            "Tool name must be lowercase with optional dots for namespacing: $name"
        }
    }
}