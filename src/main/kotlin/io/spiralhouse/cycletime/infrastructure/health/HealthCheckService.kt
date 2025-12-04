package io.spiralhouse.cycletime.infrastructure.health

import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.infrastructure.database.DatabaseProvider
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import org.jetbrains.exposed.exceptions.ExposedSQLException
import org.jetbrains.exposed.sql.transactions.transaction
import java.sql.ResultSet
import java.sql.SQLException
import kotlin.time.measureTimedValue

/**
 * Health status levels for system components.
 */
enum class HealthStatus {
    HEALTHY,
    DEGRADED,
    UNHEALTHY
}

/**
 * Represents the health status of a single component.
 *
 * @property status The overall health status of the component
 * @property message Human-readable message about the component's health
 * @property latencyMs Optional latency measurement in milliseconds
 * @property details Additional details about the component's state
 */
data class ComponentHealth(
    val status: HealthStatus,
    val message: String,
    val latencyMs: Long? = null,
    val details: Map<String, Any> = emptyMap()
)

/**
 * Represents the overall system health.
 *
 * @property overallStatus The aggregated health status across all components
 * @property checks Map of component names to their health status
 * @property timestamp When the health check was performed
 */
data class SystemHealth(
    val overallStatus: HealthStatus,
    val checks: Map<String, ComponentHealth>,
    val timestamp: Instant
)

/**
 * Service for checking the health of system components.
 *
 * Performs health checks on:
 * - Database connectivity and connection pool status
 * - Memory usage (heap statistics)
 * - MCP session management
 *
 * @property databaseProvider Provides database connections
 * @property projectService Project application service for basic validation
 * @property sessionService Session application service for MCP health
 */
