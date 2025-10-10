package io.spiralhouse.cycletime.mcp.server

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
 *
 * Uses regular class (not data class) because it contains mutable state
 * that changes during the connection lifecycle (lastActivity, counters, metadata).
 * Data classes are intended for immutable value objects.
 *
 * Uses generic MCPSession interface to support multiple transport types (SSE, WebSocket, etc.)
 *
 * @property id Unique connection identifier
 * @property session The MCP session (transport-agnostic)
 * @property connectedAt Timestamp when connection was established
 * @property lastActivity Timestamp of last activity (atomic for thread safety in concurrent request processing)
 * @property requestCount Number of requests processed (atomic counter for thread safety)
 * @property errorCount Number of errors encountered (atomic counter for thread safety)
 * @property sendFailureCount Number of consecutive send failures (for health monitoring)
 * @property metadata Extensible metadata storage for custom connection properties
 */
class ConnectionInfo(
    val id: String,
    val session: MCPSession,
    val connectedAt: Long = System.currentTimeMillis(),
    val lastActivity: AtomicLong = AtomicLong(System.currentTimeMillis()),
    var requestCount: AtomicLong = AtomicLong(0),
    var errorCount: AtomicInteger = AtomicInteger(0),
    val sendFailureCount: AtomicInteger = AtomicInteger(0),
    val metadata: MutableMap<String, Any> = ConcurrentHashMap()
) {
    /**
     * String representation for debugging and logging.
     * Provides snapshot of current connection state.
     */
    override fun toString(): String {
        return "ConnectionInfo(id='$id', connectedAt=$connectedAt, " +
               "lastActivity=${lastActivity.get()}, requests=${requestCount.get()}, " +
               "errors=${errorCount.get()}, metadataKeys=${metadata.keys})"
    }

    /**
     * Equality based on connection ID only.
     * Two connections are equal if they have the same ID.
     */
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ConnectionInfo) return false
        return id == other.id
    }

    /**
     * Hash code based on connection ID only.
     * Consistent with equals() - only ID matters for identity.
     */
    override fun hashCode(): Int {
        return id.hashCode()
    }
}

