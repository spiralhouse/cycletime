package io.spiralhouse.cycletime.mcp.server

import java.time.Duration

/**
 * Configuration for the MCP Server
 * 
 * @param port The port to listen on (default: 3000)
 * @param enableSSL Whether to enable SSL (default: false)
 * @param connectionTimeout Connection timeout duration
 * @param heartbeatInterval Heartbeat interval duration  
 * @param maxConnections Maximum number of connections
 * @param toolInvocationTimeout Tool invocation timeout duration
 */
data class McpServerConfig(
    val port: Int = 3000,
    val enableSSL: Boolean = false,
    val connectionTimeout: Duration = Duration.ofSeconds(30),
    val heartbeatInterval: Duration = Duration.ofSeconds(10),
    val maxConnections: Int = 100,
    val toolInvocationTimeout: Duration = Duration.ofSeconds(60)
) {
    init {
        require(port in 1..65535) { "Port must be between 1 and 65535, got $port" }
        require(connectionTimeout.toMillis() > 0) { "Connection timeout must be positive" }
        require(heartbeatInterval.toMillis() > 0) { "Heartbeat interval must be positive" }
        require(maxConnections > 0) { "Max connections must be positive" }
        require(toolInvocationTimeout.toMillis() > 0) { "Tool invocation timeout must be positive" }
    }
}