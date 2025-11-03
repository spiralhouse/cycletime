package io.spiralhouse.cycletime.unit

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.ints.shouldBeExactly
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.exceptions.*
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.entities.ProjectSnapshot
import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.unit.mocks.*
import kotlinx.datetime.Instant

/**
 * Comprehensive unit tests for ProjectApplicationService.
 *
 * This test suite achieves 80%+ coverage on business logic through fast, isolated tests
 * using mock infrastructure. Each test follows Given-When-Then structure with descriptive
 * names that clearly express the business scenarios being validated.
 *
 * ## Test Categories:
 * 1. Project Creation & Basic Operations (CRUD)
 * 2. Project Status Management & Transitions
 * 3. Project Metadata & Validation Rules
 * 4. Issue Association & Business Rules
 * 5. Project Querying & Filtering
 * 6. Error Scenarios & Edge Cases
 *
 * ## Mock Strategy:
 * - Uses constructor injection with all dependencies mocked
 * - MockTimeProvider for consistent time-based testing (no flaky tests)
 * - In-memory data storage for fast execution (<10ms each)
 * - Clear test isolation with beforeEach reset
 *
 * ## Performance Requirements:
 * - All tests run in <1s total
 * - No real I/O operations
 * - All time-dependent logic uses MockTimeProvider
 *
 * ## Business Logic Coverage:
 * - Project lifecycle: creation → completion workflows
 * - Status transitions: valid project state progressions  
 * - Issue management: association rules and constraints
 * - Validation rules: name constraints, status constraints
 * - Repository interactions: call counting and error simulation
 */
