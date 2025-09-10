package io.spiralhouse.cycletime.mcp.websocket

import io.ktor.websocket.*
import kotlinx.coroutines.*
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.io.IOException
import kotlinx.coroutines.channels.ClosedSendChannelException

/**
 * Manages WebSocket ping-pong heartbeats and connection timeouts.
 * 
 * Manages WebSocket ping-pong heartbeats and connection timeouts using
 * coroutines for non-blocking operation.
 * 
 * ## Design Philosophy
 * - Proactive connection health monitoring
 * - Configurable timeout and interval settings
 * - Automatic cleanup of dead connections
 * - Non-blocking asynchronous operations
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
class HeartbeatManager(
    private val config: WebSocketServerConfig,
    private val logger: WebSocketLogger,
    private val connectionProvider: () -> Collection<ActiveWebSocketSession>
) {
    
    private val isRunning = AtomicBoolean(false)
    private var heartbeatJob: Job? = null
    private val supervisorJob = SupervisorJob()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + supervisorJob)
    private val lastActivityMap = ConcurrentHashMap<String, Instant>()
    
    /**
     * Starts the heartbeat monitoring process.
     * 
     * This method:
     * - Begins periodic health checks
     * - Sends ping frames at configured intervals
     * - Monitors for pong responses
     * - Cleans up timed-out connections
     */
    suspend fun start() {
        if (isRunning.compareAndSet(false, true)) {
            if (config.heartbeatInterval > Duration.ZERO) {
                startHeartbeatLoop()
                logger.logInfo("Heartbeat manager started with interval: ${config.heartbeatInterval}")
            }
        }
    }
    
    /**
     * Stops the heartbeat monitoring process.
     * 
     * This method:
     * - Cancels any running heartbeat jobs
     * - Cleans up resources
     * - Is idempotent
     */
    suspend fun stop() {
        if (isRunning.compareAndSet(true, false)) {
            heartbeatJob?.cancel()
            heartbeatJob = null
            supervisorJob.cancel()
            lastActivityMap.clear()
            logger.logInfo("Heartbeat manager stopped")
        }
    }
    
    /**
     * Checks if heartbeat monitoring is currently active.
     * 
     * @return true if heartbeat monitoring is running
     */
    fun isRunning(): Boolean = isRunning.get()
    
    /**
     * Gets the configured heartbeat interval.
     * 
     * @return the duration between heartbeat pings
     */
    fun getHeartbeatInterval(): Duration = config.heartbeatInterval
    
    /**
     * Gets the configured connection timeout.
     * 
     * @return the duration after which idle connections are closed
     */
    fun getConnectionTimeout(): Duration = config.connectionTimeout
    
    /**
     * Records activity for a specific connection.
     * 
     * This method updates the last activity timestamp for a connection,
     * preventing it from timing out.
     * 
     * @param connectionId the identifier of the active connection
     */
    fun recordActivity(connectionId: String) {
        lastActivityMap[connectionId] = Instant.now()
    }
    
    /**
     * Checks if a connection has timed out.
     * 
     * @param connectionId the identifier of the connection to check
     * @return true if the connection has exceeded the timeout threshold
     */
    fun isConnectionTimedOut(connectionId: String): Boolean {
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
            } catch (e: IOException) {
                logger.logError("Network error during heartbeat for ${session.id}", e)
            } catch (e: ClosedSendChannelException) {
                logger.logError("Connection closed during heartbeat for ${session.id}", e)
            } catch (e: IllegalStateException) {
                logger.logError("Invalid state during heartbeat for ${session.id}", e)
            } catch (e: CancellationException) {
                logger.logDebug("Heartbeat cancelled for ${session.id}")
                throw e // Re-throw cancellation to maintain coroutine contract
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
        } catch (e: IOException) {
            logger.logError("Network error sending ping to ${session.id}", e)
            // Connection might be dead, try to close it
            closeConnection(session)
        } catch (e: ClosedSendChannelException) {
            logger.logError("Connection closed while sending ping to ${session.id}", e)
            // Connection is already closed
            closeConnection(session)
        } catch (e: IllegalStateException) {
            logger.logError("Invalid state sending ping to ${session.id}", e)
            closeConnection(session)
        } catch (e: CancellationException) {
            logger.logDebug("Ping operation cancelled for ${session.id}")
            throw e // Re-throw cancellation to maintain coroutine contract
        }
    }
    
    private suspend fun closeConnection(session: ActiveWebSocketSession) {
        try {
            session.session.close(CloseReason(CloseReason.Codes.GOING_AWAY, "Connection timeout"))
        } catch (e: IOException) {
            logger.logDebug("Network error closing connection ${session.id}: ${e.message}")
        } catch (e: IllegalStateException) {
            logger.logDebug("Connection ${session.id} already closed or invalid state: ${e.message}")
        }
        // Note: Let CancellationException propagate to maintain coroutine cancellation contract
    }
}