package io.spiralhouse.cycletime.api.routes

import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.api.middleware.ValidationMiddleware
import io.spiralhouse.cycletime.api.routes.common.*
import io.spiralhouse.cycletime.application.commands.CreateProjectCommand
import io.spiralhouse.cycletime.application.commands.UpdateProjectCommand
import io.spiralhouse.cycletime.application.services.ProjectApplicationService

/**
 * Configures Project REST API routes with versioning support.
 * 
 * This module implements the Project management API following RESTful principles
 * and Domain-Driven Design patterns. All business logic is delegated to the
 * application service layer, while this layer focuses on HTTP concerns.
 * 
 * ## API Design Philosophy
 * 
 * - **RESTful Resources**: Projects are treated as first-class resources
 * - **Clean Architecture**: Strict separation between HTTP and domain layers
 * - **Consistent Patterns**: All endpoints follow the same error handling and response patterns
 * - **Version Support**: Supports both legacy and versioned API paths
 * 
 * ## Endpoints Overview
 * 
 * - `POST /api/v1/projects` - Create a new project
 * - `GET /api/v1/projects/{id}` - Retrieve a project by ID
 * - `PUT /api/v1/projects/{id}` - Update an existing project
 * - `DELETE /api/v1/projects/{id}` - Delete a project
 * - `GET /api/v1/projects` - List all projects
 * 
 * ## Error Handling
 * 
 * All endpoints return consistent error responses:
 * - `400 Bad Request` - Validation failures
 * - `404 Not Found` - Resource not found
 * - `500 Internal Server Error` - Unexpected server errors
 * 
 * ## Version Support
 * 
 * - **API v1**: `/api/v1/projects` - Current version
 * - **Legacy**: `/api/projects` - Maintained for backward compatibility
 * 
 * @since 1.0.0
 */
fun Route.configureProjectRoutes() {
    // API v1 routes (preferred)
    route("/api/v1/projects") {
        configureProjectCrudRoutes()
    }

    // Legacy routes - return 404 with migration guidance
    route("/api/projects") {
        configureLegacyProjectRoutes()
    }
}

/**
 * Configures the core CRUD routes for projects.
 * 
 * This function groups all project management endpoints together,
 * making them reusable across different API versions.
 */
private fun Route.configureProjectCrudRoutes() {
    createProjectRoute()
    getProjectRoute()
    updateProjectRoute()
    deleteProjectRoute()
    listProjectsRoute()
}

/**
 * Creates a new project.
 * 
 * ## Request Body
 * ```json
 * {
 *   "name": "My Project",
 *   "description": "Project description"
 * }
 * ```
 * 
 * ## Response
 * - `201 Created` - Project created successfully with the created resource
 * - `400 Bad Request` - Validation failure
 * 
 * ## Validation Rules
 * - Name is required and must not exceed 255 characters
 * - Description is optional but must not exceed 2000 characters if provided
 */
private fun Route.createProjectRoute() {
    post {
        call.logApiOperation("CreateProject")
        
        call.validateAndProcess<CreateProjectRequest>(
            validation = { ValidationMiddleware.validateCreateProjectRequest(it) }
        ) { request ->
            call.executeServiceCall {
                val service = call.service<ProjectApplicationService>()
                val command = CreateProjectCommand(
                    name = request.name,
                    description = request.description
                )
                
                val created = service.createProject(command)
                call.respondCreated(created.toResponse())
            }
        }
    }
}

/**
 * Retrieves a project by its ID.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the project to retrieve
 * 
 * ## Response
 * - `200 OK` - Project found and returned
 * - `404 Not Found` - Project with given ID does not exist
 * - `400 Bad Request` - Invalid UUID format
 * 
 * ## Example
 * ```
 * GET /api/v1/projects/123e4567-e89b-12d3-a456-426614174000
 * ```
 */
private fun Route.getProjectRoute() {
    get("/{id}") {
        call.logApiOperation("GetProject", mapOf("id" to call.parameters["id"]))
        
        call.executeServiceCall {
            val projectId = call.extractProjectId("id")
            val service = call.service<ProjectApplicationService>()
            val project = service.getProject(projectId)
            
            call.respondWithResource(
                resource = project,
                transform = { it.toResponse() },
                notFoundMessage = "Project not found",
                notFoundDetails = "No project exists with ID: ${projectId.value}"
            )
        }
    }
}

