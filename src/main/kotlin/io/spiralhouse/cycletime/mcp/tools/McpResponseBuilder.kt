package io.spiralhouse.cycletime.mcp.tools

import kotlinx.serialization.json.*

/**
 * Utility object for building standardized MCP response formats.
 * 
 * Centralizes MCP response format construction to eliminate scattered 
 * buildJsonObject patterns across tool providers.
 */
object McpResponseBuilder {
    
    /**
     * Creates a text response with the standard MCP content structure.
     * 
     * @param text The text content to include in the response
     * @return JsonObject with proper MCP text response format
     */
    fun textResponse(text: String): JsonObject = buildJsonObject {
        put("content", buildJsonArray {
            add(buildJsonObject {
                put("type", "text")
                put("text", text)
            })
        })
    }
    
    /**
     * Creates a JSON response with the standard MCP content structure.
     * 
     * @param jsonContent The JSON content as a string
     * @return JsonObject with proper MCP text response format containing JSON
     */
    fun jsonResponse(jsonContent: String): JsonObject = buildJsonObject {
        put("content", buildJsonArray {
            add(buildJsonObject {
                put("type", "text")
                put("text", jsonContent)
            })
        })
    }
    
    /**
     * Creates a response from any serializable object.
     * 
     * @param data The object to serialize and include in the response
     * @return JsonObject with proper MCP text response format containing the serialized object
     */
    inline fun <reified T> objectResponse(data: T): JsonObject = buildJsonObject {
        put("content", buildJsonArray {
            add(buildJsonObject {
                put("type", "text")  
                put("text", kotlinx.serialization.json.Json.encodeToString(data))
            })
        })
    }
}