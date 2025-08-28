package io.spiralhouse.cycletime.api.routes.common

import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.domain.valueobjects.*

/**
 * Response builder utilities for consistent API response construction.
 * 
 * This object provides centralized response building logic that ensures
 * consistent formatting and structure across all API endpoints.
 * 
 * ## Design Principles
 * - **Consistency**: All responses follow the same structure
 * - **Null Safety**: Proper handling of optional fields
 * - **Type Safety**: Strongly typed conversions
 * - **Extensibility**: Easy to add new response types
 * 
 * @since 1.0.0
 */
object ResponseBuilders {
    
    /**
     * Builds an Issue response from an application DTO.
     * 
     * This function encapsulates the mapping logic from domain DTOs to API responses,
     * ensuring consistent field mapping and null handling.
     * 
     * @param dto The issue DTO from the application layer
     * @return The API response object
     */
    fun buildIssueResponse(dto: IssueDto): IssueResponse {
        return IssueResponse(
            id = dto.id.value,
            projectId = dto.projectId?.value,
            title = dto.title,
            description = dto.description,
            type = dto.type.name,
            status = dto.status.name,
            parentId = dto.parentId?.value,
            estimate = dto.estimate.value,
            assignee = dto.assigneeId,
            dependencies = dto.dependencies.map { it.value },
            blockedBy = dto.blockedBy.map { it.value },
            createdAt = dto.createdAt.toString(),
            updatedAt = dto.updatedAt.toString()
        )
    }
    
    /**
     * Builds an Issue list response from a collection of DTOs.
     * 
     * Includes metadata such as total count for pagination support.
     * 
     * @param issues The list of issue DTOs
     * @param totalCount Optional total count (defaults to list size)
     * @return The API list response object
     */
    fun buildIssueListResponse(
        issues: List<IssueDto>,
        totalCount: Int? = null
    ): IssueListResponse {
        return IssueListResponse(
            issues = issues.map { buildIssueResponse(it) },
            totalCount = totalCount ?: issues.size
        )
    }
    
    /**
     * Builds a hierarchical issue response.
     * 
     * This function recursively builds the hierarchy tree, maintaining
     * parent-child relationships for visualization.
     * 
     * @param dto The hierarchy DTO from the application layer
     * @return The API hierarchy response object
     */
    fun buildIssueHierarchyResponse(dto: IssueHierarchyDto): IssueHierarchyResponse {
        return IssueHierarchyResponse(
            issue = buildIssueResponse(dto.issue),
            children = dto.children.map { buildIssueHierarchyResponse(it) }
        )
    }

    /**
     * Builds an extended hierarchical issue response.
     * 
     * This function builds a flat hierarchy view with parent, direct children,
     * and total descendant count for efficient API consumption.
     * 
     * @param dto The extended hierarchy DTO from the application layer
     * @return The API extended hierarchy response object
     */
    fun buildIssueHierarchyExtendedResponse(dto: IssueHierarchyExtendedDto): IssueHierarchyExtendedResponse {
        return IssueHierarchyExtendedResponse(
            issue = buildIssueResponse(dto.issue),
            parent = dto.parent?.let { buildIssueResponse(it) },
            children = dto.children.map { buildIssueResponse(it) },
            totalDescendants = dto.totalDescendants
        )
    }
    
    /**
     * Builds a Project response from an application DTO.
     * 
     * @param dto The project DTO from the application layer
     * @return The API response object
     */
    fun buildProjectResponse(dto: ProjectDto): ProjectResponse {
        return ProjectResponse(
            id = dto.id.value,
            name = dto.name,
            description = dto.description,
            status = dto.status.value,
            issueIds = dto.issues.map { it.value },
            createdAt = dto.createdAt.toString(),
            updatedAt = dto.updatedAt.toString()
        )
    }
    
    /**
     * Builds a Project list response from a collection of DTOs.
     * 
     * @param projects The list of project DTOs
     * @param totalCount Optional total count (defaults to list size)
     * @return The API list response object
     */
    fun buildProjectListResponse(
        projects: List<ProjectDto>,
        totalCount: Int? = null
    ): ProjectListResponse {
        return ProjectListResponse(
            projects = projects.map { buildProjectResponse(it) },
            totalCount = totalCount ?: projects.size
        )
    }
    
    /**
     * Builds a standardized error response.
     * 
     * This function provides consistent error formatting with optional details.
     * 
     * @param error The main error message
     * @param details Optional detailed error information
     * @param timestamp Optional timestamp for the error
     * @return The error response object
     */
    fun buildErrorResponse(
        error: String,
        details: String? = null,
        timestamp: String? = null
    ): ErrorResponse {
        return ErrorResponse(
            error = error,
            details = details,
            timestamp = timestamp
        )
    }
    
    /**
     * Builds a validation error response with field-level details.
     * 
     * This is useful for form validation errors where multiple fields may have issues.
     * 
     * @param errors Map of field names to error messages
     * @return The error response object
     */
    fun buildValidationErrorResponse(errors: Map<String, String>): ErrorResponse {
        val errorMessage = "Validation failed for ${errors.size} field(s)"
        val details = errors.entries.joinToString("; ") { (field, error) ->
            "$field: $error"
        }
        return ErrorResponse(
            error = errorMessage,
            details = details
        )
    }
    
    /**
     * Builds a success message response.
     * 
     * Used for operations that don't return a resource but need to confirm success.
     * 
     * @param message The success message
     * @param data Optional additional data
     * @return A generic message response
     */
    fun buildSuccessResponse(message: String, data: Map<String, Any>? = null): Map<String, Any?> {
        return buildMap {
            put("success", true)
            put("message", message)
            data?.let { put("data", it) }
        }
    }
}

/**
 * Extension functions for convenient response building.
 */

/**
 * Converts an IssueDto to an API response using the builder.
 */
fun IssueDto.toResponse(): IssueResponse = ResponseBuilders.buildIssueResponse(this)

/**
 * Converts a list of IssueDtos to an API list response.
 */
fun List<IssueDto>.toIssueListResponse(): IssueListResponse = ResponseBuilders.buildIssueListResponse(this)

/**
 * Converts an IssueHierarchyDto to an API response.
 */
fun IssueHierarchyDto.toResponse(): IssueHierarchyResponse = ResponseBuilders.buildIssueHierarchyResponse(this)

/**
 * Converts an IssueHierarchyExtendedDto to an API extended response.
 */
fun IssueHierarchyExtendedDto.toResponse(): IssueHierarchyExtendedResponse = ResponseBuilders.buildIssueHierarchyExtendedResponse(this)

/**
 * Converts a ProjectDto to an API response.
 */
fun ProjectDto.toResponse(): ProjectResponse = ResponseBuilders.buildProjectResponse(this)

/**
 * Converts a list of ProjectDtos to an API list response.
 */
fun List<ProjectDto>.toProjectListResponse(): ProjectListResponse = ResponseBuilders.buildProjectListResponse(this)