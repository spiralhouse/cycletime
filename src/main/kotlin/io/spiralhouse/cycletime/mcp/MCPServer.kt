package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.domain.services.BuildInfo
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.server.MCPConfiguration
import io.spiralhouse.cycletime.mcp.server.MCPConnectionManager
import io.spiralhouse.cycletime.mcp.websocket.MCPWebSocketHandler
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sse.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import io.ktor.server.plugins.di.*
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.slf4j.LoggerFactory
import kotlin.system.measureTimeMillis

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
    
    // Initialize shared components
    val connectionManager = MCPConnectionManager(config)
    val protocolHandler = JsonRpcProtocolHandler() // Reuse single instance
    
    // WebSocket endpoint for MCP protocol communication
    webSocket("/mcp") {
        val connectionStartTime = System.currentTimeMillis()
        
        try {
            // Get MCP components from DI
            val methodHandler: McpMethodHandler by application.dependencies
            
            // Create handler for this connection
            val handler = MCPWebSocketHandler(
                config = config,
                methodHandler = methodHandler,
                protocolHandler = protocolHandler,
                connectionManager = connectionManager
            )
            
            // Handle connection
            val processingTime = measureTimeMillis {
                handler.handleConnection(this)
            }
            
            if (config.detailedLogging) {
                logger.info("MCP WebSocket connection closed after ${processingTime}ms")
            }
            
        } catch (e: Exception) {
            logger.error("MCP WebSocket error: ${e.message}", e)
            closeReason.await()?.let { reason ->
                logger.info("Connection closed: ${reason.message}")
            }
        }
    }
    
    // Background tasks can be added here if needed
    
    // Connection cleanup task
    GlobalScope.launch {
        while (isActive) {
            delay(30_000) // Check every 30 seconds
            try {
                connectionManager.cleanupStaleConnections(config.timeout * 2)
            } catch (e: Exception) {
                logger.error("Connection cleanup error: ${e.message}")
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

    // SSE endpoint for MCP communication (legacy support with monitoring)
    sse("/mcp/events") {
        val sseConnectionId = "sse-${System.currentTimeMillis()}"
        
        send("data: {\"type\":\"connected\",\"message\":\"Connected to ${config.serverName} v${config.serverVersion}\"}\n\n")
        
        // Enhanced heartbeat with stats
        while (true) {
            delay(30_000) // 30 seconds
            
            val stats = connectionManager.getStatistics()
            val heartbeat = if (config.metricsEnabled) {
                """{"type":"heartbeat","connections":${stats.activeCount},"requests":${stats.totalRequests}}"""
            } else {
                """{"type":"heartbeat"}"""
            }
            
            send("data: $heartbeat\n\n")
        }
    }

    // Monitoring endpoint for connection statistics
    get("/mcp/stats") {
        if (!config.metricsEnabled) {
            call.respond(mapOf("error" to "Metrics disabled"))
            return@get
        }
        
        val connStats = connectionManager.getStatistics()
        
        call.respond(mapOf(
            "connections" to mapOf(
                "active" to connStats.activeCount,
                "totalRequests" to connStats.totalRequests,
                "totalErrors" to connStats.totalErrors,
                "averageLatency" to "${connStats.averageLatency}ms",
                "maxLatency" to "${connStats.maxLatency}ms",
                "errorRate" to if (connStats.totalRequests > 0) {
                    (connStats.totalErrors.toDouble() / connStats.totalRequests * 100).format(2)
                } else 0.0
            ),
            "config" to mapOf(
                "maxConnections" to config.maxConnections,
                "asyncProcessing" to config.asyncProcessingEnabled,
                "caching" to config.resourceCacheEnabled,
                "optimized" to config.isOptimized()
            )
        ))
    }
    
    val initTime = System.currentTimeMillis() - startTime
    logger.info("MCP routing configured in ${initTime}ms (optimizations: ${if (config.isOptimized()) "enabled" else "disabled"})")
}
