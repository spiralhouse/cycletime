package io.spiralhouse.cycletime.api.routes

import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.api.routes.common.*
import io.spiralhouse.cycletime.api.validation.WorkflowValidation
import io.spiralhouse.cycletime.application.commands.CreateWorkflowCommand
import io.spiralhouse.cycletime.application.commands.UpdateWorkflowCommand
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId

/**
 * Configures Workflow REST API routes with versioning support.
 * 
 * This module implements the Workflow management API following RESTful principles
 * and Domain-Driven Design patterns. All business logic is delegated to the
 * application service layer, while this layer focuses on HTTP concerns.
 * 
 * ## API Design Philosophy
 * 
 * - **RESTful Resources**: Workflows are treated as first-class resources
 * - **Clean Architecture**: Strict separation between HTTP and domain layers
 * - **Consistent Patterns**: All endpoints follow the same error handling and response patterns
 * - **Version Support**: Supports both legacy and versioned API paths
 * 
 * ## Endpoints Overview
 * 
 * - `POST /api/workflows` - Create a new workflow
 * - `GET /api/workflows/{id}` - Retrieve a workflow by ID
 * - `PUT /api/workflows/{id}` - Update an existing workflow
 * - `DELETE /api/workflows/{id}` - Delete a workflow
 * - `GET /api/workflows` - List all workflows
 * - `GET /api/workflows/{id}/transitions` - Get valid transitions for a status
 * - `POST /api/workflows/{id}/validate-transition` - Validate a status transition
 * - `POST /api/workflows/default` - Create default workflow
 * - `POST /api/workflows/bug` - Create bug workflow
 * - `POST /api/workflows/feature` - Create feature workflow
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
 * - **API v1**: `/api/v1/workflows` - Current version
 * - **Legacy**: `/api/workflows` - Maintained for backward compatibility
 * 
 * @since 1.0.0
 */
fun Route.configureWorkflowRoutes() {
    // API v1 routes (preferred)
    route("/api/v1/workflows") {
        configureWorkflowCrudRoutes()
    }
    
    // Legacy routes (for backward compatibility)
    route("/api/workflows") {
        configureWorkflowCrudRoutes()
    }
}

/**
 * Configures the core CRUD routes for workflows.
 * 
 * This function groups all workflow management endpoints together,
 * making them reusable across different API versions.
 */
private fun Route.configureWorkflowCrudRoutes() {
    createWorkflowRoute()
    getWorkflowRoute()
    updateWorkflowRoute()
    deleteWorkflowRoute()
    listWorkflowsRoute()
    getTransitionsRoute()
    validateTransitionRoute()
    createDefaultWorkflowRoute()
    createBugWorkflowRoute()
    createFeatureWorkflowRoute()
}

/**
 * Creates a new workflow.
 * 
 * ## Request Body
 * ```json
 * {
 *   "name": "My Workflow",
 *   "description": "Workflow description",
 *   "initialStatus": "TODO",
 *   "allowedStatuses": ["TODO", "IN_PROGRESS", "DONE"]
 * }
 * ```
 * 
 * ## Response
 * - `201 Created` - Workflow created successfully with the created resource
 * - `400 Bad Request` - Validation failure
 * 
 * ## Validation Rules
 * - Name is required and must not exceed 255 characters
 * - Initial status must be included in allowed statuses
 * - Allowed statuses cannot be empty
 * - All status values must be valid IssueStatus enum values
 */
private fun Route.createWorkflowRoute() {
    post {
        call.logApiOperation("CreateWorkflow")
        
        call.validateAndProcess<CreateWorkflowRequest>(
            validation = { WorkflowValidation.validateCreateRequest(it) }
        ) { request ->
            call.executeServiceCall {
                val service = call.service<WorkflowApplicationService>()
                val command = CreateWorkflowCommand(
                    name = request.name,
                    description = request.description,
                    initialStatus = IssueStatus.fromString(request.initialStatus),
                    allowedStatuses = request.allowedStatuses.map { IssueStatus.fromString(it) }.toSet()
                )
                
                val created = service.createWorkflow(command)
                call.respondCreated(WorkflowResponse.fromDto(created))
            }
        }
    }
}

