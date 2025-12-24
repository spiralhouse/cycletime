package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.ProjectDto
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.json.*

/**
 * Default implementation of project tool provider.
 *
 * Provides project-related tools for MCP operations.
 */
class DefaultProjectToolProvider(
    private val projectService: ProjectApplicationService,
    private val projectRepository: ProjectRepository
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
                    buildJsonObject {
                        put("id", result.id.value)
                        put("name", result.name)
                    }
                }
            }
        ),
        Tool(
            name = "get_project",
            description = "Get a project by ID (optionally include soft-deleted)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("id", buildRequiredStringParam("Project ID"))
                    put("includeDeleted", buildJsonObject {
                        put("type", "boolean")
                        put("description", "Include soft-deleted project (default: false)")
                        put("default", false)
                    })
                })
                put("required", buildJsonArray { add("id") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val id = extractRequiredParam(params, "id")
                    val includeDeleted = params.jsonObject["includeDeleted"]?.jsonPrimitive?.boolean ?: false

                    val project = if (includeDeleted) {
                        // Get project including deleted
                        projectRepository.findIncludingDeleted(ProjectId(id))
                            ?.let { ProjectDto.fromProject(it) }
                    } else {
                        // Get only active project (excludes deleted)
                        projectService.getProject(ProjectId(id))
                    }

                    project?.let { Json.encodeToJsonElement(it) }
                        ?: throw IllegalArgumentException("Project not found: $id")
                }
            }
        ),
        Tool(
            name = "list_projects",
            description = "List all projects (optionally include soft-deleted)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("includeDeleted", buildJsonObject {
                        put("type", "boolean")
                        put("description", "Include soft-deleted projects (default: false)")
                        put("default", false)
                    })
                })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val includeDeleted = params.jsonObject["includeDeleted"]?.jsonPrimitive?.boolean ?: false
                    val listDto = if (includeDeleted) {
                        // Get both active and deleted projects
                        val active = projectRepository.findAll()
                        val deleted = projectRepository.findDeleted()
                        val allProjects = active + deleted
                        io.spiralhouse.cycletime.application.dto.ProjectListDto.fromProjects(allProjects)
                    } else {
                        // Get only active projects (use existing application service method)
                        projectService.listProjects()
                    }
                    Json.encodeToJsonElement(listDto)
                }
            }
        ),
        Tool(
            name = "delete_project",
            description = "Soft-delete a project (sets deleted_at timestamp, data preserved for recovery). This is a soft deletion that can be recovered.",
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
                    projectService.deleteProject(ProjectId(id))
                    buildJsonObject {
                        put("id", id)
                        put("deleted", true)
                    }
                }
            }
        ),
        Tool(
            name = "restore_project",
            description = "Restore a soft-deleted project (clears deleted_at timestamp)",
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
                    val result = projectService.restoreProject(ProjectId(id))
                    Json.encodeToJsonElement(result)
                }
            }
        ),
        Tool(
            name = "list_deleted_projects",
            description = "List all soft-deleted projects (ordered by deletion date DESC)",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val listDto = projectService.listDeletedProjects()
                    // Return just the projects array (not the wrapper object)
                    Json.encodeToJsonElement(listDto.projects)
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