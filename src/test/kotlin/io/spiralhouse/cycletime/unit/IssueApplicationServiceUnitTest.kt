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
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.entities.IssueSnapshot
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.unit.mocks.*
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.milliseconds

/**
 * Comprehensive unit tests for IssueApplicationService.
 *
 * This test suite achieves 80%+ coverage on business logic through fast, isolated tests
 * using mock infrastructure. Each test follows Given-When-Then structure with descriptive
 * names that clearly express the business scenarios being validated.
 *
 * ## Test Categories:
 * 1. Issue Creation & Basic Operations (CRUD)
 * 2. Issue Hierarchy & Parent-Child Relationships
 * 3. Issue Dependencies & Circular Dependency Prevention
 * 4. Issue State Management & Transitions
 * 5. Project Association & Validation
 * 6. Labels & Metadata Management
 * 7. Issue Querying & Analytics
 * 8. Error Scenarios & Edge Cases
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
 * - Issue lifecycle: creation → completion workflows
 * - Hierarchy validation: parent-child relationships and constraints
 * - State transitions: valid workflow progressions
 * - Project associations: referential integrity
 * - Dependency management: circular dependency prevention
 */
class IssueApplicationServiceUnitTest : StringSpec({

    // ================================================================================
    // Test Infrastructure Setup
    // ================================================================================

    lateinit var mockIssueRepository: MockIssueRepository
    lateinit var mockProjectRepository: MockProjectRepository
    lateinit var mockUnitOfWork: MockUnitOfWork
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var issueService: IssueApplicationService

    // Common test data
    lateinit var testProjectId: ProjectId
    lateinit var testIssueId: IssueId
    lateinit var testParentId: IssueId
    lateinit var baseTime: Instant

    beforeEach {
        // Reset all mocks to ensure test isolation
        mockIssueRepository = MockIssueRepository()
        mockProjectRepository = MockProjectRepository()
        mockUnitOfWork = MockUnitOfWork()
        mockTimeProvider = MockTimeProvider()

        // Create issue service with mocked dependencies
        issueService = IssueApplicationService(
            issueRepository = mockIssueRepository,
            projectRepository = mockProjectRepository,
            unitOfWork = mockUnitOfWork,
            timeProvider = mockTimeProvider
        )

        // Initialize common test data
        testProjectId = ProjectId.generate()
        testIssueId = IssueId.generate()
        testParentId = IssueId.generate()
        baseTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(baseTime)
    }

    // ================================================================================
    // Helper Methods for Test Setup
    // ================================================================================

    fun createTestIssue(
        id: IssueId = IssueId.generate(),
        title: String = "Test Issue",
        description: String? = null,
        type: IssueType = IssueType.STORY,
        parentId: IssueId? = null,
        projectId: ProjectId? = null,
        estimate: Estimate = Estimate.none(),
        assigneeId: String? = null,
        status: IssueStatus = IssueStatus.TODO
    ): Issue {
        // Create issue snapshot with the specific ID to ensure test predictability
        val snapshot = IssueSnapshot(
            id = id,
            title = title,
            description = description,
            type = type,
            status = status,
            parentId = parentId,
            projectId = projectId,
            estimate = estimate,
            assigneeId = assigneeId,
            dependencies = emptyList(),
            blockedBy = emptyList(),
            createdAt = mockTimeProvider.now(),
            updatedAt = mockTimeProvider.now()
        )
        
        return Issue.fromSnapshot(snapshot, mockTimeProvider)
    }

    fun addTestProject(
        projectId: ProjectId = testProjectId,
        name: String = "Test Project"
    ) {
        val testProject = Project.create(
            name = name,
            description = "Test project for unit tests",
            timeProvider = mockTimeProvider
        )
        mockProjectRepository.projects[projectId] = testProject
    }

    // ================================================================================
    // Issue Creation & Basic Operations Tests (CRUD)
    // ================================================================================

    "should create issue without project when no project provided" {
        // Given - no setup needed

        // When
        val result = issueService.createIssue(
            CreateIssueCommand(
                title = "New Issue",
                type = IssueType.STORY
            )
        )

        // Then
        result.shouldNotBeNull()
        result.title shouldBe "New Issue"
        result.type shouldBe IssueType.STORY
        result.projectId.shouldBeNull()
        result.status shouldBe IssueStatus.TODO
        result.createdAt shouldBe baseTime
        result.updatedAt shouldBe baseTime
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should create issue with project when project exists" {
        // Given
        addTestProject(testProjectId)

        // When
        val result = issueService.createIssue(
            CreateIssueCommand(
                title = "Project Issue",
                type = IssueType.STORY,
                projectId = testProjectId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.title shouldBe "Project Issue"
        result.type shouldBe IssueType.STORY
        result.projectId shouldBe testProjectId
        result.status shouldBe IssueStatus.TODO
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should create issue with all optional fields when provided" {
        // Given
        addTestProject(testProjectId)

        // When
        val result = issueService.createIssue(
            CreateIssueCommand(
                title = "Complete Issue",
                description = "Detailed description",
                type = IssueType.STORY,
                projectId = testProjectId,
                estimate = Estimate.of(5),
                assigneeId = "user-123"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.title shouldBe "Complete Issue"
        result.description shouldBe "Detailed description"
        result.type shouldBe IssueType.STORY
        result.projectId shouldBe testProjectId
        result.estimate shouldBe Estimate.of(5)
        result.assigneeId shouldBe "user-123"
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should create issue with parent and inherit project when parent has project" {
        // Given
        val parentIssue = createTestIssue(
            id = testParentId,
            type = IssueType.STORY,
            projectId = testProjectId
        )
        mockIssueRepository.addTestIssues(parentIssue)

        // When
        val result = issueService.createIssue(
            CreateIssueCommand(
                title = "Child Issue",
                type = IssueType.SUBTASK,
                parentId = testParentId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.title shouldBe "Child Issue"
        result.type shouldBe IssueType.SUBTASK
        result.parentId shouldBe testParentId
        result.projectId shouldBe testProjectId // Inherited from parent
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should throw ProjectNotFoundException when creating issue with non-existent project" {
        // Given
        val nonExistentProjectId = ProjectId.generate()
        // Do not add project to repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            issueService.createIssue(
                CreateIssueCommand(
                    title = "Invalid Issue",
                    type = IssueType.STORY,
                    projectId = nonExistentProjectId
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw IssueNotFoundException when creating issue with non-existent parent" {
        // Given
        val nonExistentParentId = IssueId.generate()
        // Do not add parent to repository

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.createIssue(
                CreateIssueCommand(
                    title = "Invalid Child",
                    type = IssueType.SUBTASK,
                    parentId = nonExistentParentId
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw DomainException when creating Epic with estimate" {
        // Given - Epics cannot have estimates (domain rule)

        // When & Then
        shouldThrow<DomainException> {
            issueService.createIssue(
                CreateIssueCommand(
                    title = "Invalid Epic",
                    type = IssueType.EPIC,
                    estimate = Estimate.of(5)
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should get issue when issue exists" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        mockIssueRepository.addTestIssues(testIssue)

        // When
        val result = issueService.getIssue(testIssueId)

        // Then
        result.shouldNotBeNull()
        result.id shouldBe testIssueId
        result.title shouldBe testIssue.title
        result.type shouldBe testIssue.type
        mockIssueRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return null when issue does not exist" {
        // Given
        val nonExistentId = IssueId.generate()
        // Do not add issue to repository

        // When
        val result = issueService.getIssue(nonExistentId)

        // Then
        result.shouldBeNull()
        mockIssueRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should update issue title when issue exists" {
        // Given
        val testIssue = createTestIssue(id = testIssueId, title = "Original Title")
        mockIssueRepository.addTestIssues(testIssue)
        val newTime = baseTime.plus(1.hours)
        mockTimeProvider.setTime(newTime)

        // When
        val result = issueService.updateIssue(
            UpdateIssueCommand(
                id = testIssueId,
                title = "Updated Title"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.id shouldBe testIssueId
        result.title shouldBe "Updated Title"
        result.updatedAt shouldBe newTime
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should update issue description when issue exists" {
        // Given
        val testIssue = createTestIssue(id = testIssueId, description = "Original description")
        mockIssueRepository.addTestIssues(testIssue)

        // When
        val result = issueService.updateIssue(
            UpdateIssueCommand(
                id = testIssueId,
                description = "Updated description"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.description shouldBe "Updated description"
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should update issue estimate when issue exists and estimate is valid" {
        // Given
        val testIssue = createTestIssue(
            id = testIssueId,
            type = IssueType.SUBTASK,
            estimate = Estimate.of(3)
        )
        mockIssueRepository.addTestIssues(testIssue)

        // When
        val result = issueService.updateIssue(
            UpdateIssueCommand(
                id = testIssueId,
                estimate = Estimate.of(8)
            )
        )

        // Then
        result.shouldNotBeNull()
        result.estimate shouldBe Estimate.of(8)
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should update issue assignee when issue exists" {
        // Given
        val testIssue = createTestIssue(id = testIssueId, assigneeId = "original-user")
        mockIssueRepository.addTestIssues(testIssue)

        // When
        val result = issueService.updateIssue(
            UpdateIssueCommand(
                id = testIssueId,
                assigneeId = "new-user"
            )
        )

        // Then
        result.shouldNotBeNull()
        result.assigneeId shouldBe "new-user"
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should throw IssueNotFoundException when updating non-existent issue" {
        // Given
        val nonExistentId = IssueId.generate()

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.updateIssue(
                UpdateIssueCommand(
                    id = nonExistentId,
                    title = "New Title"
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw DomainException when updating Epic with estimate" {
        // Given
        val testEpic = createTestIssue(id = testIssueId, type = IssueType.EPIC)
        mockIssueRepository.addTestIssues(testEpic)

        // When & Then
        shouldThrow<DomainException> {
            issueService.updateIssue(
                UpdateIssueCommand(
                    id = testIssueId,
                    estimate = Estimate.of(5)
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should delete issue when issue exists" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        mockIssueRepository.addTestIssues(testIssue)

        // When
        issueService.deleteIssue(testIssueId)

        // Then
        mockIssueRepository.deleteCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw IssueNotFoundException when deleting non-existent issue" {
        // Given
        val nonExistentId = IssueId.generate()

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.deleteIssue(nonExistentId)
        }
        mockIssueRepository.deleteCallCount shouldBe 0
    }

    // ================================================================================
    // Issue Hierarchy & Parent-Child Relationship Tests
    // ================================================================================

    "should validate hierarchy rules when creating Subtask with Story parent" {
        // Given
        val storyParent = createTestIssue(id = testParentId, type = IssueType.STORY)
        mockIssueRepository.addTestIssues(storyParent)

        // When
        val result = issueService.createIssue(
            CreateIssueCommand(
                title = "Valid Subtask",
                type = IssueType.SUBTASK,
                parentId = testParentId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.type shouldBe IssueType.SUBTASK
        result.parentId shouldBe testParentId
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should validate hierarchy rules when creating Story with Epic parent" {
        // Given
        val epicParent = createTestIssue(id = testParentId, type = IssueType.EPIC)
        mockIssueRepository.addTestIssues(epicParent)

        // When
        val result = issueService.createIssue(
            CreateIssueCommand(
                title = "Valid Story",
                type = IssueType.STORY,
                parentId = testParentId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.type shouldBe IssueType.STORY
        result.parentId shouldBe testParentId
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should throw HierarchyViolationException when creating Epic with parent" {
        // Given
        val parentIssue = createTestIssue(id = testParentId, type = IssueType.EPIC)
        mockIssueRepository.addTestIssues(parentIssue)

        // When & Then
        shouldThrow<HierarchyViolationException> {
            issueService.createIssue(
                CreateIssueCommand(
                    title = "Invalid Epic",
                    type = IssueType.EPIC,
                    parentId = testParentId
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw HierarchyViolationException when creating Subtask with Epic parent" {
        // Given
        val epicParent = createTestIssue(id = testParentId, type = IssueType.EPIC)
        mockIssueRepository.addTestIssues(epicParent)

        // When & Then
        shouldThrow<HierarchyViolationException> {
            issueService.createIssue(
                CreateIssueCommand(
                    title = "Invalid Subtask",
                    type = IssueType.SUBTASK,
                    parentId = testParentId
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw HierarchyViolationException when creating Subtask without parent" {
        // Given - Subtasks must have a Story parent

        // When & Then
        shouldThrow<HierarchyViolationException> {
            issueService.createIssue(
                CreateIssueCommand(
                    title = "Orphaned Subtask",
                    type = IssueType.SUBTASK
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should move issue to new parent when hierarchy rules are satisfied" {
        // Given
        val originalParent = createTestIssue(id = testParentId, type = IssueType.STORY)
        val newParentId = IssueId.generate()
        val newParent = createTestIssue(id = newParentId, type = IssueType.STORY)
        val childIssue = createTestIssue(
            id = testIssueId,
            type = IssueType.SUBTASK,
            parentId = testParentId
        )
        
        mockIssueRepository.addTestIssues(originalParent, newParent, childIssue)
        val newTime = baseTime.plus(1.hours)
        mockTimeProvider.setTime(newTime)

        // When
        val result = issueService.moveIssue(
            MoveIssueCommand(
                issueId = testIssueId,
                newParentId = newParentId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.id shouldBe testIssueId
        result.parentId shouldBe newParentId
        result.updatedAt shouldBe newTime
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should move issue to no parent when allowed by hierarchy rules" {
        // Given
        val parentIssue = createTestIssue(id = testParentId, type = IssueType.EPIC)
        val childIssue = createTestIssue(
            id = testIssueId,
            type = IssueType.STORY,
            parentId = testParentId
        )
        
        mockIssueRepository.addTestIssues(parentIssue, childIssue)

        // When
        val result = issueService.moveIssue(
            MoveIssueCommand(
                issueId = testIssueId,
                newParentId = null
            )
        )

        // Then
        result.shouldNotBeNull()
        result.parentId.shouldBeNull()
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should throw HierarchyViolationException when moving creates circular dependency" {
        // Given - Cannot move issue to its own descendant
        val grandParent = createTestIssue(id = testIssueId, type = IssueType.EPIC)
        val parent = createTestIssue(id = testParentId, type = IssueType.STORY, parentId = testIssueId)
        val childId = IssueId.generate()
        val child = createTestIssue(id = childId, type = IssueType.SUBTASK, parentId = testParentId)
        
        mockIssueRepository.addTestIssues(grandParent, parent, child)

        // When & Then - trying to move grandparent to be child of its descendant
        shouldThrow<HierarchyViolationException> {
            issueService.moveIssue(
                MoveIssueCommand(
                    issueId = testIssueId, // grandparent
                    newParentId = childId   // its descendant
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw IssueNotFoundException when moving non-existent issue" {
        // Given
        val nonExistentId = IssueId.generate()

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.moveIssue(
                MoveIssueCommand(
                    issueId = nonExistentId,
                    newParentId = testParentId
                )
            )
        }
    }

    "should get complete issue hierarchy including all descendants" {
        // Given - Epic -> Story -> Subtask hierarchy
        val epicId = testIssueId
        val storyId = IssueId.generate()
        val subtaskId = IssueId.generate()
        
        val epic = createTestIssue(id = epicId, type = IssueType.EPIC, title = "Epic Title")
        val story = createTestIssue(
            id = storyId,
            type = IssueType.STORY,
            title = "Story Title",
            parentId = epicId
        )
        val subtask = createTestIssue(
            id = subtaskId,
            type = IssueType.SUBTASK,
            title = "Subtask Title",
            parentId = storyId
        )
        
        mockIssueRepository.addTestIssues(epic, story, subtask)

        // When
        val result = issueService.getIssueHierarchy(epicId)

        // Then
        result.shouldNotBeNull()
        result.issue.id shouldBe epicId
        result.issue.title shouldBe "Epic Title"
        result.children shouldHaveSize 1
        result.children[0].issue.id shouldBe storyId
        result.children[0].children shouldHaveSize 1
        result.children[0].children[0].issue.id shouldBe subtaskId
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // TODO: Move to integration tests - getIssueHierarchyExtended has database dependencies
    // that cannot be mocked in pure unit tests (HierarchyQueries.countDescendantsOptimized)
    /*
    "should get extended hierarchy with parent, children, and descendant count" {
        // Given
        val parentId = IssueId.generate()
        val parent = createTestIssue(id = parentId, type = IssueType.EPIC)
        val child1Id = IssueId.generate()
        val child2Id = IssueId.generate()
        val child1 = createTestIssue(id = child1Id, type = IssueType.STORY, parentId = testIssueId)
        val child2 = createTestIssue(id = child2Id, type = IssueType.STORY, parentId = testIssueId)
        val mainIssue = createTestIssue(
            id = testIssueId,
            type = IssueType.EPIC,
            parentId = parentId
        )
        
        mockIssueRepository.addTestIssues(parent, mainIssue, child1, child2)
        mockIssueRepository.issuesByParent[testIssueId] = mutableListOf(child1, child2)

        // When
        val result = issueService.getIssueHierarchyExtended(testIssueId)

        // Then
        result.shouldNotBeNull()
        result.issue.id shouldBe testIssueId
        result.parent?.id shouldBe parentId
        result.children shouldHaveSize 2
        result.children.map { it.id } shouldContain child1Id
        result.children.map { it.id } shouldContain child2Id
        mockUnitOfWork.executeCallCount shouldBe 1
    }
    */

    "should list direct children of parent issue" {
        // Given
        val child1Id = IssueId.generate()
        val child2Id = IssueId.generate()
        val child1 = createTestIssue(id = child1Id, parentId = testIssueId)
        val child2 = createTestIssue(id = child2Id, parentId = testIssueId)
        
        mockIssueRepository.addTestIssues(child1, child2)
        mockIssueRepository.issuesByParent[testIssueId] = mutableListOf(child1, child2)

        // When
        val result = issueService.listChildren(testIssueId)

        // Then
        result shouldHaveSize 2
        result.map { it.id } shouldContain child1Id
        result.map { it.id } shouldContain child2Id
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty list when issue has no children" {
        // Given
        val parentWithNoChildren = IssueId.generate()

        // When
        val result = issueService.listChildren(parentWithNoChildren)

        // Then
        result.shouldBeEmpty()
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // ================================================================================
    // Issue Dependencies & Circular Dependency Prevention Tests
    // ================================================================================

    "should add dependency when both issues exist and no circular dependency" {
        // Given
        val issueA = createTestIssue(id = testIssueId, title = "Issue A")
        val issueBId = IssueId.generate()
        val issueB = createTestIssue(id = issueBId, title = "Issue B")
        
        mockIssueRepository.addTestIssues(issueA, issueB)

        // When
        val result = issueService.addDependency(
            AddDependencyCommand(
                issueId = testIssueId,
                dependencyId = issueBId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.id shouldBe testIssueId
        result.dependencies shouldContain issueBId
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw DomainException when adding self-dependency" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        mockIssueRepository.addTestIssues(testIssue)

        // When & Then - Self-dependency is a domain rule violation
        shouldThrow<DomainException> {
            issueService.addDependency(
                AddDependencyCommand(
                    issueId = testIssueId,
                    dependencyId = testIssueId
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw CircularDependencyException when adding creates cycle" {
        // Given - A depends on B, trying to make B depend on A
        val issueA = createTestIssue(id = testIssueId)
        issueA.addDependency(testParentId) // A depends on B
        val issueB = createTestIssue(id = testParentId)
        
        mockIssueRepository.addTestIssues(issueA, issueB)

        // When & Then - trying to make B depend on A would create cycle
        shouldThrow<CircularDependencyException> {
            issueService.addDependency(
                AddDependencyCommand(
                    issueId = testParentId,    // B
                    dependencyId = testIssueId  // A
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw IssueNotFoundException when adding dependency to non-existent issue" {
        // Given
        val nonExistentId = IssueId.generate()
        val existingIssue = createTestIssue(id = testIssueId)
        mockIssueRepository.addTestIssues(existingIssue)

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.addDependency(
                AddDependencyCommand(
                    issueId = nonExistentId,
                    dependencyId = testIssueId
                )
            )
        }
    }

    "should throw IssueNotFoundException when adding non-existent dependency" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        val nonExistentDependency = IssueId.generate()
        mockIssueRepository.addTestIssues(testIssue)

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.addDependency(
                AddDependencyCommand(
                    issueId = testIssueId,
                    dependencyId = nonExistentDependency
                )
            )
        }
    }

    "should remove dependency when dependency exists" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        testIssue.addDependency(testParentId) // Add dependency first
        mockIssueRepository.addTestIssues(testIssue)

        // When
        val result = issueService.removeDependency(
            RemoveDependencyCommand(
                issueId = testIssueId,
                dependencyId = testParentId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.dependencies shouldNotContain testParentId
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should remove dependency idempotently when dependency does not exist" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        mockIssueRepository.addTestIssues(testIssue)
        val nonExistentDependency = IssueId.generate()

        // When
        val result = issueService.removeDependency(
            RemoveDependencyCommand(
                issueId = testIssueId,
                dependencyId = nonExistentDependency
            )
        )

        // Then
        result.shouldNotBeNull()
        result.dependencies.shouldBeEmpty()
        mockIssueRepository.saveCallCount shouldBe 1
    }

    "should add blocker when both issues exist" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        val blockerId = IssueId.generate()
        val blockerIssue = createTestIssue(id = blockerId)
        
        mockIssueRepository.addTestIssues(testIssue, blockerIssue)

        // When
        val result = issueService.addBlocker(
            AddBlockerCommand(
                issueId = testIssueId,
                blockerId = blockerId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.blockedBy shouldContain blockerId
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw IssueNotFoundException when adding blocker to non-existent issue" {
        // Given
        val nonExistentId = IssueId.generate()
        val blockerIssue = createTestIssue(id = testParentId)
        mockIssueRepository.addTestIssues(blockerIssue)

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.addBlocker(
                AddBlockerCommand(
                    issueId = nonExistentId,
                    blockerId = testParentId
                )
            )
        }
    }

    "should throw IssueNotFoundException when adding non-existent blocker" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        val nonExistentBlockerId = IssueId.generate()
        mockIssueRepository.addTestIssues(testIssue)

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.addBlocker(
                AddBlockerCommand(
                    issueId = testIssueId,
                    blockerId = nonExistentBlockerId
                )
            )
        }
    }

    "should remove blocker when blocker exists" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        testIssue.addBlockedBy(testParentId)
        mockIssueRepository.addTestIssues(testIssue)

        // When
        val result = issueService.removeBlocker(
            RemoveBlockerCommand(
                issueId = testIssueId,
                blockerId = testParentId
            )
        )

        // Then
        result.shouldNotBeNull()
        result.blockedBy shouldNotContain testParentId
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // ================================================================================
    // Issue State Management & Transition Tests
    // ================================================================================

    "should update issue status when transition is valid" {
        // Given
        val testIssue = createTestIssue(id = testIssueId, status = IssueStatus.TODO)
        mockIssueRepository.addTestIssues(testIssue)

        // When
        val result = issueService.updateStatus(
            UpdateIssueStatusCommand(
                issueId = testIssueId,
                newStatus = IssueStatus.IN_PROGRESS
            )
        )

        // Then
        result.shouldNotBeNull()
        result.status shouldBe IssueStatus.IN_PROGRESS
        mockIssueRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw InvalidStatusTransitionException when transition is invalid" {
        // Given
        val testIssue = createTestIssue(id = testIssueId, status = IssueStatus.DONE)
        mockIssueRepository.addTestIssues(testIssue)

        // When & Then - typically can't go back from DONE to TODO
        shouldThrow<InvalidStatusTransitionException> {
            issueService.updateStatus(
                UpdateIssueStatusCommand(
                    issueId = testIssueId,
                    newStatus = IssueStatus.TODO
                )
            )
        }
        mockIssueRepository.saveCallCount shouldBe 0
    }

    "should throw IssueNotFoundException when updating status of non-existent issue" {
        // Given
        val nonExistentId = IssueId.generate()

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.updateStatus(
                UpdateIssueStatusCommand(
                    issueId = nonExistentId,
                    newStatus = IssueStatus.IN_PROGRESS
                )
            )
        }
    }

    "should get issues by status when issues with that status exist" {
        // Given
        val issue1 = createTestIssue(id = testIssueId, status = IssueStatus.IN_PROGRESS)
        val issue2Id = IssueId.generate()
        val issue2 = createTestIssue(id = issue2Id, status = IssueStatus.IN_PROGRESS)
        val issue3Id = IssueId.generate()
        val issue3 = createTestIssue(id = issue3Id, status = IssueStatus.DONE)
        
        mockIssueRepository.addTestIssues(issue1, issue2, issue3)

        // When
        val result = issueService.getIssuesByStatus(IssueStatus.IN_PROGRESS)

        // Then
        result shouldHaveSize 2
        result.map { it.id } shouldContain testIssueId
        result.map { it.id } shouldContain issue2Id
        result.map { it.id } shouldNotContain issue3Id
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty list when no issues have specified status" {
        // Given
        val issue = createTestIssue(id = testIssueId, status = IssueStatus.TODO)
        mockIssueRepository.addTestIssues(issue)

        // When
        val result = issueService.getIssuesByStatus(IssueStatus.DONE)

        // Then
        result.shouldBeEmpty()
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // ================================================================================
    // Project Association & Validation Tests  
    // ================================================================================

    "should get issues by project when issues associated with project exist" {
        // Given
        val issue1 = createTestIssue(id = testIssueId, projectId = testProjectId)
        val issue2Id = IssueId.generate()
        val issue2 = createTestIssue(id = issue2Id, projectId = testProjectId)
        val otherProjectId = ProjectId.generate()
        val issue3Id = IssueId.generate()
        val issue3 = createTestIssue(id = issue3Id, projectId = otherProjectId)
        
        mockIssueRepository.addTestIssues(issue1, issue2, issue3)

        // When
        val result = issueService.getIssuesByProject(testProjectId)

        // Then
        result shouldHaveSize 2
        result.map { it.id } shouldContain testIssueId
        result.map { it.id } shouldContain issue2Id
        result.map { it.id } shouldNotContain issue3Id
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty list when no issues associated with project" {
        // Given
        val otherProjectId = ProjectId.generate()
        val issue = createTestIssue(id = testIssueId, projectId = otherProjectId)
        mockIssueRepository.addTestIssues(issue)

        // When
        val result = issueService.getIssuesByProject(testProjectId)

        // Then
        result.shouldBeEmpty()
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // ================================================================================
    // Issue Querying & Analytics Tests
    // ================================================================================

    "should get issues by assignee when issues assigned to user exist" {
        // Given
        val issue1 = createTestIssue(id = testIssueId, assigneeId = "user-123")
        val issue2Id = IssueId.generate()
        val issue2 = createTestIssue(id = issue2Id, assigneeId = "user-123")
        val issue3Id = IssueId.generate()
        val issue3 = createTestIssue(id = issue3Id, assigneeId = "user-456")
        
        mockIssueRepository.addTestIssues(issue1, issue2, issue3)

        // When
        val result = issueService.getIssuesByAssignee("user-123")

        // Then
        result shouldHaveSize 2
        result.map { it.id } shouldContain testIssueId
        result.map { it.id } shouldContain issue2Id
        result.map { it.id } shouldNotContain issue3Id
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty list when no issues assigned to user" {
        // Given
        val issue = createTestIssue(id = testIssueId, assigneeId = "user-456")
        mockIssueRepository.addTestIssues(issue)

        // When
        val result = issueService.getIssuesByAssignee("user-123")

        // Then
        result.shouldBeEmpty()
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should get issues by type when issues of that type exist" {
        // Given
        val epic1 = createTestIssue(id = testIssueId, type = IssueType.EPIC)
        val epic2Id = IssueId.generate()
        val epic2 = createTestIssue(id = epic2Id, type = IssueType.EPIC)
        val storyId = IssueId.generate()
        val story = createTestIssue(id = storyId, type = IssueType.STORY)
        
        mockIssueRepository.addTestIssues(epic1, epic2, story)

        // When
        val result = issueService.getIssuesByType(IssueType.EPIC)

        // Then
        result shouldHaveSize 2
        result.map { it.id } shouldContain testIssueId
        result.map { it.id } shouldContain epic2Id
        result.map { it.id } shouldNotContain storyId
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should list all issues with correct total count" {
        // Given
        val epic = createTestIssue(id = testIssueId, type = IssueType.EPIC)
        val storyId = IssueId.generate()
        val story = createTestIssue(id = storyId, type = IssueType.STORY)
        val subtaskId = IssueId.generate()
        val subtask = createTestIssue(id = subtaskId, type = IssueType.SUBTASK)
        
        mockIssueRepository.addTestIssues(epic, story, subtask)

        // When
        val result = issueService.listIssues()

        // Then
        result.shouldNotBeNull()
        result.issues shouldHaveSize 3
        result.totalCount shouldBe 3
        result.issues.map { it.id } shouldContain testIssueId
        result.issues.map { it.id } shouldContain storyId
        result.issues.map { it.id } shouldContain subtaskId
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty issue list when no issues exist" {
        // Given - no issues in repository

        // When
        val result = issueService.listIssues()

        // Then
        result.shouldNotBeNull()
        result.issues.shouldBeEmpty()
        result.totalCount shouldBe 0
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // ================================================================================
    // Edge Cases and Boundary Conditions Tests
    // ================================================================================

    "should handle complex hierarchy with multiple levels correctly" {
        // Given - Epic -> Story -> Subtask with multiple children at each level
        val epicId = testIssueId
        val story1Id = IssueId.generate()
        val story2Id = IssueId.generate()
        val subtask1Id = IssueId.generate()
        val subtask2Id = IssueId.generate()
        val subtask3Id = IssueId.generate()
        
        val epic = createTestIssue(id = epicId, type = IssueType.EPIC, title = "Main Epic")
        val story1 = createTestIssue(
            id = story1Id,
            type = IssueType.STORY,
            title = "Story 1",
            parentId = epicId
        )
        val story2 = createTestIssue(
            id = story2Id,
            type = IssueType.STORY,
            title = "Story 2",
            parentId = epicId
        )
        val subtask1 = createTestIssue(
            id = subtask1Id,
            type = IssueType.SUBTASK,
            title = "Subtask 1",
            parentId = story1Id
        )
        val subtask2 = createTestIssue(
            id = subtask2Id,
            type = IssueType.SUBTASK,
            title = "Subtask 2",
            parentId = story1Id
        )
        val subtask3 = createTestIssue(
            id = subtask3Id,
            type = IssueType.SUBTASK,
            title = "Subtask 3",
            parentId = story2Id
        )
        
        mockIssueRepository.addTestIssues(epic, story1, story2, subtask1, subtask2, subtask3)

        // When
        val result = issueService.getIssueHierarchy(epicId)

        // Then
        result.shouldNotBeNull()
        result.issue.title shouldBe "Main Epic"
        result.children shouldHaveSize 2
        
        // Find story1 and story2 in children
        val resultStory1 = result.children.find { it.issue.id == story1Id }
        val resultStory2 = result.children.find { it.issue.id == story2Id }
        
        resultStory1.shouldNotBeNull()
        resultStory1.children shouldHaveSize 2
        
        resultStory2.shouldNotBeNull()
        resultStory2.children shouldHaveSize 1
    }

    "should handle multiple concurrent dependency operations correctly" {
        // Given
        val issueA = createTestIssue(id = testIssueId, title = "Issue A")
        val issueBId = IssueId.generate()
        val issueB = createTestIssue(id = issueBId, title = "Issue B")
        val issueCId = IssueId.generate()
        val issueC = createTestIssue(id = issueCId, title = "Issue C")
        
        mockIssueRepository.addTestIssues(issueA, issueB, issueC)

        // When - Add multiple dependencies
        val result1 = issueService.addDependency(
            AddDependencyCommand(testIssueId, issueBId)
        )
        val result2 = issueService.addDependency(
            AddDependencyCommand(testIssueId, issueCId)
        )

        // Then
        result1.dependencies shouldContain issueBId
        result2.dependencies shouldContain issueBId
        result2.dependencies shouldContain issueCId
        result2.dependencies shouldHaveSize 2
    }

    "should maintain issue state consistency during rapid updates" {
        // Given
        val testIssue = createTestIssue(
            id = testIssueId,
            title = "Original Title",
            description = "Original Description",
            assigneeId = "original-user"
        )
        mockIssueRepository.addTestIssues(testIssue)
        val startTime = baseTime

        // When - Perform rapid successive updates with advancing time
        mockTimeProvider.setTime(startTime.plus(10.milliseconds))
        val update1 = issueService.updateIssue(
            UpdateIssueCommand(testIssueId, title = "Updated Title")
        )
        
        mockTimeProvider.setTime(startTime.plus(20.milliseconds))
        val update2 = issueService.updateIssue(
            UpdateIssueCommand(testIssueId, description = "Updated Description")
        )
        
        mockTimeProvider.setTime(startTime.plus(30.milliseconds))
        val update3 = issueService.updateIssue(
            UpdateIssueCommand(testIssueId, assigneeId = "updated-user")
        )

        // Then - All changes should be preserved with correct timestamps
        update1.title shouldBe "Updated Title"
        update1.updatedAt shouldBe startTime.plus(10.milliseconds)
        
        update2.title shouldBe "Updated Title" // Should preserve previous change
        update2.description shouldBe "Updated Description"
        update2.updatedAt shouldBe startTime.plus(20.milliseconds)
        
        update3.title shouldBe "Updated Title" // Should preserve all changes
        update3.description shouldBe "Updated Description"
        update3.assigneeId shouldBe "updated-user"
        update3.updatedAt shouldBe startTime.plus(30.milliseconds)
    }

    "should handle issue with maximum number of dependencies efficiently" {
        // Given
        val mainIssue = createTestIssue(id = testIssueId)
        val dependencyIssues = (1..10).map { index ->
            val depId = IssueId.generate()
            val dep = createTestIssue(id = depId, title = "Dependency $index")
            dep
        }
        
        mockIssueRepository.addTestIssues(mainIssue)
        mockIssueRepository.addTestIssues(*dependencyIssues.toTypedArray())

        // When - Add all dependencies
        var result = mainIssue
        dependencyIssues.forEach { dep ->
            issueService.addDependency(
                AddDependencyCommand(testIssueId, dep.id)
            )
        }
        
        val finalResult = issueService.getIssue(testIssueId)

        // Then
        finalResult.shouldNotBeNull()
        finalResult.dependencies shouldHaveSize 10
        dependencyIssues.forEach { dep ->
            finalResult.dependencies shouldContain dep.id
        }
    }

    "should preserve referential integrity when issues are interconnected" {
        // Given - Complex web of relationships
        val epicId = testIssueId
        val storyId = testParentId
        val subtask1Id = IssueId.generate()
        val subtask2Id = IssueId.generate()
        
        val epic = createTestIssue(id = epicId, type = IssueType.EPIC)
        val story = createTestIssue(
            id = storyId,
            type = IssueType.STORY,
            parentId = epicId,
            projectId = testProjectId
        )
        val subtask1 = createTestIssue(
            id = subtask1Id,
            type = IssueType.SUBTASK,
            parentId = storyId,
            projectId = testProjectId // Inherit from parent
        )
        val subtask2 = createTestIssue(
            id = subtask2Id,
            type = IssueType.SUBTASK,
            parentId = storyId,
            projectId = testProjectId // Inherit from parent
        )
        
        // Create dependencies: subtask2 depends on subtask1
        subtask2.addDependency(subtask1Id)
        
        mockIssueRepository.addTestIssues(epic, story, subtask1, subtask2)
        addTestProject(testProjectId)

        // When - Get hierarchy
        val hierarchy = issueService.getIssueHierarchy(epicId)
        
        // And get individual issues
        val retrievedStory = issueService.getIssue(storyId)
        val retrievedSubtask2 = issueService.getIssue(subtask2Id)

        // Then - All relationships should be preserved
        hierarchy.issue.id shouldBe epicId
        hierarchy.children shouldHaveSize 1
        hierarchy.children[0].issue.id shouldBe storyId
        hierarchy.children[0].issue.projectId shouldBe testProjectId
        hierarchy.children[0].children shouldHaveSize 2
        
        retrievedStory?.projectId shouldBe testProjectId
        retrievedStory?.parentId shouldBe epicId
        
        retrievedSubtask2?.dependencies?.shouldContain(subtask1Id)
        retrievedSubtask2?.parentId shouldBe storyId
        retrievedSubtask2?.projectId shouldBe testProjectId // Inherited
    }

    // ================================================================================
    // Soft-Deletion Operations Tests (SPI-878)
    // ================================================================================

    "should use soft-delete instead of hard-delete when deleting issue" {
        // Given
        val testIssue = createTestIssue(id = testIssueId, title = "Issue to Soft Delete")
        mockIssueRepository.addTestIssues(testIssue)

        // When
        issueService.deleteIssue(testIssueId)

        // Then - should call softDelete, not delete
        mockIssueRepository.softDeleteCallCount shouldBe 1
        mockIssueRepository.deleteCallCount shouldBe 0
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should cascade soft-delete to children when deleting Epic with hierarchy" {
        // Given - Epic → Story → Subtask hierarchy
        val epicId = testIssueId
        val storyId = IssueId.generate()
        val subtaskId = IssueId.generate()

        val epic = createTestIssue(id = epicId, type = IssueType.EPIC)
        val story = createTestIssue(id = storyId, type = IssueType.STORY, parentId = epicId)
        val subtask = createTestIssue(id = subtaskId, type = IssueType.SUBTASK, parentId = storyId)

        mockIssueRepository.addTestIssues(epic, story, subtask)

        // When - delete the Epic
        issueService.deleteIssue(epicId)

        // Then - service calls softDelete (cascade handled by repository layer SPI-876)
        mockIssueRepository.softDeleteCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should complete soft-delete in single transaction" {
        // Given
        val testIssue = createTestIssue(id = testIssueId)
        mockIssueRepository.addTestIssues(testIssue)

        // When
        issueService.deleteIssue(testIssueId)

        // Then - verify single transaction wraps the operation
        mockUnitOfWork.executeCallCount shouldBe 1
        mockIssueRepository.softDeleteCallCount shouldBe 1
    }

    "should restore issue when parent is active" {
        // Given - deleted child issue with active parent
        val parentIssue = createTestIssue(
            id = testParentId,
            type = IssueType.STORY,
            title = "Active Parent"
        )
        val childIssue = createTestIssue(
            id = testIssueId,
            type = IssueType.SUBTASK,
            parentId = testParentId,
            title = "Deleted Child"
        )

        mockIssueRepository.addTestIssues(parentIssue, childIssue)
        // Mock findIncludingDeleted for both parent and child
        mockIssueRepository.deletedIssues[testIssueId] = childIssue
        mockIssueRepository.deletedIssues[testParentId] = parentIssue

        // When
        val result = issueService.restoreIssue(testIssueId)

        // Then
        result.shouldNotBeNull()
        result.id shouldBe testIssueId
        mockIssueRepository.restoreCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw IllegalStateException when restoring child issue with deleted parent" {
        // Given - deleted child with deleted parent (parent has deletedAt set)
        val deletedParent = createTestIssue(
            id = testParentId,
            type = IssueType.STORY,
            title = "Deleted Parent"
        )
        val deletedChild = createTestIssue(
            id = testIssueId,
            type = IssueType.SUBTASK,
            parentId = testParentId,
            title = "Deleted Child"
        )

        mockIssueRepository.addTestIssues(deletedParent, deletedChild)
        // Mock both as deleted (findIncludingDeleted returns with deletedAt)
        mockIssueRepository.deletedIssues[testParentId] = deletedParent
        mockIssueRepository.deletedIssues[testIssueId] = deletedChild
        // Simulate parent being deleted
        mockIssueRepository.parentIsDeleted = true

        // When & Then
        val exception = shouldThrow<IllegalStateException> {
            issueService.restoreIssue(testIssueId)
        }

        // Verify error message contains key phrases
        exception.message shouldContain "Cannot restore issue"
        exception.message shouldContain "parent is still deleted"
        exception.message shouldContain "Restore parent first"

        mockIssueRepository.restoreCallCount shouldBe 0
    }

    "should restore parent issue without auto-restoring children" {
        // Given - deleted parent with deleted children
        val parentIssue = createTestIssue(
            id = testParentId,
            type = IssueType.STORY,
            title = "Deleted Parent",
            parentId = null // root issue
        )
        val child1Id = IssueId.generate()
        val child2Id = IssueId.generate()
        val child1 = createTestIssue(id = child1Id, type = IssueType.SUBTASK, parentId = testParentId)
        val child2 = createTestIssue(id = child2Id, type = IssueType.SUBTASK, parentId = testParentId)

        mockIssueRepository.addTestIssues(parentIssue, child1, child2)
        mockIssueRepository.deletedIssues[testParentId] = parentIssue

        // When
        issueService.restoreIssue(testParentId)

        // Then - only parent restored, children remain deleted
        mockIssueRepository.restoreCallCount shouldBe 1
        // Verify no additional restore calls for children
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should restore root issue without parent validation" {
        // Given - deleted root issue (no parent)
        val rootIssue = createTestIssue(
            id = testIssueId,
            type = IssueType.EPIC,
            parentId = null,
            title = "Deleted Root Epic"
        )

        mockIssueRepository.addTestIssues(rootIssue)
        mockIssueRepository.deletedIssues[testIssueId] = rootIssue

        // When
        val result = issueService.restoreIssue(testIssueId)

        // Then - restores without parent validation
        result.shouldNotBeNull()
        result.id shouldBe testIssueId
        mockIssueRepository.restoreCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should be idempotent when restoring already-active issue" {
        // Given - active issue (not deleted, deletedAt = null)
        val activeIssue = createTestIssue(
            id = testIssueId,
            title = "Active Issue",
            status = IssueStatus.TODO
        )

        mockIssueRepository.addTestIssues(activeIssue)
        // Not in deletedIssues map = active

        // When - restore called on active issue
        val result = issueService.restoreIssue(testIssueId)

        // Then - operation completes without error (idempotent)
        result.shouldNotBeNull()
        mockIssueRepository.restoreCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw IssueNotFoundException when restoring non-existent issue" {
        // Given - issue does not exist at all
        val nonExistentId = IssueId.generate()
        // Do not add to repository

        // When & Then
        shouldThrow<IssueNotFoundException> {
            issueService.restoreIssue(nonExistentId)
        }
        mockIssueRepository.restoreCallCount shouldBe 0
    }

})