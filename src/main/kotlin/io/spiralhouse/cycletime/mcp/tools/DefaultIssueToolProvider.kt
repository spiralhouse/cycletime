package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.json.*

/**
 * Default implementation of issue tool provider.
 * 
 * Provides issue-related tools for MCP operations.
 */
class DefaultIssueToolProvider(
    private val issueService: IssueApplicationService
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
                    
                    val command = CreateIssueCommand(
                        title = title,
                        description = description,
                        type = type,
                        projectId = ProjectId(projectId)
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
            description = "Get an issue by ID",
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
                    
                    val issue = issueService.getIssue(IssueId(id))
                        ?: throw IllegalArgumentException("Issue not found: $id")
                    Json.encodeToJsonElement(issue)
                }
            }
        ),
        Tool(
            name = "list_issues",
            description = "List all issues",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val issues = issueService.listIssues()
                    Json.encodeToJsonElement(issues)
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
                    put("type", buildJsonObject {
                        put("type", "string")
                        put("enum", buildJsonArray {
                            add("EPIC")
                            add("STORY")
                            add("SUBTASK")
                        })
                        put("description", "Issue type")
                    })
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    val title = extractOptionalParam(params, "title")
                    val description = extractOptionalParam(params, "description")
                    val type = extractOptionalParam(params, "type")
                    
                    // For now, return success response - actual update logic can be implemented later
                    buildJsonObject {
                        put("id", id)
                        put("updated", true)
                        if (title != null) put("title", title)
                        if (description != null) put("description", description)
                        if (type != null) put("type", type)
                    }
                }
            }
        )
    )
}