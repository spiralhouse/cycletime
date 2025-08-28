package io.spiralhouse.cycletime.api.routes.common

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.*
import io.ktor.server.plugins.di.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.spiralhouse.cycletime.api.dto.ErrorResponse
import io.spiralhouse.cycletime.api.middleware.ValidationMiddleware
import io.spiralhouse.cycletime.api.middleware.ErrorHandlingMiddleware
import io.spiralhouse.cycletime.api.middleware.UnsupportedMediaTypeException
import io.spiralhouse.cycletime.application.exceptions.*
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import org.slf4j.LoggerFactory

/**
 * Common route extension functions and utilities for REST API endpoints.
 * 
 * This file provides reusable patterns and helper functions that promote
 * consistency across all API routes while reducing code duplication.
 * 
 * ## Design Philosophy
 * - **Separation of Concerns**: HTTP layer handles only HTTP concerns
 * - **Error Mapping**: Domain exceptions are mapped to appropriate HTTP status codes
 * - **Validation**: Input validation happens at the API boundary
 * - **Consistency**: All endpoints follow the same patterns for error handling and response formatting
 * 
 * @since 1.0.0
 */

@PublishedApi
internal val logger = LoggerFactory.getLogger("RouteExtensions")

/**
 * Extension function for retrieving a service dependency from the DI container.
 * 
 * This provides a more convenient syntax for accessing services in routes.
 * 
 * Example:
 * ```kotlin
 * val projectService = service<ProjectApplicationService>()
 * ```
 * 
 * @param T The service type to retrieve
 * @return The service instance from the DI container
 */
inline fun <reified T : Any> ApplicationCall.service(): T {
    val dependencies: T by application.dependencies
    return dependencies
}

/**
 * Extracts and validates a required path parameter.
 * 
 * This function ensures that path parameters are present and can be used
 * for further processing. It provides consistent error handling for missing parameters.
 * 
 * @param name The parameter name
 * @param displayName The human-readable name for error messages (defaults to parameter name)
 * @return The validated parameter value
 * @throws IllegalArgumentException if the parameter is missing
 */
fun ApplicationCall.requirePathParameter(name: String, displayName: String = name): String {
    return parameters[name] 
        ?: throw IllegalArgumentException("$displayName is required")
}

/**
 * Extracts and parses a Project ID from path parameters.
 * 
 * Combines parameter extraction and UUID parsing with proper error handling.
 * 
 * @param paramName The parameter name (defaults to "projectId")
 * @return The parsed ProjectId
 * @throws IllegalArgumentException if parameter is missing or invalid UUID
 */
fun ApplicationCall.extractProjectId(paramName: String = "projectId"): ProjectId {
    val idString = requirePathParameter(paramName, "Project ID")
    return ValidationMiddleware.parseProjectId(idString)
}

/**
 * Extracts and parses an Issue ID from path parameters.
 * 
 * Combines parameter extraction and UUID parsing with proper error handling.
 * 
 * @param paramName The parameter name (defaults to "id")
 * @return The parsed IssueId
 * @throws IllegalArgumentException if parameter is missing or invalid UUID
 */
fun ApplicationCall.extractIssueId(paramName: String = "id"): IssueId {
    val idString = requirePathParameter(paramName, "Issue ID")
    return ValidationMiddleware.parseIssueId(idString)
}

/**
 * Executes a service operation with standardized error handling.
 * 
 * This function provides a consistent pattern for calling application services
 * and mapping their exceptions to appropriate HTTP responses. It handles:
 * - Domain exceptions (NotFound, Validation, etc.)
 * - Serialization errors
 * - Unexpected errors with proper logging
 * 
 * Usage:
 * ```kotlin
 * call.executeServiceCall {
 *     val service = call.service<ProjectApplicationService>()
 *     val result = service.createProject(command)
 *     call.respond(HttpStatusCode.Created, result)
 * }
 * ```
 * 
 * @param block The service operation to execute
 */
