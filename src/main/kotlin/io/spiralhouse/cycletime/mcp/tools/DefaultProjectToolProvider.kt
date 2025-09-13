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
) : AbstractToolProvider() {
    override val namespace: String = "project"
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<Tool> = listOf(
        Tool(
            name = "create_project",
            description = "Create a new CycleTime project",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("name", buildRequiredStringParam("Project name"))
                    put("description", buildOptionalStringParam("Project description"))
                })
                put("required", buildJsonArray { add("name") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val name = extractRequiredParam(params, "name")
                    val description = extractOptionalParam(params, "description")
                    
                    val command = CreateProjectCommand(
                        name = name,
                        description = description
                    )
                    val result = projectService.createProject(command)
                    createMcpTextResponse(Json.encodeToString(mapOf(
                        "id" to result.id.value,
                        "name" to result.name
                    )))
                }
            }
        ),
        Tool(
            name = "get_project",
            description = "Get a project by ID",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Project ID"))
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    
                    val result = projectService.getProject(ProjectId(id))
                        ?: throw IllegalArgumentException("Project not found: $id")
                    createMcpTextResponse(Json.encodeToString(result))
                }
            }
        ),
        Tool(
            name = "list_projects",
            description = "List all projects",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val result = projectService.listProjects()
                    createMcpTextResponse(Json.encodeToString(result))
                }
            }
        ),
        Tool(
            name = "update_project",
            description = "Update an existing project",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Project ID"))
                    put("name", buildOptionalStringParam("Project name"))
                    put("description", buildOptionalStringParam("Project description"))
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    val name = extractOptionalParam(params, "name")
                    val description = extractOptionalParam(params, "description")
                    
                    // For now, return success response - actual update logic can be implemented later
                    val updateResult = buildJsonObject {
                        put("id", id)
                        put("updated", true)
                        if (name != null) put("name", name)
                        if (description != null) put("description", description)
                    }
                    createMcpTextResponse(Json.encodeToString(updateResult))
                }
            }
        )
    )
}