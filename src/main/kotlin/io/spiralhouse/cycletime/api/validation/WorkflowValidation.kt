package io.spiralhouse.cycletime.api.validation

import io.spiralhouse.cycletime.api.dto.CreateWorkflowRequest
import io.spiralhouse.cycletime.api.dto.UpdateWorkflowRequest
import io.spiralhouse.cycletime.api.dto.ValidateTransitionRequest
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus

/**
 * Workflow-specific validation functions that encapsulate business rules.
 *
 * This object provides comprehensive validation for Workflow-related operations,
 * ensuring that all business rules are enforced at the API boundary before
 * data reaches the domain layer.
 *
 * ## Validation Hierarchy
 * 1. **Structural Validation**: Field presence, length, format
 * 2. **Type Validation**: Valid enum values, status formats
 * 3. **Business Rule Validation**: Domain-specific constraints
 *
 * ## Business Rules Enforced
 * - Workflow names must be non-empty and <= 255 characters
 * - Descriptions are optional but limited to 2000 characters
 * - Initial status must be included in allowed statuses
 * - Allowed statuses must contain at least one valid status
 * - Status names must follow IssueStatus enum constraints
 * - Transition validations must specify valid statuses
 *
 * @since 1.0.0
 */
object WorkflowValidation {

    /**
     * Maximum allowed length for workflow names.
     */
    const val MAX_NAME_LENGTH = 255

    /**
     * Maximum allowed length for workflow descriptions.
     */
    const val MAX_DESCRIPTION_LENGTH = 2000

    /**
     * Minimum number of allowed statuses in a workflow.
     */
    const val MIN_ALLOWED_STATUSES = 1

    /**
     * Maximum number of allowed statuses in a workflow.
     */
    const val MAX_ALLOWED_STATUSES = 20

    /**
     * Valid issue statuses as strings for validation.
     */
    val VALID_ISSUE_STATUSES = IssueStatus.values().map { it.name }.toSet()

    /**
     * Validates a complete create workflow request.
     *
     * This function performs all necessary validations for workflow creation,
     * including structural validation and business rule enforcement.
     *
     * @param request The create workflow request to validate
     * @throws IllegalArgumentException if any validation fails
     */
    fun validateCreateRequest(request: CreateWorkflowRequest) {
        // Structural validations
        validateName(request.name)
        request.description?.let { validateDescription(it) }

        // Status validations
        validateInitialStatus(request.initialStatus)
        validateAllowedStatuses(request.allowedStatuses)

        // Business rule validations
        validateInitialStatusInAllowedStatuses(request.initialStatus, request.allowedStatuses)
    }

    /**
     * Validates an update workflow request.
     *
     * Update validations are more lenient as they only validate provided fields.
     *
     * @param request The update workflow request to validate
     * @throws IllegalArgumentException if any validation fails
     */
    fun validateUpdateRequest(request: UpdateWorkflowRequest) {
        request.name?.let { validateName(it) }
        request.description?.let { validateDescription(it) }
    }

    /**
     * Validates a transition validation request.
     *
     * @param request The transition validation request to validate
     * @throws IllegalArgumentException if any status is invalid
     */
    fun validateTransitionValidationRequest(request: ValidateTransitionRequest) {
        validateStatusString(request.fromStatus)
        validateStatusString(request.toStatus)
    }

    /**
     * Validates a workflow name.
     *
     * Names must be non-empty and within the maximum length constraint.
     *
     * @param name The name to validate
     * @throws IllegalArgumentException if validation fails
     */
    fun validateName(name: String) {
        when {
            name.isBlank() ->
                throw IllegalArgumentException("Workflow name cannot be empty")
            name.length > MAX_NAME_LENGTH ->
                throw IllegalArgumentException(
                    "Workflow name exceeds maximum length of $MAX_NAME_LENGTH characters (actual: ${name.length})"
                )
        }
    }

