package io.spiralhouse.cycletime.dashboard.routes

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.html.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.html.*
import kotlinx.html.stream.appendHTML
import io.spiralhouse.cycletime.api.routes.common.*
import io.spiralhouse.cycletime.application.services.DashboardApplicationService
import io.spiralhouse.cycletime.dashboard.views.projectsIndex
import io.spiralhouse.cycletime.dashboard.views.projectHierarchy
import io.spiralhouse.cycletime.dashboard.views.subtaskListFragment
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.infrastructure.auth.UserSession
import io.ktor.server.sessions.*

/**
 * Configures dashboard REST API routes.
 *
 * This module provides optimized endpoints for dashboard views with intelligent caching
 * and efficient data loading. All endpoints return denormalized DTOs optimized for
 * frontend rendering.
 *
 * ## API Endpoints (JSON)
 * - `GET /api/v1/dashboard` - Project list with basic statistics
 * - `GET /api/v1/dashboard/projects/{id}` - Complete project hierarchy
 * - `GET /api/v1/dashboard/stories/{id}/subtasks` - Story subtasks list
 *
 * ## HTML Endpoints (Browser UI)
 * - `GET /dashboard` - Projects list page (full HTML)
 * - `GET /dashboard/projects/{id}` - Project hierarchy page (full HTML, future)
 * - `GET /dashboard/stories/{id}/subtasks` - Subtasks fragment (HTMX, future)
 *
 * ## Caching Strategy
 * All endpoints leverage the DashboardApplicationService caching layer:
 * - Project lists cached for 5 minutes
 * - Project hierarchies cached for 5 minutes
 * - Story subtasks cached for 3 minutes
 *
 * ## Error Handling
 * - `400 Bad Request` - Invalid ID format
 * - `404 Not Found` - Resource not found
 * - `500 Internal Server Error` - Unexpected server errors
 *
 * @since 1.0.0
 */
fun Route.configureDashboardRoutes() {
    // JSON API routes
    route("/api/v1/dashboard") {
        listProjectsRoute()
        getProjectHierarchyRoute()
        getStorySubtasksRoute()
    }

    // HTML UI routes
    route("/dashboard") {
        htmlProjectsListRoute()
        htmlProjectHierarchyRoute()
        htmlStorySubtasksFragmentRoute()
    }
}

/**
 * Lists all projects with basic information.
 *
 * ## Response Format
 * ```json
 * [
 *   {
 *     "id": "proj-123",
 *     "name": "My Project",
 *     "description": "Project description",
 *     "status": "ACTIVE",
 *     "issueCount": 42,
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "updatedAt": "2024-01-15T12:30:00Z"
 *   }
 * ]
 * ```
 *
 * ## Performance
 * - Cached for 5 minutes
 * - Single database query
 * - Efficient for dashboard homepage
 */
private fun Route.listProjectsRoute() {
    get {
        call.logApiOperation("ListDashboardProjects")

        call.executeServiceCall {
            val service = call.service<DashboardApplicationService>()
            val projects = service.listProjects()
            call.respondOk(projects)
        }
    }
}

/**
 * Retrieves complete project hierarchy with organized issues.
 *
 * ## Path Parameters
 * - `id` - The UUID of the project
 *
 * ## Response Format
 * ```json
 * {
 *   "project": { ... },
 *   "epics": [
 *     {
 *       "issue": { ... },
 *       "children": [
 *         {
 *           "issue": { ... },
 *           "children": [ ... ]
 *         }
 *       ]
 *     }
 *   ],
 *   "orphanedStories": [ ... ],
 *   "statistics": {
 *     "totalIssues": 100,
 *     "epicCount": 10,
 *     "storyCount": 40,
 *     "subtaskCount": 50,
 *     "orphanedStoryCount": 2,
 *     "totalEstimatePoints": 250
 *   }
 * }
 * ```
 *
 * ## Error Responses
 * - `400` - Invalid project ID format
 * - `404` - Project not found
 *
 * ## Performance
 * - Cached for 5 minutes per project
 * - Two database queries: project + all issues
 * - Hierarchy built in-memory (no N+1 queries)
 */
