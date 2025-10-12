package io.spiralhouse.cycletime.mcp.sdk

import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.ServerCapabilities
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import org.slf4j.LoggerFactory

/**
 * MCP SDK v0.7.2 Server initialization and configuration.
 *
 * Provides official SDK-based transport layer replacing custom EventBus architecture.
 * The SDK handles:
 * - SSE transport via GET /mcp/events
 * - JSON-RPC via POST /mcp
 * - Protocol negotiation
 * - Message validation
 *
 * This class encapsulates server creation and capability configuration following
 * the official MCP Kotlin SDK patterns.
 *
 * @property version Application version for server identification
 */
class MCPSdkServer(
    private val version: String
) {
    private val logger = LoggerFactory.getLogger(MCPSdkServer::class.java)

    /**
     * SDK Server instance with configured capabilities.
     *
     * Capabilities:
     * - Resources: Full support with subscriptions and change notifications
     * - Tools: Full support for tool execution
     */
    val server: Server = Server(
        serverInfo = Implementation(
            name = "cycletime-ce",
            version = version
        ),
        options = ServerOptions(
            capabilities = ServerCapabilities(
                resources = ServerCapabilities.Resources(
                    subscribe = true,      // Support resource subscriptions
                    listChanged = true     // Notify resource list changes
                ),
                tools = ServerCapabilities.Tools(
                    listChanged = true     // Notify tool list changes
                )
            )
        )
    )

    init {
        logger.info("MCP SDK Server initialized (SDK v0.7.2, version: $version)")
        logger.debug("Server capabilities: resources (subscribe, listChanged), tools")
    }

    /**
     * Graceful shutdown handler.
     * SDK handles internal cleanup automatically.
     */
    suspend fun shutdown() {
        logger.info("MCP SDK Server shutting down")
        // SDK handles cleanup automatically - no manual resource management needed
    }
}
