package io.spiralhouse.cycletime.mcp.server.handlers

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcError
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.tools.McpToolHandler
import io.spiralhouse.cycletime.mcp.resources.ResourceRegistry
import io.spiralhouse.cycletime.mcp.server.state.ServerState
import io.spiralhouse.cycletime.mcp.tools.exceptions.*
import io.spiralhouse.cycletime.mcp.resources.exceptions.*
import kotlinx.serialization.json.*

/**
 * Consolidated MCP method handler for processing JSON-RPC requests.
 * 
 * This class handles all MCP protocol methods including initialization, 
 * tool operations, and resource management. It combines comprehensive
 * validation and error handling with efficient request processing.
 * 
 * @property protocolHandler Handler for JSON-RPC protocol operations
 * @property toolHandler Handler for tool-related JSON-RPC operations
 * @property resourceRegistry Registry for resource provider management
 * @property serverState Server state management (optional)
 */
class McpMethodHandler(
    private val protocolHandler: JsonRpcProtocolHandler,
    private val toolHandler: McpToolHandler,
    private val resourceRegistry: ResourceRegistry,
    private val serverState: ServerState = ServerState()
) {
    
    /**
     * Handles a synchronous JSON-RPC request.
     *
     * @param request The JSON-RPC request to handle
     * @param sessionId The session ID for this request
     * @return The JSON-RPC response
     */
    suspend fun handleRequest(request: JsonRpcRequest, sessionId: String): JsonRpcResponse {
        // Validate JSON-RPC protocol version
        if (request.jsonrpc != "2.0") {
            return createParseError(request)
        }

        // Ensure server is running (except for initialize)
        if (!serverState.isRunning() && request.method != "initialize") {
            return createErrorResponse(
                request = request,
                code = -32003,
                message = "Server not initialized"
            )
        }

        return try {
            when (request.method) {
                "initialize" -> handleInitialize(request, sessionId)
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
    
    /**
     * Handles an asynchronous JSON-RPC request.
     * This method supports long-running operations like async tool invocation.
     *
     * @param request The JSON-RPC request to handle
     * @param sessionId The session ID for this request
     * @return The JSON-RPC response
     */
    suspend fun handleRequestAsync(request: JsonRpcRequest, sessionId: String): JsonRpcResponse {
        return try {
            when (request.method) {
                "initialize" -> handleInitialize(request, sessionId)
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
    
    /**
     * Handles a JSON-RPC notification (no response expected).
     * 
     * @param request The notification request
     */
    suspend fun handleNotification(request: JsonRpcRequest) {
        // Process notifications without generating responses
        when (request.method) {
            "notifications/message" -> handleMessageNotification()
            "notifications/progress" -> handleProgressNotification()
            "notifications/capabilities" -> handleCapabilitiesNotification()
            // Add other notification handlers as needed
        }
    }
    
    // ===== Method Handlers =====
    
    private fun handleInitialize(request: JsonRpcRequest, sessionId: String): JsonRpcResponse {
        // Initialize method must have an ID (not a notification)
        if (request.id == null) {
            return createErrorResponse(
                request = request,
                code = -32600,
                message = "initialize method requires request ID"
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
            put("sessionId", sessionId)
            put("capabilities", buildCapabilities())
            put("serverInfo", buildServerInfo())
        }

        return createSuccessResponse(request, result)
    }
    
    private suspend fun handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            val result = toolHandler.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))
            result.fold(
                onSuccess = { value -> createSuccessResponse(request, value) },
                onFailure = { error -> handleToolHandlerError(request, error) }
            )
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

        return try {
            val result = toolHandler.handleJsonRpcMethod("tools/call", params)
            result.fold(
                onSuccess = { value ->
                    // McpToolHandler already returns MCP-formatted response, use it directly
                    createSuccessResponse(request, value)
                },
                onFailure = { error -> handleToolHandlerError(request, error) }
            )
        } catch (e: Exception) {
            createInternalError(request, e)
        }
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
            
            createSuccessResponse(request, result)
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
            
            createSuccessResponse(request, result)
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
            
            // Resource subscription is not supported in this implementation
            // Future versions may add real-time resource change notifications
            return createErrorResponse(
                request = request,
                code = -32603,
                message = "Resource subscription is not supported",
                data = buildJsonObject {
                    put("feature", "resource_subscription")
                    put("reason", "not_implemented")
                }
            )
        } catch (e: ResourceNotFoundException) {
            return createErrorResponse(
                request = request,
                code = -32002,
                message = e.message ?: "Resource not found"
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
            // Resource subscription is not supported in this implementation
            // Future versions may add real-time resource change notifications
            return createErrorResponse(
                request = request,
                code = -32603,
                message = "Resource subscription is not supported",
                data = buildJsonObject {
                    put("feature", "resource_subscription")
                    put("reason", "not_implemented")
                }
            )
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    private fun handlePing(request: JsonRpcRequest): JsonRpcResponse {
        val result = buildJsonObject {
            put("pong", true)
        }
        
        return createSuccessResponse(request, result)
    }
    
    private fun handleShutdown(request: JsonRpcRequest): JsonRpcResponse {
        // Update server state to stopping
        serverState.transitionTo(io.spiralhouse.cycletime.mcp.server.state.ServerStatus.STOPPING)
        
        val result = buildJsonObject {
            put("acknowledged", true)
        }
        
        // Will transition to STOPPED after cleanup
        serverState.transitionTo(io.spiralhouse.cycletime.mcp.server.state.ServerStatus.STOPPED)
        
        return createSuccessResponse(request, result)
    }
    
    // ===== Notification Handlers =====
    
    private fun handleMessageNotification() {
        // Log or process message notifications
        // In a real implementation, this might forward to a logging system
    }
    
    private fun handleProgressNotification() {
        // Handle progress updates
        // In a real implementation, this might update a progress tracker
    }
    
    private fun handleCapabilitiesNotification() {
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
            put("name", "CycleTime-CE")
            put("version", "1.0.0")
        }
    }

    // ===== Response Creation Helpers =====
    
    private fun createSuccessResponse(request: JsonRpcRequest, result: JsonElement): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = result,
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private fun createErrorResponse(
        request: JsonRpcRequest,
        code: Int,
        message: String,
        data: JsonElement? = null
    ): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            error = JsonRpcError(
                code = code,
                message = message,
                data = data
            ),
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    // ===== Error Response Helpers =====
    
    private fun createMethodNotFoundError(request: JsonRpcRequest): JsonRpcResponse {
        return createErrorResponse(
            request = request,
            code = -32601,
            message = "Method not found: ${request.method}"
        )
    }
    
    private fun createInvalidParamsError(
        request: JsonRpcRequest, 
        message: String
    ): JsonRpcResponse {
        return createErrorResponse(
            request = request,
            code = -32602,
            message = message
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
        
        return createErrorResponse(
            request = request,
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
        return createErrorResponse(
            request = request,
            code = -32700,
            message = "Parse error"
        )
    }
    
    private fun handleToolHandlerError(
        request: JsonRpcRequest,
        error: Throwable
    ): JsonRpcResponse {
        return when (error) {
            is JsonRpcException -> {
                createErrorResponse(
                    request = request,
                    code = error.code,
                    message = error.message ?: "Tool operation failed",
                    data = error.data
                )
            }
            is ParameterValidationException -> {
                createErrorResponse(
                    request = request,
                    code = -32602,
                    message = "Parameter validation failed: ${error.message}"
                )
            }
            is ToolTimeoutException -> {
                createErrorResponse(
                    request = request,
                    code = -32005,
                    message = "Tool execution timeout: ${error.message}"
                )
            }
            is ToolExecutionException -> {
                createErrorResponse(
                    request = request,
                    code = -32004,
                    message = "Tool execution failed: ${error.message}",
                    data = buildJsonObject {
                        put("exception", error.javaClass.simpleName)
                        error.stackTrace.firstOrNull()?.let { frame ->
                            put("location", "${frame.className}.${frame.methodName}:${frame.lineNumber}")
                        }
                    }
                )
            }
            is ToolNotFoundException -> {
                createErrorResponse(
                    request = request,
                    code = -32001,
                    message = error.message ?: "Tool not found"
                )
            }
            else -> {
                createErrorResponse(
                    request = request,
                    code = -32603,
                    message = "Internal error: ${error.message ?: "Unknown error"}",
                    data = buildJsonObject {
                        put("exception", error.javaClass.simpleName)
                        error.stackTrace.firstOrNull()?.let { frame ->
                            put("location", "${frame.className}.${frame.methodName}:${frame.lineNumber}")
                        }
                    }
                )
            }
        }
    }
}