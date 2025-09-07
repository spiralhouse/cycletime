package io.spiralhouse.cycletime.mcp.server.exceptions

/**
 * Base exception class for MCP Server errors.
 * 
 * @property message The error message
 * @property cause The underlying cause of the error, if any
 */
open class McpServerException(
    override val message: String,
    override val cause: Throwable? = null
) : Exception(message, cause)

/**
 * Exception thrown when server lifecycle operations fail.
 */
class ServerLifecycleException(
    message: String,
    cause: Throwable? = null
) : McpServerException(message, cause)

/**
 * Exception thrown when server configuration is invalid.
 */
class ServerConfigurationException(
    message: String,
    cause: Throwable? = null
) : McpServerException(message, cause)

/**
 * Exception thrown when method handling fails.
 */
class MethodHandlingException(
    val method: String,
    message: String,
    cause: Throwable? = null
) : McpServerException("Method '$method' failed: $message", cause)