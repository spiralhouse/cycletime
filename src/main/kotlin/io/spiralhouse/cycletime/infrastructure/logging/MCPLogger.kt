package io.spiralhouse.cycletime.infrastructure.logging

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.slf4j.MDC

/**
 * Utility for structured logging of MCP protocol operations with MDC context management.
 *
 * Provides automatic MDC (Mapped Diagnostic Context) management for MCP-specific fields
 * to enable structured JSON logging in production environments. All MDC context is
 * automatically cleaned up using try/finally blocks.
 *
 * **MDC Fields:**
 * - `mcp-session-id`: Current session identifier
 * - `mcp-tool`: Tool name being invoked
 * - `mcp-request-id`: Request identifier for correlation
 *
 * **Safety:**
 * - Sensitive data (passwords, tokens, large payloads) are automatically sanitized
 * - All MDC cleanup is guaranteed via try/finally blocks
 * - Proper log levels used (INFO for operations, ERROR for failures)
 *
 * **Usage Example:**
 * ```kotlin
 * MCPLogger.logToolInvocation("session-123", "project_create", mapOf("name" to "MyProject"))
 * MCPLogger.withMCPContext("session-123", "project_create") {
 *     // MCP operation with automatic MDC context
 *     logger.info("Processing tool invocation")
 * }
 * ```
 */
object MCPLogger {
    private val logger: Logger = LoggerFactory.getLogger(MCPLogger::class.java)

    // Sensitive parameter keys that should be sanitized
    private val SENSITIVE_KEYS = setOf(
        "password",
        "token",
        "secret",
        "apiKey",
        "api_key",
        "authorization",
        "credentials",
        "auth"
    )

    // Maximum parameter value length before truncation
    private const val MAX_PARAM_VALUE_LENGTH = 200

    /**
     * Log the start of a tool invocation with sanitized parameters.
     *
     * @param sessionId Session identifier
     * @param toolName Name of the tool being invoked
     * @param params Tool parameters (will be sanitized)
     */
    fun logToolInvocation(
        sessionId: String,
        toolName: String,
        params: Map<String, Any?>
    ) {
        withMCPContext(sessionId, toolName) {
            val sanitizedParams = sanitizeParameters(params)
            logger.info(
                "Tool invocation started | tool={} | params={}",
                toolName,
                sanitizedParams
            )
        }
    }

    /**
     * Log successful tool completion with execution duration.
     *
     * @param sessionId Session identifier
     * @param toolName Name of the tool that completed
     * @param durationMs Execution duration in milliseconds
     */
    fun logToolSuccess(
        sessionId: String,
        toolName: String,
        durationMs: Long
    ) {
        withMCPContext(sessionId, toolName) {
            logger.info(
                "Tool invocation completed successfully | tool={} | duration_ms={}",
                toolName,
                durationMs
            )
        }
    }

    /**
     * Log tool failure with exception details.
     *
     * @param sessionId Session identifier
     * @param toolName Name of the tool that failed
     * @param exception Exception that caused the failure
     */
    fun logToolFailure(
        sessionId: String,
        toolName: String,
        exception: Throwable
    ) {
        withMCPContext(sessionId, toolName) {
            logger.error(
                "Tool invocation failed | tool={} | error={} | message={}",
                toolName,
                exception.javaClass.simpleName,
                exception.message,
                exception
            )
        }
    }

    /**
     * Log the start of a new MCP session.
     *
     * @param sessionId Session identifier
     */
    fun logSessionStart(sessionId: String) {
        MDC.put("mcp-session-id", sessionId)
        try {
            logger.info("MCP session started | session_id={}", sessionId)
        } finally {
            MDC.remove("mcp-session-id")
        }
    }

    /**
     * Log the end of an MCP session with total duration.
     *
     * @param sessionId Session identifier
     * @param durationMs Session duration in milliseconds
     */
    fun logSessionEnd(sessionId: String, durationMs: Long) {
        MDC.put("mcp-session-id", sessionId)
        try {
            logger.info(
                "MCP session ended | session_id={} | duration_ms={}",
                sessionId,
                durationMs
            )
        } finally {
            MDC.remove("mcp-session-id")
        }
    }

    /**
     * Execute a block with MCP context automatically added to MDC.
     * Context is guaranteed to be cleaned up via try/finally.
     *
     * @param sessionId Session identifier
     * @param toolName Tool name (optional)
     * @param requestId Request identifier (optional)
     * @param block Code block to execute with MCP context
     */
    fun <T> withMCPContext(
        sessionId: String,
        toolName: String? = null,
        requestId: String? = null,
        block: () -> T
    ): T {
        // Store previous values to support nested contexts
        val previousSessionId = MDC.get("mcp-session-id")
        val previousTool = MDC.get("mcp-tool")
        val previousRequestId = MDC.get("mcp-request-id")

        try {
            // Set new context
            MDC.put("mcp-session-id", sessionId)
            if (toolName != null) {
                MDC.put("mcp-tool", toolName)
            }
            if (requestId != null) {
                MDC.put("mcp-request-id", requestId)
            }

            return block()
        } finally {
            // Restore previous context (supports nested calls)
            if (previousSessionId != null) {
                MDC.put("mcp-session-id", previousSessionId)
            } else {
                MDC.remove("mcp-session-id")
            }

            if (previousTool != null) {
                MDC.put("mcp-tool", previousTool)
            } else {
                MDC.remove("mcp-tool")
            }

            if (previousRequestId != null) {
                MDC.put("mcp-request-id", previousRequestId)
            } else {
                MDC.remove("mcp-request-id")
            }
        }
    }

    /**
     * Sanitize tool parameters to prevent logging sensitive data.
     *
     * - Removes sensitive keys (password, token, etc.)
     * - Truncates long values
     * - Preserves structure for debugging
     *
     * @param params Original parameters
     * @return Sanitized parameters safe for logging
     */
    private fun sanitizeParameters(params: Map<String, Any?>): Map<String, Any?> {
        return params.mapValues { (key, value) ->
            when {
                // Remove sensitive values
                SENSITIVE_KEYS.any { it.equals(key, ignoreCase = true) } -> "[REDACTED]"

                // Truncate long strings
                value is String && value.length > MAX_PARAM_VALUE_LENGTH ->
                    "${value.take(MAX_PARAM_VALUE_LENGTH)}... [truncated]"

                // Recursively sanitize nested maps
                value is Map<*, *> -> sanitizeParameters(
                    value.mapKeys { it.key.toString() }
                        .mapValues { it.value }
                )

                // Keep other values as-is
                else -> value
            }
        }
    }
}
