package io.spiralhouse.cycletime.api.routes

import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.api.routes.common.*
import io.spiralhouse.cycletime.api.validation.*
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.domain.valueobjects.*

/**
 * Configures Issue REST API routes with comprehensive endpoint support.
 * 
 * This module implements the Issue management API following RESTful principles
 * and Domain-Driven Design patterns. All business logic is delegated to the
 * application service layer, while this layer focuses on HTTP concerns.
 * 
 * ## API Design Philosophy
 * 
 * - **RESTful Resources**: Issues are treated as first-class resources
 * - **Hierarchical Organization**: Support for Epic → Story → Subtask hierarchy
 * - **Status Management**: Workflow-based status transitions
 * - **Project Context**: Issues can be accessed globally or within project scope
 * 
 * ## Endpoints Overview
 * 
 * ### Core CRUD Operations
 * - `POST /api/issues` - Create a new issue
 * - `GET /api/issues/{id}` - Retrieve an issue by ID
 * - `PUT /api/issues/{id}` - Update an existing issue
 * - `DELETE /api/issues/{id}` - Delete an issue
 * 
 * ### Project-Scoped Operations
 * - `GET /api/projects/{projectId}/issues` - List all issues in a project
 * 
 * ### Specialized Operations
 * - `POST /api/issues/{id}/status` - Transition issue status
 * - `GET /api/issues/{id}/hierarchy` - Get issue hierarchy tree
 * 
 * ## Business Rules Enforced
 * 
 * - **Epic Constraints**: Epics cannot have estimates or parent issues
 * - **Subtask Requirements**: Subtasks must have a parent story
 * - **Hierarchy Validation**: Enforces Epic → Story → Subtask structure
 * - **Status Workflow**: Validates transitions follow defined workflow
 * - **Estimate Rules**: Only leaf issues (stories without subtasks, subtasks) can have estimates
 * 
 * ## Error Handling
 * 
 * All endpoints return consistent error responses:
 * - `400 Bad Request` - Validation failures or business rule violations
 * - `404 Not Found` - Resource not found
 * - `500 Internal Server Error` - Unexpected server errors
 * 
 * ## Version Support
 * 
 * Currently supports:
 * - Legacy API: `/api/issues` (for backward compatibility)
 * - Future: `/api/v1/issues` (when versioning is implemented)
 * 
 * @since 1.0.0
 */
fun Route.configureIssueRoutes() {
    // Main issue routes under /api/issues
    route("/api/issues") {
        configureIssueCrudRoutes()
        configureIssueSpecializedRoutes()
    }
    
    // Project-scoped issue routes
    route("/api/projects/{projectId}/issues") {
        configureProjectIssuesRoute()
    }
}

/**
 * Configures the core CRUD (Create, Read, Update, Delete) routes for issues.
 * 
 * These routes handle the fundamental issue management operations that form
 * the foundation of the issue tracking system.
 */
private fun Route.configureIssueCrudRoutes() {
    createIssueRoute()
    getIssueRoute()
    updateIssueRoute()
    deleteIssueRoute()
}

/**
 * Configures specialized issue routes for advanced operations.
 * 
 * These routes handle domain-specific operations beyond basic CRUD.
 */
private fun Route.configureIssueSpecializedRoutes() {
    route("/{id}") {
        statusTransitionRoute()
        hierarchyRoute()
    }
}

/**
 * Creates a new issue.
 * 
 * ## Request Body
 * ```json
 * {
 *   "title": "Implement user authentication",
 *   "description": "Add OAuth2 authentication support",
 *   "type": "STORY",
 *   "projectId": "123e4567-e89b-12d3-a456-426614174000",
 *   "parentId": "123e4567-e89b-12d3-a456-426614174001",
 *   "estimate": 5,
 *   "assignee": "john.doe@example.com"
 * }
 * ```
 * 
 * ## Response
 * - `201 Created` - Issue created successfully with the created resource
 * - `400 Bad Request` - Validation failure or business rule violation
 * - `404 Not Found` - Project not found (if projectId provided)
 * 
 * ## Business Rules
 * - Epics cannot have estimates or parent issues
 * - Subtasks must have a parent issue
 * - Estimates must follow Fibonacci sequence (1, 2, 3, 5, 8, 13)
 */
