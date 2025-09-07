package io.spiralhouse.cycletime.mcp.tools

import kotlinx.serialization.json.JsonObject

/**
 * Tool metadata that can be exposed to clients without revealing implementation details.
 * 
 * This class provides the publicly available information about a tool without
 * exposing the actual handler implementation.
 */
data class ToolMetadata(
    val name: String,
    val description: String,
    val parametersSchema: JsonObject
)