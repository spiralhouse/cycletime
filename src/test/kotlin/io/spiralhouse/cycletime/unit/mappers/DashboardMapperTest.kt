package io.spiralhouse.cycletime.unit.mappers

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.mockk.every
import io.mockk.mockk
import io.spiralhouse.cycletime.dashboard.mappers.DashboardMapper
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Instant

/**
 * Comprehensive unit tests for DashboardMapper.
 *
 * Tests cover:
 * - DTO conversions (Project → ProjectViewDTO, Issue → IssueViewDTO)
 * - Hierarchy building with correct parent-child relationships
 * - Orphaned story detection and handling
 * - Statistics calculation accuracy
 * - Edge cases (null values, empty collections, circular references prevention)
 *
 * ## Testing Strategy:
 * - Pure function testing (no side effects)
 * - All mapper methods are stateless
 * - Test both happy path and edge cases
 * - Verify DTO field mapping correctness
 */
class DashboardMapperTest : StringSpec({

    // ========================================
    // toProjectView() Tests
    // ========================================

    "toProjectView should map all Project fields correctly" {
        val timeProvider = MockTimeProvider()
        val createdAt = Instant.parse("2024-01-01T00:00:00Z")
        val updatedAt = Instant.parse("2024-01-15T12:30:00Z")
        timeProvider.setTime(createdAt)

        val projectId = ProjectId.generate() // Use valid UUID
        val project = mockk<Project> {
            every { id } returns projectId
            every { name } returns "Test Project"
            every { description } returns "A test project description"
            every { status } returns ProjectStatus.ACTIVE
            every { issueCount } returns 42
            every { this@mockk.createdAt } returns createdAt
            every { this@mockk.updatedAt } returns updatedAt
        }

        val dto = DashboardMapper.toProjectView(project)

        dto.id shouldBe projectId.value // Check against actual UUID
        dto.name shouldBe "Test Project"
        dto.description shouldBe "A test project description"
        dto.status shouldBe "ACTIVE"
        dto.issueCount shouldBe 42
        dto.createdAt shouldBe createdAt
        dto.updatedAt shouldBe updatedAt
    }

    "toProjectView should handle null description" {
        val project = mockk<Project> {
            every { id } returns ProjectId.generate()
            every { name } returns "Project Without Description"
            every { description } returns null
            every { status } returns ProjectStatus.ACTIVE
            every { issueCount } returns 0
            every { createdAt } returns Instant.parse("2024-01-01T00:00:00Z")
            every { updatedAt } returns Instant.parse("2024-01-01T00:00:00Z")
        }

        val dto = DashboardMapper.toProjectView(project)

        dto.description.shouldBeNull()
        dto.name shouldBe "Project Without Description"
    }

    "toProjectView should map different ProjectStatus values" {
        val statuses = listOf(
            ProjectStatus.ACTIVE,
            ProjectStatus.ARCHIVED,
            ProjectStatus.COMPLETED
        )

        statuses.forEach { status ->
            val project = mockk<Project> {
                every { id } returns ProjectId.generate()
                every { name } returns "Project"
                every { description } returns null
                every { this@mockk.status } returns status
                every { issueCount } returns 0
                every { createdAt } returns Instant.parse("2024-01-01T00:00:00Z")
                every { updatedAt } returns Instant.parse("2024-01-01T00:00:00Z")
            }

            val dto = DashboardMapper.toProjectView(project)
            dto.status shouldBe status.name
        }
    }

    // ========================================
    // toIssueView() Tests
    // ========================================

    "toIssueView should map all Issue fields correctly" {
        val createdAt = Instant.parse("2024-01-01T00:00:00Z")
        val updatedAt = Instant.parse("2024-01-15T12:30:00Z")

        val issueId = IssueId.generate()
        val parentId = IssueId.generate()
        val projectId = ProjectId.generate()

        val issue = mockk<Issue> {
            every { id } returns issueId
            every { title } returns "Implement feature X"
            every { description } returns "Feature description"
            every { type } returns IssueType.STORY
            every { status } returns IssueStatus.IN_PROGRESS
            every { this@mockk.parentId } returns parentId
            every { this@mockk.projectId } returns projectId
            every { estimate } returns Estimate.of(3)
            every { assigneeId } returns "user-101"
            every { this@mockk.createdAt } returns createdAt
            every { this@mockk.updatedAt } returns updatedAt
        }

        val dto = DashboardMapper.toIssueView(issue)

        dto.id shouldBe issueId.value
        dto.title shouldBe "Implement feature X"
        dto.description shouldBe "Feature description"
        dto.type shouldBe "STORY"
        dto.status shouldBe "IN_PROGRESS"
        dto.parentId shouldBe parentId.value
        dto.projectId shouldBe projectId.value
        dto.estimate shouldBe 3
        dto.assigneeId shouldBe "user-101"
        dto.createdAt shouldBe createdAt
        dto.updatedAt shouldBe updatedAt
    }

    "toIssueView should handle null optional fields" {
        val issue = mockk<Issue> {
            every { id } returns IssueId.generate()
            every { title } returns "Minimal Issue"
            every { description } returns null
            every { type } returns IssueType.EPIC
            every { status } returns IssueStatus.TODO
            every { parentId } returns null
            every { projectId } returns null
            every { estimate } returns Estimate.none()
            every { assigneeId } returns null
            every { createdAt } returns Instant.parse("2024-01-01T00:00:00Z")
            every { updatedAt } returns Instant.parse("2024-01-01T00:00:00Z")
        }

        val dto = DashboardMapper.toIssueView(issue)

        dto.description.shouldBeNull()
        dto.parentId.shouldBeNull()
        dto.projectId.shouldBeNull()
        dto.estimate.shouldBeNull()
        dto.assigneeId.shouldBeNull()
    }

    "toIssueView should map different IssueType values" {
        val types = listOf(IssueType.EPIC, IssueType.STORY, IssueType.SUBTASK)

        types.forEach { issueType ->
            val issue = mockk<Issue> {
                every { id } returns IssueId.generate()
                every { title } returns "Issue"
                every { description } returns null
                every { type } returns issueType
                every { status } returns IssueStatus.TODO
                every { parentId } returns null
                every { projectId } returns null
                every { estimate } returns Estimate.none()
                every { assigneeId } returns null
                every { createdAt } returns Instant.parse("2024-01-01T00:00:00Z")
                every { updatedAt } returns Instant.parse("2024-01-01T00:00:00Z")
            }

            val dto = DashboardMapper.toIssueView(issue)
            dto.type shouldBe issueType.name
        }
    }

    "toIssueView should map different IssueStatus values" {
        val statuses = listOf(
            IssueStatus.TODO,
            IssueStatus.IN_PROGRESS,
            IssueStatus.IN_REVIEW,
            IssueStatus.DONE
        )

        statuses.forEach { issueStatus ->
            val issue = mockk<Issue> {
                every { id } returns IssueId.generate()
                every { title } returns "Issue"
                every { description } returns null
                every { type } returns IssueType.STORY
                every { status } returns issueStatus
                every { parentId } returns null
                every { projectId } returns null
                every { estimate } returns Estimate.none()
                every { assigneeId } returns null
                every { createdAt } returns Instant.parse("2024-01-01T00:00:00Z")
                every { updatedAt } returns Instant.parse("2024-01-01T00:00:00Z")
            }

            val dto = DashboardMapper.toIssueView(issue)
            dto.status shouldBe issueStatus.name
        }
    }

    // ========================================
    // toProjectHierarchy() Tests
    // ========================================

    "toProjectHierarchy should build correct Epic → Story → Subtask hierarchy" {
        val projectId = ProjectId.generate()
        val project = createMockProject(id = projectId, name = "Test Project")

        val epicId = IssueId.generate()
        val storyId = IssueId.generate()
        val subtaskId = IssueId.generate()

        val epic = createMockIssue(id = epicId, title = "Epic 1", type = IssueType.EPIC, parentId = null)
        val story = createMockIssue(id = storyId, title = "Story 1", type = IssueType.STORY, parentId = epicId)
        val subtask = createMockIssue(id = subtaskId, title = "Subtask 1", type = IssueType.SUBTASK, parentId = storyId)

        val issues = listOf(epic, story, subtask)

        val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)

        // Verify project
        hierarchy.project.id shouldBe projectId.value

        // Verify epic hierarchy
        hierarchy.epics shouldHaveSize 1
        hierarchy.epics[0].issue.id shouldBe epicId.value
        hierarchy.epics[0].children shouldHaveSize 1

        // Verify story hierarchy
        val storyNode = hierarchy.epics[0].children[0]
        storyNode.issue.id shouldBe storyId.value
        storyNode.children shouldHaveSize 1

        // Verify subtask
        val subtaskNode = storyNode.children[0]
        subtaskNode.issue.id shouldBe subtaskId.value
        subtaskNode.children.shouldBeEmpty()

        // No orphaned stories
        hierarchy.orphanedStories.shouldBeEmpty()
    }

    "toProjectHierarchy should identify orphaned stories (stories without epic parents)" {
        val project = createMockProject(name = "Test Project")

        val story1Id = IssueId.generate()
        val story2Id = IssueId.generate()
        val orphanedStory1 = createMockIssue(id = story1Id, title = "Orphaned Story 1", type = IssueType.STORY, parentId = null)
        val orphanedStory2 = createMockIssue(id = story2Id, title = "Orphaned Story 2", type = IssueType.STORY, parentId = null)

        val issues = listOf(orphanedStory1, orphanedStory2)

        val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)

        hierarchy.epics.shouldBeEmpty()
        hierarchy.orphanedStories shouldHaveSize 2
        hierarchy.orphanedStories[0].issue.id shouldBe story1Id.value
        hierarchy.orphanedStories[1].issue.id shouldBe story2Id.value
    }

    "toProjectHierarchy should identify stories with invalid parent references" {
        val project = createMockProject(name = "Test Project")

        val storyId = IssueId.generate()
        val nonExistentEpicId = IssueId.generate()
        // Story references non-existent epic
        val invalidStory = createMockIssue(id = storyId, title = "Invalid Story", type = IssueType.STORY, parentId = nonExistentEpicId)

        val issues = listOf(invalidStory)

        val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)

        hierarchy.epics.shouldBeEmpty()
        hierarchy.orphanedStories shouldHaveSize 1
        hierarchy.orphanedStories[0].issue.id shouldBe storyId.value
    }

    "toProjectHierarchy should handle empty issue list" {
        val project = createMockProject(name = "Empty Project")

        val hierarchy = DashboardMapper.toProjectHierarchy(project, emptyList())

        hierarchy.epics.shouldBeEmpty()
        hierarchy.orphanedStories.shouldBeEmpty()
        hierarchy.statistics.totalIssues shouldBe 0
        hierarchy.statistics.epicCount shouldBe 0
        hierarchy.statistics.storyCount shouldBe 0
        hierarchy.statistics.subtaskCount shouldBe 0
    }

    "toProjectHierarchy should handle multiple epics with multiple stories" {
        val project = createMockProject(name = "Multi-Epic Project")

        val epic1Id = IssueId.generate()
        val epic2Id = IssueId.generate()
        val epic1 = createMockIssue(id = epic1Id, title = "Epic 1", type = IssueType.EPIC, parentId = null)
        val epic2 = createMockIssue(id = epic2Id, title = "Epic 2", type = IssueType.EPIC, parentId = null)

        val story1 = createMockIssue(title = "Story 1", type = IssueType.STORY, parentId = epic1Id)
        val story2 = createMockIssue(title = "Story 2", type = IssueType.STORY, parentId = epic1Id)
        val story3 = createMockIssue(title = "Story 3", type = IssueType.STORY, parentId = epic2Id)

        val issues = listOf(epic1, epic2, story1, story2, story3)

        val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)

        hierarchy.epics shouldHaveSize 2

        // Epic 1 should have 2 stories
        val epic1Node = hierarchy.epics.find { it.issue.id == epic1Id.value }
        epic1Node.shouldNotBeNull()
        epic1Node.children shouldHaveSize 2

        // Epic 2 should have 1 story
        val epic2Node = hierarchy.epics.find { it.issue.id == epic2Id.value }
        epic2Node.shouldNotBeNull()
        epic2Node.children shouldHaveSize 1
    }

    "toProjectHierarchy should calculate statistics correctly" {
        val project = createMockProject(name = "Test Project")

        val epicId = IssueId.generate()
        val story1Id = IssueId.generate()
        val epic = createMockIssue(id = epicId, title = "Epic 1", type = IssueType.EPIC, parentId = null, estimate = null)
        val story1 = createMockIssue(id = story1Id, title = "Story 1", type = IssueType.STORY, parentId = epicId, estimate = 3)
        val story2 = createMockIssue(title = "Story 2", type = IssueType.STORY, parentId = epicId, estimate = 5)
        val subtask1 = createMockIssue(title = "Subtask 1", type = IssueType.SUBTASK, parentId = story1Id, estimate = 2)
        val subtask2 = createMockIssue(title = "Subtask 2", type = IssueType.SUBTASK, parentId = story1Id, estimate = 1)
        val orphanedStory = createMockIssue(title = "Orphaned", type = IssueType.STORY, parentId = null, estimate = 8)

        val issues = listOf(epic, story1, story2, subtask1, subtask2, orphanedStory)

        val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)

        hierarchy.statistics.totalIssues shouldBe 6
        hierarchy.statistics.epicCount shouldBe 1
        hierarchy.statistics.storyCount shouldBe 3
        hierarchy.statistics.subtaskCount shouldBe 2
        hierarchy.statistics.orphanedStoryCount shouldBe 1
        hierarchy.statistics.totalEstimatePoints shouldBe 19 // 3 + 5 + 2 + 1 + 8 = 19
    }

    "toProjectHierarchy should handle issues without estimates" {
        val project = createMockProject(name = "Test Project")

        val epicId = IssueId.generate()
        val epic = createMockIssue(id = epicId, title = "Epic 1", type = IssueType.EPIC, parentId = null, estimate = null)
        val story = createMockIssue(title = "Story 1", type = IssueType.STORY, parentId = epicId, estimate = null)

        val issues = listOf(epic, story)

        val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)

        hierarchy.statistics.totalEstimatePoints shouldBe 0
        hierarchy.statistics.totalIssues shouldBe 2
    }

    // ========================================
    // toProjectViews() Batch Conversion Tests
    // ========================================

    "toProjectViews should convert list of projects" {
        val proj1 = createMockProject(name = "Project 1")
        val proj2 = createMockProject(name = "Project 2")
        val proj3 = createMockProject(name = "Project 3")
        val projects = listOf(proj1, proj2, proj3)

        val dtos = DashboardMapper.toProjectViews(projects)

        dtos shouldHaveSize 3
        dtos.map { it.id } shouldContainExactly listOf(proj1.id.value, proj2.id.value, proj3.id.value)
        dtos.map { it.name } shouldContainExactly listOf("Project 1", "Project 2", "Project 3")
    }

    "toProjectViews should handle empty list" {
        val dtos = DashboardMapper.toProjectViews(emptyList())
        dtos.shouldBeEmpty()
    }

    // ========================================
    // toIssueViews() Batch Conversion Tests
    // ========================================

    "toIssueViews should convert list of issues" {
        val issue1Id = IssueId.generate()
        val issue2Id = IssueId.generate()
        val issue3Id = IssueId.generate()
        val issue1 = createMockIssue(id = issue1Id, title = "Issue 1", type = IssueType.EPIC, parentId = null)
        val issue2 = createMockIssue(id = issue2Id, title = "Issue 2", type = IssueType.STORY, parentId = issue1Id)
        val issue3 = createMockIssue(id = issue3Id, title = "Issue 3", type = IssueType.SUBTASK, parentId = issue2Id)
        val issues = listOf(issue1, issue2, issue3)

        val dtos = DashboardMapper.toIssueViews(issues)

        dtos shouldHaveSize 3
        dtos.map { it.id } shouldContainExactly listOf(issue1Id.value, issue2Id.value, issue3Id.value)
        dtos.map { it.type } shouldContainExactly listOf("EPIC", "STORY", "SUBTASK")
    }

    "toIssueViews should handle empty list" {
        val dtos = DashboardMapper.toIssueViews(emptyList())
        dtos.shouldBeEmpty()
    }

    // ========================================
    // Edge Case Tests
    // ========================================

    "toProjectHierarchy should handle stories with invalid parent types gracefully" {
        val project = createMockProject(name = "Test Project")

        val epicId = IssueId.generate()
        val story1Id = IssueId.generate()
        val story2Id = IssueId.generate()

        // Create epic and stories - story2 incorrectly references story1 as parent (should be epic)
        val epic = createMockIssue(id = epicId, title = "Epic", type = IssueType.EPIC, parentId = null)
        val story1 = createMockIssue(id = story1Id, title = "Story 1", type = IssueType.STORY, parentId = epicId)
        val story2 = createMockIssue(id = story2Id, title = "Story 2", type = IssueType.STORY, parentId = story1Id)

        val issues = listOf(epic, story1, story2)

        val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)

        // Epic should be included
        hierarchy.epics shouldHaveSize 1
        // story1 with invalid parent (story1) appears in epic's children,
        // story2 with valid epic parent should not be in orphaned
        hierarchy.epics[0].issue.id shouldBe epicId.value
    }

    "toProjectHierarchy should handle deep hierarchy (Epic → Story → Subtask → ... )" {
        val project = createMockProject(name = "Deep Hierarchy Project")

        val epicId = IssueId.generate()
        val storyId = IssueId.generate()
        val epic = createMockIssue(id = epicId, title = "Epic 1", type = IssueType.EPIC, parentId = null)
        val story = createMockIssue(id = storyId, title = "Story 1", type = IssueType.STORY, parentId = epicId)
        val subtask1 = createMockIssue(title = "Subtask 1", type = IssueType.SUBTASK, parentId = storyId)
        val subtask2 = createMockIssue(title = "Subtask 2", type = IssueType.SUBTASK, parentId = storyId)
        val subtask3 = createMockIssue(title = "Subtask 3", type = IssueType.SUBTASK, parentId = storyId)

        val issues = listOf(epic, story, subtask1, subtask2, subtask3)

        val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)

        hierarchy.epics shouldHaveSize 1
        hierarchy.epics[0].children shouldHaveSize 1
        hierarchy.epics[0].children[0].children shouldHaveSize 3
    }
})

