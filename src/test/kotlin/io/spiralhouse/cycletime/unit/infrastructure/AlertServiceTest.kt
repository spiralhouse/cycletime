package io.spiralhouse.cycletime.unit.infrastructure

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.infrastructure.alerting.AlertService
import io.spiralhouse.cycletime.infrastructure.health.ComponentHealth
import io.spiralhouse.cycletime.infrastructure.health.HealthStatus
import org.slf4j.Logger
import io.mockk.mockk
import io.mockk.verify

/**
 * Unit tests for AlertService.
 *
 * Tests alerting logic with failure tracking:
 * - First failure logging (WARN level)
 * - Threshold-based alerting (ERROR level on 3rd failure)
 * - Failure counter reset on recovery
 * - Separate tracking per component
 */
class AlertServiceTest : StringSpec({

    "should log WARN on first failure" {
        // Given
        val mockLogger = mockk<Logger>(relaxed = true)
        val alertService = AlertService(mockLogger)

        val unhealthyComponent = ComponentHealth(
            status = HealthStatus.UNHEALTHY,
            message = "Service down",
            details = mapOf("error" to "Connection refused")
        )

        // When
        alertService.checkAndAlert("testComponent", unhealthyComponent)

        // Then
        verify(exactly = 1) {
            mockLogger.warn(
                "Component unhealthy: {} - {} (details: {})",
                "testComponent",
                "Service down",
                mapOf("error" to "Connection refused")
            )
        }
    }

    "should log ERROR on 3rd consecutive failure" {
        // Given
        val mockLogger = mockk<Logger>(relaxed = true)
        val alertService = AlertService(mockLogger)

        val unhealthyComponent = ComponentHealth(
            status = HealthStatus.UNHEALTHY,
            message = "Service down"
        )

        // When
        alertService.checkAndAlert("testComponent", unhealthyComponent) // 1st failure
        alertService.checkAndAlert("testComponent", unhealthyComponent) // 2nd failure
        alertService.checkAndAlert("testComponent", unhealthyComponent) // 3rd failure (threshold)

        // Then
        verify(exactly = 1) {
            mockLogger.error(
                "Component unhealthy (ALERT): {} - {} (consecutive failures: {}, details: {})",
                "testComponent",
                "Service down",
                3,
                emptyMap<String, Any>()
            )
        }
    }

    "should reset counter on successful check" {
        // Given
        val mockLogger = mockk<Logger>(relaxed = true)
        val alertService = AlertService(mockLogger)

        val unhealthyComponent = ComponentHealth(
            status = HealthStatus.UNHEALTHY,
            message = "Service down"
        )
        val healthyComponent = ComponentHealth(
            status = HealthStatus.HEALTHY,
            message = "Service up"
        )

        // When
        alertService.checkAndAlert("testComponent", unhealthyComponent) // 1st failure
        alertService.checkAndAlert("testComponent", unhealthyComponent) // 2nd failure
        alertService.checkAndAlert("testComponent", healthyComponent)  // Recovery

        // Then
        alertService.getFailureCount("testComponent") shouldBe 0
        verify(exactly = 1) {
            mockLogger.info(
                "Component recovered: {} - {} (previous failures: {})",
                "testComponent",
                "Service up",
                2
            )
        }
    }

    "should not alert on transient failures" {
        // Given
        val mockLogger = mockk<Logger>(relaxed = true)
        val alertService = AlertService(mockLogger)

        val unhealthyComponent = ComponentHealth(
            status = HealthStatus.UNHEALTHY,
            message = "Service down"
        )

        // When
        alertService.checkAndAlert("testComponent", unhealthyComponent) // 1st failure
        alertService.checkAndAlert("testComponent", unhealthyComponent) // 2nd failure

        // Then - should only have WARN logs, no ERROR
        verify(exactly = 0) {
            mockLogger.error(any<String>(), any<String>(), any<String>(), any<Int>(), any<Map<String, Any>>())
        }
    }

    "should track failures separately per component" {
        // Given
        val mockLogger = mockk<Logger>(relaxed = true)
        val alertService = AlertService(mockLogger)

        val unhealthyComponent = ComponentHealth(
            status = HealthStatus.UNHEALTHY,
            message = "Service down"
        )

        // When
        alertService.checkAndAlert("component1", unhealthyComponent)
        alertService.checkAndAlert("component2", unhealthyComponent)

        // Then
        alertService.getFailureCount("component1") shouldBe 1
        alertService.getFailureCount("component2") shouldBe 1
    }

    "should handle degraded status" {
        // Given
        val mockLogger = mockk<Logger>(relaxed = true)
        val alertService = AlertService(mockLogger)

        val degradedComponent = ComponentHealth(
            status = HealthStatus.DEGRADED,
            message = "High latency",
            details = mapOf("latencyMs" to 250)
        )

        // When
        alertService.checkAndAlert("testComponent", degradedComponent)

        // Then
        verify(exactly = 1) {
            mockLogger.warn(
                "Component degraded: {} - {} (details: {})",
                "testComponent",
                "High latency",
                mapOf("latencyMs" to 250)
            )
        }
    }

    "should escalate degraded status on 3rd consecutive failure" {
        // Given
        val mockLogger = mockk<Logger>(relaxed = true)
        val alertService = AlertService(mockLogger)

        val degradedComponent = ComponentHealth(
            status = HealthStatus.DEGRADED,
            message = "High latency"
        )

        // When
        alertService.checkAndAlert("testComponent", degradedComponent) // 1st
        alertService.checkAndAlert("testComponent", degradedComponent) // 2nd
        alertService.checkAndAlert("testComponent", degradedComponent) // 3rd (threshold)

        // Then
        verify(exactly = 1) {
            mockLogger.error(
                "Component degraded (ALERT): {} - {} (consecutive failures: {}, details: {})",
                "testComponent",
                "High latency",
                3,
                emptyMap<String, Any>()
            )
        }
    }

    "should not log on healthy status when no previous failures" {
        // Given
        val mockLogger = mockk<Logger>(relaxed = true)
        val alertService = AlertService(mockLogger)

        val healthyComponent = ComponentHealth(
            status = HealthStatus.HEALTHY,
            message = "All good"
        )

        // When
        alertService.checkAndAlert("testComponent", healthyComponent)

        // Then - no logging should occur
        verify(exactly = 0) {
            mockLogger.info(any<String>(), any<String>(), any<String>(), any<Int>())
            mockLogger.warn(any<String>(), any<String>(), any<String>(), any<Map<String, Any>>())
            mockLogger.error(any<String>(), any<String>(), any<String>(), any<Int>(), any<Map<String, Any>>())
        }
    }
})
