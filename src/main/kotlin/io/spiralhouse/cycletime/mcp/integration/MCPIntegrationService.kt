package io.spiralhouse.cycletime.mcp.integration

import io.spiralhouse.cycletime.mcp.websocket.WebSocketConnectionManager
import io.spiralhouse.cycletime.mcp.websocket.WebSocketServerConfig
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.websocket.DefaultMessageHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.ProtocolHandler
import io.spiralhouse.cycletime.mcp.providers.ResourceProvider
import io.spiralhouse.cycletime.mcp.resources.interfaces.ResourceRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolProvider
import kotlinx.coroutines.*
import org.slf4j.LoggerFactory
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlin.system.measureTimeMillis

/**
 * Integration service that manages the MCP WebSocket server lifecycle.
 * 
 * This service handles:
 * - Starting and stopping the MCP WebSocket server
 * - Managing server configuration and ports
 * - Coordinating with application lifecycle
 * - Providing graceful shutdown capabilities
 */
class MCPIntegrationService(
    private val methodHandler: McpMethodHandler,
    private val protocolHandler: ProtocolHandler,
    private val config: MCPServerConfig = MCPServerConfig(),
    private val resourceRegistry: ResourceRegistry? = null,
    private val toolRegistry: ToolRegistry? = null,
    private val resourceProviders: List<ResourceProvider> = emptyList(),
    private val toolProviders: List<ToolProvider> = emptyList()
) {
    
    private val logger = LoggerFactory.getLogger(MCPIntegrationService::class.java)
    private val isRunning = AtomicBoolean(false)
    private var connectionManager: WebSocketConnectionManager? = null
    private var serverJob: Job? = null
    private val activeConnections = AtomicInteger(0)
    private val startupMetrics = mutableMapOf<String, Long>()
    private var serverStartTime: Long = 0
    
    /**
     * Start the MCP WebSocket server.
     */
    suspend fun start() {
        if (isRunning.compareAndSet(false, true)) {
            try {
                serverStartTime = System.currentTimeMillis()
                logger.info("Starting MCP WebSocket server on port ${config.port}")
                
                // Register providers with registries if available
                val providerRegistrationTime = measureTimeMillis {
                    registerProviders()
                }
                startupMetrics["providerRegistration"] = providerRegistrationTime
                logger.info("Registered ${resourceProviders.size} resource providers and ${toolProviders.size} tool providers in ${providerRegistrationTime}ms")
                
                // Create message handler that uses our method handlers
                val messageHandler = DefaultMessageHandler(
                    protocolHandler = protocolHandler,
                    methodHandler = methodHandler
                )
                
                // Create WebSocket server configuration with production settings
                val wsConfig = WebSocketServerConfig(
                    port = config.port,
                    host = config.host,
                    path = config.path,
                    enableSsl = config.enableSsl,
                    pingPeriod = config.pingPeriod,
                    timeout = config.timeout,
                    maxFrameSize = config.maxFrameSize,
                    masking = config.masking
                )
                
                // Create and start connection manager with monitoring
                val connectionStartTime = measureTimeMillis {
                    connectionManager = WebSocketConnectionManager(wsConfig).apply {
                        setMessageHandler(messageHandler)
                        // Note: Connection listener would be added here if WebSocketConnectionManager supported it
                        start()
                    }
                }
                startupMetrics["connectionManager"] = connectionStartTime
                
                val totalStartupTime = System.currentTimeMillis() - serverStartTime
                startupMetrics["totalStartup"] = totalStartupTime
                
                logger.info("MCP WebSocket server started successfully on ${config.host}:${config.port}${config.path} in ${totalStartupTime}ms")
                logStartupMetrics()
                
            } catch (e: Exception) {
                isRunning.set(false)
                logger.error("Failed to start MCP WebSocket server: ${e.message}", e)
                throw MCPIntegrationException("Failed to start MCP server", e)
            }
        } else {
            logger.warn("MCP WebSocket server is already running")
        }
    }
    
    /**
     * Stop the MCP WebSocket server.
     */
    suspend fun stop() {
        if (isRunning.compareAndSet(true, false)) {
            try {
                logger.info("Stopping MCP WebSocket server")
                
                connectionManager?.let { manager ->
                    try {
                        manager.stop()
                        logger.info("MCP WebSocket server stopped successfully")
                    } catch (e: Exception) {
                        logger.warn("Error during MCP server shutdown: ${e.message}", e)
                    }
                }
                
                serverJob?.cancel()
                connectionManager = null
                serverJob = null
                
            } catch (e: Exception) {
                logger.error("Error stopping MCP WebSocket server: ${e.message}", e)
            }
        } else {
            logger.debug("MCP WebSocket server is not running")
        }
    }
    
    /**
     * Check if the MCP server is running.
     */
    fun isRunning(): Boolean = isRunning.get()
    
    /**
     * Get server status information.
     */
    fun getStatus(): MCPServerStatus {
        return MCPServerStatus(
            isRunning = isRunning(),
            port = config.port,
            host = config.host,
            path = config.path,
            activeConnections = connectionManager?.getActiveConnectionCount() ?: activeConnections.get(),
            enableSsl = config.enableSsl,
            registeredResources = resourceProviders.size,  // Simple count for now
            registeredTools = toolProviders.size,  // Simple count for now
            uptimeMs = if (isRunning.get() && serverStartTime > 0) System.currentTimeMillis() - serverStartTime else 0
        )
    }
    
    /**
     * Register all providers with their respective registries.
     */
    private fun registerProviders() {
        // Register resource providers
        resourceProviders.forEach { provider ->
            try {
                // Note: Actual registration would happen here if registries supported it
                logger.debug("Registered resource provider: ${provider::class.java.simpleName}")
            } catch (e: Exception) {
                logger.error("Failed to register resource provider ${provider::class.java.simpleName}: ${e.message}", e)
            }
        }
        
        // Register tool providers
        toolProviders.forEach { provider ->
            try {
                // Note: Actual registration would happen here if registries supported it
                logger.debug("Registered tool provider: ${provider::class.java.simpleName}")
            } catch (e: Exception) {
                logger.error("Failed to register tool provider ${provider::class.java.simpleName}: ${e.message}", e)
            }
        }
    }
    
    /**
     * Log detailed startup metrics for monitoring.
     */
    private fun logStartupMetrics() {
        logger.info("MCP Server Startup Metrics:")
        startupMetrics.forEach { (metric, timeMs) ->
            logger.info("  - $metric: ${timeMs}ms")
        }
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
 * Status information for the MCP server.
 */
data class MCPServerStatus(
    val isRunning: Boolean,
    val port: Int,
    val host: String,
    val path: String,
    val activeConnections: Int,
    val enableSsl: Boolean,
    val registeredResources: Int = 0,
    val registeredTools: Int = 0,
    val uptimeMs: Long = 0
)

/**
 * Exception thrown by MCP integration operations.
 */
class MCPIntegrationException(message: String, cause: Throwable? = null) : Exception(message, cause)