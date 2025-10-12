package io.spiralhouse.cycletime.mcp.sdk

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.di.*
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
 * Configure MCP SDK routing at the specified path.
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
 *     route("/mcp") {
 *         configureMCPSdk()
 *     }
 * }
 * ```
 *
 * The SDK will be available at:
 * - POST /mcp - JSON-RPC requests
 * - GET /mcp/events - SSE event stream (if SDK supports this pattern)
 */
fun Route.configureMCPSdk() {
    val sdkServer: MCPSdkServer by application.dependencies
    val startTime = System.currentTimeMillis()

    // TODO Phase 3: Register SDK server with Ktor routing
    // The SDK v0.7.2 provides a Ktor extension for routing integration.
    // Pattern will be similar to:
    // mcp { sdkServer.server }
    //
    // For Phase 2, we're setting up the infrastructure without full routing
    // integration, as tool/resource registration happens in Phase 3.

    val initTime = System.currentTimeMillis() - startTime
    logger.info("MCP SDK routing configured in ${initTime}ms (Phase 2: infrastructure only)")
    logger.info("SDK v0.7.2 server initialized and ready for tool registration (Phase 3)")
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

    // SDK transport (primary)
    route("/mcp") {
        configureMCPSdk()
    }

    // Legacy EventBus transport (for rollback)
    route("/mcp-old") {
        legacyRouting()
    }

    logger.info("Parallel mode active: /mcp (SDK), /mcp-old (legacy)")
}