suspend fun ApplicationCall.executeServiceCall(block: suspend () -> Unit) {
    try {
        block()
    } catch (e: ProjectNotFoundException) {
        respondNotFound("Project not found", e.message)
    } catch (e: IssueNotFoundException) {
        respondNotFound("Issue not found", e.message)
    } catch (e: HierarchyViolationException) {
        respondBadRequest("Hierarchy violation", e.message)
    } catch (e: InvalidStatusTransitionException) {
        respondUnprocessableEntity("Invalid status transition", e.message)
    } catch (e: IllegalArgumentException) {
        // Enhanced validation error handling with specific messages
        val message = e.message ?: "Invalid request"
        val (errorMessage, details) = when {
            message.startsWith("Invalid IssueStatus:") -> {
                val invalidStatus = message.substringAfter("Invalid IssueStatus:").trim()
                val details = if (invalidStatus.isNotEmpty()) {
                    "Invalid status: '$invalidStatus'. Valid statuses are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED"
                } else {
                    "Status field is required. Valid statuses are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED"
                }
                message to details
            }
            message.startsWith("Invalid issue status:") -> {
                val status = message.substringAfter("Invalid issue status:").substringBefore(".").trim()
                "Invalid status: $status" to "Valid statuses are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED"
            }
            message.contains("Invalid UUID") -> {
                val id = message.substringAfter("Invalid UUID format:").trim()
                val errorMessage = if (id.isNotBlank()) "Invalid UUID format: $id" else "Invalid UUID format"
                errorMessage to "The provided ID is not a valid UUID"
            }
            message.contains("cannot be empty") || message.contains("must not be empty") -> {
                val field = message.substringBefore("cannot be empty").substringBefore("must not be empty").trim()
                "$field is required" to message
            }
            else -> message to null
        }
        respondBadRequest(errorMessage, details)
    } catch (e: SerializationException) {
        logger.error("Serialization error", e)
        respondBadRequest("Invalid request format", e.message)
    } catch (e: Exception) {
        logger.error("Unexpected error in service call", e)
        val timeProvider: TimeProvider by application.dependencies
        respond(HttpStatusCode.InternalServerError, ErrorResponse(
            error = "Internal server error",
            details = "An unexpected error occurred",
            timestamp = timeProvider.now().toString()
        ))
    }
}

/**
 * Responds with a standardized Not Found (404) error.
 * 
 * @param error The error message
 * @param details Additional details about the error
 */
suspend fun ApplicationCall.respondNotFound(error: String, details: String? = null) {
    val timeProvider: TimeProvider by application.dependencies
    respond(HttpStatusCode.NotFound, ErrorResponse(
        error = error,
        details = details,
        timestamp = timeProvider.now().toString()
    ))
}

/**
 * Responds with a standardized Bad Request (400) error.
 * 
 * @param error The error message
 * @param details Additional details about the error
 */
suspend fun ApplicationCall.respondBadRequest(error: String, details: String? = null) {
    val timeProvider: TimeProvider by application.dependencies
    respond(HttpStatusCode.BadRequest, ErrorResponse(
        error = error,
        details = details,
        timestamp = timeProvider.now().toString()
    ))
}

/**
 * Responds with a successful creation (201) and the created resource.
 * 
 * @param resource The created resource to return
 */
suspend fun ApplicationCall.respondCreated(resource: Any) {
    respond(HttpStatusCode.Created, resource)
}

/**
 * Responds with a successful update (200) and the updated resource.
 * 
 * @param resource The updated resource to return
 */
suspend fun ApplicationCall.respondOk(resource: Any) {
    respond(HttpStatusCode.OK, resource)
}

/**
 * Responds with a successful deletion (204 No Content).
 */
suspend fun ApplicationCall.respondNoContent() {
    respond(HttpStatusCode.NoContent)
}

/**
 * Responds with a standardized Unprocessable Entity (422) error.
 * 
 * @param error The error message
 * @param details Additional details about the error
 */
suspend fun ApplicationCall.respondUnprocessableEntity(error: String, details: String? = null) {
    val timeProvider: TimeProvider by application.dependencies
    respond(HttpStatusCode.UnprocessableEntity, ErrorResponse(
        error = error,
        details = details,
        timestamp = timeProvider.now().toString()
    ))
}

/**
 * Validates a request body and executes a block if validation passes.
 * 
 * This function combines request deserialization, validation, and execution
 * into a single pattern that ensures consistent error handling.
 * 
 * Usage:
 * ```kotlin
 * call.validateAndProcess<CreateProjectRequest> { request ->
 *     ValidationMiddleware.validateCreateProjectRequest(request)
 *     // Process the valid request
 * }
 * ```
 * 
 * @param T The request type
 * @param validation Optional validation function
 * @param block The block to execute with the validated request
 */
