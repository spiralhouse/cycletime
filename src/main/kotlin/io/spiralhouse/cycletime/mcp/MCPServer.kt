package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.mcp.sdk.configureMCPSdk
import io.spiralhouse.cycletime.mcp.sdk.configureMCPStreamableHttp
import io.ktor.server.routing.*
import org.slf4j.LoggerFactory

fun Routing.configureMCP() {
    val logger = LoggerFactory.getLogger("MCPRouting")
    logger.info("Configuring MCP routing")

    // Phase 1: Run BOTH transports in parallel during migration (SPI-759)
    // - SDK SSE transport at / (existing functionality, maintains backward compatibility)
    // - Streamable HTTP transport at /mcp (NEW for Claude Code v2.0.25+, MCP Spec 2025-06-18)
    configureMCPSdk()            // Keep existing SDK routes (prevents regression)
    configureMCPStreamableHttp()  // Add new Streamable HTTP routes (adds new capability)

    logger.info("MCP routing configured: SDK (/) + Streamable HTTP (/mcp) both active")

    // Phase 2 (future SPI-XXX): Remove SDK SSE transport after Claude Code v2.0.25+ adoption complete
}
