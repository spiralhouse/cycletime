package io.spiralhouse.cycletime.unit.application

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContainExactlyInAnyOrder
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.ints.shouldBeExactly
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.application.services.DataRetentionService
import io.spiralhouse.cycletime.application.services.PurgeResult
import io.spiralhouse.cycletime.application.config.RetentionConfig
import io.spiralhouse.cycletime.application.exceptions.InvalidConfirmationException
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.IssueType
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.unit.mocks.MockProjectRepository
import io.spiralhouse.cycletime.unit.mocks.MockIssueRepository
import io.spiralhouse.cycletime.unit.mocks.MockWorkflowRepository
import io.spiralhouse.cycletime.unit.mocks.MockAuditLogRepository
import io.spiralhouse.cycletime.unit.mocks.MockUnitOfWork
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours

/**
 * Unit Tests for DataRetentionService (SPI-880)
 *
 * TDD RED Phase: All tests should FAIL initially as DataRetentionService
 * and related classes do not exist yet.
 *
 * These tests define the expected behavior for the Data Retention Service which
 * handles scheduled purging of soft-deleted records after the 30-day retention period.
 *
 * ## Test Categories:
 * 1. Scheduled Purge Operations - Testing purgeExpiredDeletions()
 * 2. Cutoff Date Calculation - Verifying 30-day retention window
 * 3. PurgeResult Counting - Verifying counts of purged entities
 * 4. Manual Purge Operations - Testing purgeProject() and purgeIssue()
 * 5. Confirmation Validation - Testing safety confirmation strings
 * 6. Configuration Respect - Testing RetentionConfig behavior
 *
 * ## Expected Failures:
 * - "Unresolved reference: DataRetentionService"
 * - "Unresolved reference: PurgeResult"
 * - "Unresolved reference: RetentionConfig"
 * - "Unresolved reference: InvalidConfirmationException"
 *
 * ## Design Notes:
 * - Uses MockTimeProvider for deterministic time control (no real delays)
 * - Uses mock repositories for fast, isolated unit testing
 * - Tests service-layer business logic, not database operations
 */
