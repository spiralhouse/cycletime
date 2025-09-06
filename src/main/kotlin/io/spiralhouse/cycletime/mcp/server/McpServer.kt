package io.spiralhouse.cycletime.mcp.server

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.server.handlers.DefaultMcpMethodHandler
import io.spiralhouse.cycletime.mcp.server.state.ServerState
import io.spiralhouse.cycletime.mcp.server.state.ServerStatus
import io.spiralhouse.cycletime.mcp.server.exceptions.ServerLifecycleException
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
 * MCP Server interface providing lifecycle management and component integration.
 * 
 * This interface defines the contract for an MCP (Model Context Protocol) server
 * that manages WebSocket connections, processes JSON-RPC requests, and coordinates
 * between tool registries and resource providers.
 * 
 * Thread Safety: Implementations should be thread-safe for all operations.
 */
interface McpServer {
    // ===== Lifecycle Management =====
    
    /**
     * Starts the MCP server and all its components.
     * This method should initialize components in the correct order:
     * 1. Protocol handler setup
     * 2. Registry initialization
     * 3. Connection manager startup
     * 4. WebSocket server binding
     * 
     * @throws IllegalStateException if the server is already running
     */
    suspend fun start()
    
    /**
     * Stops the MCP server and cleans up all resources.
     * This method should cleanup components in reverse order of initialization:
     * 1. Close active connections
     * 2. Stop connection manager
     * 3. Clear registries
     * 4. Release resources
     * 
     * @throws IllegalStateException if the server is not running
     */
    suspend fun stop()
    
    /**
     * Checks if the server is currently running.
     * @return true if the server is running, false otherwise
     */
    fun isRunning(): Boolean
    
    /**
     * Gets the port number the server is configured to use.
     * @return the configured port number
     */
    fun getPort(): Int
    
    // ===== Component Access =====
    
    /**
     * Gets the JSON-RPC protocol handler.
     * @return the protocol handler instance
     */
    fun getProtocolHandler(): JsonRpcProtocolHandler
    
    /**
     * Gets the WebSocket connection manager.
     * @return the connection manager instance
     */
    fun getConnectionManager(): WebSocketConnectionManager
    
    /**
     * Gets the tool registry.
     * @return the tool registry instance
     */
    fun getToolRegistry(): DefaultToolRegistry
    
    /**
     * Gets the resource provider registry.
     * @return the resource registry instance
     */
    fun getResourceRegistry(): ResourceProviderRegistry
    
    // ===== Tool Management =====
    
    /**
     * Registers a synchronous tool with the server.
     * @param tool the tool to register
     * @return true if registration succeeded, false if a tool with that name already exists
     */
    fun registerTool(tool: Tool): Boolean
    
    /**
     * Registers an asynchronous tool with the server.
     * @param tool the async tool to register
     * @return true if registration succeeded, false if a tool with that name already exists
     */
    fun registerAsyncTool(tool: AsyncTool): Boolean
    
    /**
     * Unregisters a tool by name.
     * @param toolName the name of the tool to unregister
     * @return true if the tool was found and removed, false otherwise
     */
    fun unregisterTool(toolName: String): Boolean
    
    // ===== Resource Management =====
    
    /**
     * Registers a resource provider with the server.
     * @param provider the resource provider to register
     */
    suspend fun registerResourceProvider(provider: ResourceProvider)
    
    /**
     * Unregisters a resource provider by name.
     * @param name the name of the provider to unregister
     * @return the unregistered provider if found, null otherwise
     */
    fun unregisterResourceProvider(name: String): ResourceProvider?
    
    // ===== Request Handling =====
    
    /**
     * Handles a single JSON-RPC request synchronously.
     * @param json the JSON-RPC request string
     * @return the JSON-RPC response string, or null for notifications
     */
    suspend fun handleRequest(json: String): String?
    
    /**
     * Handles a single JSON-RPC request asynchronously.
     * This method supports async tool invocation.
     * @param json the JSON-RPC request string
     * @return the JSON-RPC response string, or null for notifications
     */
    suspend fun handleRequestAsync(json: String): String?
    
    /**
     * Handles a batch of JSON-RPC requests.
     * @param json the JSON array of requests
     * @return the JSON array of responses, or null if all were notifications
     */
    suspend fun handleBatchRequest(json: String): String?
}

/**
 * Default implementation of McpServer that integrates all MCP components.
 * 
 * This server coordinates between the protocol handler, connection manager,
 * tool registry, and resource registry to provide a complete MCP implementation.
 * It follows the Single Responsibility Principle by delegating method handling
 * to a dedicated handler component.
 */
