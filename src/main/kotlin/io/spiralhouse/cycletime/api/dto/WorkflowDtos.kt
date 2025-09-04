package io.spiralhouse.cycletime.api.dto

import io.spiralhouse.cycletime.application.commands.CreateWorkflowCommand
import io.spiralhouse.cycletime.application.commands.UpdateWorkflowCommand
import io.spiralhouse.cycletime.application.dto.WorkflowDto
import io.spiralhouse.cycletime.application.dto.ValidationResult
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import kotlinx.serialization.Serializable

/**
 * Request DTO for creating a new workflow.
 * 
 * ## Validation Rules
 * - Name must be non-empty and <= 255 characters
 * - Description is optional but limited to 2000 characters
 * - Initial status must be a valid IssueStatus value
 * - Initial status must be included in allowed statuses
 * - Allowed statuses must contain at least one valid status
 */
@Serializable
data class CreateWorkflowRequest(
    val name: String,
    val description: String? = null,
    val initialStatus: String,
    val allowedStatuses: List<String>
) {
    /**
     * Converts this request to a domain command.
     * 
     * @return CreateWorkflowCommand with parsed status values
     * @throws IllegalArgumentException if status values are invalid
     */
    fun toCreateCommand(): CreateWorkflowCommand {
        return CreateWorkflowCommand(
            name = name,
            description = description,
            initialStatus = IssueStatus.fromString(initialStatus),
            allowedStatuses = allowedStatuses.map { IssueStatus.fromString(it) }.toSet()
        )
    }
}

/**
 * Request DTO for updating an existing workflow.
 * 
 * ## Update Rules
 * - Only name and description can be updated
 * - Status configuration is immutable after creation
 * - Partial updates are supported (null fields are not updated)
 */
@Serializable
data class UpdateWorkflowRequest(
    val name: String? = null,
    val description: String? = null
) {
    /**
     * Converts this request to a domain command.
     * 
     * @param workflowId The ID of the workflow to update
     * @return UpdateWorkflowCommand with the specified changes
     */
    fun toUpdateCommand(workflowId: WorkflowId): UpdateWorkflowCommand {
        return UpdateWorkflowCommand(
            id = workflowId,
            name = name,
            description = description
        )
    }
}

/**
 * Request DTO for validating a status transition.
 * 
 * ## Validation Rules
 * - Both fromStatus and toStatus must be valid IssueStatus values
 * - The transition validity depends on the workflow configuration
 */
@Serializable
data class ValidateTransitionRequest(
    val fromStatus: String,
    val toStatus: String
)

/**
 * Response DTO for workflow data exposed through the REST API.
 * 
 * ## Response Fields
 * - id: Unique workflow identifier (UUID)
 * - name: Human-readable workflow name
 * - description: Optional workflow description
 * - initialStatus: Starting status for new issues
 * - allowedStatuses: List of valid statuses in this workflow
 * - createdAt: ISO-8601 timestamp of creation
 * - updatedAt: ISO-8601 timestamp of last update
 */
@Serializable
data class WorkflowResponse(
    val id: String,
    val name: String,
    val description: String?,
    val initialStatus: String,
    val allowedStatuses: List<String>,
    val createdAt: String,
    val updatedAt: String
) {
    companion object {
        /**
         * Creates a WorkflowResponse from an application layer WorkflowDto.
         * 
         * @param dto The application layer DTO to convert
         * @return REST API response representation
         */
        fun fromDto(dto: WorkflowDto): WorkflowResponse {
            return WorkflowResponse(
                id = dto.id,
                name = dto.name,
                description = dto.description,
                initialStatus = dto.initialStatus,
                allowedStatuses = dto.allowedStatuses,
                createdAt = dto.createdAt.toString(),
                updatedAt = dto.updatedAt.toString()
            )
        }
    }
}

/**
 * Response DTO for a list of workflows.
 * 
 * ## Response Structure
 * - workflows: Array of workflow objects
 * - totalCount: Total number of workflows (for pagination support)
 */
@Serializable
data class WorkflowListResponse(
    val workflows: List<WorkflowResponse>,
    val totalCount: Int
) {
    companion object {
        /**
         * Creates a WorkflowListResponse from application layer DTOs.
         * 
         * @param workflows List of workflow DTOs from the application layer
         * @return REST API list response
         */
        fun fromWorkflowList(workflows: List<WorkflowDto>): WorkflowListResponse {
            return WorkflowListResponse(
                workflows = workflows.map { WorkflowResponse.fromDto(it) },
                totalCount = workflows.size
            )
        }
    }
}

/**
 * Response DTO for valid transitions from a specific status.
 * 
 * ## Response Fields
 * - fromStatus: The source status
 * - validTransitions: List of statuses that can be transitioned to
 */
@Serializable
data class TransitionsResponse(
    val fromStatus: String,
    val validTransitions: List<String>
)

/**
 * Response DTO for transition validation results.
 * 
 * ## Response Fields
 * - isValid: Whether the transition is valid
 * - reason: Optional explanation if transition is invalid
 */
@Serializable
data class ValidationResponse(
    val isValid: Boolean,
    val reason: String? = null
) {
    companion object {
        /**
         * Creates a ValidationResponse from an application layer ValidationResult.
         * 
         * @param result The validation result from the application layer
         * @return REST API validation response
         */
        fun fromValidationResult(result: ValidationResult): ValidationResponse {
            return ValidationResponse(
                isValid = result.isValid,
                reason = result.reason
            )
        }
    }
}