    /**
     * Validates a workflow description.
     *
     * @param description The description to validate
     * @throws IllegalArgumentException if validation fails
     */
    fun validateDescription(description: String) {
        if (description.length > MAX_DESCRIPTION_LENGTH) {
            throw IllegalArgumentException(
                "Workflow description exceeds maximum length of $MAX_DESCRIPTION_LENGTH characters (actual: ${description.length})"
            )
        }
    }

    /**
     * Validates an initial status string.
     *
     * @param statusString The initial status string to validate
     * @throws IllegalArgumentException if the status is invalid or empty
     */
    fun validateInitialStatus(statusString: String) {
        validateStatusString(statusString)
    }

    /**
     * Validates a list of allowed statuses.
     *
     * @param allowedStatuses The list of allowed statuses to validate
     * @throws IllegalArgumentException if the list is invalid
     */
    fun validateAllowedStatuses(allowedStatuses: List<String>) {
        when {
            allowedStatuses.isEmpty() ->
                throw IllegalArgumentException("Allowed statuses cannot be empty")
            allowedStatuses.size < MIN_ALLOWED_STATUSES ->
                throw IllegalArgumentException(
                    "Workflow must have at least $MIN_ALLOWED_STATUSES allowed status"
                )
            allowedStatuses.size > MAX_ALLOWED_STATUSES ->
                throw IllegalArgumentException(
                    "Workflow cannot have more than $MAX_ALLOWED_STATUSES allowed statuses"
                )
        }

        // Validate each status
        allowedStatuses.forEach { status ->
            validateStatusString(status)
        }

        // Check for duplicates
        val uniqueStatuses = allowedStatuses.toSet()
        if (uniqueStatuses.size != allowedStatuses.size) {
            throw IllegalArgumentException("Duplicate statuses found in allowed statuses list")
        }
    }

    /**
     * Validates that the initial status is included in the allowed statuses.
     *
     * @param initialStatus The initial status string
     * @param allowedStatuses The list of allowed statuses
     * @throws IllegalArgumentException if the initial status is not in allowed statuses
     */
    fun validateInitialStatusInAllowedStatuses(initialStatus: String, allowedStatuses: List<String>) {
        if (initialStatus !in allowedStatuses) {
            throw IllegalArgumentException(
                "Initial status '$initialStatus' must be included in allowed statuses: ${allowedStatuses.joinToString(", ")}"
            )
        }
    }

    /**
     * Validates a status string.
     *
     * @param statusString The status string to validate
     * @throws IllegalArgumentException if the status is invalid or empty
     */
    fun validateStatusString(statusString: String) {
        // Let the domain layer (IssueStatus.fromString) handle all validation
        // to ensure consistent error messages
        try {
            IssueStatus.fromString(statusString)
        } catch (e: IllegalArgumentException) {
            // Re-throw to maintain error message consistency with domain layer
            throw e
        }
    }

    /**
     * Creates a detailed validation error message for better debugging.
     *
     * @param field The field that failed validation
     * @param value The invalid value
     * @param constraint The constraint that was violated
     * @return A formatted error message
     */
    fun formatValidationError(field: String, value: Any?, constraint: String): String {
        return "Validation failed for field '$field': $constraint. Provided value: ${value?.toString() ?: "null"}"
    }
}

/**
 * Extension functions for validation within route context.
 */

/**
 * Extension function to validate a create workflow request with detailed error messages.
 *
 * Usage:
 * ```kotlin
 * request.validateForCreation() // Throws if invalid
 * ```
 */
fun CreateWorkflowRequest.validateForCreation() {
    WorkflowValidation.validateCreateRequest(this)
}

/**
 * Extension function to validate an update workflow request.
 *
 * Usage:
 * ```kotlin
 * request.validateForUpdate() // Throws if invalid
 * ```
 */
fun UpdateWorkflowRequest.validateForUpdate() {
    WorkflowValidation.validateUpdateRequest(this)
}

/**
 * Extension function to validate a transition validation request.
 *
 * Usage:
 * ```kotlin
 * request.validateForTransitionValidation() // Throws if invalid
 * ```
 */
fun ValidateTransitionRequest.validateForTransitionValidation() {
    WorkflowValidation.validateTransitionValidationRequest(this)
}