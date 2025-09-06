package io.spiralhouse.cycletime.mcp.monitoring

import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.encodeToJsonElement
import java.lang.management.ManagementFactory
import java.util.concurrent.TimeUnit

/**
 * Health check service for MCP server monitoring.
 * 
 * Provides comprehensive health status including:
 * - Server status and uptime
 * - Resource availability
 * - Performance metrics
 * - Error rates
 * - System resource usage
 */
class MCPHealthCheck(
    private val integrationService: MCPIntegrationService
) {
    
    /**
     * Perform a comprehensive health check.
     */
    fun check(): HealthCheckResult {
        val startTime = System.currentTimeMillis()
        
        // Get server status
        val serverStatus = integrationService.getStatus()
        
        // Get metrics snapshot
        val metrics = MCPMetrics.instance.getSnapshot()
        
        // Calculate health score
        val healthScore = calculateHealthScore(metrics)
        
        // Get system metrics
        val systemMetrics = getSystemMetrics()
        
        // Determine overall status
        val status = when {
            !serverStatus.isRunning -> HealthStatus.UNHEALTHY
            healthScore < 0.5 -> HealthStatus.DEGRADED
            else -> HealthStatus.HEALTHY
        }
        
        val checkDuration = System.currentTimeMillis() - startTime
        
        return HealthCheckResult(
            status = status,
            healthScore = healthScore,
            serverInfo = ServerInfo(
                isRunning = serverStatus.isRunning,
                port = serverStatus.port,
                host = serverStatus.host,
                path = serverStatus.path,
                uptimeMs = serverStatus.uptimeMs,
                activeConnections = serverStatus.activeConnections,
                registeredResources = serverStatus.registeredResources,
                registeredTools = serverStatus.registeredTools
            ),
            performanceMetrics = PerformanceMetrics(
                avgToolResponseTimeMs = calculateAvgResponseTime(metrics.toolMetrics),
                avgResourceResponseTimeMs = calculateAvgResponseTime(metrics.resourceMetrics),
                p95ToolResponseTimeMs = calculateP95ResponseTime(metrics.toolMetrics),
                p95ResourceResponseTimeMs = calculateP95ResponseTime(metrics.resourceMetrics),
                errorRate = calculateErrorRate(metrics)
            ),
            systemMetrics = systemMetrics,
            checkDurationMs = checkDuration,
            timestamp = System.currentTimeMillis()
        )
    }
    
    /**
     * Get a simple health status (for quick checks).
     */
    fun getSimpleStatus(): SimpleHealthStatus {
        val result = check()
        return SimpleHealthStatus(
            status = result.status.name,
            healthy = result.status == HealthStatus.HEALTHY,
            uptime = formatUptime(result.serverInfo.uptimeMs)
        )
    }
    
    /**
     * Calculate overall health score (0.0 to 1.0).
     */
    private fun calculateHealthScore(metrics: MetricsSnapshot): Double {
        var score = 1.0
        
        // Penalize for high error rates
        val errorRate = calculateErrorRate(metrics)
        if (errorRate > 0.01) score -= 0.2 // >1% errors
        if (errorRate > 0.05) score -= 0.3 // >5% errors
        if (errorRate > 0.10) score -= 0.3 // >10% errors
        
        // Penalize for slow response times
        val avgResponseTime = calculateAvgResponseTime(metrics.toolMetrics + metrics.resourceMetrics)
        if (avgResponseTime > 100) score -= 0.1 // >100ms average
        if (avgResponseTime > 500) score -= 0.2 // >500ms average
        if (avgResponseTime > 1000) score -= 0.2 // >1s average
        
        // Penalize for message errors
        val messageErrorRate = if (metrics.messageMetrics.messagesReceived > 0) {
            metrics.messageMetrics.messageErrors.toDouble() / metrics.messageMetrics.messagesReceived
        } else 0.0
        if (messageErrorRate > 0.01) score -= 0.2
        
        return score.coerceIn(0.0, 1.0)
    }
    
    /**
     * Calculate average response time across metrics.
     */
    private fun calculateAvgResponseTime(metrics: List<Any>): Double {
        val times = metrics.mapNotNull { metric ->
            when (metric) {
                is ToolMetric -> metric.avgTimeMs
                is ResourceMetric -> metric.avgTimeMs
                else -> null
            }
        }
        
        return if (times.isNotEmpty()) times.average() else 0.0
    }
    
    /**
     * Calculate P95 response time across metrics.
     */
    private fun calculateP95ResponseTime(metrics: List<Any>): Long {
        val times = metrics.mapNotNull { metric ->
            when (metric) {
                is ToolMetric -> metric.p95ResponseTimeMs
                is ResourceMetric -> metric.p95ResponseTimeMs
                else -> null
            }
        }
        
        return if (times.isNotEmpty()) {
            times.sorted()[(times.size * 0.95).toInt().coerceIn(0, times.size - 1)]
        } else 0
    }
    
    /**
     * Calculate overall error rate.
     */
    private fun calculateErrorRate(metrics: MetricsSnapshot): Double {
        val totalOps = metrics.toolMetrics.sumOf { it.executionCount } + 
                       metrics.resourceMetrics.sumOf { it.servingCount }
        val totalErrors = metrics.toolMetrics.sumOf { it.errorCount } + 
                          metrics.resourceMetrics.sumOf { it.errorCount }
        
        return if (totalOps > 0) totalErrors.toDouble() / totalOps else 0.0
    }
    
    /**
     * Get system-level metrics.
     */
    private fun getSystemMetrics(): SystemMetrics {
        val runtime = Runtime.getRuntime()
        val memoryBean = ManagementFactory.getMemoryMXBean()
        val threadBean = ManagementFactory.getThreadMXBean()
        val osBean = ManagementFactory.getOperatingSystemMXBean()
        
        return SystemMetrics(
            heapUsedMb = memoryBean.heapMemoryUsage.used / (1024 * 1024),
            heapMaxMb = memoryBean.heapMemoryUsage.max / (1024 * 1024),
            nonHeapUsedMb = memoryBean.nonHeapMemoryUsage.used / (1024 * 1024),
            threadCount = threadBean.threadCount,
            cpuProcessors = runtime.availableProcessors(),
            systemLoadAverage = osBean.systemLoadAverage
        )
    }
    
    /**
     * Format uptime in human-readable format.
     */
    private fun formatUptime(uptimeMs: Long): String {
        val days = TimeUnit.MILLISECONDS.toDays(uptimeMs)
        val hours = TimeUnit.MILLISECONDS.toHours(uptimeMs) % 24
        val minutes = TimeUnit.MILLISECONDS.toMinutes(uptimeMs) % 60
        val seconds = TimeUnit.MILLISECONDS.toSeconds(uptimeMs) % 60
        
        return buildString {
            if (days > 0) append("${days}d ")
            if (hours > 0) append("${hours}h ")
            if (minutes > 0) append("${minutes}m ")
            append("${seconds}s")
        }.trim()
    }
}

