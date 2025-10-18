package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.mcp.sdk.configureMCPSdk
import io.ktor.server.routing.*
import org.slf4j.LoggerFactory

fun Routing.configureMCP() {
    val logger = LoggerFactory.getLogger("MCPRouting")
    logger.info("Configuring MCP SDK routing")

    // SDK transport (SPI-700 complete)
    configureMCPSdk()

    logger.info("MCP routing configured (SDK v0.7.2)")
}
