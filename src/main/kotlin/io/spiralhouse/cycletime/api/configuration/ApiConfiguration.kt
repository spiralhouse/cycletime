package io.spiralhouse.cycletime.api.configuration

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.api.dto.ApiRootResponse
import io.spiralhouse.cycletime.api.dto.ApiEndpoints
import io.spiralhouse.cycletime.api.middleware.*
import io.spiralhouse.cycletime.api.routes.configureProjectRoutes
import io.spiralhouse.cycletime.api.routes.configureIssueRoutes
import io.spiralhouse.cycletime.api.routes.configureWorkflowRoutes
import io.spiralhouse.cycletime.dashboard.routes.configureDashboardRoutes
import io.spiralhouse.cycletime.domain.services.TimeProvider

/**
 * Main API configuration module.
 * 
 * This module centralizes all API-related configuration including:
 * - Middleware installation (error handling, CORS, logging)
 * - Route configuration
 * - API versioning setup
 */
object ApiConfiguration {
    
    /**
     * Configure the complete API stack for the application.
     * 
     * @param app The application to configure
     * @param timeProvider The time provider for timestamps
     */
    fun configure(app: Application, timeProvider: TimeProvider) {
        // Install middleware components in the correct order
        configureMiddleware(app, timeProvider)
        
        // Configure API routes
        configureRoutes(app)
    }
    
    /**
     * Install and configure all middleware components.
     *
     * Order matters: error handling should be installed first to catch
     * exceptions from other middleware and routes.
     *
     * @param app The application to configure
     * @param timeProvider The time provider for timestamps
     */
    private fun configureMiddleware(app: Application, timeProvider: TimeProvider) {
        // Error handling must be first to catch exceptions from other components
        ErrorHandler.install(app, timeProvider)

        // API version header for all responses
        app.intercept(ApplicationCallPipeline.Plugins) {
            call.response.headers.append("X-API-Version", "v1")
        }

        // CORS configuration for cross-origin requests
        CorsConfiguration.install(app)

        // Request/response logging and tracing
        RequestLogging.install(app)
    }
    
    /**
     * Configure all API routes.
     *
     * @param app The application to configure
     */
    private fun configureRoutes(app: Application) {
        app.routing {
            // API root endpoint
            get("/api/v1") {
                try {
                    call.respond(HttpStatusCode.OK, ApiRootResponse(
                        version = "v1",
                        service = "CycleTime",
                        description = "CycleTime CE API",
                        endpoints = ApiEndpoints(
                            projects = "/api/v1/projects",
                            workflows = "/api/v1/workflows",
                            issues = "/api/v1/projects/{projectId}/issues"
                        ),
                        documentation = "/swagger"
                    ))
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.InternalServerError, mapOf(
                        "error" to "Internal error",
                        "message" to (e.message ?: "Unknown error")
                    ))
                }
            }

            // OPTIONS handler for all v1 endpoints
            options("/api/v1/{...}") {
                call.response.headers.append("X-API-Version", "v1")
                call.respond(HttpStatusCode.OK)
            }

            // Project management endpoints
            configureProjectRoutes()

            // Issue management endpoints
            configureIssueRoutes()

            // Workflow management endpoints
            configureWorkflowRoutes()

            // Dashboard endpoints
            configureDashboardRoutes()

            // Future route configurations can be added here:
            // configureSessionRoutes()
        }
    }
}