suspend inline fun <reified T : Any> ApplicationCall.validateAndProcess(
    validation: (T) -> Unit = {},
    noinline block: suspend (T) -> Unit
) {
    try {
        // Try to receive the request body first to prioritize body validation errors
        val request = try {
            receive<T>()
        } catch (e: Exception) {
            when {
                e is SerializationException -> {
                    logger.warn("Failed to deserialize request: ${e.message}")
                    throw BadRequestException("Invalid JSON format: ${e.message}")
                }
                e.message?.contains("EOF") == true || 
                e.message?.contains("Unexpected end") == true ||
                e.message?.contains("Request body") == true ||
                e.message?.contains("is empty") == true -> {
                    throw BadRequestException("Request body is required")
                }
                else -> throw e
            }
        }
        
        // Check Content-Type header after body parsing (for consistency with other endpoints)
        if (this.request.httpMethod != HttpMethod.Get && this.request.httpMethod != HttpMethod.Delete) {
            val contentType = this.request.contentType()
            if (contentType.contentType != "application" || contentType.contentSubtype != "json") {
                throw UnsupportedMediaTypeException("Content-Type must be application/json")
            }
        }
        
        
        // Validate the request
        validation(request)
        
        // Process the request
        block(request)
    } catch (e: UnsupportedMediaTypeException) {
        respondUnsupportedMediaType()
    } catch (e: BadRequestException) {
        val message = when {
            e.message?.contains("Request body is required") == true -> "Request body is required"
            e.message?.contains("Invalid JSON") == true -> "Invalid JSON format"
            else -> e.message ?: "Bad request"
        }
        respondBadRequest(message, e.cause?.message)
    } catch (e: SerializationException) {
        logger.warn("Failed to deserialize request: ${e.message}")
        respondBadRequest("Invalid JSON format", e.message)
    } catch (e: IllegalArgumentException) {
        // Enhanced validation error handling
        val message = e.message ?: "Validation failed"
        val (errorMessage, details) = when {
            message.startsWith("Invalid IssueStatus:") -> {
                val invalidStatus = message.substringAfter("Invalid IssueStatus:").trim()
                val details = if (invalidStatus.isNotEmpty()) {
                    "Invalid status: '$invalidStatus'. Valid statuses are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED"
                } else {
                    "Status field is required. Valid statuses are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED"
                }
                message to details
            }
            message.startsWith("Invalid issue status:") -> {
                val status = message.substringAfter("Invalid issue status:").substringBefore(".").trim()
                "Invalid status: $status" to "Valid statuses are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED"
            }
            message.contains("Issue status is required") -> {
                "Issue status is required" to "Status field must not be empty"
            }
            else -> message to null
        }
        respondBadRequest(errorMessage, details)
    } catch (e: Exception) {
        // Log unexpected errors
        logger.error("Unexpected error in request processing", e)
        throw e // Let the global error handler deal with it
    }
}

/**
 * Handles nullable resources with automatic 404 responses.
 * 
 * This pattern is useful for GET endpoints where a resource might not exist.
 * 
 * Usage:
 * ```kotlin
 * call.respondWithResource(
 *     resource = projectService.getProject(id),
 *     transform = { ProjectResponse.fromDto(it) },
 *     notFoundMessage = "Project not found"
 * )
 * ```
 * 
 * @param resource The nullable resource
 * @param transform Function to transform the resource to a response DTO
 * @param notFoundMessage Error message if resource is null
 * @param notFoundDetails Additional details for the error
 */
suspend fun <T> ApplicationCall.respondWithResource(
    resource: T?,
    transform: (T) -> Any,
    notFoundMessage: String = "Resource not found",
    notFoundDetails: String? = null
) {
    if (resource != null) {
        respondOk(transform(resource))
    } else {
        respondNotFound(notFoundMessage, notFoundDetails)
    }
}

/**
 * Extension property to check if the request is for API v1.
 * 
 * This can be used to provide version-specific behavior in routes.
 */
val ApplicationCall.isApiV1: Boolean
    get() = request.path().startsWith("/api/v1/")

/**
 * Extension property to check if the request is using legacy API paths.
 * 
 * This can be used to maintain backward compatibility while encouraging migration.
 */
val ApplicationCall.isLegacyApi: Boolean
    get() = request.path().startsWith("/api/") && !isApiV1

/**
 * Responds with a standardized Unsupported Media Type (415) error.
 * 
 * @param details Additional details about the error
 */
suspend fun ApplicationCall.respondUnsupportedMediaType(details: String = "Content-Type header must be 'application/json'") {
    val timeProvider: TimeProvider by application.dependencies
    respond(HttpStatusCode.UnsupportedMediaType, ErrorResponse(
        error = "Unsupported Media Type",
        details = details,
        timestamp = timeProvider.now().toString()
    ))
}

/**
 * Logs API request details for debugging and monitoring.
 * 
 * This function provides consistent logging across all endpoints.
 * 
 * @param operation The operation being performed (e.g., "CreateProject", "UpdateIssue")
 * @param details Additional details to log
 */
fun ApplicationCall.logApiOperation(operation: String, details: Map<String, Any?> = emptyMap()) {
    val logDetails = buildString {
        append("API Operation: $operation")
        append(" | Method: ${request.httpMethod.value}")
        append(" | Path: ${request.path()}")
        if (details.isNotEmpty()) {
            append(" | Details: $details")
        }
    }
    logger.debug(logDetails)
}