/**
 * Health status levels.
 */
enum class HealthStatus {
    HEALTHY,    // Everything is working normally
    DEGRADED,   // Some issues but still functional
    UNHEALTHY   // Major issues or not running
}

/**
 * Complete health check result.
 */
@Serializable
data class HealthCheckResult(
    val status: HealthStatus,
    val healthScore: Double,
    val serverInfo: ServerInfo,
    val performanceMetrics: PerformanceMetrics,
    val systemMetrics: SystemMetrics,
    val checkDurationMs: Long,
    val timestamp: Long
)

/**
 * Server information.
 */
@Serializable
data class ServerInfo(
    val isRunning: Boolean,
    val port: Int,
    val host: String,
    val path: String,
    val uptimeMs: Long,
    val activeConnections: Int,
    val registeredResources: Int,
    val registeredTools: Int
)

/**
 * Performance metrics summary.
 */
@Serializable
data class PerformanceMetrics(
    val avgToolResponseTimeMs: Double,
    val avgResourceResponseTimeMs: Double,
    val p95ToolResponseTimeMs: Long,
    val p95ResourceResponseTimeMs: Long,
    val errorRate: Double
)

/**
 * System-level metrics.
 */
@Serializable
data class SystemMetrics(
    val heapUsedMb: Long,
    val heapMaxMb: Long,
    val nonHeapUsedMb: Long,
    val threadCount: Int,
    val cpuProcessors: Int,
    val systemLoadAverage: Double
)

/**
 * Simple health status for quick checks.
 */
@Serializable
data class SimpleHealthStatus(
    val status: String,
    val healthy: Boolean,
    val uptime: String
)