package io.spiralhouse.cycletime.dashboard.mappers

import io.spiralhouse.cycletime.dashboard.dto.*
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.valueobjects.IssueType

/**
 * Mapper object for converting domain entities to dashboard DTOs.
 *
 * This mapper provides centralized conversion logic following these principles:
 * - **Stateless**: Pure functions with no side effects
 * - **Domain Protection**: Never exposes internal domain entity mutability
 * - **Type Safety**: Leverages Kotlin type system for compile-time safety
 * - **Efficiency**: Optimized for batch conversions and minimal allocations
 *
 * ## Usage Patterns:
 * ```kotlin
 * val projectDTO = DashboardMapper.toProjectView(project)
 * val issueDTO = DashboardMapper.toIssueView(issue)
 * val hierarchy = DashboardMapper.toProjectHierarchy(project, issues)
 * ```
 *
 * ## Thread Safety:
 * All methods are thread-safe as they are stateless transformations.
 */
object DashboardMapper {

    /**
     * Converts a Project domain entity to ProjectViewDTO.
     *
     * Maps essential project attributes optimized for dashboard display,
     * excluding full aggregate details for efficiency.
     *
     * @param project The domain entity to convert
     * @return Lightweight DTO suitable for dashboard rendering
     */
    fun toProjectView(project: Project): ProjectViewDTO {
        return ProjectViewDTO(
            id = project.id.value,
            name = project.name,
            description = project.description,
            status = project.status.name,
            issueCount = project.issueCount,
            createdAt = project.createdAt,
            updatedAt = project.updatedAt
        )
    }

    /**
     * Converts an Issue domain entity to IssueViewDTO.
     *
     * Maps core issue attributes without deep relationship traversal,
     * enabling efficient batch loading patterns.
     *
     * @param issue The domain entity to convert
     * @return Lightweight DTO suitable for dashboard rendering
     */
    fun toIssueView(issue: Issue): IssueViewDTO {
        return IssueViewDTO(
            id = issue.id.value,
            title = issue.title,
            description = issue.description,
            type = issue.type.name,
            status = issue.status.name,
            parentId = issue.parentId?.value,
            projectId = issue.projectId?.value,
            estimate = if (issue.estimate.hasValue()) issue.estimate.value else null,
            assigneeId = issue.assigneeId,
            createdAt = issue.createdAt,
            updatedAt = issue.updatedAt
        )
    }

    /**
     * Builds project hierarchy from project and its issues.
     *
     * Organizes issues into a hierarchical tree structure:
     * - Epics at the top level with their stories and subtasks
     * - Orphaned stories (stories without epic parents) separately listed
     *
     * This method handles the full hierarchy construction avoiding N+1 queries
     * by working with a pre-loaded issue list.
     *
     * @param project The project domain entity
     * @param issues Complete list of issues for this project (pre-loaded)
     * @return Hierarchical view with statistics
     */
    fun toProjectHierarchy(project: Project, issues: List<Issue>): ProjectHierarchyDTO {
        // Convert all issues to DTOs for efficient lookup
        val issueViews = issues.map { toIssueView(it) }
        val issueMap = issueViews.associateBy { it.id }

        // Separate issues by type
        val epics = issueViews.filter { it.type == IssueType.EPIC.name }
        val stories = issueViews.filter { it.type == IssueType.STORY.name }
        val subtasks = issueViews.filter { it.type == IssueType.SUBTASK.name }

        // Build epic hierarchy (epics → stories → subtasks)
        val epicNodes = epics.map { epic ->
            buildIssueHierarchy(epic, issueViews)
        }

        // Find orphaned stories (stories without epic parents or invalid parent references)
        val orphanedStories = stories.filter { story ->
            story.parentId == null || !issueMap.containsKey(story.parentId)
        }.map { story ->
            buildIssueHierarchy(story, issueViews)
        }

        // Calculate statistics
        val statistics = calculateStatistics(issues, orphanedStories.size)

        return ProjectHierarchyDTO(
            project = toProjectView(project),
            epics = epicNodes,
            orphanedStories = orphanedStories,
            statistics = statistics
        )
    }

    /**
     * Recursively builds issue hierarchy node with children.
     *
     * Constructs a tree structure by finding all direct children of the given issue
     * and recursively building their hierarchies.
     *
     * @param issue Root issue for this hierarchy subtree
     * @param allIssues Complete issue list for child lookup
     * @return Hierarchy node with nested children
     */
    private fun buildIssueHierarchy(
        issue: IssueViewDTO,
        allIssues: List<IssueViewDTO>
    ): IssueHierarchyNode {
        // Find direct children of this issue
        val children = allIssues.filter { it.parentId == issue.id }

        // Recursively build hierarchy for each child
        val childNodes = children.map { child ->
            buildIssueHierarchy(child, allIssues)
        }

        return IssueHierarchyNode(
            issue = issue,
            children = childNodes
        )
    }

    /**
     * Calculates project statistics from issue list.
     *
     * Computes aggregate metrics for dashboard KPIs:
     * - Issue counts by type
     * - Total estimate points (sum of all valid estimates)
     * - Orphaned story count
     *
     * @param issues Complete issue list
     * @param orphanedStoryCount Count of stories without epic parents
     * @return Statistical summary
     */
    private fun calculateStatistics(
        issues: List<Issue>,
        orphanedStoryCount: Int
    ): ProjectStatistics {
        val epicCount = issues.count { it.type == IssueType.EPIC }
        val storyCount = issues.count { it.type == IssueType.STORY }
        val subtaskCount = issues.count { it.type == IssueType.SUBTASK }

        val totalEstimatePoints = issues
            .filter { it.estimate.hasValue() }
            .sumOf { it.estimate.value!! }

        return ProjectStatistics(
            totalIssues = issues.size,
            epicCount = epicCount,
            storyCount = storyCount,
            subtaskCount = subtaskCount,
            orphanedStoryCount = orphanedStoryCount,
            totalEstimatePoints = totalEstimatePoints
        )
    }

    /**
     * Converts a list of projects to project view DTOs.
     *
     * Batch conversion helper for dashboard project lists.
     *
     * @param projects List of project domain entities
     * @return List of lightweight DTOs
     */
    fun toProjectViews(projects: List<Project>): List<ProjectViewDTO> {
        return projects.map { toProjectView(it) }
    }

    /**
     * Converts a list of issues to issue view DTOs.
     *
     * Batch conversion helper for dashboard issue lists.
     *
     * @param issues List of issue domain entities
     * @return List of lightweight DTOs
     */
    fun toIssueViews(issues: List<Issue>): List<IssueViewDTO> {
        return issues.map { toIssueView(it) }
    }
}
