package io.spiralhouse.cycletime.mcp.server.handlers

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.tools.DefaultToolRegistry
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import kotlinx.serialization.json.*

/**
 * Interface for handling MCP method calls.
 * 
 * This interface defines the contract for processing MCP protocol methods,
 * including initialization, tool operations, and resource management.
 * Implementations should follow the Single Responsibility Principle by
 * focusing solely on method routing and delegation.
 */
interface McpMethodHandler {
    /**
     * Handles a synchronous JSON-RPC request.
     * 
     * @param request The JSON-RPC request to handle
     * @return The JSON-RPC response
     */
    suspend fun handleRequest(request: JsonRpcRequest): JsonRpcResponse
    
    /**
     * Handles an asynchronous JSON-RPC request.
     * This method supports long-running operations like async tool invocation.
     * 
     * @param request The JSON-RPC request to handle
     * @return The JSON-RPC response
     */
    suspend fun handleRequestAsync(request: JsonRpcRequest): JsonRpcResponse
    
    /**
     * Handles a JSON-RPC notification (no response expected).
     * 
     * @param request The notification request
     */
    suspend fun handleNotification(request: JsonRpcRequest)
}

/**
 * Default implementation of McpMethodHandler.
 * 
 * This handler processes MCP protocol methods by delegating to appropriate
 * registries and components. It maintains a clean separation between
 * protocol handling, method routing, and actual execution.
 * 
 * @property protocolHandler Handler for JSON-RPC protocol operations
 * @property toolRegistry Registry for tool management and invocation
 * @property resourceRegistry Registry for resource provider management
 */
