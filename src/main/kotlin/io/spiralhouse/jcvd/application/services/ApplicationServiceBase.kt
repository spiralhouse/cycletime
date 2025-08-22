package io.spiralhouse.jcvd.application.services

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Base class for application services providing common functionality.
 * 
 * This abstract base class encapsulates cross-cutting concerns that are common
 * to all application services, including coroutine context management and
 * operation logging patterns.
 * 
 * ## Design Philosophy:
 * - Provides standard patterns without forcing inheritance
 * - Services can choose to extend this or implement their own patterns
 * - Focuses on operational concerns rather than business logic
 * 
 * ## Common Patterns:
 * - **IO Context Execution**: Database operations run in IO dispatcher
 * - **Structured Logging**: Consistent logging patterns across services
 * - **Performance Monitoring**: Hook points for metrics collection
 * 
 * @constructor Creates a new ApplicationServiceBase
 */
abstract class ApplicationServiceBase {
    
    /**
     * Executes a suspending block in the IO dispatcher context.
     * 
     * Use this for all I/O bound operations including:
     * - Database queries and updates
     * - File system operations
     * - Network calls to external services
     * 
     * This ensures that blocking I/O operations don't block the main coroutine dispatcher,
     * maintaining application responsiveness.
     * 
     * @param T The return type of the operation
     * @param block The suspending block to execute in IO context
     * @return The result of the block execution
     */
    protected suspend fun <T> executeInIOContext(
        block: suspend CoroutineScope.() -> T
    ): T = withContext(Dispatchers.IO) {
        block()
    }
    
    /**
     * Logs an operation for audit and debugging purposes.
     * 
     * This method provides a centralized logging pattern for tracking
     * significant operations across all application services.
     * 
     * ## Implementation Note:
     * Currently uses println for simplicity. In production, this should
     * integrate with a proper logging framework (e.g., SLF4J/Logback).
     * 
     * @param operation The name/type of the operation being performed
     * @param entityId Optional ID of the entity being operated on
     * @param details Optional additional details about the operation
     */
    protected fun logOperation(
        operation: String,
        entityId: String? = null,
        details: String? = null
    ) {
        val message = buildString {
            append("[${this@ApplicationServiceBase::class.simpleName}] ")
            append(operation)
            entityId?.let { append(" - Entity: $it") }
            details?.let { append(" - $it") }
        }
        
        // TODO: Replace with proper logging framework
        println(message)
    }
    
    /**
     * Measures and logs the execution time of an operation.
     * 
     * Useful for identifying performance bottlenecks and monitoring
     * service-level objectives (SLOs).
     * 
     * @param T The return type of the operation
     * @param operationName Name of the operation for logging
     * @param block The operation to measure
     * @return The result of the operation
     */
    protected suspend fun <T> measureOperation(
        operationName: String,
        block: suspend () -> T
    ): T {
        val startTime = System.currentTimeMillis()
        return try {
            block().also {
                val duration = System.currentTimeMillis() - startTime
                if (duration > SLOW_OPERATION_THRESHOLD_MS) {
                    logOperation(
                        "SLOW_OPERATION",
                        details = "$operationName took ${duration}ms"
                    )
                }
            }
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            logOperation(
                "OPERATION_FAILED",
                details = "$operationName failed after ${duration}ms: ${e.message}"
            )
            throw e
        }
    }
    
    companion object {
        /**
         * Threshold in milliseconds for considering an operation slow.
         * Operations taking longer than this will be logged as warnings.
         */
        private const val SLOW_OPERATION_THRESHOLD_MS = 1000
    }
}