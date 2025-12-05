package io.spiralhouse.cycletime.infrastructure.metrics

import io.micrometer.core.instrument.Gauge
import io.micrometer.core.instrument.Timer
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.TimeUnit

/**
 * Custom metrics for database operations and connection pooling.
 *
 * Tracks connection pool statistics and query performance metrics.
 * All metrics use the "cycletime_db_" prefix for namespace separation.
 *
 * Thread-safe for concurrent metric recording.
 *
 * Example usage:
 * ```kotlin
 * DatabaseMetrics.recordConnectionPoolStats(active = 5, idle = 3, max = 10)
 * DatabaseMetrics.recordQueryDuration("project_list", 42)
 * ```
 */
object DatabaseMetrics {
    private val registry = MetricsConfiguration.registry

    // Connection pool gauges (mutable state)
    private val activeConnections = AtomicInteger(0)
    private val idleConnections = AtomicInteger(0)
    private val maxConnections = AtomicInteger(0)

    init {
        // Register gauges for connection pool statistics
        Gauge.builder("cycletime_db_connections_active", activeConnections) { it.get().toDouble() }
            .description("Number of active database connections")
            .register(registry)

        Gauge.builder("cycletime_db_connections_idle", idleConnections) { it.get().toDouble() }
            .description("Number of idle database connections")
            .register(registry)

        Gauge.builder("cycletime_db_connections_max", maxConnections) { it.get().toDouble() }
            .description("Maximum allowed database connections")
            .register(registry)
    }

    /**
     * Record connection pool statistics.
     *
     * Updates gauges for active, idle, and maximum connection counts.
     * Thread-safe for concurrent updates.
     *
     * @param active Number of currently active connections
     * @param idle Number of currently idle connections
     * @param max Maximum allowed connections in pool
     */
    fun recordConnectionPoolStats(active: Int, idle: Int, max: Int) {
        activeConnections.set(active)
        idleConnections.set(idle)
        maxConnections.set(max)
    }

    /**
     * Record the duration of a database query operation.
     *
     * Records execution time in a timer metric for performance analysis.
     * Timers automatically track count, sum, and percentiles.
     *
     * @param operation The type of database operation (e.g., "project_list", "issue_create")
     * @param durationMs The query execution duration in milliseconds
     */
    fun recordQueryDuration(operation: String, durationMs: Long) {
        Timer.builder("cycletime_db_query_duration_seconds")
            .description("Database query execution duration")
            .tag("operation", operation)
            .register(registry)
            .record(durationMs, TimeUnit.MILLISECONDS)
    }
}
