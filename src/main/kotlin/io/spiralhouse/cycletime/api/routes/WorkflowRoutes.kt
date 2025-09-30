package io.spiralhouse.cycletime.api.routes

import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.routing.*
import io.spiralhouse.cycletime.api.dto.*
import io.spiralhouse.cycletime.api.routes.common.*
import io.spiralhouse.cycletime.api.validation.WorkflowValidation
import io.spiralhouse.cycletime.application.dto.WorkflowDto
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus

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
 * ### CRUD Operations
 * - `POST /api/workflows` - Create a new workflow
 * - `GET /api/workflows/{id}` - Retrieve a workflow by ID
 * - `PUT /api/workflows/{id}` - Update an existing workflow
 * - `DELETE /api/workflows/{id}` - Delete a workflow
 * - `GET /api/workflows` - List all workflows
 * 
 * ### Workflow Transitions
 * - `GET /api/workflows/{id}/transitions?status={status}` - Get valid transitions for a status
 * - `POST /api/workflows/{id}/validate-transition` - Validate a status transition
 * 
 * ### Predefined Workflows
 * - `POST /api/workflows/default` - Create default workflow (TODO → IN_PROGRESS → DONE)
 * - `POST /api/workflows/bug` - Create bug workflow optimized for bug tracking
 * - `POST /api/workflows/feature` - Create feature workflow optimized for feature development
 * 
 * ## Error Handling
 * 
 * All endpoints return consistent error responses:
 * - `400 Bad Request` - Validation failures or invalid request format
 * - `404 Not Found` - Workflow not found
 * - `422 Unprocessable Entity` - Invalid state transitions
 * - `500 Internal Server Error` - Unexpected server errors
 * 
 * ## Version Support
 * 
 * - **API v1**: `/api/v1/workflows` - Current version with full feature support
 * - **Legacy**: `/api/workflows` - Maintained for backward compatibility
 * 
 * @since 1.0.0
 */
fun Route.configureWorkflowRoutes() {
    // API v1 routes (preferred)
    route("/api/v1/workflows") {
        configureWorkflowV1Routes()
    }

    // Legacy routes - return 404 with migration guidance
    route("/api/workflows") {
        configureLegacyWorkflowRoutes()
    }
}

/**
 * Configures V1 API routes for workflows with query parameter templates.
 *
 * ## Route Organization
 * - **CRUD Operations**: Basic workflow management
 * - **Transition Operations**: Resource-based transition URLs
 * - **Template Support**: Query parameter-based templates (template=default|bug|feature)
 */
private fun Route.configureWorkflowV1Routes() {
    // Core CRUD operations
    createWorkflowWithTemplateRoute()
    getWorkflowRoute()
    updateWorkflowRoute()
    deleteWorkflowRoute()
    listWorkflowsRoute()

    // Resource-based transition operations
    route("/{id}") {
        getAllTransitionsRoute()
        route("/transitions") {
            validateTransitionResourceRoute()
        }
    }
}

/**
 * Creates a new workflow with optional template support via query parameter.
 *
 * ## Query Parameters
 * - `template` (optional): Template name (default, bug, feature)
 *
 * ## Request Body (required if no template)
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
 * - `201 Created` - Workflow created successfully
 * - `400 Bad Request` - Validation failure or invalid template
 *
 * ## Template Support
 * - `?template=default` - Creates default workflow
 * - `?template=bug` - Creates bug tracking workflow
 * - `?template=feature` - Creates feature development workflow
 * - Template parameter takes precedence over request body
 */