private fun Route.getProjectHierarchyRoute() {
    get("/projects/{id}") {
        call.logApiOperation("GetProjectHierarchy", mapOf("id" to call.parameters["id"]))

        call.executeServiceCall {
            val projectId = try {
                call.extractProjectId("id")
            } catch (e: IllegalArgumentException) {
                // Invalid UUID format
                call.respondBadRequest(
                    error = "Invalid project ID format",
                    details = e.message ?: "The provided project ID is not a valid UUID"
                )
                return@executeServiceCall
            }

            val service = call.service<DashboardApplicationService>()

            try {
                val hierarchy = service.getProjectHierarchy(projectId)
                call.respondOk(hierarchy)
            } catch (e: IllegalArgumentException) {
                // Project not found
                call.respondNotFound(
                    error = "Project not found",
                    details = e.message ?: "No project exists with ID: ${projectId.value}"
                )
            }
        }
    }
}

/**
 * Retrieves all subtasks for a specific story.
 *
 * ## Path Parameters
 * - `id` - The UUID of the story
 *
 * ## Response Format
 * ```json
 * [
 *   {
 *     "id": "issue-123",
 *     "title": "Implement feature X",
 *     "description": "...",
 *     "type": "SUBTASK",
 *     "status": "IN_PROGRESS",
 *     "parentId": "story-456",
 *     "projectId": "proj-789",
 *     "estimate": 3,
 *     "assigneeId": "user-101",
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "updatedAt": "2024-01-15T12:30:00Z"
 *   }
 * ]
 * ```
 *
 * ## Error Responses
 * - `400` - Invalid story ID format
 * - `404` - Story not found
 *
 * ## Performance
 * - Cached for 3 minutes per story
 * - Single database query for subtasks
 */
private fun Route.getStorySubtasksRoute() {
    get("/stories/{id}/subtasks") {
        call.logApiOperation("GetStorySubtasks", mapOf("id" to call.parameters["id"]))

        call.executeServiceCall {
            val storyId = try {
                call.extractIssueId("id")
            } catch (e: IllegalArgumentException) {
                // Invalid UUID format
                call.respondBadRequest(
                    error = "Invalid issue ID format",
                    details = e.message ?: "The provided issue ID is not a valid UUID"
                )
                return@executeServiceCall
            }

            val service = call.service<DashboardApplicationService>()

            try {
                val subtasks = service.getStorySubtasks(storyId)
                call.respondOk(subtasks)
            } catch (e: IllegalArgumentException) {
                // Story not found or not a story type
                call.respondNotFound(
                    error = "Story not found",
                    details = e.message ?: "No story exists with ID: ${storyId.value}"
                )
            }
        }
    }
}

/**
 * Renders the HTML projects list page.
 *
 * This endpoint provides a browser-accessible dashboard with a responsive grid
 * of project cards, service health status, and empty state handling.
 *
 * ## Response Format
 * Returns a complete HTML page with:
 * - DOCTYPE and meta tags
 * - Tailwind CSS and HTMX CDN links
 * - Service health header
 * - Responsive project grid (1/2/3 columns)
 * - Empty state when no projects exist
 *
 * ## Performance
 * - Uses cached project data from DashboardApplicationService
 * - No additional database queries beyond service layer
 * - Lightweight HTML rendering with Ktor HTML DSL
 *
 * @since 1.0.0 (SPI-798)
 */
private fun Route.htmlProjectsListRoute() {
    get {
        call.logApiOperation("RenderDashboardHtml")

        call.executeServiceCall {
            // Retrieve DashboardApplicationService from DI container
            val service = call.service<DashboardApplicationService>()

            // Fetch projects (uses caching, same as JSON API)
            val projects = service.listProjects()

            // Get user session for header
            val userSession = call.sessions.get<UserSession>()

            // Render HTML response
            call.respondHtml(HttpStatusCode.OK) {
                projectsIndex(projects, userSession)
            }
        }
    }
}

