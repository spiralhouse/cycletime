package io.spiralhouse.cycletime.mcp.websocket

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.cio.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonPrimitive
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference
import java.util.concurrent.atomic.AtomicBoolean
import java.util.UUID
import kotlin.time.Duration.Companion.seconds
import kotlin.time.toKotlinDuration

/**
 * WebSocket Connection Manager implementation.
 * 
 * Manages WebSocket server lifecycle, connections, and message routing to the JSON-RPC protocol handler.
 */
class WebSocketConnectionManager(
    private val config: WebSocketServerConfig = WebSocketServerConfig()
) {
    private var server: EmbeddedServer<*, *>? = null
    private val isServerRunning = AtomicBoolean(false)
    private val connections = ConcurrentHashMap<String, ActiveWebSocketSession>()
    private val connectionsMutex = Mutex()
    
    private var protocolHandler: JsonRpcProtocolHandler? = null
    private var logger: WebSocketLogger = DefaultWebSocketLogger()
    private val methodHandlers = ConcurrentHashMap<String, (JsonRpcRequest) -> JsonRpcResponse>()
    
    private var heartbeatJob: Job? = null
    private val supervisorJob = SupervisorJob()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + supervisorJob)
    
    /**
     * Starts the WebSocket server.
     */
    suspend fun start() {
        if (isServerRunning.get()) {
            logger.logInfo("Server is already running on port ${config.port}")
            return
        }
        
        try {
            server = embeddedServer(CIO, port = config.port, host = "0.0.0.0") {
                install(WebSockets) {
                    pingPeriod = config.heartbeatInterval.toKotlinDuration()
                    timeout = config.connectionTimeout.toKotlinDuration()
                    maxFrameSize = config.maxMessageSize.toLong()
                    masking = false
                }
                
                routing {
                    // Handle non-WebSocket requests with proper error
                    get("/") {
                        call.respondText(
                            "WebSocket endpoint. Use ws:// or wss:// protocol.",
                            status = HttpStatusCode.BadRequest
                        )
                    }
                    
                    webSocket("/") {
                        handleConnection(this)
                    }
                }
            }
            
            server?.start(wait = false)
            isServerRunning.set(true)
            logger.logInfo("WebSocket server started on port ${config.port}")
            
            // Start heartbeat if enabled
            if (config.heartbeatInterval > Duration.ZERO) {
                startHeartbeat()
            }
            
        } catch (e: Exception) {
            throw WebSocketServerException("Failed to start WebSocket server on port ${config.port}", e)
        }
    }
    
    /**
     * Stops the WebSocket server.
     */
    suspend fun stop() {
        if (!isServerRunning.get()) {
            return
        }
        
        logger.logInfo("Stopping WebSocket server...")
        
        // Stop heartbeat
        heartbeatJob?.cancel()
        heartbeatJob = null
        
        // Close all connections
        closeAllConnections()
        
        // Stop server
        server?.stop(1000, 2000)
        server = null
        isServerRunning.set(false)
        
        // Cancel coroutine scope
        supervisorJob.cancel()
        
        logger.logInfo("WebSocket server stopped")
    }
    
    /**
     * Checks if the server is running.
     */
    fun isRunning(): Boolean = isServerRunning.get()
    
    /**
     * Gets the configured port.
     */
    fun getPort(): Int = config.port
    
    /**
     * Checks if SSL is supported.
     */
    fun supportsSSL(): Boolean = config.enableSSL
    
    /**
     * Sets the protocol handler for processing JSON-RPC messages.
     */
    fun setProtocolHandler(handler: JsonRpcProtocolHandler) {
        this.protocolHandler = handler
    }
    
    /**
     * Gets all active connections.
     */
    suspend fun getActiveConnections(): List<WebSocketConnection> {
        return connectionsMutex.withLock {
            connections.values.map { it.toConnection() }
        }
    }
    
    /**
     * Gets a connection by ID.
     */
    suspend fun getConnectionById(id: String): WebSocketConnection? {
        return connectionsMutex.withLock {
            connections[id]?.toConnection()
        }
    }
    
    /**
     * Registers a method handler.
     */
    fun registerMethodHandler(method: String, handler: (JsonRpcRequest) -> JsonRpcResponse) {
        methodHandlers[method] = handler
    }
    
    /**
     * Gets the current message queue size (simplified implementation).
     */
    fun getMessageQueueSize(): Int = config.messageQueueSize
    
    /**
     * Sets the logger.
     */
    fun setLogger(logger: WebSocketLogger) {
        this.logger = logger
    }
    
    // Private implementation methods
    
    private suspend fun handleConnection(session: DefaultWebSocketSession) {
        val connectionId = UUID.randomUUID().toString()
        val now = Instant.now()
        val activeSession = ActiveWebSocketSession(
            id = connectionId,
            session = session,
            connectedAt = now,
            lastActivity = AtomicReference(now)
        )
        
        // Add to connections
        connectionsMutex.withLock {
            connections[connectionId] = activeSession
        }
        
        logger.logInfo("New WebSocket connection: $connectionId")
        
        try {
            // Handle incoming messages
            for (frame in session.incoming) {
                when (frame) {
                    is Frame.Text -> {
                        handleTextFrame(activeSession, frame.readText())
                    }
                    is Frame.Binary -> {
                        handleBinaryFrame(activeSession)
                    }
                    is Frame.Pong -> {
                        activeSession.updateActivity()
                        logger.logDebug("Received pong from $connectionId")
                    }
                    is Frame.Ping -> {
                        activeSession.updateActivity()
                        session.send(Frame.Pong(frame.buffer))
                        logger.logDebug("Replied to ping from $connectionId")
                    }
                    is Frame.Close -> {
                        logger.logInfo("Connection closed by client: $connectionId")
                        break
                    }
                }
            }
        } catch (e: ClosedReceiveChannelException) {
            logger.logInfo("Connection closed: $connectionId")
        } catch (e: Exception) {
            logger.logError("Error in connection $connectionId", e)
        } finally {
            // Remove from connections
            connectionsMutex.withLock {
                connections.remove(connectionId)
            }
            logger.logInfo("Removed connection: $connectionId")
        }
    }
    
    private suspend fun handleTextFrame(session: ActiveWebSocketSession, text: String) {
        session.updateActivity()
        
        if (text.length > config.maxMessageSize) {
            logger.logError("Message too large from ${session.id}: ${text.length} bytes", null)
            return
        }
        
        try {
            val handler = protocolHandler
            if (handler == null) {
                logger.logError("No protocol handler set", null)
                return
            }
            
            // Try to parse as JSON-RPC request
            val request = try {
                handler.parseRequest(text)
            } catch (e: Exception) {
                logger.logError("Failed to parse JSON-RPC request from ${session.id}", e)
                val errorResponse = handler.createErrorResponse(
                    null,
                    -32700, // Parse error
                    "Parse error",
                    null
                )
                session.session.send(Frame.Text(handler.serializeResponse(errorResponse)))
                return
            }
            
            // Handle the request
            val response = handleJsonRpcRequest(request)
            
            // Send response (only for non-notifications)
            if (response != null && !handler.isNotification(request)) {
                val responseJson = handler.serializeResponse(response)
                session.session.send(Frame.Text(responseJson))
                logger.logDebug("Sent response to ${session.id}")
            }
            
        } catch (e: Exception) {
            logger.logError("Error processing message from ${session.id}", e)
        }
    }
    
    private suspend fun handleBinaryFrame(session: ActiveWebSocketSession) {
        session.updateActivity()
        logger.logError("Binary frames not supported", null)
        
        // Send error response for binary frames
        val handler = protocolHandler
        if (handler != null) {
            val errorResponse = handler.createErrorResponse(
                null,
                -32600, // Invalid request
                "Binary frames not supported",
                null
            )
            session.session.send(Frame.Text(handler.serializeResponse(errorResponse)))
        }
    }
    
    private fun handleJsonRpcRequest(request: JsonRpcRequest): JsonRpcResponse? {
        val handler = protocolHandler ?: return null
        
        // Check if it's a notification
        if (handler.isNotification(request)) {
            return handler.handleNotification(request)
        }
        
        // Try registered method handlers first
        val methodHandler = methodHandlers[request.method]
        if (methodHandler != null) {
            return try {
                methodHandler(request)
            } catch (e: Exception) {
                handler.createErrorResponse(
                    request.id,
                    -32603, // Internal error
                    "Method execution failed: ${e.message}",
                    null
                )
            }
        }
        
        // Default response for unknown methods
        return handler.createErrorResponse(
            request.id,
            -32601, // Method not found
            "Method not found: ${request.method}",
            null
        )
    }
    
    private fun startHeartbeat() {
        heartbeatJob = coroutineScope.launch {
            while (isActive && isServerRunning.get()) {
                delay(config.heartbeatInterval.toMillis())
                
                val connectionsToCheck = connectionsMutex.withLock {
                    connections.values.toList()
                }
                
                connectionsToCheck.forEach { session ->
                    try {
                        // Send ping
                        session.session.send(Frame.Ping(ByteArray(0)))
                        logger.logDebug("Sent ping to ${session.id}")
                        
                        // Check for timeout
                        val timeSinceActivity = Duration.between(session.lastActivity.get(), Instant.now())
                        if (timeSinceActivity > config.connectionTimeout) {
                            logger.logInfo("Connection timed out: ${session.id}")
                            session.session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Connection timeout"))
                        }
                        
                    } catch (e: Exception) {
                        logger.logError("Error sending ping to ${session.id}", e)
                    }
                }
            }
        }
    }
    
    private suspend fun closeAllConnections() {
        val connectionsToClose = connectionsMutex.withLock {
            connections.values.toList()
        }
        
        connectionsToClose.forEach { session ->
            try {
                session.session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Server shutting down"))
            } catch (e: Exception) {
                logger.logError("Error closing connection ${session.id}", e)
            }
        }
        
        connectionsMutex.withLock {
            connections.clear()
        }
    }
}