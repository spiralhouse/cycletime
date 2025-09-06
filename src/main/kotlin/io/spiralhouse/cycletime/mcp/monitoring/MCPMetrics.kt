package io.spiralhouse.cycletime.mcp.monitoring

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import kotlin.system.measureTimeMillis

/**
 * Production monitoring and metrics collection for MCP server operations.
 * 
 * This class provides comprehensive metrics collection for:
 * - Tool execution performance
 * - Resource serving latency
 * - Protocol message handling
 * - WebSocket connection tracking
 * - Error rates and patterns
 * 
 * All operations are thread-safe and designed for minimal overhead.
 */
class MCPMetrics {
    
    // Tool execution metrics
    private val toolExecutionCounts = ConcurrentHashMap<String, AtomicInteger>()
    private val toolExecutionTimes = ConcurrentHashMap<String, AtomicLong>()
    private val toolExecutionErrors = ConcurrentHashMap<String, AtomicInteger>()
    
    // Resource serving metrics
    private val resourceServingCounts = ConcurrentHashMap<String, AtomicInteger>()
    private val resourceServingTimes = ConcurrentHashMap<String, AtomicLong>()
    private val resourceServingErrors = ConcurrentHashMap<String, AtomicInteger>()
    
    // Connection metrics
    private val totalConnections = AtomicInteger(0)
    private val activeConnections = AtomicInteger(0)
    private val connectionErrors = AtomicInteger(0)
    
    // Message metrics
    private val messagesReceived = AtomicLong(0)
    private val messagesSent = AtomicLong(0)
    private val messageErrors = AtomicInteger(0)
    
    // Performance tracking
    private val avgResponseTimes = ConcurrentHashMap<String, MovingAverage>()
    private val p95ResponseTimes = ConcurrentHashMap<String, PercentileTracker>()
    private val p99ResponseTimes = ConcurrentHashMap<String, PercentileTracker>()
    
    /**
     * Record a tool execution.
     */
    fun recordToolExecution(toolName: String, timeMs: Long, success: Boolean) {
        toolExecutionCounts.computeIfAbsent(toolName) { AtomicInteger(0) }.incrementAndGet()
        toolExecutionTimes.computeIfAbsent(toolName) { AtomicLong(0) }.addAndGet(timeMs)
        
        if (!success) {
            toolExecutionErrors.computeIfAbsent(toolName) { AtomicInteger(0) }.incrementAndGet()
        }
        
        // Update performance metrics
        avgResponseTimes.computeIfAbsent(toolName) { MovingAverage() }.add(timeMs.toDouble())
        p95ResponseTimes.computeIfAbsent(toolName) { PercentileTracker(0.95) }.add(timeMs)
        p99ResponseTimes.computeIfAbsent(toolName) { PercentileTracker(0.99) }.add(timeMs)
    }
    
    /**
     * Record a resource serving operation.
     */
    fun recordResourceServing(resourceUri: String, timeMs: Long, success: Boolean) {
        resourceServingCounts.computeIfAbsent(resourceUri) { AtomicInteger(0) }.incrementAndGet()
        resourceServingTimes.computeIfAbsent(resourceUri) { AtomicLong(0) }.addAndGet(timeMs)
        
        if (!success) {
            resourceServingErrors.computeIfAbsent(resourceUri) { AtomicInteger(0) }.incrementAndGet()
        }
        
        // Update performance metrics
        avgResponseTimes.computeIfAbsent(resourceUri) { MovingAverage() }.add(timeMs.toDouble())
        p95ResponseTimes.computeIfAbsent(resourceUri) { PercentileTracker(0.95) }.add(timeMs)
        p99ResponseTimes.computeIfAbsent(resourceUri) { PercentileTracker(0.99) }.add(timeMs)
    }
    
    /**
     * Record a new connection.
     */
    fun recordConnection() {
        totalConnections.incrementAndGet()
        activeConnections.incrementAndGet()
    }
    
    /**
     * Record a disconnection.
     */
    fun recordDisconnection() {
        activeConnections.decrementAndGet()
    }
    
    /**
     * Record a connection error.
     */
    fun recordConnectionError() {
        connectionErrors.incrementAndGet()
    }
    
    /**
     * Record message traffic.
     */
    fun recordMessageReceived() {
        messagesReceived.incrementAndGet()
    }
    
    fun recordMessageSent() {
        messagesSent.incrementAndGet()
    }
    
    fun recordMessageError() {
        messageErrors.incrementAndGet()
    }
    
