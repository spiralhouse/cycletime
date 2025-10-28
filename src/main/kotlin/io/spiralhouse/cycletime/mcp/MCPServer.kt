package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.mcp.sdk.configureMCPStreamableHttp
import io.ktor.server.routing.*
import org.slf4j.LoggerFactory

fun Routing.configureMCP() {
    val logger = LoggerFactory.getLogger("MCPRouting")
    logger.info("Configuring MCP routing")

    // Streamable HTTP transport only (SPI-759, SPI-763)
    // SSE transport removed after deprecation in MCP spec 2025-06-18
    configureMCPStreamableHttp()  // Streamable HTTP transport at /mcp

    logger.info("MCP routing configured: Streamable HTTP only (/mcp)")
}
