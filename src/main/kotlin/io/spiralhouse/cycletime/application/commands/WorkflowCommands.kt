package io.spiralhouse.cycletime.application.commands

import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId

/**
 * Command to create a new workflow.
 */
data class CreateWorkflowCommand(
    val name: String,
    val description: String? = null,
    val initialStatus: IssueStatus,
    val allowedStatuses: Set<IssueStatus>
)

/**
 * Command to update an existing workflow.
 */
data class UpdateWorkflowCommand(
    val id: WorkflowId,
    val name: String? = null,
    val description: String? = null
)

/**
 * Command to validate a transition between two issue statuses in a workflow.
 */
data class ValidateTransitionCommand(
    val workflowId: WorkflowId,
    val fromStatus: IssueStatus,
    val toStatus: IssueStatus
)

/**
 * Command to get valid transitions from a specific status in a workflow.
 */
data class GetValidTransitionsCommand(
    val workflowId: WorkflowId,
    val fromStatus: IssueStatus
)