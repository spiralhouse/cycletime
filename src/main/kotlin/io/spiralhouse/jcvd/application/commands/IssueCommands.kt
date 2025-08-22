package io.spiralhouse.jcvd.application.commands

import io.spiralhouse.jcvd.domain.valueobjects.*

/**
 * Command to create a new issue.
 */
data class CreateIssueCommand(
    val title: String,
    val description: String? = null,
    val type: IssueType,
    val parentId: IssueId? = null,
    val projectId: ProjectId? = null,
    val estimate: Estimate? = null,
    val assigneeId: String? = null
)

/**
 * Command to update an existing issue.
 */
data class UpdateIssueCommand(
    val id: IssueId,
    val title: String? = null,
    val description: String? = null,
    val estimate: Estimate? = null,
    val assigneeId: String? = null
)

/**
 * Command to update issue status.
 */
data class UpdateIssueStatusCommand(
    val issueId: IssueId,
    val newStatus: IssueStatus
)

/**
 * Command to move an issue to a different parent.
 */
data class MoveIssueCommand(
    val issueId: IssueId,
    val newParentId: IssueId?
)

/**
 * Command to add a dependency (this issue depends on another).
 */
data class AddDependencyCommand(
    val issueId: IssueId,
    val dependencyId: IssueId
)

/**
 * Command to remove a dependency.
 */
data class RemoveDependencyCommand(
    val issueId: IssueId,
    val dependencyId: IssueId
)

/**
 * Command to add a blocker (another issue blocks this one).
 */
data class AddBlockerCommand(
    val issueId: IssueId,
    val blockerId: IssueId
)

/**
 * Command to remove a blocker.
 */
data class RemoveBlockerCommand(
    val issueId: IssueId,
    val blockerId: IssueId
)