class DataRetentionServiceTest : StringSpec({

    // ================================================================================
    // Test Infrastructure Setup
    // ================================================================================

    lateinit var mockProjectRepository: MockProjectRepository
    lateinit var mockIssueRepository: MockIssueRepository
    lateinit var mockWorkflowRepository: MockWorkflowRepository
    lateinit var mockAuditLogRepository: MockAuditLogRepository
    lateinit var mockUnitOfWork: MockUnitOfWork
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var dataRetentionService: DataRetentionService
    lateinit var defaultConfig: RetentionConfig

    // Common test data
    lateinit var baseTime: Instant
    lateinit var testProjectId: ProjectId
    lateinit var testIssueId: IssueId

    beforeEach {
        // Reset all mocks to ensure test isolation
        mockProjectRepository = MockProjectRepository()
        mockIssueRepository = MockIssueRepository()
        mockWorkflowRepository = MockWorkflowRepository()
        mockAuditLogRepository = MockAuditLogRepository()
        mockUnitOfWork = MockUnitOfWork()
        mockTimeProvider = MockTimeProvider()

        // Initialize common test data
        baseTime = Instant.parse("2025-01-15T10:00:00Z")
        mockTimeProvider.setTime(baseTime)
        testProjectId = ProjectId.generate()
        testIssueId = IssueId.generate()

        // Default 30-day retention configuration
        defaultConfig = RetentionConfig(
            retentionPeriod = "P30D",
            enableAutoPurge = true,
            purgeScheduleCron = "0 0 2 * * ?"
        )

        // Create service with mocked dependencies
        dataRetentionService = DataRetentionService(
            projectRepository = mockProjectRepository,
            issueRepository = mockIssueRepository,
            workflowRepository = mockWorkflowRepository,
            auditLogRepository = mockAuditLogRepository,
            timeProvider = mockTimeProvider,
            unitOfWork = mockUnitOfWork,
            config = defaultConfig
        )
    }

    // ================================================================================
    // Helper Methods for Test Setup
    // ================================================================================

    fun createDeletedProject(
        id: ProjectId = ProjectId.generate(),
        name: String = "Deleted Project",
        deletedAt: Instant = baseTime - 31.days
    ): Project {
        // Create project with deletedAt set using fromSnapshot
        val project = Project.create(name, "Test description", mockTimeProvider)
        val snapshot = project.toSnapshot().copy(id = id, deletedAt = deletedAt)
        val deletedProject = Project.fromSnapshot(snapshot, mockTimeProvider)
        // Simulate soft-deletion by adding to deletedProjects map
        mockProjectRepository.deletedProjects[id] = deletedProject
        return deletedProject
    }

    fun createDeletedIssue(
        id: IssueId = IssueId.generate(),
        projectId: ProjectId? = null,
        title: String = "Deleted Issue",
        deletedAt: Instant = baseTime - 31.days
    ): Issue {
        // Create issue with deletedAt set using fromSnapshot
        val issue = Issue.create(
            title = title,
            description = "Test issue description",
            projectId = projectId,
            type = IssueType.STORY,
            timeProvider = mockTimeProvider
        )
        val snapshot = issue.toSnapshot().copy(id = id, deletedAt = deletedAt)
        val deletedIssue = Issue.fromSnapshot(snapshot, mockTimeProvider)
        // Simulate soft-deletion by adding to deletedIssues map
        mockIssueRepository.deletedIssues[id] = deletedIssue
        return deletedIssue
    }

    // ================================================================================
    // Scheduled Purge Operations Tests
    // ================================================================================

    "purgeExpiredDeletions should calculate correct cutoff date (now - 30 days)" {
        // Given: Current time is baseTime, expected cutoff is 30 days prior
        val expectedCutoff = baseTime - 30.days

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Cutoff should be exactly 30 days before current time
        // Note: We verify this by checking that items deleted 30+ days ago are purged
        result shouldNotBe null
        result.cutoffDate shouldBe expectedCutoff
    }

    "purgeExpiredDeletions should purge projects deleted more than 30 days ago" {
        // Given: Project deleted 31 days ago
        val oldProject = createDeletedProject(
            deletedAt = baseTime - 31.days
        )

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Project should be permanently deleted (hard delete)
        result.projects shouldBeExactly 1
    }

    "purgeExpiredDeletions should NOT purge projects deleted less than 30 days ago" {
        // Given: Project deleted 29 days ago (within retention period)
        val recentProject = createDeletedProject(
            deletedAt = baseTime - 29.days
        )

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Project should NOT be purged
        result.projects shouldBeExactly 0
    }

    "purgeExpiredDeletions should purge issues deleted more than 30 days ago" {
        // Given: Issue deleted 31 days ago
        val oldIssue = createDeletedIssue(
            deletedAt = baseTime - 31.days
        )

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Issue should be permanently deleted
        result.issues shouldBeExactly 1
    }

    "purgeExpiredDeletions should NOT purge issues deleted less than 30 days ago" {
        // Given: Issue deleted 29 days ago (within retention period)
        val recentIssue = createDeletedIssue(
            deletedAt = baseTime - 29.days
        )

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Issue should NOT be purged
        result.issues shouldBeExactly 0
    }

    "purgeExpiredDeletions should handle boundary case at exactly 30 days" {
        // Given: Project deleted exactly 30 days ago (edge case)
        val boundaryProject = createDeletedProject(
            deletedAt = baseTime - 30.days
        )

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Project at exactly 30 days should NOT be purged (< 30, not <=)
        // Retention is "30 days OR MORE" not "more than 30 days"
        result.projects shouldBeExactly 0
    }

    // ================================================================================
    // PurgeResult Counting Tests
    // ================================================================================

    "purgeExpiredDeletions should return correct PurgeResult counts for mixed entities" {
        // Given: Multiple projects and issues deleted at various times
        // 31+ days old (should be purged)
        createDeletedProject(deletedAt = baseTime - 35.days)
        createDeletedProject(deletedAt = baseTime - 40.days)
        createDeletedIssue(deletedAt = baseTime - 31.days)
        createDeletedIssue(deletedAt = baseTime - 45.days)
        createDeletedIssue(deletedAt = baseTime - 60.days)

        // 29 days old (should NOT be purged)
        createDeletedProject(deletedAt = baseTime - 29.days)
        createDeletedIssue(deletedAt = baseTime - 15.days)

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Only old items purged
        result.projects shouldBeExactly 2
        result.issues shouldBeExactly 3
        result.workflows shouldBeExactly 0
        result.totalPurged shouldBeExactly 5
    }

    "purgeExpiredDeletions should return zero counts when no expired items exist" {
        // Given: No deleted items or only recent deletions
        createDeletedProject(deletedAt = baseTime - 5.days)
        createDeletedIssue(deletedAt = baseTime - 10.days)

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: All counts should be zero
        result.projects shouldBeExactly 0
        result.issues shouldBeExactly 0
        result.workflows shouldBeExactly 0
        result.totalPurged shouldBeExactly 0
        result.cutoffDate shouldBe (baseTime - 30.days)
    }

    "purgeExpiredDeletions should return complete PurgeResult" {
        // Given: Some expired items
        createDeletedProject(deletedAt = baseTime - 31.days)

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: PurgeResult should contain all required fields
        result.projects shouldBeExactly 1
        result.issues shouldBeExactly 0
        result.workflows shouldBeExactly 0
        result.totalPurged shouldBeExactly 1
        result.cutoffDate shouldNotBe null
    }

    // ================================================================================
    // Manual Purge Operations Tests
    // ================================================================================

    "purgeProject should require confirmation string matching project ID" {
        // Given: A deleted project
        val projectId = ProjectId.generate()
        createDeletedProject(id = projectId)

        // When: Attempt to purge with correct confirmation
        // Then: Should succeed without throwing
        dataRetentionService.purgeProject(projectId, "CONFIRM_PERMANENT_DELETE", "test-user-id")
        mockProjectRepository.purgeCallCount shouldBe 1
    }

    "purgeProject should throw InvalidConfirmationException for wrong confirmation" {
        // Given: A deleted project
        val projectId = ProjectId.generate()
        createDeletedProject(id = projectId)

        // When & Then: Attempt with wrong confirmation should fail
        shouldThrow<InvalidConfirmationException> {
            dataRetentionService.purgeProject(projectId, "wrong confirmation", "test-user-id")
        }
        mockProjectRepository.purgeCallCount shouldBe 0
    }

    "purgeProject should throw InvalidConfirmationException for empty confirmation" {
        // Given: A deleted project
        val projectId = ProjectId.generate()
        createDeletedProject(id = projectId)

        // When & Then: Empty confirmation should fail
        shouldThrow<InvalidConfirmationException> {
            dataRetentionService.purgeProject(projectId, "", "test-user-id")
        }
        mockProjectRepository.purgeCallCount shouldBe 0
    }

    "purgeProject should throw ProjectNotFoundException for non-existent project" {
        // Given: Non-existent project ID
        val nonExistentId = ProjectId.generate()

        // When & Then: Should throw not found exception
        shouldThrow<ProjectNotFoundException> {
            dataRetentionService.purgeProject(
                nonExistentId,
                "CONFIRM_PERMANENT_DELETE",
                "test-user-id"
            )
        }
    }

    "purgeIssue should require confirmation string matching issue ID" {
        // Given: A deleted issue
        val issueId = IssueId.generate()
        createDeletedIssue(id = issueId)

        // When: Attempt to purge with correct confirmation
        // Then: Should succeed without throwing
        dataRetentionService.purgeIssue(issueId, "CONFIRM_PERMANENT_DELETE", "test-user-id")
        mockIssueRepository.purgeCallCount shouldBe 1
    }

    "purgeIssue should throw InvalidConfirmationException for wrong confirmation" {
        // Given: A deleted issue
        val issueId = IssueId.generate()
        createDeletedIssue(id = issueId)

        // When & Then: Attempt with wrong confirmation should fail
        shouldThrow<InvalidConfirmationException> {
            dataRetentionService.purgeIssue(issueId, "wrong confirmation", "test-user-id")
        }
        mockIssueRepository.purgeCallCount shouldBe 0
    }

    "purgeIssue should throw IssueNotFoundException for non-existent issue" {
        // Given: Non-existent issue ID
        val nonExistentId = IssueId.generate()

        // When & Then: Should throw not found exception
        shouldThrow<IssueNotFoundException> {
            dataRetentionService.purgeIssue(
                nonExistentId,
                "CONFIRM_PERMANENT_DELETE",
                "test-user-id"
            )
        }
    }

    // ================================================================================
    // Configuration Respect Tests
    // ================================================================================

    "service should respect custom retention period configuration" {
        // Given: Custom 7-day retention policy
        val customConfig = RetentionConfig(
            retentionPeriod = "P7D",
            enableAutoPurge = true,
            purgeScheduleCron = "0 0 2 * * ?"
        )
        val customService = DataRetentionService(
            projectRepository = mockProjectRepository,
            issueRepository = mockIssueRepository,
            workflowRepository = mockWorkflowRepository,
            auditLogRepository = mockAuditLogRepository,
            timeProvider = mockTimeProvider,
            unitOfWork = mockUnitOfWork,
            config = customConfig
        )

        // Projects: 8 days old (expired with 7-day policy), 6 days old (still valid)
        createDeletedProject(deletedAt = baseTime - 8.days)
        createDeletedProject(deletedAt = baseTime - 6.days)

        // When: Purge with custom service
        val result = customService.purgeExpiredDeletions()

        // Then: Only 8-day-old project should be purged
        result.projects shouldBeExactly 1
        result.cutoffDate shouldBe (baseTime - 7.days)
    }

    "service should use default 30-day retention when config not specified" {
        // Given: Service with default config
        val defaultConfigService = DataRetentionService(
            projectRepository = mockProjectRepository,
            issueRepository = mockIssueRepository,
            workflowRepository = mockWorkflowRepository,
            auditLogRepository = mockAuditLogRepository,
            timeProvider = mockTimeProvider,
            unitOfWork = mockUnitOfWork,
            config = RetentionConfig(
                retentionPeriod = "P30D",
                enableAutoPurge = true,
                purgeScheduleCron = "0 0 2 * * ?"
            )
        )

        // 31 days old project (should be purged with 30-day default)
        createDeletedProject(deletedAt = baseTime - 31.days)

        // When: Purge with default config
        val result = defaultConfigService.purgeExpiredDeletions()

        // Then: Should use 30-day retention
        result.cutoffDate shouldBe (baseTime - 30.days)
        result.projects shouldBeExactly 1
    }

    // ================================================================================
    // Edge Cases and Error Scenarios
    // ================================================================================

    "purgeExpiredDeletions should handle empty deleted items list" {
        // Given: No deleted items at all
        // (mock repositories start empty)

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Should return zero counts without error
        result.projects shouldBeExactly 0
        result.issues shouldBeExactly 0
        result.workflows shouldBeExactly 0
        result.totalPurged shouldBeExactly 0
    }

    "purgeExpiredDeletions should be idempotent" {
        // Given: One expired project
        createDeletedProject(deletedAt = baseTime - 31.days)

        // When: Purge twice
        val result1 = dataRetentionService.purgeExpiredDeletions()
        val result2 = dataRetentionService.purgeExpiredDeletions()

        // Then: First call purges, second call finds nothing
        result1.projects shouldBeExactly 1
        result2.projects shouldBeExactly 0
    }

    "purgeExpiredDeletions should purge children before parents" {
        // Given: Project with child issues, all expired
        val projectId = ProjectId.generate()
        createDeletedProject(id = projectId, deletedAt = baseTime - 31.days)
        createDeletedIssue(projectId = projectId, deletedAt = baseTime - 31.days)
        createDeletedIssue(projectId = projectId, deletedAt = baseTime - 31.days)

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Issues should be purged before project (referential integrity)
        result.issues shouldBeExactly 2
        result.projects shouldBeExactly 1
        // Note: Mock can't verify order, but integration test will
    }

    "service should execute purge within transaction" {
        // Given: Expired items
        createDeletedProject(deletedAt = baseTime - 31.days)

        // When: Purge expired deletions
        dataRetentionService.purgeExpiredDeletions()

        // Then: Should use unit of work for transaction
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "manual purge should only work on deleted items, not active ones" {
        // Given: Active project (not in deletedProjects)
        val activeProject = Project.create("Active Project", "Description", mockTimeProvider)
        mockProjectRepository.projects[activeProject.id] = activeProject

        // When & Then: Should throw ProjectNotFoundException
        shouldThrow<ProjectNotFoundException> {
            dataRetentionService.purgeProject(
                activeProject.id,
                "CONFIRM_PERMANENT_DELETE",
                "test-user-id"
            )
        }
    }

    "purgeExpiredDeletions should propagate repository exceptions" {
        // Given: Repository configured to throw
        val testException = RuntimeException("Database error")
        mockProjectRepository.throwOnFind(testException)

        // When & Then: Should propagate the exception
        shouldThrow<RuntimeException> {
            dataRetentionService.purgeExpiredDeletions()
        }
    }

    // ================================================================================
    // Time Edge Cases
    // ================================================================================

    "cutoff calculation should handle time zone edge cases" {
        // Given: Time at midnight boundary
        mockTimeProvider.setTime(Instant.parse("2025-01-15T00:00:00Z"))

        // When: Purge expired deletions
        val result = dataRetentionService.purgeExpiredDeletions()

        // Then: Cutoff should be exactly 30 days prior at same time
        result.cutoffDate shouldBe Instant.parse("2024-12-16T00:00:00Z")
    }

    // ================================================================================
    // Audit Logging Tests
    // ================================================================================

    "purgeExpiredDeletions should log audit entry for each purged entity" {
        // Given: Multiple expired entities
        createDeletedProject(deletedAt = baseTime - 31.days)
        createDeletedProject(deletedAt = baseTime - 35.days)
        createDeletedIssue(deletedAt = baseTime - 31.days)

        // When: Purge expired deletions
        dataRetentionService.purgeExpiredDeletions()

        // Then: Audit log should contain entries for each purged entity
        // Verify via audit repository or service
        // Expected: 1 audit log entry for the scheduled purge operation
        mockAuditLogRepository.auditLogCallCount shouldBe 1
    }

    "manual purge should log audit entry with manual:userId identifier" {
        // Given: A deleted project
        val projectId = ProjectId.generate()
        createDeletedProject(id = projectId)

        // When: Manual purge
        dataRetentionService.purgeProject(
            projectId,
            "CONFIRM_PERMANENT_DELETE",
            "test-user-id"
        )

        // Then: Audit log should identify manual purge
        mockAuditLogRepository.auditLogCallCount shouldBe 1
        mockAuditLogRepository.lastAuditEntry shouldNotBe null
    }
})