/**
 * Updates an existing project.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the project to update
 * 
 * ## Request Body
 * Only provided fields will be updated (partial update support):
 * ```json
 * {
 *   "name": "Updated Project Name",
 *   "description": "Updated description"
 * }
 * ```
 * 
 * ## Response
 * - `200 OK` - Project updated successfully with the updated resource
 * - `404 Not Found` - Project not found
 * - `400 Bad Request` - Validation failure
 * 
 * ## Notes
 * - At least one field must be provided for update
 * - Validation rules apply to provided fields
 */
private fun Route.updateProjectRoute() {
    put("/{id}") {
        call.logApiOperation("UpdateProject", mapOf("id" to call.parameters["id"]))
        
        val projectId = call.extractProjectId("id")
        
        call.validateAndProcess<UpdateProjectRequest>(
            validation = { ValidationMiddleware.validateUpdateProjectRequest(it) }
        ) { request ->
            call.executeServiceCall {
                val service = call.service<ProjectApplicationService>()
                val command = UpdateProjectCommand(
                    id = projectId,
                    name = request.name,
                    description = request.description
                )
                
                val updated = service.updateProject(command)
                call.respondOk(updated.toResponse())
            }
        }
    }
}

/**
 * Deletes a project.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the project to delete
 * 
 * ## Response
 * - `204 No Content` - Project deleted successfully
 * - `404 Not Found` - Project not found (Note: Currently returns 204 for idempotency)
 * - `400 Bad Request` - Cannot delete project with existing issues
 * 
 * ## Cascade Behavior
 * - Projects with issues cannot be deleted (must delete issues first)
 * - All project metadata is permanently removed
 */
private fun Route.deleteProjectRoute() {
    delete("/{id}") {
        call.logApiOperation("DeleteProject", mapOf("id" to call.parameters["id"]))
        
        call.executeServiceCall {
            val projectId = call.extractProjectId("id")
            val service = call.service<ProjectApplicationService>()
            service.deleteProject(projectId)
            call.respondNoContent()
        }
    }
}

/**
 * Lists all projects.
 *
 * ## Response
 * - `200 OK` - List of projects (may be empty)
 *
 * ## Response Format
 * ```json
 * {
 *   "projects": [...],
 *   "totalCount": 10
 * }
 * ```
 *
 * ## Notes
 * - Returns all projects (no pagination currently)
 * - Projects are returned in creation order
 * - Includes issue count for each project
 *
 * ## Future Enhancements
 * - Pagination support
 * - Sorting options (name, created date, issue count)
 * - Filtering by project attributes
 */
private fun Route.listProjectsRoute() {
    get {
        call.logApiOperation("ListProjects")

        call.executeServiceCall {
            val service = call.service<ProjectApplicationService>()
            val projectList = service.listProjects()
            call.respondOk(projectList.projects.toProjectListResponse())
        }
    }
}

/**
 * Configures legacy project routes to return 404 with migration guidance.
 *
 * All legacy `/api/projects` endpoints have been removed in favor of `/api/v1/projects`.
 */
private fun Route.configureLegacyProjectRoutes() {
    // Match all HTTP methods and paths
    get {
        call.respondNotFound(
            "Legacy endpoint not found",
            "This endpoint has been removed. Use /api/v1/projects instead. See documentation at /swagger"
        )
    }

    post {
        call.respondNotFound(
            "Legacy endpoint not found",
            "This endpoint has been removed. Use /api/v1/projects instead. See documentation at /swagger"
        )
    }

    route("/{id}") {
        get {
            call.respondNotFound(
                "Legacy endpoint not found",
                "This endpoint has been removed. Use /api/v1/projects/{id} instead. See documentation at /swagger"
            )
        }

        put {
            call.respondNotFound(
                "Legacy endpoint not found",
                "This endpoint has been removed. Use /api/v1/projects/{id} instead. See documentation at /swagger"
            )
        }

        delete {
            call.respondNotFound(
                "Legacy endpoint not found",
                "This endpoint has been removed. Use /api/v1/projects/{id} instead. See documentation at /swagger"
            )
        }
    }
}