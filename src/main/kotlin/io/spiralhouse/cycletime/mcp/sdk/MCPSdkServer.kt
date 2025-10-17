package io.spiralhouse.cycletime.mcp.sdk

import io.modelcontextprotocol.kotlin.sdk.EmptyRequestResult
import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.LoggingMessageNotification
import io.modelcontextprotocol.kotlin.sdk.Method
import io.modelcontextprotocol.kotlin.sdk.ServerCapabilities
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.spiralhouse.cycletime.mcp.resources.ResourceProvider
import io.spiralhouse.cycletime.mcp.sdk.adapters.SDKResourceAdapter
import io.spiralhouse.cycletime.mcp.sdk.adapters.SDKToolAdapter
import io.spiralhouse.cycletime.mcp.tools.ToolProvider
import kotlinx.coroutines.runBlocking
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
 * This class registers tool and resource adapters that bridge existing business logic
 * to the SDK API (SPI-700).
 *
 * @property version Application version for server identification
 * @property sessionManager Session manager for SDK session handling
 * @property toolProviders List of tool providers to register
 * @property resourceProviders List of resource providers to register
 */
class MCPSdkServer(
    private val version: String,
    private val sessionManager: SDKSessionManager? = null,
    private val toolProviders: List<ToolProvider> = emptyList(),
    private val resourceProviders: List<ResourceProvider> = emptyList()
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
        logger.info("MCP SDK Server initializing (SDK v0.7.2, version: $version)")

        // Register logging/setLevel handler (SPI-716)
        registerLoggingHandler()

        // Register all tool and resource providers via adapters (if provided)
        if (sessionManager != null && (toolProviders.isNotEmpty() || resourceProviders.isNotEmpty())) {
            runBlocking {
                registerToolProviders()
                registerResourceProviders()
            }
            logger.info("MCP SDK Server initialized with ${toolProviders.size} tool providers, " +
                       "${resourceProviders.size} resource providers")
        } else {
            logger.info("MCP SDK Server initialized in test mode (no providers registered)")
        }

        logger.debug("Server capabilities: resources (subscribe, listChanged), tools, logging")
    }

    /**
     * Register logging/setLevel request handler (SPI-716).
     *
     * Per MCP spec (2024-11-05), servers that declare logging capability MUST implement
     * the logging/setLevel request handler. This handler accepts a log level parameter
     * (debug, info, notice, warning, error, critical, alert, emergency) and returns
     * an empty success response.
     *
     * The log level is stored but not actively used - we acknowledge the client's
     * preference without changing server-side logging behavior. This is a minimal
     * spec-compliant implementation.
     */
    private fun registerLoggingHandler() {
        server.setRequestHandler<LoggingMessageNotification.SetLevelRequest>(
            Method.Defined.LoggingSetLevel
        ) { request, _ ->
            // Log the level change for debugging purposes
            logger.debug("Client requested log level: ${request.level}")

            // Return empty success response (spec-compliant)
            EmptyRequestResult()
        }
        logger.debug("Registered logging/setLevel handler")
    }

    /**
     * Register all tool providers via adapters.
     *
     * Each tool provider is wrapped in an SDKToolAdapter that bridges the existing
     * tool implementation to the SDK registration API.
     */
    private suspend fun registerToolProviders() {
        val manager = sessionManager ?: return
        toolProviders.forEach { provider ->
            val adapter = SDKToolAdapter(provider, manager)
            adapter.registerTools(server)
        }
        logger.debug("Registered ${toolProviders.size} tool providers")
    }

    /**
     * Register all resource providers via adapters.
     *
     * Each resource provider is wrapped in an SDKResourceAdapter that bridges the existing
     * resource implementation to the SDK registration API.
     */
    private suspend fun registerResourceProviders() {
        val manager = sessionManager ?: return
        resourceProviders.forEach { provider ->
            val adapter = SDKResourceAdapter(provider, manager)
            adapter.registerResources(server)
        }
        logger.debug("Registered ${resourceProviders.size} resource providers")
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
