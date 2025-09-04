package io.spiralhouse.cycletime.mcp.tools.exceptions

/**
 * Exception thrown when tool parameters fail validation against the tool's schema.
 */
class ParameterValidationException(
    val toolName: String,
    val validationErrors: List<String>,
    val errorCode: ToolErrorCode = ToolErrorCode.INVALID_PARAMETERS
) : Exception("parameter validation failed for tool '$toolName': ${validationErrors.joinToString(", ")}")