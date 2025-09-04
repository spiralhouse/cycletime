package io.spiralhouse.cycletime.mcp.tools.exceptions

/**
 * Exception thrown when an async tool execution times out.
 */
class ToolTimeoutException(
    val toolName: String,
    val timeoutMs: Long,
    val errorCode: ToolErrorCode = ToolErrorCode.TIMEOUT
) : Exception("Tool '$toolName' timed out after ${timeoutMs}ms")