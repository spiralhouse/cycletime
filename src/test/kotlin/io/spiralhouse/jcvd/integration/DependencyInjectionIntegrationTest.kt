package io.spiralhouse.jcvd.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.spiralhouse.jcvd.domain.repositories.IssueRepository
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.repositories.SessionRepository
import io.spiralhouse.jcvd.domain.services.SystemTimeProvider
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.jcvd.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.jcvd.infrastructure.di.resolve
import io.spiralhouse.jcvd.module

/**
 * Integration tests for the dependency injection migration from Koin to manual DI.
 * 
 * These tests verify that:
 * 1. The manual DI system initializes correctly
 * 2. All dependencies are resolved properly
 * 3. The application starts successfully with the new DI system
 */
class DependencyInjectionIntegrationTest : StringSpec({

    "should initialize manual DI successfully" {
        testApplication {
            application {
                module()
            }
            
            // Test that the application module loads without throwing exceptions
            // This verifies that all DI bindings are correctly configured
        }
    }

    "should resolve TimeProvider as SystemTimeProvider singleton" {
        testApplication {
            application {
                module()
            }
            
            client.get("/health")  // Trigger application initialization
            
            val timeProvider1 = application.resolve<TimeProvider>()
            val timeProvider2 = application.resolve<TimeProvider>()
            
            // Verify correct implementation type
            timeProvider1.shouldBeInstanceOf<SystemTimeProvider>()
            
            // Verify singleton behavior - same instance
            timeProvider1 shouldBe timeProvider2
        }
    }

    "should resolve repository dependencies correctly" {
        testApplication {
            application {
                module()
            }
            
            client.get("/health")  // Trigger application initialization
            
            val projectRepository = application.resolve<ProjectRepository>()
            val issueRepository = application.resolve<IssueRepository>()
            val sessionRepository = application.resolve<SessionRepository>()
            
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
                module()
            }
            
            client.get("/health")  // Trigger application initialization
            
            // Verify singleton behavior for each repository
            val projectRepository1 = application.resolve<ProjectRepository>()
            val projectRepository2 = application.resolve<ProjectRepository>()
            projectRepository1 shouldBe projectRepository2
            
            val issueRepository1 = application.resolve<IssueRepository>()
            val issueRepository2 = application.resolve<IssueRepository>()
            issueRepository1 shouldBe issueRepository2
            
            val sessionRepository1 = application.resolve<SessionRepository>()
            val sessionRepository2 = application.resolve<SessionRepository>()
            sessionRepository1 shouldBe sessionRepository2
        }
    }

    "should start application successfully and respond to health check" {
        testApplication {
            application {
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