package io.spiralhouse.cycletime.api.configuration

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.html.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.http.content.*
import kotlinx.html.*
import io.spiralhouse.cycletime.api.dto.ApiRootResponse
import io.spiralhouse.cycletime.api.dto.ApiEndpoints
import io.spiralhouse.cycletime.api.middleware.*
import io.spiralhouse.cycletime.api.routes.configureProjectRoutes
import io.spiralhouse.cycletime.api.routes.configureIssueRoutes
import io.spiralhouse.cycletime.api.routes.configureWorkflowRoutes
import io.spiralhouse.cycletime.dashboard.routes.configureDashboardRoutes
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.auth.authRoutes

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
            // Public routes - no authentication required

            // Login page (SPI-1314)
            get("/login") {
                val errorParam = call.request.queryParameters["error"]

                call.respondHtml(HttpStatusCode.OK) {
                    lang = "en"
                    head {
                        meta(charset = "UTF-8")
                        meta(name = "viewport", content = "width=device-width, initial-scale=1.0")
                        title { +"Login - CycleTime" }
                        script(src = "https://cdn.tailwindcss.com") {}
                    }
                    body {
                        div(classes = "min-h-screen bg-neutral-900 flex items-center justify-center") {
                            div(classes = "max-w-md w-full space-y-8 p-8") {
                                div(classes = "text-center") {
                                    h1(classes = "text-3xl font-bold text-blue-400") { +"CycleTime" }
                                    p(classes = "mt-2 text-neutral-400") { +"Sign in to access your dashboard" }
                                }

                                if (errorParam != null) {
                                    div(classes = "text-red-500 text-center") {
                                        when (errorParam) {
                                            "access_denied" -> +"Authentication error: Access denied. Please try again."
                                            else -> +"Authentication error occurred."
                                        }
                                    }
                                }

                                a(href = "/auth/login", classes = "w-full flex justify-center items-center py-3 px-4 rounded-md bg-neutral-800 text-white hover:bg-neutral-700") {
                                    unsafe {
                                        raw("""<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>""")
                                    }
                                    +"Login with GitHub"
                                }
                            }
                        }
                    }
                }
            }

            // Authentication routes (OAuth flow) - public
            authRoutes()

            // Protected routes - require authentication
            authenticate("session-auth") {
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
            }

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