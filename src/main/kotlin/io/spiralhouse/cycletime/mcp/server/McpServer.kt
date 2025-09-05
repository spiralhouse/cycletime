package io.spiralhouse.cycletime.mcp.server

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.websocket.WebSocketConnectionManager
import io.spiralhouse.cycletime.mcp.websocket.WebSocketServerConfig
import io.spiralhouse.cycletime.mcp.tools.DefaultToolRegistry
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.AsyncTool
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import io.spiralhouse.cycletime.mcp.resources.ResourceProvider
import kotlinx.serialization.json.*
import kotlinx.coroutines.runBlocking

/**
 * MCP Server interface providing lifecycle management and component integration
 */
interface McpServer {
    // Lifecycle management
    suspend fun start()
    suspend fun stop()
    fun isRunning(): Boolean
    fun getPort(): Int
    
    // Component access
    fun getProtocolHandler(): JsonRpcProtocolHandler
    fun getConnectionManager(): WebSocketConnectionManager
    fun getToolRegistry(): DefaultToolRegistry
    fun getResourceRegistry(): ResourceProviderRegistry
    
    // Tool management
    fun registerTool(tool: Tool): Boolean
    fun registerAsyncTool(tool: AsyncTool): Boolean
    fun unregisterTool(toolName: String): Boolean
    
    // Resource management
    suspend fun registerResourceProvider(provider: ResourceProvider)
    fun unregisterResourceProvider(name: String): ResourceProvider?
    
    // Request handling
    suspend fun handleRequest(json: String): String?
    suspend fun handleRequestAsync(json: String): String?
    suspend fun handleBatchRequest(json: String): String?
}

/**
 * Default implementation of McpServer that integrates all MCP components
 */