/**
 * Renders the HTML project hierarchy page.
 *
 * This endpoint provides a complete project view with organized issue hierarchy,
 * displaying epics, stories, and lazy-loaded subtasks using HTMX.
 *
 * ## Path Parameters
 * - `id` - The UUID of the project
 *
 * ## Response Format
 * Returns a complete HTML page with:
 * - DOCTYPE and meta tags
 * - Tailwind CSS and HTMX CDN links
 * - Service health header
 * - Project metadata and statistics
 * - Epic → Story → Subtask hierarchy
 * - HTMX lazy loading for subtasks
 * - Orphaned stories section
 *
 * ## HTMX Integration
 * Story nodes include buttons that lazy-load subtasks:
 * - Button triggers `GET /dashboard/stories/{id}/subtasks`
 * - Response is HTML fragment (not full page)
 * - Fragment injected into target div via `innerHTML`
 *
 * ## Error Responses
 * - `400` - Invalid project ID format
 * - `404` - Project not found
 *
 * ## Performance
 * - Uses cached hierarchy data from DashboardApplicationService
 * - Subtasks loaded on-demand to reduce initial page size
 *
 * @since 1.0.0 (SPI-799)
 */
private fun Route.htmlProjectHierarchyRoute() {
    get("/projects/{id}") {
        call.logApiOperation("RenderProjectHierarchyHtml", mapOf("id" to call.parameters["id"]))

        call.executeServiceCall {
            // Extract and validate project ID
            val projectId = try {
                call.extractProjectId("id")
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest, "Invalid project ID format")
                return@executeServiceCall
            }

            // Get service from DI
            val service = call.service<DashboardApplicationService>()

            try {
                // Fetch hierarchy (uses caching)
                val hierarchy = service.getProjectHierarchy(projectId)

                // Get user session for header
                val userSession = call.sessions.get<UserSession>()

                // Render HTML
                call.respondHtml(HttpStatusCode.OK) {
                    projectHierarchy(hierarchy, userSession)
                }
            } catch (e: IllegalArgumentException) {
                // Project not found
                call.respond(HttpStatusCode.NotFound, "Project not found")
            }
        }
    }
}

/**
 * HTMX fragment endpoint - returns HTML fragment only (no full page).
 *
 * ⚠️ CRITICAL: This endpoint returns a fragment, not a full HTML page!
 * It's designed to be consumed by HTMX for dynamic content injection.
 *
 * ## Path Parameters
 * - `id` - The UUID of the story
 *
 * ## Response Format
 * Returns an HTML fragment (NO DOCTYPE, html, head, or body tags):
 * - List of subtask items with metadata
 * - Status badges and estimates
 * - Empty state if no subtasks exist
 *
 * ## HTMX Usage
 * This endpoint is called by HTMX buttons in story nodes:
 * ```html
 * <button hx-get="/dashboard/stories/{id}/subtasks"
 *         hx-target="#subtasks-{id}"
 *         hx-swap="innerHTML">
 *   Load Subtasks
 * </button>
 * ```
 *
 * ## Error Responses
 * - `400` - Invalid story ID format
 * - `404` - Story not found or not a story type
 *
 * ## Fragment Pattern
 * Uses `buildString { appendHTML().div {} }` to create ONLY inner content:
 * - Avoids `respondHtml { html {} }` which creates full page
 * - Returns raw HTML string with `Content-Type: text/html`
 * - HTMX injects this into existing page via `innerHTML`
 *
 * ## Performance
 * - Uses cached subtask data from DashboardApplicationService
 * - Minimal HTML payload for fast injection
 *
 * @since 1.0.0 (SPI-799)
 */
private fun Route.htmlStorySubtasksFragmentRoute() {
    get("/stories/{id}/subtasks") {
        call.logApiOperation("RenderSubtasksFragmentHtml", mapOf("id" to call.parameters["id"]))

        call.executeServiceCall {
            // Extract and validate story ID
            val storyId = try {
                call.extractIssueId("id")
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest, "Invalid story ID format")
                return@executeServiceCall
            }

            // Get service from DI
            val service = call.service<DashboardApplicationService>()

            try {
                // Fetch subtasks (uses caching)
                val subtasks = service.getStorySubtasks(storyId)

                // ⚠️ CRITICAL: Return fragment only using buildString + appendHTML
                // Do NOT use respondHtml { html { ... } } - that creates full page!
                val fragmentHtml = buildString {
                    appendHTML().div {
                        subtaskListFragment(subtasks)
                    }
                }

                call.respondText(
                    text = fragmentHtml,
                    contentType = ContentType.Text.Html,
                    status = HttpStatusCode.OK
                )
            } catch (e: IllegalArgumentException) {
                // Story not found or not a story type
                call.respond(HttpStatusCode.NotFound, "Story not found")
            }
        }
    }
}

