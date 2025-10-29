package io.spiralhouse.cycletime.api.configuration

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.http.content.*
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

            // Static content serving (design system mockups, assets)
            staticResources("/mockups", "static/mockups") {
                // Enable directory index and default files
                default("design-system.html")
            }

            // Mock endpoints for design system HTMX examples (SPI-845)
            route("/mockups/api") {
                // Lazy load: returns HTML fragment of additional issues
                get("/lazy-load") {
                    val mockIssues = """
                        <div class="space-y-2">
                            <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:border-brand-500 transition-colors">
                                <div class="flex items-center gap-3">
                                    <span class="text-xs font-mono text-neutral-500">SPI-851</span>
                                    <span class="text-sm font-medium text-neutral-200">Implement user authentication</span>
                                    <span class="ml-auto px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-900/30 text-blue-300">In Progress</span>
                                </div>
                            </div>
                            <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:border-brand-500 transition-colors">
                                <div class="flex items-center gap-3">
                                    <span class="text-xs font-mono text-neutral-500">SPI-852</span>
                                    <span class="text-sm font-medium text-neutral-200">Add dashboard charts</span>
                                    <span class="ml-auto px-2.5 py-0.5 text-xs font-medium rounded-full bg-neutral-700 text-neutral-300">Todo</span>
                                </div>
                            </div>
                            <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4 hover:border-brand-500 transition-colors">
                                <div class="flex items-center gap-3">
                                    <span class="text-xs font-mono text-neutral-500">SPI-853</span>
                                    <span class="text-sm font-medium text-neutral-200">Optimize database queries</span>
                                    <span class="ml-auto px-2.5 py-0.5 text-xs font-medium rounded-full bg-neutral-700 text-neutral-300">Todo</span>
                                </div>
                            </div>
                        </div>
                    """.trimIndent()
                    call.respondText(mockIssues, ContentType.Text.Html)
                }

                // Optimistic UI: simulates toggle success
                get("/optimistic") {
                    kotlinx.coroutines.delay(500) // Simulate network delay
                    call.respondText("""
                        <span class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-900/30 text-green-300">Done</span>
                    """.trimIndent(), ContentType.Text.Html)
                }

                // Polling: returns current system status
                get("/status") {
                    val statuses = listOf("running", "running", "running", "degraded")
                    val status = statuses.random()
                    val color = if (status == "running") "green" else "yellow"
                    call.respondText("""
                        <div class="flex items-center gap-2">
                            <svg class="w-3 h-3 text-$color-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"/>
                            </svg>
                            <span class="text-sm text-neutral-300 capitalize">$status</span>
                            <span class="text-xs text-neutral-500 ml-2">Updated ${(0..60).random()}s ago</span>
                        </div>
                    """.trimIndent(), ContentType.Text.Html)
                }

                // Infinite scroll: returns next page of items
                get("/scroll") {
                    val page = call.request.queryParameters["page"]?.toIntOrNull() ?: 2
                    val mockItems = (1..3).map { i ->
                        val num = (page - 1) * 3 + i + 100
                        """
                        <div class="bg-neutral-900 border border-neutral-700 rounded-lg p-4">
                            <div class="flex items-center gap-3">
                                <span class="text-xs font-mono text-neutral-500">SPI-$num</span>
                                <span class="text-sm font-medium text-neutral-200">Sample issue $num</span>
                            </div>
                        </div>
                        """
                    }.joinToString("\n")

                    val loadMore = if (page < 5) {
                        """
                        <div id="load-trigger" hx-get="/mockups/api/scroll?page=${page + 1}" hx-trigger="intersect once" hx-swap="afterend">
                            <div class="text-center py-4">
                                <span class="text-sm text-neutral-500">Loading more...</span>
                            </div>
                        </div>
                        """
                    } else ""

                    call.respondText(mockItems + loadMore, ContentType.Text.Html)
                }
            }

            // Future route configurations can be added here:
            // configureSessionRoutes()
        }
    }
}