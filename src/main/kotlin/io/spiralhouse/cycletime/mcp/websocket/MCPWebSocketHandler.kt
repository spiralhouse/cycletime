package io.spiralhouse.cycletime.mcp.websocket

import io.ktor.websocket.*
import io.ktor.server.websocket.*
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcError
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.server.MCPConfiguration
import io.spiralhouse.cycletime.mcp.server.MCPConnectionManager
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.serialization.json.*
import kotlinx.serialization.encodeToString
import org.slf4j.LoggerFactory

/**
 * Handles MCP protocol communication over WebSocket connections.
 * 
 * This class manages the lifecycle of individual WebSocket connections,
 * processing JSON-RPC messages and routing them to appropriate MCP method handlers.
 */
class MCPWebSocketHandler(
    private val config: MCPConfiguration,
    private val methodHandler: McpMethodHandler,
    private val protocolHandler: JsonRpcProtocolHandler,
    private val connectionManager: MCPConnectionManager
) {
    private val logger = LoggerFactory.getLogger(MCPWebSocketHandler::class.java)
    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = config.detailedLogging
    }
    
    /**
     * Handle a WebSocket session for MCP communication.
     */
    suspend fun handleConnection(session: DefaultWebSocketSession) {
        val connectionId = connectionManager.registerConnection(session)
        
        try {
            logger.info("MCP WebSocket connection established: $connectionId")
            
            // Process incoming messages
            for (frame in session.incoming) {
                when (frame) {
                    is Frame.Text -> {
                        val text = frame.readText()
                        connectionId?.let { handleTextMessage(session, it, text) }
                    }
                    is Frame.Close -> {
                        logger.info("WebSocket close frame received for $connectionId")
                        break
                    }
                    else -> {
                        logger.debug("Ignoring non-text frame from $connectionId")
                    }
                }
            }
        } catch (e: ClosedReceiveChannelException) {
            logger.info("WebSocket connection closed normally: $connectionId")
        } catch (e: Exception) {
            logger.error("Error handling WebSocket connection $connectionId", e)
            session.close(CloseReason(CloseReason.Codes.INTERNAL_ERROR, "Server error"))
        } finally {
            connectionId?.let { connectionManager.unregisterConnection(it) }
            logger.info("MCP WebSocket connection cleaned up: $connectionId")
        }
    }
    
    private suspend fun handleTextMessage(
        session: DefaultWebSocketSession,
        connectionId: String,
        message: String
    ) {
        try {
            if (config.detailedLogging) {
                logger.debug("Received from $connectionId: $message")
            }
            
            // Parse JSON-RPC request
            val request = protocolHandler.parseRequest(message)
            
            // Track request for metrics
            connectionManager.getStatistics()
            
            // Process through MCP method handler
            val response = methodHandler.handleRequest(request)
            
            // Send response
            val responseText = json.encodeToString(JsonRpcResponse.serializer(), response)
            session.send(Frame.Text(responseText))
            
            if (config.detailedLogging) {
                logger.debug("Sent to $connectionId: $responseText")
            }
            
        } catch (e: Exception) {
            logger.error("Error processing message from $connectionId", e)
            
            // Send error response
            val errorResponse = JsonRpcResponse(
                jsonrpc = "2.0",
                id = JsonNull,
                result = null,
                error = JsonRpcError(
                    code = -32603,
                    message = "Internal error: ${e.message}",
                    data = null
                )
            )
            session.send(Frame.Text(json.encodeToString(JsonRpcResponse.serializer(), errorResponse)))
        }
    }
    
}