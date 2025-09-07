package io.spiralhouse.cycletime.mcp.server.handlers

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolRegistry
import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolInvoker
import io.spiralhouse.cycletime.mcp.resources.interfaces.ResourceRegistry
import io.spiralhouse.cycletime.mcp.server.state.ServerState
import io.spiralhouse.cycletime.mcp.tools.exceptions.*
import io.spiralhouse.cycletime.mcp.resources.exceptions.*
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
    private val toolRegistry: ToolRegistry,
    private val toolInvoker: ToolInvoker,
    private val resourceRegistry: ResourceRegistry,
    private val serverState: ServerState = ServerState()
) : McpMethodHandler {
    
    override suspend fun handleRequest(request: JsonRpcRequest): JsonRpcResponse {
        // Validate JSON-RPC protocol version
        if (request.jsonrpc != "2.0") {
            return createParseError(request)
        }
        
        // Ensure server is running
        if (!serverState.isRunning() && request.method != "initialize") {
            return protocolHandler.createErrorResponse(
                id = request.id,
                code = -32003,
                message = "Server not initialized",
                data = null
            )
        }
        
        return try {
            when (request.method) {
                "initialize" -> handleInitialize(request)
                "tools/list" -> handleToolsList(request)
                "tools/call" -> handleToolsCall(request, async = false)
                "resources/list" -> handleResourcesList(request)
                "resources/read" -> handleResourcesRead(request)
                "resources/subscribe" -> handleResourcesSubscribe(request)
                "resources/unsubscribe" -> handleResourcesUnsubscribe(request)
                "ping" -> handlePing(request)
                "shutdown" -> handleShutdown(request)
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
                "resources/read" -> handleResourcesRead(request)
                "resources/subscribe" -> handleResourcesSubscribe(request)
                "resources/unsubscribe" -> handleResourcesUnsubscribe(request)
                "ping" -> handlePing(request)
                "shutdown" -> handleShutdown(request)
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
            "notifications/capabilities" -> handleCapabilitiesNotification(request)
            // Add other notification handlers as needed
        }
    }
    
    // ===== Method Handlers =====
    
    private fun handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
        // Initialize method must have an ID (not a notification)
        if (request.id == null) {
            return protocolHandler.createErrorResponse(
                id = null,
                code = -32600,
                message = "initialize method requires request ID",
                data = null
            )
        }
        
        // Parameters are required
        val params = request.params as? JsonObject
            ?: return createInvalidParamsError(request, "Expected object parameters")
        
        // Validate required parameters
        if (params["protocolVersion"] == null) {
            return createInvalidParamsError(request, "protocolVersion parameter is required")
        }
        
        if (params["capabilities"] == null) {
            return createInvalidParamsError(request, "capabilities parameter is required")
        }
        
        // Validate protocol version
        val protocolVersion = params["protocolVersion"]?.jsonPrimitive?.content
        if (protocolVersion != "2024-11-05") {
            return createInvalidParamsError(
                request, 
                "Unsupported protocol version: $protocolVersion. Supported versions: 2024-11-05"
            )
        }
        
        // clientInfo is optional but if present, name should be provided
        val clientInfo = params["clientInfo"] as? JsonObject
        if (clientInfo != null && clientInfo.get("name")?.jsonPrimitive?.content.isNullOrBlank()) {
            return createInvalidParamsError(request, "client name is required in clientInfo")
        }
        
        // Update server state to running
        serverState.transitionTo(io.spiralhouse.cycletime.mcp.server.state.ServerStatus.STARTING)
        serverState.transitionTo(io.spiralhouse.cycletime.mcp.server.state.ServerStatus.RUNNING)
        
        val result = buildJsonObject {
            put("protocolVersion", "2024-11-05")
            put("capabilities", buildCapabilities())
            put("serverInfo", buildServerInfo())
        }
        
        return protocolHandler.createResponse(request.id, result)
    }
    
    private fun handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            val metadata = toolRegistry.getAllToolMetadata()
            val tools = metadata.mapNotNull { tool ->
                try {
                    buildJsonObject {
                        put("name", tool.name)
                        put("description", tool.description)
                        put("inputSchema", tool.parametersSchema)
                    }
                } catch (e: Exception) {
                    // Skip tools that fail during metadata serialization
                    null
                }
            }
            
            val result = buildJsonObject {
                put("tools", JsonArray(tools))
            }
            
            protocolHandler.createResponse(request.id, result)
        } catch (e: Exception) {
            createInternalError(request, e)
        }
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
        
        // Check if tool exists
        val syncTool = toolRegistry.getTool(toolName)
        val asyncTool = toolRegistry.getAsyncTool(toolName)
        
        if (syncTool == null && asyncTool == null) {
            return protocolHandler.createErrorResponse(
                id = request.id,
                code = -32001,
                message = "Tool not found: $toolName",
                data = null
            )
        }
        
        val result = if (asyncTool != null && async) {
            // Invoke async tool with timeout
            val timeout = params["timeout"]?.jsonPrimitive?.longOrNull 
                ?: 60000L // Default 60 seconds
            toolInvoker.invokeAsync(toolName, arguments, timeout)
        } else if (syncTool != null && !async) {
            // Invoke sync tool
            toolInvoker.invoke(toolName, arguments)
        } else if (asyncTool != null && !async) {
            // Async tool called synchronously - not supported
            return createInvalidParamsError(
                request, 
                "Async tool '$toolName' requires async invocation"
            )
        } else {
            // Sync tool called async - should work
            toolInvoker.invoke(toolName, arguments)
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
    
    private suspend fun handleResourcesRead(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params as? JsonObject
            ?: return createInvalidParamsError(request, "uri parameter is required")
        
        val uri = params["uri"]?.jsonPrimitive?.content
            ?: return createInvalidParamsError(request, "uri parameter is required")
        
        return try {
            // Find provider that can handle this resource
            var resourceContent: JsonObject? = null
            
            for (provider in resourceRegistry.getProviders()) {
                val resource = provider.getResource(uri)
                if (resource != null) {
                    // Found the resource, read its content
                    val content = provider.readResource(uri)
                    resourceContent = buildJsonObject {
                        put("uri", uri)
                        put("mimeType", resource.mimeType)
                        put("text", content)
                    }
                    break
                }
            }
            
            if (resourceContent == null) {
                throw ResourceNotFoundException("Resource not found: $uri")
            }
            
            val result = buildJsonObject {
                put("contents", buildJsonArray {
                    add(resourceContent)
                })
            }
            
            protocolHandler.createResponse(request.id, result)
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    private suspend fun handleResourcesSubscribe(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params as? JsonObject
            ?: return createInvalidParamsError(request, "uri parameter is required")
        
        val uri = params["uri"]?.jsonPrimitive?.content
            ?: return createInvalidParamsError(request, "uri parameter is required")
        
        return try {
            // Check if resource exists
            var resourceExists = false
            for (provider in resourceRegistry.getProviders()) {
                val resource = provider.getResource(uri)
                if (resource != null) {
                    resourceExists = true
                    break
                }
            }
            
            if (!resourceExists) {
                throw ResourceNotFoundException("Resource not found: $uri")
            }
            
            // For now, subscription is not implemented
            // This will be properly implemented in a future phase
            return protocolHandler.createErrorResponse(
                id = request.id,
                code = -32003,
                message = "Subscription not yet implemented",
                data = null
            )
        } catch (e: ResourceNotFoundException) {
            return protocolHandler.createErrorResponse(
                id = request.id,
                code = -32002,
                message = e.message ?: "Resource not found",
                data = null
            )
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    private suspend fun handleResourcesUnsubscribe(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params as? JsonObject
            ?: return createInvalidParamsError(request, "uri parameter is required")
        
        val uri = params["uri"]?.jsonPrimitive?.content
            ?: return createInvalidParamsError(request, "uri parameter is required")
        
        return try {
            // For now, subscription is not implemented
            // This will be properly implemented in a future phase
            return protocolHandler.createErrorResponse(
                id = request.id,
                code = -32003,
                message = "Subscription not yet implemented",
                data = null
            )
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    private fun handlePing(request: JsonRpcRequest): JsonRpcResponse {
        val result = buildJsonObject {
            put("pong", true)
        }
        
        return protocolHandler.createResponse(request.id, result)
    }
    
    private fun handleShutdown(request: JsonRpcRequest): JsonRpcResponse {
        // Update server state to stopping
        serverState.transitionTo(io.spiralhouse.cycletime.mcp.server.state.ServerStatus.STOPPING)
        
        val result = buildJsonObject {
            put("acknowledged", true)
        }
        
        // Will transition to STOPPED after cleanup
        serverState.transitionTo(io.spiralhouse.cycletime.mcp.server.state.ServerStatus.STOPPED)
        
        return protocolHandler.createResponse(request.id, result)
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
    
    private fun handleCapabilitiesNotification(request: JsonRpcRequest) {
        // Handle capability update notifications
        // In a real implementation, this might update client capability tracking
    }
    
    // ===== Helper Methods =====
    
    private fun buildCapabilities(): JsonObject {
        return buildJsonObject {
            put("tools", buildJsonObject {
                put("listChanged", true)
            })
            put("resources", buildJsonObject {
                put("subscribe", true)
                put("listChanged", true)
            })
            put("logging", buildJsonObject {})
            put("prompts", buildJsonObject {
                put("listChanged", true)
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
        // Sanitize error messages to avoid leaking sensitive information
        val sanitizedMessage = when {
            error.message?.contains("password", ignoreCase = true) == true ||
            error.message?.contains("token", ignoreCase = true) == true ||
            error.message?.contains("secret", ignoreCase = true) == true ||
            error.message?.contains("key", ignoreCase = true) == true -> {
                "Internal server error"
            }
            else -> error.message ?: "Internal error"
        }
        
        return protocolHandler.createErrorResponse(
            id = request.id,
            code = -32603,
            message = sanitizedMessage,
            data = buildJsonObject {
                put("exception", error.javaClass.simpleName)
                // Only include stack trace location if not sensitive
                if (!sanitizedMessage.equals("Internal server error")) {
                    error.stackTrace.firstOrNull()?.let { frame ->
                        put("location", "${frame.className}.${frame.methodName}:${frame.lineNumber}")
                    }
                }
            }
        )
    }
    
    private fun createParseError(request: JsonRpcRequest): JsonRpcResponse {
        return protocolHandler.createErrorResponse(
            id = request.id,
            code = -32700,
            message = "Parse error",
            data = null
        )
    }
    
    private fun createToolError(
        request: JsonRpcRequest, 
        error: Throwable
    ): JsonRpcResponse {
        // Map exception types to appropriate JSON-RPC error codes
        val (code, message, data) = when (error) {
            is ParameterValidationException -> {
                Triple(-32602, "Parameter validation failed: ${error.message}", null)
            }
            is ToolTimeoutException -> {
                Triple(-32005, "Tool execution timeout: ${error.message}", null)
            }
            is ToolExecutionException -> {
                Triple(-32004, "Tool execution failed: ${error.message}", buildJsonObject {
                    put("exception", error.javaClass.simpleName)
                    error.stackTrace.firstOrNull()?.let { frame ->
                        put("location", "${frame.className}.${frame.methodName}:${frame.lineNumber}")
                    }
                })
            }
            is ToolNotFoundException -> {
                Triple(-32001, error.message ?: "Tool not found", null)
            }
            else -> {
                Triple(-32603, "Internal error: ${error.message ?: "Unknown error"}", buildJsonObject {
                    put("exception", error.javaClass.simpleName)
                    error.stackTrace.firstOrNull()?.let { frame ->
                        put("location", "${frame.className}.${frame.methodName}:${frame.lineNumber}")
                    }
                })
            }
        }
        
        return protocolHandler.createErrorResponse(
            id = request.id,
            code = code,
            message = message,
            data = data
        )
    }
}