    /**
     * Get a snapshot of current metrics.
     */
    fun getSnapshot(): MetricsSnapshot {
        val toolMetrics = toolExecutionCounts.map { (name, count) ->
            ToolMetric(
                name = name,
                executionCount = count.get(),
                totalTimeMs = toolExecutionTimes[name]?.get() ?: 0,
                errorCount = toolExecutionErrors[name]?.get() ?: 0,
                avgResponseTimeMs = avgResponseTimes[name]?.average ?: 0.0,
                p95ResponseTimeMs = p95ResponseTimes[name]?.percentile ?: 0,
                p99ResponseTimeMs = p99ResponseTimes[name]?.percentile ?: 0
            )
        }
        
        val resourceMetrics = resourceServingCounts.map { (uri, count) ->
            ResourceMetric(
                uri = uri,
                servingCount = count.get(),
                totalTimeMs = resourceServingTimes[uri]?.get() ?: 0,
                errorCount = resourceServingErrors[uri]?.get() ?: 0,
                avgResponseTimeMs = avgResponseTimes[uri]?.average ?: 0.0,
                p95ResponseTimeMs = p95ResponseTimes[uri]?.percentile ?: 0,
                p99ResponseTimeMs = p99ResponseTimes[uri]?.percentile ?: 0
            )
        }
        
        return MetricsSnapshot(
            toolMetrics = toolMetrics,
            resourceMetrics = resourceMetrics,
            connectionMetrics = ConnectionMetrics(
                totalConnections = totalConnections.get(),
                activeConnections = activeConnections.get(),
                connectionErrors = connectionErrors.get()
            ),
            messageMetrics = MessageMetrics(
                messagesReceived = messagesReceived.get(),
                messagesSent = messagesSent.get(),
                messageErrors = messageErrors.get()
            ),
            timestamp = System.currentTimeMillis()
        )
    }
    
    /**
     * Reset all metrics.
     */
    fun reset() {
        toolExecutionCounts.clear()
        toolExecutionTimes.clear()
        toolExecutionErrors.clear()
        resourceServingCounts.clear()
        resourceServingTimes.clear()
        resourceServingErrors.clear()
        avgResponseTimes.clear()
        p95ResponseTimes.clear()
        p99ResponseTimes.clear()
        messagesReceived.set(0)
        messagesSent.set(0)
        messageErrors.set(0)
    }
    
    companion object {
        val instance = MCPMetrics()
        
        /**
         * Convenience method to measure and record tool execution.
         */
        inline fun <T> measureToolExecution(toolName: String, block: () -> T): T {
            var success = true
            val timeMs = measureTimeMillis {
                try {
                    return block()
                } catch (e: Exception) {
                    success = false
                    throw e
                }
            }
            instance.recordToolExecution(toolName, timeMs, success)
            return block() // This won't be reached if exception is thrown
        }
        
        /**
         * Convenience method to measure and record resource serving.
         */
        inline fun <T> measureResourceServing(resourceUri: String, block: () -> T): T {
            var success = true
            val timeMs = measureTimeMillis {
                try {
                    return block()
                } catch (e: Exception) {
                    success = false
                    throw e
                }
            }
            instance.recordResourceServing(resourceUri, timeMs, success)
            return block() // This won't be reached if exception is thrown
        }
    }
}

/**
 * Snapshot of metrics at a point in time.
 */
data class MetricsSnapshot(
    val toolMetrics: List<ToolMetric>,
    val resourceMetrics: List<ResourceMetric>,
    val connectionMetrics: ConnectionMetrics,
    val messageMetrics: MessageMetrics,
    val timestamp: Long
)

/**
 * Metrics for a specific tool.
 */
data class ToolMetric(
    val name: String,
    val executionCount: Int,
    val totalTimeMs: Long,
    val errorCount: Int,
    val avgResponseTimeMs: Double,
    val p95ResponseTimeMs: Long,
    val p99ResponseTimeMs: Long
) {
    val avgTimeMs: Double get() = if (executionCount > 0) totalTimeMs.toDouble() / executionCount else 0.0
    val errorRate: Double get() = if (executionCount > 0) errorCount.toDouble() / executionCount else 0.0
}

/**
 * Metrics for a specific resource.
 */
data class ResourceMetric(
    val uri: String,
    val servingCount: Int,
    val totalTimeMs: Long,
    val errorCount: Int,
    val avgResponseTimeMs: Double,
    val p95ResponseTimeMs: Long,
    val p99ResponseTimeMs: Long
) {
    val avgTimeMs: Double get() = if (servingCount > 0) totalTimeMs.toDouble() / servingCount else 0.0
    val errorRate: Double get() = if (servingCount > 0) errorCount.toDouble() / servingCount else 0.0
}

/**
 * Connection-related metrics.
 */
data class ConnectionMetrics(
    val totalConnections: Int,
    val activeConnections: Int,
    val connectionErrors: Int
)

/**
 * Message traffic metrics.
 */
data class MessageMetrics(
    val messagesReceived: Long,
    val messagesSent: Long,
    val messageErrors: Int
)

/**
 * Simple moving average calculator.
 */
private class MovingAverage(private val windowSize: Int = 100) {
    private val values = mutableListOf<Double>()
    private var sum = 0.0
    
    @Synchronized
    fun add(value: Double) {
        values.add(value)
        sum += value
        
        if (values.size > windowSize) {
            sum -= values.removeAt(0)
        }
    }
    
    val average: Double
        @Synchronized
        get() = if (values.isNotEmpty()) sum / values.size else 0.0
}

/**
 * Simple percentile tracker.
 */
private class PercentileTracker(private val percentileValue: Double, private val windowSize: Int = 1000) {
    private val values = mutableListOf<Long>()
    
    @Synchronized
    fun add(value: Long) {
        values.add(value)
        if (values.size > windowSize) {
            values.removeAt(0)
        }
    }
    
    val percentile: Long
        @Synchronized
        get() {
            if (values.isEmpty()) return 0
            val sorted = values.sorted()
            val index = (sorted.size * percentileValue).toInt().coerceIn(0, sorted.size - 1)
            return sorted[index]
        }
}