class DefaultMcpServer(
    private val config: McpServerConfig = McpServerConfig()
) : McpServer {
    
    // Core components
    private val protocolHandler = JsonRpcProtocolHandler()
    private val toolRegistry = DefaultToolRegistry()
    private val resourceRegistry = ResourceProviderRegistry()
    private val connectionManager: WebSocketConnectionManager
    private val methodHandler: McpMethodHandler
    private val serverState = ServerState()
    
    init {
        // Validate configuration
        config.validate()
        
        // Configure WebSocket connection manager
        val wsConfig = WebSocketServerConfig(
            port = config.port,
            enableSsl = config.enableSSL,
            connectionTimeout = config.connectionTimeout,
            heartbeatInterval = config.heartbeatInterval
        )
        connectionManager = WebSocketConnectionManager(wsConfig)
        
        // Wire protocol handler to connection manager
        connectionManager.setProtocolHandler(protocolHandler)
        
        // Create method handler with dependencies
        methodHandler = DefaultMcpMethodHandler(
            protocolHandler = protocolHandler,
            toolRegistry = toolRegistry,
            resourceRegistry = resourceRegistry
        )
        
        // Register MCP method handlers
        setupMethodHandlers()
    }
    
    // ===== Lifecycle Management =====
    
    override suspend fun start() {
        if (!serverState.canStart()) {
            throw ServerLifecycleException(
                "Cannot start server in state: ${serverState.getStatus()}"
            )
        }
        
        try {
            serverState.transitionTo(ServerStatus.STARTING)
            connectionManager.start()
            serverState.transitionTo(ServerStatus.RUNNING)
        } catch (e: Exception) {
            serverState.recordError(e)
            throw ServerLifecycleException("Failed to start server", e)
        }
    }
    
    override suspend fun stop() {
        if (!serverState.canStop()) {
            throw ServerLifecycleException(
                "Cannot stop server in state: ${serverState.getStatus()}"
            )
        }
        
        try {
            serverState.transitionTo(ServerStatus.STOPPING)
            // Cleanup in reverse order of initialization
            connectionManager.stop()
            // Note: Registries maintain their state for potential restart
            serverState.transitionTo(ServerStatus.STOPPED)
        } catch (e: Exception) {
            serverState.recordError(e)
            throw ServerLifecycleException("Failed to stop server gracefully", e)
        }
    }
    
    override fun isRunning(): Boolean = serverState.isRunning()
    
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
                methodHandler.handleNotification(request)
                return null
            }
            
            val response = methodHandler.handleRequest(request)
            protocolHandler.serializeResponse(response)
        } catch (e: Exception) {
            val errorResponse = protocolHandler.createErrorResponse(
                id = null,
                code = -32700, // Parse error
                message = "Parse error: ${e.message}",
                data = null
            )
            protocolHandler.serializeResponse(errorResponse)
        }
    }
    
    override suspend fun handleRequestAsync(json: String): String? {
        return try {
            val request = protocolHandler.parseRequest(json)
            
            // Handle notifications (no response)
            if (protocolHandler.isNotification(request)) {
                methodHandler.handleNotification(request)
                return null
            }
            
            // Use async handler for async tool invocation
            val response = methodHandler.handleRequestAsync(request)
            protocolHandler.serializeResponse(response)
        } catch (e: Exception) {
            val errorResponse = protocolHandler.createErrorResponse(
                id = null,
                code = -32700, // Parse error
                message = "Parse error: ${e.message}",
                data = null
            )
            protocolHandler.serializeResponse(errorResponse)
        }
    }
    
    override suspend fun handleBatchRequest(json: String): String? {
        return try {
            val requests = protocolHandler.parseBatchRequest(json)
            val responses = mutableListOf<JsonRpcResponse>()
            
            for (request in requests) {
                if (!protocolHandler.isNotification(request)) {
                    val response = methodHandler.handleRequest(request)
                    responses.add(response)
                } else {
                    // Handle notification but don't add to responses
                    methodHandler.handleNotification(request)
                }
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
                message = "Parse error: ${e.message}",
                data = null
            )
            protocolHandler.serializeResponse(errorResponse)
        }
    }
    
    // ===== Private Implementation =====
    
    private fun setupMethodHandlers() {
        // Register method handlers with the connection manager
        // These will be invoked when WebSocket messages arrive
        connectionManager.registerMethodHandler("initialize") { request ->
            runBlocking { methodHandler.handleRequest(request) }
        }
        
        connectionManager.registerMethodHandler("tools/list") { request ->
            runBlocking { methodHandler.handleRequest(request) }
        }
        
        connectionManager.registerMethodHandler("tools/call") { request ->
            // Use runBlocking to bridge the async gap for now
            // This will be improved in a future iteration
            runBlocking { methodHandler.handleRequestAsync(request) }
        }
        
        connectionManager.registerMethodHandler("resources/list") { request ->
            runBlocking { methodHandler.handleRequestAsync(request) }
        }
    }
    
    // Method handling is now delegated to the McpMethodHandler
}

/**
 * Factory function to create an McpServer instance.
 * 
 * @param config the server configuration
 * @return a new McpServer instance
 * @throws IllegalArgumentException if the configuration is invalid
 */
fun McpServer(config: McpServerConfig = McpServerConfig()): McpServer {
    return DefaultMcpServer(config)
}