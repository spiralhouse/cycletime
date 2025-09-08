package io.spiralhouse.cycletime.mcp.tools.providers

import io.spiralhouse.cycletime.mcp.tools.*
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*

/**
 * Default implementation of ProjectToolProvider.
 * 
 * Provides project-related tools for MCP operations.
 */
class DefaultProjectToolProvider(
    private val projectService: ProjectApplicationService
) : ProjectToolProvider {
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<AsyncTool> = listOf(
        AsyncTool(
            name = "project.create",
            description = "Create a new CycleTime project",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("name", buildJsonObject {
                        put("type", "string")
                        put("description", "Project name")
                    })
                    put("description", buildJsonObject {
                        put("type", "string")
                        put("description", "Project description")
                    })
                })
                put("required", buildJsonArray { add("name") })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val name = obj["name"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("name is required")
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull
                    
                    val command = CreateProjectCommand(
                        name = name,
                        description = description
                    )
                    val result = projectService.createProject(command)
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        AsyncTool(
            name = "project.get",
            description = "Get a project by ID",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildJsonObject {
                        put("type", "string")
                        put("description", "Project ID")
                    })
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("id is required")
                    
                    val result = projectService.getProject(ProjectId(id))
                        ?: throw IllegalArgumentException("Project not found: $id")
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        AsyncTool(
            name = "project.list",
            description = "List all projects",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = { _ ->
                Result.runCatching {
                    val result = projectService.listProjects()
                    Json.encodeToJsonElement(result)
                }
            }
        )
    )
}

/**
 * Default implementation of IssueToolProvider.
 * 
 * Provides issue-related tools for MCP operations.
 */
class DefaultIssueToolProvider(
    private val issueService: IssueApplicationService
) : IssueToolProvider {
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<AsyncTool> = listOf(
        AsyncTool(
            name = "issue.create",
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
            handler = { params ->
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
        AsyncTool(
            name = "issue.get",
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
            handler = { params ->
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
        AsyncTool(
            name = "issue.list",
            description = "List all issues",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = { _ ->
                Result.runCatching {
                    val result = issueService.listIssues()
                    Json.encodeToJsonElement(result)
                }
            }
        )
    )
}

/**
 * Default implementation of SessionToolProvider.
 * 
 * Provides session-related tools for MCP operations.
 */
class DefaultSessionToolProvider(
    private val sessionService: SessionApplicationService
) : SessionToolProvider {
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<AsyncTool> = listOf(
        AsyncTool(
            name = "session.create",
            description = "Create a new work session",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("projectId", buildJsonObject {
                        put("type", "string")
                        put("description", "Project ID for the session")
                    })
                })
                put("required", buildJsonArray { add("projectId") })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val projectId = obj["projectId"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("projectId is required")
                    
                    val command = CreateSessionCommand(
                        projectId = ProjectId(projectId)
                    )
                    val result = sessionService.createSession(command)
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        AsyncTool(
            name = "session.list_active",
            description = "List active sessions",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = { _ ->
                Result.runCatching {
                    val result = sessionService.listActiveSessions()
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        AsyncTool(
            name = "session.get",
            description = "Get session by key",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("sessionKey", buildJsonObject {
                        put("type", "string")
                        put("description", "Session key")
                    })
                })
                put("required", buildJsonArray { add("sessionKey") })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val sessionKey = obj["sessionKey"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("sessionKey is required")
                    
                    val result = sessionService.getSession(SessionKey(sessionKey))
                        ?: throw IllegalArgumentException("Session not found")
                    Json.encodeToJsonElement(result)
                }
            }
        )
    )
}