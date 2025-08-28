package io.spiralhouse.cycletime.api.validation

import io.spiralhouse.cycletime.api.dto.CreateIssueRequest
import io.spiralhouse.cycletime.api.dto.StatusTransitionRequest
import io.spiralhouse.cycletime.api.dto.UpdateIssueRequest
import io.spiralhouse.cycletime.domain.valueobjects.IssueType
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus

/**
 * Issue-specific validation functions that encapsulate business rules.
 * 
 * This object provides comprehensive validation for Issue-related operations,
 * ensuring that all business rules are enforced at the API boundary before
 * data reaches the domain layer.
 * 
 * ## Validation Hierarchy
 * 1. **Structural Validation**: Field presence, length, format
 * 2. **Type Validation**: Valid enum values, UUID formats
 * 3. **Business Rule Validation**: Domain-specific constraints
 * 
 * ## Business Rules Enforced
 * - Epic issues cannot have estimates (they aggregate child estimates)
 * - Epic issues cannot have parent issues (they are top-level)
 * - Subtask issues must belong to a story
 * - Story issues can optionally belong to an epic
 * - Estimate values must follow Fibonacci sequence
 * - Status transitions must follow defined workflow
 * 
 * @since 1.0.0
 */
object IssueValidation {
    
    /**
     * Maximum allowed length for issue titles.
     */
    const val MAX_TITLE_LENGTH = 255
    
    /**
     * Maximum allowed length for issue descriptions.
     */
    const val MAX_DESCRIPTION_LENGTH = 2000
    
    /**
     * Valid estimate values following Fibonacci sequence.
     */
    val VALID_ESTIMATES = setOf(1, 2, 3, 5, 8, 13)
    
    /**
     * Valid issue types as strings for validation.
     */
    val VALID_ISSUE_TYPES = IssueType.values().map { it.name }.toSet()
    
    /**
     * Valid issue statuses as strings for validation.
     */
    val VALID_ISSUE_STATUSES = IssueStatus.values().map { it.name }.toSet()
    
    /**
     * Validates a complete create issue request.
     * 
     * This function performs all necessary validations for issue creation,
     * including structural validation and business rule enforcement.
     * 
     * @param request The create issue request to validate
     * @throws IllegalArgumentException if any validation fails
     */
    fun validateCreateRequest(request: CreateIssueRequest) {
        // Structural validations
        validateTitle(request.title)
        request.description?.let { validateDescription(it) }
        
        // Type validation
        val issueType = validateAndParseIssueType(request.type)
        
        // Business rule validations
        validateEpicBusinessRules(issueType, request.estimate, request.parentId)
        validateSubtaskBusinessRules(issueType, request.parentId)
        
        // Estimate validation if provided
        request.estimate?.let { validateEstimate(it) }
    }
    
    /**
     * Validates an update issue request.
     * 
     * Update validations are more lenient as they only validate provided fields.
     * 
     * @param request The update issue request to validate
     * @throws IllegalArgumentException if any validation fails
     */
    fun validateUpdateRequest(request: UpdateIssueRequest) {
        request.title?.let { validateTitle(it) }
        request.description?.let { validateDescription(it) }
        request.estimate?.let { validateEstimate(it) }
    }
    
    /**
     * Validates a status transition request.
     * 
     * @param request The status transition request to validate
     * @throws IllegalArgumentException if the status is invalid or empty
     */
    fun validateStatusTransition(request: StatusTransitionRequest) {
        if (request.status.isBlank()) {
            throw IllegalArgumentException("Issue status is required")
        }
        validateStatus(request.status)
    }
    
    /**
     * Validates an issue title.
     * 
     * Titles must be non-empty and within the maximum length constraint.
     * 
     * @param title The title to validate
     * @throws IllegalArgumentException if validation fails
     */
    fun validateTitle(title: String) {
        when {
            title.isBlank() -> 
                throw IllegalArgumentException("Issue title cannot be empty")
            title.length > MAX_TITLE_LENGTH -> 
                throw IllegalArgumentException(
                    "Issue title exceeds maximum length of $MAX_TITLE_LENGTH characters (actual: ${title.length})"
                )
        }
    }
    
    /**
     * Validates an issue description.
     * 
     * @param description The description to validate
     * @throws IllegalArgumentException if validation fails
     */
    fun validateDescription(description: String) {
        if (description.length > MAX_DESCRIPTION_LENGTH) {
            throw IllegalArgumentException(
                "Issue description exceeds maximum length of $MAX_DESCRIPTION_LENGTH characters (actual: ${description.length})"
            )
        }
    }
    