/**
 * Retrieves a workflow by its ID.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the workflow to retrieve
 * 
 * ## Response
 * - `200 OK` - Workflow found and returned
 * - `404 Not Found` - Workflow with given ID does not exist
 * - `400 Bad Request` - Invalid UUID format
 * 
 * ## Example
 * ```
 * GET /api/workflows/123e4567-e89b-12d3-a456-426614174000
 * ```
 */
private fun Route.getWorkflowRoute() {
    get("/{id}") {
        call.logApiOperation("GetWorkflow", mapOf("id" to call.parameters["id"]))
        
        call.executeServiceCall {
            val workflowId = call.extractWorkflowId("id")
            val service = call.service<WorkflowApplicationService>()
            val workflow = service.getWorkflow(workflowId)
            
            call.respondWithResource(
                resource = workflow,
                transform = { WorkflowResponse.fromDto(it) },
                notFoundMessage = "Workflow not found",
                notFoundDetails = "No workflow exists with ID: ${workflowId.value}"
            )
        }
    }
}

/**
 * Updates an existing workflow.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the workflow to update
 * 
 * ## Request Body
 * Only provided fields will be updated (partial update support):
 * ```json
 * {
 *   "name": "Updated Workflow Name",
 *   "description": "Updated description"
 * }
 * ```
 * 
 * ## Response
 * - `200 OK` - Workflow updated successfully with the updated resource
 * - `404 Not Found` - Workflow not found
 * - `400 Bad Request` - Validation failure
 * 
 * ## Notes
 * - Only name and description can be updated
 * - Validation rules apply to provided fields
 */
private fun Route.updateWorkflowRoute() {
    put("/{id}") {
        call.logApiOperation("UpdateWorkflow", mapOf("id" to call.parameters["id"]))
        
        val workflowId = call.extractWorkflowId("id")
        
        call.validateAndProcess<UpdateWorkflowRequest>(
            validation = { WorkflowValidation.validateUpdateRequest(it) }
        ) { request ->
            call.executeServiceCall {
                val service = call.service<WorkflowApplicationService>()
                val command = UpdateWorkflowCommand(
                    id = workflowId,
                    name = request.name,
                    description = request.description
                )
                
                val updated = service.updateWorkflow(command)
                call.respondOk(WorkflowResponse.fromDto(updated))
            }
        }
    }
}

/**
 * Deletes a workflow.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the workflow to delete
 * 
 * ## Response
 * - `204 No Content` - Workflow deleted successfully
 * - `404 Not Found` - Workflow not found
 * 
 * ## Notes
 * - All workflow data is permanently removed
 */
private fun Route.deleteWorkflowRoute() {
    delete("/{id}") {
        call.logApiOperation("DeleteWorkflow", mapOf("id" to call.parameters["id"]))
        
        call.executeServiceCall {
            val workflowId = call.extractWorkflowId("id")
            val service = call.service<WorkflowApplicationService>()
            val deleted = service.deleteWorkflow(workflowId)
            
            if (deleted) {
                call.respondNoContent()
            } else {
                call.respondNotFound("Workflow not found", "No workflow exists with ID: ${workflowId.value}")
            }
        }
    }
}

/**
 * Lists all workflows.
 * 
 * ## Response
 * - `200 OK` - List of workflows (may be empty)
 * 
 * ## Response Format
 * ```json
 * {
 *   "workflows": [...],
 *   "totalCount": 10
 * }
 * ```
 * 
 * ## Notes
 * - Returns all workflows (no pagination currently)
 * - Workflows are returned in creation order
 */
private fun Route.listWorkflowsRoute() {
    get {
        call.logApiOperation("ListWorkflows")
        
        call.executeServiceCall {
            val service = call.service<WorkflowApplicationService>()
            val workflows = service.listWorkflows()
            call.respondOk(WorkflowListResponse.fromWorkflowList(workflows))
        }
    }
}

/**
 * Gets valid transitions for a workflow from a specific status.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the workflow
 * 
 * ## Query Parameters
 * - `status` - The status to get transitions for (required)
 * 
 * ## Response
 * - `200 OK` - Valid transitions returned
 * - `400 Bad Request` - Missing or invalid status parameter
 * - `404 Not Found` - Workflow not found
 * 
 * ## Example
 * ```
 * GET /api/workflows/123e4567-e89b-12d3-a456-426614174000/transitions?status=TODO
 * ```
 */
