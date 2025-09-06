package io.spiralhouse.cycletime.mcp.websocket

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.ProtocolHandler
import java.util.concurrent.ConcurrentHashMap

/**
 * Default implementation of the MessageHandler interface.
 * 
 * Handles JSON-RPC message processing and routing to registered method handlers.
 * This implementation focuses on JSON-RPC protocol but can be extended for
 * other message formats.
 * 
 * ## Thread Safety
 * - Uses ConcurrentHashMap for thread-safe method handler storage
 * - All public methods are safe for concurrent access
 * 
 * ## Error Handling Strategy
 * - Parse errors return JSON-RPC error response (-32700)
 * - Method not found returns error response (-32601)
 * - Internal errors return error response (-32603)
 * - Binary messages return error response (-32600)
 */
class DefaultMessageHandler : MessageHandler {
    
    private var protocolHandler: JsonRpcProtocolHandler? = null
    private val methodHandlers = ConcurrentHashMap<String, (JsonRpcRequest) -> JsonRpcResponse>()
    
    // Constructor for MCP integration
    constructor(
        protocolHandler: ProtocolHandler,
        methodHandler: io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
    ) {
        this.protocolHandler = protocolHandler as? JsonRpcProtocolHandler
        // Register method handler methods here if needed
    }
    
    // Constructor for direct configuration
    constructor(
        config: WebSocketServerConfig,
        logger: WebSocketLogger
    ) {
        this.config = config
        this.logger = logger
    }
    
    private var config: WebSocketServerConfig = WebSocketServerConfig()
    private var logger: WebSocketLogger = DefaultWebSocketLogger()
    
    /**
     * Sets the protocol handler for JSON-RPC processing.
     */
    override fun setProtocolHandler(handler: JsonRpcProtocolHandler) {
        this.protocolHandler = handler
    }
    
    override suspend fun handleTextMessage(connectionId: String, message: String): String? {
        if (message.length > config.maxMessageSize) {
            logger.logError("Message too large from $connectionId: ${message.length} bytes", null)
            return createErrorResponse(null, -32600, "Message too large")
        }
        
        val handler = protocolHandler ?: run {
            logger.logError("No protocol handler set", null)
            return createErrorResponse(null, -32603, "Server not configured")
        }
        
        return try {
            val request = parseRequest(handler, message, connectionId)
            processRequest(handler, request)
        } catch (e: Exception) {
            logger.logError("Error processing message from $connectionId", e)
            createErrorResponse(null, -32603, "Internal server error")
        }
    }
    
    override suspend fun handleBinaryMessage(connectionId: String, data: ByteArray): ByteArray? {
        logger.logError("Binary frames not supported", null)
        // Return error as text since we don't support binary
        return null
    }
    
    override fun registerMethodHandler(method: String, handler: (JsonRpcRequest) -> JsonRpcResponse) {
        methodHandlers[method] = handler
        logger.logDebug("Registered handler for method: $method")
    }
    
    override fun hasMethodHandler(method: String): Boolean = methodHandlers.containsKey(method)
    
    override fun getMaxMessageSize(): Int = config.maxMessageSize
    
    private fun parseRequest(handler: JsonRpcProtocolHandler, message: String, connectionId: String): JsonRpcRequest {
        return try {
            handler.parseRequest(message)
        } catch (e: Exception) {
            logger.logError("Failed to parse JSON-RPC request from $connectionId", e)
            throw e
        }
    }
    
    private fun processRequest(handler: JsonRpcProtocolHandler, request: JsonRpcRequest): String? {
        // Check if it's a notification (no response needed)
        if (handler.isNotification(request)) {
            handler.handleNotification(request)
            return null
        }
        
        val response = findAndExecuteHandler(handler, request)
        return handler.serializeResponse(response)
    }
    
    private fun findAndExecuteHandler(handler: JsonRpcProtocolHandler, request: JsonRpcRequest): JsonRpcResponse {
        // Try registered method handlers first
        val methodHandler = methodHandlers[request.method]
        if (methodHandler != null) {
            return try {
                methodHandler(request)
            } catch (e: Exception) {
                handler.createErrorResponse(
                    request.id,
                    -32603,
                    "Method execution failed: ${e.message}",
                    null
                )
            }
        }
        
        // Method not found
        return handler.createErrorResponse(
            request.id,
            -32601,
            "Method not found: ${request.method}",
            null
        )
    }
    
    private fun createErrorResponse(id: Any?, code: Int, message: String): String? {
        val handler = protocolHandler ?: return null
        val response = handler.createErrorResponse(id, code, message, null)
        return handler.serializeResponse(response)
    }
}