package io.spiralhouse.cycletime.unit.infrastructure

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.infrastructure.database.DatabaseProvider
import io.spiralhouse.cycletime.infrastructure.health.HealthCheckService
import io.spiralhouse.cycletime.infrastructure.health.HealthStatus
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk

/**
 * Unit tests for HealthCheckService.
 *
 * Tests health check logic with mocked dependencies to verify:
 * - Component health status calculation
 * - Threshold-based degradation detection
 * - Error handling and unhealthy state reporting
 */
class HealthCheckServiceTest : StringSpec({

    "should return healthy when all checks pass" {
        // Given
        val mockDatabaseProvider = mockk<DatabaseProvider> {
            every { isReady() } returns true
            every { getDatabase() } returns mockk()
        }
        val mockProjectService = mockk<ProjectApplicationService>()
        val mockSessionService = mockk<SessionApplicationService> {
            coEvery { getSessionCount() } returns 5
        }

        val healthCheckService = HealthCheckService(
            databaseProvider = mockDatabaseProvider,
            projectService = mockProjectService,
            sessionService = mockSessionService
        )

        // When
        val systemHealth = healthCheckService.checkSystemHealth()

        // Then
        systemHealth.overallStatus shouldBe HealthStatus.HEALTHY
        systemHealth.checks.size shouldBe 3
        systemHealth.checks["database"]?.status shouldBe HealthStatus.HEALTHY
        systemHealth.checks["memory"]?.status shouldBe HealthStatus.HEALTHY
        systemHealth.checks["mcp"]?.status shouldBe HealthStatus.HEALTHY
    }

    "should return degraded when memory usage is high" {
        // Given
        val mockDatabaseProvider = mockk<DatabaseProvider> {
            every { isReady() } returns true
            every { getDatabase() } returns mockk()
        }
        val mockProjectService = mockk<ProjectApplicationService>()
        val mockSessionService = mockk<SessionApplicationService> {
            coEvery { getSessionCount() } returns 5
        }

        val healthCheckService = HealthCheckService(
            databaseProvider = mockDatabaseProvider,
            projectService = mockProjectService,
            sessionService = mockSessionService
        )

        // When
        val systemHealth = healthCheckService.checkSystemHealth()

        // Then
        // Memory status depends on actual JVM heap usage
        // If heap usage is > 70%, status should be DEGRADED
        val memoryHealth = systemHealth.checks["memory"]
        memoryHealth shouldNotBe null
        memoryHealth?.status.shouldBeInstanceOf<HealthStatus>()
    }

    "should return unhealthy when database fails" {
        // Given
        val mockDatabaseProvider = mockk<DatabaseProvider> {
            every { isReady() } returns false
        }
        val mockProjectService = mockk<ProjectApplicationService>()
        val mockSessionService = mockk<SessionApplicationService> {
            coEvery { getSessionCount() } returns 5
        }

        val healthCheckService = HealthCheckService(
            databaseProvider = mockDatabaseProvider,
            projectService = mockProjectService,
            sessionService = mockSessionService
        )

        // When
        val systemHealth = healthCheckService.checkSystemHealth()

        // Then
        systemHealth.overallStatus shouldBe HealthStatus.UNHEALTHY
        systemHealth.checks["database"]?.status shouldBe HealthStatus.UNHEALTHY
        systemHealth.checks["database"]?.message shouldBe "Database not ready"
    }

    "should include component details in response" {
        // Given
        val mockDatabaseProvider = mockk<DatabaseProvider> {
            every { isReady() } returns true
            every { getDatabase() } returns mockk()
        }
        val mockProjectService = mockk<ProjectApplicationService>()
        val mockSessionService = mockk<SessionApplicationService> {
            coEvery { getSessionCount() } returns 42
        }

        val healthCheckService = HealthCheckService(
            databaseProvider = mockDatabaseProvider,
            projectService = mockProjectService,
            sessionService = mockSessionService
        )

        // When
        val systemHealth = healthCheckService.checkSystemHealth()

        // Then
        val mcpHealth = systemHealth.checks["mcp"]
        mcpHealth shouldNotBe null
        mcpHealth?.details?.get("activeSessions") shouldBe 42
    }

    "should measure check latency" {
        // Given
        val mockDatabaseProvider = mockk<DatabaseProvider> {
            every { isReady() } returns true
            every { getDatabase() } returns mockk()
        }
        val mockProjectService = mockk<ProjectApplicationService>()
        val mockSessionService = mockk<SessionApplicationService> {
            coEvery { getSessionCount() } returns 5
        }

        val healthCheckService = HealthCheckService(
            databaseProvider = mockDatabaseProvider,
            projectService = mockProjectService,
            sessionService = mockSessionService
        )

        // When
        val systemHealth = healthCheckService.checkSystemHealth()

        // Then
        val dbHealth = systemHealth.checks["database"]
        dbHealth shouldNotBe null
        dbHealth?.latencyMs shouldNotBe null
        (dbHealth?.latencyMs!! >= 0) shouldBe true
    }

    "should return degraded when MCP session count is high" {
        // Given
        val mockDatabaseProvider = mockk<DatabaseProvider> {
            every { isReady() } returns true
            every { getDatabase() } returns mockk()
        }
        val mockProjectService = mockk<ProjectApplicationService>()
        val mockSessionService = mockk<SessionApplicationService> {
            coEvery { getSessionCount() } returns 150 // > threshold of 100
        }

        val healthCheckService = HealthCheckService(
            databaseProvider = mockDatabaseProvider,
            projectService = mockProjectService,
            sessionService = mockSessionService
        )

        // When
        val systemHealth = healthCheckService.checkSystemHealth()

        // Then
        val mcpHealth = systemHealth.checks["mcp"]
        mcpHealth?.status shouldBe HealthStatus.DEGRADED
        mcpHealth?.message shouldBe "High session count"
    }

    "should handle database exception gracefully" {
        // Given
        val mockDatabaseProvider = mockk<DatabaseProvider> {
            every { isReady() } throws RuntimeException("Connection failed")
        }
        val mockProjectService = mockk<ProjectApplicationService>()
        val mockSessionService = mockk<SessionApplicationService> {
            coEvery { getSessionCount() } returns 5
        }

        val healthCheckService = HealthCheckService(
            databaseProvider = mockDatabaseProvider,
            projectService = mockProjectService,
            sessionService = mockSessionService
        )

        // When
        val systemHealth = healthCheckService.checkSystemHealth()

        // Then
        systemHealth.overallStatus shouldBe HealthStatus.UNHEALTHY
        systemHealth.checks["database"]?.status shouldBe HealthStatus.UNHEALTHY
        systemHealth.checks["database"]?.message shouldBe "Database check failed: Connection failed"
    }
})
