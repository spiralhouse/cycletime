package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*

/**
 * Default implementation of session tool provider.
 * 
 * Provides session-related tools for MCP operations.
 */
class DefaultSessionToolProvider(
    private val sessionService: SessionApplicationService
) : ToolProvider {
    override val namespace: String = "session"
    
    // Common response formatting helper
    private fun createMcpTextResponse(content: String): JsonObject = buildJsonObject {
        put("content", buildJsonArray {
            add(buildJsonObject {
                put("type", "text")
                put("text", content)
            })
        })
    }
    
    // Common parameter extraction helper
    private fun extractRequiredParam(params: JsonElement, key: String): String {
        return params.jsonObject[key]?.jsonPrimitive?.content
            ?: throw IllegalArgumentException("$key is required")
    }
    
    // Common optional parameter extraction helper
    private fun extractOptionalParam(params: JsonElement, key: String): String? {
        return params.jsonObject[key]?.jsonPrimitive?.contentOrNull
    }
    
    // Common schema building helpers
    private fun buildRequiredStringParam(description: String): JsonObject = buildJsonObject {
        put("type", "string")
        put("description", description)
    }
    
    private fun buildOptionalStringParam(description: String): JsonObject = buildJsonObject {
        put("type", "string")
        put("description", description)
    }
    
    private fun buildEmptyPropertiesSchema(): JsonObject = buildJsonObject {
        put("type", "object")
        put("properties", buildJsonObject {})
    }
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<Tool> = listOf(
        Tool(
            name = "create_session",
            description = "Create a new work session",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("projectId", buildRequiredStringParam("Project ID for the session"))
                })
                put("required", buildJsonArray { add("projectId") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val projectId = extractRequiredParam(params, "projectId")
                    
                    val command = CreateSessionCommand(
                        projectId = ProjectId(projectId)
                    )
                    val result = sessionService.createSession(command)
                    
                    val responseText = "Session created for project ${result.projectId?.value ?: "unknown"} (Key: ${result.sessionKey.value})"
                    createMcpTextResponse(responseText)
                }
            }
        ),
        Tool(
            name = "list_active_sessions",
            description = "List active sessions",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val result = sessionService.listActiveSessions()
                    createMcpTextResponse(Json.encodeToString(result))
                }
            }
        ),
        Tool(
            name = "get_session",
            description = "Get session by key",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("sessionKey", buildRequiredStringParam("Session key"))
                })
                put("required", buildJsonArray { add("sessionKey") })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val sessionKey = extractRequiredParam(params, "sessionKey")
                    
                    val result = sessionService.getSession(SessionKey(sessionKey))
                        ?: throw IllegalArgumentException("Session not found: $sessionKey")
                    
                    createMcpTextResponse(Json.encodeToString(result))
                }
            }
        ),
        Tool(
            name = "get_next_task",
            description = "Get the next task for the current session",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("sessionKey", buildOptionalStringParam("Session key (optional)"))
                })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val sessionKeyValue = extractOptionalParam(params, "sessionKey")
                    val sessionKey = sessionKeyValue?.let { SessionKey(it) }
                    
                    // For now, return a placeholder task
                    val nextTask = buildJsonObject {
                        put("id", "task-1")
                        put("title", "Continue development on current feature")
                        put("priority", "high")
                        put("sessionKey", sessionKey?.value ?: "default")
                    }
                    
                    createMcpTextResponse(Json.encodeToString(nextTask))
                }
            }
        ),
        Tool(
            name = "get_active_session",
            description = "Get the currently active session",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val sessionListDto = sessionService.listActiveSessions()
                    
                    // Return the first active session or a default response
                    val response = if (sessionListDto.sessions.isNotEmpty()) {
                        Json.encodeToString(sessionListDto.sessions.first())
                    } else {
                        Json.encodeToString(buildJsonObject {
                            put("id", "no-active-session")
                            put("message", "No active session found")
                        })
                    }
                    
                    createMcpTextResponse(response)
                }
            }
        ),
        Tool(
            name = "list_sessions",
            description = "List all sessions (active and inactive)",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    // For now, delegate to list active sessions
                    // This can be expanded to include inactive sessions later
                    val sessionListDto = sessionService.listActiveSessions()
                    createMcpTextResponse(Json.encodeToString(sessionListDto))
                }
            }
        )
    )
}