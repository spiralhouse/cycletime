package io.spiralhouse.cycletime.infrastructure.metrics

import io.micrometer.core.instrument.Counter
import io.micrometer.core.instrument.Timer
import io.micrometer.core.instrument.Gauge
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.TimeUnit

/**
 * Custom metrics for MCP (Model Context Protocol) operations.
 *
 * Tracks MCP tool invocations, execution times, active sessions, and error rates.
 * All metrics use the "cycletime_mcp_" prefix for namespace separation.
 *
 * Thread-safe for concurrent metric recording.
 *
 * Example usage:
 * ```kotlin
 * MCPMetrics.recordToolInvocation("project_create")
 * MCPMetrics.recordToolDuration("project_create", 145)
 * MCPMetrics.setActiveSessions(3)
 * MCPMetrics.recordToolError("project_create", "validation_error")
 * ```
 */
object MCPMetrics {
    private val registry = MetricsConfiguration.registry

    // Active sessions gauge (mutable state)
    private val activeSessionsCount = AtomicInteger(0)

    init {
        // Register gauge for active sessions
        Gauge.builder("cycletime_mcp_active_sessions", activeSessionsCount) { it.get().toDouble() }
            .description("Number of active MCP sessions")
            .register(registry)
    }

    /**
     * Record a tool invocation.
     *
     * Increments the total invocation counter for the specified tool.
     * Creates a new counter if this is the first invocation of the tool.
     *
     * @param toolName The name of the MCP tool being invoked
     */
    fun recordToolInvocation(toolName: String) {
        Counter.builder("cycletime_mcp_tool_invocations_total")
            .description("Total number of MCP tool invocations")
            .tag("tool", toolName)
            .register(registry)
            .increment()
    }

    /**
     * Record the duration of a tool execution.
     *
     * Records execution time in a timer metric for performance analysis.
     * Timers automatically track count, sum, and percentiles.
     *
     * @param toolName The name of the MCP tool
     * @param durationMs The execution duration in milliseconds
     */
    fun recordToolDuration(toolName: String, durationMs: Long) {
        Timer.builder("cycletime_mcp_tool_duration_seconds")
            .description("MCP tool execution duration")
            .tag("tool", toolName)
            .register(registry)
            .record(durationMs, TimeUnit.MILLISECONDS)
    }

    /**
     * Record a tool error.
     *
     * Increments the error counter for the specified tool and error type.
     * Useful for tracking failure rates and error patterns.
     *
     * @param toolName The name of the MCP tool that encountered an error
     * @param errorType The type/category of error (e.g., "validation_error", "database_error")
     */
    fun recordToolError(toolName: String, errorType: String) {
        Counter.builder("cycletime_mcp_tool_errors_total")
            .description("Total number of MCP tool errors")
            .tag("tool", toolName)
            .tag("error_type", errorType)
            .register(registry)
            .increment()
    }

    /**
     * Set the current number of active MCP sessions.
     *
     * Updates the gauge metric that tracks concurrent session count.
     * Thread-safe for concurrent updates.
     *
     * @param count The current number of active sessions
     */
    fun setActiveSessions(count: Int) {
        activeSessionsCount.set(count)
    }
}
