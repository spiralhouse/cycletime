package io.spiralhouse.cycletime.mcp.sdk

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.di.*
import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.ServerCapabilities
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.modelcontextprotocol.kotlin.sdk.server.mcp
import io.spiralhouse.cycletime.mcp.providers.DefaultProjectResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultIssueResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultSessionResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultWorkflowResourceProvider
import io.spiralhouse.cycletime.mcp.providers.ProjectResourceProvider
import io.spiralhouse.cycletime.mcp.providers.IssueResourceProvider
import io.spiralhouse.cycletime.mcp.providers.SessionResourceProvider
import io.spiralhouse.cycletime.mcp.providers.WorkflowResourceProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultProjectToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultIssueToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultSessionToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultWorkflowToolProvider
import io.spiralhouse.cycletime.mcp.sdk.adapters.SDKResourceAdapter
import io.spiralhouse.cycletime.mcp.sdk.adapters.SDKToolAdapter
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import kotlinx.coroutines.runBlocking
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
 * Configure MCP SDK routing (SDK controls path).
 *
 * This function constructs the SDK server inline (SDK-native pattern) and registers
 * it with Ktor routing. The SDK automatically handles:
 * - SSE endpoint for server-to-client events
 * - POST endpoint for client-to-server requests
 * - Protocol negotiation and capability exchange
 * - Request validation and error handling
 *
 * ARCHITECTURAL NOTE: The SDK requires inline Server construction within the mcp { }
 * lambda. Returning a pre-created Server from DI causes registration failure.
 * Business logic dependencies (tool providers, resource providers) are resolved
 * from DI, but the Server itself must be constructed inline.
 *
 * SDK PATH WORKAROUND: SDK v0.7.2 has Routing.mcp() extension that can't be called
 * inside route() blocks (receiver context issue). We call mcp() directly on Routing,
 * letting the SDK control the path. Once PR #314 is merged, we can wrap in route("/mcp").
 * Reference: https://github.com/modelcontextprotocol/kotlin-sdk/pull/314
 *
 * Usage from Application.kt:
 * ```
 * routing {
 *     configureMCPSdk()
 * }
 * ```
 *
 * The SDK will be available at its default path (SDK-controlled).
 */
fun Routing.configureMCPSdk() {
    val startTime = System.currentTimeMillis()

    // Resolve dependencies from DI (business logic components)
    val sessionManager: SDKSessionManager by application.dependencies
    val version = System.getProperty("cycletime.version") ?: "unknown"

    // Tool providers (resolve from DI)
    val projectToolProvider: DefaultProjectToolProvider by application.dependencies
    val issueToolProvider: DefaultIssueToolProvider by application.dependencies
    val sessionToolProvider: DefaultSessionToolProvider by application.dependencies
    val workflowToolProvider: DefaultWorkflowToolProvider by application.dependencies

    val toolProviders = listOf(
        projectToolProvider,
        issueToolProvider,
        sessionToolProvider,
        workflowToolProvider
    )

    // Resource providers (resolve from DI and cast to full ResourceProvider interface)
    val projectResourceProvider: ProjectResourceProvider by application.dependencies
    val issueResourceProvider: IssueResourceProvider by application.dependencies
    val sessionResourceProvider: SessionResourceProvider by application.dependencies
    val workflowResourceProvider: WorkflowResourceProvider by application.dependencies

    val resourceProviders = listOf(
        projectResourceProvider as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
        issueResourceProvider as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
        sessionResourceProvider as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
        workflowResourceProvider as io.spiralhouse.cycletime.mcp.resources.ResourceProvider
    )

    logger.debug("SDK routing: Resolved ${toolProviders.size} tool providers and ${resourceProviders.size} resource providers from DI")

    // SDK v0.7.2 WORKAROUND: Construct Server inline within mcp { } lambda
    // Registers at root path / (SDK controls path)
    logger.info("➡️  BEFORE mcp { } call - About to register SDK routes")

    mcp {
        logger.info("🔴 INSIDE mcp { } lambda - EXECUTION STARTED")
        logger.info("🔴 Lambda context: ${this::class.simpleName}")

        val server = Server(
            serverInfo = Implementation(
                name = "cycletime-ce",
                version = version
            ),
            options = ServerOptions(
                capabilities = ServerCapabilities(
                    resources = ServerCapabilities.Resources(
                        subscribe = true,
                        listChanged = true
                    ),
                    tools = ServerCapabilities.Tools(
                        listChanged = true
                    )
                )
            )
        )

        logger.info("🟢 Server instance created successfully")
        logger.info("📝 Registering ${toolProviders.size} tool providers and ${resourceProviders.size} resource providers")

        // CRITICAL: runBlocking may block Ktor initialization
        // TODO: Investigate if registration can happen after Server return
        try {
            runBlocking {
                logger.debug("  → Registering tools from ${toolProviders.size} providers")
                toolProviders.forEach { provider ->
                    SDKToolAdapter(provider, sessionManager).registerTools(server)
                }

                logger.debug("  → Registering resources from ${resourceProviders.size} providers")
                resourceProviders.forEach { provider ->
                    SDKResourceAdapter(provider, sessionManager).registerResources(server)
                }
            }
            logger.info("✅ Tool/resource registration complete")
        } catch (e: Exception) {
            logger.error("❌ Registration failed: ${e.message}", e)
            throw e
        }

        logger.info("🔴 INSIDE mcp { } lambda - RETURNING SERVER")
        server  // Must return Server instance
    }

    logger.info("⬅️  AFTER mcp { } call - SDK routes should be registered")

    val initTime = System.currentTimeMillis() - startTime
    logger.info("MCP SDK routing configured at / in ${initTime}ms")
    logger.info("SDK endpoints active: POST / (JSON-RPC requests), SSE connection ready")
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
