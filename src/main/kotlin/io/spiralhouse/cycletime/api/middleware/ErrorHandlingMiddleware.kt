package io.spiralhouse.cycletime.api.middleware

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.plugins.di.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.spiralhouse.cycletime.api.dto.ErrorResponse
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.application.exceptions.*
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import org.slf4j.LoggerFactory

/**
 * Comprehensive error handling middleware for the API layer.
 * 
 * This middleware provides a centralized error handling strategy that ensures:
 * - Consistent error response formats across all endpoints
 * - Proper HTTP status code mapping for domain exceptions
 * - Detailed error messages for debugging (in development mode)
 * - Security-conscious error responses (in production mode)
 * 
 * ## Error Categories
 * 
 * ### Client Errors (4xx)
 * - **400 Bad Request**: Validation failures, malformed requests
 * - **404 Not Found**: Resource not found
 * - **415 Unsupported Media Type**: Missing or invalid Content-Type
 * - **422 Unprocessable Entity**: Business rule violations
 * 
 * ### Server Errors (5xx)
 * - **500 Internal Server Error**: Unexpected errors
 * - **503 Service Unavailable**: Database connection issues
 * 
 * ## Security Considerations
 * 
 * In production mode, error details are sanitized to prevent information leakage.
 * Stack traces and internal error details are logged but not exposed to clients.
 * 
 * @since 1.0.0
 */
object ErrorHandlingMiddleware {
    
    private val logger = LoggerFactory.getLogger(ErrorHandlingMiddleware::class.java)
    private val json = Json { 
        ignoreUnknownKeys = true
        isLenient = true
    }
    
    /**
     * Mapping of exception types to HTTP status codes and error categories.
     */
    private val exceptionMapping = mapOf(
        // Domain exceptions
        ProjectNotFoundException::class to (HttpStatusCode.NotFound to "Project not found"),
        IssueNotFoundException::class to (HttpStatusCode.NotFound to "Issue not found"),
        SessionNotFoundException::class to (HttpStatusCode.NotFound to "Session not found"),
        
        // Business rule violations
        HierarchyViolationException::class to (HttpStatusCode.UnprocessableEntity to "Hierarchy violation"),
        InvalidStatusTransitionException::class to (HttpStatusCode.UnprocessableEntity to "Invalid status transition"),
        
        // Validation errors
        IllegalArgumentException::class to (HttpStatusCode.BadRequest to "Invalid request"),
        
        // Serialization errors
        SerializationException::class to (HttpStatusCode.BadRequest to "Invalid request format"),
        
        // Content type errors
        UnsupportedMediaTypeException::class to (HttpStatusCode.UnsupportedMediaType to "Unsupported media type")
    )
    
