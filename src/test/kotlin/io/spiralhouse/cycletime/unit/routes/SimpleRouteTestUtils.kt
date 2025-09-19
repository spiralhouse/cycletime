package io.spiralhouse.cycletime.unit.routes

import io.mockk.*
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Instant

/**
 * Simplified test utilities for route unit testing.
 *
 * Provides basic mock creation and test data factories without complex
 * configuration options that cause type inference issues.
 */
object SimpleRouteTestUtils {

    /**
     * Creates a MockTimeProvider with a fixed test time.
     */
    fun createMockTimeProvider(timeString: String = "2024-01-01T00:00:00Z"): MockTimeProvider =
        MockTimeProvider().apply { setTime(Instant.parse(timeString)) }

    /**
     * Creates a basic mock ProjectApplicationService.
     * Configure it manually in tests using coEvery.
     */
    fun createBasicMockProjectService(): ProjectApplicationService = mockk<ProjectApplicationService>()

    /**
     * Creates a test ProjectDto with reasonable defaults.
     */
    fun createTestProject(
        id: ProjectId = ProjectId.generate(),
        name: String = "Test Project",
        description: String? = "Test description",
        status: ProjectStatus = ProjectStatus.ACTIVE
    ): ProjectDto {
        val timeProvider = createMockTimeProvider()
        return ProjectDto(
            id = id,
            name = name,
            description = description,
            status = status,
            issues = emptyList(),
            issueCount = 0,
            createdAt = timeProvider.now(),
            updatedAt = timeProvider.now()
        )
    }

    /**
     * Creates a list of test projects.
     */
    fun createTestProjects(count: Int): List<ProjectDto> =
        (1..count).map { index ->
            createTestProject(
                name = "Test Project $index",
                description = "Description for project $index"
            )
        }

    /**
     * Creates a ProjectListDto from a list of projects.
     */
    fun createProjectListDto(projects: List<ProjectDto>): ProjectListDto =
        ProjectListDto(projects = projects, totalCount = projects.size)

    /**
     * Creates a test IssueDto with reasonable defaults.
     */
    fun createTestIssue(
        id: IssueId = IssueId.generate(),
        title: String = "Test Issue",
        description: String? = "Test description",
        type: IssueType = IssueType.STORY,
        status: IssueStatus = IssueStatus.TODO,
        parentId: IssueId? = null,
        projectId: ProjectId? = null,
        estimate: Estimate = Estimate.of(3),
        assigneeId: String? = null
    ): IssueDto {
        val timeProvider = createMockTimeProvider()
        return IssueDto(
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
            createdAt = timeProvider.now(),
            updatedAt = timeProvider.now()
        )
    }

    /**
     * Creates a list of test issues.
     */
    fun createTestIssues(count: Int, projectId: ProjectId? = null): List<IssueDto> =
        (1..count).map { index ->
            createTestIssue(
                title = "Test Issue $index",
                description = "Description for issue $index",
                projectId = projectId
            )
        }

    /**
     * Creates an IssueListDto from a list of issues.
     */
    fun createIssueListDto(issues: List<IssueDto>): IssueListDto =
        IssueListDto(issues = issues, totalCount = issues.size)

    /**
     * Creates an IssueHierarchyExtendedDto for testing hierarchy responses.
     */
    fun createTestIssueHierarchy(
        issue: IssueDto,
        parent: IssueDto? = null,
        children: List<IssueDto> = emptyList(),
        totalDescendants: Int = children.size
    ): IssueHierarchyExtendedDto =
        IssueHierarchyExtendedDto(
            issue = issue,
            parent = parent,
            children = children,
            totalDescendants = totalDescendants
        )
}