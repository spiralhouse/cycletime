package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.sse.mcpSSEEndpoint
import io.spiralhouse.cycletime.mcp.http.mcpPostEndpoint
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import io.spiralhouse.cycletime.mcp.correlation.EventBus
import io.spiralhouse.cycletime.mcp.correlation.MessageCorrelator
import io.ktor.server.routing.*
import io.ktor.server.plugins.di.*
import org.slf4j.LoggerFactory

fun Routing.configureMCP() {
    val logger = LoggerFactory.getLogger("MCPRouting")
    val startTime = System.currentTimeMillis()

    // Get SSE transport components from DI (SPI-665)
    val sessionManager: MCPSessionManager by application.dependencies
    val eventBus: EventBus by application.dependencies
    val correlator: MessageCorrelator by application.dependencies
    val methodHandler: McpMethodHandler by application.dependencies

    // SSE endpoint for server-to-client events (SPI-665)
    route("") {
        mcpSSEEndpoint(sessionManager, eventBus)
    }

    // POST endpoint for client-to-server requests (SPI-665)
    route("") {
        mcpPostEndpoint(sessionManager, eventBus, correlator, methodHandler)
    }

    val initTime = System.currentTimeMillis() - startTime
    logger.info("MCP routing configured in ${initTime}ms")
}
