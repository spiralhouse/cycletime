package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.core.annotation.Ignored
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.exceptions.*
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.exceptions.DomainException



import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueDependenciesTable
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes

/**
 * TDD RED Phase Tests for IssueApplicationService
 *
 * These tests define the expected behavior of IssueApplicationService that orchestrates
 * issue operations at the application layer. The tests will initially FAIL because:
 *
 * 1. IssueApplicationService class doesn't exist yet
 * 2. Issue-specific command/DTO classes don't exist yet
 * 3. Issue-specific exception classes don't exist yet
 * 4. Complex hierarchy and dependency validation doesn't exist yet
 *
 * This follows the TDD RED-GREEN-REFACTOR cycle where we first write comprehensive
 * failing tests that define the desired behavior, then implement the minimum code
 * to make them pass.
 *
 * Expected Interface (to be implemented):
 *
 * ```kotlin
 * class IssueApplicationService(
 *     private val issueRepository: ExposedIssueRepository,
 *     private val projectRepository: ExposedProjectRepository,
 *     private val unitOfWork: ExposedUnitOfWork,
 *     private val timeProvider: TimeProvider
 * ) {
 *     // CRUD Operations
 *     suspend fun createIssue(command: CreateIssueCommand): IssueDto
 *     suspend fun getIssue(issueId: IssueId): IssueDto?
 *     suspend fun updateIssue(command: UpdateIssueCommand): IssueDto
 *     suspend fun deleteIssue(issueId: IssueId)
 *
 *     // Hierarchy Operations
 *     suspend fun moveIssue(command: MoveIssueCommand): IssueDto
 *     suspend fun getIssueHierarchy(issueId: IssueId): IssueHierarchyDto
 *     suspend fun listChildren(parentId: IssueId): List<IssueDto>
 *
 *     // Dependency Management
 *     suspend fun addDependency(command: AddDependencyCommand): IssueDto
 *     suspend fun removeDependency(command: RemoveDependencyCommand): IssueDto
 *     suspend fun addBlocker(command: AddBlockerCommand): IssueDto
 *     suspend fun removeBlocker(command: RemoveBlockerCommand): IssueDto
 *
 *     // Status Operations
 *     suspend fun updateStatus(command: UpdateIssueStatusCommand): IssueDto
 *     suspend fun getIssuesByStatus(status: IssueStatus): List<IssueDto>
 *
 *     // Query Operations
 *     suspend fun listIssues(): IssueListDto
 *     suspend fun getIssuesByProject(projectId: ProjectId): List<IssueDto>
 *     suspend fun getIssuesByAssignee(assigneeId: String): List<IssueDto>
 *     suspend fun getIssuesByType(type: IssueType): List<IssueDto>
 * }
 * ```
 */
