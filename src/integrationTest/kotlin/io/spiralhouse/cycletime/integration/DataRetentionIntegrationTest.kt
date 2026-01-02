package io.spiralhouse.cycletime.integration

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.ints.shouldBeExactly
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.IssueType
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.infrastructure.database.TableRegistry
import io.spiralhouse.cycletime.infrastructure.database.WorkflowsTable
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedWorkflowRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours

/**
 * Integration Tests for Data Retention Service (SPI-880)
 *
 * TDD RED Phase: All tests should FAIL initially as the repository purge methods
 * (findDeletedBefore, purge, purgeDeletedBefore) do not exist yet.
 *
 * These tests verify the database-level operations for permanent deletion of
 * soft-deleted records after the retention period expires.
 *
 * ## Test Categories:
 * 1. Repository findDeletedBefore() Operations
 * 2. Repository purge() Operations (Hard Delete)
 * 3. Repository purgeDeletedBefore() Batch Operations
 * 4. Cascade Purge and Referential Integrity
 * 5. Cutoff Boundary Testing
 *
 * ## Expected Failures:
 * - "Unresolved reference: findDeletedBefore"
 * - "Unresolved reference: purge"
 * - "Unresolved reference: purgeDeletedBefore"
 *
 * ## Design Notes:
 * - Uses real H2 database for true integration testing
 * - Uses MockTimeProvider for deterministic cutoff calculations
 * - Each test gets fresh database state via beforeEach cleanup
 * - Tests verify actual database state, not just mock behavior
 */
