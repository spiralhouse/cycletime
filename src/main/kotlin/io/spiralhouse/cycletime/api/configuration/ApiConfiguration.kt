package io.spiralhouse.cycletime.api.configuration

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.api.middleware.*
import io.spiralhouse.cycletime.api.routes.configureProjectRoutes
import io.spiralhouse.cycletime.api.routes.configureIssueRoutes
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
            // Project management endpoints
            configureProjectRoutes()
            
            // Issue management endpoints
            configureIssueRoutes()
            
            // Future route configurations can be added here:
            // configureSessionRoutes()
            // configureWorkflowRoutes()
        }
    }
}