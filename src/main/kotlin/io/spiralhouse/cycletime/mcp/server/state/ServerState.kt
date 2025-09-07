package io.spiralhouse.cycletime.mcp.server.state

import java.time.Instant
import java.util.concurrent.atomic.AtomicReference

/**
 * Represents the current state of an MCP server.
 */
enum class ServerStatus {
    /** Server is not yet initialized */
    CREATED,
    /** Server is starting up */
    STARTING,
    /** Server is running and accepting connections */
    RUNNING,
    /** Server is shutting down */
    STOPPING,
    /** Server has been stopped */
    STOPPED,
    /** Server encountered an error */
    ERROR
}

/**
 * Thread-safe container for server state information.
 * 
 * This class maintains the current status and metadata about the server's
 * lifecycle, providing thread-safe access to state information.
 */
class ServerState {
    private val status = AtomicReference(ServerStatus.CREATED)
    private val startTime = AtomicReference<Instant?>(null)
    private val stopTime = AtomicReference<Instant?>(null)
    private val lastError = AtomicReference<Throwable?>(null)
    
    /**
     * Gets the current server status.
     */
    fun getStatus(): ServerStatus = status.get()
    
    /**
     * Transitions to a new status if the transition is valid.
     * 
     * @param newStatus the new status to transition to
     * @return true if the transition was successful, false otherwise
     */
    fun transitionTo(newStatus: ServerStatus): Boolean {
        val currentStatus = status.get()
        
        // Validate state transitions
        val isValidTransition = when (newStatus) {
            ServerStatus.STARTING -> currentStatus in listOf(ServerStatus.CREATED, ServerStatus.STOPPED)
            ServerStatus.RUNNING -> currentStatus == ServerStatus.STARTING
            ServerStatus.STOPPING -> currentStatus == ServerStatus.RUNNING
            ServerStatus.STOPPED -> currentStatus in listOf(ServerStatus.STOPPING, ServerStatus.ERROR)
            ServerStatus.ERROR -> true // Can transition to error from any state
            else -> false
        }
        
        if (isValidTransition) {
            status.set(newStatus)
            
            // Update timestamps
            when (newStatus) {
                ServerStatus.RUNNING -> startTime.set(Instant.now())
                ServerStatus.STOPPED -> stopTime.set(Instant.now())
                else -> { /* No timestamp update needed */ }
            }
            
            return true
        }
        
        return false
    }
    
    /**
     * Records an error and transitions to ERROR state.
     * 
     * @param error the error that occurred
     */
    fun recordError(error: Throwable) {
        lastError.set(error)
        status.set(ServerStatus.ERROR)
    }
    
    /**
     * Checks if the server is in a running state.
     */
    fun isRunning(): Boolean = status.get() == ServerStatus.RUNNING
    
    /**
     * Checks if the server can be started.
     */
    fun canStart(): Boolean = status.get() in listOf(ServerStatus.CREATED, ServerStatus.STOPPED)
    
    /**
     * Checks if the server can be stopped.
     */
    fun canStop(): Boolean = status.get() == ServerStatus.RUNNING
    
    /**
     * Gets the time when the server was last started.
     */
    fun getStartTime(): Instant? = startTime.get()
    
    /**
     * Gets the time when the server was last stopped.
     */
    fun getStopTime(): Instant? = stopTime.get()
    
    /**
     * Gets the last error that occurred, if any.
     */
    fun getLastError(): Throwable? = lastError.get()
    
    /**
     * Clears the last error.
     */
    fun clearError() {
        lastError.set(null)
    }
    
    /**
     * Gets the server uptime in milliseconds.
     * 
     * @return the uptime in milliseconds, or 0 if the server is not running
     */
    fun getUptimeMillis(): Long {
        val start = startTime.get() ?: return 0
        return if (isRunning()) {
            Instant.now().toEpochMilli() - start.toEpochMilli()
        } else {
            val stop = stopTime.get() ?: return 0
            stop.toEpochMilli() - start.toEpochMilli()
        }
    }
}