package io.spiralhouse.cycletime.mcp.server

import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.slf4j.LoggerFactory
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.system.measureTimeMillis

/**
 * Connection information for tracking and monitoring.
 */
data class ConnectionInfo(
    val id: String,
    val session: WebSocketSession,
    val connectedAt: Long = System.currentTimeMillis(),
    var lastActivity: Long = System.currentTimeMillis(),
    var requestCount: AtomicLong = AtomicLong(0),
    var errorCount: AtomicInteger = AtomicInteger(0),
    val metadata: MutableMap<String, Any> = ConcurrentHashMap()
)

/**
 * Production-ready WebSocket connection manager with optimized resource management.
 * 
 * Features:
 * - Connection pooling and limits
 * - Graceful degradation under load
 * - Memory-efficient frame processing
 * - Connection health monitoring
 * - Automatic cleanup of stale connections
 */
class MCPConnectionManager(
    private val config: MCPConfiguration
) {
    private val logger = LoggerFactory.getLogger(MCPConnectionManager::class.java)
    private val connections = ConcurrentHashMap<String, ConnectionInfo>()
    private val connectionCount = AtomicInteger(0)
    private val totalRequests = AtomicLong(0)
    private val totalErrors = AtomicLong(0)
    private val connectionMutex = Mutex()
    
    // Performance metrics
    private val requestLatencies = mutableListOf<Long>()
    private val latencyMutex = Mutex()
    private val maxLatencySamples = 1000
    
    // Frame processing optimization
    private val frameBuffer = Channel<Pair<String, Frame>>(capacity = Channel.BUFFERED)
    
    /**
     * Register a new WebSocket connection.
     * 
     * @return Connection ID if accepted, null if rejected
     */
    suspend fun registerConnection(session: WebSocketSession): String? {
        return connectionMutex.withLock {
            if (connectionCount.get() >= config.maxConnections) {
                logger.warn("Connection rejected: max connections (${config.maxConnections}) reached")
                session.close(CloseReason(
                    CloseReason.Codes.TRY_AGAIN_LATER,
                    "Server at capacity"
                ))
                return null
            }
            
            val connectionId = generateConnectionId()
            val info = ConnectionInfo(connectionId, session)
            connections[connectionId] = info
            connectionCount.incrementAndGet()
            
            logger.info("Connection registered: $connectionId (active: ${connectionCount.get()})")
            connectionId
        }
    }
    
    /**
     * Unregister a WebSocket connection.
     */
    suspend fun unregisterConnection(connectionId: String) {
        connectionMutex.withLock {
            connections.remove(connectionId)?.let { info ->
                connectionCount.decrementAndGet()
                val duration = System.currentTimeMillis() - info.connectedAt
                
                logger.info(
                    "Connection unregistered: $connectionId " +
                    "(duration: ${duration}ms, requests: ${info.requestCount.get()}, " +
                    "errors: ${info.errorCount.get()}, active: ${connectionCount.get()})"
                )
            }
        }
    }
    
    /**
     * Process an incoming frame with optimized handling.
     */
    suspend fun processFrame(
        connectionId: String,
        frame: Frame,
        handler: suspend (String) -> String
    ): String? {
        val connection = connections[connectionId] ?: return null
        
        return when (frame) {
            is Frame.Text -> {
                val processingTime = measureTimeMillis {
                    connection.lastActivity = System.currentTimeMillis()
                    connection.requestCount.incrementAndGet()
                    totalRequests.incrementAndGet()
                }
                
                try {
                    val response = measureAndProcess(frame.readText(), handler)
                    recordLatency(processingTime)
                    response
                } catch (e: Exception) {
                    connection.errorCount.incrementAndGet()
                    totalErrors.incrementAndGet()
                    throw e
                }
            }
            is Frame.Binary -> {
                logger.warn("Binary frames not supported for connection: $connectionId")
                null
            }
            else -> null
        }
    }
    
    /**
     * Send a frame to a specific connection with error handling.
     */
    suspend fun sendFrame(connectionId: String, frame: Frame): Boolean {
        val connection = connections[connectionId] ?: return false
        
        return try {
            connection.session.send(frame)
            connection.lastActivity = System.currentTimeMillis()
            true
        } catch (e: CancellationException) {
            logger.debug("Send cancelled for connection: $connectionId")
            false
        } catch (e: Exception) {
            logger.error("Failed to send frame to connection $connectionId: ${e.message}")
            connection.errorCount.incrementAndGet()
            false
        }
    }
    
    /**
     * Get current connection statistics.
     */
    fun getStatistics(): ConnectionStatistics {
        val now = System.currentTimeMillis()
        val activeConnections = connections.values.map { info ->
            ConnectionStat(
                id = info.id,
                duration = now - info.connectedAt,
                requests = info.requestCount.get(),
                errors = info.errorCount.get(),
                lastActivity = now - info.lastActivity
            )
        }
        
        val avgLatency = if (requestLatencies.isNotEmpty()) {
            requestLatencies.average().toLong()
        } else 0L
        
        return ConnectionStatistics(
            activeCount = connectionCount.get(),
            totalRequests = totalRequests.get(),
            totalErrors = totalErrors.get(),
            averageLatency = avgLatency,
            maxLatency = requestLatencies.maxOrNull() ?: 0L,
            connections = activeConnections
        )
    }
    
    /**
     * Clean up stale connections.
     */
    suspend fun cleanupStaleConnections(maxIdle: Duration = Duration.INFINITE) {
        if (maxIdle == Duration.INFINITE) return
        
        val now = System.currentTimeMillis()
        val staleThreshold = now - maxIdle.inWholeMilliseconds
        
        connections.entries.filter { (_, info) ->
            info.lastActivity < staleThreshold
        }.forEach { (id, info) ->
            logger.info("Closing stale connection: $id (idle: ${now - info.lastActivity}ms)")
            try {
                info.session.close(CloseReason(
                    CloseReason.Codes.NORMAL,
                    "Connection idle timeout"
                ))
            } catch (e: Exception) {
                logger.debug("Error closing stale connection: ${e.message}")
            }
            unregisterConnection(id)
        }
    }
    
    /**
     * Broadcast a frame to all connections.
     */
    suspend fun broadcast(frame: Frame) {
        connections.values.parallelForEach { info ->
            try {
                info.session.send(frame)
            } catch (e: Exception) {
                logger.debug("Failed to broadcast to connection ${info.id}: ${e.message}")
            }
        }
    }
    
    /**
     * Check if a connection is healthy.
     */
    fun isConnectionHealthy(connectionId: String): Boolean {
        val info = connections[connectionId] ?: return false
        val errorRate = if (info.requestCount.get() > 0) {
            info.errorCount.get().toDouble() / info.requestCount.get()
        } else 0.0
        
        return errorRate < 0.1 // Less than 10% error rate
    }
    
    /**
     * Close all connections gracefully.
     */
    suspend fun closeAll() {
        logger.info("Closing all ${connections.size} connections")
        
        connections.values.parallelForEach { info ->
            try {
                info.session.close(CloseReason(
                    CloseReason.Codes.GOING_AWAY,
                    "Server shutting down"
                ))
            } catch (e: Exception) {
                logger.debug("Error closing connection ${info.id}: ${e.message}")
            }
        }
        
        connections.clear()
        connectionCount.set(0)
    }
    
    // Private helper methods
    
    private fun generateConnectionId(): String = 
        "mcp-${System.currentTimeMillis()}-${(Math.random() * 10000).toInt()}"
    
    private suspend fun measureAndProcess(
        text: String,
        handler: suspend (String) -> String
    ): String {
        val startTime = System.currentTimeMillis()
        return try {
            handler(text)
        } finally {
            val duration = System.currentTimeMillis() - startTime
            if (duration > config.slowRequestThreshold.inWholeMilliseconds) {
                logger.warn("Slow request detected: ${duration}ms")
            }
        }
    }
    
    private suspend fun recordLatency(latency: Long) {
        latencyMutex.withLock {
            requestLatencies.add(latency)
            if (requestLatencies.size > maxLatencySamples) {
                requestLatencies.removeAt(0)
            }
        }
    }
    
    private suspend inline fun <T> Collection<T>.parallelForEach(
        crossinline action: suspend (T) -> Unit
    ) {
        kotlinx.coroutines.coroutineScope {
            forEach { item ->
                launch {
                    action(item)
                }
            }
        }
    }
}

/**
 * Connection statistics for monitoring.
 */
data class ConnectionStatistics(
    val activeCount: Int,
    val totalRequests: Long,
    val totalErrors: Long,
    val averageLatency: Long,
    val maxLatency: Long,
    val connections: List<ConnectionStat>
)

/**
 * Individual connection statistics.
 */
data class ConnectionStat(
    val id: String,
    val duration: Long,
    val requests: Long,
    val errors: Int,
    val lastActivity: Long
)