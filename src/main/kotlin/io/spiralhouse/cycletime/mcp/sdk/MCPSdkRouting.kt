package io.spiralhouse.cycletime.mcp.sdk

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.mcp.providers.ProjectResourceProvider
import io.spiralhouse.cycletime.mcp.providers.IssueResourceProvider
import io.spiralhouse.cycletime.mcp.providers.SessionResourceProvider
import io.spiralhouse.cycletime.mcp.providers.WorkflowResourceProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultProjectToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultIssueToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultSessionToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultWorkflowToolProvider
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import org.slf4j.LoggerFactory

/**
 * Ktor routing configuration for MCP Streamable HTTP transport.
 *
 * Implements Streamable HTTP transport per MCP specification (2025-06-18):
 * - POST /mcp - JSON-RPC requests
 * - GET /mcp - Server-Sent Events for responses
 * - Origin validation and security controls
 * - Request size limits and rate limiting
 *
 * SSE transport was removed in SPI-763 after deprecation in MCP spec (2025-06-18).
 * Streamable HTTP is the sole supported transport for Claude Code v2.0.25+.
 */

private val logger = LoggerFactory.getLogger("MCPSdkRouting")

/**
 * Configure MCP Streamable HTTP transport (MCP Spec 2025-06-18).
 *
 * Implements Streamable HTTP handler for Claude Code v2.0.25+ compatibility.
 * Provides POST and GET endpoints at /mcp with SDK delegation for tools/list and resources/list.
 *
 * @param config Optional configuration for handler behavior (defaults to production settings)
 */
fun Routing.configureMCPStreamableHttp(config: StreamableHttpConfig? = null) {
    val startTime = System.currentTimeMillis()

    // Resolve dependencies from DI
    val sessionManager: SDKSessionManager by application.dependencies
    val mcpSdkServer: MCPSdkServer by application.dependencies

    // Resolve tool providers for tools/list delegation (SPI-764)
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

    // Resolve resource providers for resources/list delegation (SPI-764)
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

    // Use provided config or default production configuration
    // SPI-879: Test environments can disable rate limiting via config parameter
    val handlerConfig = config ?: StreamableHttpConfig(
        allowNullOrigin = true,  // For localhost development
        allowedOrigins = listOf(
            "http://localhost:.*",
            "https://.*\\.anthropic\\.com"
        ),
        maxRequestBodySize = 1_000_000,  // 1MB limit
        sessionCreationMaxPerWindow = 5,  // Max 5 per minute per IP
        sessionCreationWindowMs = 60_000  // 60 second window
    )

    // Create handler with security configuration
    // Security: Origin validation always enabled, request size limits, rate limiting
    val handler = StreamableHttpHandler(
        sessionManager = sessionManager,
        toolProviders = toolProviders,
        resourceProviders = resourceProviders,
        config = handlerConfig
    )

    // Register routes
    route("/mcp") {
        post {
            handler.handlePost(call)
        }

        get {
            handler.handleGet(call)
        }
    }

    val initTime = System.currentTimeMillis() - startTime
    logger.info("MCP Streamable HTTP transport configured at /mcp in ${initTime}ms")
    logger.info("Streamable HTTP endpoints active: POST /mcp (JSON-RPC), GET /mcp (SSE)")
}
