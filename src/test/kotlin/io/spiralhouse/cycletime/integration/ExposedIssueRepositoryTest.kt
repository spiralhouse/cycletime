package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
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
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
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

    beforeSpec {
        // Set up H2 in-memory database for integration testing
        database = TestDatabaseFactory.createTestDatabase()

        // Create schema
        transaction(database) {
            SchemaUtils.create(ProjectsTable, IssuesTable, IssueDependenciesTable)
        }

        mockTimeProvider = MockTimeProvider()
        issueRepository = ExposedIssueRepository(SystemTimeProvider(), database)
        projectRepository = ExposedProjectRepository(SystemTimeProvider(), database)
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

            it("should use SystemTimeProvider for reconstitution") {
                runTest {
                    val issue = createTestIssue(
                        title = "Time Provider Test",
                        description = "Testing time provider injection"
                    )
                    issue.setEstimate(Estimate.of(3))

                    issueRepository.save(issue)
                    val retrieved = issueRepository.findById(issue.id)

                    // The retrieved issue should be reconstituted and functional
                    retrieved shouldNotBe null

                    // Test that we can modify the retrieved issue (verifies TimeProvider works)
                    val originalUpdateTime = retrieved!!.updatedAt

                    // Note: Retrieved issue uses SystemTimeProvider, not MockTimeProvider
                    // So we can't control time for this assertion, but we can verify functionality
                    retrieved.updateDescription("Modified after retrieval")

                    // The update should have changed the timestamp
                    retrieved.updatedAt shouldNotBe originalUpdateTime
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
    }
})
