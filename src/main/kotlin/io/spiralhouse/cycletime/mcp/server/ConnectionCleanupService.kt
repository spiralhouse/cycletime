package io.spiralhouse.cycletime.mcp.server

import kotlinx.coroutines.*
import org.slf4j.LoggerFactory
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds
import kotlin.time.ExperimentalTime

/**
 * Lifecycle-managed service for cleaning up stale WebSocket connections.
 * 
 * This service properly manages its coroutine lifecycle and provides:
 * - Graceful startup and shutdown
 * - Proper exception handling with recovery
 * - Exponential backoff on failures
 * - Testability through dependency injection
 * - Clean separation of concerns
 * 
 * Unlike GlobalScope, this service:
 * - Is tied to application lifecycle
 * - Can be properly cancelled on shutdown
 * - Doesn't leak resources in tests
 * - Reports failures appropriately
 */
class ConnectionCleanupService(
    private val connectionManager: MCPConnectionManager,
    private val config: MCPConfiguration,
    private val cleanupInterval: Duration = 30.seconds,
    private val maxRetries: Int = 3
) {
    private val logger = LoggerFactory.getLogger(ConnectionCleanupService::class.java)
    private var cleanupJob: Job? = null
    private var consecutiveFailures = 0
    
    @Volatile
    private var isRunning = false
    
    /**
     * Start the cleanup service with a given coroutine scope.
     * The scope should be the Application's coroutine scope for production,
     * or a test scope for testing.
     * 
     * @param scope The coroutine scope to launch the cleanup task in
     */
    fun start(scope: CoroutineScope) {
        synchronized(this) {
            if (isRunning) {
                logger.warn("ConnectionCleanupService is already running")
                return
            }
            
            logger.info("Starting ConnectionCleanupService with ${cleanupInterval.inWholeSeconds}s interval")
            isRunning = true
            consecutiveFailures = 0
            
            cleanupJob = scope.launch {
                // Use SupervisorJob pattern to prevent failure propagation
                supervisorScope {
                    runCleanupLoop()
                }
            }
        }
    }
    
    /**
     * Stop the cleanup service gracefully.
     * Cancels the cleanup job and waits for it to complete.
     */
    suspend fun stop() {
        val jobToCancel = synchronized(this) {
            if (!isRunning) {
                logger.debug("ConnectionCleanupService is not running")
                return
            }
            
            logger.info("Stopping ConnectionCleanupService")
            isRunning = false
            cleanupJob  // Capture reference while synchronized
        }
        
        // Cancel and wait for the job to complete
        jobToCancel?.let { job ->
            job.cancelAndJoin()
            logger.info("ConnectionCleanupService stopped")
        }
        cleanupJob = null
    }
    
    /**
     * Main cleanup loop with proper error handling and recovery.
     */
    private suspend fun runCleanupLoop() {
        // isFirstRun prevents double-delay after error recovery
        // Normal flow: delay → cleanup → delay → cleanup
        // After error: backoff delay → cleanup → delay → cleanup (no initial delay)
        var isFirstRun = true
        
        while (isRunning && currentCoroutineContext().isActive) {
            try {
                // Wait for the cleanup interval before cleanup (except after failures with backoff)
                if (isFirstRun) {
                    delay(cleanupInterval)
                    isFirstRun = false
                }
                
                if (!isRunning) break
                
                // Perform cleanup with timeout protection
                withTimeout(10.seconds) {
                    performCleanup()
                }
                
                // Reset failure counter on success
                consecutiveFailures = 0
                
                // Wait for the cleanup interval before next iteration
                delay(cleanupInterval)
                
            } catch (e: CancellationException) {
                // Coroutine was cancelled, exit gracefully
                logger.debug("Cleanup loop cancelled")
                throw e // Re-throw to properly handle cancellation
                
            } catch (e: TimeoutCancellationException) {
                handleCleanupFailure("Cleanup operation timed out", e)
                
            } catch (e: Exception) {
                handleCleanupFailure("Unexpected error during cleanup", e)
            }
        }
        
        logger.debug("Cleanup loop exited")
    }
    
    /**
     * Perform the actual cleanup operation.
     * This is extracted for testability and clarity.
     */
    private suspend fun performCleanup() {
        val startTime = System.currentTimeMillis()
        
        try {
            val stats = connectionManager.getStatistics()
            
            if (stats.activeCount > 0) {
                logger.debug("Running connection cleanup (active: ${stats.activeCount})")
                connectionManager.cleanupStaleConnections(config.timeout * 2)
                
                val elapsed = System.currentTimeMillis() - startTime
                if (config.detailedLogging) {
                    logger.info("Connection cleanup completed in ${elapsed}ms")
                }
            }
            
        } catch (e: Exception) {
            // Log and re-throw to trigger error handling
            logger.error("Failed to cleanup connections: ${e.message}", e)
            throw CleanupException("Connection cleanup failed", e)
        }
    }
    
    /**
     * Handle cleanup failures with exponential backoff and eventual circuit breaking.
     */
    private suspend fun handleCleanupFailure(message: String, cause: Exception) {
        consecutiveFailures++
        
        when {
            consecutiveFailures >= maxRetries -> {
                // Circuit breaker pattern - stop trying after max failures
                logger.error(
                    "$message after $consecutiveFailures attempts. Stopping cleanup service.",
                    cause
                )
                isRunning = false
                
                // Notify monitoring/alerting system if available
                notifyCleanupServiceFailure(cause)
            }
            
            else -> {
                // Exponential backoff before retry
                val backoffDelay = calculateBackoffDelay(consecutiveFailures)
                logger.warn(
                    "$message (attempt $consecutiveFailures/$maxRetries). " +
                    "Retrying in ${backoffDelay.inWholeSeconds}s",
                    cause
                )
                delay(backoffDelay)
            }
        }
    }
    
    /**
     * Calculate exponential backoff delay based on failure count.
     */
    private fun calculateBackoffDelay(failureCount: Int): Duration {
        // Exponential backoff: 2^n seconds, capped at 5 minutes
        val delaySeconds = minOf(
            Math.pow(2.0, failureCount.toDouble()).toLong(),
            300 // 5 minutes max
        )
        return delaySeconds.seconds
    }
    
    /**
     * Notify monitoring/alerting system about service failure.
     * This is a hook for production monitoring integration.
     */
    private fun notifyCleanupServiceFailure(cause: Exception) {
        // In production, this would integrate with your monitoring system
        // For now, just log critically
        logger.error(
            "CRITICAL: ConnectionCleanupService has stopped due to repeated failures. " +
            "Manual intervention may be required.",
            cause
        )
        
        // TODO: Integrate with monitoring/alerting system
        // e.g., send metrics, trigger PagerDuty alert, etc.
    }
    
    /**
     * Check if the cleanup service is currently running.
     */
    fun isActive(): Boolean = isRunning && cleanupJob?.isActive == true
    
    /**
     * Get the current status of the cleanup service for monitoring.
     */
    fun getStatus(): CleanupServiceStatus {
        return CleanupServiceStatus(
            isRunning = isRunning,
            isActive = isActive(),
            consecutiveFailures = consecutiveFailures,
            cleanupInterval = cleanupInterval
        )
    }
}

/**
 * Status information for monitoring the cleanup service.
 */
data class CleanupServiceStatus(
    val isRunning: Boolean,
    val isActive: Boolean,
    val consecutiveFailures: Int,
    val cleanupInterval: Duration
)

/**
 * Custom exception for cleanup failures.
 */
class CleanupException(message: String, cause: Throwable) : Exception(message, cause)