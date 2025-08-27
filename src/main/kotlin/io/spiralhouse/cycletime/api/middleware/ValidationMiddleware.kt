package io.spiralhouse.cycletime.api.middleware

import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.IssueId

/**
 * Centralized validation logic for API requests.
 * 
 * This object provides reusable validation methods that can be used
 * across different routes to ensure consistent validation rules.
 */
object ValidationMiddleware {
    
    /**
     * Maximum allowed length for project names.
     */
    const val MAX_PROJECT_NAME_LENGTH = 255
    
    /**
     * Maximum allowed length for project descriptions.
     */
    const val MAX_PROJECT_DESCRIPTION_LENGTH = 2000
    
    /**
     * Validates a create project request.
     * 
     * @param request The request to validate
     * @throws IllegalArgumentException if validation fails
     */
    fun validateCreateProjectRequest(request: CreateProjectRequest) {
        validateProjectName(request.name)
        request.description?.let { validateProjectDescription(it) }
    }
    
    /**
     * Validates an update project request.
     * 
     * @param request The request to validate
     * @throws IllegalArgumentException if validation fails
     */
    fun validateUpdateProjectRequest(request: UpdateProjectRequest) {
        request.name?.let { validateProjectName(it) }
        request.description?.let { validateProjectDescription(it) }
    }
    
    /**
     * Validates a project name.
     * 
     * @param name The project name to validate
     * @throws IllegalArgumentException if validation fails
     */
    fun validateProjectName(name: String) {
        when {
            name.isBlank() -> throw IllegalArgumentException("Project name must not be empty")
            name.length > MAX_PROJECT_NAME_LENGTH -> 
                throw IllegalArgumentException("Project name length exceeds maximum ($MAX_PROJECT_NAME_LENGTH characters)")
        }
    }
    
    /**
     * Validates a project description.
     * 
     * @param description The project description to validate
     * @throws IllegalArgumentException if validation fails
     */
    fun validateProjectDescription(description: String) {
        if (description.length > MAX_PROJECT_DESCRIPTION_LENGTH) {
            throw IllegalArgumentException("Project description length exceeds maximum ($MAX_PROJECT_DESCRIPTION_LENGTH characters)")
        }
    }
    
    /**
     * Validates and parses a UUID string into a ProjectId.
     * 
     * @param idString The string to parse
     * @return The parsed ProjectId
     * @throws IllegalArgumentException if the string is not a valid UUID
     */
    fun parseProjectId(idString: String): ProjectId {
        return try {
            ProjectId.fromString(idString)
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Invalid UUID format: $idString")
        }
    }
    
    /**
     * Validates that a required path parameter is present.
     * 
     * @param value The parameter value
     * @param paramName The parameter name for error messages
     * @return The non-null value
     * @throws IllegalArgumentException if the parameter is null
     */
    fun requireParameter(value: String?, paramName: String): String {
        return value ?: throw IllegalArgumentException("$paramName is required")
    }
    
    // ================================================================================
    // Issue ID Parsing
    // ================================================================================
    
    /**
     * Validates and parses a UUID string into an IssueId.
     * 
     * Note: Issue-specific validation logic has been moved to 
     * io.spiralhouse.cycletime.api.validation.IssueValidation for better
     * separation of concerns and reusability.
     * 
     * @param idString The string to parse
     * @return The parsed IssueId
     * @throws IllegalArgumentException if the string is not a valid UUID
     */
    fun parseIssueId(idString: String): IssueId {
        return try {
            IssueId.fromString(idString)
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Invalid UUID format: $idString")
        }
    }
}