package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.server.MCPConfiguration
import io.spiralhouse.cycletime.mcp.server.MCPConnectionManager
import io.spiralhouse.cycletime.mcp.server.ConnectionCleanupService
import io.spiralhouse.cycletime.mcp.sse.mcpSSEEndpoint
import io.spiralhouse.cycletime.mcp.http.mcpPostEndpoint
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import io.spiralhouse.cycletime.mcp.correlation.EventBus
import io.spiralhouse.cycletime.mcp.correlation.MessageCorrelator
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.di.*
import kotlinx.coroutines.*
import kotlin.time.Duration.Companion.seconds
import kotlinx.serialization.Serializable
import org.slf4j.LoggerFactory

// Extension function for formatting doubles
private fun Double.format(decimals: Int): String = "%.${decimals}f".format(this)

@Serializable
data class MCPCapabilities(
    val resources: Boolean = true,
    val tools: Boolean = true,
    val prompts: Boolean = false
)

@Serializable
data class MCPServerInfo(
    val name: String,
    val version: String,
    val description: String,
    val capabilities: MCPCapabilities,
    val activeConnections: Int,
    val totalRequests: Long,
    val averageLatency: String? = null,
    val errorRate: String? = null
)

fun Routing.configureMCP() {
    val logger = LoggerFactory.getLogger("MCPRouting")
    val startTime = System.currentTimeMillis()
    
    // Load and validate configuration
    val config = MCPConfiguration.fromEnvironment()
    logger.info("MCP Configuration loaded: ${config.serverName} v${config.serverVersion}")
    
    // Get shared components from DI
    val connectionManager: MCPConnectionManager by application.dependencies

    // Initialize and start the cleanup service with proper lifecycle management
    val cleanupService = ConnectionCleanupService(
        connectionManager = connectionManager,
        config = config,
        cleanupInterval = 30.seconds,
        maxRetries = 3
    )
    
    // Start cleanup service using the application's coroutine scope
    // This ensures it's properly cancelled when the application shuts down
    cleanupService.start(application)

    // Get SSE transport components from DI (SPI-665)
    val sessionManager: MCPSessionManager by application.dependencies
    val eventBus: EventBus by application.dependencies
    val correlator: MessageCorrelator by application.dependencies
    val methodHandler: McpMethodHandler by application.dependencies

    // SSE endpoint for server-to-client events (SPI-665)
    route("") {
        mcpSSEEndpoint(sessionManager, eventBus)
    }

    // POST endpoint for client-to-server requests (SPI-665)
    route("") {
        mcpPostEndpoint(sessionManager, eventBus, correlator, methodHandler)
    }

    // Register cleanup service for proper shutdown
    // The cleanup service is already running via application scope
    // We just need to ensure it's stopped when the application stops
    application.monitor.subscribe(io.ktor.server.application.ApplicationStopped) {
        runBlocking {
            try {
                cleanupService.stop()
                logger.info("MCP cleanup service stopped gracefully")
            } catch (e: Exception) {
                logger.error("Failed to stop MCP cleanup service: ${e.message}", e)
            }
        }
    }
    
    // MCP Server info endpoint with enhanced monitoring
    get("/mcp") {
        val stats = connectionManager.getStatistics()
        // Cache stats removed for simplicity
        
        // Create response using proper data class for JSON serialization
        val response = MCPServerInfo(
            name = config.serverName,
            version = config.serverVersion,
            description = config.serverDescription,
            capabilities = MCPCapabilities(
                resources = true,
                tools = true,
                prompts = false
            ),
            activeConnections = stats.activeCount,
            totalRequests = stats.totalRequests,
            averageLatency = if (config.metricsEnabled) "${stats.averageLatency}ms" else null,
            errorRate = if (config.metricsEnabled && stats.totalRequests > 0) {
                "${(stats.totalErrors.toDouble() / stats.totalRequests * 100).format(2)}%"
            } else if (config.metricsEnabled) "0%" else null
        )
        call.respond(response)
    }

    // Legacy SSE endpoint removed - replaced by new SSE transport implementation (SPI-665)
    // See MCPSSEHandler.kt for the new implementation

    // Monitoring endpoint for connection statistics
    get("/mcp/stats") {
        if (!config.metricsEnabled) {
            call.respond(mapOf("error" to "Metrics disabled"))
            return@get
        }
        
        val connStats = connectionManager.getStatistics()
        val cleanupStatus = cleanupService.getStatus()
        
        call.respond(mapOf(
            "connections" to mapOf(
                "active" to connStats.activeCount.toString(),
                "totalRequests" to connStats.totalRequests.toString(),
                "totalErrors" to connStats.totalErrors.toString(),
                "averageLatency" to "${connStats.averageLatency}ms",
                "maxLatency" to "${connStats.maxLatency}ms",
                "errorRate" to if (connStats.totalRequests > 0) {
                    "${(connStats.totalErrors.toDouble() / connStats.totalRequests * 100).format(2)}%"
                } else "0.0%"
            ),
            "cleanup" to mapOf(
                "isRunning" to cleanupStatus.isRunning.toString(),
                "isActive" to cleanupStatus.isActive.toString(),
                "consecutiveFailures" to cleanupStatus.consecutiveFailures.toString(),
                "intervalSeconds" to cleanupStatus.cleanupInterval.inWholeSeconds.toString()
            ),
            "config" to mapOf(
                "maxConnections" to config.maxConnections.toString(),
                "asyncProcessing" to config.asyncProcessingEnabled.toString(),
                "caching" to config.resourceCacheEnabled.toString(),
                "optimized" to config.isOptimized().toString()
            )
        ))
    }
    
    val initTime = System.currentTimeMillis() - startTime
    logger.info("MCP routing configured in ${initTime}ms (optimizations: ${if (config.isOptimized()) "enabled" else "disabled"})")
}