private fun Route.createIssueRoute() {
    post {
        call.logApiOperation("CreateIssue")
        
        call.validateAndProcess<CreateIssueRequest>(
            validation = { it.validateForCreation() }
        ) { request ->
            call.executeServiceCall {
                val service = call.service<IssueApplicationService>()
                val command = buildCreateIssueCommand(request)
                val created = service.createIssue(command)
                call.respondCreated(created.toResponse())
            }
        }
    }
}

/**
 * Retrieves an issue by its ID.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the issue to retrieve
 * 
 * ## Response
 * - `200 OK` - Issue found and returned
 * - `404 Not Found` - Issue with given ID does not exist
 * - `400 Bad Request` - Invalid UUID format
 * 
 * ## Example
 * ```
 * GET /api/issues/123e4567-e89b-12d3-a456-426614174000
 * ```
 */
private fun Route.getIssueRoute() {
    get("/{id}") {
        call.logApiOperation("GetIssue", mapOf("id" to call.parameters["id"]))
        
        call.executeServiceCall {
            val issueId = call.extractIssueId()
            val service = call.service<IssueApplicationService>()
            val issue = service.getIssue(issueId)
            
            call.respondWithResource(
                resource = issue,
                transform = { it.toResponse() },
                notFoundMessage = "Issue not found",
                notFoundDetails = "No issue exists with ID: ${issueId.value}"
            )
        }
    }
}

/**
 * Updates an existing issue.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the issue to update
 * 
 * ## Request Body
 * Only provided fields will be updated (partial update support):
 * ```json
 * {
 *   "title": "Updated title",
 *   "description": "Updated description",
 *   "estimate": 8,
 *   "assignee": "jane.doe@example.com"
 * }
 * ```
 * 
 * ## Response
 * - `200 OK` - Issue updated successfully with the updated resource
 * - `404 Not Found` - Issue not found
 * - `400 Bad Request` - Validation failure
 * 
 * ## Notes
 * - Issue type cannot be changed after creation
 * - Parent relationships cannot be modified (maintain hierarchy integrity)
 * - Status changes should use the dedicated status transition endpoint
 */
private fun Route.updateIssueRoute() {
    put("/{id}") {
        call.logApiOperation("UpdateIssue", mapOf("id" to call.parameters["id"]))
        
        val issueId = call.extractIssueId()
        
        call.validateAndProcess<UpdateIssueRequest>(
            validation = { it.validateForUpdate() }
        ) { request ->
            call.executeServiceCall {
                val service = call.service<IssueApplicationService>()
                val command = buildUpdateIssueCommand(issueId, request)
                val updated = service.updateIssue(command)
                call.respondOk(updated.toResponse())
            }
        }
    }
}

/**
 * Deletes an issue.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the issue to delete
 * 
 * ## Response
 * - `204 No Content` - Issue deleted successfully
 * - `404 Not Found` - Issue not found
 * - `400 Bad Request` - Cannot delete issue with child issues
 * 
 * ## Cascade Behavior
 * - Deleting an issue with subtasks will fail
 * - Dependencies and blockers are automatically cleaned up
 * - Project issue count is automatically updated
 */
private fun Route.deleteIssueRoute() {
    delete("/{id}") {
        call.logApiOperation("DeleteIssue", mapOf("id" to call.parameters["id"]))
        
        call.executeServiceCall {
            val issueId = call.extractIssueId()
            val service = call.service<IssueApplicationService>()
            service.deleteIssue(issueId)
            call.respondNoContent()
        }
    }
}

/**
 * Lists all issues within a specific project.
 * 
 * ## Path Parameters
 * - `projectId` - The UUID of the project
 * 
 * ## Response
 * - `200 OK` - List of issues (may be empty)
 * - `404 Not Found` - Project not found
 * - `400 Bad Request` - Invalid project ID format
 * 
 * ## Response Format
 * ```json
 * {
 *   "issues": [...],
 *   "totalCount": 42
 * }
 * ```
 * 
 * ## Notes
 * - Returns all issues regardless of status
 * - Includes issues at all hierarchy levels (epics, stories, subtasks)
 * - Results are not paginated (future enhancement)
 */
private fun Route.configureProjectIssuesRoute() {
    get {
        call.logApiOperation("ListProjectIssues", mapOf("projectId" to call.parameters["projectId"]))
        
        call.executeServiceCall {
            val projectId = call.extractProjectId()
            
            // Verify project exists first
            val projectService = call.service<ProjectApplicationService>()
            val project = projectService.getProject(projectId)
            
            if (project == null) {
                call.respondNotFound(
                    "Project not found",
                    "No project exists with ID: ${projectId.value}"
                )
                return@executeServiceCall
            }
            
            // Get issues for the project
            val issueService = call.service<IssueApplicationService>()
            val issues = issueService.getIssuesByProject(projectId)
            call.respondOk(issues.toIssueListResponse())
        }
    }
}