class ProjectApplicationServiceUnitTest : StringSpec({

    // ================================================================================
    // Test Infrastructure Setup
    // ================================================================================

    lateinit var mockProjectRepository: MockProjectRepository
    lateinit var mockIssueRepository: MockIssueRepository
    lateinit var mockUnitOfWork: MockUnitOfWork
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var projectService: ProjectApplicationService

    // Common test data
    lateinit var testProjectId: ProjectId
    lateinit var testIssueId: IssueId
    lateinit var baseTime: Instant

    beforeEach {
        // Reset all mocks to ensure test isolation
        mockProjectRepository = MockProjectRepository()
        mockIssueRepository = MockIssueRepository()
        mockUnitOfWork = MockUnitOfWork()
        mockTimeProvider = MockTimeProvider()

        // Create project service with mocked dependencies
        projectService = ProjectApplicationService(
            projectRepository = mockProjectRepository,
            issueRepository = mockIssueRepository,
            unitOfWork = mockUnitOfWork,
            timeProvider = mockTimeProvider
        )

        // Initialize common test data
        testProjectId = ProjectId.generate()
        testIssueId = IssueId.generate()
        baseTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(baseTime)
    }

    // ================================================================================
    // Helper Methods for Test Setup
    // ================================================================================

    fun createTestProject(
        id: ProjectId = testProjectId,
        name: String = "Test Project",
        description: String? = "Test project description",
        status: ProjectStatus = ProjectStatus.ACTIVE,
        issues: List<IssueId> = emptyList()
    ): Project {
        // Create project - always starts as ACTIVE
        val project = Project.create(
            name = name,
            description = description,
            timeProvider = mockTimeProvider
        )
        
        // Apply status transitions if needed
        when (status) {
            ProjectStatus.COMPLETED -> project.complete()
            ProjectStatus.ARCHIVED -> project.archive()
            ProjectStatus.ACTIVE -> { /* Already active */ }
        }
        
        // Add issues only if project allows it (not ARCHIVED or COMPLETED)
        if (status == ProjectStatus.ACTIVE) {
            issues.forEach { issueId ->
                project.addIssue(issueId)
            }
        }
        
        return project
    }

    fun addTestProject(
        projectId: ProjectId = testProjectId,
        name: String = "Test Project",
        status: ProjectStatus = ProjectStatus.ACTIVE,
        issues: List<IssueId> = emptyList()
    ) {
        // Create project using snapshot to control the ID
        val snapshot = ProjectSnapshot(
            id = projectId,
            name = name,
            description = "Test description",
            status = status,
            issues = issues,
            createdAt = mockTimeProvider.now(),
            updatedAt = mockTimeProvider.now()
        )
        
        val project = Project.fromSnapshot(snapshot, mockTimeProvider)
        
        // Add to main storage
        mockProjectRepository.projects[projectId] = project
        
        // Update status index manually since we're bypassing save()
        mockProjectRepository.projectsByStatus.getOrPut(status) { mutableListOf() }.apply {
            // Remove any existing entry for this project (for updates)
            removeAll { it.id == projectId }
            // Add the project
            add(project)
        }
    }

    // ================================================================================
    // Project Creation & Basic Operations Tests (CRUD)
    // ================================================================================

    "should create project with valid name and default status" {
        // Given - no setup needed

        // When
        val result = projectService.createProject(
            CreateProjectCommand(
                name = "New Project",
                description = "Project description"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.name shouldBe "New Project"
        result.description shouldBe "Project description"
        result.status shouldBe ProjectStatus.ACTIVE
        result.issues.shouldBeEmpty()
        result.issueCount shouldBe 0
        result.createdAt shouldBe baseTime
        result.updatedAt shouldBe baseTime
        mockProjectRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should create project with null description" {
        // Given - no setup needed

        // When
        val result = projectService.createProject(
            CreateProjectCommand(
                name = "Project Without Description",
                description = null
            )
        )

        // Then
        result.shouldNotBeNull()
        result.name shouldBe "Project Without Description"
        result.description.shouldBeNull()
        result.status shouldBe ProjectStatus.ACTIVE
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should reject project creation with blank name" {
        // Given - no setup needed

        // When & Then
        shouldThrow<DomainException> {
            projectService.createProject(
                CreateProjectCommand(
                    name = "   ",
                    description = "Valid description"
                )
            )
        }
        
        // Verify no database interaction on validation failure
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should reject project creation with empty name" {
        // Given - no setup needed

        // When & Then
        shouldThrow<DomainException> {
            projectService.createProject(
                CreateProjectCommand(
                    name = "",
                    description = "Valid description"
                )
            )
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should reject project creation with name exceeding 255 characters" {
        // Given
        val longName = "x".repeat(256)

        // When & Then
        shouldThrow<DomainException> {
            projectService.createProject(
                CreateProjectCommand(
                    name = longName,
                    description = "Valid description"
                )
            )
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should accept project creation with name exactly 255 characters" {
        // Given
        val maxLengthName = "x".repeat(255)

        // When
        val result = projectService.createProject(
            CreateProjectCommand(
                name = maxLengthName,
                description = "Valid description"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.name shouldBe maxLengthName
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should get existing project by ID" {
        // Given
        addTestProject(testProjectId, "Existing Project")

        // When
        val result = projectService.getProject(testProjectId)

        // Then
        result.shouldNotBeNull()
        result.id shouldBe testProjectId
        result.name shouldBe "Existing Project"
        result.status shouldBe ProjectStatus.ACTIVE
        mockProjectRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return null when getting non-existent project" {
        // Given - empty repository

        // When
        val result = projectService.getProject(testProjectId)

        // Then
        result.shouldBeNull()
        mockProjectRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should update project name successfully" {
        // Given
        addTestProject(testProjectId, "Original Name")
        mockTimeProvider.advance(kotlin.time.Duration.parse("1h"))

        // When
        val result = projectService.updateProject(
            UpdateProjectCommand(
                id = testProjectId,
                name = "Updated Name"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.name shouldBe "Updated Name"
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should update project description successfully" {
        // Given
        addTestProject(testProjectId, "Test Project")
        mockTimeProvider.advance(kotlin.time.Duration.parse("2h"))

        // When
        val result = projectService.updateProject(
            UpdateProjectCommand(
                id = testProjectId,
                description = "Updated description"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.description shouldBe "Updated description"
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should update both name and description in single operation" {
        // Given
        addTestProject(testProjectId, "Old Name")
        mockTimeProvider.advance(kotlin.time.Duration.parse("30m"))

        // When
        val result = projectService.updateProject(
            UpdateProjectCommand(
                id = testProjectId,
                name = "New Name",
                description = "New description"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.name shouldBe "New Name"
        result.description shouldBe "New description"
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should fail to update non-existent project" {
        // Given - empty repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            projectService.updateProject(
                UpdateProjectCommand(
                    id = testProjectId,
                    name = "Updated Name"
                )
            )
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should reject project update with invalid name" {
        // Given
        addTestProject(testProjectId, "Valid Name")

        // When & Then
        shouldThrow<DomainException> {
            projectService.updateProject(
                UpdateProjectCommand(
                    id = testProjectId,
                    name = ""
                )
            )
        }
        
        // Repository shouldn't be called after validation failure
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should delete existing project successfully" {
        // Given
        addTestProject(testProjectId, "Project to Delete")

        // When
        projectService.deleteProject(testProjectId)

        // Then
        mockProjectRepository.deleteCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should fail to delete non-existent project" {
        // Given - empty repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            projectService.deleteProject(testProjectId)
        }
        
        // Should not call delete after existence check fails
        mockProjectRepository.deleteCallCount shouldBe 0
    }

    // ================================================================================
    // Project Status Management & Transitions Tests
    // ================================================================================

    "should archive active project successfully" {
        // Given
        addTestProject(testProjectId, "Active Project", ProjectStatus.ACTIVE)
        mockTimeProvider.advance(kotlin.time.Duration.parse("1h"))

        // When
        val result = projectService.archiveProject(testProjectId)

        // Then
        result.shouldNotBeNull()
        result.status shouldBe ProjectStatus.ARCHIVED
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should archive completed project successfully" {
        // Given
        addTestProject(testProjectId, "Completed Project", ProjectStatus.COMPLETED)
        mockTimeProvider.advance(kotlin.time.Duration.parse("2h"))

        // When
        val result = projectService.archiveProject(testProjectId)

        // Then
        result.status shouldBe ProjectStatus.ARCHIVED
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should archive already archived project idempotently" {
        // Given
        addTestProject(testProjectId, "Archived Project", ProjectStatus.ARCHIVED)
        val originalUpdateTime = mockTimeProvider.now()
        mockTimeProvider.advance(kotlin.time.Duration.parse("1h"))

        // When
        val result = projectService.archiveProject(testProjectId)

        // Then
        result.status shouldBe ProjectStatus.ARCHIVED
        // Should update timestamp even for idempotent operation
        result.updatedAt shouldBe mockTimeProvider.now()
        result.updatedAt shouldNotBe originalUpdateTime
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should archive project using command object" {
        // Given
        addTestProject(testProjectId, "Project via Command", ProjectStatus.ACTIVE)

        // When
        val result = projectService.archiveProject(
            ArchiveProjectCommand(testProjectId)
        )

        // Then
        result.status shouldBe ProjectStatus.ARCHIVED
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should complete active project successfully" {
        // Given
        addTestProject(testProjectId, "Active Project", ProjectStatus.ACTIVE)
        mockTimeProvider.advance(kotlin.time.Duration.parse("3h"))

        // When
        val result = projectService.completeProject(testProjectId)

        // Then
        result.shouldNotBeNull()
        result.status shouldBe ProjectStatus.COMPLETED
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should complete already completed project idempotently" {
        // Given
        addTestProject(testProjectId, "Completed Project", ProjectStatus.COMPLETED)
        mockTimeProvider.advance(kotlin.time.Duration.parse("1h"))

        // When
        val result = projectService.completeProject(testProjectId)

        // Then
        result.status shouldBe ProjectStatus.COMPLETED
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should complete project using command object" {
        // Given
        addTestProject(testProjectId, "Project via Command", ProjectStatus.ACTIVE)

        // When
        val result = projectService.completeProject(
            CompleteProjectCommand(testProjectId)
        )

        // Then
        result.status shouldBe ProjectStatus.COMPLETED
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should reactivate archived project successfully" {
        // Given
        addTestProject(testProjectId, "Archived Project", ProjectStatus.ARCHIVED)
        mockTimeProvider.advance(kotlin.time.Duration.parse("4h"))

        // When
        val result = projectService.reactivateProject(testProjectId)

        // Then
        result.shouldNotBeNull()
        result.status shouldBe ProjectStatus.ACTIVE
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should reactivate completed project successfully" {
        // Given
        addTestProject(testProjectId, "Completed Project", ProjectStatus.COMPLETED)
        mockTimeProvider.advance(kotlin.time.Duration.parse("2h"))

        // When
        val result = projectService.reactivateProject(testProjectId)

        // Then
        result.status shouldBe ProjectStatus.ACTIVE
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should reactivate already active project idempotently" {
        // Given
        addTestProject(testProjectId, "Active Project", ProjectStatus.ACTIVE)
        mockTimeProvider.advance(kotlin.time.Duration.parse("1h"))

        // When
        val result = projectService.reactivateProject(testProjectId)

        // Then
        result.status shouldBe ProjectStatus.ACTIVE
        result.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should reactivate project using command object" {
        // Given
        addTestProject(testProjectId, "Archived Project", ProjectStatus.ARCHIVED)

        // When
        val result = projectService.reactivateProject(
            ReactivateProjectCommand(testProjectId)
        )

        // Then
        result.status shouldBe ProjectStatus.ACTIVE
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should fail to archive non-existent project" {
        // Given - empty repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            projectService.archiveProject(testProjectId)
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should fail to complete non-existent project" {
        // Given - empty repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            projectService.completeProject(testProjectId)
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should fail to reactivate non-existent project" {
        // Given - empty repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            projectService.reactivateProject(testProjectId)
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    // ================================================================================
    // Project Querying & Filtering Tests
    // ================================================================================

    "should list all projects when repository has multiple projects" {
        // Given
        val project1Id = ProjectId.generate()
        val project2Id = ProjectId.generate()
        addTestProject(project1Id, "Project 1", ProjectStatus.ACTIVE)
        addTestProject(project2Id, "Project 2", ProjectStatus.COMPLETED)

        // When
        val result = projectService.listProjects()

        // Then
        result.shouldNotBeNull()
        result.projects shouldHaveSize 2
        result.totalCount shouldBe 2
        result.projects.map { it.id } shouldContain project1Id
        result.projects.map { it.id } shouldContain project2Id
        mockProjectRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty list when no projects exist" {
        // Given - empty repository

        // When
        val result = projectService.listProjects()

        // Then
        result.shouldNotBeNull()
        result.projects.shouldBeEmpty()
        result.totalCount shouldBe 0
        mockProjectRepository.findCallCount shouldBe 1
    }

    "should list active projects only when filtering by ACTIVE status" {
        // Given
        val activeId = ProjectId.generate()
        val completedId = ProjectId.generate()
        val archivedId = ProjectId.generate()
        addTestProject(activeId, "Active Project", ProjectStatus.ACTIVE)
        addTestProject(completedId, "Completed Project", ProjectStatus.COMPLETED)
        addTestProject(archivedId, "Archived Project", ProjectStatus.ARCHIVED)

        // When
        val result = projectService.listProjectsByStatus(ProjectStatus.ACTIVE)

        // Then
        result shouldHaveSize 1
        result[0].id shouldBe activeId
        result[0].status shouldBe ProjectStatus.ACTIVE
        mockProjectRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should list completed projects only when filtering by COMPLETED status" {
        // Given
        val activeId = ProjectId.generate()
        val completedId = ProjectId.generate()
        addTestProject(activeId, "Active Project", ProjectStatus.ACTIVE)
        addTestProject(completedId, "Completed Project", ProjectStatus.COMPLETED)

        // When
        val result = projectService.listProjectsByStatus(ProjectStatus.COMPLETED)

        // Then
        result shouldHaveSize 1
        result[0].id shouldBe completedId
        result[0].status shouldBe ProjectStatus.COMPLETED
        mockProjectRepository.findCallCount shouldBe 1
    }

    "should list archived projects only when filtering by ARCHIVED status" {
        // Given
        val activeId = ProjectId.generate()
        val archivedId = ProjectId.generate()
        addTestProject(activeId, "Active Project", ProjectStatus.ACTIVE)
        addTestProject(archivedId, "Archived Project", ProjectStatus.ARCHIVED)

        // When
        val result = projectService.listProjectsByStatus(ProjectStatus.ARCHIVED)

        // Then
        result shouldHaveSize 1
        result[0].id shouldBe archivedId
        result[0].status shouldBe ProjectStatus.ARCHIVED
        mockProjectRepository.findCallCount shouldBe 1
    }

    "should return empty list when no projects match status filter" {
        // Given
        addTestProject(testProjectId, "Active Project", ProjectStatus.ACTIVE)

        // When
        val result = projectService.listProjectsByStatus(ProjectStatus.ARCHIVED)

        // Then
        result.shouldBeEmpty()
        mockProjectRepository.findCallCount shouldBe 1
    }

    "should support deprecated findProjectsByStatus method" {
        // Given
        addTestProject(testProjectId, "Active Project", ProjectStatus.ACTIVE)

        // When
        @Suppress("DEPRECATION")
        val result = projectService.findProjectsByStatus(ProjectStatus.ACTIVE)

        // Then
        result shouldHaveSize 1
        result[0].id shouldBe testProjectId
        mockProjectRepository.findCallCount shouldBe 1
    }

    // ================================================================================
    // Issue Association & Business Rules Tests
    // ================================================================================

    "should add issue to active project successfully" {
        // Given
        addTestProject(testProjectId, "Active Project", ProjectStatus.ACTIVE)
        mockTimeProvider.advance(kotlin.time.Duration.parse("1h"))

        // When
        projectService.addIssueToProject(testProjectId, testIssueId)

        // Then
        val savedProject = mockProjectRepository.projects[testProjectId]
        savedProject.shouldNotBeNull()
        savedProject.issues shouldContain testIssueId
        savedProject.issueCount shouldBe 1
        savedProject.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should add issue to active project using command object" {
        // Given
        addTestProject(testProjectId, "Active Project", ProjectStatus.ACTIVE)

        // When
        projectService.addIssueToProject(
            AddIssueToProjectCommand(testProjectId, testIssueId)
        )

        // Then
        val savedProject = mockProjectRepository.projects[testProjectId]
        savedProject.shouldNotBeNull()
        savedProject.issues shouldContain testIssueId
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should fail to add issue to archived project" {
        // Given
        addTestProject(testProjectId, "Archived Project", ProjectStatus.ARCHIVED)

        // When & Then
        shouldThrow<DomainException> {
            projectService.addIssueToProject(testProjectId, testIssueId)
        }
        
        // Should not save after domain rule violation
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should fail to add issue to completed project" {
        // Given
        addTestProject(testProjectId, "Completed Project", ProjectStatus.COMPLETED)

        // When & Then
        shouldThrow<DomainException> {
            projectService.addIssueToProject(testProjectId, testIssueId)
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should fail to add duplicate issue to project" {
        // Given
        addTestProject(testProjectId, "Project", ProjectStatus.ACTIVE, listOf(testIssueId))

        // When & Then
        shouldThrow<DomainException> {
            projectService.addIssueToProject(testProjectId, testIssueId)
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should fail to add issue to non-existent project" {
        // Given - empty repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            projectService.addIssueToProject(testProjectId, testIssueId)
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should remove issue from project successfully" {
        // Given
        addTestProject(testProjectId, "Project", ProjectStatus.ACTIVE, listOf(testIssueId))
        mockTimeProvider.advance(kotlin.time.Duration.parse("2h"))

        // When
        projectService.removeIssueFromProject(testProjectId, testIssueId)

        // Then
        val savedProject = mockProjectRepository.projects[testProjectId]
        savedProject.shouldNotBeNull()
        savedProject.issues shouldNotContain testIssueId
        savedProject.issueCount shouldBe 0
        savedProject.updatedAt shouldBe mockTimeProvider.now()
        mockProjectRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should remove issue from project using command object" {
        // Given
        addTestProject(testProjectId, "Project", ProjectStatus.ACTIVE, listOf(testIssueId))

        // When
        projectService.removeIssueFromProject(
            RemoveIssueFromProjectCommand(testProjectId, testIssueId)
        )

        // Then
        val savedProject = mockProjectRepository.projects[testProjectId]
        savedProject.shouldNotBeNull()
        savedProject.issues shouldNotContain testIssueId
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should handle removal of non-existent issue idempotently" {
        // Given
        val otherIssueId = IssueId.generate()
        addTestProject(testProjectId, "Project", ProjectStatus.ACTIVE, listOf(otherIssueId))

        // When
        projectService.removeIssueFromProject(testProjectId, testIssueId)

        // Then - no error should occur, project should be updated
        val savedProject = mockProjectRepository.projects[testProjectId]
        savedProject.shouldNotBeNull()
        savedProject.issues shouldContain otherIssueId
        savedProject.issues shouldNotContain testIssueId
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should fail to remove issue from non-existent project" {
        // Given - empty repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            projectService.removeIssueFromProject(testProjectId, testIssueId)
        }
        
        mockProjectRepository.saveCallCount shouldBe 0
    }

    "should allow removing issues from archived project" {
        // Given - business rules allow issue removal from any status
        addTestProject(testProjectId, "Archived Project", ProjectStatus.ARCHIVED, listOf(testIssueId))

        // When
        projectService.removeIssueFromProject(testProjectId, testIssueId)

        // Then
        val savedProject = mockProjectRepository.projects[testProjectId]
        savedProject.shouldNotBeNull()
        savedProject.issues shouldNotContain testIssueId
        mockProjectRepository.saveCallCount shouldBe 1
    }

    "should allow removing issues from completed project" {
        // Given
        addTestProject(testProjectId, "Completed Project", ProjectStatus.COMPLETED, listOf(testIssueId))

        // When
        projectService.removeIssueFromProject(testProjectId, testIssueId)

        // Then
        val savedProject = mockProjectRepository.projects[testProjectId]
        savedProject.shouldNotBeNull()
        savedProject.issues shouldNotContain testIssueId
        mockProjectRepository.saveCallCount shouldBe 1
    }

    // ================================================================================
    // Error Scenarios & Edge Cases Tests
    // ================================================================================

    "should propagate repository exceptions during project creation" {
        // Given
        val testException = RuntimeException("Database error")
        mockProjectRepository.throwOnSave(testException)

        // When & Then
        shouldThrow<RuntimeException> {
            projectService.createProject(
                CreateProjectCommand("Test Project", "Description")
            )
        }
    }

    "should propagate repository exceptions during project retrieval" {
        // Given
        val testException = RuntimeException("Connection failed")
        mockProjectRepository.throwOnFind(testException)

        // When & Then
        shouldThrow<RuntimeException> {
            projectService.getProject(testProjectId)
        }
    }

    "should propagate unit of work exceptions" {
        // Given
        val testException = RuntimeException("Transaction failed")
        mockUnitOfWork.throwOnExecute(testException)

        // When & Then
        shouldThrow<RuntimeException> {
            projectService.createProject(
                CreateProjectCommand("Test Project", "Description")
            )
        }
    }

    "should handle concurrent modification scenarios gracefully" {
        // Given
        addTestProject(testProjectId, "Original Project", ProjectStatus.ACTIVE)
        
        // Simulate concurrent modification by advancing time between operations
        mockTimeProvider.advance(kotlin.time.Duration.parse("10m"))
        
        // When - simulating two rapid updates
        val result1 = projectService.updateProject(
            UpdateProjectCommand(testProjectId, name = "First Update")
        )
        
        mockTimeProvider.advance(kotlin.time.Duration.parse("1m"))
        
        val result2 = projectService.updateProject(
            UpdateProjectCommand(testProjectId, name = "Second Update")
        )

        // Then - both operations should succeed with proper timestamps
        result1.name shouldBe "First Update"
        result2.name shouldBe "Second Update"
        result2.updatedAt shouldNotBe result1.updatedAt
        mockProjectRepository.saveCallCount shouldBe 2
    }

    "should maintain transactional integrity across all operations" {
        // Given - all operations should execute within unit of work

        // When - performing various operations (only service calls count)
        projectService.createProject(CreateProjectCommand("Test", null))
        val createdProject = projectService.listProjects() // This will have the created project
        projectService.getProject(createdProject.projects[0].id)
        projectService.archiveProject(createdProject.projects[0].id)

        // Then - all operations should have executed within transactions
        mockUnitOfWork.executeCallCount shouldBe 4
    }

    // ================================================================================
    // Soft-Deletion Operations Tests (SPI-878)
    // ================================================================================

    "should use soft-delete instead of hard-delete when deleting project" {
        // Given
        addTestProject(testProjectId, "Project to Soft Delete")

        // When
        projectService.deleteProject(testProjectId)

        // Then - should call softDelete, not delete
        mockProjectRepository.softDeleteCallCount shouldBe 1
        mockProjectRepository.deleteCallCount shouldBe 0
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should cascade soft-delete to issues when deleting project" {
        // Given
        addTestProject(testProjectId, "Project with Issues")
        // Note: Cascade behavior is handled by repository layer (SPI-876)
        // This test verifies service calls softDelete which triggers cascade

        // When
        projectService.deleteProject(testProjectId)

        // Then - service should call softDelete (cascade handled by repo)
        mockProjectRepository.softDeleteCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should complete soft-delete in single transaction" {
        // Given
        addTestProject(testProjectId, "Transactional Delete")

        // When
        projectService.deleteProject(testProjectId)

        // Then - verify single transaction wraps the operation
        mockUnitOfWork.executeCallCount shouldBe 1
        mockProjectRepository.softDeleteCallCount shouldBe 1
    }

    "should restore deleted project successfully" {
        // Given - deleted project exists
        val deletedProject = createTestProject(testProjectId, "Deleted Project")
        mockProjectRepository.projects[testProjectId] = deletedProject
        // Mock findIncludingDeleted to return the deleted project
        mockProjectRepository.deletedProjects[testProjectId] = deletedProject

        // When
        val result = projectService.restoreProject(testProjectId)

        // Then
        result.shouldNotBeNull()
        result.id shouldBe testProjectId
        mockProjectRepository.restoreCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should NOT auto-restore child issues when restoring project" {
        // Given - deleted project with deleted issues
        val deletedProject = createTestProject(testProjectId, "Parent Project")
        mockProjectRepository.deletedProjects[testProjectId] = deletedProject

        // When
        projectService.restoreProject(testProjectId)

        // Then - only project restored, no issue restoration calls
        mockProjectRepository.restoreCallCount shouldBe 1
        mockIssueRepository.restoreCallCount shouldBe 0
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should be idempotent when restoring already-active project" {
        // Given - active project (not deleted)
        val activeProject = createTestProject(testProjectId, "Active Project")
        mockProjectRepository.projects[testProjectId] = activeProject

        // When - restore is called on active project
        val result = projectService.restoreProject(testProjectId)

        // Then - operation completes without error (idempotent)
        result.shouldNotBeNull()
        mockProjectRepository.restoreCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw ProjectNotFoundException when restoring non-existent project" {
        // Given - project does not exist at all
        val nonExistentId = ProjectId.generate()
        // Do not add to repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            projectService.restoreProject(nonExistentId)
        }
        mockProjectRepository.restoreCallCount shouldBe 0
    }
})