package io.spiralhouse.cycletime.mcp.integration

import java.time.Duration

/**
 * Configuration for the MCP Server (SDK v0.7.2)
 * Simplified for SDK-based transport (SPI-707)
 *
 * @param connectionTimeout Connection timeout duration
 * @param toolInvocationTimeout Tool invocation timeout duration
 */
data class MCPServerConfig(
    val connectionTimeout: Duration = Duration.ofSeconds(30),
    val toolInvocationTimeout: Duration = Duration.ofSeconds(60)
) {
    init {
        validate()
    }

    /**
     * Validates the configuration parameters.
     * @throws IllegalArgumentException if any parameter is invalid
     */
    fun validate() {
        require(connectionTimeout.toMillis() > 0) { "Connection timeout must be positive" }
        require(toolInvocationTimeout.toMillis() > 0) { "Tool invocation timeout must be positive" }
    }
}
