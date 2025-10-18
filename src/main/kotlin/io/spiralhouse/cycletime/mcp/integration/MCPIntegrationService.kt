package io.spiralhouse.cycletime.mcp.integration

import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import kotlinx.coroutines.*
import org.slf4j.LoggerFactory
import java.util.concurrent.atomic.AtomicBoolean

/**
 * MCP Integration Service - Simplified facade for SDK v0.7.2 (SPI-700, SPI-707)
 *
 * This service provides lifecycle management and status reporting for the MCP SDK server.
 * Legacy EventBus transport and protocol handlers removed - SDK now handles all transport.
 *
 * @property sdkServer The SDK server instance
 * @property config Server configuration (retained for compatibility)
 */
class MCPIntegrationService(
    private val sdkServer: MCPSdkServer,
    private val config: MCPServerConfig = MCPServerConfig()
) {
    private val logger = LoggerFactory.getLogger(MCPIntegrationService::class.java)
    private val isRunning = AtomicBoolean(false)
    private var serverStartTime: Long = 0

    /**
     * Start the MCP integration service.
     * The SDK server is initialized in the constructor and managed by Ktor.
     */
    suspend fun start() {
        if (isRunning.compareAndSet(false, true)) {
            try {
                serverStartTime = System.currentTimeMillis()
                logger.info("MCP Integration Service started (SDK v0.7.2)")
            } catch (e: Exception) {
                isRunning.set(false)
                logger.error("Failed to start MCP integration service", e)
                throw MCPIntegrationException("MCP integration start failed: ${e.message}", e)
            }
        }
    }

    /**
     * Stop the MCP integration service.
     * Graceful shutdown with configurable grace period.
     */
    suspend fun stop(gracePeriod: Long = 5000) {
        if (isRunning.compareAndSet(true, false)) {
            logger.info("Stopping MCP integration service (grace period: ${gracePeriod}ms)")
            withContext(Dispatchers.Default) {
                delay(gracePeriod)
            }
            logger.info("MCP integration service stopped")
        }
    }

    /**
     * Get current server status for health checks.
     */
    fun getStatus(): MCPServerStatus {
        return MCPServerStatus(
            isRunning = isRunning.get(),
            uptimeMs = if (isRunning.get()) System.currentTimeMillis() - serverStartTime else 0
        )
    }
}

/**
 * MCP integration exception for service-level errors.
 */
class MCPIntegrationException(
    message: String,
    cause: Throwable? = null
) : Exception(message, cause)

/**
 * MCP server status for health reporting.
 */
data class MCPServerStatus(
    val isRunning: Boolean,
    val uptimeMs: Long
)