/**
 * Production-ready transport-agnostic connection manager with optimized resource management.
 *
 * Supports multiple transport types (SSE, WebSocket, etc.) via the MCPSession interface.
 *
 * Features:
 * - Connection pooling and limits
 * - Graceful degradation under load
 * - Memory-efficient message processing
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
    
    /**
     * Register a new MCP session (transport-agnostic).
     *
     * @param session The MCP session to register (SSE, WebSocket, etc.)
     * @return Connection ID if accepted, null if rejected
     */
    suspend fun registerConnection(session: MCPSession): String? {
        return connectionMutex.withLock {
            if (connectionCount.get() >= config.maxConnections) {
                logger.warn("Connection rejected: max connections (${config.maxConnections}) reached")
                session.close()
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
     * Unregister an MCP session.
     */
    suspend fun unregisterConnection(connectionId: String) {
        connectionMutex.withLock {
            connections.remove(connectionId)?.let { info ->
                connectionCount.decrementAndGet()
                val duration = System.currentTimeMillis() - info.connectedAt

                logger.info(
                    "Connection unregistered: $connectionId " +
                    "(duration: ${duration}ms, requests: ${info.requestCount.get()}, " +
                    "errors: ${info.errorCount.get()}, active: ${connectionCount.get()}, " +
                    "lastActivity: ${System.currentTimeMillis() - info.lastActivity.get()}ms ago)"
                )
            }
        }
    }
    
    /**
     * Process an incoming message with optimized handling.
     *
     * Transport-agnostic message processing that works with any MCPSession type.
     *
     * @param connectionId The connection identifier
     * @param message The message content (typically JSON-RPC 2.0 format)
     * @param handler The message handler function
     * @return The response message, or null if connection not found
     */
    suspend fun processMessage(
        connectionId: String,
        message: String,
        handler: suspend (String) -> String
    ): String? {
        val connection = connections[connectionId] ?: return null

        // Update activity tracking BEFORE measurement (atomic operations are microsecond-level)
        connection.lastActivity.set(System.currentTimeMillis())
        connection.requestCount.incrementAndGet()
        totalRequests.incrementAndGet()

        return try {
            // Measure ACTUAL processing time (not counter updates!)
            lateinit var response: String
            val processingTime = measureTimeMillis {
                response = measureAndProcess(message, handler)
            }
            recordLatency(processingTime)
            response
        } catch (e: Exception) {
            connection.errorCount.incrementAndGet()
            totalErrors.incrementAndGet()
            throw e
        }
    }
    
    /**
     * Send a message to a specific connection with error handling.
     *
     * Transport-agnostic message sending that works with any MCPSession type.
     * Tracks consecutive failures for health monitoring and connection cleanup.
     *
     * @param connectionId The connection identifier
     * @param message The message to send
     * @return true if sent successfully, false otherwise
     */
    suspend fun sendMessage(connectionId: String, message: String): Boolean {
        val connection = connections[connectionId] ?: return false

        return try {
            connection.session.send(message)
            connection.lastActivity.set(System.currentTimeMillis())
            connection.sendFailureCount.set(0)  // Reset failure count on success
            true
        } catch (e: CancellationException) {
            logger.debug("Send cancelled for connection: $connectionId")
            connection.sendFailureCount.incrementAndGet()
            false
        } catch (e: Exception) {
            connection.errorCount.incrementAndGet()
            val failureCount = connection.sendFailureCount.incrementAndGet()

            // WARN for individual failures (production-visible)
            logger.warn("Failed to send to session $connectionId: ${e.message}")

            // ERROR for repeated failures (triggers alerts)
            if (failureCount > 3) {
                logger.error(
                    "Session $connectionId has $failureCount consecutive send failures. " +
                    "Connection may be dead. Consider cleanup."
                )
            }
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
                lastActivity = now - info.lastActivity.get()
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
            info.lastActivity.get() < staleThreshold
        }.forEach { (id, info) ->
            logger.info("Closing stale connection: $id (idle: ${now - info.lastActivity.get()}ms)")
            try {
                info.session.close()
            } catch (e: Exception) {
                logger.debug("Error closing stale connection: ${e.message}")
            }
            unregisterConnection(id)
        }
    }
    
    /**
     * Broadcast a message to all connections with failure aggregation.
     *
     * Logs aggregated failure rate for production visibility. High failure rates
     * (>10%) indicate systemic issues requiring investigation.
     */
    suspend fun broadcast(message: String) {
        val allConnections = connections.values.toList()
        val failures = mutableListOf<String>()

        allConnections.parallelForEach { info ->
            try {
                info.session.send(message)
                info.sendFailureCount.set(0)  // Reset on successful broadcast
            } catch (e: Exception) {
                failures.add(info.id)
                val failureCount = info.sendFailureCount.incrementAndGet()

                // Log individual failure at WARN
                logger.warn("Broadcast failed for session ${info.id}: ${e.message}")

                // Log repeated failures at ERROR
                if (failureCount > 3) {
                    logger.error(
                        "Session ${info.id} has $failureCount consecutive broadcast failures. " +
                        "Connection unhealthy."
                    )
                }
            }
        }

        // Aggregate failure reporting for systemic issues
        if (failures.isNotEmpty()) {
            val failureRate = failures.size.toDouble() / allConnections.size
            val failurePercent = String.format("%.1f", failureRate * 100)

            if (failureRate > 0.1) {  // >10% failure rate = systemic issue
                logger.error(
                    "Broadcast failed for ${failures.size}/${allConnections.size} connections " +
                    "($failurePercent% failure rate). Systemic issue detected. " +
                    "Failed sessions: ${failures.take(10).joinToString()}" +
                    if (failures.size > 10) " ... and ${failures.size - 10} more" else ""
                )
            } else {
                logger.warn(
                    "Broadcast failed for ${failures.size}/${allConnections.size} connections " +
                    "($failurePercent% failure rate): ${failures.joinToString()}"
                )
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
                info.session.close()
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