private fun Route.createWorkflowWithTemplateRoute() {
    post {
        call.logApiOperation("CreateWorkflow")

        call.executeServiceCall {
            val service = call.service<WorkflowApplicationService>()
            val templateParam = call.request.queryParameters["template"]?.trim()?.lowercase()

            // Check for multiple template parameters
            val templateParams = call.request.queryParameters.getAll("template")
            if (templateParams != null && templateParams.size > 1) {
                call.respondBadRequest(
                    "Multiple template parameters not allowed",
                    "Only one template parameter is allowed. Found: ${templateParams.size}"
                )
                return@executeServiceCall
            }

            when {
                // Template parameter provided
                templateParam != null -> {
                    when {
                        templateParam.isEmpty() -> {
                            call.respondBadRequest(
                                "Invalid template",
                                "Template parameter cannot be empty. Supported values: default, bug, feature"
                            )
                        }
                        templateParam == "default" -> {
                            val created = service.createDefaultWorkflow()
                            call.respondCreated(WorkflowResponse.fromDto(created))
                        }
                        templateParam == "bug" -> {
                            val created = service.createBugWorkflow()
                            call.respondCreated(WorkflowResponse.fromDto(created))
                        }
                        templateParam == "feature" -> {
                            val created = service.createFeatureWorkflow()
                            call.respondCreated(WorkflowResponse.fromDto(created))
                        }
                        else -> {
                            call.respondBadRequest(
                                "Invalid template",
                                "Invalid template '$templateParam'. Supported values: default, bug, feature"
                            )
                        }
                    }
                }
                // No template - expect request body
                else -> {
                    try {
                        val request = call.receive<CreateWorkflowRequest>()
                        WorkflowValidation.validateCreateRequest(request)

                        val command = request.toCreateCommand()
                        val created = service.createWorkflow(command)
                        call.respondCreated(WorkflowResponse.fromDto(created))
                    } catch (e: IllegalArgumentException) {
                        call.respondBadRequest(
                            "Validation failed",
                            e.message ?: "Invalid request"
                        )
                    } catch (e: Exception) {
                        call.respondBadRequest(
                            "Missing template parameter or request body required",
                            "Either provide a template parameter (?template=default) or a request body with workflow details"
                        )
                    }
                }
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
                val command = request.toUpdateCommand(workflowId)
                
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
 * Gets all valid transitions for a workflow.
 *
 * ## URL Structure
 * `GET /api/v1/workflows/{id}/transitions`
 *
 * ## Response
 * Returns all possible transitions from each status in the workflow.
 */
private fun Route.getAllTransitionsRoute() {
    get("/transitions") {
        call.logApiOperation("GetAllTransitions", mapOf("id" to call.parameters["id"]))

        call.executeServiceCall {
            val workflowId = call.extractWorkflowId("id")
            val service = call.service<WorkflowApplicationService>()
            val workflow = service.getWorkflow(workflowId)

            if (workflow == null) {
                call.respondNotFound(
                    "Workflow not found",
                    "No workflow exists with ID: ${workflowId.value}"
                )
                return@executeServiceCall
            }

            // Build all transitions for all statuses
            val allTransitions = workflow.allowedStatuses.map { statusName ->
                val status = IssueStatus.fromString(statusName)
                val validTransitions = service.getValidTransitions(workflowId, status)
                TransitionsResponse(
                    fromStatus = statusName,
                    validTransitions = validTransitions.map { it.name }
                )
            }

            call.respondOk(AllTransitionsResponse(
                workflowId = workflow.id,
                transitions = allTransitions
            ))
        }
    }
}

/**
 * Validates a specific status transition (resource-based URL).
 *
 * ## URL Structure
 * `POST /api/v1/workflows/{id}/transitions/validation`
 *
 * ## Request Body
 * ```json
 * {
 *   "fromStatus": "TODO",
 *   "toStatus": "IN_PROGRESS"
 * }
 * ```
 */
private fun Route.validateTransitionResourceRoute() {
    post("/validation") {
        call.logApiOperation("ValidateTransitionResource", mapOf("id" to call.parameters["id"]))

        call.executeServiceCall {
            val workflowId = call.extractWorkflowId("id")

            // Verify workflow exists
            val service = call.service<WorkflowApplicationService>()
            val workflow = service.getWorkflow(workflowId)

            if (workflow == null) {
                call.respondNotFound(
                    "Workflow not found",
                    "No workflow exists with ID: ${workflowId.value}"
                )
                return@executeServiceCall
            }

            call.validateAndProcess<ValidateTransitionRequest>(
                validation = { WorkflowValidation.validateTransitionValidationRequest(it) }
            ) { request ->
                val result = service.validateTransition(
                    workflowId,
                    IssueStatus.fromString(request.fromStatus),
                    IssueStatus.fromString(request.toStatus)
                )

                call.respondOk(ValidationResponse.fromValidationResult(result))
            }
        }
    }
}

/**
 * Configures legacy workflow routes to return 404 with migration guidance.
 *
 * All legacy `/api/workflows` endpoints have been removed in favor of `/api/v1/workflows`.
 */
private fun Route.configureLegacyWorkflowRoutes() {
    // Match all HTTP methods for base routes
    get {
        call.respondNotFound(
            "Legacy endpoint not found",
            "This endpoint has been removed. Use /api/v1/workflows instead. See documentation at /swagger"
        )
    }

    post {
        call.respondNotFound(
            "Legacy endpoint not found",
            "This endpoint has been removed. Use /api/v1/workflows instead. See documentation at /swagger"
        )
    }

    // Template routes
    post("/default") {
        call.respondNotFound(
            "Legacy endpoint not found",
            "This endpoint has been removed. Use /api/v1/workflows?template=default instead. See documentation at /swagger"
        )
    }

    post("/bug") {
        call.respondNotFound(
            "Legacy endpoint not found",
            "This endpoint has been removed. Use /api/v1/workflows?template=bug instead. See documentation at /swagger"
        )
    }

    post("/feature") {
        call.respondNotFound(
            "Legacy endpoint not found",
            "This endpoint has been removed. Use /api/v1/workflows?template=feature instead. See documentation at /swagger"
        )
    }

    // Individual workflow operations
    route("/{id}") {
        get {
            call.respondNotFound(
                "Legacy endpoint not found",
                "This endpoint has been removed. Use /api/v1/workflows/{id} instead. See documentation at /swagger"
            )
        }

        put {
            call.respondNotFound(
                "Legacy endpoint not found",
                "This endpoint has been removed. Use /api/v1/workflows/{id} instead. See documentation at /swagger"
            )
        }

        delete {
            call.respondNotFound(
                "Legacy endpoint not found",
                "This endpoint has been removed. Use /api/v1/workflows/{id} instead. See documentation at /swagger"
            )
        }

        // Legacy validate-transition endpoint
        post("/validate-transition") {
            call.respondNotFound(
                "Legacy endpoint not found",
                "This endpoint has been removed. Use /api/v1/workflows/{id}/transitions/validation instead. See documentation at /swagger"
            )
        }
    }
}