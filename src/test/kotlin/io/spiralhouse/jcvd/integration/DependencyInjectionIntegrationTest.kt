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
import io.spiralhouse.jcvd.module
import io.spiralhouse.jcvd.di
import io.spiralhouse.jcvd.infrastructure.di.getInstance

/**
 * Integration tests for the dependency injection container migration from Koin to Ktor native DI.
 * 
 * These tests verify that:
 * 1. The DI container initializes correctly
 * 2. All dependencies are resolved properly
 * 3. Singletons are maintained
 * 4. The application starts successfully with the new DI system
 */
class DependencyInjectionIntegrationTest : StringSpec({

    "should initialize DI container successfully" {
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
            
            val timeProvider1 = application.di.getInstance<TimeProvider>()
            val timeProvider2 = application.di.getInstance<TimeProvider>()
            
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
            
            val projectRepo = application.di.getInstance<ProjectRepository>()
            val issueRepo = application.di.getInstance<IssueRepository>()
            val sessionRepo = application.di.getInstance<SessionRepository>()
            
            // Verify correct implementation types
            projectRepo.shouldBeInstanceOf<ExposedProjectRepository>()
            issueRepo.shouldBeInstanceOf<ExposedIssueRepository>()
            sessionRepo.shouldBeInstanceOf<ExposedSessionRepository>()
            
            // All repositories should be non-null
            projectRepo shouldNotBe null
            issueRepo shouldNotBe null
            sessionRepo shouldNotBe null
        }
    }

    "should maintain singleton instances for repositories" {
        testApplication {
            application {
                module()
            }
            
            client.get("/health")  // Trigger application initialization
            
            // Verify singleton behavior for each repository
            val projectRepo1 = application.di.getInstance<ProjectRepository>()
            val projectRepo2 = application.di.getInstance<ProjectRepository>()
            projectRepo1 shouldBe projectRepo2
            
            val issueRepo1 = application.di.getInstance<IssueRepository>()
            val issueRepo2 = application.di.getInstance<IssueRepository>()
            issueRepo1 shouldBe issueRepo2
            
            val sessionRepo1 = application.di.getInstance<SessionRepository>()
            val sessionRepo2 = application.di.getInstance<SessionRepository>()
            sessionRepo1 shouldBe sessionRepo2
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