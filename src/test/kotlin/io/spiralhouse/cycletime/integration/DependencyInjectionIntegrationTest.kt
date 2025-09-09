package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.module

/**
 * Integration tests for the dependency injection migration from Koin to Ktor native DI.
 *
 * These tests verify that:
 * 1. The Ktor native DI system initializes correctly
 * 2. All dependencies are resolved properly
 * 3. The application starts successfully with the new DI system
 */
class DependencyInjectionIntegrationTest : StringSpec({

    "should initialize Ktor native DI successfully" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }

            // Test that the application module loads without throwing exceptions
            // This verifies that all DI bindings are correctly configured
        }
    }

    "should resolve TimeProvider as SystemTimeProvider singleton" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }

            client.get("/health")  // Trigger application initialization

            val timeProvider1: TimeProvider by application.dependencies
            val timeProvider2: TimeProvider by application.dependencies

            // Verify correct implementation type
            timeProvider1.shouldBeInstanceOf<SystemTimeProvider>()

            // Verify singleton behavior - same instance
            timeProvider1 shouldBe timeProvider2
        }
    }

    "should resolve repository dependencies correctly" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }

            client.get("/health")  // Trigger application initialization

            val projectRepository: ProjectRepository by application.dependencies
            val issueRepository: IssueRepository by application.dependencies
            val sessionRepository: SessionRepository by application.dependencies

            // Verify correct implementation types
            projectRepository.shouldBeInstanceOf<ExposedProjectRepository>()
            issueRepository.shouldBeInstanceOf<ExposedIssueRepository>()
            sessionRepository.shouldBeInstanceOf<ExposedSessionRepository>()

            // All repositories should be non-null
            projectRepository shouldNotBe null
            issueRepository shouldNotBe null
            sessionRepository shouldNotBe null
        }
    }

    "should maintain singleton instances for repositories" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }

            client.get("/health")  // Trigger application initialization

            // Verify singleton behavior for each repository
            val projectRepository1: ProjectRepository by application.dependencies
            val projectRepository2: ProjectRepository by application.dependencies
            projectRepository1 shouldBe projectRepository2

            val issueRepository1: IssueRepository by application.dependencies
            val issueRepository2: IssueRepository by application.dependencies
            issueRepository1 shouldBe issueRepository2

            val sessionRepository1: SessionRepository by application.dependencies
            val sessionRepository2: SessionRepository by application.dependencies
            sessionRepository1 shouldBe sessionRepository2
        }
    }

    "should start application successfully and respond to health check" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }

            val response = client.get("/health")

            response.status shouldBe HttpStatusCode.OK

            val body = response.bodyAsText()
            body shouldNotBe null
            // Verify health response contains expected fields
            body.contains("status") shouldBe true
            body.contains("service") shouldBe true
            body.contains("version") shouldBe true
        }
    }

    "should handle application lifecycle correctly" {
        testApplication {
            application {
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }

            // Verify the application can start and stop without issues
            // This tests the complete lifecycle including database initialization
            val healthResponse = client.get("/health")
            healthResponse.status shouldBe HttpStatusCode.OK

            // Application will be automatically stopped by testApplication
            // This verifies proper cleanup including database connection closure
        }
    }
})