class HealthCheckService(
    private val databaseProvider: DatabaseProvider,
    private val projectService: ProjectApplicationService,
    private val sessionService: SessionApplicationService
) {
    companion object {
        // Memory thresholds
        private const val MEMORY_DEGRADED_THRESHOLD = 0.70 // 70%
        private const val MEMORY_UNHEALTHY_THRESHOLD = 0.90 // 90%

        // Database thresholds
        private const val DB_DEGRADED_LATENCY_MS = 100L
        private const val DB_UNHEALTHY_LATENCY_MS = 500L

        // MCP thresholds
        private const val MCP_DEGRADED_SESSION_COUNT = 100
    }

    /**
     * Checks the health of all system components.
     *
     * @return SystemHealth containing overall status and individual component checks
     */
    suspend fun checkSystemHealth(): SystemHealth {
        val checks = mapOf(
            "database" to checkDatabase(),
            "memory" to checkMemory(),
            "mcp" to checkMCP()
        )

        val overallStatus = determineOverallStatus(checks.values)

        return SystemHealth(
            overallStatus = overallStatus,
            checks = checks,
            timestamp = Clock.System.now()
        )
    }

    /**
     * Checks database connectivity and connection pool status.
     */
    private fun checkDatabase(): ComponentHealth {
        return try {
            val (isReady, duration) = measureTimedValue {
                databaseProvider.isReady()
            }

            val latencyMs = duration.inWholeMilliseconds

            if (!isReady) {
                return ComponentHealth(
                    status = HealthStatus.UNHEALTHY,
                    message = "Database not ready",
                    latencyMs = latencyMs,
                    details = mapOf("ready" to false)
                )
            }

            // Connection pool stats would require accessing HikariCP internal state
            // which is not critical for basic health checks, so we skip it for now
            val poolStats = emptyMap<String, Any>()

            val status = when {
                latencyMs > DB_UNHEALTHY_LATENCY_MS -> HealthStatus.UNHEALTHY
                latencyMs > DB_DEGRADED_LATENCY_MS -> HealthStatus.DEGRADED
                else -> HealthStatus.HEALTHY
            }

            val message = when (status) {
                HealthStatus.HEALTHY -> "Connected"
                HealthStatus.DEGRADED -> "High latency"
                HealthStatus.UNHEALTHY -> "Critical latency"
            }

            ComponentHealth(
                status = status,
                message = message,
                latencyMs = latencyMs,
                details = poolStats
            )
        } catch (e: SQLException) {
            ComponentHealth(
                status = HealthStatus.UNHEALTHY,
                message = "Database unreachable: ${e.message}",
                details = mapOf("error" to (e.message ?: "Unknown SQL error"))
            )
        } catch (e: ExposedSQLException) {
            ComponentHealth(
                status = HealthStatus.UNHEALTHY,
                message = "Database query failed: ${e.message}",
                details = mapOf("error" to (e.message ?: "Unknown query error"))
            )
        } catch (e: Exception) {
            ComponentHealth(
                status = HealthStatus.UNHEALTHY,
                message = "Database check failed: ${e.message}",
                details = mapOf("error" to (e.message ?: "Unknown error"))
            )
        }
    }

    /**
     * Checks memory usage statistics.
     */
    private fun checkMemory(): ComponentHealth {
        val runtime = Runtime.getRuntime()
        val maxMemory = runtime.maxMemory()
        val totalMemory = runtime.totalMemory()
        val freeMemory = runtime.freeMemory()
        val usedMemory = totalMemory - freeMemory

        val heapUsedMB = usedMemory / (1024 * 1024)
        val heapMaxMB = maxMemory / (1024 * 1024)
        val usagePercent = if (maxMemory > 0) {
            (usedMemory.toDouble() / maxMemory.toDouble())
        } else {
            0.0
        }

        val status = when {
            usagePercent > MEMORY_UNHEALTHY_THRESHOLD -> HealthStatus.UNHEALTHY
            usagePercent > MEMORY_DEGRADED_THRESHOLD -> HealthStatus.DEGRADED
            else -> HealthStatus.HEALTHY
        }

        val message = when (status) {
            HealthStatus.HEALTHY -> "Normal usage"
            HealthStatus.DEGRADED -> "High memory usage"
            HealthStatus.UNHEALTHY -> "Critical memory usage"
        }

        return ComponentHealth(
            status = status,
            message = message,
            details = mapOf(
                "heapUsedMB" to heapUsedMB,
                "heapMaxMB" to heapMaxMB,
                "usagePercent" to (usagePercent * 100).toInt()
            )
        )
    }

    /**
     * Checks MCP session management status.
     */
    private suspend fun checkMCP(): ComponentHealth {
        return try {
            val sessionCount = sessionService.getSessionCount()

            val status = when {
                sessionCount > MCP_DEGRADED_SESSION_COUNT -> HealthStatus.DEGRADED
                else -> HealthStatus.HEALTHY
            }

            val message = when (status) {
                HealthStatus.HEALTHY -> "Active"
                HealthStatus.DEGRADED -> "High session count"
                HealthStatus.UNHEALTHY -> "Service unavailable" // Not used, but complete
            }

            ComponentHealth(
                status = status,
                message = message,
                details = mapOf("activeSessions" to sessionCount)
            )
        } catch (e: Exception) {
            ComponentHealth(
                status = HealthStatus.UNHEALTHY,
                message = "MCP service check failed: ${e.message}",
                details = mapOf("error" to (e.message ?: "Unknown error"))
            )
        }
    }

    /**
     * Determines overall system health from individual component checks.
     *
     * Logic:
     * - If any component is UNHEALTHY → overall UNHEALTHY
     * - If any component is DEGRADED → overall DEGRADED
     * - Otherwise → overall HEALTHY
     */
    private fun determineOverallStatus(checks: Collection<ComponentHealth>): HealthStatus {
        return when {
            checks.any { it.status == HealthStatus.UNHEALTHY } -> HealthStatus.UNHEALTHY
            checks.any { it.status == HealthStatus.DEGRADED } -> HealthStatus.DEGRADED
            else -> HealthStatus.HEALTHY
        }
    }
}
