package io.spiralhouse.cycletime.unit.application

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.*
import io.spiralhouse.cycletime.application.services.DashboardApplicationService
import io.spiralhouse.cycletime.application.services.DashboardCache
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.minutes

/**
 * Comprehensive unit tests for DashboardApplicationService.
 *
 * Tests cover:
 * - Business logic correctness
 * - Caching behavior (hits, misses, TTL expiration)
 * - Repository interaction patterns (verify no N+1 queries)
 * - Error handling and edge cases
 * - Cache invalidation strategies
 *
 * ## Testing Strategy:
 * - Mock all repository dependencies
 * - Use real DashboardCache with MockTimeProvider for deterministic time control
 * - Verify repository method call counts to ensure efficient data loading
 * - Test both happy path and error scenarios
 */
class DashboardApplicationServiceTest : StringSpec({

    // ========================================
    // listProjects() Tests
    // ========================================

    "listProjects should return all projects from repository" {
        val (service, projectRepo, _, unitOfWork, _) = createTestContext()

        val proj1 = createMockProject(name = "Project 1")
        val proj2 = createMockProject(name = "Project 2")
        val proj3 = createMockProject(name = "Project 3")
        val mockProjects = listOf(proj1, proj2, proj3)

        coEvery { unitOfWork.execute<List<Project>>(any()) } coAnswers {
            val block = firstArg<suspend () -> List<Project>>()
            block()
        }
        coEvery { projectRepo.findAll() } returns mockProjects

        val result = service.listProjects()

        result shouldHaveSize 3
        result[0].id shouldBe proj1.id.value
        result[0].name shouldBe "Project 1"
        result[1].id shouldBe proj2.id.value
        result[2].id shouldBe proj3.id.value

        // Verify repository called exactly once
        coVerify(exactly = 1) { projectRepo.findAll() }
    }

    "listProjects should use cached results on second call" {
        val (service, projectRepo, _, unitOfWork, _) = createTestContext()

        val mockProjects = listOf(createMockProject(name = "Project 1"))

        coEvery { unitOfWork.execute<List<Project>>(any()) } coAnswers {
            val block = firstArg<suspend () -> List<Project>>()
            block()
        }
        coEvery { projectRepo.findAll() } returns mockProjects

        // First call - should query repository
        val result1 = service.listProjects()
        result1 shouldHaveSize 1

        // Second call - should use cache
        val result2 = service.listProjects()
        result2 shouldHaveSize 1

        // Repository should only be called once (first call)
        coVerify(exactly = 1) { projectRepo.findAll() }
    }

    "listProjects should refresh cache after TTL expiration" {
        val (service, projectRepo, _, unitOfWork, timeProvider) = createTestContext()

        val initialProjects = listOf(createMockProject(name = "Project 1"))
        val updatedProjects = listOf(
            createMockProject(name = "Project 1"),
            createMockProject(name = "Project 2")
        )

        coEvery { unitOfWork.execute<List<Project>>(any()) } coAnswers {
            val block = firstArg<suspend () -> List<Project>>()
            block()
        }
        coEvery { projectRepo.findAll() } returnsMany listOf(initialProjects, updatedProjects)

        // First call
        val result1 = service.listProjects()
        result1 shouldHaveSize 1

        // Advance time beyond TTL (5 minutes)
        timeProvider.advance(6.minutes)

        // Second call - should refresh from repository
        val result2 = service.listProjects()
        result2 shouldHaveSize 2

        // Repository should be called twice (initial + after TTL)
        coVerify(exactly = 2) { projectRepo.findAll() }
    }

    "listProjects should return empty list when no projects exist" {
        val (service, projectRepo, _, unitOfWork, _) = createTestContext()

        coEvery { unitOfWork.execute<List<Project>>(any()) } coAnswers {
            val block = firstArg<suspend () -> List<Project>>()
            block()
        }
        coEvery { projectRepo.findAll() } returns emptyList()

        val result = service.listProjects()

        result.shouldBeEmpty()
        coVerify(exactly = 1) { projectRepo.findAll() }
    }

    // ========================================
    // getProjectHierarchy() Tests
    // ========================================

    "getProjectHierarchy should build correct hierarchy with epics and stories" {
        val (service, projectRepo, issueRepo, unitOfWork, _) = createTestContext()

        val projectId = ProjectId.generate()
        val project = createMockProject(id = projectId, name = "Test Project")

        val epicId = IssueId.generate()
        val storyId = IssueId.generate()

        val epic = createMockIssue(id = epicId, title = "Epic 1", type = IssueType.EPIC, parentId = null)
        val story = createMockIssue(id = storyId, title = "Story 1", type = IssueType.STORY, parentId = epicId)

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { projectRepo.findById(projectId) } returns project
        coEvery { issueRepo.findByProject(projectId) } returns listOf(epic, story)

        val result = service.getProjectHierarchy(projectId)

        result shouldNotBe null
        result.project.id shouldBe projectId.value
        result.epics shouldHaveSize 1
        result.epics[0].issue.id shouldBe epicId.value
        result.epics[0].children shouldHaveSize 1
        result.epics[0].children[0].issue.id shouldBe storyId.value
        result.orphanedStories.shouldBeEmpty()

        // Verify single query for all issues (no N+1)
        coVerify(exactly = 1) { issueRepo.findByProject(projectId) }
    }

    "getProjectHierarchy should identify orphaned stories" {
        val (service, projectRepo, issueRepo, unitOfWork, _) = createTestContext()

        val projectId = ProjectId.generate()
        val project = createMockProject(id = projectId, name = "Test Project")

        val storyId = IssueId.generate()
        val orphanedStory = createMockIssue(id = storyId, title = "Orphaned Story", type = IssueType.STORY, parentId = null)

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { projectRepo.findById(projectId) } returns project
        coEvery { issueRepo.findByProject(projectId) } returns listOf(orphanedStory)

        val result = service.getProjectHierarchy(projectId)

        result.epics.shouldBeEmpty()
        result.orphanedStories shouldHaveSize 1
        result.orphanedStories[0].issue.id shouldBe storyId.value
    }

    "getProjectHierarchy should throw exception for non-existent project" {
        val (service, projectRepo, _, unitOfWork, _) = createTestContext()

        val projectId = ProjectId.generate()

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { projectRepo.findById(projectId) } returns null

        val exception = shouldThrow<IllegalArgumentException> {
            service.getProjectHierarchy(projectId)
        }

        exception.message shouldBe "Project not found: ${projectId.value}"
    }

    "getProjectHierarchy should cache results" {
        val (service, projectRepo, issueRepo, unitOfWork, _) = createTestContext()

        val projectId = ProjectId.generate()
        val project = createMockProject(id = projectId, name = "Test Project")

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { projectRepo.findById(projectId) } returns project
        coEvery { issueRepo.findByProject(projectId) } returns emptyList()

        // First call
        service.getProjectHierarchy(projectId)

        // Second call - should use cache
        service.getProjectHierarchy(projectId)

        // Repository should only be called once
        coVerify(exactly = 1) { projectRepo.findById(projectId) }
        coVerify(exactly = 1) { issueRepo.findByProject(projectId) }
    }

    "getProjectHierarchy should calculate statistics correctly" {
        val (service, projectRepo, issueRepo, unitOfWork, _) = createTestContext()

        val projectId = ProjectId.generate()
        val project = createMockProject(id = projectId, name = "Test Project")

        val epicId = IssueId.generate()
        val story1Id = IssueId.generate()
        val story2Id = IssueId.generate()

        val epic = createMockIssue(id = epicId, title = "Epic 1", type = IssueType.EPIC, parentId = null)
        val story1 = createMockIssue(id = story1Id, title = "Story 1", type = IssueType.STORY, parentId = epicId, estimate = 3)
        val story2 = createMockIssue(id = story2Id, title = "Story 2", type = IssueType.STORY, parentId = epicId, estimate = 5)
        val subtask = createMockIssue(title = "Subtask 1", type = IssueType.SUBTASK, parentId = story1Id, estimate = 2)

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { projectRepo.findById(projectId) } returns project
        coEvery { issueRepo.findByProject(projectId) } returns listOf(epic, story1, story2, subtask)

        val result = service.getProjectHierarchy(projectId)

        result.statistics.totalIssues shouldBe 4
        result.statistics.epicCount shouldBe 1
        result.statistics.storyCount shouldBe 2
        result.statistics.subtaskCount shouldBe 1
        result.statistics.totalEstimatePoints shouldBe 10 // 3 + 5 + 2
        result.statistics.orphanedStoryCount shouldBe 0
    }

    // ========================================
    // getStorySubtasks() Tests
    // ========================================

    "getStorySubtasks should return all subtasks for a story" {
        val (service, _, issueRepo, unitOfWork, _) = createTestContext()

        val storyId = IssueId.generate()
        val story = createMockIssue(id = storyId, title = "Story 1", type = IssueType.STORY, parentId = null)

        val subtask1Id = IssueId.generate()
        val subtask2Id = IssueId.generate()
        val subtask1 = createMockIssue(id = subtask1Id, title = "Subtask 1", type = IssueType.SUBTASK, parentId = storyId)
        val subtask2 = createMockIssue(id = subtask2Id, title = "Subtask 2", type = IssueType.SUBTASK, parentId = storyId)

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { issueRepo.findById(storyId) } returns story
        coEvery { issueRepo.findByParent(storyId) } returns listOf(subtask1, subtask2)

        val result = service.getStorySubtasks(storyId)

        result shouldHaveSize 2
        result[0].id shouldBe subtask1Id.value
        result[1].id shouldBe subtask2Id.value

        coVerify(exactly = 1) { issueRepo.findByParent(storyId) }
    }

    "getStorySubtasks should return empty list for story with no subtasks" {
        val (service, _, issueRepo, unitOfWork, _) = createTestContext()

        val storyId = IssueId.generate()
        val story = createMockIssue(id = storyId, title = "Story 1", type = IssueType.STORY, parentId = null)

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { issueRepo.findById(storyId) } returns story
        coEvery { issueRepo.findByParent(storyId) } returns emptyList()

        val result = service.getStorySubtasks(storyId)

        result.shouldBeEmpty()
    }

    "getStorySubtasks should throw exception for non-existent story" {
        val (service, _, issueRepo, unitOfWork, _) = createTestContext()

        val storyId = IssueId.generate()

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { issueRepo.findById(storyId) } returns null

        val exception = shouldThrow<IllegalArgumentException> {
            service.getStorySubtasks(storyId)
        }

        exception.message shouldBe "Story not found: ${storyId.value}"
    }

    "getStorySubtasks should cache results" {
        val (service, _, issueRepo, unitOfWork, _) = createTestContext()

        val storyId = IssueId.generate()
        val story = createMockIssue(id = storyId, title = "Story 1", type = IssueType.STORY, parentId = null)

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { issueRepo.findById(storyId) } returns story
        coEvery { issueRepo.findByParent(storyId) } returns emptyList()

        // First call
        service.getStorySubtasks(storyId)

        // Second call - should use cache
        service.getStorySubtasks(storyId)

        // Repository should only be called once
        coVerify(exactly = 1) { issueRepo.findById(storyId) }
        coVerify(exactly = 1) { issueRepo.findByParent(storyId) }
    }

    "getStorySubtasks should expire cache after TTL (3 minutes)" {
        val (service, _, issueRepo, unitOfWork, timeProvider) = createTestContext()

        val storyId = IssueId.generate()
        val story = createMockIssue(id = storyId, title = "Story 1", type = IssueType.STORY, parentId = null)

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { issueRepo.findById(storyId) } returns story
        coEvery { issueRepo.findByParent(storyId) } returns emptyList()

        // First call
        service.getStorySubtasks(storyId)

        // Advance time beyond TTL (3 minutes)
        timeProvider.advance(4.minutes)

        // Second call - should refresh
        service.getStorySubtasks(storyId)

        // Repository should be called twice
        coVerify(exactly = 2) { issueRepo.findById(storyId) }
        coVerify(exactly = 2) { issueRepo.findByParent(storyId) }
    }

    // ========================================
    // getServiceHealth() Tests
    // ========================================

    "getServiceHealth should return current health status" {
        val (service, _, _, _, timeProvider) = createTestContext()

        val now = Instant.parse("2024-01-01T12:00:00Z")
        timeProvider.setTime(now)

        val result = service.getServiceHealth()

        result.status shouldBe "healthy"
        result.timestamp shouldBe now
        result.dependencies["database"] shouldBe "connected"
        result.dependencies["cache"] shouldBe "active"
        result.metrics["cacheSize"] shouldNotBe null
    }

    "getServiceHealth should cache results for 1 minute" {
        val (service, _, _, _, timeProvider) = createTestContext()

        val now = Instant.parse("2024-01-01T12:00:00Z")
        timeProvider.setTime(now)

        // First call
        val result1 = service.getServiceHealth()
        val timestamp1 = result1.timestamp

        // Advance time by 30 seconds (within TTL)
        timeProvider.advance(30.minutes / 60) // 30 seconds

        // Second call - should use cache with old timestamp
        val result2 = service.getServiceHealth()
        result2.timestamp shouldBe timestamp1

        // Advance time beyond TTL
        timeProvider.advance(31.minutes / 60) // Additional 31 seconds

        // Third call - should refresh with new timestamp
        val result3 = service.getServiceHealth()
        result3.timestamp shouldNotBe timestamp1
    }

    // ========================================
    // Cache Invalidation Tests
    // ========================================

    "invalidateProject should clear project-related caches" {
        val (service, projectRepo, issueRepo, unitOfWork, _) = createTestContext()

        val projectId = ProjectId.generate()
        val project = createMockProject(id = projectId, name = "Test Project")

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { projectRepo.findAll() } returns listOf(project)
        coEvery { projectRepo.findById(projectId) } returns project
        coEvery { issueRepo.findByProject(projectId) } returns emptyList()

        // Cache project list and hierarchy
        service.listProjects()
        service.getProjectHierarchy(projectId)

        // Invalidate project cache
        service.invalidateProject(projectId)

        // Next calls should query repository again
        service.listProjects()
        service.getProjectHierarchy(projectId)

        // Verify repositories called twice (initial + after invalidation)
        coVerify(exactly = 2) { projectRepo.findAll() }
        coVerify(exactly = 2) { projectRepo.findById(projectId) }
    }

    "invalidateStorySubtasks should clear story subtask cache" {
        val (service, _, issueRepo, unitOfWork, _) = createTestContext()

        val storyId = IssueId.generate()
        val story = createMockIssue(id = storyId, title = "Story 1", type = IssueType.STORY, parentId = null)

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { issueRepo.findById(storyId) } returns story
        coEvery { issueRepo.findByParent(storyId) } returns emptyList()

        // Cache subtasks
        service.getStorySubtasks(storyId)

        // Invalidate cache
        service.invalidateStorySubtasks(storyId)

        // Next call should query repository again
        service.getStorySubtasks(storyId)

        // Verify repository called twice
        coVerify(exactly = 2) { issueRepo.findById(storyId) }
        coVerify(exactly = 2) { issueRepo.findByParent(storyId) }
    }

    "clearAllCaches should reset all cache entries" {
        val (service, projectRepo, _, unitOfWork, _) = createTestContext()

        val project = createMockProject(name = "Project 1")

        coEvery { unitOfWork.execute<Any>(any()) } coAnswers {
            val block = firstArg<suspend () -> Any>()
            block()
        }
        coEvery { projectRepo.findAll() } returns listOf(project)

        // Cache data
        service.listProjects()

        // Clear all caches
        service.clearAllCaches()

        // Next call should query repository again
        service.listProjects()

        // Verify repository called twice
        coVerify(exactly = 2) { projectRepo.findAll() }
    }
})