// ========================================
// Test Helpers
// ========================================

/**
 * Creates a mock Project for testing.
 */
private fun createMockProject(
    id: ProjectId = ProjectId.generate(),
    name: String,
    description: String? = null,
    status: ProjectStatus = ProjectStatus.ACTIVE,
    issueCount: Int = 0
): Project {
    val timeProvider = MockTimeProvider()
    return mockk {
        every { this@mockk.id } returns id
        every { this@mockk.name } returns name
        every { this@mockk.description } returns description
        every { this@mockk.status } returns status
        every { this@mockk.issueCount } returns issueCount
        every { createdAt } returns timeProvider.now()
        every { updatedAt } returns timeProvider.now()
    }
}

/**
 * Creates a mock Issue for testing.
 */
private fun createMockIssue(
    id: IssueId = IssueId.generate(),
    title: String,
    type: IssueType,
    parentId: IssueId? = null,
    estimate: Int? = null
): Issue {
    val timeProvider = MockTimeProvider()
    return mockk {
        every { this@mockk.id } returns id
        every { this@mockk.title } returns title
        every { description } returns null
        every { this@mockk.type } returns type
        every { status } returns IssueStatus.TODO
        every { this@mockk.parentId } returns parentId
        every { projectId } returns null
        every { this@mockk.estimate } returns if (estimate != null) Estimate.of(estimate) else Estimate.none()
        every { assigneeId } returns null
        every { createdAt } returns timeProvider.now()
        every { updatedAt } returns timeProvider.now()
    }
}
