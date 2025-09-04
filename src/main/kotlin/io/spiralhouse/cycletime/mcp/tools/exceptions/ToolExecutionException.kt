package io.spiralhouse.cycletime.mcp.tools.exceptions

/**
 * Exception thrown when a tool's execution fails with an unexpected error.
 */
class ToolExecutionException(
    val toolName: String,
    cause: Throwable,
    val errorCode: ToolErrorCode = ToolErrorCode.EXECUTION_ERROR
) : Exception("Tool execution failed for '$toolName': ${cause.message}", cause)