class DefaultMcpMethodHandler(
    private val protocolHandler: JsonRpcProtocolHandler,
    private val toolRegistry: DefaultToolRegistry,
    private val resourceRegistry: ResourceProviderRegistry
) : McpMethodHandler {
    
    override suspend fun handleRequest(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            when (request.method) {
                "initialize" -> handleInitialize(request)
                "tools/list" -> handleToolsList(request)
                "tools/call" -> handleToolsCall(request, async = false)
                "resources/list" -> handleResourcesList(request)
                else -> createMethodNotFoundError(request)
            }
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    override suspend fun handleRequestAsync(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            when (request.method) {
                "initialize" -> handleInitialize(request)
                "tools/list" -> handleToolsList(request)
                "tools/call" -> handleToolsCall(request, async = true)
                "resources/list" -> handleResourcesList(request)
                else -> createMethodNotFoundError(request)
            }
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    override suspend fun handleNotification(request: JsonRpcRequest) {
        // Process notifications without generating responses
        when (request.method) {
            "notifications/message" -> handleMessageNotification(request)
            "notifications/progress" -> handleProgressNotification(request)
            // Add other notification handlers as needed
        }
    }
    
    // ===== Method Handlers =====
    
    private fun handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
        val result = buildJsonObject {
            put("protocolVersion", "2024-11-05")
            put("capabilities", buildCapabilities())
            put("serverInfo", buildServerInfo())
        }
        
        return protocolHandler.createResponse(request.id, result)
    }
    
    private fun handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
        val metadata = toolRegistry.getAllToolMetadata()
        val tools = metadata.map { tool ->
            buildJsonObject {
                put("name", tool.name)
                put("description", tool.description)
                put("inputSchema", tool.parametersSchema)
            }
        }
        
        val result = buildJsonObject {
            put("tools", JsonArray(tools))
        }
        
        return protocolHandler.createResponse(request.id, result)
    }
    
    private suspend fun handleToolsCall(
        request: JsonRpcRequest, 
        async: Boolean
    ): JsonRpcResponse {
        val params = request.params as? JsonObject
            ?: return createInvalidParamsError(request, "Expected object parameters")
        
        val toolName = params["name"]?.jsonPrimitive?.content
            ?: return createInvalidParamsError(request, "Missing tool name")
        
        val arguments = params["arguments"] ?: JsonObject(emptyMap())
        
        // Check if it's an async tool
        val isAsyncTool = toolRegistry.getAsyncTool(toolName) != null
        
        val result = if (isAsyncTool && async) {
            // Invoke async tool with timeout
            val timeout = params["timeout"]?.jsonPrimitive?.longOrNull 
                ?: 60000L // Default 60 seconds
            toolRegistry.invokeAsync(toolName, arguments, timeout)
        } else if (!isAsyncTool) {
            // Invoke sync tool
            toolRegistry.invoke(toolName, arguments)
        } else {
            // Async tool called synchronously - not supported
            return createInvalidParamsError(
                request, 
                "Async tool '$toolName' requires async invocation"
            )
        }
        
        return result.fold(
            onSuccess = { value ->
                val responseData = formatToolResponse(value)
                protocolHandler.createResponse(request.id, responseData)
            },
            onFailure = { error ->
                createToolError(request, error)
            }
        )
    }
    
    private suspend fun handleResourcesList(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            val allResources = mutableListOf<JsonObject>()
            
            for (provider in resourceRegistry.getProviders()) {
                val resources = provider.listResources()
                for (resource in resources) {
                    allResources.add(buildJsonObject {
                        put("uri", resource.uri)
                        put("name", resource.name)
                        resource.description?.let { put("description", it) }
                        put("mimeType", resource.mimeType)
                    })
                }
            }
            
            val result = buildJsonObject {
                put("resources", JsonArray(allResources))
            }
            
            protocolHandler.createResponse(request.id, result)
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    // ===== Notification Handlers =====
    
    private fun handleMessageNotification(request: JsonRpcRequest) {
        // Log or process message notifications
        // In a real implementation, this might forward to a logging system
    }
    
    private fun handleProgressNotification(request: JsonRpcRequest) {
        // Handle progress updates
        // In a real implementation, this might update a progress tracker
    }
    
    // ===== Helper Methods =====
    
    private fun buildCapabilities(): JsonObject {
        return buildJsonObject {
            put("logging", buildJsonObject {})
            put("prompts", buildJsonObject {
                put("listChanged", false)
            })
            put("resources", buildJsonObject {
                put("subscribe", false)
                put("listChanged", false)
            })
            put("tools", buildJsonObject {
                put("listChanged", false)
            })
        }
    }
    
    private fun buildServerInfo(): JsonObject {
        return buildJsonObject {
            put("name", "CycleTime MCP Server")
            put("version", "1.0.0")
        }
    }
    
    private fun formatToolResponse(value: JsonElement): JsonObject {
        val textValue = when {
            value is JsonPrimitive && value.isString -> value.content
            else -> value.toString().trim('"')
        }
        
        return buildJsonObject {
            put("content", buildJsonArray {
                add(buildJsonObject {
                    put("type", "text")
                    put("text", textValue)
                })
            })
        }
    }
    
    // ===== Error Response Helpers =====
    
    private fun createMethodNotFoundError(request: JsonRpcRequest): JsonRpcResponse {
        return protocolHandler.createErrorResponse(
            id = request.id,
            code = -32601,
            message = "Method not found: ${request.method}",
            data = null
        )
    }
    
    private fun createInvalidParamsError(
        request: JsonRpcRequest, 
        message: String
    ): JsonRpcResponse {
        return protocolHandler.createErrorResponse(
            id = request.id,
            code = -32602,
            message = message,
            data = null
        )
    }
    
    private fun createInternalError(
        request: JsonRpcRequest, 
        error: Exception
    ): JsonRpcResponse {
        return protocolHandler.createErrorResponse(
            id = request.id,
            code = -32603,
            message = error.message ?: "Internal error",
            data = buildJsonObject {
                put("exception", error.javaClass.simpleName)
                error.stackTrace.firstOrNull()?.let { frame ->
                    put("location", "${frame.className}.${frame.methodName}:${frame.lineNumber}")
                }
            }
        )
    }
    
    private fun createToolError(
        request: JsonRpcRequest, 
        error: Throwable
    ): JsonRpcResponse {
        val errorInfo = toolRegistry.formatErrorForJsonRpc(error)
        return protocolHandler.createErrorResponse(
            id = request.id,
            code = errorInfo.code,
            message = errorInfo.message,
            data = errorInfo.data
        )
    }
}