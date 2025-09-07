package io.spiralhouse.cycletime.mcp.server

import io.ktor.websocket.*
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import kotlin.system.measureTimeMillis

/**
 * Optimized WebSocket handler for MCP protocol with production-ready features.
 * 
 * Features:
 * - Async message processing with backpressure
 * - Connection health monitoring
 * - Graceful error handling and recovery
 * - Performance metrics collection
 * - Resource cleanup guarantees
 */
class OptimizedMCPWebSocketHandler(
    private val config: MCPConfiguration,
    private val methodHandler: McpMethodHandler,
    private val protocolHandler: JsonRpcProtocolHandler,
    private val connectionManager: MCPConnectionManager,
    private val resourceCache: MCPResourceCache
) {
    private val logger = LoggerFactory.getLogger(OptimizedMCPWebSocketHandler::class.java)
    private val json = Json { 
        ignoreUnknownKeys = true
        isLenient = true
    }
    
    // Message processing queue with backpressure
    private val messageQueue = Channel<ProcessingRequest>(
        capacity = config.connectionBufferSize
    )
    
    /**
     * Handle a WebSocket connection with optimized processing.
     */
    suspend fun handleConnection(session: WebSocketSession) {
        val connectionId = connectionManager.registerConnection(session) 
            ?: return // Connection rejected
        
        val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        
        try {
            // Start async message processor
            val processorJob = if (config.asyncProcessingEnabled) {
                scope.launch { processMessages() }
            } else null
            
            // Start connection health monitor
            val monitorJob = scope.launch {
                monitorConnectionHealth(connectionId)
            }
            
            // Main message loop
            handleMessageLoop(session, connectionId)
            
            // Cleanup
            processorJob?.cancelAndJoin()
            monitorJob.cancelAndJoin()
            
        } catch (e: ClosedReceiveChannelException) {
            logger.debug("Connection closed normally: $connectionId")
        } catch (e: CancellationException) {
            logger.debug("Connection cancelled: $connectionId")
        } catch (e: Exception) {
            logger.error("Connection error for $connectionId: ${e.message}", e)
            sendErrorAndClose(session, e)
        } finally {
            connectionManager.unregisterConnection(connectionId)
            scope.cancel()
        }
    }
    
    /**
     * Main message processing loop for a connection.
     */
    private suspend fun handleMessageLoop(
        session: WebSocketSession,
        connectionId: String
    ) {
        for (frame in session.incoming) {
            try {
                when (frame) {
                    is Frame.Text -> {
                        val processingTime = measureTimeMillis {
                            handleTextFrame(session, connectionId, frame)
                        }
                        
                        if (processingTime > config.slowRequestThreshold.inWholeMilliseconds) {
                            logger.warn("Slow request on $connectionId: ${processingTime}ms")
                        }
                    }
                    
                    is Frame.Ping -> {
                        session.send(Frame.Pong(frame.data))
                        if (config.detailedLogging) {
                            logger.debug("Ping/Pong for connection: $connectionId")
                        }
                    }
                    
                    is Frame.Close -> {
                        logger.info("Close frame received for connection: $connectionId")
                        break
                    }
                    
                    else -> {
                        logger.debug("Unsupported frame type from $connectionId: ${frame.frameType}")
                    }
                }
            } catch (e: Exception) {
                logger.error("Error processing frame from $connectionId: ${e.message}")
                if (!handleFrameError(session, e)) {
                    break // Fatal error, close connection
                }
            }
        }
    }
    
    /**
     * Handle a text frame with optimized processing.
     */
    private suspend fun handleTextFrame(
        session: WebSocketSession,
        connectionId: String,
        frame: Frame.Text
    ) {
        val messageText = frame.readText()
        
        if (config.detailedLogging) {
            logger.debug("Received from $connectionId: $messageText")
        }
        
        val response = processMessage(messageText, connectionId)
        
        if (response != null) {
            val responseText = protocolHandler.serializeResponse(response)
            
            if (config.detailedLogging) {
                logger.debug("Sending to $connectionId: $responseText")
            }
            
            session.send(Frame.Text(responseText))
        }
    }
    
    /**
     * Process a message with caching and optimization.
     */
    private suspend fun processMessage(
        messageText: String,
        connectionId: String
    ): JsonRpcResponse? {
        return try {
            val request = protocolHandler.parseRequest(messageText)
            
            // Check if it's a notification (no response needed)
            if (protocolHandler.isNotification(request)) {
                methodHandler.handleNotification(request)
                return null
            }
            
            // Check cache for resource reads
            if (request.method == "resources/read") {
                val cached = checkResourceCache(request)
                if (cached != null) return cached
            }
            
            // Process request
            val response = if (config.asyncProcessingEnabled && isAsyncMethod(request.method)) {
                withTimeout(config.requestTimeout) {
                    methodHandler.handleRequestAsync(request)
                }
            } else {
                methodHandler.handleRequest(request)
            }
            
            // Cache resource responses
            if (request.method == "resources/read") {
                cacheResourceResponse(request, response)
            }
            
            response
            
        } catch (e: kotlinx.serialization.SerializationException) {
            logger.error("Parse error from $connectionId: ${e.message}")
            protocolHandler.createErrorResponse(
                null,
                -32700,
                "Parse error",
                e.message
            )
        } catch (e: TimeoutCancellationException) {
            logger.error("Request timeout from $connectionId")
            protocolHandler.createErrorResponse(
                null,
                -32005,
                "Request timeout",
                "Request exceeded ${config.requestTimeout} timeout"
            )
        } catch (e: Exception) {
            logger.error("Processing error from $connectionId: ${e.message}", e)
            protocolHandler.createErrorResponse(
                null,
                -32603,
                "Internal error",
                if (config.detailedLogging) e.message else "Internal server error"
            )
        }
    }
    
    /**
     * Check resource cache for faster responses.
     */
    private suspend fun checkResourceCache(request: JsonRpcRequest): JsonRpcResponse? {
        if (!config.resourceCacheEnabled) return null
        
        try {
            val params = request.params as? kotlinx.serialization.json.JsonObject
            val uri = params?.get("uri")?.toString()?.trim('"')
            
            if (uri != null) {
                val cached = resourceCache.get(uri)
                if (cached != null) {
                    if (config.detailedLogging) {
                        logger.debug("Cache hit for resource: $uri")
                    }
                    
                    return protocolHandler.createResponse(
                        request.id,
                        kotlinx.serialization.json.buildJsonObject {
                            put("contents", kotlinx.serialization.json.buildJsonArray {
                                add(kotlinx.serialization.json.buildJsonObject {
                                    put("uri", kotlinx.serialization.json.JsonPrimitive(uri))
                                    put("mimeType", kotlinx.serialization.json.JsonPrimitive(cached.mimeType))
                                    put("text", kotlinx.serialization.json.JsonPrimitive(cached.content))
                                })
                            })
                        }
                    )
                }
            }
        } catch (e: Exception) {
            logger.debug("Cache check failed: ${e.message}")
        }
        
        return null
    }
    
    /**
     * Cache resource response for future requests.
     */
    private suspend fun cacheResourceResponse(
        request: JsonRpcRequest,
        response: JsonRpcResponse
    ) {
        if (!config.resourceCacheEnabled) return
        
        try {
            val params = request.params as? kotlinx.serialization.json.JsonObject
            val uri = params?.get("uri")?.toString()?.trim('"')
            
            if (uri != null && response.error == null) {
                val result = response.result as? kotlinx.serialization.json.JsonObject
                val contents = result?.get("contents") as? kotlinx.serialization.json.JsonArray
                val content = contents?.firstOrNull() as? kotlinx.serialization.json.JsonObject
                
                if (content != null) {
                    val text = content["text"]?.toString()?.trim('"') ?: ""
                    val mimeType = content["mimeType"]?.toString()?.trim('"') ?: "text/plain"
                    
                    resourceCache.put(uri, text, mimeType)
                }
            }
        } catch (e: Exception) {
            logger.debug("Failed to cache resource response: ${e.message}")
        }
    }
    
    /**
     * Process messages asynchronously from queue.
     */
    private suspend fun processMessages() {
        for (request in messageQueue) {
            try {
                val response = processMessage(request.message, request.connectionId)
                request.responseChannel.send(response)
            } catch (e: Exception) {
                logger.error("Async processing error: ${e.message}")
                request.responseChannel.send(null)
            }
        }
    }
    
    /**
     * Monitor connection health and cleanup if needed.
     */
    private suspend fun monitorConnectionHealth(connectionId: String) {
        coroutineScope {
            while (isActive) {
                delay(30_000) // Check every 30 seconds
                
                if (!connectionManager.isConnectionHealthy(connectionId)) {
                    logger.warn("Unhealthy connection detected: $connectionId")
                    // Could implement auto-recovery or notification here
                }
            }
        }
    }
    
    /**
     * Handle frame processing errors with recovery.
     */
    private suspend fun handleFrameError(
        session: WebSocketSession,
        error: Exception
    ): Boolean {
        return when (error) {
            is kotlinx.serialization.SerializationException -> {
                // Send parse error but keep connection open
                val errorResponse = protocolHandler.createErrorResponse(
                    null,
                    -32700,
                    "Parse error",
                    error.message
                )
                session.send(Frame.Text(protocolHandler.serializeResponse(errorResponse)))
                true
            }
            
            is TimeoutCancellationException -> {
                // Timeout, keep connection but log
                logger.warn("Request timeout: ${error.message}")
                true
            }
            
            is OutOfMemoryError -> {
                // Critical error, close connection
                logger.error("Out of memory, closing connection")
                false
            }
            
            else -> {
                // Unknown error, attempt to continue
                logger.error("Frame processing error: ${error.message}")
                true
            }
        }
    }
    
    /**
     * Send error response and close connection gracefully.
     */
    private suspend fun sendErrorAndClose(
        session: WebSocketSession,
        error: Exception
    ) {
        try {
            val errorResponse = protocolHandler.createErrorResponse(
                null,
                -32603,
                "Internal error",
                "Connection error: ${error.message}"
            )
            session.send(Frame.Text(protocolHandler.serializeResponse(errorResponse)))
            session.close(CloseReason(
                CloseReason.Codes.INTERNAL_ERROR,
                "Internal server error"
            ))
        } catch (e: Exception) {
            logger.debug("Failed to send error before close: ${e.message}")
        }
    }
    
    /**
     * Check if a method should be processed asynchronously.
     */
    private fun isAsyncMethod(method: String): Boolean {
        return method in setOf(
            "tools/call",
            "resources/read",
            "resources/subscribe"
        )
    }
    
    /**
     * Request for async processing.
     */
    private data class ProcessingRequest(
        val message: String,
        val connectionId: String,
        val responseChannel: Channel<JsonRpcResponse?>
    )
}