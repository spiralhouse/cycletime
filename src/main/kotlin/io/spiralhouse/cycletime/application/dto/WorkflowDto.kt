package io.spiralhouse.cycletime.application.dto

import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import io.spiralhouse.cycletime.infrastructure.serialization.InstantSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.NullableInstantSerializer
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Data Transfer Object representing a Workflow for the application layer.
 * Used to transfer workflow data between layers without exposing domain entity internals.
 */
@Serializable
data class WorkflowDto(
    val id: String, // WorkflowId as string for serialization
    val name: String,
    val description: String?,
    val initialStatus: String, // IssueStatus as string
    val allowedStatuses: List<String>, // Set as sorted List for consistent serialization
    @Serializable(with = InstantSerializer::class)
    val createdAt: Instant,
    @Serializable(with = InstantSerializer::class)
    val updatedAt: Instant,
    @Serializable(with = NullableInstantSerializer::class)
    val deletedAt: Instant? = null
) {
    companion object {
        /**
         * Creates a WorkflowDto from a domain Workflow entity.
         */
        fun fromWorkflow(workflow: Workflow): WorkflowDto {
            return WorkflowDto(
                id = workflow.id.value.toString(),
                name = workflow.name,
                description = workflow.description,
                initialStatus = workflow.initialStatus.name,
                allowedStatuses = workflow.allowedStatuses.map { it.name }.sorted(),
                createdAt = workflow.createdAt,
                updatedAt = workflow.updatedAt,
                deletedAt = workflow.deletedAt
            )
        }
    }
}

/**
 * Result of a transition validation operation.
 */
@Serializable
data class ValidationResult(
    val isValid: Boolean,
    val reason: String? = null
) {
    companion object {
        fun valid(): ValidationResult = ValidationResult(isValid = true)
        
        fun invalid(reason: String): ValidationResult = 
            ValidationResult(isValid = false, reason = reason)
    }
}

/**
 * Data Transfer Object containing a list of workflows.
 */
@Serializable
data class WorkflowListDto(
    val workflows: List<WorkflowDto>,
    val totalCount: Int
) {
    companion object {
        fun fromWorkflows(workflows: List<Workflow>): WorkflowListDto {
            return WorkflowListDto(
                workflows = workflows.map { WorkflowDto.fromWorkflow(it) },
                totalCount = workflows.size
            )
        }
    }
}