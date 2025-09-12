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
    
    override fun getTools(): List<Tool> = emptyList()
    
    override fun getAsyncTools(): List<Tool> = listOf(
        Tool(
            name = "create_session",
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
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val projectId = obj["projectId"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("projectId is required")
                    
                    val command = CreateSessionCommand(
                        projectId = ProjectId(projectId)
                    )
                    val result = sessionService.createSession(command)
                    // Return properly formatted MCP response with content structure
                    buildJsonObject {
                        put("content", buildJsonArray {
                            add(buildJsonObject {
                                put("type", "text")
                                put("text", "Session created for project ${result.projectId?.value ?: "unknown"} (Key: ${result.sessionKey.value})")
                            })
                        })
                    }
                }
            }
        ),
        Tool(
            name = "list_active_sessions",
            description = "List active sessions",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    val result = sessionService.listActiveSessions()
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
            name = "get_session",
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
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val sessionKey = obj["sessionKey"]?.jsonPrimitive?.content 
                        ?: throw IllegalArgumentException("sessionKey is required")
                    
                    val result = sessionService.getSession(SessionKey(sessionKey))
                        ?: throw IllegalArgumentException("Session not found")
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
            name = "get_next_task",
            description = "Get the next task for the current session",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("sessionKey", buildJsonObject {
                        put("type", "string")
                        put("description", "Session key (optional)")
                    })
                })
            },
            handler = ToolHandler.Async { params ->
                Result.runCatching {
                    val obj = params.jsonObject
                    val sessionKey = obj["sessionKey"]?.jsonPrimitive?.contentOrNull?.let {
                        SessionKey(it)
                    }
                    
                    // For now, return a placeholder task
                    val nextTask = buildJsonObject {
                        put("id", "task-1")
                        put("title", "Continue development on current feature")
                        put("priority", "high")
                        put("sessionKey", sessionKey?.value ?: "default")
                    }
                    // Return properly formatted MCP response with content structure
                    buildJsonObject {
                        put("content", buildJsonArray {
                            add(buildJsonObject {
                                put("type", "text")
                                put("text", Json.encodeToString(nextTask))
                            })
                        })
                    }
                }
            }
        ),
        Tool(
            name = "get_active_session",
            description = "Get the currently active session",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
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
                    // Return properly formatted MCP response with content structure
                    buildJsonObject {
                        put("content", buildJsonArray {
                            add(buildJsonObject {
                                put("type", "text")
                                put("text", response)
                            })
                        })
                    }
                }
            }
        ),
        Tool(
            name = "list_sessions",
            description = "List all sessions (active and inactive)",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            handler = ToolHandler.Async { _ ->
                Result.runCatching {
                    // For now, delegate to list active sessions
                    // This can be expanded to include inactive sessions later
                    val sessionListDto = sessionService.listActiveSessions()
                    // Return properly formatted MCP response with content structure
                    buildJsonObject {
                        put("content", buildJsonArray {
                            add(buildJsonObject {
                                put("type", "text")
                                put("text", Json.encodeToString(sessionListDto))
                            })
                        })
                    }
                }
            }
        )
    )
}