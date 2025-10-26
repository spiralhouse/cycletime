package io.spiralhouse.cycletime.dashboard.routes

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.api.routes.common.*
import io.spiralhouse.cycletime.application.services.DashboardApplicationService
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId

/**
 * Configures dashboard REST API routes.
 *
 * This module provides optimized endpoints for dashboard views with intelligent caching
 * and efficient data loading. All endpoints return denormalized DTOs optimized for
 * frontend rendering.
 *
 * ## Endpoints
 * - `GET /api/v1/dashboard` - Project list with basic statistics
 * - `GET /api/v1/dashboard/projects/{id}` - Complete project hierarchy
 * - `GET /api/v1/dashboard/stories/{id}/subtasks` - Story subtasks list
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
    route("/api/v1/dashboard") {
        listProjectsRoute()
        getProjectHierarchyRoute()
        getStorySubtasksRoute()
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