class IssueApplicationServiceTest : StringSpec({

    lateinit var database: Database
    lateinit var issueRepository: ExposedIssueRepository
    lateinit var projectRepository: ExposedProjectRepository
    lateinit var mockTimeProvider: MockTimeProvider

    lateinit var issueApplicationService: IssueApplicationService
    lateinit var unitOfWork: ExposedUnitOfWork

    beforeSpec {
        // Setup H2 in-memory database
        database = TestDatabaseFactory.createTestDatabase()

        // Create schema
        transaction(database) {
            SchemaUtils.create(ProjectsTable, IssuesTable, IssueDependenciesTable)
        }

        // Setup dependencies with constructor injection
        mockTimeProvider = MockTimeProvider()
        issueRepository = ExposedIssueRepository(mockTimeProvider, database)
        projectRepository = ExposedProjectRepository(mockTimeProvider, database)

        // Create IssueApplicationService (this will fail until implemented)
        unitOfWork = ExposedUnitOfWork(database)
        issueApplicationService = IssueApplicationService(
            issueRepository = issueRepository,
            projectRepository = projectRepository,
            unitOfWork = unitOfWork,
            timeProvider = mockTimeProvider
        )
    }

    beforeEach {
        // Clean database state
        transaction(database) {
            IssueDependenciesTable.deleteAll()
            IssuesTable.deleteAll()
            ProjectsTable.deleteAll()
        }

        // Reset time to deterministic value
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    afterSpec {
        transaction(database) {
            SchemaUtils.drop(IssueDependenciesTable, IssuesTable, ProjectsTable)
        }
        // ARCHITECTURAL FIX: Proper database connection cleanup to prevent HikariDataSource closure issues
        org.jetbrains.exposed.sql.transactions.TransactionManager.closeAndUnregister(database)
    }

    // ================================================================================
    // Basic CRUD Operations Tests
    // ================================================================================

    "should create epic using IssueApplicationService" {
        runTest {
            val command = CreateIssueCommand(
                title = "Epic: MVP Features",
                description = "Core features for minimum viable product",
                type = IssueType.EPIC,
                parentId = null,
                projectId = null,
                assigneeId = null
            )

            val result = issueApplicationService.createIssue(command)

            result shouldNotBe null
            result.id shouldNotBe null
            result.title shouldBe "Epic: MVP Features"
            result.description shouldBe "Core features for minimum viable product"
            result.type shouldBe IssueType.EPIC
            result.status shouldBe IssueStatus.TODO
            result.parentId shouldBe null
            result.projectId shouldBe null
            result.estimate shouldBe Estimate.none()
            result.assigneeId shouldBe null
            result.dependencies.shouldBeEmpty()
            result.blockedBy.shouldBeEmpty()
            result.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
            result.updatedAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
        }
    }

    "should create story with epic parent using IssueApplicationService" {
        runTest {
            // Create epic first
            val epicCommand = CreateIssueCommand(
                title = "Epic: User Management",
                description = "All user-related features",
                type = IssueType.EPIC
            )
            val epic = issueApplicationService.createIssue(epicCommand)

            // Create story under epic
            val storyCommand = CreateIssueCommand(
                title = "User Registration",
                description = "Allow new users to register",
                type = IssueType.STORY,
                parentId = epic.id
            )
            val result = issueApplicationService.createIssue(storyCommand)

            result.title shouldBe "User Registration"
            result.type shouldBe IssueType.STORY
            result.parentId shouldBe epic.id
            result.estimate shouldBe Estimate.none()
        }
    }

    "should create subtask with story parent using IssueApplicationService" {
        runTest {
            // Create epic
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic: Auth", type = IssueType.EPIC)
            )

            // Create story under epic
            val story = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "User Login",
                    type = IssueType.STORY,
                    parentId = epic.id
                )
            )

            // Create subtask under story
            val subtaskCommand = CreateIssueCommand(
                title = "Create login form",
                description = "HTML form with email and password fields",
                type = IssueType.SUBTASK,
                parentId = story.id,
                estimate = Estimate.of(3)
            )
            val result = issueApplicationService.createIssue(subtaskCommand)

            result.title shouldBe "Create login form"
            result.type shouldBe IssueType.SUBTASK
            result.parentId shouldBe story.id
            result.estimate shouldBe Estimate.of(3)
        }
    }

    "should get issue by ID using IssueApplicationService" {
        runTest {
            val created = issueApplicationService.createIssue(
                CreateIssueCommand("Test Issue", type = IssueType.STORY)
            )

            val retrieved = issueApplicationService.getIssue(created.id)

            retrieved shouldNotBe null
            retrieved!!.id shouldBe created.id
            retrieved.title shouldBe "Test Issue"
            retrieved.type shouldBe IssueType.STORY
        }
    }

    "should return null when getting non-existent issue" {
        runTest {
            val nonExistentId = IssueId.generate()

            val result = issueApplicationService.getIssue(nonExistentId)

            result shouldBe null
        }
    }

    "should update issue using IssueApplicationService" {
        runTest {
            val created = issueApplicationService.createIssue(
                CreateIssueCommand("Original Title", type = IssueType.STORY)
            )

            mockTimeProvider.advance(1.hours)

            val updateCommand = UpdateIssueCommand(
                id = created.id,
                title = "Updated Title",
                description = "Updated description",
                assigneeId = "user123"
            )
            val result = issueApplicationService.updateIssue(updateCommand)

            result.title shouldBe "Updated Title"
            result.description shouldBe "Updated description"
            result.assigneeId shouldBe "user123"
            result.updatedAt shouldBe Instant.parse("2025-01-15T11:00:00Z")
        }
    }

    "should delete issue using IssueApplicationService" {
        runTest {
            val created = issueApplicationService.createIssue(
                CreateIssueCommand("Issue to Delete", type = IssueType.STORY)
            )

            issueApplicationService.deleteIssue(created.id)

            val retrieved = issueApplicationService.getIssue(created.id)
            retrieved shouldBe null
        }
    }

    // ================================================================================
    // Hierarchy Validation Tests
    // ================================================================================

    // DISABLED: Kotest has a known issue with shouldThrow and suspend functions
    // The exception IS being thrown correctly (HierarchyViolationException), but
    // Kotest's shouldThrow doesn't catch it properly in coroutine contexts.
    // This is a test framework limitation, not a code issue.
    "should enforce hierarchy rules - epic cannot have epic parent" {
        runTest {
            val parentEpic = issueApplicationService.createIssue(
                CreateIssueCommand("Parent Epic", type = IssueType.EPIC)
            )

            val command = CreateIssueCommand(
                title = "Child Epic",
                type = IssueType.EPIC,
                parentId = parentEpic.id // Should fail - epics cannot have parents
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.createIssue(command)
            } catch (e: HierarchyViolationException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should enforce hierarchy rules - subtask must have story parent" {
        runTest {
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic", type = IssueType.EPIC)
            )

            val command = CreateIssueCommand(
                title = "Subtask",
                type = IssueType.SUBTASK,
                parentId = epic.id // Should fail - subtask cannot have epic parent
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.createIssue(command)
            } catch (e: HierarchyViolationException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should enforce hierarchy rules - story can only have epic parent" {
        runTest {
            // Create a valid EPIC and STORY first, so we can create a valid SUBTASK
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic", type = IssueType.EPIC)
            )
            val story = issueApplicationService.createIssue(
                CreateIssueCommand("Story", type = IssueType.STORY, parentId = epic.id)
            )

            // Create a valid SUBTASK (with story parent)
            val subtask = issueApplicationService.createIssue(
                CreateIssueCommand("Subtask", type = IssueType.SUBTASK, parentId = story.id)
            )

            // Now try to create a STORY with SUBTASK as parent (should fail)
            val command = CreateIssueCommand(
                title = "Invalid Story",
                type = IssueType.STORY,
                parentId = subtask.id // Should fail - story cannot have subtask parent
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.createIssue(command)
            } catch (e: HierarchyViolationException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    "should move issue to different parent with valid hierarchy" {
        runTest {
            // Create two epics
            val epic1 = issueApplicationService.createIssue(
                CreateIssueCommand("Epic 1", type = IssueType.EPIC)
            )
            val epic2 = issueApplicationService.createIssue(
                CreateIssueCommand("Epic 2", type = IssueType.EPIC)
            )

            // Create story under epic1
            val story = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Story",
                    type = IssueType.STORY,
                    parentId = epic1.id
                )
            )

            // Move story to epic2
            val moveCommand = MoveIssueCommand(
                issueId = story.id,
                newParentId = epic2.id
            )
            val result = issueApplicationService.moveIssue(moveCommand)

            result.parentId shouldBe epic2.id
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should reject move that violates hierarchy rules" {
        runTest {
            val story = issueApplicationService.createIssue(
                CreateIssueCommand("Story", type = IssueType.STORY)
            )
            val subtask = issueApplicationService.createIssue(
                CreateIssueCommand("Subtask", type = IssueType.SUBTASK, parentId = story.id)
            )

            // Try to move story under subtask (invalid hierarchy)
            val moveCommand = MoveIssueCommand(
                issueId = story.id,
                newParentId = subtask.id
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.moveIssue(moveCommand)
            } catch (e: HierarchyViolationException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    "should get issue hierarchy" {
        runTest {
            // Create epic -> story -> subtask
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic", type = IssueType.EPIC)
            )
            val story = issueApplicationService.createIssue(
                CreateIssueCommand("Story", type = IssueType.STORY, parentId = epic.id)
            )
            val subtask = issueApplicationService.createIssue(
                CreateIssueCommand("Subtask", type = IssueType.SUBTASK, parentId = story.id)
            )

            val hierarchy = issueApplicationService.getIssueHierarchy(epic.id)

            hierarchy.issue.id shouldBe epic.id
            hierarchy.children shouldHaveSize 1
            hierarchy.children.first().issue.id shouldBe story.id
            hierarchy.children.first().children shouldHaveSize 1
            hierarchy.children.first().children.first().issue.id shouldBe subtask.id
        }
    }

    "should list children of parent issue" {
        runTest {
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic", type = IssueType.EPIC)
            )
            val story1 = issueApplicationService.createIssue(
                CreateIssueCommand("Story 1", type = IssueType.STORY, parentId = epic.id)
            )
            val story2 = issueApplicationService.createIssue(
                CreateIssueCommand("Story 2", type = IssueType.STORY, parentId = epic.id)
            )

            val children = issueApplicationService.listChildren(epic.id)

            children shouldHaveSize 2
            children.map { it.id } shouldContain story1.id
            children.map { it.id } shouldContain story2.id
        }
    }

    // ================================================================================
    // Dependency Management Tests
    // ================================================================================

    "should add dependency between issues" {
        runTest {
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY)
            )
            val issue2 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY)
            )

            // issue1 depends on issue2
            val command = AddDependencyCommand(
                issueId = issue1.id,
                dependencyId = issue2.id
            )
            val result = issueApplicationService.addDependency(command)

            result.dependencies shouldContain issue2.id
        }
    }

    "should remove dependency between issues" {
        runTest {
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY)
            )
            val issue2 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY)
            )

            // Add dependency
            issueApplicationService.addDependency(
                AddDependencyCommand(issue1.id, issue2.id)
            )

            // Remove dependency
            val removeCommand = RemoveDependencyCommand(
                issueId = issue1.id,
                dependencyId = issue2.id
            )
            val result = issueApplicationService.removeDependency(removeCommand)

            result.dependencies shouldNotContain issue2.id
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should prevent circular dependencies" {
        runTest {
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY)
            )
            val issue2 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY)
            )

            // issue1 depends on issue2
            issueApplicationService.addDependency(
                AddDependencyCommand(issue1.id, issue2.id)
            )

            // Try to make issue2 depend on issue1 (circular)
            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.addDependency(
                    AddDependencyCommand(issue2.id, issue1.id)
                )
            } catch (e: CircularDependencyException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should prevent self-dependency" {
        runTest {
            val issue = issueApplicationService.createIssue(
                CreateIssueCommand("Issue", type = IssueType.STORY)
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.addDependency(
                    AddDependencyCommand(issue.id, issue.id)
                )
            } catch (e: DomainException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    "should add blocker to issue" {
        runTest {
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY)
            )
            val issue2 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY)
            )

            // issue2 blocks issue1
            val command = AddBlockerCommand(
                issueId = issue1.id,
                blockerId = issue2.id
            )
            val result = issueApplicationService.addBlocker(command)

            result.blockedBy shouldContain issue2.id
        }
    }

    "should remove blocker from issue" {
        runTest {
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY)
            )
            val issue2 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY)
            )

            // Add blocker
            issueApplicationService.addBlocker(
                AddBlockerCommand(issue1.id, issue2.id)
            )

            // Remove blocker
            val removeCommand = RemoveBlockerCommand(
                issueId = issue1.id,
                blockerId = issue2.id
            )
            val result = issueApplicationService.removeBlocker(removeCommand)

            result.blockedBy shouldNotContain issue2.id
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should validate dependency exists when adding" {
        runTest {
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY)
            )
            val nonExistentId = IssueId.generate()

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.addDependency(
                    AddDependencyCommand(issue1.id, nonExistentId)
                )
            } catch (e: IssueNotFoundException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // ================================================================================
    // Status Transition Tests
    // ================================================================================

    "should update issue status with valid transition" {
        runTest {
            val issue = issueApplicationService.createIssue(
                CreateIssueCommand("Issue", type = IssueType.STORY)
            )

            mockTimeProvider.advance(30.minutes)

            val command = UpdateIssueStatusCommand(
                issueId = issue.id,
                newStatus = IssueStatus.IN_PROGRESS
            )
            val result = issueApplicationService.updateStatus(command)

            result.status shouldBe IssueStatus.IN_PROGRESS
            result.updatedAt shouldBe Instant.parse("2025-01-15T10:30:00Z")
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should reject invalid status transition" {
        runTest {
            val issue = issueApplicationService.createIssue(
                CreateIssueCommand("Issue", type = IssueType.STORY)
            )

            // Try to go from TODO directly to DONE (should require IN_PROGRESS first)
            val command = UpdateIssueStatusCommand(
                issueId = issue.id,
                newStatus = IssueStatus.DONE
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.updateStatus(command)
            } catch (e: InvalidStatusTransitionException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    "should get issues by status" {
        runTest {
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY)
            )
            val issue2 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY)
            )

            // Move issue1 to IN_PROGRESS
            issueApplicationService.updateStatus(
                UpdateIssueStatusCommand(issue1.id, IssueStatus.IN_PROGRESS)
            )

            val todoIssues = issueApplicationService.getIssuesByStatus(IssueStatus.TODO)
            val inProgressIssues = issueApplicationService.getIssuesByStatus(IssueStatus.IN_PROGRESS)

            todoIssues shouldHaveSize 1
            todoIssues.first().id shouldBe issue2.id

            inProgressIssues shouldHaveSize 1
            inProgressIssues.first().id shouldBe issue1.id
        }
    }

    // ================================================================================
    // Estimate Management Tests
    // ================================================================================

    "should set estimate on subtask" {
        runTest {
            val story = issueApplicationService.createIssue(
                CreateIssueCommand("Story", type = IssueType.STORY)
            )
            val subtask = issueApplicationService.createIssue(
                CreateIssueCommand("Subtask", type = IssueType.SUBTASK, parentId = story.id)
            )

            val command = UpdateIssueCommand(
                id = subtask.id,
                estimate = Estimate.of(5)
            )
            val result = issueApplicationService.updateIssue(command)

            result.estimate shouldBe Estimate.of(5)
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should reject estimate on epic" {
        runTest {
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic", type = IssueType.EPIC)
            )

            val command = UpdateIssueCommand(
                id = epic.id,
                estimate = Estimate.of(8)
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.updateIssue(command)
            } catch (e: DomainException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should require estimate on subtask when updating to non-none value" {
        runTest {
            val story = issueApplicationService.createIssue(
                CreateIssueCommand("Story", type = IssueType.STORY)
            )
            val subtask = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Subtask",
                    type = IssueType.SUBTASK,
                    parentId = story.id,
                    estimate = Estimate.of(3)
                )
            )

            // Try to remove estimate from subtask
            val command = UpdateIssueCommand(
                id = subtask.id,
                estimate = Estimate.none()
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.updateIssue(command)
            } catch (e: DomainException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // ================================================================================
    // Project Association Tests
    // ================================================================================

    "should auto-assign project from parent when creating child issue" {
        runTest {
            // Create project
            val project = Project.create("Test Project", null, mockTimeProvider)
            projectRepository.save(project)

            // Create epic assigned to project
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Epic",
                    type = IssueType.EPIC,
                    projectId = project.id
                )
            )

            // Create story under epic - should inherit project
            val story = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Story",
                    type = IssueType.STORY,
                    parentId = epic.id
                )
            )

            story.projectId shouldBe project.id
        }
    }

    "should get issues by project" {
        runTest {
            // Create projects
            val project1 = Project.create("Project 1", null, mockTimeProvider)
            val project2 = Project.create("Project 2", null, mockTimeProvider)
            projectRepository.save(project1)
            projectRepository.save(project2)

            // Create issues in different projects
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY, projectId = project1.id)
            )
            val issue2 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY, projectId = project1.id)
            )
            val issue3 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 3", type = IssueType.STORY, projectId = project2.id)
            )

            val project1Issues = issueApplicationService.getIssuesByProject(project1.id)
            val project2Issues = issueApplicationService.getIssuesByProject(project2.id)

            project1Issues shouldHaveSize 2
            project1Issues.map { it.id } shouldContain issue1.id
            project1Issues.map { it.id } shouldContain issue2.id

            project2Issues shouldHaveSize 1
            project2Issues.first().id shouldBe issue3.id
        }
    }

    // ================================================================================
    // Query and Search Tests
    // ================================================================================

    "should list all issues" {
        runTest {
            issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.EPIC)
            )
            val parentStory = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY)
            )
            issueApplicationService.createIssue(
                CreateIssueCommand("Issue 3", type = IssueType.SUBTASK, parentId = parentStory.id)
            )

            val result = issueApplicationService.listIssues()

            result.totalCount shouldBe 3
            result.issues shouldHaveSize 3
        }
    }

    "should get issues by assignee" {
        runTest {
            val issue1 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 1", type = IssueType.STORY, assigneeId = "user1")
            )
            val issue2 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 2", type = IssueType.STORY, assigneeId = "user1")
            )
            val issue3 = issueApplicationService.createIssue(
                CreateIssueCommand("Issue 3", type = IssueType.STORY, assigneeId = "user2")
            )

            val user1Issues = issueApplicationService.getIssuesByAssignee("user1")
            val user2Issues = issueApplicationService.getIssuesByAssignee("user2")

            user1Issues shouldHaveSize 2
            user1Issues.map { it.id } shouldContain issue1.id
            user1Issues.map { it.id } shouldContain issue2.id

            user2Issues shouldHaveSize 1
            user2Issues.first().id shouldBe issue3.id
        }
    }

    "should get issues by type" {
        runTest {
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic", type = IssueType.EPIC)
            )
            val story1 = issueApplicationService.createIssue(
                CreateIssueCommand("Story 1", type = IssueType.STORY)
            )
            val story2 = issueApplicationService.createIssue(
                CreateIssueCommand("Story 2", type = IssueType.STORY)
            )

            val epics = issueApplicationService.getIssuesByType(IssueType.EPIC)
            val stories = issueApplicationService.getIssuesByType(IssueType.STORY)

            epics shouldHaveSize 1
            epics.first().id shouldBe epic.id

            stories shouldHaveSize 2
            stories.map { it.id } shouldContain story1.id
            stories.map { it.id } shouldContain story2.id
        }
    }

    // ================================================================================
    // Error Handling Tests
    // ================================================================================

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should throw IssueNotFoundException when updating non-existent issue" {
        runTest {
            val nonExistentId = IssueId.generate()
            val command = UpdateIssueCommand(
                id = nonExistentId,
                title = "Updated Title"
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.updateIssue(command)
            } catch (e: IssueNotFoundException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should throw IssueNotFoundException when deleting non-existent issue" {
        runTest {
            val nonExistentId = IssueId.generate()

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.deleteIssue(nonExistentId)
            } catch (e: IssueNotFoundException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should throw ProjectNotFoundException when creating issue with invalid project" {
        runTest {
            val nonExistentProjectId = ProjectId.generate()
            val command = CreateIssueCommand(
                title = "Issue",
                type = IssueType.STORY,
                projectId = nonExistentProjectId
            )

            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.createIssue(command)
            } catch (e: ProjectNotFoundException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true
        }
    }

    // ================================================================================
    // Transactional Behavior Tests
    // ================================================================================

    // DISABLED: Kotest shouldThrow issue with suspend functions
    "should rollback entire transaction on failure" {
        runTest {
            // This test demonstrates expected transactional behavior
            // where partial failures should not leave the system in an inconsistent state

            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic", type = IssueType.EPIC)
            )

            // Try to create a story with invalid hierarchy (should fail)
            // In a transaction, this failure should not affect the epic creation above
            // Workaround for Kotest issue with suspend functions in shouldThrow
            var exceptionThrown = false
            try {
                issueApplicationService.createIssue(
                    CreateIssueCommand(
                        title = "Invalid Story",
                        type = IssueType.STORY,
                        parentId = epic.id,
                        projectId = ProjectId.generate() // Non-existent project
                    )
                )
            } catch (e: ProjectNotFoundException) {
                exceptionThrown = true
            }
            exceptionThrown shouldBe true

            // Epic should still exist despite the failed story creation
            val retrievedEpic = issueApplicationService.getIssue(epic.id)
            retrievedEpic shouldNotBe null
        }
    }

    // ================================================================================
    // Complex Business Scenario Tests
    // ================================================================================

    // DISABLED: Invalid status transition in test - needs investigation
    // Test tries to transition from IN_PROGRESS directly to DONE which isn't allowed
    "should handle complete epic-story-subtask workflow" {
        runTest {
            // Create epic
            val epic = issueApplicationService.createIssue(
                CreateIssueCommand("Epic: User Authentication", type = IssueType.EPIC)
            )

            // Create stories under epic
            val loginStory = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "User Login",
                    type = IssueType.STORY,
                    parentId = epic.id
                )
            )
            val registerStory = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "User Registration",
                    type = IssueType.STORY,
                    parentId = epic.id
                )
            )

            // Create subtasks under login story
            val formSubtask = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Create login form",
                    type = IssueType.SUBTASK,
                    parentId = loginStory.id,
                    estimate = Estimate.of(3)
                )
            )
            val validationSubtask = issueApplicationService.createIssue(
                CreateIssueCommand(
                    title = "Add form validation",
                    type = IssueType.SUBTASK,
                    parentId = loginStory.id,
                    estimate = Estimate.of(2)
                )
            )

            // Add dependency: validation depends on form
            issueApplicationService.addDependency(
                AddDependencyCommand(validationSubtask.id, formSubtask.id)
            )

            // Progress through workflow
            issueApplicationService.updateStatus(
                UpdateIssueStatusCommand(formSubtask.id, IssueStatus.IN_PROGRESS)
            )
            // Must go through IN_REVIEW before DONE (valid transition path)
            issueApplicationService.updateStatus(
                UpdateIssueStatusCommand(formSubtask.id, IssueStatus.IN_REVIEW)
            )
            issueApplicationService.updateStatus(
                UpdateIssueStatusCommand(formSubtask.id, IssueStatus.DONE)
            )

            // Now validation can start (dependency resolved)
            issueApplicationService.updateStatus(
                UpdateIssueStatusCommand(validationSubtask.id, IssueStatus.IN_PROGRESS)
            )

            // Verify final state
            val finalForm = issueApplicationService.getIssue(formSubtask.id)!!
            val finalValidation = issueApplicationService.getIssue(validationSubtask.id)!!

            finalForm.status shouldBe IssueStatus.DONE
            finalValidation.status shouldBe IssueStatus.IN_PROGRESS
            finalValidation.dependencies shouldContain formSubtask.id
        }
    }
})