private fun Route.getTransitionsRoute() {
    get("/{id}/transitions") {
        call.logApiOperation("GetTransitions", mapOf("id" to call.parameters["id"], "status" to call.request.queryParameters["status"]))
        
        call.executeServiceCall {
            val workflowId = call.extractWorkflowId("id")
            val statusParam = call.request.queryParameters["status"]
                ?: throw IllegalArgumentException("Query parameter status parameter is required")
            
            val status = IssueStatus.fromString(statusParam)
            val service = call.service<WorkflowApplicationService>()
            val transitions = service.getValidTransitions(workflowId, status)
            
            call.respondOk(TransitionsResponse(
                fromStatus = status.name,
                validTransitions = transitions.map { it.name }
            ))
        }
    }
}

/**
 * Validates a status transition for a workflow.
 * 
 * ## Path Parameters
 * - `id` - The UUID of the workflow
 * 
 * ## Request Body
 * ```json
 * {
 *   "fromStatus": "TODO",
 *   "toStatus": "IN_PROGRESS"
 * }
 * ```
 * 
 * ## Response
 * - `200 OK` - Validation result returned
 * - `400 Bad Request` - Invalid request body or status values
 * - `404 Not Found` - Workflow not found
 * 
 * ## Response Format
 * ```json
 * {
 *   "isValid": true,
 *   "reason": null
 * }
 * ```
 */
private fun Route.validateTransitionRoute() {
    post("/{id}/validate-transition") {
        call.logApiOperation("ValidateTransition", mapOf("id" to call.parameters["id"]))
        
        val workflowId = call.extractWorkflowId("id")
        
        call.validateAndProcess<ValidateTransitionRequest>(
            validation = { WorkflowValidation.validateTransitionValidationRequest(it) }
        ) { request ->
            call.executeServiceCall {
                val fromStatus = IssueStatus.fromString(request.fromStatus)
                val toStatus = IssueStatus.fromString(request.toStatus)
                val service = call.service<WorkflowApplicationService>()
                val result = service.validateTransition(workflowId, fromStatus, toStatus)
                
                call.respondOk(ValidationResponse.fromValidationResult(result))
            }
        }
    }
}

/**
 * Creates a default workflow with standard statuses.
 * 
 * ## Response
 * - `201 Created` - Default workflow created successfully
 * 
 * ## Default Configuration
 * - Name: "Default Workflow"
 * - Initial Status: TODO
 * - Allowed Statuses: TODO, IN_PROGRESS, DONE
 */
private fun Route.createDefaultWorkflowRoute() {
    post("/default") {
        call.logApiOperation("CreateDefaultWorkflow")
        
        call.executeServiceCall {
            val service = call.service<WorkflowApplicationService>()
            val created = service.createDefaultWorkflow()
            call.respondCreated(WorkflowResponse.fromDto(created))
        }
    }
}

/**
 * Creates a bug workflow optimized for bug tracking.
 * 
 * ## Response
 * - `201 Created` - Bug workflow created successfully
 * 
 * ## Bug Workflow Configuration
 * - Name: "Bug Workflow"
 * - Optimized for bug tracking processes
 */
private fun Route.createBugWorkflowRoute() {
    post("/bug") {
        call.logApiOperation("CreateBugWorkflow")
        
        call.executeServiceCall {
            val service = call.service<WorkflowApplicationService>()
            val created = service.createBugWorkflow()
            call.respondCreated(WorkflowResponse.fromDto(created))
        }
    }
}

/**
 * Creates a feature workflow optimized for feature development.
 * 
 * ## Response
 * - `201 Created` - Feature workflow created successfully
 * 
 * ## Feature Workflow Configuration
 * - Name: "Feature Workflow"
 * - Optimized for feature development processes
 */
private fun Route.createFeatureWorkflowRoute() {
    post("/feature") {
        call.logApiOperation("CreateFeatureWorkflow")
        
        call.executeServiceCall {
            val service = call.service<WorkflowApplicationService>()
            val created = service.createFeatureWorkflow()
            call.respondCreated(WorkflowResponse.fromDto(created))
        }
    }
}