class DefaultMcpServer(
    private val config: McpServerConfig = McpServerConfig()
) : McpServer {
    
    // Core components
    private val protocolHandler = JsonRpcProtocolHandler()
    private val toolRegistry = DefaultToolRegistry()
    private val resourceRegistry = ResourceProviderRegistry()
    private val connectionManager: WebSocketConnectionManager
    
    init {
        // Configure WebSocket connection manager
        val wsConfig = WebSocketServerConfig(
            port = config.port,
            enableSSL = config.enableSSL,
            connectionTimeout = config.connectionTimeout,
            heartbeatInterval = config.heartbeatInterval
        )
        connectionManager = WebSocketConnectionManager(wsConfig)
        
        // Wire protocol handler to connection manager
        connectionManager.setProtocolHandler(protocolHandler)
        
        // Register MCP method handlers
        setupMethodHandlers()
    }
    
    // ===== Lifecycle Management =====
    
    override suspend fun start() {
        connectionManager.start()
    }
    
    override suspend fun stop() {
        connectionManager.stop()
    }
    
    override fun isRunning(): Boolean = connectionManager.isRunning()
    
    override fun getPort(): Int = config.port
    
    // ===== Component Access =====
    
    override fun getProtocolHandler(): JsonRpcProtocolHandler = protocolHandler
    
    override fun getConnectionManager(): WebSocketConnectionManager = connectionManager
    
    override fun getToolRegistry(): DefaultToolRegistry = toolRegistry
    
    override fun getResourceRegistry(): ResourceProviderRegistry = resourceRegistry
    
    // ===== Tool Management =====
    
    override fun registerTool(tool: Tool): Boolean = toolRegistry.register(tool)
    
    override fun registerAsyncTool(tool: AsyncTool): Boolean = toolRegistry.register(tool)
    
    override fun unregisterTool(toolName: String): Boolean = toolRegistry.unregister(toolName)
    
    // ===== Resource Management =====
    
    override suspend fun registerResourceProvider(provider: ResourceProvider) {
        resourceRegistry.register(provider)
    }
    
    override fun unregisterResourceProvider(name: String): ResourceProvider? {
        return resourceRegistry.unregister(name)
    }
    
    // ===== Request Handling =====
    
    override suspend fun handleRequest(json: String): String? {
        return try {
            val request = protocolHandler.parseRequest(json)
            
            // Handle notifications (no response)
            if (protocolHandler.isNotification(request)) {
                handleNotificationRequest(request)
                return null
            }
            
            val response = handleSingleRequest(request)
            protocolHandler.serializeResponse(response)
        } catch (e: Exception) {
            val errorResponse = protocolHandler.createErrorResponse(
                id = null,
                code = -32700, // Parse error
                message = "Parse error",
                data = null
            )
            protocolHandler.serializeResponse(errorResponse)
        }
    }
    
    override suspend fun handleRequestAsync(json: String): String? {
        // For async handling, we'll use the same logic but allow async tool invocation
        return handleRequest(json)
    }
    
    override suspend fun handleBatchRequest(json: String): String? {
        return try {
            val requests = protocolHandler.parseBatchRequest(json)
            val responses = mutableListOf<JsonRpcResponse>()
            
            for (request in requests) {
                if (!protocolHandler.isNotification(request)) {
                    val response = handleSingleRequest(request)
                    responses.add(response)
                }
                // Notifications don't generate responses
            }
            
            if (responses.isEmpty()) {
                null // All were notifications
            } else {
                protocolHandler.createBatchResponse(responses)
            }
        } catch (e: Exception) {
            val errorResponse = protocolHandler.createErrorResponse(
                id = null,
                code = -32700, // Parse error
                message = "Parse error",
                data = null
            )
            protocolHandler.serializeResponse(errorResponse)
        }
    }
    
    // ===== Private Implementation =====
    
    private fun setupMethodHandlers() {
        // Register initialize method
        connectionManager.registerMethodHandler("initialize") { request ->
            handleInitialize(request)
        }
        
        // Register tools methods
        connectionManager.registerMethodHandler("tools/list") { request ->
            handleToolsList(request)
        }
        
        connectionManager.registerMethodHandler("tools/call") { request ->
            handleToolsCall(request)
        }
        
        // Register resources methods  
        connectionManager.registerMethodHandler("resources/list") { request ->
            runBlocking { handleResourcesList(request) }
        }
    }
    
    private suspend fun handleSingleRequest(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            when (request.method) {
                "initialize" -> handleInitialize(request)
                "tools/list" -> handleToolsList(request)
                "tools/call" -> handleToolsCall(request)
                "resources/list" -> handleResourcesList(request)
                else -> protocolHandler.createErrorResponse(
                    id = request.id,
                    code = -32601, // Method not found
                    message = "Method not found: ${request.method}",
                    data = null
                )
            }
        } catch (e: Exception) {
            protocolHandler.createErrorResponse(
                id = request.id,
                code = -32603, // Internal error
                message = e.message ?: "Internal error",
                data = null
            )
        }
    }
    
    private fun handleNotificationRequest(request: JsonRpcRequest) {
        // Handle notifications that don't require responses
        when (request.method) {
            "notifications/message" -> {
                // Log notification but don't respond
            }
            // Add other notification handlers as needed
        }
    }
    
    private fun handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
        val result = buildJsonObject {
            put("protocolVersion", "2024-11-05")
            put("capabilities", buildJsonObject {
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
            })
            put("serverInfo", buildJsonObject {
                put("name", "CycleTime MCP Server")
                put("version", "1.0.0")
            })
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
    
    private fun handleToolsCall(request: JsonRpcRequest): JsonRpcResponse {
        try {
            val params = request.params as? JsonObject
                ?: return protocolHandler.createErrorResponse(
                    request.id, -32602, "Invalid parameters", null
                )
            
            val toolName = params["name"]?.jsonPrimitive?.content
                ?: return protocolHandler.createErrorResponse(
                    request.id, -32602, "Missing tool name", null
                )
            
            val arguments = params["arguments"] ?: JsonObject(emptyMap())
            
            val result = toolRegistry.invoke(toolName, arguments)
            
            return result.fold(
                onSuccess = { value ->
                    val textValue = when {
                        value is JsonPrimitive && value.isString -> value.content
                        else -> value.toString().trim('"')
                    }
                    val responseData = buildJsonObject {
                        put("content", buildJsonArray {
                            add(buildJsonObject {
                                put("type", "text")
                                put("text", textValue)
                            })
                        })
                    }
                    protocolHandler.createResponse(request.id, responseData)
                },
                onFailure = { error ->
                    protocolHandler.createErrorResponse(
                        request.id, -32603, error.message ?: "Tool execution failed", null
                    )
                }
            )
        } catch (e: Exception) {
            return protocolHandler.createErrorResponse(
                request.id, -32603, e.message ?: "Internal error", null
            )
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
            
            protocolHandler.createResponse(request.id, result)
        } catch (e: Exception) {
            protocolHandler.createErrorResponse(
                request.id, -32603, e.message ?: "Failed to list resources", null
            )
        }
    }
}

/**
 * Factory function to create an McpServer instance
 */
fun McpServer(config: McpServerConfig = McpServerConfig()): McpServer {
    return DefaultMcpServer(config)
}