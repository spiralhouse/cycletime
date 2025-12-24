package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.mcp.sdk.StreamableHttpConfig
import io.spiralhouse.cycletime.mcp.sdk.configureMCPStreamableHttp
import io.ktor.server.routing.*
import org.slf4j.LoggerFactory

/**
 * Configure MCP routing with optional configuration override.
 *
 * @param config Optional configuration for Streamable HTTP handler (defaults to production settings)
 */
fun Routing.configureMCP(config: StreamableHttpConfig? = null) {
    val logger = LoggerFactory.getLogger("MCPRouting")
    logger.info("Configuring MCP routing")

    // Streamable HTTP transport only (SPI-759, SPI-763)
    // SSE transport removed after deprecation in MCP spec 2025-06-18
    // SPI-879: Pass config through for test environment customization
    configureMCPStreamableHttp(config)  // Streamable HTTP transport at /mcp

    logger.info("MCP routing configured: Streamable HTTP only (/mcp)")
}
