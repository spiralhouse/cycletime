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

                    // Return flat JSON structure with primitive values
                    buildJsonObject {
                        put("id", issue.id.value)
                        put("title", issue.title)
                        issue.description?.let { put("description", it) }
                        put("type", issue.type.name)
                        put("status", issue.status.name)
                        issue.parentId?.let { put("parentId", it.value) }
                        issue.projectId?.let { put("projectId", it.value) }
                        put("estimate", issue.estimate.value?.toString() ?: "null")
                        issue.assigneeId?.let { put("assigneeId", it) }
                        put("dependencies", buildJsonArray {
                            issue.dependencies.forEach { add(it.value) }
                        })
                        put("blockedBy", buildJsonArray {
                            issue.blockedBy.forEach { add(it.value) }
                        })
                        put("createdAt", issue.createdAt.toString())
                        put("updatedAt", issue.updatedAt.toString())
                    }
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