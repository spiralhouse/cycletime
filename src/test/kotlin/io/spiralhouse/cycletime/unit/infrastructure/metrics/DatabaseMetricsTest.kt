package io.spiralhouse.cycletime.unit.infrastructure.metrics

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.infrastructure.metrics.DatabaseMetrics
import io.spiralhouse.cycletime.infrastructure.metrics.MetricsConfiguration

/**
 * Unit tests for DatabaseMetrics custom metrics.
 *
 * Verifies that database connection pool statistics and query durations
 * are correctly recorded in the Prometheus registry.
 */
class DatabaseMetricsTest : StringSpec({

    beforeTest {
        // Reset connection pool stats to baseline
        DatabaseMetrics.recordConnectionPoolStats(0, 0, 0)
    }

    "should record connection pool statistics" {
        // Given
        val active = 5
        val idle = 3
        val max = 10

        // When
        DatabaseMetrics.recordConnectionPoolStats(active, idle, max)

        // Then
        val activeGauge = MetricsConfiguration.registry.find("cycletime_db_connections_active")
            .gauge()
        val idleGauge = MetricsConfiguration.registry.find("cycletime_db_connections_idle")
            .gauge()
        val maxGauge = MetricsConfiguration.registry.find("cycletime_db_connections_max")
            .gauge()

        activeGauge shouldNotBe null
        activeGauge?.value() shouldBe active.toDouble()

        idleGauge shouldNotBe null
        idleGauge?.value() shouldBe idle.toDouble()

        maxGauge shouldNotBe null
        maxGauge?.value() shouldBe max.toDouble()
    }

    "should update connection pool stats atomically" {
        // Given
        DatabaseMetrics.recordConnectionPoolStats(2, 4, 10)

        // When
        DatabaseMetrics.recordConnectionPoolStats(7, 1, 10)

        // Then
        val activeGauge = MetricsConfiguration.registry.find("cycletime_db_connections_active")
            .gauge()
        val idleGauge = MetricsConfiguration.registry.find("cycletime_db_connections_idle")
            .gauge()

        activeGauge?.value() shouldBe 7.0
        idleGauge?.value() shouldBe 1.0
    }

    "should record query durations" {
        // Given
        val operation = "project_list"
        val durationMs = 42L

        // When
        DatabaseMetrics.recordQueryDuration(operation, durationMs)

        // Then
        val timer = MetricsConfiguration.registry.find("cycletime_db_query_duration_seconds")
            .tag("operation", operation)
            .timer()

        timer shouldNotBe null
        timer?.count() shouldBe 1L
        timer?.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) shouldBe durationMs.toDouble()
    }

    "should track multiple query operations independently" {
        // Given - use unique names to avoid test interference
        val testId = System.nanoTime()
        val operation1 = "test_proj_list_$testId"
        val operation2 = "test_issue_create_$testId"

        // When
        DatabaseMetrics.recordQueryDuration(operation1, 50)
        DatabaseMetrics.recordQueryDuration(operation1, 60)
        DatabaseMetrics.recordQueryDuration(operation2, 120)

        // Then
        val timer1 = MetricsConfiguration.registry.find("cycletime_db_query_duration_seconds")
            .tag("operation", operation1)
            .timer()

        val timer2 = MetricsConfiguration.registry.find("cycletime_db_query_duration_seconds")
            .tag("operation", operation2)
            .timer()

        timer1?.count() shouldBe 2L
        timer1?.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) shouldBe 110.0

        timer2?.count() shouldBe 1L
        timer2?.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) shouldBe 120.0
    }

    "should handle zero values for connection pool" {
        // When
        DatabaseMetrics.recordConnectionPoolStats(0, 0, 0)

        // Then
        val activeGauge = MetricsConfiguration.registry.find("cycletime_db_connections_active")
            .gauge()

        activeGauge?.value() shouldBe 0.0
    }

    "should record query duration for same operation multiple times" {
        // Given - use unique name to avoid test interference
        val testId = System.nanoTime()
        val operation = "test_session_list_$testId"

        // When
        DatabaseMetrics.recordQueryDuration(operation, 10)
        DatabaseMetrics.recordQueryDuration(operation, 20)
        DatabaseMetrics.recordQueryDuration(operation, 30)

        // Then
        val timer = MetricsConfiguration.registry.find("cycletime_db_query_duration_seconds")
            .tag("operation", operation)
            .timer()

        timer?.count() shouldBe 3L
        timer?.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS) shouldBe 60.0
    }
})
