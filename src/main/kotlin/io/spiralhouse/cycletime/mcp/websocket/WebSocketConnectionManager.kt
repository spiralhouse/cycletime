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
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.time.toKotlinDuration
import java.io.IOException
import java.net.BindException

/**
 * WebSocket connection manager for the MCP server.
 * 
 * Manages WebSocket server lifecycle, connections, and message routing through
 * a modular architecture with separated concerns.
 * 
 * ## Core Interface for Connection Management
 * This abstraction allows for different transport mechanisms beyond WebSocket
 * (e.g., TCP sockets, named pipes, HTTP long polling) while maintaining
 * a consistent connection management API.
 * 
 * ## Design Principles
 * - Transport-agnostic connection management
 * - Lifecycle management with proper resource cleanup
 * - Support for multiple concurrent connections
 * - Integration with protocol handlers for message processing
 * 
 * ## Architecture
 * This class orchestrates several components:
 * - Server lifecycle management (start/stop)
 * - Connection tracking and state management
 * - Message routing through MessageHandler
 * - Heartbeat monitoring through HeartbeatManager
 * - Event notifications through ConnectionEventListener
 * 
 * ## Implementation Requirements
 * - Thread-safe connection tracking
 * - Graceful shutdown with connection cleanup
 * - Proper error propagation through exceptions
 * - Resource lifecycle management
 * 
 * ## Thread Safety
 * - All public methods are thread-safe
 * - Uses mutex for connection collection modifications
 * - Atomic operations for server state
 * 
 * ## Resource Management
 * - Proper cleanup on shutdown
 * - Graceful connection closure
 * - Coroutine scope management
 * 
 * @property config Configuration for the WebSocket server
 */
