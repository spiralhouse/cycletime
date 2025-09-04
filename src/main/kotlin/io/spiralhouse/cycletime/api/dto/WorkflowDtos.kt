package io.spiralhouse.cycletime.api.dto

import io.spiralhouse.cycletime.application.dto.WorkflowDto
import io.spiralhouse.cycletime.application.dto.ValidationResult
import kotlinx.serialization.Serializable

/**
 * Request DTO for creating a new workflow.
 */
@Serializable
data class CreateWorkflowRequest(
    val name: String,
    val description: String? = null,
    val initialStatus: String,
    val allowedStatuses: List<String>
)

/**
 * Request DTO for updating an existing workflow.
 * Only name and description can be updated (not status configuration).
 */
@Serializable
data class UpdateWorkflowRequest(
    val name: String? = null,
    val description: String? = null
)

/**
 * Request DTO for validating a status transition.
 */
@Serializable
data class ValidateTransitionRequest(
    val fromStatus: String,
    val toStatus: String
)

/**
 * Response DTO for workflow data exposed through the REST API.
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
 */
@Serializable
data class WorkflowListResponse(
    val workflows: List<WorkflowResponse>,
    val totalCount: Int
) {
    companion object {
        /**
         * Creates a WorkflowListResponse from application layer DTOs.
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
 */
@Serializable
data class TransitionsResponse(
    val fromStatus: String,
    val validTransitions: List<String>
)

/**
 * Response DTO for transition validation results.
 */
@Serializable
data class ValidationResponse(
    val isValid: Boolean,
    val reason: String? = null
) {
    companion object {
        /**
         * Creates a ValidationResponse from an application layer ValidationResult.
         */
        fun fromValidationResult(result: ValidationResult): ValidationResponse {
            return ValidationResponse(
                isValid = result.isValid,
                reason = result.reason
            )
        }
    }
}