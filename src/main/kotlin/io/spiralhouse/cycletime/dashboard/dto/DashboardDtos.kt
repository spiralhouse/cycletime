package io.spiralhouse.cycletime.dashboard.dto

import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Simplified project view optimized for dashboard display.
 *
 * This DTO provides essential project information without full aggregate details,
 * designed for efficient serialization and dashboard rendering.
 *
 * ## Field Descriptions:
 * - **id**: Project UUID (unique identifier)
 * - **name**: Human-readable project name
 * - **description**: Optional project description
 * - **status**: Project status (ACTIVE, ARCHIVED, etc.)
 * - **issueCount**: Total number of issues in this project (computed field)
 * - **createdAt**: Timestamp when project was created (ISO-8601)
 * - **updatedAt**: Timestamp of last project modification (ISO-8601)
 *
 * ## Usage:
 * Returned by `GET /api/v1/dashboard` for project list views.
 * Optimized for dashboard cards and summary displays.
 */
@Serializable
data class ProjectViewDTO(
    val id: String,
    val name: String,
    val description: String?,
    val status: String,
    val issueCount: Int,
    val createdAt: Instant,
    val updatedAt: Instant
)

/**
 * Simplified issue view optimized for dashboard display.
 *
 * Contains core issue information without deep relationship traversal,
 * enabling efficient batch loading for dashboard views.
 *
 * ## Field Descriptions:
 * - **id**: Issue UUID (unique identifier)
 * - **title**: Issue title/summary
 * - **description**: Optional detailed description
 * - **type**: Issue type (EPIC, STORY, SUBTASK)
 * - **status**: Current status (TODO, IN_PROGRESS, DONE, etc.)
 * - **parentId**: Parent issue UUID (null for top-level epics)
 * - **projectId**: Owning project UUID
 * - **estimate**: Story points estimate (null if not estimated)
 * - **assigneeId**: Assigned user UUID (null if unassigned)
 * - **createdAt**: Timestamp when issue was created (ISO-8601)
 * - **updatedAt**: Timestamp of last issue modification (ISO-8601)
 *
 * ## Null Safety:
 * - **parentId**: null for epics (top-level issues)
 * - **estimate**: null for unestimated work or epics (estimates on subtasks only)
 * - **assigneeId**: null for unassigned issues
 */
@Serializable
data class IssueViewDTO(
    val id: String,
    val title: String,
    val description: String?,
    val type: String,
    val status: String,
    val parentId: String?,
    val projectId: String?,
    val estimate: Int?,
    val assigneeId: String?,
    val createdAt: Instant,
    val updatedAt: Instant
)

/**
 * Project hierarchy view with organized issue relationships.
 *
 * Provides a complete project view with issues organized by hierarchy level
 * (epics → stories → subtasks), optimized for dashboard tree rendering.
 *
 * ## Field Descriptions:
 * - **project**: Project metadata and summary
 * - **epics**: Top-level epics with nested stories and subtasks
 * - **orphanedStories**: Stories without epic parents or invalid parent references
 * - **statistics**: Aggregate counts and metrics
 *
 * ## Hierarchy Structure:
 * ```
 * Epic (top level)
 *  └─ Story (children of epic)
 *      └─ Subtask (children of story)
 * ```
 *
 * ## Orphaned Stories:
 * Stories appear in `orphanedStories` when:
 * - Parent ID is null (should have epic parent)
 * - Parent ID references non-existent epic
 * - Parent references wrong issue type
 *
 * This enables data quality monitoring and correction.
 *
 * ## Usage:
 * Returned by `GET /api/v1/dashboard/projects/{id}` for complete project views.
 */
@Serializable
data class ProjectHierarchyDTO(
    val project: ProjectViewDTO,
    val epics: List<IssueHierarchyNode>,
    val orphanedStories: List<IssueHierarchyNode>,
    val statistics: ProjectStatistics
)

/**
 * Recursive issue hierarchy node for tree visualization.
 *
 * Represents an issue and its children in a hierarchical structure,
 * supporting nested navigation in dashboard UI.
 *
 * ## Field Descriptions:
 * - **issue**: The issue data for this node
 * - **children**: Direct child issues (recursive structure)
 *
 * ## Recursion Pattern:
 * This structure allows unlimited nesting depth:
 * ```kotlin
 * IssueHierarchyNode(
 *   issue = epicIssue,
 *   children = listOf(
 *     IssueHierarchyNode(
 *       issue = storyIssue,
 *       children = listOf(
 *         IssueHierarchyNode(issue = subtaskIssue, children = emptyList())
 *       )
 *     )
 *   )
 * )
 * ```
 *
 * ## Frontend Usage:
 * Ideal for tree view components, expandable/collapsible UI,
 * and hierarchical navigation patterns.
 */
@Serializable
data class IssueHierarchyNode(
    val issue: IssueViewDTO,
    val children: List<IssueHierarchyNode> = emptyList()
)

/**
 * Statistical summary for project dashboard view.
 *
 * Provides aggregate counts and metrics for dashboard KPIs.
 *
 * ## Field Descriptions:
 * - **totalIssues**: Total count of all issues (epics + stories + subtasks)
 * - **epicCount**: Count of top-level epics
 * - **storyCount**: Count of stories (both under epics and orphaned)
 * - **subtaskCount**: Count of subtasks
 * - **orphanedStoryCount**: Stories without valid epic parents (data quality metric)
 * - **totalEstimatePoints**: Sum of all estimate points across issues
 *
 * ## Computed Values:
 * All fields are computed from the issue list, not persisted values.
 * Recalculated on each hierarchy request for accuracy.
 *
 * ## Validation Rules:
 * - `totalIssues = epicCount + storyCount + subtaskCount`
 * - `orphanedStoryCount <= storyCount`
 * - `totalEstimatePoints` only sums non-null estimates
 *
 * ## Usage:
 * Displayed in dashboard summary cards, progress bars, and project health indicators.
 */
@Serializable
data class ProjectStatistics(
    val totalIssues: Int,
    val epicCount: Int,
    val storyCount: Int,
    val subtaskCount: Int,
    val orphanedStoryCount: Int,
    val totalEstimatePoints: Int
)

/**
 * Service health status for dashboard monitoring.
 *
 * Provides real-time health information for system status indicators.
 *
 * ## Field Descriptions:
 * - **status**: Overall service status (healthy, degraded, down)
 * - **timestamp**: Current server time in ISO-8601 format
 * - **uptime**: Service uptime in milliseconds
 * - **dependencies**: Status of dependent services (database, cache)
 * - **metrics**: Key performance metrics (cache size, request rate, etc.)
 *
 * ## Status Values:
 * - **healthy**: All systems operational
 * - **degraded**: Service operational with non-critical issues
 * - **down**: Service unavailable
 *
 * ## Usage:
 * Polled by dashboard health checks and status pages.
 * Cached for 1 minute to reduce overhead.
 */
@Serializable
data class ServiceHealthDTO(
    val status: String,
    val timestamp: Instant,
    val uptime: Long,
    val dependencies: Map<String, String>,
    val metrics: Map<String, String>
)