class WebSocketConnectionManager(
    private val config: WebSocketServerConfig = WebSocketServerConfig()
) {
    // Core components
    private var server: EmbeddedServer<*, *>? = null
    private val isServerRunning = AtomicBoolean(false)
    private val connections = ConcurrentHashMap<String, ActiveWebSocketSession>()
    private val connectionsMutex = Mutex()
    
    // Delegated responsibilities
    private var logger: WebSocketLogger = DefaultWebSocketLogger()
    private var messageHandler: MessageHandler = MessageHandler(config, logger)
    private val connectionFactory = ConnectionFactory()
    private val heartbeatManager = HeartbeatManager(
        config, 
        logger,
        connectionProvider = { connections.values }
    )
    
    // Event handling
    private val eventListeners = mutableListOf<ConnectionEventListener>()
    
    // Protocol handling
    private var protocolHandler: JsonRpcProtocolHandler? = null
    
    // Coroutine management
    private val supervisorJob = SupervisorJob()
    
    /**
     * Starts the connection manager and begins accepting connections.
     * 
     * This method:
     * 1. Configures the Ktor server with WebSocket support (if embedded mode)
     * 2. Starts listening on the configured port (if embedded mode)
     * 3. Initializes heartbeat monitoring if enabled
     * 4. Sets up routing for WebSocket connections (if embedded mode)
     * 
     * @throws WebSocketServerException if the server fails to start
     */
    suspend fun start() {
        if (isServerRunning.get()) {
            logger.logInfo("Server is already running on port ${config.port}")
            return
        }
        
        try {
            // Only create embedded server if in embedded mode
            if (config.embeddedMode) {
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
                logger.logInfo("WebSocket server started on port ${config.port}")
            } else {
                // In integrated mode, we don't create a server
                logger.logInfo("WebSocket connection manager initialized (integrated mode)")
            }
            
            isServerRunning.set(true)
            
            // Start heartbeat manager
            heartbeatManager.start()
            
        } catch (e: BindException) {
            throw WebSocketServerException("Port ${config.port} already in use", e)
        } catch (e: IOException) {
            throw WebSocketServerException("Network error starting WebSocket server on port ${config.port}", e)
        } catch (e: IllegalArgumentException) {
            throw WebSocketServerException("Invalid configuration for WebSocket server", e)
        } catch (e: IllegalStateException) {
            throw WebSocketServerException("WebSocket server already running or in invalid state", e)
        }
    }
    
    /**
     * Stops the connection manager and closes all active connections.
     * 
     * This method should:
     * - Close all active connections gracefully
     * - Clean up any resources
     * - Cancel any background jobs
     * - Be idempotent (safe to call multiple times)
     * 
     * Implementation details:
     * 1. Stops heartbeat monitoring
     * 2. Closes all active connections
     * 3. Shuts down the server
     * 4. Cleans up resources
     */
    suspend fun stop() {
        if (!isServerRunning.get()) {
            return
        }
        
        logger.logInfo("Stopping WebSocket server...")
        
        // Stop heartbeat manager
        heartbeatManager.stop()
        
        // Close all connections
        closeAllConnections()
        
        // Stop server (only if in embedded mode)
        if (config.embeddedMode) {
            server?.stop(1000, 2000)
            server = null
        }
        isServerRunning.set(false)
        
        // Cancel coroutine scope
        supervisorJob.cancel()
        
        logger.logInfo("WebSocket server stopped")
    }
    
    /**
     * Checks if the connection manager is currently running.
     * 
     * @return true if the manager is accepting connections, false otherwise
     */
    fun isRunning(): Boolean = isServerRunning.get()
    
    /**
     * Gets the port number the server is listening on.
     * 
     * @return the configured port number
     */
    fun getPort(): Int = config.port
    
    /**
     * Checks if SSL/TLS is supported by this connection manager.
     * 
     * @return true if SSL is enabled, false otherwise
     */
    fun supportsSSL(): Boolean = config.enableSsl
    
    /**
     * Sets the protocol handler for processing messages.
     * 
     * The protocol handler is responsible for:
     * - Parsing incoming messages
     * - Routing to appropriate handlers
     * - Generating responses
     * - Managing protocol-specific concerns
     * 
     * @param handler the protocol handler to use for message processing
     */
    fun setProtocolHandler(handler: JsonRpcProtocolHandler) {
        this.protocolHandler = handler
        messageHandler.setProtocolHandler(handler)
    }
    
    /**
     * Gets all currently active connections.
     * 
     * @return a list of active connection states
     */
    suspend fun getActiveConnections(): List<WebSocketConnection> {
        return connectionsMutex.withLock {
            connections.values.map { it.toConnection() }
        }
    }
    
    /**
     * Gets a specific connection by its unique identifier.
     * 
     * @param id the connection identifier
     * @return the connection if found, null otherwise
     */
    suspend fun getConnectionById(id: String): WebSocketConnection? {
        return connectionsMutex.withLock {
            connections[id]?.toConnection()
        }
    }
    
    /**
     * Registers a method handler for JSON-RPC requests.
     * 
     * @param method the JSON-RPC method name
     * @param handler the handler function for this method
     */
    fun registerMethodHandler(method: String, handler: (JsonRpcRequest) -> JsonRpcResponse) {
        messageHandler.registerMethodHandler(method, handler)
    }
    
    /**
     * Gets the maximum message queue size for connections.
     * 
     * @return the configured message queue size
     */
    fun getMessageQueueSize(): Int = config.messageQueueSize
    
    /**
     * Sets the logger for connection manager operations.
     * 
     * @param logger the logger implementation to use
     */
    fun setLogger(logger: WebSocketLogger) {
        this.logger = logger
    }
    
    /**
     * Adds an event listener for connection events.
     * 
     * @param listener the event listener to add
     */
    fun addEventListener(listener: ConnectionEventListener) {
        eventListeners.add(listener)
    }
    
    /**
     * Removes an event listener.
     * 
     * @param listener the event listener to remove
     */
    fun removeEventListener(listener: ConnectionEventListener) {
        eventListeners.remove(listener)
    }
    
    /**
     * Sets the message handler for processing incoming messages.
     * 
     * @param handler the message handler to set
     */
    fun setMessageHandler(handler: MessageHandler) {
        this.messageHandler = handler
    }
    
    /**
     * Gets the current number of active connections.
     * 
     * @return the number of active connections
     */
    fun getActiveConnectionCount(): Int {
        return connections.size
    }
    
    // Private implementation methods
    
    /**
     * Handles a new WebSocket connection.
     * 
     * @param session the WebSocket session to handle
     */
    private suspend fun handleConnection(session: DefaultWebSocketSession) {
        val activeSession = connectionFactory.createConnection(session)
        val connectionId = activeSession.id
        
        // Add to connections
        connectionsMutex.withLock {
            connections[connectionId] = activeSession
        }
        
        logger.logInfo("New WebSocket connection: $connectionId")
        
        // Notify listeners
        notifyConnectionEstablished(activeSession.toConnection())
        
        try {
            // Handle incoming messages
            for (frame in session.incoming) {
                when (frame) {
                    is Frame.Text -> {
                        handleTextFrame(activeSession, frame.readText())
                    }
                    is Frame.Binary -> {
                        handleBinaryFrame(activeSession, frame.data)
                    }
                    is Frame.Pong -> {
                        handlePongFrame(activeSession)
                    }
                    is Frame.Ping -> {
                        handlePingFrame(activeSession, frame)
                    }
                    is Frame.Close -> {
                        logger.logInfo("Connection closed by client: $connectionId")
                        notifyConnectionClosed(connectionId, "Client initiated close")
                        break
                    }
                }
            }
        } catch (e: ClosedReceiveChannelException) {
            logger.logInfo("Connection closed gracefully: $connectionId")
            notifyConnectionClosed(connectionId, "Channel closed")
            // Graceful close - re-throw to ensure calling code knows connection closed
            throw IllegalStateException("WebSocket connection closed gracefully", e)
        } catch (e: IOException) {
            logger.logError("Network error in connection $connectionId", e)
            notifyConnectionError(connectionId, e)
        } catch (e: IllegalArgumentException) {
            logger.logError("Invalid data received from connection $connectionId", e)
            notifyConnectionError(connectionId, e)
        } finally {
            // Remove from connections
            connectionsMutex.withLock {
                connections.remove(connectionId)
            }
            logger.logInfo("Removed connection: $connectionId")
            
            // Ensure listeners are notified if not already done
            if (!activeSession.session.closeReason.isCompleted) {
                notifyConnectionClosed(connectionId, "Unexpected closure")
            }
        }
    }
    
    /**
     * Handles incoming text frames.
     */
    private suspend fun handleTextFrame(session: ActiveWebSocketSession, text: String) {
        session.updateActivity()
        heartbeatManager.recordActivity(session.id)
        notifyMessageReceived(session.id, text.length)
        
        val response = messageHandler.handleTextMessage(session.id, text)
        if (response != null) {
            session.session.send(Frame.Text(response))
            notifyMessageSent(session.id, response.length)
            logger.logDebug("Sent response to ${session.id}")
        }
    }
    
    /**
     * Handles incoming binary frames.
     */
    private suspend fun handleBinaryFrame(session: ActiveWebSocketSession, data: ByteArray) {
        session.updateActivity()
        heartbeatManager.recordActivity(session.id)
        notifyMessageReceived(session.id, data.size)
        
        val response = messageHandler.handleBinaryMessage(session.id, data)
        if (response != null) {
            // We don't support binary responses, but keeping the interface
            logger.logError("Binary response not supported", null)
        } else {
            // Send error as text
            val handler = protocolHandler
            if (handler != null) {
                val errorResponse = handler.createErrorResponse(
                    null,
                    -32600,
                    "Binary frames not supported",
                    null
                )
                session.session.send(Frame.Text(handler.serializeResponse(errorResponse)))
            }
        }
    }
    
    /**
     * Handles pong frames (heartbeat response).
     */
    private fun handlePongFrame(session: ActiveWebSocketSession) {
        session.updateActivity()
        heartbeatManager.recordActivity(session.id)
        logger.logDebug("Received pong from ${session.id}")
    }
    
    /**
     * Handles ping frames (heartbeat request).
     */
    private suspend fun handlePingFrame(session: ActiveWebSocketSession, frame: Frame.Ping) {
        session.updateActivity()
        heartbeatManager.recordActivity(session.id)
        session.session.send(Frame.Pong(frame.buffer))
        logger.logDebug("Replied to ping from ${session.id}")
    }
    
    /**
     * Event notification helpers
     */
    private fun notifyConnectionEstablished(connection: WebSocketConnection) {
        eventListeners.forEach { listener ->
            try {
                listener.onConnectionEstablished(connection)
            } catch (e: IllegalStateException) {
                logger.logError("Listener in invalid state during connection established notification", e)
            } catch (e: IllegalArgumentException) {
                logger.logError("Invalid argument in connection established listener", e)
            } catch (e: UnsupportedOperationException) {
                logger.logError("Unsupported operation in connection established listener", e)
            }
        }
    }
    
    private fun notifyConnectionClosed(connectionId: String, reason: String?) {
        eventListeners.forEach { listener ->
            try {
                listener.onConnectionClosed(connectionId, reason)
            } catch (e: IllegalStateException) {
                logger.logError("Listener in invalid state during connection closed notification", e)
            } catch (e: IllegalArgumentException) {
                logger.logError("Invalid argument in connection closed listener", e)
            } catch (e: UnsupportedOperationException) {
                logger.logError("Unsupported operation in connection closed listener", e)
            }
        }
    }
    
    private fun notifyMessageReceived(connectionId: String, messageSize: Int) {
        eventListeners.forEach { listener ->
            try {
                listener.onMessageReceived(connectionId, messageSize)
            } catch (e: IllegalStateException) {
                logger.logError("Listener in invalid state during message received notification", e)
            } catch (e: IllegalArgumentException) {
                logger.logError("Invalid argument in message received listener", e)
            } catch (e: UnsupportedOperationException) {
                logger.logError("Unsupported operation in message received listener", e)
            }
        }
    }
    
    private fun notifyMessageSent(connectionId: String, messageSize: Int) {
        eventListeners.forEach { listener ->
            try {
                listener.onMessageSent(connectionId, messageSize)
            } catch (e: IllegalStateException) {
                logger.logError("Listener in invalid state during message sent notification", e)
            } catch (e: IllegalArgumentException) {
                logger.logError("Invalid argument in message sent listener", e)
            } catch (e: UnsupportedOperationException) {
                logger.logError("Unsupported operation in message sent listener", e)
            }
        }
    }
    
    private fun notifyConnectionError(connectionId: String, error: Throwable) {
        eventListeners.forEach { listener ->
            try {
                listener.onConnectionError(connectionId, error)
            } catch (e: IllegalStateException) {
                logger.logError("Listener in invalid state during connection error notification", e)
            } catch (e: IllegalArgumentException) {
                logger.logError("Invalid argument in connection error listener", e)
            } catch (e: UnsupportedOperationException) {
                logger.logError("Unsupported operation in connection error listener", e)
            }
        }
    }
    
    // Note: Connection timeout notification is handled by HeartbeatManager
    // This method is kept for future use when implementing timeout notifications
    @Suppress("UnusedPrivateMember")
    private fun notifyConnectionTimeout(connectionId: String) {
        eventListeners.forEach { listener ->
            try {
                listener.onConnectionTimeout(connectionId)
            } catch (e: IllegalStateException) {
                logger.logError("Listener in invalid state during connection timeout notification", e)
            } catch (e: IllegalArgumentException) {
                logger.logError("Invalid argument in connection timeout listener", e)
            } catch (e: UnsupportedOperationException) {
                logger.logError("Unsupported operation in connection timeout listener", e)
            }
        }
    }
    
    /**
     * Closes all active connections during shutdown.
     */
    private suspend fun closeAllConnections() {
        val connectionsToClose = connectionsMutex.withLock {
            connections.values.toList()
        }
        
        connectionsToClose.forEach { session ->
            try {
                session.session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Server shutting down"))
                notifyConnectionClosed(session.id, "Server shutdown")
            } catch (e: IOException) {
                logger.logError("Network error closing connection ${session.id}", e)
            } catch (e: IllegalStateException) {
                logger.logError("Connection ${session.id} already closed or in invalid state", e)
            } catch (e: IllegalArgumentException) {
                logger.logError("Invalid argument closing connection ${session.id}", e)
            }
        }
        
        connectionsMutex.withLock {
            connections.clear()
        }
    }
}