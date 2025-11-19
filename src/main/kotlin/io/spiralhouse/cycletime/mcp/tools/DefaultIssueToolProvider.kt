package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.IssueDto
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.json.*

/**
 * Default implementation of issue tool provider.
 *
 * Provides issue-related tools for MCP operations.
 */
class DefaultIssueToolProvider(
    private val issueService: IssueApplicationService,
    private val issueRepository: IssueRepository
) : AbstractToolProvider() {
    override val namespace: String = "issue"
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<Tool> = listOf(
        Tool(
            name = "create_issue",
            description = "Create a new issue",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("title", buildRequiredStringParam("Issue title"))
                    put("description", buildOptionalStringParam("Issue description"))
                    put("projectId", buildRequiredStringParam("Project ID"))
                    put("type", buildJsonObject {
                        put("type", "string")
                        put("enum", buildJsonArray {
                            add("EPIC")
                            add("STORY")
                            add("SUBTASK")
                        })
                        put("description", "Issue type")
                        put("default", "STORY")
                    })
                    put("parentId", buildOptionalStringParam("Parent issue ID for hierarchical relationships (Epic → Story → Subtask)"))
                })
                put("required", buildJsonArray { 
                    add("title")
                    add("projectId")
                })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val title = extractRequiredParam(params, "title")
                    val description = extractOptionalParam(params, "description")
                    val projectId = extractRequiredParam(params, "projectId")
                    val type = extractOptionalParam(params, "type")?.let {
                        IssueType.fromString(it)
                    } ?: IssueType.STORY
                    val parentId = extractOptionalParam(params, "parentId")?.let { IssueId(it) }

                    val command = CreateIssueCommand(
                        title = title,
                        description = description,
                        type = type,
                        projectId = ProjectId(projectId),
                        parentId = parentId
                    )
                    val result = issueService.createIssue(command)
                    buildJsonObject {
                        put("id", result.id.value)
                        put("title", result.title)
                    }
                }
            }
        ),
        Tool(
            name = "get_issue",
            description = "Get an issue by ID (optionally include soft-deleted)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Issue ID"))
                    put("includeDeleted", buildJsonObject {
                        put("type", "boolean")
                        put("description", "Include soft-deleted issue (default: false)")
                        put("default", false)
                    })
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    val includeDeleted = params.jsonObject["includeDeleted"]?.jsonPrimitive?.boolean ?: false

                    // Use IssueDto for consistent JSON encoding
                    val issueDto = if (includeDeleted) {
                        // Get issue including deleted
                        issueRepository.findIncludingDeleted(IssueId(id))
                            ?.let { IssueDto.fromIssue(it) }
                    } else {
                        // Get only active issue (excludes deleted)
                        issueService.getIssue(IssueId(id))
                    }

                    issueDto?.let { Json.encodeToJsonElement(it) }
                        ?: throw IllegalArgumentException("Issue not found: $id")
                }
            }
        ),
        Tool(
            name = "list_issues",
            description = "List all issues (optionally include soft-deleted)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("includeDeleted", buildJsonObject {
                        put("type", "boolean")
                        put("description", "Include soft-deleted issues (default: false)")
                        put("default", false)
                    })
                })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val includeDeleted = params.jsonObject["includeDeleted"]?.jsonPrimitive?.boolean ?: false
                    val listDto = if (includeDeleted) {
                        // Get both active and deleted issues
                        val active = listOf(
                            issueRepository.findByType(IssueType.EPIC),
                            issueRepository.findByType(IssueType.STORY),
                            issueRepository.findByType(IssueType.SUBTASK)
                        ).flatten()
                        val deleted = issueRepository.findDeleted()
                        val allIssues = active + deleted
                        io.spiralhouse.cycletime.application.dto.IssueListDto.fromIssues(allIssues)
                    } else {
                        // Get only active issues (use existing application service method)
                        issueService.listIssues()
                    }
                    Json.encodeToJsonElement(listDto)
                }
            }
        ),
        Tool(
            name = "delete_issue",
            description = "Soft-delete an issue (sets deleted_at timestamp, cascades to children). This is a soft deletion that can be recovered.",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Issue ID"))
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    issueService.deleteIssue(IssueId(id))
                    buildJsonObject {
                        put("id", id)
                        put("deleted", true)
                    }
                }
            }
        ),
        Tool(
            name = "restore_issue",
            description = "Restore a soft-deleted issue (validates parent not deleted)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Issue ID"))
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    val result = issueService.restoreIssue(IssueId(id))
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "list_deleted_issues",
            description = "List all soft-deleted issues (ordered by deletion date DESC)",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val listDto = issueService.listDeletedIssues()
                    // Return just the issues array (not the wrapper object)
                    Json.encodeToJsonElement(listDto.issues)
                }
            }
        ),
        Tool(
            name = "update_issue",
            description = "Update an existing issue",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Issue ID"))
                    put("title", buildOptionalStringParam("Issue title"))
                    put("description", buildOptionalStringParam("Issue description"))
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                /**
                 * SPI-718: Completed mock implementation to enable comprehensive E2E workflow testing.
                 *
                 * Previous implementation returned mock JSON without persisting changes. This prevented
                 * WorkflowE2ETest from validating multi-step workflows where updates must persist across
                 * tool calls.
                 *
                 * Implementation now calls issueService.updateIssue() to persist changes to database,
                 * enabling proper E2E workflow validation.
                 */
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    val title = extractOptionalParam(params, "title")
                    val description = extractOptionalParam(params, "description")

                    // Create command with parsed parameters
                    val command = UpdateIssueCommand(
                        id = IssueId(id),
                        title = title,
                        description = description
                    )

                    // Call service to persist update
                    val result = issueService.updateIssue(command)

                    // Return updated issue data
                    Json.encodeToJsonElement(result)
                }
            }
        )
    )
}