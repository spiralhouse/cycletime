package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.comparables.shouldBeLessThan
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain as shouldContainString
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueDependenciesTable
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.isNotNull
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes

/**
 * Integration Tests for ExposedIssueRepository
 *
 * These integration tests verify the behavior of the IssueRepository implementation
 * using real database operations with H2 in-memory database.
 *
 * Tests cover:
 * 1. CRUD Operations (save, findById, delete, exists)
 * 2. Query Operations (findByProject, findByParent, findByAssignee, findByStatus, findByType)
 * 3. Data Integrity (snapshot conversion, timestamps, hierarchy validation)
 * 4. Transaction Handling (concurrent operations, batch saves)
 * 5. Edge Cases and Error Scenarios (null values, constraints, special characters)
 * 6. Dependency Management (dependencies and blockedBy relationships)
 *
 * All tests use dependency injection for better testability.
 * Strategic failures included to demonstrate TDD RED phase.
 */
class ExposedIssueRepositoryTest : DescribeSpec({

    lateinit var database: Database
    lateinit var issueRepository: ExposedIssueRepository
    lateinit var projectRepository: ExposedProjectRepository
    lateinit var mockTimeProvider: MockTimeProvider

    // Test data holders
    lateinit var testProject: Project

    /**
     * Helper function to create a test issue with default values.
     * Reduces boilerplate in tests and improves readability.
     */
    fun createTestIssue(
        title: String = "Test Issue",
        description: String? = "Test Description",
        type: IssueType = IssueType.SUBTASK,
        parentId: IssueId? = null,
        projectId: ProjectId? = testProject.id,
        timeProvider: MockTimeProvider = mockTimeProvider
    ): Issue {
        return Issue.create(title, description, type, parentId, projectId, timeProvider)
    }

    /**
     * Helper to create an Epic (top-level issue)
     */
    fun createTestEpic(
        title: String = "Test Epic",
        description: String? = "Epic Description",
        projectId: ProjectId? = testProject.id
    ): Issue {
        return Issue.create(title, description, IssueType.EPIC, null, projectId, mockTimeProvider)
    }

    /**
     * Helper to create a Story (child of Epic)
     */
    fun createTestStory(
        title: String = "Test Story",
        description: String? = "Story Description",
        parentEpic: Issue,
        projectId: ProjectId? = testProject.id
    ): Issue {
        return Issue.create(title, description, IssueType.STORY, parentEpic.id, projectId, mockTimeProvider)
    }

    /**
     * Helper to create a Subtask (child of Story)
     */
    fun createTestSubtask(
        title: String = "Test Subtask",
        description: String? = "Subtask Description",
        parentStory: Issue,
        projectId: ProjectId? = testProject.id
    ): Issue {
        return Issue.create(title, description, IssueType.SUBTASK, parentStory.id, projectId, mockTimeProvider)
    }

    beforeSpec {
        // Set up H2 in-memory database for integration testing
        database = TestDatabaseFactory.createTestDatabase()

        // Create schema
        transaction(database) {
            SchemaUtils.create(ProjectsTable, IssuesTable, IssueDependenciesTable)
        }

        mockTimeProvider = MockTimeProvider()
        issueRepository = ExposedIssueRepository(mockTimeProvider, database)
        projectRepository = ExposedProjectRepository(mockTimeProvider, database)
    }

    beforeEach {
        // Clean database before each test
        transaction(database) {
            IssueDependenciesTable.deleteAll()
            IssuesTable.deleteAll()
            ProjectsTable.deleteAll()
        }

        // Reset time provider
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))

        // Create test project for issues
        testProject = Project.create(
            name = "Test Project",
            description = "Test project for issues",
            timeProvider = mockTimeProvider
        )
        projectRepository.save(testProject)
    }

    afterSpec {
        // Clean up database after all tests
        transaction(database) {
            SchemaUtils.drop(IssueDependenciesTable, IssuesTable, ProjectsTable)
        }
        TransactionManager.closeAndUnregister(database)
    }

    describe("ExposedIssueRepository Integration Tests") {

        describe("CRUD Operations") {

            it("should save and retrieve a new issue") {
                runTest {
                    // RED: This will fail until save/findById are implemented correctly
                    val issue = createTestIssue(
                        title = "Test Issue",
                        description = "Test Description",
                        type = IssueType.SUBTASK
                    )

                    // Set estimate for subtask (required)
                    issue.setEstimate(Estimate.of(3))

                    // Save issue
                    issueRepository.save(issue)

                    // Retrieve issue
                    val retrievedIssue = issueRepository.findById(issue.id)

                    // Verify all data is preserved
                    retrievedIssue shouldNotBe null
                    retrievedIssue!!.id shouldBe issue.id
                    retrievedIssue.title shouldBe "Test Issue"
                    retrievedIssue.description shouldBe "Test Description"
                    retrievedIssue.type shouldBe IssueType.SUBTASK
                    retrievedIssue.status shouldBe IssueStatus.TODO
                    retrievedIssue.parentId shouldBe issue.parentId
                    retrievedIssue.projectId shouldBe testProject.id
                    retrievedIssue.estimate shouldBe Estimate.of(3)
                    retrievedIssue.dependencies.shouldBeEmpty()
                    retrievedIssue.blockedBy.shouldBeEmpty()
                    retrievedIssue.createdAt shouldBe issue.createdAt
                    retrievedIssue.updatedAt shouldBe issue.updatedAt
                }
            }

            it("should save and retrieve an epic with null parent") {
                runTest {
                    val epic = createTestEpic("Test Epic", "Epic for testing")

                    issueRepository.save(epic)

                    val retrieved = issueRepository.findById(epic.id)
                    retrieved shouldNotBe null
                    retrieved!!.type shouldBe IssueType.EPIC
                    retrieved.parentId shouldBe null
                    retrieved.estimate shouldBe Estimate.none()
                }
            }

            it("should save and retrieve a story with parent epic") {
                runTest {
                    // RED: This will fail when hierarchy persistence is not implemented
                    val epic = createTestEpic()
                    issueRepository.save(epic)

                    val story = createTestStory("Test Story", "Story for testing", epic)
                    issueRepository.save(story)

                    val retrieved = issueRepository.findById(story.id)
                    retrieved shouldNotBe null
                    retrieved!!.type shouldBe IssueType.STORY
                    retrieved.parentId shouldBe epic.id
                    retrieved.projectId shouldBe testProject.id
                }
            }

            it("should update existing issue when saving again") {
                runTest {
                    // Create and save initial issue
                    val issue = createTestIssue("Original Title", "Original Description")
                    issue.setEstimate(Estimate.of(5))
                    issueRepository.save(issue)

                    // Modify issue
                    mockTimeProvider.advance(1.hours)
                    issue.updateTitle("Updated Title")
                    issue.updateDescription("Updated Description")
                    issue.updateStatus(IssueStatus.IN_PROGRESS)
                    issue.setEstimate(Estimate.of(8))

                    // Save updated issue
                    issueRepository.save(issue)

                    // Verify update persisted
                    val retrievedIssue = issueRepository.findById(issue.id)
                    retrievedIssue shouldNotBe null
                    retrievedIssue!!.title shouldBe "Updated Title"
                    retrievedIssue.description shouldBe "Updated Description"
                    retrievedIssue.status shouldBe IssueStatus.IN_PROGRESS
                    retrievedIssue.estimate shouldBe Estimate.of(8)
                    retrievedIssue.updatedAt shouldBe issue.updatedAt
                    retrievedIssue.createdAt shouldBe issue.createdAt // Should remain unchanged
                }
            }

            it("should save issue with null description") {
                runTest {
                    val issue = createTestIssue(
                        title = "Issue Without Description",
                        description = null
                    )
                    issue.setEstimate(Estimate.of(2))

                    issueRepository.save(issue)

                    val retrievedIssue = issueRepository.findById(issue.id)
                    retrievedIssue shouldNotBe null
                    retrievedIssue!!.description shouldBe null
                }
            }

            it("should save issue with dependencies") {
                runTest {
                    // RED: This will fail when dependency persistence is not implemented
                    val dependency1 = createTestIssue("Dependency 1")
                    val dependency2 = createTestIssue("Dependency 2")
                    val mainIssue = createTestIssue("Main Issue")

                    // Set estimates
                    dependency1.setEstimate(Estimate.of(3))
                    dependency2.setEstimate(Estimate.of(5))
                    mainIssue.setEstimate(Estimate.of(8))

                    // Save dependencies first
                    issueRepository.save(dependency1)
                    issueRepository.save(dependency2)

                    // Add dependencies and blockers
                    mainIssue.addDependency(dependency1.id)
                    mainIssue.addDependency(dependency2.id)
                    mainIssue.addBlockedBy(dependency1.id)

                    issueRepository.save(mainIssue)

                    val retrieved = issueRepository.findById(mainIssue.id)
                    retrieved shouldNotBe null
                    retrieved!!.dependencies shouldHaveSize 2
                    retrieved.dependencies shouldContain dependency1.id
                    retrieved.dependencies shouldContain dependency2.id
                    retrieved.blockedBy shouldHaveSize 1
                    retrieved.blockedBy shouldContain dependency1.id
                }
            }

            it("should delete issue by ID") {
                runTest {
                    // Save issue first
                    val issue = createTestIssue("Issue To Delete", "Will be deleted")
                    issue.setEstimate(Estimate.of(1))
                    issueRepository.save(issue)

                    // Verify it exists
                    issueRepository.findById(issue.id) shouldNotBe null

                    // Delete issue
                    issueRepository.delete(issue.id)

                    // Verify it's deleted
                    issueRepository.findById(issue.id) shouldBe null
                }
            }

            it("should handle deleting non-existent issue gracefully") {
                runTest {
                    val nonExistentId = IssueId.generate()

                    // Should not throw exception
                    issueRepository.delete(nonExistentId)

                    // Verify nothing was affected
                    issueRepository.findById(nonExistentId) shouldBe null
                }
            }

            it("should check if issue exists") {
                runTest {
                    val issue = createTestIssue("Existing Issue")
                    issue.setEstimate(Estimate.of(2))
                    issueRepository.save(issue)

                    // Should exist
                    issueRepository.exists(issue.id) shouldBe true

                    // Non-existent issue should not exist
                    val nonExistentId = IssueId.generate()
                    issueRepository.exists(nonExistentId) shouldBe false
                }
            }

            it("should save multiple issues with saveAll") {
                runTest {
                    val issues = listOf(
                        createTestIssue("Issue 1").apply { setEstimate(Estimate.of(1)) },
                        createTestIssue("Issue 2").apply { setEstimate(Estimate.of(2)) },
                        createTestIssue("Issue 3").apply { setEstimate(Estimate.of(3)) }
                    )

                    issueRepository.saveAll(issues)

                    // Verify all were saved
                    issues.forEach { issue ->
                        val retrieved = issueRepository.findById(issue.id)
                        retrieved shouldNotBe null
                        retrieved!!.title shouldBe issue.title
                    }
                }
            }
        }

        describe("Query Operations") {

            it("should return null for non-existent issue ID") {
                runTest {
                    val nonExistentId = IssueId.generate()

                    val result = issueRepository.findById(nonExistentId)

                    result shouldBe null
                }
            }

            it("should find issues by project") {
                runTest {
                    // Create second project
                    val project2 = Project.create("Project 2", "Second project", mockTimeProvider)
                    projectRepository.save(project2)

                    // Create issues in different projects
                    val issue1 = createTestIssue("Issue 1", projectId = testProject.id)
                    val issue2 = createTestIssue("Issue 2", projectId = testProject.id)
                    val issue3 = createTestIssue("Issue 3", projectId = project2.id)

                    issue1.setEstimate(Estimate.of(1))
                    issue2.setEstimate(Estimate.of(2))
                    issue3.setEstimate(Estimate.of(3))

                    issueRepository.save(issue1)
                    issueRepository.save(issue2)
                    issueRepository.save(issue3)

                    // Query by project
                    val project1Issues = issueRepository.findByProject(testProject.id)
                    val project2Issues = issueRepository.findByProject(project2.id)

                    // Verify results
                    project1Issues shouldHaveSize 2
                    project1Issues.map { it.id } shouldContain issue1.id
                    project1Issues.map { it.id } shouldContain issue2.id

                    project2Issues shouldHaveSize 1
                    project2Issues.first().id shouldBe issue3.id
                }
            }

            it("should find issues by parent (hierarchy support)") {
                runTest {
                    // RED: This will fail when hierarchy queries are not implemented
                    val epic = createTestEpic("Parent Epic")
                    issueRepository.save(epic)

                    val story1 = createTestStory("Story 1", parentEpic = epic)
                    val story2 = createTestStory("Story 2", parentEpic = epic)
                    val orphanStory = createTestEpic("Orphan Epic") // Different parent

                    issueRepository.save(story1)
                    issueRepository.save(story2)
                    issueRepository.save(orphanStory)

                    // Query children of epic
                    val children = issueRepository.findByParent(epic.id)

                    children shouldHaveSize 2
                    children.map { it.id } shouldContain story1.id
                    children.map { it.id } shouldContain story2.id
                    children.map { it.id } shouldNotContain orphanStory.id
                }
            }

            it("should find issues by assignee") {
                runTest {
                    // RED: This will fail when assignee field is not implemented
                    val assignee1 = "user123"
                    val assignee2 = "user456"

                    val issue1 = createTestIssue("Issue 1")
                    val issue2 = createTestIssue("Issue 2")
                    val issue3 = createTestIssue("Issue 3")

                    issue1.setEstimate(Estimate.of(1))
                    issue2.setEstimate(Estimate.of(2))
                    issue3.setEstimate(Estimate.of(3))

                    // Assign issues to users
                    issue1.updateAssignee(assignee1)
                    issue2.updateAssignee(assignee1)
                    issue3.updateAssignee(assignee2)

                    issueRepository.save(issue1)
                    issueRepository.save(issue2)
                    issueRepository.save(issue3)

                    // Query by assignee
                    val assignee1Issues = issueRepository.findByAssignee(assignee1)
                    val assignee2Issues = issueRepository.findByAssignee(assignee2)
                    val unassignedIssues = issueRepository.findByAssignee("")

                    // Verify results (will fail initially)
                    assignee1Issues shouldHaveSize 2
                    assignee2Issues shouldHaveSize 1
                    unassignedIssues.shouldBeEmpty()
                }
            }

            it("should find issues by status") {
                runTest {
                    // Create issues with different statuses
                    val todoIssue = createTestIssue("Todo Issue")
                    val progressIssue = createTestIssue("Progress Issue")
                    val reviewIssue = createTestIssue("Review Issue")
                    val doneIssue = createTestIssue("Done Issue")

                    // Set estimates
                    todoIssue.setEstimate(Estimate.of(1))
                    progressIssue.setEstimate(Estimate.of(2))
                    reviewIssue.setEstimate(Estimate.of(3))
                    doneIssue.setEstimate(Estimate.of(5))

                    // Change statuses
                    progressIssue.updateStatus(IssueStatus.IN_PROGRESS)
                    reviewIssue.updateStatus(IssueStatus.IN_PROGRESS)
                    reviewIssue.updateStatus(IssueStatus.IN_REVIEW)
                    doneIssue.updateStatus(IssueStatus.IN_PROGRESS)
                    doneIssue.updateStatus(IssueStatus.IN_REVIEW)
                    doneIssue.updateStatus(IssueStatus.DONE)

                    // Save all issues
                    issueRepository.save(todoIssue)
                    issueRepository.save(progressIssue)
                    issueRepository.save(reviewIssue)
                    issueRepository.save(doneIssue)

                    // Query by status
                    val todoIssues = issueRepository.findByStatus(IssueStatus.TODO)
                    val progressIssues = issueRepository.findByStatus(IssueStatus.IN_PROGRESS)
                    val reviewIssues = issueRepository.findByStatus(IssueStatus.IN_REVIEW)
                    val doneIssues = issueRepository.findByStatus(IssueStatus.DONE)

                    // Verify results
                    todoIssues shouldHaveSize 1
                    todoIssues.first().id shouldBe todoIssue.id

                    progressIssues shouldHaveSize 1
                    progressIssues.first().id shouldBe progressIssue.id

                    reviewIssues shouldHaveSize 1
                    reviewIssues.first().id shouldBe reviewIssue.id

                    doneIssues shouldHaveSize 1
                    doneIssues.first().id shouldBe doneIssue.id
                }
            }

            it("should find issues by type") {
                runTest {
                    val epic = createTestEpic("Test Epic")
                    issueRepository.save(epic)

                    val story = createTestStory("Test Story", parentEpic = epic)
                    issueRepository.save(story)

                    val subtask = createTestIssue("Test Subtask", type = IssueType.SUBTASK)
                    subtask.setEstimate(Estimate.of(3))
                    issueRepository.save(subtask)

                    // Query by type
                    val epics = issueRepository.findByType(IssueType.EPIC)
                    val stories = issueRepository.findByType(IssueType.STORY)
                    val subtasks = issueRepository.findByType(IssueType.SUBTASK)

                    // Verify results
                    epics shouldHaveSize 1
                    epics.first().id shouldBe epic.id

                    stories shouldHaveSize 1
                    stories.first().id shouldBe story.id

                    subtasks shouldHaveSize 1
                    subtasks.first().id shouldBe subtask.id
                }
            }

            it("should return empty list for queries with no matches") {
                runTest {
                    // Create only one issue
                    val issue = createTestIssue("Single Issue")
                    issue.setEstimate(Estimate.of(1))
                    issueRepository.save(issue)

                    // Query for different project
                    val otherProject = ProjectId.generate()
                    issueRepository.findByProject(otherProject).shouldBeEmpty()

                    // Query for different status
                    issueRepository.findByStatus(IssueStatus.DONE).shouldBeEmpty()

                    // Query for different type
                    issueRepository.findByType(IssueType.EPIC).shouldBeEmpty()

                    // Query for different assignee
                    issueRepository.findByAssignee("nonexistent").shouldBeEmpty()
                }
            }
        }

        describe("Data Integrity and Snapshot Conversion") {

            it("should preserve all issue properties during round-trip") {
                runTest {
                    // Create issue with all possible data
                    val epic = createTestEpic("Parent Epic")
                    issueRepository.save(epic)

                    val issue = createTestStory("Comprehensive Test Issue", parentEpic = epic)
                    issue.updateDescription("Testing all properties")

                    // Add dependencies and modify state
                    val dependency = createTestIssue("Dependency Issue")
                    dependency.setEstimate(Estimate.of(2))
                    issueRepository.save(dependency)

                    issue.addDependency(dependency.id)
                    issue.addBlockedBy(dependency.id)

                    mockTimeProvider.advance(2.hours)
                    issue.updateStatus(IssueStatus.IN_PROGRESS)

                    // Save and retrieve
                    issueRepository.save(issue)
                    val retrieved = issueRepository.findById(issue.id)

                    // Verify exact match
                    retrieved shouldNotBe null
                    retrieved!!.id shouldBe issue.id
                    retrieved.title shouldBe issue.title
                    retrieved.description shouldBe issue.description
                    retrieved.type shouldBe issue.type
                    retrieved.status shouldBe issue.status
                    retrieved.parentId shouldBe issue.parentId
                    retrieved.projectId shouldBe issue.projectId
                    retrieved.estimate shouldBe issue.estimate
                    retrieved.dependencies shouldBe issue.dependencies
                    retrieved.blockedBy shouldBe issue.blockedBy
                    retrieved.createdAt shouldBe issue.createdAt
                    retrieved.updatedAt shouldBe issue.updatedAt
                }
            }

            it("should handle issues with maximum title length") {
                runTest {
                    val maxLengthTitle = "a".repeat(255)
                    val issue = createTestIssue(
                        title = maxLengthTitle,
                        description = "Testing max length title"
                    )
                    issue.setEstimate(Estimate.of(1))

                    issueRepository.save(issue)

                    val retrieved = issueRepository.findById(issue.id)
                    retrieved shouldNotBe null
                    retrieved!!.title shouldBe maxLengthTitle
                    retrieved.title.length shouldBe 255
                }
            }

            it("should validate issue hierarchy constraints") {
                runTest {
                    // RED: This will fail when proper hierarchy validation is not implemented
                    val epic = createTestEpic("Valid Epic")
                    issueRepository.save(epic)

                    val story = createTestStory("Valid Story", parentEpic = epic)
                    issueRepository.save(story)

                    val subtask = Issue.create(
                        "Valid Subtask",
                        "Description",
                        IssueType.SUBTASK,
                        story.id,
                        testProject.id,
                        mockTimeProvider
                    )
                    subtask.setEstimate(Estimate.of(5))
                    issueRepository.save(subtask)

                    // Verify hierarchy is preserved
                    val retrievedEpic = issueRepository.findById(epic.id)!!
                    val retrievedStory = issueRepository.findById(story.id)!!
                    val retrievedSubtask = issueRepository.findById(subtask.id)!!

                    retrievedEpic.parentId shouldBe null
                    retrievedStory.parentId shouldBe epic.id
                    retrievedSubtask.parentId shouldBe story.id
                }
            }
        }

        describe("Transaction Handling") {

            it("should handle concurrent save operations") {
                runTest {
                    // Create multiple issues
                    val issue1 = createTestIssue("Concurrent Issue 1", "Description 1")
                    val issue2 = createTestIssue("Concurrent Issue 2", "Description 2")
                    val issue3 = createTestIssue("Concurrent Issue 3", "Description 3")

                    issue1.setEstimate(Estimate.of(1))
                    issue2.setEstimate(Estimate.of(2))
                    issue3.setEstimate(Estimate.of(3))

                    // Save them (simulating concurrent operations)
                    issueRepository.save(issue1)
                    issueRepository.save(issue2)
                    issueRepository.save(issue3)

                    // Verify all were saved correctly
                    val retrieved1 = issueRepository.findById(issue1.id)
                    val retrieved2 = issueRepository.findById(issue2.id)
                    val retrieved3 = issueRepository.findById(issue3.id)

                    retrieved1 shouldNotBe null
                    retrieved2 shouldNotBe null
                    retrieved3 shouldNotBe null
                    retrieved1!!.title shouldBe "Concurrent Issue 1"
                    retrieved2!!.title shouldBe "Concurrent Issue 2"
                    retrieved3!!.title shouldBe "Concurrent Issue 3"
                }
            }

            it("should handle rapid updates to same issue") {
                runTest {
                    val issue = createTestIssue("Rapid Update Test", "Original")
                    issue.setEstimate(Estimate.of(1))
                    issueRepository.save(issue)

                    // Perform multiple rapid updates
                    mockTimeProvider.advance(1.minutes)
                    issue.updateTitle("Update 1")
                    issueRepository.save(issue)

                    mockTimeProvider.advance(1.minutes)
                    issue.updateDescription("Update 2")
                    issueRepository.save(issue)

                    mockTimeProvider.advance(1.minutes)
                    issue.updateStatus(IssueStatus.IN_PROGRESS)
                    issueRepository.save(issue)

                    // Verify final state
                    val retrieved = issueRepository.findById(issue.id)
                    retrieved shouldNotBe null
                    retrieved!!.title shouldBe "Update 1"
                    retrieved.description shouldBe "Update 2"
                    retrieved.status shouldBe IssueStatus.IN_PROGRESS
                }
            }

            it("should maintain consistency during mixed operations") {
                runTest {
                    // Create initial issue
                    val issue1 = createTestIssue("Issue 1", "Description 1")
                    issue1.setEstimate(Estimate.of(1))
                    issueRepository.save(issue1)

                    // Mix of operations
                    val issue2 = createTestIssue("Issue 2", "Description 2")
                    issue2.setEstimate(Estimate.of(2))
                    issueRepository.save(issue2)

                    issue1.updateTitle("Updated Issue 1")
                    issueRepository.save(issue1)

                    issueRepository.delete(issue2.id)

                    val issue3 = createTestIssue("Issue 3", "Description 3")
                    issue3.setEstimate(Estimate.of(3))
                    issueRepository.save(issue3)

                    // Verify final state
                    val all = issueRepository.findByProject(testProject.id)
                    all shouldHaveSize 2
                    all.map { it.title } shouldContain "Updated Issue 1"
                    all.map { it.title } shouldContain "Issue 3"
                    all.map { it.title } shouldNotContain "Issue 2"
                }
            }

            it("should handle batch operations with saveAll") {
                runTest {
                    val issues = (1..10).map { index ->
                        createTestIssue("Batch Issue $index", "Description $index").apply {
                            setEstimate(Estimate.of(if (index % 2 == 0) 2 else 3))
                        }
                    }

                    // Save all at once
                    issueRepository.saveAll(issues)

                    // Verify all were saved
                    val allIssues = issueRepository.findByProject(testProject.id)
                    allIssues shouldHaveSize 10

                    // Test individual lookups
                    issues.forEach { issue ->
                        val retrieved = issueRepository.findById(issue.id)
                        retrieved shouldNotBe null
                        retrieved!!.id shouldBe issue.id
                        retrieved.title shouldBe issue.title
                    }
                }
            }
        }

        describe("Edge Cases and Error Scenarios") {

            it("should handle issues with special characters in title and description") {
                runTest {
                    val specialTitle = "Issue with 'quotes' and \"double quotes\" & symbols: @#$%^&*()"
                    val specialDescription = "Description with\nnewlines\tand\ttabs and émojis 🚀 and unicode ñáéí"

                    val issue = createTestIssue(
                        title = specialTitle,
                        description = specialDescription
                    )
                    issue.setEstimate(Estimate.of(5))

                    issueRepository.save(issue)

                    val retrieved = issueRepository.findById(issue.id)
                    retrieved shouldNotBe null
                    retrieved!!.title shouldBe specialTitle
                    retrieved.description shouldBe specialDescription
                }
            }

            it("should handle issues with all status types") {
                runTest {
                    val statuses = IssueStatus.values()
                    val issues = statuses.map { status ->
                        createTestIssue("Issue $status", "Testing status $status").apply {
                            setEstimate(Estimate.of(2))
                            if (status != IssueStatus.TODO) {
                                // Transition to target status
                                val path = IssueStatus.TODO.getTransitionPath(status)
                                path.drop(1).forEach { targetStatus ->
                                    updateStatus(targetStatus)
                                }
                            }
                        }
                    }

                    // Save all
                    issues.forEach { issueRepository.save(it) }

                    // Verify all statuses are preserved
                    statuses.forEachIndexed { index, status ->
                        val retrieved = issueRepository.findById(issues[index].id)!!
                        retrieved.status shouldBe status
                    }
                }
            }

            it("should handle issues with all estimate values") {
                runTest {
                    val estimates = listOf(
                        Estimate.none(),
                        Estimate.of(1),
                        Estimate.of(2),
                        Estimate.of(3),
                        Estimate.of(5),
                        Estimate.of(8),
                        Estimate.of(13)
                    )

                    val issues = estimates.mapIndexed { index, estimate ->
                        val issueType = if (estimate.isNull()) IssueType.EPIC else IssueType.SUBTASK
                        val parentId = if (issueType == IssueType.EPIC) null else null // For simplicity

                        val issue = Issue.create(
                            "Issue $index",
                            "Testing estimate $estimate",
                            issueType,
                            parentId,
                            testProject.id,
                            mockTimeProvider
                        )

                        if (!estimate.isNull()) {
                            issue.setEstimate(estimate)
                        }
                        issue
                    }

                    // Save all
                    issues.forEach { issueRepository.save(it) }

                    // Verify all estimates are preserved
                    estimates.forEachIndexed { index, estimate ->
                        val retrieved = issueRepository.findById(issues[index].id)!!
                        retrieved.estimate shouldBe estimate
                    }
                }
            }

            it("should handle issues with complex dependency networks") {
                runTest {
                    // Create a network of dependent issues
                    val issueA = createTestIssue("Issue A").apply { setEstimate(Estimate.of(1)) }
                    val issueB = createTestIssue("Issue B").apply { setEstimate(Estimate.of(2)) }
                    val issueC = createTestIssue("Issue C").apply { setEstimate(Estimate.of(3)) }
                    val issueD = createTestIssue("Issue D").apply { setEstimate(Estimate.of(5)) }

                    // Save all issues first
                    listOf(issueA, issueB, issueC, issueD).forEach { issueRepository.save(it) }

                    // Create dependency network: D depends on C, C depends on B, B depends on A
                    issueB.addDependency(issueA.id)
                    issueC.addDependency(issueB.id)
                    issueD.addDependency(issueC.id)
                    issueD.addBlockedBy(issueB.id) // Also blocked by B

                    // Update with dependencies
                    issueRepository.save(issueB)
                    issueRepository.save(issueC)
                    issueRepository.save(issueD)

                    // Verify dependency network
                    val retrievedB = issueRepository.findById(issueB.id)!!
                    val retrievedC = issueRepository.findById(issueC.id)!!
                    val retrievedD = issueRepository.findById(issueD.id)!!

                    retrievedB.dependencies shouldContain issueA.id
                    retrievedC.dependencies shouldContain issueB.id
                    retrievedD.dependencies shouldContain issueC.id
                    retrievedD.blockedBy shouldContainAll listOf(issueB.id)
                }
            }

            it("should maintain referential integrity") {
                runTest {
                    // Create issue with specific ID
                    val issue = createTestIssue("Integrity Test", "Description")
                    issue.setEstimate(Estimate.of(8))
                    issueRepository.save(issue)

                    val issueId = issue.id

                    // Retrieve by ID should return same ID
                    val retrieved = issueRepository.findById(issueId)
                    retrieved shouldNotBe null
                    retrieved!!.id shouldBe issueId
                    retrieved.id.value shouldBe issueId.value

                    // Exists check should be consistent
                    issueRepository.exists(issueId) shouldBe true

                    // Delete and verify consistency
                    issueRepository.delete(issueId)
                    issueRepository.exists(issueId) shouldBe false
                    issueRepository.findById(issueId) shouldBe null
                }
            }

            it("should handle empty database operations gracefully") {
                runTest {
                    // All operations on empty database should work
                    issueRepository.findByProject(testProject.id).shouldBeEmpty()
                    issueRepository.findByStatus(IssueStatus.TODO).shouldBeEmpty()
                    issueRepository.findByType(IssueType.EPIC).shouldBeEmpty()
                    issueRepository.findByAssignee("anyuser").shouldBeEmpty()
                    issueRepository.findByParent(IssueId.generate()).shouldBeEmpty()
                    issueRepository.findById(IssueId.generate()) shouldBe null
                    issueRepository.exists(IssueId.generate()) shouldBe false

                    // Delete non-existent should not fail
                    issueRepository.delete(IssueId.generate())
                }
            }
        }

        describe("Performance and Stress Testing") {

            it("should handle multiple issues efficiently") {
                runTest {
                    // Create many issues
                    val issues = (1..50).map { index ->
                        createTestIssue(
                            title = "Issue $index",
                            description = "Description for issue $index"
                        ).apply {
                            setEstimate(Estimate.of(if (index % 5 == 0) 5 else 3))
                        }
                    }

                    // Save all issues
                    issues.forEach { issueRepository.save(it) }

                    // Verify all were saved
                    val allIssues = issueRepository.findByProject(testProject.id)
                    allIssues shouldHaveSize 50

                    // Test queries are still performant
                    val todoIssues = issueRepository.findByStatus(IssueStatus.TODO)
                    todoIssues shouldHaveSize 50

                    val subtasks = issueRepository.findByType(IssueType.SUBTASK)
                    subtasks shouldHaveSize 50

                    // Test individual lookups
                    issues.forEach { issue ->
                        val retrieved = issueRepository.findById(issue.id)
                        retrieved shouldNotBe null
                        retrieved!!.id shouldBe issue.id
                    }
                }
            }

            it("should handle complex hierarchy efficiently") {
                runTest {
                    // Create epic with many stories, each with many subtasks
                    val epic = createTestEpic("Performance Epic")
                    issueRepository.save(epic)

                    val stories = (1..10).map { storyIndex ->
                        createTestStory("Story $storyIndex", parentEpic = epic).also {
                            issueRepository.save(it)
                        }
                    }

                    val subtasks = stories.flatMap { story ->
                        (1..5).map { subtaskIndex ->
                            Issue.create(
                                "Subtask ${story.title}-$subtaskIndex",
                                "Description",
                                IssueType.SUBTASK,
                                story.id,
                                testProject.id,
                                mockTimeProvider
                            ).apply {
                                setEstimate(Estimate.of(2))
                            }
                        }
                    }

                    // Save all subtasks
                    subtasks.forEach { issueRepository.save(it) }

                    // Test hierarchy queries
                    val epicChildren = issueRepository.findByParent(epic.id)
                    epicChildren shouldHaveSize 10

                    stories.forEach { story ->
                        val storyChildren = issueRepository.findByParent(story.id)
                        storyChildren shouldHaveSize 5
                    }

                    // Test type queries
                    val allEpics = issueRepository.findByType(IssueType.EPIC)
                    val allStories = issueRepository.findByType(IssueType.STORY)
                    val allSubtasks = issueRepository.findByType(IssueType.SUBTASK)

                    allEpics shouldHaveSize 1
                    allStories shouldHaveSize 10
                    allSubtasks shouldHaveSize 50
                }
            }
        }

        describe("Soft-Deletion Operations (SPI-876)") {

            it("should mark issue as deleted with timestamp when soft-deleting") {
                runTest {
                    // RED: This will fail until softDelete() is implemented
                    // Arrange: Create and save a subtask
                    val epic = createTestEpic("Test Epic")
                    issueRepository.save(epic)

                    val story = createTestStory("Test Story", parentEpic = epic)
                    issueRepository.save(story)

                    val subtask = createTestSubtask("Subtask to Soft Delete", parentStory = story)
                    subtask.setEstimate(Estimate.of(3))
                    issueRepository.save(subtask)

                    // Act: Soft-delete the subtask
                    val deleteTime = mockTimeProvider.now()
                    issueRepository.softDelete(subtask.id)

                    // Assert: Verify issue exists in database with deleted_at set
                    transaction(database) {
                        val row = IssuesTable.selectAll()
                            .where { IssuesTable.id eq subtask.id.value }
                            .singleOrNull()

                        row shouldNotBe null
                        row?.get(IssuesTable.deletedAt) shouldNotBe null
                        row?.get(IssuesTable.deletedAt) shouldBe deleteTime
                    }
                }
            }

            it("should exclude soft-deleted issues from findById results") {
                runTest {
                    // RED: This will fail until findById filtering is implemented
                    // Arrange: Create and save an issue
                    val epic = createTestEpic("Epic to Soft Delete")
                    issueRepository.save(epic)

                    // Act: Soft-delete the epic
                    issueRepository.softDelete(epic.id)

                    // Assert: findById should return null
                    val retrievedIssue = issueRepository.findById(epic.id)
                    retrievedIssue shouldBe null
                }
            }

            it("should exclude soft-deleted issues from findByProject results") {
                runTest {
                    // RED: This will fail until findByProject filtering is implemented
                    // Arrange: Create multiple issues
                    val activeEpic = createTestEpic("Active Epic")
                    val deletedEpic = createTestEpic("Epic to Delete")
                    issueRepository.save(activeEpic)
                    issueRepository.save(deletedEpic)

                    // Act: Soft-delete one epic
                    issueRepository.softDelete(deletedEpic.id)

                    // Assert: findByProject should exclude deleted issue
                    val projectIssues = issueRepository.findByProject(testProject.id)
                    projectIssues shouldHaveSize 1
                    projectIssues.first().id shouldBe activeEpic.id
                    projectIssues.map { it.id } shouldNotContain deletedEpic.id
                }
            }

            it("should exclude soft-deleted issues from findByParent results") {
                runTest {
                    // RED: This will fail until findByParent filtering is implemented
                    // Arrange: Create hierarchy
                    val epic = createTestEpic("Parent Epic")
                    issueRepository.save(epic)

                    val activeStory = createTestStory("Active Story", parentEpic = epic)
                    val deletedStory = createTestStory("Story to Delete", parentEpic = epic)
                    issueRepository.save(activeStory)
                    issueRepository.save(deletedStory)

                    // Act: Soft-delete one story
                    issueRepository.softDelete(deletedStory.id)

                    // Assert: findByParent should exclude deleted story
                    val children = issueRepository.findByParent(epic.id)
                    children shouldHaveSize 1
                    children.first().id shouldBe activeStory.id
                    children.map { it.id } shouldNotContain deletedStory.id
                }
            }

            it("should exclude soft-deleted issues from findByAssignee results") {
                runTest {
                    // RED: This will fail until findByAssignee filtering is implemented
                    val assignee = "user123"

                    val activeIssue = createTestIssue("Active Issue")
                    val deletedIssue = createTestIssue("Issue to Delete")

                    activeIssue.setEstimate(Estimate.of(3))
                    deletedIssue.setEstimate(Estimate.of(5))

                    activeIssue.updateAssignee(assignee)
                    deletedIssue.updateAssignee(assignee)

                    issueRepository.save(activeIssue)
                    issueRepository.save(deletedIssue)

                    // Act: Soft-delete one issue
                    issueRepository.softDelete(deletedIssue.id)

                    // Assert: findByAssignee should exclude deleted issue
                    val assigneeIssues = issueRepository.findByAssignee(assignee)
                    assigneeIssues shouldHaveSize 1
                    assigneeIssues.first().id shouldBe activeIssue.id
                    assigneeIssues.map { it.id } shouldNotContain deletedIssue.id
                }
            }

            it("should exclude soft-deleted issues from findByStatus results") {
                runTest {
                    // RED: This will fail until findByStatus filtering is implemented
                    val activeIssue = createTestIssue("Active Issue")
                    val deletedIssue = createTestIssue("Issue to Delete")

                    activeIssue.setEstimate(Estimate.of(2))
                    deletedIssue.setEstimate(Estimate.of(3))

                    issueRepository.save(activeIssue)
                    issueRepository.save(deletedIssue)

                    // Act: Soft-delete one issue
                    issueRepository.softDelete(deletedIssue.id)

                    // Assert: findByStatus should exclude deleted issue
                    val todoIssues = issueRepository.findByStatus(IssueStatus.TODO)
                    todoIssues shouldHaveSize 1
                    todoIssues.first().id shouldBe activeIssue.id
                    todoIssues.map { it.id } shouldNotContain deletedIssue.id
                }
            }

            it("should exclude soft-deleted issues from findByType results") {
                runTest {
                    // RED: This will fail until findByType filtering is implemented
                    val activeEpic = createTestEpic("Active Epic")
                    val deletedEpic = createTestEpic("Epic to Delete")

                    issueRepository.save(activeEpic)
                    issueRepository.save(deletedEpic)

                    // Act: Soft-delete one epic
                    issueRepository.softDelete(deletedEpic.id)

                    // Assert: findByType should exclude deleted epic
                    val epics = issueRepository.findByType(IssueType.EPIC)
                    epics shouldHaveSize 1
                    epics.first().id shouldBe activeEpic.id
                    epics.map { it.id } shouldNotContain deletedEpic.id
                }
            }

            it("should return false for exists check on soft-deleted issue") {
                runTest {
                    // RED: This will fail until exists filtering is implemented
                    val epic = createTestEpic("Epic to Check")
                    issueRepository.save(epic)

                    // Verify initially exists
                    issueRepository.exists(epic.id) shouldBe true

                    // Act: Soft-delete the epic
                    issueRepository.softDelete(epic.id)

                    // Assert: exists should return false
                    issueRepository.exists(epic.id) shouldBe false
                }
            }

            it("should be idempotent when soft-deleting already deleted issue") {
                runTest {
                    // RED: This will fail until softDelete idempotency is implemented
                    val epic = createTestEpic("Epic to Delete Twice")
                    issueRepository.save(epic)

                    val firstDeleteTime = mockTimeProvider.now()
                    issueRepository.softDelete(epic.id)

                    // Act: Soft-delete again with different timestamp
                    mockTimeProvider.advance(2.hours)
                    val secondDeleteTime = mockTimeProvider.now()
                    issueRepository.softDelete(epic.id)

                    // Assert: Should update the deleted_at timestamp
                    transaction(database) {
                        val row = IssuesTable.selectAll()
                            .where { IssuesTable.id eq epic.id.value }
                            .singleOrNull()

                        row shouldNotBe null
                        row?.get(IssuesTable.deletedAt) shouldBe secondDeleteTime
                    }
                }
            }

            it("should throw IssueNotFoundException when soft-deleting non-existent issue") {
                runTest {
                    // RED: This will fail until exception handling is implemented
                    val nonExistentId = IssueId.generate()

                    // Act & Assert: Should throw exception
                    var exceptionThrown = false
                    try {
                        issueRepository.softDelete(nonExistentId)
                    } catch (e: io.spiralhouse.cycletime.domain.exceptions.IssueNotFoundException) {
                        exceptionThrown = true
                    }

                    exceptionThrown shouldBe true
                }
            }
        }

        describe("Hierarchical Soft-Deletion Cascade (SPI-876)") {

            it("should cascade soft-delete from Epic to all Stories and Subtasks (3 levels)") {
                runTest {
                    // RED: This is the MOST CRITICAL test - complex hierarchical cascade
                    // Arrange: Create Epic → Story → Subtask hierarchy
                    val epic = createTestEpic("Epic 1", "Epic description")
                    issueRepository.save(epic)

                    val story1 = createTestStory("Story 1", "Story 1 desc", epic)
                    val story2 = createTestStory("Story 2", "Story 2 desc", epic)
                    issueRepository.save(story1)
                    issueRepository.save(story2)

                    val subtask1_1 = createTestSubtask("Subtask 1.1", "Subtask desc", story1)
                    val subtask1_2 = createTestSubtask("Subtask 1.2", "Subtask desc", story1)
                    val subtask2_1 = createTestSubtask("Subtask 2.1", "Subtask desc", story2)

                    subtask1_1.setEstimate(Estimate.of(2))
                    subtask1_2.setEstimate(Estimate.of(3))
                    subtask2_1.setEstimate(Estimate.of(5))

                    issueRepository.save(subtask1_1)
                    issueRepository.save(subtask1_2)
                    issueRepository.save(subtask2_1)

                    val deleteTime = mockTimeProvider.now()

                    // Act: Soft-delete Epic (should cascade to all descendants)
                    issueRepository.softDelete(epic.id)

                    // Assert: Verify ALL issues in hierarchy are soft-deleted
                    transaction(database) {
                        val deletedCount = IssuesTable.selectAll()
                            .where { IssuesTable.deletedAt.isNotNull() }
                            .count()
                        deletedCount shouldBe 6 // Epic + 2 stories + 3 subtasks

                        // Verify epic has correct deletedAt timestamp
                        val epicRow = IssuesTable.selectAll()
                            .where { IssuesTable.id eq epic.id.value }
                            .single()
                        epicRow[IssuesTable.deletedAt] shouldBe deleteTime

                        // Verify all stories have deletedAt set
                        listOf(story1, story2).forEach { story ->
                            val storyRow = IssuesTable.selectAll()
                                .where { IssuesTable.id eq story.id.value }
                                .single()
                            storyRow[IssuesTable.deletedAt] shouldNotBe null
                        }

                        // Verify all subtasks have deletedAt set
                        listOf(subtask1_1, subtask1_2, subtask2_1).forEach { subtask ->
                            val subtaskRow = IssuesTable.selectAll()
                                .where { IssuesTable.id eq subtask.id.value }
                                .single()
                            subtaskRow[IssuesTable.deletedAt] shouldNotBe null
                        }
                    }
                }
            }

            it("should cascade soft-delete from Story to all Subtasks (2 levels)") {
                runTest {
                    // RED: This will fail until cascade logic is implemented
                    val epic = createTestEpic("Parent Epic")
                    issueRepository.save(epic)

                    val story = createTestStory("Story with Subtasks", parentEpic = epic)
                    issueRepository.save(story)

                    val subtask1 = createTestSubtask("Subtask 1", parentStory = story)
                    val subtask2 = createTestSubtask("Subtask 2", parentStory = story)
                    val subtask3 = createTestSubtask("Subtask 3", parentStory = story)

                    subtask1.setEstimate(Estimate.of(2))
                    subtask2.setEstimate(Estimate.of(3))
                    subtask3.setEstimate(Estimate.of(5))

                    issueRepository.save(subtask1)
                    issueRepository.save(subtask2)
                    issueRepository.save(subtask3)

                    // Act: Soft-delete Story (should cascade to subtasks)
                    issueRepository.softDelete(story.id)

                    // Assert: All subtasks should be soft-deleted
                    transaction(database) {
                        val deletedCount = IssuesTable.selectAll()
                            .where {
                                (IssuesTable.parentId eq story.id.value) and
                                (IssuesTable.deletedAt.isNotNull())
                            }
                            .count()
                        deletedCount shouldBe 3
                    }
                }
            }

            it("should preserve parent-child relationships in deleted state") {
                runTest {
                    // RED: This will fail until cascade preserves relationships
                    val epic = createTestEpic("Parent Epic")
                    issueRepository.save(epic)

                    val story = createTestStory("Child Story", parentEpic = epic)
                    issueRepository.save(story)

                    // Act: Soft-delete Epic
                    issueRepository.softDelete(epic.id)

                    // Assert: Verify parentId is unchanged
                    transaction(database) {
                        val storyRow = IssuesTable.selectAll()
                            .where { IssuesTable.id eq story.id.value }
                            .single()

                        storyRow[IssuesTable.parentId] shouldBe epic.id.value
                        storyRow[IssuesTable.deletedAt] shouldNotBe null
                    }
                }
            }

            it("should handle large hierarchies efficiently (Epic with 10+ stories, each with 5+ subtasks)") {
                runTest {
                    // RED: This is a STRESS TEST for performance
                    val epic = createTestEpic("Large Epic")
                    issueRepository.save(epic)

                    val stories = (1..10).map { storyIndex ->
                        createTestStory("Story $storyIndex", parentEpic = epic).also {
                            issueRepository.save(it)
                        }
                    }

                    val allSubtasks = stories.flatMap { story ->
                        (1..5).map { subtaskIndex ->
                            createTestSubtask("Subtask ${story.title}-$subtaskIndex", parentStory = story).apply {
                                setEstimate(Estimate.of(2))
                            }
                        }
                    }

                    allSubtasks.forEach { issueRepository.save(it) }

                    // Act: Soft-delete Epic (should cascade to 10 stories + 50 subtasks)
                    val startTime = System.currentTimeMillis()
                    issueRepository.softDelete(epic.id)
                    val elapsed = System.currentTimeMillis() - startTime

                    // Assert: All 61 issues should be soft-deleted
                    transaction(database) {
                        val deletedCount = IssuesTable.selectAll()
                            .where { IssuesTable.deletedAt.isNotNull() }
                            .count()
                        deletedCount shouldBe 61 // Epic + 10 stories + 50 subtasks
                    }

                    // Performance assertion: should complete in < 1000ms
                    elapsed shouldBeLessThan 1000
                }
            }

            it("should handle soft-deleting Epic with no children") {
                runTest {
                    // RED: Edge case - empty hierarchy
                    val epicWithoutChildren = createTestEpic("Childless Epic")
                    issueRepository.save(epicWithoutChildren)

                    // Act: Soft-delete
                    issueRepository.softDelete(epicWithoutChildren.id)

                    // Assert: Only epic should be deleted
                    transaction(database) {
                        val deletedCount = IssuesTable.selectAll()
                            .where { IssuesTable.deletedAt.isNotNull() }
                            .count()
                        deletedCount shouldBe 1
                    }
                }
            }

            it("should handle soft-deleting Story with some children already deleted") {
                runTest {
                    // RED: Edge case - mixed deletion state
                    val epic = createTestEpic("Parent Epic")
                    issueRepository.save(epic)

                    val story = createTestStory("Story", parentEpic = epic)
                    issueRepository.save(story)

                    val subtask1 = createTestSubtask("Subtask 1", parentStory = story)
                    val subtask2 = createTestSubtask("Subtask 2", parentStory = story)

                    subtask1.setEstimate(Estimate.of(3))
                    subtask2.setEstimate(Estimate.of(5))

                    issueRepository.save(subtask1)
                    issueRepository.save(subtask2)

                    // Pre-delete one subtask
                    issueRepository.softDelete(subtask1.id)

                    // Act: Soft-delete Story
                    issueRepository.softDelete(story.id)

                    // Assert: Both subtasks + story should be deleted
                    transaction(database) {
                        val deletedCount = IssuesTable.selectAll()
                            .where { IssuesTable.deletedAt.isNotNull() }
                            .count()
                        deletedCount shouldBe 3 // Story + 2 subtasks
                    }
                }
            }

            it("should complete cascade in single transaction (atomicity)") {
                runTest {
                    // RED: This will fail until transaction atomicity is ensured
                    val epic = createTestEpic("Atomic Delete Epic")
                    issueRepository.save(epic)

                    val story = createTestStory("Story", parentEpic = epic)
                    issueRepository.save(story)

                    val subtask = createTestSubtask("Subtask", parentStory = story)
                    subtask.setEstimate(Estimate.of(3))
                    issueRepository.save(subtask)

                    // Act: Soft-delete (should be atomic)
                    issueRepository.softDelete(epic.id)

                    // Assert: Either all are deleted or none (atomicity check)
                    transaction(database) {
                        val deletedCount = IssuesTable.selectAll()
                            .where { IssuesTable.deletedAt.isNotNull() }
                            .count()

                        // Should be exactly 3 (all or nothing)
                        deletedCount shouldBe 3
                    }
                }
            }
        }

        describe("Restore Operations (SPI-876)") {

            it("should restore soft-deleted issue and clear deletedAt timestamp") {
                runTest {
                    // RED: This will fail until restore() is implemented
                    val epic = createTestEpic("Epic to Restore")
                    issueRepository.save(epic)
                    issueRepository.softDelete(epic.id)

                    // Act: Restore the epic
                    issueRepository.restore(epic.id)

                    // Assert: Issue should be retrievable and deletedAt cleared
                    val restored = issueRepository.findById(epic.id)
                    restored shouldNotBe null
                    restored?.id shouldBe epic.id

                    transaction(database) {
                        val row = IssuesTable.selectAll()
                            .where { IssuesTable.id eq epic.id.value }
                            .single()
                        row[IssuesTable.deletedAt] shouldBe null
                    }
                }
            }

            it("should throw ParentIssueDeletedException when attempting to restore child with deleted parent") {
                runTest {
                    // RED: This is CRITICAL validation - parent deletion check
                    val epic = createTestEpic("Epic")
                    val story = createTestStory("Story", parentEpic = epic)
                    issueRepository.save(epic)
                    issueRepository.save(story)

                    // Soft-delete Epic (cascades to Story)
                    issueRepository.softDelete(epic.id)

                    // Act & Assert: Attempting to restore Story should fail (parent deleted)
                    var exceptionThrown = false
                    var exceptionMessage = ""
                    try {
                        issueRepository.restore(story.id)
                    } catch (e: Exception) {
                        exceptionThrown = true
                        exceptionMessage = e.message ?: ""
                    }

                    exceptionThrown shouldBe true
                    exceptionMessage shouldContainString "parent"
                }
            }

            it("should allow restoring parent without auto-restoring children") {
                runTest {
                    // RED: This will fail until selective restore is implemented
                    val epic = createTestEpic("Epic")
                    val story = createTestStory("Story", parentEpic = epic)
                    issueRepository.save(epic)
                    issueRepository.save(story)

                    // Soft-delete Epic (cascades to Story)
                    issueRepository.softDelete(epic.id)

                    // Act: Restore only the Epic
                    issueRepository.restore(epic.id)

                    // Assert: Epic is restored, Story remains deleted
                    val restoredEpic = issueRepository.findById(epic.id)
                    val stillDeletedStory = issueRepository.findById(story.id)

                    restoredEpic shouldNotBe null
                    stillDeletedStory shouldBe null

                    transaction(database) {
                        val storyRow = IssuesTable.selectAll()
                            .where { IssuesTable.id eq story.id.value }
                            .single()
                        storyRow[IssuesTable.deletedAt] shouldNotBe null
                    }
                }
            }

            it("should be idempotent when restoring already-active issue") {
                runTest {
                    // RED: Edge case - restore idempotency
                    val epic = createTestEpic("Active Epic")
                    issueRepository.save(epic)

                    // Act: Restore already-active epic (should not fail)
                    issueRepository.restore(epic.id)

                    // Assert: Epic remains active
                    val retrieved = issueRepository.findById(epic.id)
                    retrieved shouldNotBe null

                    transaction(database) {
                        val row = IssuesTable.selectAll()
                            .where { IssuesTable.id eq epic.id.value }
                            .single()
                        row[IssuesTable.deletedAt] shouldBe null
                    }
                }
            }

            it("should throw IssueNotFoundException when restoring non-existent issue") {
                runTest {
                    // RED: This will fail until exception handling is implemented
                    val nonExistentId = IssueId.generate()

                    // Act & Assert: Should throw exception
                    var exceptionThrown = false
                    try {
                        issueRepository.restore(nonExistentId)
                    } catch (e: io.spiralhouse.cycletime.domain.exceptions.IssueNotFoundException) {
                        exceptionThrown = true
                    }

                    exceptionThrown shouldBe true
                }
            }
        }

        describe("Deleted Issue Queries (SPI-876)") {

            it("should return only soft-deleted issues from findDeleted") {
                runTest {
                    // RED: This will fail until findDeleted() is implemented
                    val activeEpic = createTestEpic("Active Epic")
                    val deletedEpic = createTestEpic("Deleted Epic")

                    issueRepository.save(activeEpic)
                    issueRepository.save(deletedEpic)
                    issueRepository.softDelete(deletedEpic.id)

                    // Act: Query deleted issues
                    val deletedIssues = issueRepository.findDeleted()

                    // Assert: Should only return deleted epic
                    deletedIssues shouldHaveSize 1
                    deletedIssues.first().id shouldBe deletedEpic.id
                    deletedIssues.map { it.id } shouldNotContain activeEpic.id
                }
            }

            it("should return issue regardless of deletion status from findIncludingDeleted") {
                runTest {
                    // RED: This will fail until findIncludingDeleted() is implemented
                    val activeEpic = createTestEpic("Active Epic")
                    val deletedEpic = createTestEpic("Deleted Epic")

                    issueRepository.save(activeEpic)
                    issueRepository.save(deletedEpic)
                    issueRepository.softDelete(deletedEpic.id)

                    // Act: Query including deleted
                    val activeRetrieved = issueRepository.findIncludingDeleted(activeEpic.id)
                    val deletedRetrieved = issueRepository.findIncludingDeleted(deletedEpic.id)

                    // Assert: Both should be returned
                    activeRetrieved shouldNotBe null
                    activeRetrieved?.id shouldBe activeEpic.id

                    deletedRetrieved shouldNotBe null
                    deletedRetrieved?.id shouldBe deletedEpic.id
                }
            }

            it("should return empty list from findDeleted when no issues are deleted") {
                runTest {
                    // RED: Edge case - no deleted issues
                    val activeEpic = createTestEpic("Active Epic")
                    issueRepository.save(activeEpic)

                    // Act: Query deleted issues
                    val deletedIssues = issueRepository.findDeleted()

                    // Assert: Should return empty list
                    deletedIssues.shouldBeEmpty()
                }
            }
        }
    }
})
