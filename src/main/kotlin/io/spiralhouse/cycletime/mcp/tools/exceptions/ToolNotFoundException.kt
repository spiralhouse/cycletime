package io.spiralhouse.cycletime.mcp.tools.exceptions

/**
 * Exception thrown when attempting to use a tool that is not registered.
 */
class ToolNotFoundException(
    val toolName: String,
    val errorCode: ToolErrorCode = ToolErrorCode.TOOL_NOT_FOUND
) : Exception("Tool not found: $toolName")