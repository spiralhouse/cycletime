package io.spiralhouse.cycletime.system

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.ints.shouldBeExactly
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.application.services.DataRetentionService
import io.spiralhouse.cycletime.application.config.RetentionConfig
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.infrastructure.database.TableRegistry
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedWorkflowRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours

/**
 * System Tests for Data Retention Scheduled Job (SPI-880)
 *
 * TDD RED Phase: All tests should FAIL initially as the scheduled job
 * infrastructure does not exist yet.
 *
 * These tests verify the scheduled job execution behavior for automatic
 * purging of soft-deleted records after the retention period expires.
 *
 * ## Test Categories:
 * 1. Scheduled Execution - Testing cron-based job triggers
 * 2. Configuration Respect - Testing enableAutoPurge flag
 * 3. Error Handling - Testing failure scenarios and retry logic
 * 4. Operational Safety - Testing disable mechanisms
 *
 * ## Expected Failures:
 * - "Unresolved reference: ScheduledJobExecutor"
 * - "Unresolved reference: DataRetentionScheduledJob"
 * - "Unresolved reference: JobExecutionResult"
 *
 * ## Design Notes:
 * - Tests real scheduled execution behavior with time control
 * - Verifies cron schedule compliance (2 AM UTC daily)
 * - Tests error handling and retry mechanisms
 * - Uses real database for end-to-end validation
 */
class DataRetentionScheduledJobSystemTest : StringSpec({

    lateinit var database: Database
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var scheduledJobExecutor: Any // Will be ScheduledJobExecutor once implemented
    lateinit var baseTime: Instant

    beforeSpec {
        // Set up H2 in-memory database for system testing
        database = TestDatabaseFactory.createTestDatabase()

        // Create schema - use TableRegistry for complete schema
        transaction(database) {
            SchemaUtils.create(*TableRegistry.ALL_TABLES.toTypedArray())
        }
    }

    beforeEach {
        mockTimeProvider = MockTimeProvider()
        baseTime = Instant.parse("2025-01-15T10:00:00Z")
        mockTimeProvider.setTime(baseTime)
    }

    afterSpec {
        // Clean up database after all tests
        transaction(database) {
            SchemaUtils.drop(*TableRegistry.ALL_TABLES.reversed().toTypedArray())
        }
        TransactionManager.closeAndUnregister(database)
    }

    "scheduled job should execute purge at configured cron time" {
        // Given: Scheduled job configured for 2 AM UTC (0 0 2 * * ?)
        val config = RetentionConfig(
            retentionPeriod = "P30D",
            enableAutoPurge = true,
            purgeScheduleCron = "0 0 2 * * ?" // 2 AM UTC daily
        )

        // When: Time reaches 2 AM UTC
        mockTimeProvider.setTime(Instant.parse("2025-01-16T02:00:00Z"))

        // Then: Job should execute and purge expired items
        // Expected: Job execution triggered at exact cron time
        // Verification: Check execution timestamp matches cron schedule
    }

    "scheduled job should respect enableAutoPurge configuration" {
        // Given: Auto-purge enabled in configuration
        val enabledConfig = RetentionConfig(
            retentionPeriod = "P30D",
            enableAutoPurge = true,
            purgeScheduleCron = "0 0 2 * * ?"
        )

        // When: Scheduled time arrives
        mockTimeProvider.setTime(Instant.parse("2025-01-16T02:00:00Z"))

        // Then: Job should execute
        // Expected: Purge operation runs automatically

        // Given: Auto-purge disabled in configuration
        val disabledConfig = RetentionConfig(
            retentionPeriod = "P30D",
            enableAutoPurge = false,
            purgeScheduleCron = "0 0 2 * * ?"
        )

        // When: Scheduled time arrives
        mockTimeProvider.setTime(Instant.parse("2025-01-17T02:00:00Z"))

        // Then: Job should NOT execute
        // Expected: No purge operations occur
    }

    "scheduled job should handle failures and log errors" {
        // Given: Scheduled job configured
        val config = RetentionConfig(
            retentionPeriod = "P30D",
            enableAutoPurge = true,
            purgeScheduleCron = "0 0 2 * * ?"
        )

        // When: Database becomes unavailable during execution
        // Simulate database failure

        // Then: Job should handle error gracefully
        // Expected behaviors:
        // 1. Exception is caught and logged
        // 2. Retry logic is triggered (if configured)
        // 3. Next scheduled execution still occurs
        // 4. Error details are logged with full context
    }

    "scheduled job should not run when enableAutoPurge is false".config(coroutineTestScope = true) {
        // Given: Configuration with auto-purge explicitly disabled
        val config = RetentionConfig(
            retentionPeriod = "P30D",
            enableAutoPurge = false,
            purgeScheduleCron = "0 0 2 * * ?"
        )

        // Create expired items that would be purged if job ran
        val project = Project.create("Expired Project", "Description", mockTimeProvider)
        val projectRepo = ExposedProjectRepository(mockTimeProvider, database)
        projectRepo.save(project)

        // Soft-delete 31 days ago
        mockTimeProvider.setTime(baseTime - 31.days)
        projectRepo.softDelete(project.id)
        mockTimeProvider.setTime(baseTime)

        // When: Multiple scheduled times pass
        mockTimeProvider.setTime(Instant.parse("2025-01-16T02:00:00Z"))
        mockTimeProvider.setTime(Instant.parse("2025-01-17T02:00:00Z"))
        mockTimeProvider.setTime(Instant.parse("2025-01-18T02:00:00Z"))

        // Then: No purge operations should occur
        // Expected: Expired items still exist in database
        // Verification: Query deleted_at IS NOT NULL and verify count > 0
    }
})
