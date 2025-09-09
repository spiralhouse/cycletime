package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.types.shouldBeSameInstanceAs
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.ktor.client.request.*
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.infrastructure.di.modules.test.FixedTimeProvider
import io.spiralhouse.cycletime.infrastructure.di.modules.test.configureTestDependencies
import io.spiralhouse.cycletime.infrastructure.di.modules.test.testTimeProvider
import io.spiralhouse.cycletime.infrastructure.di.modules.test.createTestDatabase
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import org.jetbrains.exposed.sql.Database
import io.spiralhouse.cycletime.module
import io.spiralhouse.cycletime.infrastructure.di.modules.test.configureForTesting

/**
 * Tests for the dependency injection system.
 * 
 * These tests verify that the DI configuration:
 * - Properly configures all dependencies
 * - Respects singleton scoping
 * - Allows test overrides
 * - Works consistently without profiles
 */
class DependenciesTest : StringSpec({
    
    "should configure all dependencies using Ktor's native DI" {
        testApplication {
            application {
                // Use the test configuration approach like DependencyInjectionIntegrationTest
                // This tests the DI without database conflicts
                configureForTesting(
                    database = createTestDatabase(),
                    timeProvider = null // Use default SystemTimeProvider
                )
            }
            
            // Trigger application initialization
            client.get("/health")
            
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
            
            // Verify the simplified DI works - check that we get system time provider
            timeProvider.shouldBeInstanceOf<SystemTimeProvider>()
        }
    }
})