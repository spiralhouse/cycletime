package io.spiralhouse.cycletime.mcp

import io.spiralhouse.cycletime.domain.services.BuildInfo
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.server.MCPConfiguration
import io.spiralhouse.cycletime.mcp.server.MCPConnectionManager
import io.spiralhouse.cycletime.mcp.server.MCPResourceCache
import io.spiralhouse.cycletime.mcp.server.OptimizedMCPWebSocketHandler
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

@Serializable
data class MCPServerInfo(
    val name: String,
    val version: String,
    val description: String,
    val capabilities: MCPCapabilities
)

// Non-serializable version with metadata for internal use
data class MCPServerInfoWithMetadata(
    val name: String,
    val version: String,
    val description: String,
    val capabilities: MCPCapabilities,
    val metadata: Map<String, Any> = emptyMap()
)

// Extension function for formatting doubles
private fun Double.format(decimals: Int): String = "%.${decimals}f".format(this)

@Serializable
data class MCPCapabilities(
    val resources: Boolean = true,
    val tools: Boolean = true,
    val prompts: Boolean = false
)

fun Routing.configureMCP() {
    val logger = LoggerFactory.getLogger("MCPRouting")
    val startTime = System.currentTimeMillis()
    
    // Load and validate configuration
    val config = MCPConfiguration.fromEnvironment()
    logger.info("MCP Configuration loaded: ${config.serverName} v${config.serverVersion}")
    
    // Initialize shared components
    val connectionManager = MCPConnectionManager(config)
    val resourceCache = MCPResourceCache(config)
    val protocolHandler = JsonRpcProtocolHandler() // Reuse single instance
    
    // Optimized WebSocket endpoint for MCP protocol communication
    webSocket("/mcp") {
        val connectionStartTime = System.currentTimeMillis()
        
        try {
            // Get MCP components from DI
            val methodHandler: McpMethodHandler by application.dependencies
            
            // Create optimized handler for this connection
            val handler = OptimizedMCPWebSocketHandler(
                config = config,
                methodHandler = methodHandler,
                protocolHandler = protocolHandler,
                connectionManager = connectionManager,
                resourceCache = resourceCache
            )
            
            // Handle connection with all optimizations
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
    
    // Start background maintenance tasks
    if (config.resourceCacheEnabled) {
        GlobalScope.launch {
            while (isActive) {
                delay(60_000) // Run maintenance every minute
                try {
                    resourceCache.maintenance()
                } catch (e: Exception) {
                    logger.error("Cache maintenance error: ${e.message}")
                }
            }
        }
    }
    
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
        val cacheStats = if (config.resourceCacheEnabled) {
            resourceCache.getStatistics()
        } else null
        
        // Create response with metadata as separate fields for JSON serialization
        val response = buildMap<String, Any> {
            put("name", config.serverName)
            put("version", config.serverVersion)
            put("description", config.serverDescription)
            put("capabilities", MCPCapabilities(
                resources = true,
                tools = true,
                prompts = false
            ))
            put("activeConnections", stats.activeCount)
            put("totalRequests", stats.totalRequests)
            if (config.metricsEnabled) {
                put("averageLatency", "${stats.averageLatency}ms")
                put("errorRate", if (stats.totalRequests > 0) {
                    "${(stats.totalErrors.toDouble() / stats.totalRequests * 100).format(2)}%"
                } else "0%")
            }
            if (cacheStats != null) {
                put("cacheHitRate", "${(cacheStats.hitRate * 100).format(2)}%")
                put("cacheEntries", cacheStats.entries)
            }
        }
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
        val cacheStats = resourceCache.getStatistics()
        
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
            "cache" to mapOf(
                "enabled" to config.resourceCacheEnabled,
                "entries" to cacheStats.entries,
                "size" to cacheStats.totalSize,
                "hits" to cacheStats.hits,
                "misses" to cacheStats.misses,
                "hitRate" to (cacheStats.hitRate * 100).format(2),
                "evictions" to cacheStats.evictions,
                "hotResources" to cacheStats.hotResources.take(5).map { resource ->
                    mapOf(
                        "uri" to resource.uri,
                        "accessCount" to resource.accessCount,
                        "size" to resource.size
                    )
                }
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
