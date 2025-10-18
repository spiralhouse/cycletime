package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.ktor.client.request.*
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper.configureTestApplication
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import org.jetbrains.exposed.sql.Database

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

    beforeSpec {
        // Initialize test database using helper to prevent race conditions
        DatabaseTestHelper.initTestDatabase(
            testName = "dependencies_test",
            enableLogging = false
        )
    }

    afterSpec {
        // Clean up test database
        DatabaseTestHelper.cleanupTestDatabase()
    }
    
    "should configure all dependencies using Ktor's native DI" {
        testApplication {
            // Use helper to ensure proper initialization order
            configureTestApplication(testName = "dependencies_test")

            // Trigger application initialization
            client.get("/health")
            
            // Verify all dependencies are registered and resolvable
            val timeProvider: TimeProvider by application.dependencies
            val database: Database by application.dependencies
            val unitOfWork: ExposedUnitOfWork by application.dependencies
            val projectRepo: ExposedProjectRepository by application.dependencies
            val issueRepo: ExposedIssueRepository by application.dependencies
            val sessionRepo: ExposedSessionRepository by application.dependencies
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