package io.spiralhouse.cycletime.mcp.integration

import io.spiralhouse.cycletime.mcp.server.MCPConnectionManager
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.protocol.ProtocolHandler
import io.spiralhouse.cycletime.mcp.providers.ProjectResourceProvider
import io.spiralhouse.cycletime.mcp.providers.IssueResourceProvider  
import io.spiralhouse.cycletime.mcp.providers.SessionResourceProvider
import io.spiralhouse.cycletime.mcp.providers.WorkflowResourceProvider
import io.spiralhouse.cycletime.mcp.resources.ResourceRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolProvider
import kotlinx.coroutines.*
import org.slf4j.LoggerFactory
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Simplified MCP integration service focused on core functionality.
 * Eliminated complex monitoring, metrics, and caching for MVP clarity.
 */
class MCPIntegrationService(
    private val methodHandler: McpMethodHandler,
    private val protocolHandler: ProtocolHandler,
    private val config: MCPServerConfig = MCPServerConfig(),
    private val resourceRegistry: ResourceRegistry? = null,
    private val toolRegistry: ToolRegistry? = null,
    private val projectResourceProvider: ProjectResourceProvider? = null,
    private val issueResourceProvider: IssueResourceProvider? = null,
    private val sessionResourceProvider: SessionResourceProvider? = null,
    private val workflowResourceProvider: WorkflowResourceProvider? = null,
    private val toolProviders: List<ToolProvider> = emptyList()
) {
    
    private val logger = LoggerFactory.getLogger(MCPIntegrationService::class.java)
    private val isRunning = AtomicBoolean(false)
    private var serverStartTime: Long = 0
    
    // Focused provider registry for registration logic
    private val providerRegistry = MCPProviderRegistry(resourceRegistry, toolRegistry)
    
    /**
     * Initialize the MCP integration service (providers only).
     * The WebSocket server is handled by the main Ktor application.
     */
    suspend fun start() {
        if (isRunning.compareAndSet(false, true)) {
            try {
                serverStartTime = System.currentTimeMillis()
                logger.info("Initializing MCP integration service")
                
                // Register providers using focused registry
                val resourceProviders = listOfNotNull(
                    projectResourceProvider as? io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
                    issueResourceProvider as? io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
                    sessionResourceProvider as? io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
                    workflowResourceProvider as? io.spiralhouse.cycletime.mcp.resources.ResourceProvider
                )
                
                val result = providerRegistry.registerProviders(resourceProviders, toolProviders)
                
                val totalStartupTime = System.currentTimeMillis() - serverStartTime
                logger.info(
                    "MCP integration initialized in ${totalStartupTime}ms " +
                    "(${result.resourceCount} resources, ${result.toolCount} tools)"
                )
                
            } catch (e: Exception) {
                isRunning.set(false)
                logger.error("Failed to initialize MCP integration: ${e.message}", e)
                throw MCPIntegrationException("Failed to initialize MCP integration", e)
            }
        } else {
            logger.warn("MCP integration is already initialized")
        }
    }
    
    /**
     * Stop the MCP integration service gracefully.
     */
    suspend fun stop() {
        if (isRunning.compareAndSet(true, false)) {
            try {
                logger.info("Stopping MCP integration service")
                
                val uptime = if (serverStartTime > 0) {
                    System.currentTimeMillis() - serverStartTime
                } else 0
                
                logger.info("MCP integration stopped (uptime: ${uptime}ms)")
                
            } catch (e: Exception) {
                logger.error("Error stopping MCP integration: ${e.message}", e)
            }
        } else {
            logger.debug("MCP integration is not running")
        }
    }
    
    /**
     * Check if the MCP server is running.
     */
    fun isRunning(): Boolean = isRunning.get()
    
    /**
     * Get simplified server status.
     */
    fun getStatus(): MCPServerStatus {
        return MCPServerStatus(
            isRunning = isRunning(),
            port = config.port,
            host = config.host,
            path = config.path,
            enableSsl = config.enableSsl,
            registeredResources = listOfNotNull(
                projectResourceProvider, 
                issueResourceProvider, 
                sessionResourceProvider, 
                workflowResourceProvider
            ).size,
            registeredTools = toolProviders.size,
            uptimeMs = if (isRunning.get() && serverStartTime > 0) {
                System.currentTimeMillis() - serverStartTime
            } else 0
        )
    }
    
}

/**
 * Configuration for the MCP integration service.
 */
data class MCPServerConfig(
    val port: Int = System.getenv("MCP_PORT")?.toIntOrNull() ?: 3006,
    val host: String = System.getenv("MCP_HOST") ?: "0.0.0.0", 
    val path: String = System.getenv("MCP_PATH") ?: "/mcp",
    val enableSsl: Boolean = System.getenv("MCP_SSL")?.toBoolean() ?: false,
    val enabled: Boolean = System.getenv("MCP_ENABLED")?.toBoolean() ?: true,
    val pingPeriod: Long = 30000L, // 30 seconds
    val timeout: Long = 60000L, // 60 seconds
    val maxFrameSize: Long = 1024 * 1024L, // 1MB
    val masking: Boolean = false
)

/**
 * Simplified status information for MCP server.
 */
data class MCPServerStatus(
    val isRunning: Boolean,
    val port: Int,
    val host: String,
    val path: String,
    val enableSsl: Boolean,
    val registeredResources: Int = 0,
    val registeredTools: Int = 0,
    val uptimeMs: Long = 0
)

/**
 * Exception thrown by MCP integration operations.
 */
class MCPIntegrationException(message: String, cause: Throwable? = null) : Exception(message, cause)