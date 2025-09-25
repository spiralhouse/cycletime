package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
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
 * Integration Tests for ExposedProjectRepository
 *
 * These integration tests verify the behavior of the ProjectRepository implementation
 * using real database operations with H2 in-memory database.
 *
 * Tests cover:
 * 1. CRUD Operations (Create, Read, Update, Delete)
 * 2. Query Operations (findById, findByStatus, findAll)
 * 3. Edge Cases (non-existent records, constraints)
 * 4. Data Integrity (snapshot conversion, timestamps)
 * 5. Transaction Handling
 * 6. Concurrency scenarios
 *
 * All tests use dependency injection for better testability.
 */
class ExposedProjectRepositoryTest : DescribeSpec({

    lateinit var database: Database
    lateinit var repository: ExposedProjectRepository
    lateinit var mockTimeProvider: MockTimeProvider

    /**
     * Helper function to create a test project with default values.
     * Reduces boilerplate in tests and improves readability.
     */
    fun createTestProject(
        name: String = "Test Project",
        description: String? = "Test Description",
        timeProvider: MockTimeProvider = mockTimeProvider
    ): Project {
        return Project.create(name, description, timeProvider)
    }

    beforeSpec {
        // Set up H2 in-memory database for integration testing
        database = TestDatabaseFactory.createTestDatabase()

        // Create schema
        transaction(database) {
            SchemaUtils.create(ProjectsTable, IssuesTable)
        }

        mockTimeProvider = MockTimeProvider()
        repository = ExposedProjectRepository(SystemTimeProvider(), database)
    }

    beforeEach {
        // Clean database before each test
        transaction(database) {
            IssuesTable.deleteAll()
            ProjectsTable.deleteAll()
        }

        // Reset time provider
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    afterSpec {
        // Clean up database after all tests
        transaction(database) {
            SchemaUtils.drop(IssuesTable, ProjectsTable) // Drop child table first, then parent
        }
        TransactionManager.closeAndUnregister(database)
    }

    describe("ExposedProjectRepository Integration Tests") {

        describe("CRUD Operations") {

            it("should save and retrieve a new project") {
                runTest {
                    // RED: This will fail until save/findById are implemented correctly
                    val project = Project.create(
                        name = "Test Project",
                        description = "Test Description",
                        timeProvider = mockTimeProvider
                    )

                    // Save project
                    repository.save(project)

                    // Retrieve project
                    val retrievedProject = repository.findById(project.id)

                    // Verify all data is preserved
                    retrievedProject shouldNotBe null
                    retrievedProject!!.id shouldBe project.id
                    retrievedProject.name shouldBe "Test Project"
                    retrievedProject.description shouldBe "Test Description"
                    retrievedProject.status shouldBe ProjectStatus.ACTIVE
                    retrievedProject.createdAt shouldBe project.createdAt
                    retrievedProject.updatedAt shouldBe project.updatedAt
                    retrievedProject.issues.shouldBeEmpty()
                }
            }

            it("should update existing project when saving again") {
                runTest {
                    // Create and save initial project
                    val project = Project.create(
                        name = "Original Project",
                        description = "Original Description",
                        timeProvider = mockTimeProvider
                    )
                    repository.save(project)

                    // Modify project
                    mockTimeProvider.advance(1.hours)
                    project.updateName("Updated Project")
                    project.updateDescription("Updated Description")

                    // Save updated project
                    repository.save(project)

                    // Verify update persisted
                    val retrievedProject = repository.findById(project.id)
                    retrievedProject shouldNotBe null
                    retrievedProject!!.name shouldBe "Updated Project"
                    retrievedProject.description shouldBe "Updated Description"
                    retrievedProject.updatedAt shouldBe project.updatedAt
                    retrievedProject.createdAt shouldBe project.createdAt // Should remain unchanged
                }
            }

            it("should save project with null description") {
                runTest {
                    val project = Project.create(
                        name = "Project Without Description",
                        description = null,
                        timeProvider = mockTimeProvider
                    )

                    repository.save(project)

                    val retrievedProject = repository.findById(project.id)
                    retrievedProject shouldNotBe null
                    retrievedProject!!.description shouldBe null
                }
            }

            it("should save project with issues") {
                runTest {
                    val project = Project.create(
                        name = "Project With Issues",
                        description = "Testing issue persistence",
                        timeProvider = mockTimeProvider
                    )

                    // Add multiple issues
                    val issue1 = IssueId.generate()
                    val issue2 = IssueId.generate()
                    val issue3 = IssueId.generate()

                    project.addIssue(issue1)
                    project.addIssue(issue2)
                    project.addIssue(issue3)

                    repository.save(project)

                    val retrievedProject = repository.findById(project.id)
                    retrievedProject shouldNotBe null
                    retrievedProject!!.issues shouldHaveSize 3
                    retrievedProject.issues shouldContain issue1
                    retrievedProject.issues shouldContain issue2
                    retrievedProject.issues shouldContain issue3
                }
            }

            it("should delete project by ID") {
                runTest {
                    // Save project first
                    val project = Project.create(
                        name = "Project To Delete",
                        description = "Will be deleted",
                        timeProvider = mockTimeProvider
                    )
                    repository.save(project)

                    // Verify it exists
                    repository.findById(project.id) shouldNotBe null

                    // Delete project
                    repository.delete(project.id)

                    // Verify it's deleted
                    repository.findById(project.id) shouldBe null
                }
            }

            it("should handle deleting non-existent project gracefully") {
                runTest {
                    val nonExistentId = ProjectId.generate()

                    // Should not throw exception
                    repository.delete(nonExistentId)

                    // Verify nothing was affected
                    repository.findById(nonExistentId) shouldBe null
                }
            }
        }

        describe("Query Operations") {

            it("should return null for non-existent project ID") {
                runTest {
                    val nonExistentId = ProjectId.generate()

                    val result = repository.findById(nonExistentId)

                    result shouldBe null
                }
            }

            it("should find projects by status") {
                runTest {
                    // Create projects with different statuses
                    val activeProject1 = Project.create("Active Project 1", "Description 1", mockTimeProvider)
                    val activeProject2 = Project.create("Active Project 2", "Description 2", mockTimeProvider)
                    val archivedProject = Project.create("Archived Project", "Description 3", mockTimeProvider)
                    val completedProject = Project.create("Completed Project", "Description 4", mockTimeProvider)

                    // Change statuses
                    archivedProject.archive()
                    completedProject.complete()

                    // Save all projects
                    repository.save(activeProject1)
                    repository.save(activeProject2)
                    repository.save(archivedProject)
                    repository.save(completedProject)

                    // Query by status
                    val activeProjects = repository.findByStatus(ProjectStatus.ACTIVE)
                    val archivedProjects = repository.findByStatus(ProjectStatus.ARCHIVED)
                    val completedProjects = repository.findByStatus(ProjectStatus.COMPLETED)

                    // Verify results
                    activeProjects shouldHaveSize 2
                    activeProjects.map { it.id } shouldContain activeProject1.id
                    activeProjects.map { it.id } shouldContain activeProject2.id

                    archivedProjects shouldHaveSize 1
                    archivedProjects.first().id shouldBe archivedProject.id

                    completedProjects shouldHaveSize 1
                    completedProjects.first().id shouldBe completedProject.id
                }
            }

            it("should return empty list for status with no projects") {
                runTest {
                    // Create only active projects
                    val project = Project.create("Active Project", "Description", mockTimeProvider)
                    repository.save(project)

                    // Query for archived projects
                    val archivedProjects = repository.findByStatus(ProjectStatus.ARCHIVED)

                    archivedProjects.shouldBeEmpty()
                }
            }

            it("should find all projects") {
                runTest {
                    // Create multiple projects
                    val project1 = Project.create("Project 1", "Description 1", mockTimeProvider)
                    val project2 = Project.create("Project 2", "Description 2", mockTimeProvider)
                    val project3 = Project.create("Project 3", "Description 3", mockTimeProvider)

                    // Change one status to verify it still returns all
                    project2.archive()

                    // Save all projects
                    repository.save(project1)
                    repository.save(project2)
                    repository.save(project3)

                    // Find all
                    val allProjects = repository.findAll()

                    // Verify all are returned
                    allProjects shouldHaveSize 3
                    allProjects.map { it.id } shouldContain project1.id
                    allProjects.map { it.id } shouldContain project2.id
                    allProjects.map { it.id } shouldContain project3.id
                }
            }

            it("should return empty list when no projects exist") {
                runTest {
                    val allProjects = repository.findAll()

                    allProjects.shouldBeEmpty()
                }
            }

            it("should check if project exists") {
                runTest {
                    val project = Project.create("Existing Project", "Description", mockTimeProvider)
                    repository.save(project)

                    // Should exist
                    repository.exists(project.id) shouldBe true

                    // Non-existent project should not exist
                    val nonExistentId = ProjectId.generate()
                    repository.exists(nonExistentId) shouldBe false
                }
            }

            it("should return false for exists check after deletion") {
                runTest {
                    val project = Project.create("Project To Delete", "Description", mockTimeProvider)
                    repository.save(project)

                    // Initially exists
                    repository.exists(project.id) shouldBe true

                    // Delete and check again
                    repository.delete(project.id)
                    repository.exists(project.id) shouldBe false
                }
            }
        }

        describe("Data Integrity and Snapshot Conversion") {

            it("should preserve all project properties during round-trip") {
                runTest {
                    // Create project with all possible data
                    val project = Project.create(
                        name = "Comprehensive Test Project",
                        description = "Testing all properties",
                        timeProvider = mockTimeProvider
                    )

                    // Add issues and modify state
                    val issue1 = IssueId.generate()
                    val issue2 = IssueId.generate()
                    project.addIssue(issue1)
                    project.addIssue(issue2)

                    mockTimeProvider.advance(2.hours)
                    project.updateDescription("Updated description")

                    // Save and retrieve
                    repository.save(project)
                    val retrieved = repository.findById(project.id)

                    // Verify exact match
                    retrieved shouldNotBe null
                    retrieved!!.id shouldBe project.id
                    retrieved.name shouldBe project.name
                    retrieved.description shouldBe project.description
                    retrieved.status shouldBe project.status
                    retrieved.issues shouldBe project.issues
                    retrieved.issueCount shouldBe project.issueCount
                    retrieved.createdAt shouldBe project.createdAt
                    retrieved.updatedAt shouldBe project.updatedAt
                }
            }

            it("should handle projects with maximum name length") {
                runTest {
                    val maxLengthName = "a".repeat(255)
                    val project = Project.create(
                        name = maxLengthName,
                        description = "Testing max length name",
                        timeProvider = mockTimeProvider
                    )

                    repository.save(project)

                    val retrieved = repository.findById(project.id)
                    retrieved shouldNotBe null
                    retrieved!!.name shouldBe maxLengthName
                    retrieved.name.length shouldBe 255
                }
            }

            it("should use SystemTimeProvider for reconstitution") {
                runTest {
                    val project = Project.create(
                        name = "Time Provider Test",
                        description = "Testing time provider injection",
                        mockTimeProvider
                    )

                    repository.save(project)
                    val retrieved = repository.findById(project.id)

                    // The retrieved project should be reconstituted and functional
                    retrieved shouldNotBe null

                    // Test that we can modify the retrieved project (verifies TimeProvider works)
                    val originalUpdateTime = retrieved!!.updatedAt

                    // Note: Retrieved project uses SystemTimeProvider, not MockTimeProvider
                    // So we can't control time for this assertion, but we can verify functionality
                    retrieved.updateDescription("Modified after retrieval")

                    // The update should have changed the timestamp
                    retrieved.updatedAt shouldNotBe originalUpdateTime
                }
            }
        }

        describe("Transaction Handling") {

            it("should handle concurrent save operations") {
                runTest {
                    // Create multiple projects
                    val project1 = Project.create("Concurrent Project 1", "Description 1", mockTimeProvider)
                    val project2 = Project.create("Concurrent Project 2", "Description 2", mockTimeProvider)
                    val project3 = Project.create("Concurrent Project 3", "Description 3", mockTimeProvider)

                    // Save them (simulating concurrent operations)
                    repository.save(project1)
                    repository.save(project2)
                    repository.save(project3)

                    // Verify all were saved correctly
                    val all = repository.findAll()
                    all shouldHaveSize 3
                }
            }

            it("should handle rapid updates to same project") {
                runTest {
                    val project = Project.create("Rapid Update Test", "Original", mockTimeProvider)
                    repository.save(project)

                    // Perform multiple rapid updates
                    mockTimeProvider.advance(1.minutes)
                    project.updateName("Update 1")
                    repository.save(project)

                    mockTimeProvider.advance(1.minutes)
                    project.updateDescription("Update 2")
                    repository.save(project)

                    mockTimeProvider.advance(1.minutes)
                    project.archive()
                    repository.save(project)

                    // Verify final state
                    val retrieved = repository.findById(project.id)
                    retrieved shouldNotBe null
                    retrieved!!.name shouldBe "Update 1"
                    retrieved.description shouldBe "Update 2"
                    retrieved.status shouldBe ProjectStatus.ARCHIVED
                }
            }

            it("should maintain consistency during mixed operations") {
                runTest {
                    // Create initial project
                    val project1 = Project.create("Project 1", "Description 1", mockTimeProvider)
                    repository.save(project1)

                    // Mix of operations
                    val project2 = Project.create("Project 2", "Description 2", mockTimeProvider)
                    repository.save(project2)

                    project1.updateName("Updated Project 1")
                    repository.save(project1)

                    repository.delete(project2.id)

                    val project3 = Project.create("Project 3", "Description 3", mockTimeProvider)
                    repository.save(project3)

                    // Verify final state
                    val all = repository.findAll()
                    all shouldHaveSize 2
                    all.map { it.name } shouldContain "Updated Project 1"
                    all.map { it.name } shouldContain "Project 3"
                }
            }
        }

        describe("Edge Cases and Error Scenarios") {

            it("should handle projects with special characters in name and description") {
                runTest {
                    val specialName = "Project with 'quotes' and \"double quotes\" & symbols: @#$%^&*()"
                    val specialDescription = "Description with\nnewlines\tand\ttabs and émojis 🚀 and unicode ñáéí"

                    val project = Project.create(
                        name = specialName,
                        description = specialDescription,
                        timeProvider = mockTimeProvider
                    )

                    repository.save(project)

                    val retrieved = repository.findById(project.id)
                    retrieved shouldNotBe null
                    retrieved!!.name shouldBe specialName
                    retrieved.description shouldBe specialDescription
                }
            }

            it("should handle save operation on project with all statuses") {
                runTest {
                    // Test each status
                    val activeProject = Project.create("Active", "Description", mockTimeProvider)
                    val archivedProject = Project.create("Archived", "Description", mockTimeProvider)
                    val completedProject = Project.create("Completed", "Description", mockTimeProvider)

                    archivedProject.archive()
                    completedProject.complete()

                    // Save all
                    repository.save(activeProject)
                    repository.save(archivedProject)
                    repository.save(completedProject)

                    // Verify all statuses are preserved
                    repository.findById(activeProject.id)!!.status shouldBe ProjectStatus.ACTIVE
                    repository.findById(archivedProject.id)!!.status shouldBe ProjectStatus.ARCHIVED
                    repository.findById(completedProject.id)!!.status shouldBe ProjectStatus.COMPLETED
                }
            }

            it("should handle large number of issues per project") {
                runTest {
                    val project = Project.create("Many Issues Project", "Testing scalability", mockTimeProvider)

                    // Add many issues
                    val issues = (1..50).map { IssueId.generate() }
                    issues.forEach { project.addIssue(it) }

                    repository.save(project)

                    val retrieved = repository.findById(project.id)
                    retrieved shouldNotBe null
                    retrieved!!.issues shouldHaveSize 50
                    retrieved.issueCount shouldBe 50

                    // Verify all issues are preserved
                    issues.forEach { issueId ->
                        retrieved.issues shouldContain issueId
                    }
                }
            }

            it("should maintain referential integrity") {
                runTest {
                    // Create project with specific ID
                    val project = Project.create("Integrity Test", "Description", mockTimeProvider)
                    repository.save(project)

                    val projectId = project.id

                    // Retrieve by ID should return same ID
                    val retrieved = repository.findById(projectId)
                    retrieved shouldNotBe null
                    retrieved!!.id shouldBe projectId
                    retrieved.id.value shouldBe projectId.value

                    // Exists check should be consistent
                    repository.exists(projectId) shouldBe true

                    // Delete and verify consistency
                    repository.delete(projectId)
                    repository.exists(projectId) shouldBe false
                    repository.findById(projectId) shouldBe null
                }
            }

            it("should handle empty database operations gracefully") {
                runTest {
                    // All operations on empty database should work
                    repository.findAll().shouldBeEmpty()
                    repository.findByStatus(ProjectStatus.ACTIVE).shouldBeEmpty()
                    repository.findByStatus(ProjectStatus.ARCHIVED).shouldBeEmpty()
                    repository.findByStatus(ProjectStatus.COMPLETED).shouldBeEmpty()
                    repository.findById(ProjectId.generate()) shouldBe null
                    repository.exists(ProjectId.generate()) shouldBe false

                    // Delete non-existent should not fail
                    repository.delete(ProjectId.generate())
                }
            }
        }

        describe("Performance and Stress Testing") {

            it("should handle multiple projects efficiently") {
                runTest {
                    // Create many projects
                    val projects = (1..100).map { index ->
                        Project.create(
                            name = "Project $index",
                            description = "Description for project $index",
                            timeProvider = mockTimeProvider
                        )
                    }

                    // Save all projects
                    projects.forEach { repository.save(it) }

                    // Verify all were saved
                    val allProjects = repository.findAll()
                    allProjects shouldHaveSize 100

                    // Test queries are still performant
                    val activeProjects = repository.findByStatus(ProjectStatus.ACTIVE)
                    activeProjects shouldHaveSize 100

                    // Test individual lookups
                    projects.forEach { project ->
                        val retrieved = repository.findById(project.id)
                        retrieved shouldNotBe null
                        retrieved!!.id shouldBe project.id
                    }
                }
            }
        }
    }
})
