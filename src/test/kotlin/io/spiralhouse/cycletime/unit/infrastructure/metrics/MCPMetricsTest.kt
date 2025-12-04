package io.spiralhouse.cycletime.unit.infrastructure.metrics

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.doubles.shouldBeGreaterThan
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.infrastructure.metrics.MCPMetrics
import io.spiralhouse.cycletime.infrastructure.metrics.MetricsConfiguration

/**
 * Unit tests for MCPMetrics custom metrics.
 *
 * Verifies that MCP tool invocations, durations, sessions, and errors
 * are correctly recorded in the Prometheus registry.
 */
class MCPMetricsTest : StringSpec({

    beforeTest {
        // Reset active sessions to baseline
        MCPMetrics.setActiveSessions(0)
    }

    "should record tool invocations" {
        // Given
        val toolName = "project_create"

        // When
        MCPMetrics.recordToolInvocation(toolName)
        MCPMetrics.recordToolInvocation(toolName)

        // Then
        val counter = MetricsConfiguration.registry.find("cycletime_mcp_tool_invocations_total")
            .tag("tool", toolName)
            .counter()

        counter shouldNotBe null
        counter?.count() shouldBe 2.0
    }

    "should record tool durations" {
        // Given
        val toolName = "issue_list"
        val durationMs = 145L

        // When
        MCPMetrics.recordToolDuration(toolName, durationMs)

        // Then
        val timer = MetricsConfiguration.registry.find("cycletime_mcp_tool_duration_seconds")
            .tag("tool", toolName)
            .timer()

        timer shouldNotBe null
        timer?.count() shouldBe 1L
        timer?.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) shouldBe durationMs.toDouble()
    }

    "should track active sessions" {
        // Given
        val sessionCount = 5

        // When
        MCPMetrics.setActiveSessions(sessionCount)

        // Then
        val gauge = MetricsConfiguration.registry.find("cycletime_mcp_active_sessions")
            .gauge()

        gauge shouldNotBe null
        gauge?.value() shouldBe sessionCount.toDouble()
    }

    "should update active sessions atomically" {
        // Given
        MCPMetrics.setActiveSessions(3)

        // When
        MCPMetrics.setActiveSessions(7)

        // Then
        val gauge = MetricsConfiguration.registry.find("cycletime_mcp_active_sessions")
            .gauge()

        gauge?.value() shouldBe 7.0
    }

    "should record tool errors with error types" {
        // Given
        val toolName = "project_create"
        val errorType = "validation_error"

        // When
        MCPMetrics.recordToolError(toolName, errorType)

        // Then
        val counter = MetricsConfiguration.registry.find("cycletime_mcp_tool_errors_total")
            .tag("tool", toolName)
            .tag("error_type", errorType)
            .counter()

        counter shouldNotBe null
        counter?.count() shouldBe 1.0
    }

    "should handle multiple tool types independently" {
        // Given - use unique names to avoid test interference
        val testId = System.nanoTime()
        val tool1 = "test_project_create_$testId"
        val tool2 = "test_issue_list_$testId"

        // When
        MCPMetrics.recordToolInvocation(tool1)
        MCPMetrics.recordToolInvocation(tool1)
        MCPMetrics.recordToolInvocation(tool2)

        // Then
        val counter1 = MetricsConfiguration.registry.find("cycletime_mcp_tool_invocations_total")
            .tag("tool", tool1)
            .counter()

        val counter2 = MetricsConfiguration.registry.find("cycletime_mcp_tool_invocations_total")
            .tag("tool", tool2)
            .counter()

        counter1?.count() shouldBe 2.0
        counter2?.count() shouldBe 1.0
    }

    "should record multiple error types for same tool" {
        // Given - use unique name to avoid test interference
        val testId = System.nanoTime()
        val toolName = "test_project_create_$testId"

        // When
        MCPMetrics.recordToolError(toolName, "validation_error")
        MCPMetrics.recordToolError(toolName, "database_error")
        MCPMetrics.recordToolError(toolName, "validation_error")

        // Then
        val validationErrors = MetricsConfiguration.registry.find("cycletime_mcp_tool_errors_total")
            .tag("tool", toolName)
            .tag("error_type", "validation_error")
            .counter()

        val databaseErrors = MetricsConfiguration.registry.find("cycletime_mcp_tool_errors_total")
            .tag("tool", toolName)
            .tag("error_type", "database_error")
            .counter()

        validationErrors?.count() shouldBe 2.0
        databaseErrors?.count() shouldBe 1.0
    }
})