/**
 * Transitions an issue to a new status.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the issue
 * 
 * ## Request Body
 * ```json
 * {
 *   "status": "IN_PROGRESS"
 * }
 * ```
 * 
 * ## Valid Status Values
 * - `TODO` - Initial state for new issues
 * - `IN_PROGRESS` - Work has started
 * - `IN_REVIEW` - Ready for review
 * - `DONE` - Completed
 * - `CANCELED` - Canceled/abandoned
 * 
 * ## Response
 * - `200 OK` - Status updated successfully with the updated issue
 * - `404 Not Found` - Issue not found
 * - `400 Bad Request` - Invalid status or transition not allowed
 * 
 * ## Workflow Rules
 * - TODO → IN_PROGRESS, CANCELED
 * - IN_PROGRESS → IN_REVIEW, TODO, CANCELED
 * - IN_REVIEW → DONE, IN_PROGRESS, CANCELED
 * - DONE → No transitions allowed
 * - CANCELED → TODO (reopen)
 */
private fun Route.statusTransitionRoute() {
    post("/status") {
        call.logApiOperation("TransitionIssueStatus", mapOf("id" to call.parameters["id"]))
        
        val issueId = call.extractIssueId()
        
        call.validateAndProcess<StatusTransitionRequest>(
            validation = { it.validateForStatusTransition() }
        ) { request ->
            call.executeServiceCall {
                val service = call.service<IssueApplicationService>()
                val newStatus = IssueStatus.fromString(request.status)
                val command = UpdateIssueStatusCommand(issueId, newStatus)
                val updated = service.updateStatus(command)
                call.respondOk(updated.toResponse())
            }
        }
    }
}

/**
 * Retrieves the complete hierarchy tree for an issue.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the issue
 * 
 * ## Response
 * - `200 OK` - Hierarchy tree with nested children
 * - `404 Not Found` - Issue not found
 * 
 * ## Response Structure
 * Returns a recursive tree structure:
 * ```json
 * {
 *   "issue": { ... },
 *   "children": [
 *     {
 *       "issue": { ... },
 *       "children": [ ... ]
 *     }
 *   ]
 * }
 * ```
 * 
 * ## Use Cases
 * - Visualizing epic breakdown into stories and subtasks
 * - Calculating aggregate estimates for parent issues
 * - Understanding work breakdown structure
 */
private fun Route.hierarchyRoute() {
    get("/hierarchy") {
        call.logApiOperation("GetIssueHierarchy", mapOf("id" to call.parameters["id"]))
        
        call.executeServiceCall {
            val issueId = call.extractIssueId()
            val service = call.service<IssueApplicationService>()
            val hierarchy = service.getIssueHierarchy(issueId)
            call.respondOk(hierarchy.toResponse())
        }
    }
}

// ================================================================================
// Command Builders
// ================================================================================

/**
 * Builds a CreateIssueCommand from a request DTO.
 * 
 * This function centralizes the mapping logic from API requests to domain commands,
 * ensuring consistent handling of optional fields and type conversions.
 * 
 * @param request The create issue request
 * @return The domain command object
 */
private fun buildCreateIssueCommand(request: CreateIssueRequest): CreateIssueCommand {
    return CreateIssueCommand(
        title = request.title,
        description = request.description,
        type = IssueType.fromString(request.type),
        parentId = request.parentId?.let { IssueId.fromString(it) },
        projectId = request.projectId?.let { ProjectId.fromString(it) },
        estimate = request.estimate?.let { Estimate.of(it) },
        assigneeId = request.assignee
    )
}

/**
 * Builds an UpdateIssueCommand from a request DTO.
 * 
 * @param issueId The ID of the issue to update
 * @param request The update issue request
 * @return The domain command object
 */
private fun buildUpdateIssueCommand(issueId: IssueId, request: UpdateIssueRequest): UpdateIssueCommand {
    return UpdateIssueCommand(
        id = issueId,
        title = request.title,
        description = request.description,
        estimate = request.estimate?.let { Estimate.of(it) },
        assigneeId = request.assignee
    )
}