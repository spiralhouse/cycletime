package io.spiralhouse.cycletime.mcp.handlers

import kotlinx.serialization.json.Json

/**
 * WebSocket handler for MCP protocol communication.
 */
interface WebSocketHandler {
    val protocolVersion: String
    val serializer: Json
    val supportedCapabilities: Set<String>
}

/**
 * Default WebSocket handler implementation.
 */
class DefaultWebSocketHandler(
    override val protocolVersion: String = "2024-11-05",
    override val serializer: Json = Json { 
        prettyPrint = true
        isLenient = true 
        ignoreUnknownKeys = true
    },
    override val supportedCapabilities: Set<String> = setOf("resources", "tools", "prompts")
) : WebSocketHandler