package io.spiralhouse.cycletime.mcp.websocket

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse

/**
 * Interface for handling incoming messages in the connection manager.
 * 
 * This abstraction allows for different message handling strategies
 * and supports the Strategy pattern for processing various message types.
 * 
 * ## Design Rationale
 * - Separation of message handling from connection management
 * - Support for multiple message formats (JSON-RPC, binary protocols, etc.)
 * - Extensible handler registration mechanism
 * - Clear error handling boundaries
 */
interface MessageHandler {
    
    /**
     * Processes a text-based message from a connection.
     * 
     * @param connectionId the identifier of the connection that sent the message
     * @param message the text message to process
     * @return the response to send back, or null for notifications
     */
    suspend fun handleTextMessage(connectionId: String, message: String): String?
    
    /**
     * Processes a binary message from a connection.
     * 
     * @param connectionId the identifier of the connection that sent the message
     * @param data the binary data to process
     * @return the response to send back, or null if no response needed
     */
    suspend fun handleBinaryMessage(connectionId: String, data: ByteArray): ByteArray?
    
    /**
     * Registers a method-specific handler for JSON-RPC requests.
     * 
     * @param method the JSON-RPC method name to handle
     * @param handler the function to process requests for this method
     */
    fun registerMethodHandler(method: String, handler: (JsonRpcRequest) -> JsonRpcResponse)
    
    /**
     * Checks if a specific JSON-RPC method is registered.
     * 
     * @param method the method name to check
     * @return true if a handler is registered for this method
     */
    fun hasMethodHandler(method: String): Boolean
    
    /**
     * Gets the maximum allowed message size in bytes.
     * 
     * @return the maximum message size
     */
    fun getMaxMessageSize(): Int
}