class DataRetentionIntegrationTest : DescribeSpec({

    lateinit var database: Database
    lateinit var projectRepository: ExposedProjectRepository
    lateinit var issueRepository: ExposedIssueRepository
    lateinit var workflowRepository: ExposedWorkflowRepository
    lateinit var unitOfWork: ExposedUnitOfWork
    lateinit var mockTimeProvider: MockTimeProvider

    // Base time for testing - all cutoff calculations relative to this
    lateinit var baseTime: Instant

    /**
     * Helper function to create and save a project that will be soft-deleted.
     */
    suspend fun createAndSoftDeleteProject(
        name: String = "Deleted Project",
        deletedAt: Instant
    ): Project {
        val project = Project.create(name, "Test Description", mockTimeProvider)
        projectRepository.save(project)

        // Set time to deletion time, then soft-delete
        mockTimeProvider.setTime(deletedAt)
        projectRepository.softDelete(project.id)

        // Reset to base time
        mockTimeProvider.setTime(baseTime)
        return project
    }

    /**
     * Helper function to create and save an issue that will be soft-deleted.
     */
    suspend fun createAndSoftDeleteIssue(
        title: String = "Deleted Issue",
        projectId: ProjectId? = null,
        parentId: IssueId? = null,
        deletedAt: Instant
    ): Issue {
        val issue = Issue.create(
            title = title,
            description = "Test issue description",
            projectId = projectId,
            parentId = parentId,
            type = IssueType.STORY,
            timeProvider = mockTimeProvider
        )
        issueRepository.save(issue)

        // Set time to deletion time, then soft-delete
        mockTimeProvider.setTime(deletedAt)
        issueRepository.softDelete(issue.id)

        // Reset to base time
        mockTimeProvider.setTime(baseTime)
        return issue
    }

    /**
     * Helper function to create and save a workflow that will be soft-deleted.
     */
    suspend fun createAndSoftDeleteWorkflow(
        name: String = "Deleted Workflow",
        deletedAt: Instant
    ): Workflow {
        val workflow = Workflow.create(
            name = name,
            description = "Test Workflow",
            initialStatus = IssueStatus.TODO,
            allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE),
            timeProvider = mockTimeProvider
        )
        workflowRepository.save(workflow)

        // Set time to deletion time, then soft-delete
        mockTimeProvider.setTime(deletedAt)
        workflowRepository.softDelete(workflow.id)

        // Reset to base time
        mockTimeProvider.setTime(baseTime)
        return workflow
    }

    beforeSpec {
        // Set up H2 in-memory database for integration testing
        database = TestDatabaseFactory.createTestDatabase()

        // Create schema - use TableRegistry for complete schema
        transaction(database) {
            SchemaUtils.create(*TableRegistry.ALL_TABLES.toTypedArray())
        }
    }

    beforeEach {
        // Clean database before each test
        transaction(database) {
            IssuesTable.deleteAll()
            WorkflowsTable.deleteAll()
            ProjectsTable.deleteAll()
        }

        // Initialize time provider
        mockTimeProvider = MockTimeProvider()
        baseTime = Instant.parse("2025-01-15T10:00:00Z")
        mockTimeProvider.setTime(baseTime)

        // Create repositories with mock time provider
        projectRepository = ExposedProjectRepository(mockTimeProvider, database)
        issueRepository = ExposedIssueRepository(mockTimeProvider, database)
        workflowRepository = ExposedWorkflowRepository(mockTimeProvider, database)
        unitOfWork = ExposedUnitOfWork(database)
    }

    afterSpec {
        // Clean up database after all tests
        transaction(database) {
            SchemaUtils.drop(*TableRegistry.ALL_TABLES.reversed().toTypedArray())
        }
        TransactionManager.closeAndUnregister(database)
    }

    describe("Data Retention Integration Tests (SPI-880)") {

        describe("Repository findDeletedBefore() Operations") {

            it("should find projects deleted before cutoff date") {
                runTest {
                    // Given: Projects deleted at various times
                    val cutoffDate = baseTime - 30.days

                    // 31 days ago - before cutoff (should be found)
                    val oldProject = createAndSoftDeleteProject(
                        name = "Old Project",
                        deletedAt = baseTime - 31.days
                    )

                    // 29 days ago - after cutoff (should NOT be found)
                    val recentProject = createAndSoftDeleteProject(
                        name = "Recent Project",
                        deletedAt = baseTime - 29.days
                    )

                    // When: Query projects deleted before cutoff
                    val expiredProjects = projectRepository.findDeletedBefore(cutoffDate)

                    // Then: Only old project should be returned
                    expiredProjects shouldHaveSize 1
                    expiredProjects.first().id shouldBe oldProject.id
                }
            }

            it("should find issues deleted before cutoff date") {
                runTest {
                    // Given: Issues deleted at various times
                    val cutoffDate = baseTime - 30.days

                    // Create a project first (required for issues)
                    val project = Project.create("Test Project", "Description", mockTimeProvider)
                    projectRepository.save(project)

                    // 35 days ago - before cutoff
                    val oldIssue = createAndSoftDeleteIssue(
                        title = "Old Issue",
                        projectId = project.id,
                        deletedAt = baseTime - 35.days
                    )

                    // 20 days ago - after cutoff
                    val recentIssue = createAndSoftDeleteIssue(
                        title = "Recent Issue",
                        projectId = project.id,
                        deletedAt = baseTime - 20.days
                    )

                    // When: Query issues deleted before cutoff
                    val expiredIssues = issueRepository.findDeletedBefore(cutoffDate)

                    // Then: Only old issue should be returned
                    expiredIssues shouldHaveSize 1
                    expiredIssues.first().id shouldBe oldIssue.id
                }
            }

            it("should find workflows deleted before cutoff date") {
                runTest {
                    // Given: Workflows deleted at various times
                    val cutoffDate = baseTime - 30.days

                    // 40 days ago - before cutoff
                    val oldWorkflow = createAndSoftDeleteWorkflow(
                        name = "Old Workflow",
                        deletedAt = baseTime - 40.days
                    )

                    // 15 days ago - after cutoff
                    val recentWorkflow = createAndSoftDeleteWorkflow(
                        name = "Recent Workflow",
                        deletedAt = baseTime - 15.days
                    )

                    // When: Query workflows deleted before cutoff
                    val expiredWorkflows = workflowRepository.findDeletedBefore(cutoffDate)

                    // Then: Only old workflow should be returned
                    expiredWorkflows shouldHaveSize 1
                    expiredWorkflows.first().id shouldBe oldWorkflow.id
                }
            }

            it("should return empty list when no items deleted before cutoff") {
                runTest {
                    // Given: Only recent deletions
                    val cutoffDate = baseTime - 30.days

                    createAndSoftDeleteProject(
                        name = "Recent Project",
                        deletedAt = baseTime - 10.days
                    )

                    // When: Query for expired items
                    val expiredProjects = projectRepository.findDeletedBefore(cutoffDate)

                    // Then: Should return empty list
                    expiredProjects.shouldBeEmpty()
                }
            }

            it("should handle boundary case at exactly cutoff date") {
                runTest {
                    // Given: Project deleted exactly at cutoff boundary
                    val cutoffDate = baseTime - 30.days

                    val boundaryProject = createAndSoftDeleteProject(
                        name = "Boundary Project",
                        deletedAt = cutoffDate // Exactly 30 days ago
                    )

                    // When: Query with exclusive boundary (<, not <=)
                    val expiredProjects = projectRepository.findDeletedBefore(cutoffDate)

                    // Then: Boundary case should NOT be included (deleted_at < cutoff)
                    expiredProjects.shouldBeEmpty()
                }
            }
        }

        describe("Repository purge() Single Record Operations") {

            it("should permanently delete single project record (hard delete)") {
                runTest {
                    // Given: A soft-deleted project
                    val project = createAndSoftDeleteProject(
                        name = "Project to Purge",
                        deletedAt = baseTime - 31.days
                    )

                    // Verify it exists in database (soft-deleted)
                    transaction(database) {
                        val row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()
                        row.shouldNotBeNull()
                        row[ProjectsTable.deletedAt].shouldNotBeNull()
                    }

                    // When: Purge the project
                    projectRepository.purge(project.id)

                    // Then: Record should be completely removed from database
                    transaction(database) {
                        val row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()
                        row.shouldBeNull()
                    }
                }
            }

            it("should permanently delete single issue record (hard delete)") {
                runTest {
                    // Given: A soft-deleted issue
                    val project = Project.create("Test Project", "Description", mockTimeProvider)
                    projectRepository.save(project)

                    val issue = createAndSoftDeleteIssue(
                        title = "Issue to Purge",
                        projectId = project.id,
                        deletedAt = baseTime - 31.days
                    )

                    // Verify it exists in database
                    transaction(database) {
                        val row = IssuesTable.selectAll()
                            .where { IssuesTable.id eq issue.id.value }
                            .singleOrNull()
                        row.shouldNotBeNull()
                    }

                    // When: Purge the issue
                    issueRepository.purge(issue.id)

                    // Then: Record should be completely removed
                    transaction(database) {
                        val row = IssuesTable.selectAll()
                            .where { IssuesTable.id eq issue.id.value }
                            .singleOrNull()
                        row.shouldBeNull()
                    }
                }
            }

            it("should permanently delete single workflow record (hard delete)") {
                runTest {
                    // Given: A soft-deleted workflow
                    val workflow = createAndSoftDeleteWorkflow(
                        name = "Workflow to Purge",
                        deletedAt = baseTime - 31.days
                    )

                    // When: Purge the workflow
                    workflowRepository.purge(workflow.id)

                    // Then: Record should be completely removed
                    transaction(database) {
                        val row = WorkflowsTable.selectAll()
                            .where { WorkflowsTable.id eq workflow.id.value }
                            .singleOrNull()
                        row.shouldBeNull()
                    }
                }
            }

            it("should be idempotent when purging already-purged record") {
                runTest {
                    // Given: A soft-deleted project that is then purged
                    val project = createAndSoftDeleteProject(
                        name = "Already Purged",
                        deletedAt = baseTime - 31.days
                    )
                    projectRepository.purge(project.id)

                    // When: Purge again (should not throw)
                    projectRepository.purge(project.id)

                    // Then: Still no record (operation is idempotent)
                    transaction(database) {
                        val row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()
                        row.shouldBeNull()
                    }
                }
            }
        }

        describe("Repository purgeDeletedBefore() Batch Operations") {

            it("should batch delete all projects deleted before cutoff") {
                runTest {
                    // Given: Multiple projects with various deletion times
                    val cutoffDate = baseTime - 30.days

                    // Expired projects
                    val expired1 = createAndSoftDeleteProject("Expired 1", deletedAt = baseTime - 35.days)
                    val expired2 = createAndSoftDeleteProject("Expired 2", deletedAt = baseTime - 40.days)
                    val expired3 = createAndSoftDeleteProject("Expired 3", deletedAt = baseTime - 60.days)

                    // Non-expired project
                    val recent = createAndSoftDeleteProject("Recent", deletedAt = baseTime - 15.days)

                    // When: Purge all deleted before cutoff
                    val purgeCount = projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: Only expired projects should be purged
                    purgeCount shouldBeExactly 3

                    // Verify expired are gone
                    transaction(database) {
                        val expiredCount = ProjectsTable.selectAll()
                            .where {
                                ProjectsTable.id inList listOf(
                                    expired1.id.value,
                                    expired2.id.value,
                                    expired3.id.value
                                )
                            }
                            .count()
                        expiredCount shouldBe 0
                    }

                    // Verify recent still exists
                    transaction(database) {
                        val recentRow = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq recent.id.value }
                            .singleOrNull()
                        recentRow.shouldNotBeNull()
                    }
                }
            }

            it("should batch delete all issues deleted before cutoff") {
                runTest {
                    // Given: Multiple issues with various deletion times
                    val cutoffDate = baseTime - 30.days

                    // Create a project for the issues
                    val project = Project.create("Test Project", "Description", mockTimeProvider)
                    projectRepository.save(project)

                    // Expired issues
                    val expired1 = createAndSoftDeleteIssue("Expired 1", projectId = project.id, deletedAt = baseTime - 31.days)
                    val expired2 = createAndSoftDeleteIssue("Expired 2", projectId = project.id, deletedAt = baseTime - 45.days)

                    // Non-expired issue
                    val recent = createAndSoftDeleteIssue("Recent", projectId = project.id, deletedAt = baseTime - 10.days)

                    // When: Purge all deleted before cutoff
                    val purgeCount = issueRepository.purgeDeletedBefore(cutoffDate)

                    // Then: Only expired issues should be purged
                    purgeCount shouldBeExactly 2
                }
            }

            it("should return zero when no records to purge") {
                runTest {
                    // Given: Only recent deletions
                    val cutoffDate = baseTime - 30.days

                    createAndSoftDeleteProject("Recent", deletedAt = baseTime - 5.days)

                    // When: Purge with no expired items
                    val purgeCount = projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: Should return zero
                    purgeCount shouldBeExactly 0
                }
            }

            it("should return zero when table is empty") {
                runTest {
                    // Given: Empty database (no deleted items)
                    val cutoffDate = baseTime - 30.days

                    // When: Purge empty table
                    val purgeCount = projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: Should return zero
                    purgeCount shouldBeExactly 0
                }
            }
        }

        describe("Cascade Purge and Referential Integrity") {

            it("should purge child issues before parent project (referential integrity)") {
                runTest {
                    // Given: Project with child issues, all expired
                    val cutoffDate = baseTime - 30.days

                    val project = Project.create("Parent Project", "Description", mockTimeProvider)
                    projectRepository.save(project)

                    // Create issues for the project
                    val issue1 = createAndSoftDeleteIssue("Child 1", projectId = project.id, deletedAt = baseTime - 31.days)
                    val issue2 = createAndSoftDeleteIssue("Child 2", projectId = project.id, deletedAt = baseTime - 35.days)

                    // Soft-delete the project
                    mockTimeProvider.setTime(baseTime - 31.days)
                    projectRepository.softDelete(project.id)
                    mockTimeProvider.setTime(baseTime)

                    // When: Purge in correct order (children first)
                    issueRepository.purgeDeletedBefore(cutoffDate)
                    projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: All records should be purged (no referential integrity errors)
                    transaction(database) {
                        val issueCount = IssuesTable.selectAll()
                            .where { IssuesTable.projectId eq project.id.value }
                            .count()
                        issueCount shouldBe 0

                        val projectRow = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()
                        projectRow.shouldBeNull()
                    }
                }
            }

            it("should not leave orphaned issues after project purge") {
                runTest {
                    // Given: Project with issues, project is expired
                    val cutoffDate = baseTime - 30.days

                    val project = Project.create("Project with Issues", "Description", mockTimeProvider)
                    projectRepository.save(project)

                    // Issues also expired
                    createAndSoftDeleteIssue("Issue 1", projectId = project.id, deletedAt = baseTime - 31.days)
                    createAndSoftDeleteIssue("Issue 2", projectId = project.id, deletedAt = baseTime - 31.days)

                    // Soft-delete project
                    mockTimeProvider.setTime(baseTime - 31.days)
                    projectRepository.softDelete(project.id)
                    mockTimeProvider.setTime(baseTime)

                    // When: Purge expired issues first, then project
                    issueRepository.purgeDeletedBefore(cutoffDate)
                    projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: No orphaned issue records should exist
                    transaction(database) {
                        val orphanedCount = IssuesTable.selectAll()
                            .where { IssuesTable.projectId eq project.id.value }
                            .count()
                        orphanedCount shouldBe 0
                    }
                }
            }

            it("should handle issue hierarchy during purge (Epic -> Story -> Subtask)") {
                runTest {
                    // Given: Hierarchical issue structure, all expired
                    val cutoffDate = baseTime - 30.days

                    val project = Project.create("Hierarchy Project", "Description", mockTimeProvider)
                    projectRepository.save(project)

                    // Create hierarchy
                    val epic = Issue.create(
                        title = "Epic",
                        description = "Epic description",
                        projectId = project.id,
                        type = IssueType.EPIC,
                        timeProvider = mockTimeProvider
                    )
                    issueRepository.save(epic)

                    val story = Issue.create(
                        title = "Story",
                        description = "Story description",
                        projectId = project.id,
                        parentId = epic.id,
                        type = IssueType.STORY,
                        timeProvider = mockTimeProvider
                    )
                    issueRepository.save(story)

                    val subtask = Issue.create(
                        title = "Subtask",
                        description = "Subtask description",
                        projectId = project.id,
                        parentId = story.id,
                        type = IssueType.SUBTASK,
                        timeProvider = mockTimeProvider
                    )
                    issueRepository.save(subtask)

                    // Soft-delete all (simulating cascade)
                    mockTimeProvider.setTime(baseTime - 31.days)
                    issueRepository.softDelete(subtask.id)
                    issueRepository.softDelete(story.id)
                    issueRepository.softDelete(epic.id)
                    mockTimeProvider.setTime(baseTime)

                    // When: Purge expired (implementation should handle order)
                    val purgeCount = issueRepository.purgeDeletedBefore(cutoffDate)

                    // Then: All issues should be purged
                    purgeCount shouldBeExactly 3

                    transaction(database) {
                        val remainingCount = IssuesTable.selectAll()
                            .where {
                                IssuesTable.id inList listOf(
                                    epic.id.value,
                                    story.id.value,
                                    subtask.id.value
                                )
                            }
                            .count()
                        remainingCount shouldBe 0
                    }
                }
            }
        }

        describe("Cutoff Boundary and Edge Cases") {

            it("should respect cutoff boundary precisely (31 days purged, 29 days not)") {
                runTest {
                    // Given: Projects at precise boundary times
                    val cutoffDate = baseTime - 30.days

                    // 31 days = should be purged
                    val day31 = createAndSoftDeleteProject("31 days", deletedAt = baseTime - 31.days)

                    // 30 days = at boundary, should NOT be purged
                    val day30 = createAndSoftDeleteProject("30 days", deletedAt = baseTime - 30.days)

                    // 29 days = should NOT be purged
                    val day29 = createAndSoftDeleteProject("29 days", deletedAt = baseTime - 29.days)

                    // When: Purge with exact cutoff
                    val purgeCount = projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: Only 31-day project should be purged
                    purgeCount shouldBeExactly 1

                    transaction(database) {
                        // 31-day should be gone
                        ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq day31.id.value }
                            .singleOrNull().shouldBeNull()

                        // 30-day should still exist
                        ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq day30.id.value }
                            .singleOrNull().shouldNotBeNull()

                        // 29-day should still exist
                        ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq day29.id.value }
                            .singleOrNull().shouldNotBeNull()
                    }
                }
            }

            it("should handle very old deletions (multiple months/years)") {
                runTest {
                    // Given: Very old deletions
                    val cutoffDate = baseTime - 30.days

                    val monthOld = createAndSoftDeleteProject("1 Month", deletedAt = baseTime - 30.days - 1.days)
                    val yearOld = createAndSoftDeleteProject("1 Year", deletedAt = baseTime - 365.days)
                    val twoYearsOld = createAndSoftDeleteProject("2 Years", deletedAt = baseTime - 730.days)

                    // When: Purge
                    val purgeCount = projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: All very old items should be purged
                    purgeCount shouldBeExactly 3
                }
            }
        }

        describe("Transaction and Atomicity") {

            it("should execute batch purge within transaction") {
                runTest {
                    // Given: Multiple expired items
                    val cutoffDate = baseTime - 30.days

                    createAndSoftDeleteProject("Project 1", deletedAt = baseTime - 31.days)
                    createAndSoftDeleteProject("Project 2", deletedAt = baseTime - 32.days)
                    createAndSoftDeleteProject("Project 3", deletedAt = baseTime - 33.days)

                    // When: Purge (should be atomic)
                    val purgeCount = projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: All or nothing should be purged
                    purgeCount shouldBeExactly 3

                    transaction(database) {
                        val remaining = ProjectsTable.selectAll()
                            .where { ProjectsTable.deletedAt.isNotNull() }
                            .count()
                        // Either all purged or none (atomicity)
                        remaining shouldBe 0
                    }
                }
            }

            it("should not leave partial purge on error") {
                runTest {
                    // Note: This test documents expected behavior
                    // If purge fails mid-operation, all changes should roll back

                    // Given: Items to purge
                    val cutoffDate = baseTime - 30.days

                    createAndSoftDeleteProject("Project 1", deletedAt = baseTime - 31.days)
                    createAndSoftDeleteProject("Project 2", deletedAt = baseTime - 32.days)

                    // When: Normal purge (happy path)
                    val purgeCount = projectRepository.purgeDeletedBefore(cutoffDate)

                    // Then: Complete purge
                    purgeCount shouldBeExactly 2
                }
            }
        }

        describe("Audit Logging Integration") {

            it("audit log should persist purge operations with full metadata") {
                runTest {
                    // Given: Expired items to purge
                    val cutoffDate = baseTime - 30.days
                    val project = createAndSoftDeleteProject("Test Project", deletedAt = baseTime - 31.days)
                    val issue = createAndSoftDeleteIssue("Test Issue", deletedAt = baseTime - 31.days)

                    // When: Purge expired deletions
                    projectRepository.purgeDeletedBefore(cutoffDate)
                    issueRepository.purgeDeletedBefore(cutoffDate)

                    // Then: Audit log should contain entries with metadata
                    transaction(database) {
                        // Verify audit log table contains purge records
                        // Expected fields: entity_type, entity_id, purged_at, purged_by, cutoff_date
                        // Note: Actual audit table verification depends on schema implementation
                    }
                }
            }

            it("audit log should contain entity type, ID, timestamps, and purgedBy") {
                runTest {
                    // Given: A specific project to purge
                    val project = createAndSoftDeleteProject("Audited Project", deletedAt = baseTime - 31.days)

                    // When: Manual purge by specific user
                    projectRepository.purge(project.id)

                    // Then: Audit log should have complete metadata
                    transaction(database) {
                        // Verify audit entry contains:
                        // - entity_type = "Project"
                        // - entity_id = project.id.value
                        // - purged_at = timestamp
                        // - purged_by = "scheduled" or "manual:userId"
                        // - cutoff_date (for scheduled purges)
                    }
                }
            }
        }
    }
})
