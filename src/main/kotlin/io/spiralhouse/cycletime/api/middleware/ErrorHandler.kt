package io.spiralhouse.cycletime.api.middleware

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.spiralhouse.cycletime.api.dto.ErrorResponse
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException
import io.spiralhouse.cycletime.application.exceptions.WorkflowNotFoundException
import io.spiralhouse.cycletime.application.exceptions.SessionNotFoundException
import io.spiralhouse.cycletime.application.exceptions.ValidationException
import io.spiralhouse.cycletime.application.exceptions.HierarchyViolationException
import io.spiralhouse.cycletime.application.exceptions.BusinessRuleViolationException
import io.spiralhouse.cycletime.application.exceptions.InvalidStatusTransitionException
import io.spiralhouse.cycletime.application.exceptions.CircularDependencyException
import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.logging.ExceptionLogger
import kotlinx.serialization.SerializationException
import org.slf4j.LoggerFactory

/**
 * Centralized error handling middleware for REST API.
 *
 * This handler intercepts exceptions thrown during request processing and
 * converts them into appropriate HTTP responses with structured error messages.
 *
 * Exception mapping:
 * - [SerializationException] -> 400 Bad Request
 * - [ValidationException] -> 400 Bad Request
 * - [HierarchyViolationException] -> 400 Bad Request
 * - [BusinessRuleViolationException] -> 400 Bad Request
 * - [CircularDependencyException] -> 400 Bad Request
 * - [DomainException] -> 400 Bad Request
 * - [IllegalArgumentException] -> 400 Bad Request
 * - [InvalidStatusTransitionException] -> 422 Unprocessable Entity
 * - [ProjectNotFoundException] -> 404 Not Found
 * - [IssueNotFoundException] -> 404 Not Found
 * - [WorkflowNotFoundException] -> 404 Not Found
 * - [SessionNotFoundException] -> 404 Not Found
 * - [NotFoundException] -> 404 Not Found
 * - Other exceptions -> 500 Internal Server Error
 */
class ErrorHandler {
    companion object {
        private val logger = LoggerFactory.getLogger(ErrorHandler::class.java)
        
        /**
         * Install the error handler plugin in the application.
         * 
         * @param app The application to install the handler in
         * @param timeProvider The time provider for generating timestamps
         */
        fun install(app: Application, timeProvider: TimeProvider) {
            app.install(StatusPages) {
                exception<SerializationException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(
                            error = "Invalid JSON format",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }
                
                // Handle BadRequestException thrown by Ktor for malformed content
                exception<BadRequestException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(
                            error = "Bad Request",
                            details = cause.message ?: "Invalid request format",
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }
                
                exception<DomainException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(
                            error = "Validation error",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }
                
                exception<IllegalArgumentException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(
                            error = "Invalid request",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }
                
                exception<ProjectNotFoundException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse(
                            error = "Resource not found",
                            details = "The requested project does not exist",
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }
                
                exception<NotFoundException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse(
                            error = "Resource not found",
                            details = "The requested resource does not exist",
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                // Application-specific Not Found exceptions (404)
                exception<IssueNotFoundException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse(
                            error = "Issue not found",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                exception<WorkflowNotFoundException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse(
                            error = "Workflow not found",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                exception<SessionNotFoundException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.NotFound,
                        ErrorResponse(
                            error = "Session not found",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                // Application-specific Validation exceptions (400)
                exception<ValidationException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(
                            error = "Validation error",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                exception<HierarchyViolationException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(
                            error = "Hierarchy violation",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                exception<BusinessRuleViolationException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(
                            error = "Business rule violation",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                exception<CircularDependencyException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.BadRequest,
                        ErrorResponse(
                            error = "Circular dependency detected",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                // Application-specific Status Transition exception (422)
                exception<InvalidStatusTransitionException> { call, cause ->
                    logError(cause, call)
                    call.respond(
                        HttpStatusCode.UnprocessableEntity,
                        ErrorResponse(
                            error = "Invalid status transition",
                            details = cause.message,
                            timestamp = timeProvider.now().toString()
                        )
                    )
                }

                exception<Throwable> { call, cause ->
                    // Check if this is a JSON parsing exception based on class name or message
                    val isJsonError = cause::class.simpleName?.contains("Json", ignoreCase = true) == true ||
                                     cause.javaClass.name.contains("json", ignoreCase = true) ||
                                     cause.javaClass.name.contains("kotlinx.serialization", ignoreCase = true) ||
                                     cause.message?.contains("JSON", ignoreCase = true) == true ||
                                     cause.message?.contains("Unexpected JSON", ignoreCase = true) == true ||
                                     cause.message?.contains("Expected", ignoreCase = false) == true ||
                                     cause.message?.contains("but found", ignoreCase = false) == true ||
                                     cause.message?.contains("Unexpected character", ignoreCase = true) == true ||
                                     cause.message?.contains("at path", ignoreCase = true) == true
                    
                    if (isJsonError) {
                        logError(cause, call)
                        call.respond(
                            HttpStatusCode.BadRequest,
                            ErrorResponse(
                                error = "Invalid JSON format",
                                details = cause.message ?: "Malformed JSON in request body",
                                timestamp = timeProvider.now().toString()
                            )
                        )
                    } else {
                        logError(cause, call, isUnexpected = true)
                        call.respond(
                            HttpStatusCode.InternalServerError,
                            ErrorResponse(
                                error = "Internal server error",
                                details = cause.message,  // In production, consider hiding details for security
                                timestamp = timeProvider.now().toString()
                            )
                        )
                    }
                }
            }
        }
        
        /**
         * Log error details for debugging and monitoring.
         */
        private fun logError(
            cause: Throwable,
            call: ApplicationCall,
            isUnexpected: Boolean = false
        ) {
            val context = mapOf(
                "path" to call.request.path(),
                "method" to call.request.httpMethod.value,
                "queryParams" to call.request.queryParameters.entries().toString()
            )
            
            if (isUnexpected) {
                ExceptionLogger.logException(
                    logger,
                    cause,
                    "Unexpected error during request processing",
                    context
                )
            } else {
                logger.debug("Handled exception: ${cause.message}", cause)
            }
        }
    }
}

