package io.spiralhouse.cycletime.infrastructure.di

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.types.shouldBeSameInstanceAs
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.di.modules.test.FixedTimeProvider
import io.spiralhouse.cycletime.infrastructure.di.modules.test.configureTestDependencies
import io.spiralhouse.cycletime.infrastructure.di.modules.test.testTimeProvider
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import org.jetbrains.exposed.sql.Database

/**
 * Tests for the simplified dependency injection system.
 * 
 * These tests verify that the simplified DI configuration:
 * - Properly configures all dependencies
 * - Respects singleton scoping
 * - Allows test overrides
 * - Works with different profiles
 */
class SimplifiedDITest : StringSpec({
    
    "should configure all dependencies using Ktor's native DI" {
        testApplication {
            application {
                configureSimplifiedDependencies("test")
            }
            
            // Verify all dependencies are registered and resolvable
            val timeProvider: TimeProvider by application.dependencies
            val database: Database by application.dependencies
            val unitOfWork: UnitOfWork by application.dependencies
            val projectRepo: ProjectRepository by application.dependencies
            val issueRepo: IssueRepository by application.dependencies
            val sessionRepo: SessionRepository by application.dependencies
            val projectService: ProjectApplicationService by application.dependencies
            val issueService: IssueApplicationService by application.dependencies
            val sessionService: SessionApplicationService by application.dependencies
            
            // All dependencies should be resolved
            timeProvider shouldNotBe null
            database shouldNotBe null
            unitOfWork shouldNotBe null
            projectRepo shouldNotBe null
            issueRepo shouldNotBe null
            sessionRepo shouldNotBe null
            projectService shouldNotBe null
            issueService shouldNotBe null
            sessionService shouldNotBe null
        }
    }
    
    "should use singleton scope for services" {
        testApplication {
            application {
                configureSimplifiedDependencies("test")
            }
            
            // Get the same service twice
            val projectService1: ProjectApplicationService by application.dependencies
            val projectService2: ProjectApplicationService by application.dependencies
            
            // Should be the same instance (singleton)
            projectService1 shouldBeSameInstanceAs projectService2
        }
    }
    
    "should allow custom time provider for testing" {
        testApplication {
            application {
                val customTimeProvider = testTimeProvider("2024-12-25T00:00:00Z")
                configureSimplifiedDependencies("test", customTimeProvider)
            }
            
            val timeProvider: TimeProvider by application.dependencies
            timeProvider.shouldBeInstanceOf<FixedTimeProvider>()
        }
    }
    
    "should configure test dependencies with helper function" {
        testApplication {
            application {
                val testTime = testTimeProvider("2024-06-15T12:00:00Z")
                configureTestDependencies(testTime)
            }
            
            // Verify test configuration
            val timeProvider: TimeProvider by application.dependencies
            val database: Database by application.dependencies
            
            timeProvider.shouldBeInstanceOf<FixedTimeProvider>()
            database shouldNotBe null
        }
    }
    
    "should configure test dependencies with custom time provider" {
        testApplication {
            application {
                val customTime = FixedTimeProvider(kotlinx.datetime.Instant.parse("2024-03-15T10:00:00Z"))
                configureTestDependencies(customTime)
            }
            
            // Standard dependencies should still work
            val timeProvider: TimeProvider by application.dependencies
            timeProvider shouldNotBe null
            timeProvider.shouldBeInstanceOf<FixedTimeProvider>()
        }
    }
    
    "should use correct repository implementations" {
        testApplication {
            application {
                configureSimplifiedDependencies("test")
            }
            
            val projectRepo: ProjectRepository by application.dependencies
            val issueRepo: IssueRepository by application.dependencies
            val sessionRepo: SessionRepository by application.dependencies
            val unitOfWork: UnitOfWork by application.dependencies
            
            // Verify correct implementations are used
            projectRepo.shouldBeInstanceOf<ExposedProjectRepository>()
            issueRepo.shouldBeInstanceOf<ExposedIssueRepository>()
            sessionRepo.shouldBeInstanceOf<ExposedSessionRepository>()
            unitOfWork.shouldBeInstanceOf<ExposedUnitOfWork>()
        }
    }
    
    "should configure dev profile with DatabaseFactory" {
        testApplication {
            application {
                configureSimplifiedDependencies("dev")
            }
            
            // In dev profile, should use DatabaseFactory
            val database: Database by application.dependencies
            database shouldNotBe null
        }
    }
    
    "should configure prod profile same as dev" {
        testApplication {
            application {
                configureSimplifiedDependencies("prod")
            }
            
            // In prod profile, should also use DatabaseFactory
            val database: Database by application.dependencies
            database shouldNotBe null
        }
    }
})