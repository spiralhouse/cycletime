package io.spiralhouse.cycletime.mcp.server

import io.spiralhouse.cycletime.domain.services.BuildInfo
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * Centralized configuration for MCP server and integration.
 * 
 * This configuration class provides:
 * - Single source of truth for MCP settings
 * - Environment variable override support
 * - Performance tuning parameters
 * - Production-ready defaults
 */
data class MCPConfiguration(
    // Connection settings
    val host: String = System.getenv("MCP_HOST") ?: "0.0.0.0",
    val port: Int = System.getenv("MCP_PORT")?.toIntOrNull() ?: 8080,
    val path: String = System.getenv("MCP_PATH") ?: "/mcp",
    val enabled: Boolean = System.getenv("MCP_ENABLED")?.toBoolean() ?: true,
    
    // WebSocket settings
    val pingPeriod: Duration = System.getenv("MCP_PING_PERIOD")?.toLongOrNull()?.milliseconds ?: 30.seconds,
    val timeout: Duration = System.getenv("MCP_TIMEOUT")?.toLongOrNull()?.milliseconds ?: 15.seconds,
    val maxFrameSize: Long = System.getenv("MCP_MAX_FRAME_SIZE")?.toLongOrNull() ?: (10 * 1024 * 1024), // 10MB
    val masking: Boolean = System.getenv("MCP_MASKING")?.toBoolean() ?: false,
    
    // Performance settings
    val maxConnections: Int = System.getenv("MCP_MAX_CONNECTIONS")?.toIntOrNull() ?: 100,
    val connectionBufferSize: Int = System.getenv("MCP_BUFFER_SIZE")?.toIntOrNull() ?: 8192,
    val asyncProcessingEnabled: Boolean = System.getenv("MCP_ASYNC_ENABLED")?.toBoolean() ?: true,
    val requestTimeout: Duration = System.getenv("MCP_REQUEST_TIMEOUT")?.toLongOrNull()?.milliseconds ?: 60.seconds,
    
    // Resource caching
    val resourceCacheEnabled: Boolean = System.getenv("MCP_CACHE_ENABLED")?.toBoolean() ?: true,
    val resourceCacheTtl: Duration = System.getenv("MCP_CACHE_TTL")?.toLongOrNull()?.milliseconds ?: 5.seconds,
    val resourceCacheMaxSize: Int = System.getenv("MCP_CACHE_MAX_SIZE")?.toIntOrNull() ?: 100,
    
    // Monitoring settings
    val metricsEnabled: Boolean = System.getenv("MCP_METRICS_ENABLED")?.toBoolean() ?: true,
    val slowRequestThreshold: Duration = System.getenv("MCP_SLOW_REQUEST_MS")?.toLongOrNull()?.milliseconds ?: 100.milliseconds,
    val detailedLogging: Boolean = System.getenv("MCP_DETAILED_LOGGING")?.toBoolean() ?: false,
    
    // Server info
    val serverName: String = System.getenv("MCP_SERVER_NAME") ?: BuildInfo.serviceName,
    val serverVersion: String = System.getenv("MCP_SERVER_VERSION") ?: BuildInfo.version,
    val serverDescription: String = System.getenv("MCP_SERVER_DESCRIPTION") ?: BuildInfo.serviceDescription,
    
    // Protocol settings
    val protocolVersion: String = "2024-11-05",
    val supportedVersions: Set<String> = setOf("2024-11-05")
) {
    companion object {
        /**
         * Load configuration from environment with validation.
         */
        fun fromEnvironment(): MCPConfiguration {
            val config = MCPConfiguration()
            config.validate()
            return config
        }
        
        /**
         * Create a test configuration with optimized settings.
         */
        fun forTesting(): MCPConfiguration = MCPConfiguration(
            pingPeriod = 5.seconds,
            timeout = 5.seconds,
            maxConnections = 10,
            resourceCacheEnabled = false,
            metricsEnabled = false,
            detailedLogging = true
        )
    }
    
    /**
     * Validate configuration parameters.
     */
    fun validate() {
        require(port in 1..65535) { "Port must be between 1 and 65535" }
        require(maxConnections > 0) { "Max connections must be positive" }
        require(connectionBufferSize > 0) { "Buffer size must be positive" }
        require(maxFrameSize > 0) { "Max frame size must be positive" }
        require(resourceCacheMaxSize > 0) { "Cache max size must be positive" }
        require(path.startsWith("/")) { "Path must start with /" }
    }
    
    /**
     * Check if performance optimizations are enabled.
     */
    fun isOptimized(): Boolean = 
        asyncProcessingEnabled && 
        resourceCacheEnabled && 
        connectionBufferSize >= 8192
}