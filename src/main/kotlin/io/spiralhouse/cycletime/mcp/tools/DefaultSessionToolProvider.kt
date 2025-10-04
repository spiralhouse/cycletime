package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.json.*

/**
 * Default implementation of session tool provider.
 *
 * Provides session-related tools for MCP operations.
 */
class DefaultSessionToolProvider(
    private val sessionService: SessionApplicationService
) : AbstractToolProvider() {
    override val namespace: String = "session"
    
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

                    buildJsonObject {
                        put("message", "Session created for project ${result.projectId?.value ?: "unknown"} (Key: ${result.sessionKey.value})")
                        put("sessionKey", result.sessionKey.value)
                        put("projectId", result.projectId?.value ?: "")
                    }
                }
            }
        ),
        Tool(
            name = "list_active_sessions",
            description = "List active sessions",
            parametersSchema = buildEmptyPropertiesSchema(),
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val sessions = sessionService.listActiveSessions()
                    Json.encodeToJsonElement(sessions)
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
                    
                    val session = sessionService.getSession(SessionKey(sessionKey))
                        ?: throw IllegalArgumentException("Session not found: $sessionKey")
                    Json.encodeToJsonElement(session)
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
                    buildJsonObject {
                        put("id", "task-1")
                        put("title", "Continue development on current feature")
                        put("priority", "high")
                        put("sessionKey", sessionKey?.value ?: "default")
                    }
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
                    if (sessionListDto.sessions.isNotEmpty()) {
                        Json.encodeToJsonElement(sessionListDto.sessions.first())
                    } else {
                        buildJsonObject {
                            put("id", "no-active-session")
                            put("message", "No active session found")
                        }
                    }
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
                    val sessions = sessionService.listActiveSessions()
                    Json.encodeToJsonElement(sessions)
                }
            }
        )
    )
}