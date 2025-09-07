package io.spiralhouse.cycletime.mcp.websocket

import io.ktor.websocket.*
import kotlinx.coroutines.*
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Default implementation of the HeartbeatManager interface.
 * 
 * Manages WebSocket ping-pong heartbeats and connection timeouts using
 * coroutines for non-blocking operation.
 * 
 * ## Implementation Strategy
 * - Uses a supervisor job for fault isolation
 * - Periodic coroutine for heartbeat checks
 * - Thread-safe activity tracking with ConcurrentHashMap
 * - Graceful handling of connection failures
 * 
 * ## Performance Considerations
 * - Heartbeat operations run on IO dispatcher
 * - Batch processing of connections to minimize overhead
 * - Non-blocking send operations
 */
class DefaultHeartbeatManager(
    private val config: WebSocketServerConfig,
    private val logger: WebSocketLogger,
    private val connectionProvider: () -> Collection<ActiveWebSocketSession>
) : HeartbeatManager {
    
    private val isRunning = AtomicBoolean(false)
    private var heartbeatJob: Job? = null
    private val supervisorJob = SupervisorJob()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + supervisorJob)
    private val lastActivityMap = ConcurrentHashMap<String, Instant>()
    
    override suspend fun start() {
        if (isRunning.compareAndSet(false, true)) {
            if (config.heartbeatInterval > Duration.ZERO) {
                startHeartbeatLoop()
                logger.logInfo("Heartbeat manager started with interval: ${config.heartbeatInterval}")
            }
        }
    }
    
    override suspend fun stop() {
        if (isRunning.compareAndSet(true, false)) {
            heartbeatJob?.cancel()
            heartbeatJob = null
            supervisorJob.cancel()
            lastActivityMap.clear()
            logger.logInfo("Heartbeat manager stopped")
        }
    }
    
    override fun isRunning(): Boolean = isRunning.get()
    
    override fun getHeartbeatInterval(): Duration = config.heartbeatInterval
    
    override fun getConnectionTimeout(): Duration = config.connectionTimeout
    
    override fun recordActivity(connectionId: String) {
        lastActivityMap[connectionId] = Instant.now()
    }
    
    override fun isConnectionTimedOut(connectionId: String): Boolean {
        val lastActivity = lastActivityMap[connectionId] ?: return true
        val timeSinceActivity = Duration.between(lastActivity, Instant.now())
        return timeSinceActivity > config.connectionTimeout
    }
    
    private fun startHeartbeatLoop() {
        heartbeatJob = coroutineScope.launch {
            while (isActive && isRunning.get()) {
                delay(config.heartbeatInterval.toMillis())
                checkConnections()
            }
        }
    }
    
    private suspend fun checkConnections() {
        val connections = connectionProvider()
        
        connections.forEach { session ->
            try {
                sendPingAndCheckTimeout(session)
            } catch (e: Exception) {
                logger.logError("Error during heartbeat for ${session.id}", e)
            }
        }
        
        // Clean up inactive connections from tracking
        val activeIds = connections.map { it.id }.toSet()
        lastActivityMap.keys.removeIf { it !in activeIds }
    }
    
    private suspend fun sendPingAndCheckTimeout(session: ActiveWebSocketSession) {
        try {
            // Send ping frame
            session.session.send(Frame.Ping(ByteArray(0)))
            logger.logDebug("Sent ping to ${session.id}")
            
            // Record this as activity (we're actively pinging)
            recordActivity(session.id)
            
            // Check for timeout based on session's last activity
            val timeSinceActivity = Duration.between(session.lastActivity.get(), Instant.now())
            if (timeSinceActivity > config.connectionTimeout) {
                logger.logInfo("Connection timed out: ${session.id}")
                closeConnection(session)
            }
        } catch (e: Exception) {
            logger.logError("Failed to send ping to ${session.id}", e)
            // Connection might be dead, try to close it
            closeConnection(session)
        }
    }
    
    private suspend fun closeConnection(session: ActiveWebSocketSession) {
        try {
            session.session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Connection timeout"))
        } catch (e: Exception) {
            logger.logDebug("Error closing timed-out connection ${session.id}: ${e.message}")
        }
    }
}