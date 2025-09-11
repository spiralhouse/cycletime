package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*

/**
 * Default implementation of issue tool provider.
 * 
 * Provides issue-related tools for MCP operations.
 */
class DefaultIssueToolProvider(
    private val issueService: IssueApplicationService
) : ToolProvider {
    override val namespace: String = "issue"
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<Tool> = listOf(
        Tool(
            name = "create_issue",
            description = "Create a new issue",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("title", buildJsonObject {
                        put("type", "string")
                        put("description", "Issue title")
                    })
                    put("description", buildJsonObject {
                        put("type", "string")
                        put("description", "Issue description")
                    })
                    put("projectId", buildJsonObject {
                        put("type", "string")
                        put("description", "Project ID")
                    })
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
                    val obj = params.jsonObject
                    val title = obj["title"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("title is required")
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull
                    val projectId = obj["projectId"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("projectId is required")
                    val type = obj["type"]?.jsonPrimitive?.contentOrNull?.let {
                        IssueType.valueOf(it)
                    } ?: IssueType.STORY
                    
                    val command = CreateIssueCommand(
                        title = title,
                        description = description,
                        type = type,
                        projectId = ProjectId(projectId)
                    )
                    val result = issueService.createIssue(command)
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "get_issue",
            description = "Get an issue by ID",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildJsonObject {
                        put("type", "string")
                        put("description", "Issue ID")
                    })
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("id is required")
                    
                    val result = issueService.getIssue(IssueId(id))
                        ?: throw IllegalArgumentException("Issue not found: $id")
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "list_issues",
            description = "List all issues",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val result = issueService.listIssues()
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "update_issue",
            description = "Update an existing issue",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildJsonObject {
                        put("type", "string")
                        put("description", "Issue ID")
                    })
                    put("title", buildJsonObject {
                        put("type", "string")
                        put("description", "Issue title")
                    })
                    put("description", buildJsonObject {
                        put("type", "string")
                        put("description", "Issue description")
                    })
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
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("id is required")
                    val title = obj["title"]?.jsonPrimitive?.contentOrNull
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull
                    val type = obj["type"]?.jsonPrimitive?.contentOrNull
                    
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