package io.spiralhouse.cycletime.mcp.websocket

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.ProtocolHandler
import java.util.concurrent.ConcurrentHashMap
import kotlinx.serialization.SerializationException

/**
 * Handles incoming WebSocket messages and JSON-RPC protocol processing.
 * 
 * Handles JSON-RPC message processing and routing to registered method handlers.
 * This implementation focuses on JSON-RPC protocol but can be extended for
 * other message formats.
 * 
 * ## Design Rationale
 * - Separation of message handling from connection management
 * - Support for multiple message formats (JSON-RPC, binary protocols, etc.)
 * - Extensible handler registration mechanism
 * - Clear error handling boundaries
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
class MessageHandler {
    
    private var protocolHandler: JsonRpcProtocolHandler? = null
    private val methodHandlers = ConcurrentHashMap<String, (JsonRpcRequest) -> JsonRpcResponse>()
    
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
     * 
     * @param handler the protocol handler to use
     */
    fun setProtocolHandler(handler: JsonRpcProtocolHandler) {
        this.protocolHandler = handler
    }
    
    /**
     * Processes a text-based message from a connection.
     * 
     * @param connectionId the identifier of the connection that sent the message
     * @param message the text message to process
     * @return the response to send back, or null for notifications
     */
    suspend fun handleTextMessage(connectionId: String, message: String): String? {
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
        } catch (e: SerializationException) {
            logger.logError("JSON parsing error from $connectionId", e)
            createErrorResponse(null, -32700, "Parse error")
        } catch (e: IllegalArgumentException) {
            logger.logError("Invalid request from $connectionId", e)
            createErrorResponse(null, -32600, "Invalid Request")
        } catch (e: UnsupportedOperationException) {
            logger.logError("Method not supported from $connectionId", e)
            createErrorResponse(null, -32601, "Method not found")
        } catch (e: IllegalStateException) {
            logger.logError("Handler in invalid state for $connectionId", e)
            createErrorResponse(null, -32603, "Internal error")
        }
    }
    
    /**
     * Processes a binary message from a connection.
     * 
     * @param connectionId the identifier of the connection that sent the message
     * @param data the binary data to process
     * @return the response to send back, or null if no response needed
     */
    suspend fun handleBinaryMessage(connectionId: String, data: ByteArray): ByteArray? {
        logger.logError("Binary frames not supported", null)
        // Return error as text since we don't support binary
        return null
    }
    
    /**
     * Registers a method-specific handler for JSON-RPC requests.
     * 
     * @param method the JSON-RPC method name to handle
     * @param handler the function to process requests for this method
     */
    fun registerMethodHandler(method: String, handler: (JsonRpcRequest) -> JsonRpcResponse) {
        methodHandlers[method] = handler
        logger.logDebug("Registered handler for method: $method")
    }
    
    /**
     * Checks if a specific JSON-RPC method is registered.
     * 
     * @param method the method name to check
     * @return true if a handler is registered for this method
     */
    fun hasMethodHandler(method: String): Boolean = methodHandlers.containsKey(method)
    
    /**
     * Gets the maximum allowed message size in bytes.
     * 
     * @return the maximum message size
     */
    fun getMaxMessageSize(): Int = config.maxMessageSize
    
    private fun parseRequest(handler: JsonRpcProtocolHandler, message: String, connectionId: String): JsonRpcRequest {
        return try {
            handler.parseRequest(message)
        } catch (e: SerializationException) {
            logger.logError("JSON deserialization failed from $connectionId: ${e.message}", e)
            throw e
        } catch (e: IllegalArgumentException) {
            logger.logError("Invalid JSON-RPC format from $connectionId: ${e.message}", e)
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
            } catch (e: IllegalArgumentException) {
                logger.logError("Invalid method parameters for ${request.method}", e)
                handler.createErrorResponse(
                    request.id,
                    -32602,
                    "Invalid params"
                )
            } catch (e: UnsupportedOperationException) {
                logger.logError("Unsupported operation in method ${request.method}", e)
                handler.createErrorResponse(
                    request.id,
                    -32601,
                    "Method not found"
                )
            } catch (e: IllegalStateException) {
                logger.logError("Handler in invalid state for method ${request.method}", e)
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