// ========================================
// Test Helpers
// ========================================

/**
 * Test context containing service and mocked dependencies.
 */
private data class TestContext(
    val service: DashboardApplicationService,
    val projectRepo: ProjectRepository,
    val issueRepo: IssueRepository,
    val unitOfWork: UnitOfWork,
    val timeProvider: MockTimeProvider
)

/**
 * Creates a test context with mocked dependencies.
 */
private fun createTestContext(): TestContext {
    val projectRepo = mockk<ProjectRepository>()
    val issueRepo = mockk<IssueRepository>()
    val unitOfWork = mockk<UnitOfWork>()
    val timeProvider = MockTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
    val dashboardCache = DashboardCache(
        maxSize = 100,
        defaultTTL = 5.minutes,
        timeProvider = timeProvider
    )

    val service = DashboardApplicationService(
        projectRepository = projectRepo,
        issueRepository = issueRepo,
        unitOfWork = unitOfWork,
        dashboardCache = dashboardCache,
        timeProvider = timeProvider
    )

    return TestContext(service, projectRepo, issueRepo, unitOfWork, timeProvider)
}

/**
 * Creates a mock Project entity for testing.
 */
private fun createMockProject(
    id: ProjectId = ProjectId.generate(),
    name: String,
    description: String? = null,
    status: ProjectStatus = ProjectStatus.ACTIVE,
    issueCount: Int = 0
): Project {
    val timeProvider = MockTimeProvider()
    val project = mockk<Project>()

    every { project.id } returns id
    every { project.name } returns name
    every { project.description } returns description
    every { project.status } returns status
    every { project.issueCount } returns issueCount
    every { project.createdAt } returns timeProvider.now()
    every { project.updatedAt } returns timeProvider.now()

    return project
}

/**
 * Creates a mock Issue entity for testing.
 */
private fun createMockIssue(
    id: IssueId = IssueId.generate(),
    title: String,
    type: IssueType,
    parentId: IssueId? = null,
    estimate: Int? = null
): Issue {
    val timeProvider = MockTimeProvider()
    val issue = mockk<Issue>()

    every { issue.id } returns id
    every { issue.title } returns title
    every { issue.description } returns null
    every { issue.type } returns type
    every { issue.status } returns IssueStatus.TODO
    every { issue.parentId } returns parentId
    every { issue.projectId } returns null
    every { issue.estimate } returns if (estimate != null) Estimate.of(estimate) else Estimate.none()
    every { issue.assigneeId } returns null
    every { issue.createdAt } returns timeProvider.now()
    every { issue.updatedAt } returns timeProvider.now()

    return issue
}
