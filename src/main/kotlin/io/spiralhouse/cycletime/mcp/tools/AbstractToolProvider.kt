package io.spiralhouse.cycletime.mcp.tools

import kotlinx.serialization.json.*

/**
 * Abstract base class for tool providers that provides common helper methods
 * for MCP operations.
 * 
 * This class extracts the proven patterns from DefaultSessionToolProvider to eliminate
 * code duplication across all tool provider implementations.
 */
abstract class AbstractToolProvider : ToolProvider {
    
    /**
     * Creates a properly formatted MCP text response.
     * 
     * @param content The text content to include in the response
     * @return JsonObject with the standard MCP response structure
     */
    protected fun createMcpTextResponse(content: String): JsonObject = buildJsonObject {
        put("content", buildJsonArray {
            add(buildJsonObject {
                put("type", "text")
                put("text", content)
            })
        })
    }
    
    /**
     * Extracts a required parameter from the MCP params JsonElement.
     * 
     * @param params The JsonElement containing the parameters
     * @param key The parameter key to extract
     * @return The parameter value as a string
     * @throws IllegalArgumentException if the parameter is missing or null
     */
    protected fun extractRequiredParam(params: JsonElement, key: String): String {
        return params.jsonObject[key]?.jsonPrimitive?.content
            ?: throw IllegalArgumentException("$key is required")
    }
    
    /**
     * Extracts an optional parameter from the MCP params JsonElement.
     * 
     * @param params The JsonElement containing the parameters
     * @param key The parameter key to extract
     * @return The parameter value as a string, or null if not present
     */
    protected fun extractOptionalParam(params: JsonElement, key: String): String? {
        return params.jsonObject[key]?.jsonPrimitive?.contentOrNull
    }
    
    /**
     * Builds a required string parameter schema for MCP tool definitions.
     * 
     * @param description The parameter description
     * @return JsonObject representing a required string parameter schema
     */
    protected fun buildRequiredStringParam(description: String): JsonObject = buildJsonObject {
        put("type", "string")
        put("description", description)
    }
    
    /**
     * Builds an optional string parameter schema for MCP tool definitions.
     * 
     * @param description The parameter description
     * @return JsonObject representing an optional string parameter schema
     */
    protected fun buildOptionalStringParam(description: String): JsonObject = buildJsonObject {
        put("type", "string")
        put("description", description)
    }
    
    /**
     * Builds an empty object properties schema for MCP tools that take no parameters.
     * 
     * @return JsonObject representing an empty properties schema
     */
    protected fun buildEmptyPropertiesSchema(): JsonObject = buildJsonObject {
        put("type", "object")
        put("properties", buildJsonObject {})
    }
}