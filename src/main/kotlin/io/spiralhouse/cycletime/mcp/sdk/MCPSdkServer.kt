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
 * MCP SDK v0.7.6 Server initialization and configuration.
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
     * - Resources: Read-only support (subscribe/listChanged disabled until SPI-579)
     * - Tools: Full support for tool execution with change notifications
     */
    val server: Server = Server(
        serverInfo = Implementation(
            name = "cycletime-ce",
            version = version
        ),
        options = ServerOptions(
            capabilities = ServerCapabilities(
                resources = ServerCapabilities.Resources(
                    subscribe = false,     // Not implemented - see SPI-579
                    listChanged = false    // Not implemented - see SPI-579
                ),
                // KNOWN SDK LIMITATION (SPI-777):
                // MCP Kotlin SDK v0.7.6 has hardcoded defaults: subscribe=true, listChanged=true
                // Our explicit false values above are ignored by SDK serialization
                // This is a known SDK issue - capabilities will advertise subscription support
                // even though our ResourceRpcHandler throws UnsupportedOperationException
                // Clients should gracefully handle this mismatch until SDK is fixed
                tools = ServerCapabilities.Tools(
                    listChanged = true     // Notify tool list changes
                )
            )
        )
    )

    init {
        logger.info("MCP SDK Server initializing (SDK v0.7.6, version: $version)")

        // TODO (SPI-716): Logging/setLevel handler registration pending SDK API support
        // The logging capability requires request handler registration which is not yet
        // available in the SDK. See registerLoggingHandler() implementation below.
        // registerLoggingHandler()

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

        logger.debug("Server capabilities: resources (read-only), tools (listChanged)")
    }

    // TODO (SPI-716): Re-enable when SDK provides request handler registration API
    /*
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
     *
     * NOTE: In production, the handler is registered in MCPSdkRouting.kt on the inline-created
     * Server instance. This registration is kept here for test mode when MCPSdkServer is
     * instantiated directly without going through the routing layer.
     */
    private fun registerLoggingHandler() {
        server.setRequestHandler(
            Method.Defined.LoggingSetLevel
        ) { request: LoggingMessageNotification.SetLevelRequest, extra: RequestHandlerExtra ->
            // Log the level change for debugging purposes
            logger.debug("Client requested log level: ${request.level}")

            // Return empty success response (spec-compliant)
            EmptyRequestResult()
        }
        logger.debug("Registered logging/setLevel handler")
    }
    */

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
