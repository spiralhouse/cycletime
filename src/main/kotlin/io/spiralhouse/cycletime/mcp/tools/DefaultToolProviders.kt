package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.json.*
import kotlinx.serialization.encodeToString
import kotlinx.coroutines.runBlocking
import java.util.*

/**
 * Default implementation of ProjectToolProvider.
 * GREEN PHASE: Minimal implementation to make tests pass.
 */
class DefaultProjectToolProvider(
    private val projectService: ProjectApplicationService
) : ProjectToolProvider {
    
    override fun getTools(): List<Tool> = listOf(
        Tool(
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
                    val name = obj["name"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("name required")
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull
                    
                    val command = CreateProjectCommand(name = name, description = description)
                    val result = runBlocking { projectService.createProject(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
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
                    val id = obj["id"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("id required")
                    
                    val result = runBlocking { projectService.getProject(ProjectId(id)) }
                        ?: throw IllegalArgumentException("Project not found")
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "project.list",
            description = "List all projects",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = { _ ->
                Result.runCatching {
                    val result = runBlocking { projectService.listProjects() }
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "project.delete",
            description = "Delete a project",
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
                    val id = obj["id"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("id required")
                    
                    // Use archive instead of delete since DeleteProjectCommand doesn't exist
                    runBlocking { projectService.deleteProject(ProjectId(id)) }
                    buildJsonObject { put("success", true) }
                }
            }
        ),
        Tool(
            name = "project.update",
            description = "Update a project",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildJsonObject {
                        put("type", "string")
                        put("description", "Project ID")
                    })
                    put("name", buildJsonObject {
                        put("type", "string")
                        put("description", "Project name")
                    })
                    put("description", buildJsonObject {
                        put("type", "string")
                        put("description", "Project description")
                    })
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("id required")
                    val name = obj["name"]?.jsonPrimitive?.contentOrNull
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull
                    
                    val command = UpdateProjectCommand(
                        id = ProjectId(id),
                        name = name,
                        description = description
                    )
                    val result = runBlocking { projectService.updateProject(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        )
    )
}

/**
 * Default implementation of IssueToolProvider.
 * GREEN PHASE: Minimal implementation to make tests pass.
 */
class DefaultIssueToolProvider(
    private val issueService: IssueApplicationService
) : IssueToolProvider {
    
    override fun getTools(): List<Tool> = listOf(
        Tool(
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
                })
                put("required", buildJsonArray { 
                    add("title")
                    add("projectId")
                })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val title = obj["title"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("title required")
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull
                    val projectId = obj["projectId"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("projectId required")
                    
                    val command = CreateIssueCommand(
                        title = title,
                        description = description,
                        type = IssueType.STORY, // Default type
                        projectId = ProjectId(projectId)
                    )
                    val result = runBlocking { issueService.createIssue(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "issue.update",
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
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("id required")
                    val title = obj["title"]?.jsonPrimitive?.contentOrNull
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull
                    
                    val command = UpdateIssueCommand(
                        id = IssueId(id),
                        title = title,
                        description = description
                    )
                    val result = runBlocking { issueService.updateIssue(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "issue.transition",
            description = "Transition issue status",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildJsonObject {
                        put("type", "string")
                        put("description", "Issue ID")
                    })
                    put("newStatus", buildJsonObject {
                        put("type", "string")
                        put("description", "New status")
                    })
                })
                put("required", buildJsonArray { 
                    add("id")
                    add("newStatus")
                })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("id required")
                    val newStatus = obj["newStatus"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("newStatus required")
                    
                    val command = TransitionIssueCommand(
                        id = IssueId(id),
                        newStatus = IssueStatus.valueOf(newStatus)
                    )
                    val result = runBlocking { issueService.transitionIssue(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "issue.get_tree",
            description = "Get issue hierarchy tree",
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
                    val id = obj["id"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("id required")
                    
                    val result = runBlocking { issueService.getIssueTree(IssueId(id)) }
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "issue.list",
            description = "List issues",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("projectId", buildJsonObject {
                        put("type", "string")
                        put("description", "Project ID to filter by")
                    })
                })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val projectId = obj["projectId"]?.jsonPrimitive?.contentOrNull?.let { ProjectId(it) }
                    
                    val command = ListIssuesCommand(projectId = projectId)
                    val result = runBlocking { issueService.listIssues(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        )
    )
}

/**
 * Default implementation of SessionToolProvider.
 * GREEN PHASE: Minimal implementation to make tests pass.
 */
class DefaultSessionToolProvider(
    private val sessionService: SessionApplicationService
) : SessionToolProvider {
    
    override fun getTools(): List<Tool> = listOf(
        Tool(
            name = "session.create",
            description = "Create a new work session",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("projectId", buildJsonObject {
                        put("type", "string")
                        put("description", "Project ID")
                    })
                })
                put("required", buildJsonArray { add("projectId") })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val projectId = obj["projectId"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("projectId required")
                    
                    val command = CreateSessionCommand(projectId = ProjectId(projectId))
                    val result = runBlocking { sessionService.createSession(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "session.get",
            description = "Get session by ID",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildJsonObject {
                        put("type", "string")
                        put("description", "Session ID")
                    })
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("id required")
                    
                    val result = runBlocking { sessionService.getSession(SessionId(id)) }
                        ?: throw IllegalArgumentException("Session not found")
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "session.end",
            description = "End a work session",
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
                    val sessionKey = obj["sessionKey"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("sessionKey required")
                    
                    val command = EndSessionCommand(id = SessionId(sessionKey)) // Use SessionId instead of SessionKey
                    val result = runBlocking { sessionService.endSession(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "session.list",
            description = "List all sessions",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = { _ ->
                Result.runCatching {
                    val command = ListSessionsCommand()
                    val result = runBlocking { sessionService.listSessions(command) }
                    Json.encodeToJsonElement(result)
                }
            }
        )
    )
}