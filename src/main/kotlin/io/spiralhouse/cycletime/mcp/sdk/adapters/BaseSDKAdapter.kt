package io.spiralhouse.cycletime.mcp.sdk.adapters

import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import io.spiralhouse.cycletime.mcp.sdk.SessionContext
import kotlinx.serialization.json.JsonElement
import org.slf4j.LoggerFactory

/**
 * Base adapter providing common functionality for SDK adapters.
 *
 * This abstract class eliminates duplication between SDKToolAdapter and SDKResourceAdapter
 * by extracting common patterns:
 * - Session extraction from request metadata
 * - Consistent error handling with three-tier catch blocks
 * - Standardized logging patterns
 * - Error message construction
 *
 * Design Philosophy:
 * - Single source of truth for adapter patterns
 * - Type-safe error result construction via factory functions
 * - Consistent behavior across all adapter types
 * - Improved error messages with actual error details
 *
 * @property sessionManager Session manager for SDK session handling
 */
abstract class BaseSDKAdapter(
    protected val sessionManager: SDKSessionManager
) {
    /**
     * Logger instance configured for subclass.
     * Uses this::class.java so each subclass gets its own logger name.
     */
    protected val logger = LoggerFactory.getLogger(this::class.java)

    /**
     * Execute adapter operation with standard error handling.
     *
     * This method provides a consistent error handling pattern for all adapter operations:
     * 1. Extract session ID from request metadata (optional)
     * 2. Log session context for debugging
     * 3. Execute the operation with session context
     * 4. Handle exceptions with three-tier error handling:
     *    - IllegalArgumentException: Invalid parameters (e.g., missing required fields)
     *    - IllegalStateException: Invalid state (e.g., missing required session)
     *    - Exception: Unexpected errors (catch-all)
     *
     * Type Safety:
     * - Generic type T allows different return types (CallToolResult, ReadResourceResult)
     * - errorResultFactory function constructs type-appropriate error results
     * - Ensures compile-time type safety while maintaining code reuse
     *
     * @param T The result type (e.g., CallToolResult, ReadResourceResult)
     * @param operationName Human-readable operation name for logging (e.g., "Tool execution", "Resource reading")
     * @param resourceIdentifier The specific resource being operated on (e.g., tool name, resource URI)
     * @param meta Request metadata containing optional session information
     * @param errorResultFactory Function to construct error result of type T with error message
     * @param operation The actual operation to execute, receives sessionId (may be null)
     * @return Result of operation (success or error)
     */
    protected suspend fun <T> executeWithErrorHandling(
        operationName: String,
        resourceIdentifier: String,
        meta: Map<String, JsonElement>?,
        errorResultFactory: (String) -> T,
        operation: suspend (sessionId: String?) -> T
    ): T {
        return try {
            // Extract session ID from request metadata (optional - not all operations need session)
            val sessionId = SessionContext.extractSessionId(meta)

            // Log session context for debugging
            logSessionContext(operationName, resourceIdentifier, sessionId)

            // Execute operation with session context
            operation(sessionId)

        } catch (e: IllegalArgumentException) {
            // Invalid parameters - log and return error result with message
            val errorMessage = "Invalid parameters: ${e.message}"
            logger.warn("$operationName failed for '$resourceIdentifier': $errorMessage")
            errorResultFactory(errorMessage)
        } catch (e: IllegalStateException) {
            // Invalid state (e.g., missing required session) - log and return error result with message
            val errorMessage = "Invalid state: ${e.message}"
            logger.warn("$operationName failed for '$resourceIdentifier': $errorMessage")
            errorResultFactory(errorMessage)
        } catch (e: Exception) {
            // Unexpected error - log with stack trace and return error result with message
            val errorMessage = "Execution error: ${e.message}"
            logger.error("$operationName failed for '$resourceIdentifier': $errorMessage", e)
            errorResultFactory(errorMessage)
        }
    }

    /**
     * Log session context for debugging.
     *
     * Provides consistent logging format across all adapter operations,
     * making it easy to trace session-related issues in production logs.
     *
     * @param operationName The operation being performed
     * @param identifier The specific resource/tool being operated on
     * @param sessionId The extracted session ID (null if not present)
     */
    private fun logSessionContext(
        operationName: String,
        identifier: String,
        sessionId: String?
    ) {
        if (sessionId != null) {
            logger.debug("$operationName '$identifier' with session: $sessionId")
        } else {
            logger.debug("$operationName '$identifier' without session context")
        }
    }
}
