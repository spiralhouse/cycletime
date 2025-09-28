package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcErrorCodes
import io.spiralhouse.cycletime.mcp.tools.exceptions.JsonRpcException
import kotlinx.serialization.json.*

/**
 * Interface for handling MCP JSON-RPC tool-related requests.
 *
 * This interface provides protocol-specific handling for tool operations,
 * separating JSON-RPC concerns from core tool registry functionality.
 */
interface McpToolHandler {
    /**
     * Handle JSON-RPC method calls for tool operations.
     *
     * @param method The JSON-RPC method name
     * @param params The JSON-RPC parameters
     * @return Result containing the JSON response or error
     */
    suspend fun handleJsonRpcMethod(method: String, params: JsonElement): Result<JsonElement>
}

/**
 * Default implementation of McpToolHandler that delegates to a ToolRegistry.
 *
 * This class handles the JSON-RPC protocol specifics for tool operations,
 * including method routing, parameter validation, and response formatting.
 *
 * @param toolRegistry The underlying tool registry for actual tool operations
 */
class DefaultMcpToolHandler(
    private val toolRegistry: ToolRegistry
) : McpToolHandler {

    override suspend fun handleJsonRpcMethod(method: String, params: JsonElement): Result<JsonElement> {
        return when (method) {
            "tools/list" -> handleToolsList()
            "tools/call" -> handleToolsCall(params)
            else -> Result.failure(
                JsonRpcException(
                    code = -32601, // Method not found
                    message = "Method not found: $method"
                )
            )
        }
    }

    private fun handleToolsList(): Result<JsonElement> {
        val metadata = toolRegistry.getAllToolMetadata()
        val tools = metadata.map { tool ->
            buildJsonObject {
                put("name", tool.name)
                put("description", tool.description)
                put("inputSchema", tool.parametersSchema)
            }
        }

        return Result.success(buildJsonObject {
            put("tools", JsonArray(tools))
        })
    }

    private suspend fun handleToolsCall(params: JsonElement): Result<JsonElement> {
        if (params !is JsonObject) {
            return Result.failure(
                JsonRpcException(
                    code = -32602, // Invalid params
                    message = "Invalid parameters: expected object"
                )
            )
        }

        val toolName = params["name"]?.jsonPrimitive?.content
            ?: return Result.failure(
                JsonRpcException(
                    code = -32602, // Invalid params
                    message = "Missing required parameter: name"
                )
            )

        val arguments = params["arguments"] ?: JsonObject(emptyMap())

        // Check if tool exists and invoke based on its handler type
        val tool = toolRegistry.getTool(toolName) ?: return Result.failure(
            JsonRpcException(
                code = -32601, // Method not found
                message = "Tool not found: $toolName"
            )
        )

        val result = if (tool.isSync) {
            toolRegistry.invoke(toolName, arguments)
        } else {
            // Handle async tools with configurable timeout
            try {
                toolRegistry.invokeAsync(toolName, arguments, timeout = 10000L)
            } catch (e: Exception) {
                Result.failure(
                    JsonRpcException(
                        code = -32603,
                        message = "Async tool execution failed: ${e.message}"
                    )
                )
            }
        }

        return result.fold(
            onSuccess = { value ->
                val textValue = when {
                    value is JsonPrimitive && value.isString -> value.content
                    value is JsonPrimitive && value.isString.not() -> value.content
                    value is JsonObject -> {
                        // Handle domain object responses - convert to pretty JSON string
                        Json { prettyPrint = true }.encodeToString(value)
                    }
                    value is JsonArray -> {
                        // Handle array responses - convert to pretty JSON string
                        Json { prettyPrint = true }.encodeToString(value)
                    }
                    else -> value.toString().trim('"')
                }
                Result.success(buildJsonObject {
                    put("content", buildJsonArray {
                        add(buildJsonObject {
                            put("type", "text")
                            put("text", textValue)
                        })
                    })
                })
            },
            onFailure = { error ->
                Result.failure(
                    JsonRpcException(
                        code = JsonRpcErrorCodes.INTERNAL_ERROR,
                        message = error.message ?: "Tool execution failed",
                        data = null
                    )
                )
            }
        )
    }
}