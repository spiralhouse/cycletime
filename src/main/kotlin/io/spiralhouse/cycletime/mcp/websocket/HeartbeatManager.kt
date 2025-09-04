package io.spiralhouse.cycletime.mcp.websocket

import java.time.Duration

/**
 * Interface for managing connection heartbeats and health checks.
 * 
 * This abstraction handles the ping-pong mechanism for WebSocket connections
 * and monitors connection health to detect and clean up stale connections.
 * 
 * ## Design Philosophy
 * - Proactive connection health monitoring
 * - Configurable timeout and interval settings
 * - Automatic cleanup of dead connections
 * - Non-blocking asynchronous operations
 * 
 * ## Implementation Notes
 * - Must be thread-safe for concurrent connection monitoring
 * - Should handle failures gracefully without affecting other connections
 * - Heartbeat timing should be configurable per deployment
 */
interface HeartbeatManager {
    
    /**
     * Starts the heartbeat monitoring process.
     * 
     * This method should:
     * - Begin periodic health checks
     * - Send ping frames at configured intervals
     * - Monitor for pong responses
     * - Clean up timed-out connections
     */
    suspend fun start()
    
    /**
     * Stops the heartbeat monitoring process.
     * 
     * This method should:
     * - Cancel any running heartbeat jobs
     * - Clean up resources
     * - Be idempotent
     */
    suspend fun stop()
    
    /**
     * Checks if heartbeat monitoring is currently active.
     * 
     * @return true if heartbeat monitoring is running
     */
    fun isRunning(): Boolean
    
    /**
     * Gets the configured heartbeat interval.
     * 
     * @return the duration between heartbeat pings
     */
    fun getHeartbeatInterval(): Duration
    
    /**
     * Gets the configured connection timeout.
     * 
     * @return the duration after which idle connections are closed
     */
    fun getConnectionTimeout(): Duration
    
    /**
     * Records activity for a specific connection.
     * 
     * This method updates the last activity timestamp for a connection,
     * preventing it from timing out.
     * 
     * @param connectionId the identifier of the active connection
     */
    fun recordActivity(connectionId: String)
    
    /**
     * Checks if a connection has timed out.
     * 
     * @param connectionId the identifier of the connection to check
     * @return true if the connection has exceeded the timeout threshold
     */
    fun isConnectionTimedOut(connectionId: String): Boolean
}