    /**
     * Installs the error handling middleware in the application.
     * 
     * This should be called early in the application configuration to ensure
     * all exceptions are properly handled.
     */
    fun Application.installErrorHandling() {
        install(StatusPages) {
            // Handle all exceptions with consistent error responses
            exception<Throwable> { call, cause ->
                handleException(call, cause)
            }
            
            // Handle specific HTTP status codes
            status(HttpStatusCode.UnsupportedMediaType) { call, status ->
                val timeProvider: TimeProvider by call.application.dependencies
                call.respond(
                    status,
                    ErrorResponse(
                        error = "Unsupported Media Type",
                        details = "Content-Type header must be 'application/json'",
                        timestamp = timeProvider.now().toString()
                    )
                )
            }
            
            status(HttpStatusCode.NotFound) { call, status ->
                if (call.response.status() == null) {
                    val timeProvider: TimeProvider by call.application.dependencies
                    call.respond(
                        status,
                        ErrorResponse(
                            error = "Resource not found",
                            details = "The requested resource could not be found",
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }
            }
        }
    }
    
    /**
     * Handles an exception and generates an appropriate error response.
     * 
     * @param call The application call context
     * @param cause The exception that was thrown
     */
    private suspend fun handleException(call: ApplicationCall, cause: Throwable) {
        val timeProvider: TimeProvider by call.application.dependencies
        
        // Determine status code and error message based on exception type
        val (statusCode, errorMessage, details) = when (cause) {
            // Handle specific validation errors with detailed messages
            is IllegalArgumentException -> {
                val message = cause.message ?: "Invalid request"
                val errorDetails = extractValidationDetails(message)
                Triple(HttpStatusCode.BadRequest, errorDetails.first, errorDetails.second)
            }
            
            // Handle request body errors
            is BadRequestException -> {
                when {
                    cause.cause is SerializationException -> {
                        Triple(HttpStatusCode.BadRequest, "Invalid JSON format", "Request body must be valid JSON")
                    }
                    cause.message?.contains("Request body") == true -> {
                        Triple(HttpStatusCode.BadRequest, "Request body is required", "The request must include a valid JSON body")
                    }
                    else -> {
                        Triple(HttpStatusCode.BadRequest, "Bad request", cause.message)
                    }
                }
            }
            
            // Handle missing Content-Type
            is UnsupportedMediaTypeException -> {
                Triple(HttpStatusCode.UnsupportedMediaType, "Unsupported Media Type", "Content-Type header must be 'application/json'")
            }
            
            // Map other exceptions using the predefined mapping
            else -> {
                val mapping = exceptionMapping.entries.find { (type, _) ->
                    type.isInstance(cause)
                }
                
                if (mapping != null) {
                    val (status, error) = mapping.value
                    Triple(status, error, cause.message)
                } else {
                    // Unknown exception - log it and return generic error
                    logger.error("Unhandled exception in API", cause)
                    Triple(
                        HttpStatusCode.InternalServerError,
                        "Internal server error",
                        if (isDevelopmentMode(call)) cause.message else "An unexpected error occurred"
                    )
                }
            }
        }
        
        // Send the error response
        call.respond(
            statusCode,
            ErrorResponse(
                error = errorMessage,
                details = details,
                timestamp = timeProvider.now().toString()
            )
        )
    }
    
    /**
     * Extracts detailed validation information from error messages.
     * 
     * This function parses common validation error patterns and provides
     * user-friendly error messages with specific details.
     * 
     * @param message The error message to parse
     * @return A pair of (error summary, detailed message)
     */
    private fun extractValidationDetails(message: String): Pair<String, String?> {
        return when {
            // Issue status validation errors
            message.startsWith("Invalid issue status:") -> {
                val status = message.substringAfter("Invalid issue status:").substringBefore(".").trim()
                "Invalid status: $status" to "Valid statuses are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED"
            }
            message.startsWith("Invalid IssueStatus:") -> {
                val status = message.substringAfter("Invalid IssueStatus:").trim()
                "Invalid status: $status" to "Valid statuses are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED"
            }
            
            // UUID validation errors
            message.contains("Invalid UUID") -> {
                val id = message.substringAfter("Invalid UUID format:").trim()
                "Invalid UUID format" to if (id.isNotBlank()) "Invalid ID: $id" else "The provided ID is not a valid UUID"
            }
            
            // Empty value errors
            message.contains("cannot be empty") || message.contains("must not be empty") -> {
                val field = message.substringBefore("cannot be empty").substringBefore("must not be empty").trim()
                "$field is required" to message
            }
            
            // Issue type validation errors
            message.startsWith("Invalid issue type:") -> {
                val type = message.substringAfter("Invalid issue type:").substringBefore(".").trim()
                "Invalid issue type: $type" to "Valid types are: EPIC, STORY, SUBTASK"
            }
            
            // Estimate validation errors
            message.startsWith("Invalid estimate:") -> {
                val estimate = message.substringAfter("Invalid estimate:").substringBefore(".").trim()
                "Invalid estimate: $estimate" to "Valid estimates follow Fibonacci sequence: 1, 2, 3, 5, 8, 13"
            }
            
            // Default case - return the message as-is
            else -> message to null
        }
    }
    
    /**
     * Checks if the application is running in development mode.
     * 
     * In development mode, more detailed error information is exposed
     * to aid in debugging.
     * 
     * @param call The application call context
     * @return true if in development mode, false otherwise
     */
    private fun isDevelopmentMode(call: ApplicationCall): Boolean {
        return call.application.environment.config.propertyOrNull("ktor.development")
            ?.getString()?.toBoolean() == true
    }
    
    /**
     * Validates that a request has the correct Content-Type header.
     * 
     * @param call The application call to validate
     * @throws UnsupportedMediaTypeException if Content-Type is missing or incorrect
     */
    suspend fun validateContentType(call: ApplicationCall) {
        val contentType = call.request.contentType()
        if (contentType.contentType != "application" || contentType.contentSubtype != "json") {
            throw UnsupportedMediaTypeException("Content-Type must be application/json")
        }
    }
    
    /**
     * Validates that a request body is present and not empty.
     * 
     * @param call The application call to validate
     * @throws BadRequestException if the request body is missing or empty
     */
    suspend fun validateRequestBodyPresent(call: ApplicationCall) {
        try {
            val channel = call.receiveChannel()
            if (channel.isClosedForRead) {
                throw BadRequestException("Request body is required")
            }
        } catch (e: Exception) {
            when (e) {
                is BadRequestException -> throw e
                else -> throw BadRequestException("Request body is required")
            }
        }
    }
}

/**
 * Custom exception for unsupported media type errors.
 */
class UnsupportedMediaTypeException(message: String) : Exception(message)