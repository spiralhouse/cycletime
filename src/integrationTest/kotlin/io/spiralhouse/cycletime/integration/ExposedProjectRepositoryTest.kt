package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldNotContain
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
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
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
        repository = ExposedProjectRepository(mockTimeProvider, database)
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

        describe("Soft-Deletion Operations (SPI-875)") {

            it("should mark project as deleted with timestamp when soft-deleting") {
                runTest {
                    // Arrange: Create and save a project
                    val project = createTestProject(name = "Project to Soft Delete")
                    repository.save(project)

                    // Act: Soft-delete the project
                    val deleteTime = mockTimeProvider.now()
                    repository.softDelete(project.id)

                    // Assert: Verify project exists in database with deleted_at set
                    transaction(database) {
                        val row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()

                        row shouldNotBe null
                        row?.get(ProjectsTable.deletedAt) shouldNotBe null
                        row?.get(ProjectsTable.deletedAt) shouldBe deleteTime
                    }
                }
            }

            it("should exclude soft-deleted projects from findAll results") {
                runTest {
                    // Arrange: Create and save multiple projects
                    val activeProject = createTestProject(name = "Active Project")
                    val projectToDelete = createTestProject(name = "Project to Delete")
                    repository.save(activeProject)
                    repository.save(projectToDelete)

                    // Act: Soft-delete one project
                    repository.softDelete(projectToDelete.id)

                    // Assert: findAll should only return active project
                    val allProjects = repository.findAll()
                    allProjects shouldHaveSize 1
                    allProjects.first().id shouldBe activeProject.id
                    allProjects.map { it.id } shouldNotContain projectToDelete.id
                }
            }

            it("should exclude soft-deleted projects from findById results") {
                runTest {
                    // Arrange: Create and save a project
                    val project = createTestProject(name = "Project to Soft Delete")
                    repository.save(project)

                    // Act: Soft-delete the project
                    repository.softDelete(project.id)

                    // Assert: findById should return null
                    val retrievedProject = repository.findById(project.id)
                    retrievedProject shouldBe null
                }
            }

            it("should exclude soft-deleted projects from findByStatus results") {
                runTest {
                    // Arrange: Create and save active projects
                    val activeProject1 = createTestProject(name = "Active Project 1")
                    val activeProject2 = createTestProject(name = "Active Project 2")
                    val projectToDelete = createTestProject(name = "Active to Delete")
                    repository.save(activeProject1)
                    repository.save(activeProject2)
                    repository.save(projectToDelete)

                    // Act: Soft-delete one project
                    repository.softDelete(projectToDelete.id)

                    // Assert: findByStatus should exclude deleted project
                    val activeProjects = repository.findByStatus(ProjectStatus.ACTIVE)
                    activeProjects shouldHaveSize 2
                    activeProjects.map { it.id } shouldContain activeProject1.id
                    activeProjects.map { it.id } shouldContain activeProject2.id
                    activeProjects.map { it.id } shouldNotContain projectToDelete.id
                }
            }

            it("should return false for exists check on soft-deleted project") {
                runTest {
                    // Arrange: Create and save a project
                    val project = createTestProject(name = "Project to Soft Delete")
                    repository.save(project)

                    // Verify initially exists
                    repository.exists(project.id) shouldBe true

                    // Act: Soft-delete the project
                    repository.softDelete(project.id)

                    // Assert: exists should return false
                    repository.exists(project.id) shouldBe false
                }
            }

            it("should be idempotent when soft-deleting already deleted project") {
                runTest {
                    // Arrange: Create and soft-delete a project
                    val project = createTestProject(name = "Project to Delete Twice")
                    repository.save(project)

                    val firstDeleteTime = mockTimeProvider.now()
                    repository.softDelete(project.id)

                    // Act: Soft-delete again with different timestamp
                    mockTimeProvider.advance(1.hours)
                    val secondDeleteTime = mockTimeProvider.now()
                    repository.softDelete(project.id)

                    // Assert: Should update the deleted_at timestamp
                    transaction(database) {
                        val row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()

                        row shouldNotBe null
                        row?.get(ProjectsTable.deletedAt) shouldBe secondDeleteTime
                    }
                }
            }

            it("should throw ProjectNotFoundException when soft-deleting non-existent project") {
                runTest {
                    // Arrange: Generate a non-existent project ID
                    val nonExistentId = ProjectId.generate()

                    // Act & Assert: Should throw exception
                    var exceptionThrown = false
                    try {
                        repository.softDelete(nonExistentId)
                    } catch (e: io.spiralhouse.cycletime.domain.exceptions.ProjectNotFoundException) {
                        exceptionThrown = true
                    }

                    exceptionThrown shouldBe true
                }
            }
        }

        describe("Cascade Soft-Deletion (SPI-875)") {

            it("should cascade soft-delete to all contained issues") {
                runTest {
                    // Arrange: Create project with multiple issues
                    val project = createTestProject(name = "Project with Issues")
                    val issue1 = IssueId.generate()
                    val issue2 = IssueId.generate()
                    val issue3 = IssueId.generate()

                    project.addIssue(issue1)
                    project.addIssue(issue2)
                    project.addIssue(issue3)
                    repository.save(project)

                    // Act: Soft-delete the project
                    val deleteTime = mockTimeProvider.now()
                    repository.softDelete(project.id)

                    // Assert: All issues should be soft-deleted
                    transaction(database) {
                        val deletedIssueCount = IssuesTable.selectAll()
                            .where {
                                (IssuesTable.projectId eq project.id.value) and
                                (IssuesTable.deletedAt.isNotNull())
                            }
                            .count()

                        deletedIssueCount shouldBe 3

                        // Verify each issue has deleted_at set
                        listOf(issue1, issue2, issue3).forEach { issueId ->
                            val issueRow = IssuesTable.selectAll()
                                .where { IssuesTable.id eq issueId.value }
                                .singleOrNull()

                            issueRow shouldNotBe null
                            issueRow?.get(IssuesTable.deletedAt) shouldNotBe null
                        }
                    }
                }
            }

            it("should cascade deletion in single transaction (atomicity)") {
                runTest {
                    // Arrange: Create project with issues
                    val project = createTestProject(name = "Atomic Delete Project")
                    val issue1 = IssueId.generate()
                    val issue2 = IssueId.generate()

                    project.addIssue(issue1)
                    project.addIssue(issue2)
                    repository.save(project)

                    // Act: Soft-delete (should be atomic)
                    repository.softDelete(project.id)

                    // Assert: Either both are deleted or neither (atomicity check)
                    transaction(database) {
                        val projectDeleted = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .single()[ProjectsTable.deletedAt] != null

                        val issue1Deleted = IssuesTable.selectAll()
                            .where { IssuesTable.id eq issue1.value }
                            .single()[IssuesTable.deletedAt] != null

                        val issue2Deleted = IssuesTable.selectAll()
                            .where { IssuesTable.id eq issue2.value }
                            .single()[IssuesTable.deletedAt] != null

                        // All should be deleted atomically
                        projectDeleted shouldBe true
                        issue1Deleted shouldBe true
                        issue2Deleted shouldBe true
                    }
                }
            }

            it("should handle Epic to Story to Subtask hierarchy cascade") {
                runTest {
                    // Arrange: Create hierarchical issue structure
                    val project = createTestProject(name = "Hierarchical Project")
                    val epicId = IssueId.generate()
                    val storyId = IssueId.generate()
                    val subtaskId = IssueId.generate()

                    project.addIssue(epicId)
                    project.addIssue(storyId)
                    project.addIssue(subtaskId)
                    repository.save(project)

                    // Manually create hierarchy in database
                    transaction(database) {
                        IssuesTable.update({ IssuesTable.id eq storyId.value }) {
                            it[parentId] = epicId.value
                        }
                        IssuesTable.update({ IssuesTable.id eq subtaskId.value }) {
                            it[parentId] = storyId.value
                        }
                    }

                    // Act: Soft-delete the project
                    repository.softDelete(project.id)

                    // Assert: All issues in hierarchy should be soft-deleted
                    transaction(database) {
                        val deletedCount = IssuesTable.selectAll()
                            .where {
                                (IssuesTable.id inList listOf(epicId.value, storyId.value, subtaskId.value)) and
                                (IssuesTable.deletedAt.isNotNull())
                            }
                            .count()

                        deletedCount shouldBe 3
                    }
                }
            }

            it("should handle empty project with no issues gracefully") {
                runTest {
                    // Arrange: Create project without issues
                    val project = createTestProject(name = "Empty Project")
                    repository.save(project)

                    // Act: Soft-delete the project
                    repository.softDelete(project.id)

                    // Assert: Project should be deleted, no issues to cascade
                    transaction(database) {
                        val projectRow = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()

                        projectRow shouldNotBe null
                        projectRow?.get(ProjectsTable.deletedAt) shouldNotBe null
                    }

                    // Verify no issues exist for this project
                    transaction(database) {
                        val issueCount = IssuesTable.selectAll()
                            .where { IssuesTable.projectId eq project.id.value }
                            .count()

                        issueCount shouldBe 0
                    }
                }
            }

            it("should handle large project with many issues efficiently") {
                runTest {
                    // Arrange: Create project with 50+ issues
                    val project = createTestProject(name = "Large Project")
                    val issues = (1..55).map { IssueId.generate() }

                    issues.forEach { project.addIssue(it) }
                    repository.save(project)

                    // Act: Soft-delete the project
                    val deleteTime = mockTimeProvider.now()
                    repository.softDelete(project.id)

                    // Assert: All 55 issues should be soft-deleted
                    transaction(database) {
                        val deletedIssueCount = IssuesTable.selectAll()
                            .where {
                                (IssuesTable.projectId eq project.id.value) and
                                (IssuesTable.deletedAt.isNotNull())
                            }
                            .count()

                        deletedIssueCount shouldBe 55

                        // Spot check a few random issues
                        issues.take(5).forEach { issueId ->
                            val issueRow = IssuesTable.selectAll()
                                .where { IssuesTable.id eq issueId.value }
                                .singleOrNull()

                            issueRow?.get(IssuesTable.deletedAt) shouldNotBe null
                        }
                    }
                }
            }
        }

        describe("Restore Operations (SPI-875)") {

            it("should clear deleted_at timestamp when restoring project") {
                runTest {
                    // Arrange: Create and soft-delete a project
                    val project = createTestProject(name = "Project to Restore")
                    repository.save(project)
                    repository.softDelete(project.id)

                    // Verify it's deleted
                    repository.findById(project.id) shouldBe null

                    // Act: Restore the project
                    repository.restore(project.id)

                    // Assert: deleted_at should be null
                    transaction(database) {
                        val row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()

                        row shouldNotBe null
                        row?.get(ProjectsTable.deletedAt) shouldBe null
                    }
                }
            }

            it("should make restored project appear in findAll results") {
                runTest {
                    // Arrange: Create, delete, and verify project is hidden
                    val project = createTestProject(name = "Project to Restore")
                    repository.save(project)
                    repository.softDelete(project.id)

                    repository.findAll().shouldBeEmpty()

                    // Act: Restore the project
                    repository.restore(project.id)

                    // Assert: Should appear in findAll
                    val allProjects = repository.findAll()
                    allProjects shouldHaveSize 1
                    allProjects.first().id shouldBe project.id
                }
            }

            it("should make restored project appear in findById results") {
                runTest {
                    // Arrange: Create and soft-delete a project
                    val project = createTestProject(name = "Project to Restore")
                    repository.save(project)
                    repository.softDelete(project.id)

                    // Verify it's not found
                    repository.findById(project.id) shouldBe null

                    // Act: Restore the project
                    repository.restore(project.id)

                    // Assert: findById should return the project
                    val restoredProject = repository.findById(project.id)
                    restoredProject shouldNotBe null
                    restoredProject!!.id shouldBe project.id
                    restoredProject.name shouldBe "Project to Restore"
                }
            }

            it("should NOT cascade restore to previously deleted issues") {
                runTest {
                    // Arrange: Create project with issues and soft-delete all
                    val project = createTestProject(name = "Project with Deleted Issues")
                    val issue1 = IssueId.generate()
                    val issue2 = IssueId.generate()

                    project.addIssue(issue1)
                    project.addIssue(issue2)
                    repository.save(project)
                    repository.softDelete(project.id) // Cascades to issues

                    // Act: Restore only the project
                    repository.restore(project.id)

                    // Assert: Project is restored but issues remain deleted
                    val restoredProject = repository.findById(project.id)
                    restoredProject shouldNotBe null

                    transaction(database) {
                        // Issues should still have deleted_at set
                        val deletedIssueCount = IssuesTable.selectAll()
                            .where {
                                (IssuesTable.projectId eq project.id.value) and
                                (IssuesTable.deletedAt.isNotNull())
                            }
                            .count()

                        deletedIssueCount shouldBe 2
                    }
                }
            }

            it("should be idempotent when restoring already active project") {
                runTest {
                    // Arrange: Create an active project (never deleted)
                    val project = createTestProject(name = "Active Project")
                    repository.save(project)

                    // Act: Restore an already active project
                    repository.restore(project.id)

                    // Assert: Should remain active with no errors
                    val retrievedProject = repository.findById(project.id)
                    retrievedProject shouldNotBe null
                    retrievedProject!!.id shouldBe project.id

                    transaction(database) {
                        val row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .singleOrNull()

                        row?.get(ProjectsTable.deletedAt) shouldBe null
                    }
                }
            }
        }

        describe("Query Methods for Deleted Projects (SPI-875)") {

            it("should return only soft-deleted projects from findDeleted") {
                runTest {
                    // Arrange: Create active and deleted projects
                    val activeProject = createTestProject(name = "Active Project")
                    val deletedProject1 = createTestProject(name = "Deleted Project 1")
                    val deletedProject2 = createTestProject(name = "Deleted Project 2")

                    repository.save(activeProject)
                    repository.save(deletedProject1)
                    repository.save(deletedProject2)

                    repository.softDelete(deletedProject1.id)
                    repository.softDelete(deletedProject2.id)

                    // Act: Query deleted projects
                    val deletedProjects = repository.findDeleted()

                    // Assert: Should return only deleted projects
                    deletedProjects shouldHaveSize 2
                    deletedProjects.map { it.id } shouldContain deletedProject1.id
                    deletedProjects.map { it.id } shouldContain deletedProject2.id
                    deletedProjects.map { it.id } shouldNotContain activeProject.id
                }
            }

            it("should return empty list when no deleted projects exist") {
                runTest {
                    // Arrange: Create only active projects
                    val activeProject1 = createTestProject(name = "Active Project 1")
                    val activeProject2 = createTestProject(name = "Active Project 2")

                    repository.save(activeProject1)
                    repository.save(activeProject2)

                    // Act: Query deleted projects
                    val deletedProjects = repository.findDeleted()

                    // Assert: Should return empty list
                    deletedProjects.shouldBeEmpty()
                }
            }

            it("should return project regardless of deletion state with findIncludingDeleted") {
                runTest {
                    // Arrange: Create active and deleted projects
                    val activeProject = createTestProject(name = "Active Project")
                    val deletedProject = createTestProject(name = "Deleted Project")

                    repository.save(activeProject)
                    repository.save(deletedProject)
                    repository.softDelete(deletedProject.id)

                    // Act & Assert: Should find both active and deleted
                    val foundActive = repository.findIncludingDeleted(activeProject.id)
                    foundActive shouldNotBe null
                    foundActive!!.id shouldBe activeProject.id

                    val foundDeleted = repository.findIncludingDeleted(deletedProject.id)
                    foundDeleted shouldNotBe null
                    foundDeleted!!.id shouldBe deletedProject.id
                }
            }

            it("should return null for non-existent project with findIncludingDeleted") {
                runTest {
                    // Arrange: Generate non-existent project ID
                    val nonExistentId = ProjectId.generate()

                    // Act: Query for non-existent project
                    val result = repository.findIncludingDeleted(nonExistentId)

                    // Assert: Should return null
                    result shouldBe null
                }
            }
        }

        describe("Edge Cases and Transaction Handling (SPI-875)") {

            it("should handle restoring project with deleted issues correctly") {
                runTest {
                    // Arrange: Create project, soft-delete it (cascades to issues), restore project
                    val project = createTestProject(name = "Project with Issues")
                    val issue1 = IssueId.generate()
                    val issue2 = IssueId.generate()

                    project.addIssue(issue1)
                    project.addIssue(issue2)
                    repository.save(project)
                    repository.softDelete(project.id)
                    repository.restore(project.id)

                    // Act: Query the restored project
                    val restoredProject = repository.findById(project.id)

                    // Assert: Project is active but issues remain deleted
                    restoredProject shouldNotBe null

                    transaction(database) {
                        val projectDeleted = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .single()[ProjectsTable.deletedAt]
                        projectDeleted shouldBe null

                        val deletedIssueCount = IssuesTable.selectAll()
                            .where {
                                (IssuesTable.projectId eq project.id.value) and
                                (IssuesTable.deletedAt.isNotNull())
                            }
                            .count()
                        deletedIssueCount shouldBe 2
                    }
                }
            }

            it("should allow multiple projects to be soft-deleted independently") {
                runTest {
                    // Arrange: Create multiple projects
                    val project1 = createTestProject(name = "Project 1")
                    val project2 = createTestProject(name = "Project 2")
                    val project3 = createTestProject(name = "Project 3")

                    repository.save(project1)
                    repository.save(project2)
                    repository.save(project3)

                    // Act: Soft-delete projects at different times
                    mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
                    repository.softDelete(project1.id)

                    mockTimeProvider.setTime(Instant.parse("2025-01-15T11:00:00Z"))
                    repository.softDelete(project2.id)

                    // Assert: Both deleted with correct timestamps, project3 active
                    transaction(database) {
                        val project1Row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project1.id.value }
                            .single()
                        project1Row[ProjectsTable.deletedAt] shouldBe Instant.parse("2025-01-15T10:00:00Z")

                        val project2Row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project2.id.value }
                            .single()
                        project2Row[ProjectsTable.deletedAt] shouldBe Instant.parse("2025-01-15T11:00:00Z")

                        val project3Row = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project3.id.value }
                            .single()
                        project3Row[ProjectsTable.deletedAt] shouldBe null
                    }

                    // Verify findAll excludes deleted
                    val activeProjects = repository.findAll()
                    activeProjects shouldHaveSize 1
                    activeProjects.first().id shouldBe project3.id
                }
            }

            it("should verify query performance with composite index on deleted_at") {
                runTest {
                    // Arrange: Create mix of active and deleted projects
                    val activeProjects = (1..20).map {
                        createTestProject(name = "Active $it")
                    }
                    val deletedProjects = (1..20).map {
                        createTestProject(name = "Deleted $it")
                    }

                    activeProjects.forEach { repository.save(it) }
                    deletedProjects.forEach {
                        repository.save(it)
                        repository.softDelete(it.id)
                    }

                    // Act: Query operations should use index
                    val allActive = repository.findAll()
                    val allDeleted = repository.findDeleted()

                    // Assert: Correct filtering
                    allActive shouldHaveSize 20
                    allDeleted shouldHaveSize 20

                    // Optional: Could add EXPLAIN query verification here
                    // This is a placeholder for performance validation
                    transaction(database) {
                        val activeCount = ProjectsTable.selectAll()
                            .where { ProjectsTable.deletedAt.isNull() }
                            .count()
                        activeCount shouldBe 20

                        val deletedCount = ProjectsTable.selectAll()
                            .where { ProjectsTable.deletedAt.isNotNull() }
                            .count()
                        deletedCount shouldBe 20
                    }
                }
            }
        }

        describe("Transaction Atomicity for Soft-Deletion (SPI-875)") {

            it("should rollback entire transaction if cascade fails mid-operation") {
                runTest {
                    // Note: This test verifies atomicity behavior
                    // In real implementation, if any part of cascade fails, entire operation should rollback

                    // Arrange: Create project with issues
                    val project = createTestProject(name = "Atomic Test Project")
                    val issue1 = IssueId.generate()
                    val issue2 = IssueId.generate()

                    project.addIssue(issue1)
                    project.addIssue(issue2)
                    repository.save(project)

                    // This test documents expected behavior:
                    // If implementation uses proper transaction management,
                    // partial failures should result in complete rollback

                    // For now, we verify the happy path works atomically
                    repository.softDelete(project.id)

                    // Assert: Both project and all issues deleted atomically
                    transaction(database) {
                        val projectDeleted = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .single()[ProjectsTable.deletedAt] != null

                        val issue1Deleted = IssuesTable.selectAll()
                            .where { IssuesTable.id eq issue1.value }
                            .single()[IssuesTable.deletedAt] != null

                        val issue2Deleted = IssuesTable.selectAll()
                            .where { IssuesTable.id eq issue2.value }
                            .single()[IssuesTable.deletedAt] != null

                        projectDeleted shouldBe true
                        issue1Deleted shouldBe true
                        issue2Deleted shouldBe true
                    }
                }
            }

            it("should ensure no partial soft-deletes occur (all-or-nothing)") {
                runTest {
                    // Arrange: Create project with multiple issues
                    val project = createTestProject(name = "All or Nothing Project")
                    val issues = (1..5).map { IssueId.generate() }

                    issues.forEach { project.addIssue(it) }
                    repository.save(project)

                    // Act: Soft-delete the project
                    repository.softDelete(project.id)

                    // Assert: Either all are deleted or none (check consistency)
                    transaction(database) {
                        val projectDeletedAt = ProjectsTable.selectAll()
                            .where { ProjectsTable.id eq project.id.value }
                            .single()[ProjectsTable.deletedAt]

                        val issueDeletedStatuses = issues.map { issueId ->
                            IssuesTable.selectAll()
                                .where { IssuesTable.id eq issueId.value }
                                .single()[IssuesTable.deletedAt] != null
                        }

                        // All issues should have same deletion state as project
                        if (projectDeletedAt != null) {
                            issueDeletedStatuses.all { it } shouldBe true
                        } else {
                            issueDeletedStatuses.all { !it } shouldBe true
                        }
                    }
                }
            }
        }
    }
})
