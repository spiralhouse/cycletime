package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.domain.services.BuildInfo
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import kotlinx.serialization.Serializable

@Serializable
data class MCPServerInfo(
    val name: String,
    val version: String,
    val description: String,
    val capabilities: MCPCapabilities
)

@Serializable
data class MCPCapabilities(
    val resources: Boolean = true,
    val tools: Boolean = true,
    val prompts: Boolean = false
)

fun Routing.configureMCP() {
    // MCP Server info endpoint
    get("/mcp") {
        call.respond(MCPServerInfo(
            name = BuildInfo.serviceName,
            version = BuildInfo.version,
            description = BuildInfo.serviceDescription,
            capabilities = MCPCapabilities()
        ))
    }

    // SSE endpoint for MCP communication
    sse("/mcp/events") {
        send("data: {\"type\":\"connected\",\"message\":\"Connected to JCVD Kotlin MCP Server\"}\n\n")

        // Keep connection alive with heartbeat
        while (true) {
            kotlinx.coroutines.delay(30000) // 30 seconds
            send("data: {\"type\":\"heartbeat\"}\n\n")
        }
    }

    // MCP Resources endpoint
    get("/mcp/resources") {
        call.respond(mapOf(
            "resources" to listOf(
                mapOf(
                    "uri" to "jcvd://projects",
                    "name" to "Projects",
                    "description" to "List of all projects"
                ),
                mapOf(
                    "uri" to "jcvd://issues",
                    "name" to "Issues",
                    "description" to "List of all issues"
                ),
                mapOf(
                    "uri" to "jcvd://sessions",
                    "name" to "Sessions",
                    "description" to "Active sessions"
                )
            )
        ))
    }

    // MCP Tools endpoint
    get("/mcp/tools") {
        call.respond(mapOf(
            "tools" to listOf(
                mapOf(
                    "name" to "create_project",
                    "description" to "Create a new project",
                    "parameters" to mapOf(
                        "name" to "string",
                        "description" to "string?"
                    )
                ),
                mapOf(
                    "name" to "create_issue",
                    "description" to "Create a new issue",
                    "parameters" to mapOf(
                        "projectId" to "string",
                        "title" to "string",
                        "description" to "string?",
                        "type" to "epic|story|subtask"
                    )
                ),
                mapOf(
                    "name" to "get_next_task",
                    "description" to "Get next unblocked task",
                    "parameters" to mapOf(
                        "projectId" to "string"
                    )
                )
            )
        ))
    }
}
