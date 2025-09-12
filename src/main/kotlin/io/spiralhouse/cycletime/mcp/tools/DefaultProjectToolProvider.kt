package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*

/**
 * Default implementation of project tool provider.
 * 
 * Provides project-related tools for MCP operations.
 */
class DefaultProjectToolProvider(
    private val projectService: ProjectApplicationService
) : ToolProvider {
    override val namespace: String = "project"
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<Tool> = listOf(
        Tool(
            name = "create_project",
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
            handler = ToolHandler.Async { params ->
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
                    // Return properly formatted MCP response with content structure
                    buildJsonObject {
                        put("content", buildJsonArray {
                            add(buildJsonObject {
                                put("type", "text")
                                put("text", Json.encodeToString(mapOf(
                                    "id" to result.id.value,
                                    "name" to result.name
                                )))
                            })
                        })
                    }
                }
            }
        ),
        Tool(
            name = "get_project",
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
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("id is required")
                    
                    val result = projectService.getProject(ProjectId(id))
                        ?: throw IllegalArgumentException("Project not found: $id")
                    // Return properly formatted MCP response with content structure
                    buildJsonObject {
                        put("content", buildJsonArray {
                            add(buildJsonObject {
                                put("type", "text")
                                put("text", Json.encodeToString(result))
                            })
                        })
                    }
                }
            }
        ),
        Tool(
            name = "list_projects",
            description = "List all projects",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val result = projectService.listProjects()
                    // Return properly formatted MCP response with content structure
                    buildJsonObject {
                        put("content", buildJsonArray {
                            add(buildJsonObject {
                                put("type", "text")
                                put("text", Json.encodeToString(result))
                            })
                        })
                    }
                }
            }
        ),
        Tool(
            name = "update_project",
            description = "Update an existing project",
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
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val id = obj["id"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("id is required")
                    val name = obj["name"]?.jsonPrimitive?.contentOrNull
                    val description = obj["description"]?.jsonPrimitive?.contentOrNull
                    
                    // For now, return success response - actual update logic can be implemented later
                    buildJsonObject {
                        put("id", id)
                        put("updated", true)
                        if (name != null) put("name", name)
                        if (description != null) put("description", description)
                    }
                }
            }
        )
    )
}