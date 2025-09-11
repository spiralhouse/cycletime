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
import kotlinx.serialization.SerializationException
import java.io.IOException
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
                    is Frame.Ping -> {
                        // Respond to ping with pong (WebSocket heartbeat)
                        if (config.detailedLogging) {
                            logger.debug("Ping received from $connectionId, sending pong")
                        }
                        session.send(Frame.Pong(frame.data))
                    }
                    is Frame.Pong -> {
                        // Log pong receipt (heartbeat acknowledgment)
                        if (config.detailedLogging) {
                            logger.debug("Pong received from $connectionId")
                        }
                    }
                    is Frame.Close -> {
                        logger.info("WebSocket close frame received for $connectionId")
                        break
                    }
                    else -> {
                        logger.debug("Ignoring unsupported frame type from $connectionId: ${frame.frameType}")
                    }
                }
            }
        } catch (e: IOException) {
            logger.warn("Network error on WebSocket connection $connectionId: ${e.message}")
            try {
                session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Network error"))
            } catch (closeException: IOException) {
                logger.debug("Network error during session close: ${closeException.message}")
            } catch (closeException: IllegalStateException) {
                logger.debug("Session already closed: ${closeException.message}")
            }
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid argument in WebSocket connection $connectionId: ${e.message}", e)
            try {
                session.close(CloseReason(CloseReason.Codes.CANNOT_ACCEPT, "Invalid data"))
            } catch (closeException: IOException) {
                logger.debug("Network error during session close: ${closeException.message}")
            } catch (closeException: IllegalStateException) {
                logger.debug("Session already closed: ${closeException.message}")
            }
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
            
        } catch (e: SerializationException) {
            logger.warn("JSON parsing error from $connectionId: ${e.message}")
            
            // Send JSON-RPC parse error response  
            val errorResponse = JsonRpcResponse(
                jsonrpc = "2.0",
                id = JsonNull,
                error = JsonRpcError(-32700, "Parse error", JsonNull)
            )
            
            try {
                val responseText = json.encodeToString(JsonRpcResponse.serializer(), errorResponse)
                session.send(Frame.Text(responseText))
            } catch (sendException: IOException) {
                logger.error("Network error sending parse error response to $connectionId: ${sendException.message}")
            } catch (sendException: SerializationException) {
                logger.error("Serialization error sending parse error response to $connectionId: ${sendException.message}")
            }
        } catch (e: IllegalArgumentException) {
            logger.warn("Invalid request from $connectionId: ${e.message}")
            
            // Send JSON-RPC invalid request error
            val errorResponse = JsonRpcResponse(
                jsonrpc = "2.0",
                id = JsonNull,
                error = JsonRpcError(-32600, "Invalid Request", JsonNull)
            )
            
            try {
                val responseText = json.encodeToString(JsonRpcResponse.serializer(), errorResponse)
                session.send(Frame.Text(responseText))
            } catch (sendException: IOException) {
                logger.error("Network error sending invalid request error to $connectionId: ${sendException.message}")
            } catch (sendException: SerializationException) {
                logger.error("Serialization error sending invalid request error to $connectionId: ${sendException.message}")
            }
        } catch (e: IOException) {
            logger.error("Network error processing message from $connectionId: ${e.message}", e)
            
            // Network error - try to close connection gracefully
            try {
                session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Network error"))
            } catch (closeException: IOException) {
                logger.debug("Network error during session close: ${closeException.message}")
            } catch (closeException: IllegalStateException) {
                logger.debug("Session already closed: ${closeException.message}")
            }
        }
        // Note: Removed generic RuntimeException catch - specific exception handling above should cover most cases
    }
    
}