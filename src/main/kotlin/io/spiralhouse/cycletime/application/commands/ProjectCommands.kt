package io.spiralhouse.cycletime.application.commands

import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId

/**
 * Command to create a new project.
 */
data class CreateProjectCommand(
    val name: String,
    val description: String?
)

/**
 * Command to update an existing project.
 */
data class UpdateProjectCommand(
    val id: ProjectId,
    val name: String? = null,
    val description: String? = null
)

/**
 * Command to archive a project.
 */
data class ArchiveProjectCommand(
    val id: ProjectId
)

/**
 * Command to complete a project.
 */
data class CompleteProjectCommand(
    val id: ProjectId
)

/**
 * Command to reactivate a project.
 */
data class ReactivateProjectCommand(
    val id: ProjectId
)

/**
 * Command to add an issue to a project.
 */
data class AddIssueToProjectCommand(
    val projectId: ProjectId,
    val issueId: IssueId
)

/**
 * Command to remove an issue from a project.
 */
data class RemoveIssueFromProjectCommand(
    val projectId: ProjectId,
    val issueId: IssueId
)
