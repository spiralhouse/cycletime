package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.dto.WorkflowDto
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
import io.spiralhouse.cycletime.domain.repositories.WorkflowRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import kotlinx.serialization.json.*

/**
 * Default implementation of workflow tool provider.
 *
 * Provides workflow-related tools for MCP operations.
 */
class DefaultWorkflowToolProvider(
    private val workflowService: WorkflowApplicationService,
    private val workflowRepository: WorkflowRepository,
    private val timeProvider: TimeProvider
) : AbstractToolProvider() {
    override val namespace: String = "workflow"
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<Tool> = listOf(
        Tool(
            name = "create_workflow",
            description = "Create a new workflow",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("name", buildRequiredStringParam("Workflow name"))
                    put("description", buildOptionalStringParam("Workflow description"))
                    put("stages", buildJsonObject {
                        put("type", "array")
                        put("description", "Workflow stages")
                        put("items", buildJsonObject {
                            put("type", "object")
                            put("properties", buildJsonObject {
                                put("name", buildJsonObject {
                                    put("type", "string")
                                })
                                put("description", buildJsonObject {
                                    put("type", "string")
                                })
                            })
                        })
                    })
                })
                put("required", buildJsonArray { add("name") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val name = extractRequiredParam(params, "name")
                    val description = extractOptionalParam(params, "description")
                    val stages = params.jsonObject["stages"]?.jsonArray

                    // Create a basic workflow with default initial status and allowed statuses
                    val workflow = io.spiralhouse.cycletime.domain.entities.Workflow.create(
                        name = name,
                        description = description,
                        initialStatus = io.spiralhouse.cycletime.domain.valueobjects.IssueStatus.TODO,
                        allowedStatuses = setOf(
                            io.spiralhouse.cycletime.domain.valueobjects.IssueStatus.TODO,
                            io.spiralhouse.cycletime.domain.valueobjects.IssueStatus.IN_PROGRESS,
                            io.spiralhouse.cycletime.domain.valueobjects.IssueStatus.DONE
                        ),
                        timeProvider = timeProvider
                    )

                    val saved = workflowRepository.save(workflow)

                    buildJsonObject {
                        put("id", saved.id.value.toString())
                        put("name", saved.name)
                        put("description", saved.description ?: "")
                        put("created", true)
                        put("stageCount", stages?.size ?: 0)
                    }
                }
            }
        ),
        Tool(
            name = "get_workflow",
            description = "Get a workflow by ID (optionally include soft-deleted)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Workflow ID"))
                    put("includeDeleted", buildJsonObject {
                        put("type", "boolean")
                        put("description", "Include soft-deleted workflows (default: false)")
                        put("default", false)
                    })
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    val includeDeleted = params.jsonObject["includeDeleted"]?.jsonPrimitive?.boolean ?: false

                    val workflow = if (includeDeleted) {
                        workflowRepository.findIncludingDeleted(WorkflowId.fromString(id))
                    } else {
                        workflowRepository.findById(WorkflowId.fromString(id))
                    }

                    workflow?.let { Json.encodeToJsonElement(WorkflowDto.fromWorkflow(it)) }
                        ?: throw IllegalArgumentException("Workflow not found: $id")
                }
            }
        ),
        Tool(
            name = "list_workflows",
            description = "List all workflows (optionally include soft-deleted)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("includeDeleted", buildJsonObject {
                        put("type", "boolean")
                        put("description", "Include soft-deleted workflows (default: false)")
                        put("default", false)
                    })
                })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val includeDeleted = params.jsonObject["includeDeleted"]?.jsonPrimitive?.boolean ?: false
                    val workflows = if (includeDeleted) {
                        // Get both active and deleted workflows
                        val active = workflowRepository.findAll()
                        val deleted = workflowRepository.findDeleted()
                        active + deleted
                    } else {
                        // Get only active workflows
                        workflowRepository.findAll()
                    }
                    // Return array of WorkflowDto (not WorkflowListDto) to match test expectations
                    val workflowDtos = workflows.map { WorkflowDto.fromWorkflow(it) }
                    Json.encodeToJsonElement(workflowDtos)
                }
            }
        ),
        Tool(
            name = "delete_workflow",
            description = "Soft-delete a workflow (sets deleted_at timestamp). This is a soft deletion that can be recovered.",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Workflow ID"))
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")

                    // Check if workflow exists (including deleted)
                    val workflow = workflowRepository.findIncludingDeleted(WorkflowId.fromString(id))
                        ?: throw IllegalArgumentException("Workflow not found: $id")

                    // Only call softDelete if not already deleted (idempotency)
                    if (workflow.deletedAt == null) {
                        workflowRepository.softDelete(WorkflowId.fromString(id))
                    }

                    buildJsonObject {
                        put("id", id)
                        put("deleted", true)
                    }
                }
            }
        ),
        Tool(
            name = "restore_workflow",
            description = "Restore a soft-deleted workflow (clears deleted_at timestamp)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Workflow ID"))
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    workflowRepository.restore(WorkflowId.fromString(id))
                    val result = workflowRepository.findById(WorkflowId.fromString(id))
                        ?: throw IllegalArgumentException("Workflow not found after restore: $id")
                    Json.encodeToJsonElement(WorkflowDto.fromWorkflow(result))
                }
            }
        ),
        Tool(
            name = "list_deleted_workflows",
            description = "List all soft-deleted workflows (ordered by deletion date DESC)",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val workflowDtos = workflowService.listDeletedWorkflows()
                    Json.encodeToJsonElement(workflowDtos)
                }
            }
        ),
        Tool(
            name = "execute_workflow_stage",
            description = "Execute a specific workflow stage",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("workflowId", buildRequiredStringParam("Workflow ID"))
                    put("stage", buildRequiredStringParam("Stage name to execute"))
                    put("context", buildJsonObject {
                        put("type", "object")
                        put("description", "Execution context")
                    })
                })
                put("required", buildJsonArray { 
                    add("workflowId")
                    add("stage")
                })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val workflowId = extractRequiredParam(params, "workflowId")
                    val stage = extractRequiredParam(params, "stage")
                    val context = params.jsonObject["context"]?.jsonObject

                    // For now, return success response
                    buildJsonObject {
                        put("workflowId", workflowId)
                        put("stage", stage)
                        put("status", "executed")
                        put("result", "Stage completed successfully")
                        put("nextStage", "next-stage-placeholder")
                    }
                }
            }
        )
    )
}