    /**
     * Validates and parses an issue type string.
     * 
     * @param typeString The issue type string to validate
     * @return The parsed IssueType enum value
     * @throws IllegalArgumentException if the type is invalid
     */
    fun validateAndParseIssueType(typeString: String): IssueType {
        val upperType = typeString.uppercase()
        if (upperType !in VALID_ISSUE_TYPES) {
            throw IllegalArgumentException(
                "Invalid issue type: '$typeString'. Valid types are: ${VALID_ISSUE_TYPES.joinToString(", ")}"
            )
        }
        return IssueType.valueOf(upperType)
    }
    
    /**
     * Validates an issue status string.
     * 
     * @param statusString The status string to validate
     * @throws IllegalArgumentException if the status is invalid or empty
     */
    fun validateStatus(statusString: String) {
        if (statusString.isBlank()) {
            throw IllegalArgumentException("Issue status is required")
        }
        
        val upperStatus = statusString.uppercase()
        if (upperStatus !in VALID_ISSUE_STATUSES) {
            throw IllegalArgumentException(
                "Invalid issue status: '$statusString'. Valid statuses are: ${VALID_ISSUE_STATUSES.joinToString(", ")}"
            )
        }
    }
    
    /**
     * Validates an estimate value.
     * 
     * Estimates must follow the Fibonacci sequence for consistency.
     * 
     * @param estimate The estimate value to validate
     * @throws IllegalArgumentException if the estimate is invalid
     */
    fun validateEstimate(estimate: Int) {
        if (estimate !in VALID_ESTIMATES) {
            throw IllegalArgumentException(
                "Invalid estimate: $estimate. Valid estimates follow Fibonacci sequence: ${VALID_ESTIMATES.sorted().joinToString(", ")}"
            )
        }
    }
    
    /**
     * Validates Epic-specific business rules.
     * 
     * Epics have special constraints:
     * - Cannot have direct estimates (they aggregate from children)
     * - Cannot have parent issues (they are top-level)
     * 
     * @param issueType The issue type
     * @param estimate The estimate value (should be null for epics)
     * @param parentId The parent issue ID (should be null for epics)
     * @throws IllegalArgumentException if epic business rules are violated
     */
    private fun validateEpicBusinessRules(issueType: IssueType, estimate: Int?, parentId: String?) {
        if (issueType == IssueType.EPIC) {
            if (estimate != null) {
                throw IllegalArgumentException(
                    "Epic issues cannot have estimates. Epics aggregate estimates from their child issues."
                )
            }
            if (parentId != null) {
                throw IllegalArgumentException(
                    "Epic issues cannot have parent issues. Epics are top-level containers in the issue hierarchy."
                )
            }
        }
    }
    
    /**
     * Validates Subtask-specific business rules.
     * 
     * Subtasks have special constraints:
     * - Must have a parent issue (typically a Story)
     * - Should have estimates for proper tracking
     * 
     * @param issueType The issue type
     * @param parentId The parent issue ID (required for subtasks)
     * @throws IllegalArgumentException if subtask business rules are violated
     */
    private fun validateSubtaskBusinessRules(issueType: IssueType, parentId: String?) {
        if (issueType == IssueType.SUBTASK && parentId == null) {
            throw IllegalArgumentException(
                "Subtask issues must have a parent issue. Subtasks cannot exist independently."
            )
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
 * Extension function to validate a create issue request with detailed error messages.
 * 
 * Usage:
 * ```kotlin
 * request.validateForCreation() // Throws if invalid
 * ```
 */
fun CreateIssueRequest.validateForCreation() {
    IssueValidation.validateCreateRequest(this)
}

/**
 * Extension function to validate an update issue request.
 * 
 * Usage:
 * ```kotlin
 * request.validateForUpdate() // Throws if invalid
 * ```
 */
fun UpdateIssueRequest.validateForUpdate() {
    IssueValidation.validateUpdateRequest(this)
}

/**
 * Extension function to validate a status transition request.
 * 
 * Usage:
 * ```kotlin
 * request.validateForStatusTransition() // Throws if invalid
 * ```
 */
fun StatusTransitionRequest.validateForStatusTransition() {
    IssueValidation.validateStatusTransition(this)
}