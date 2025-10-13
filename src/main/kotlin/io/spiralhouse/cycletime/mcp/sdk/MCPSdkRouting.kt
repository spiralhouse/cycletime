package io.spiralhouse.cycletime.mcp.sdk

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.di.*
import io.modelcontextprotocol.kotlin.sdk.server.mcp
import org.slf4j.LoggerFactory

/**
 * Ktor routing configuration for MCP SDK v0.7.2 server.
 *
 * Integrates the official MCP Kotlin SDK with Ktor routing, providing:
 * - SDK-based transport layer (replacing EventBus)
 * - Automatic SSE + JSON-RPC handling
 * - Protocol negotiation and message validation
 *
 * The SDK handles all transport concerns automatically when registered with Ktor.
 * This eliminates the need for manual SSE/POST endpoint setup, message correlation,
 * and protocol handling that was required with the EventBus architecture.
 *
 * Note: SDK routing is configured in parallel mode during migration (Phase 2-5).
 * Legacy EventBus endpoints remain active for rollback capability until Phase 6.
 */

private val logger = LoggerFactory.getLogger("MCPSdkRouting")

/**
 * Configure MCP SDK routing at /mcp path.
 *
 * This function registers the SDK server with Ktor routing. The SDK automatically
 * handles:
 * - SSE endpoint for server-to-client events
 * - POST endpoint for client-to-server requests
 * - Protocol negotiation and capability exchange
 * - Request validation and error handling
 *
 * Usage from Application.kt:
 * ```
 * routing {
 *     configureMCPSdk()
 * }
 * ```
 *
 * The SDK will be available at:
 * - POST /mcp - JSON-RPC requests
 * - SSE connection for server-to-client events
 */
fun Routing.configureMCPSdk() {
    val sdkServer: MCPSdkServer by application.dependencies
    val startTime = System.currentTimeMillis()

    // Register SDK server with Ktor routing at /mcp path
    // The mcp extension automatically configures SSE + JSON-RPC endpoints
    mcp("/mcp") {
        sdkServer.server
    }

    val initTime = System.currentTimeMillis() - startTime
    logger.info("MCP SDK routing configured and operational in ${initTime}ms at /mcp")
    logger.info("SDK endpoints active: POST /mcp (JSON-RPC requests), SSE connection ready")
}

/**
 * Configure SDK routing in parallel mode with legacy EventBus.
 *
 * During migration (Phase 2-5), both SDK and EventBus transports run simultaneously:
 * - /mcp - SDK transport (new, primary)
 * - /mcp-old - EventBus transport (legacy, for rollback)
 *
 * This allows gradual migration and easy rollback if issues are discovered.
 * The legacy transport will be removed in Phase 6 (cleanup).
 *
 * @param legacyRouting Function to configure legacy EventBus routing
 */
fun Routing.configureMCPParallelMode(legacyRouting: Routing.() -> Unit) {
    logger.info("Configuring MCP in parallel mode (SDK + legacy EventBus)")

    // SDK transport (primary) - registers at /mcp
    configureMCPSdk()

    // Legacy EventBus transport (for rollback)
    route("/mcp-old") {
        legacyRouting()
    }

    logger.info("Parallel mode active: /mcp (SDK), /mcp-old (legacy)")
}
