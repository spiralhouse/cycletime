package io.spiralhouse.cycletime.mcp.tools.interfaces

import kotlinx.serialization.json.JsonElement

/**
 * Interface for tool invocation and execution.
 * 
 * Handles parameter validation and tool execution with proper error handling.
 */
interface ToolInvoker {
    /**
     * Invoke a synchronous tool with the provided parameters.
     * 
     * @param toolName The name of the tool to invoke
     * @param parameters The parameters to pass to the tool
     * @return Result containing the tool output or an exception on failure
     */
    fun invoke(toolName: String, parameters: JsonElement): Result<JsonElement>
    
    /**
     * Invoke an asynchronous tool with the provided parameters and timeout.
     * 
     * @param toolName The name of the tool to invoke
     * @param parameters The parameters to pass to the tool
     * @param timeout The maximum time in milliseconds to wait for the tool to complete
     * @return Result containing the tool output or an exception on failure
     */
    suspend fun invokeAsync(
        toolName: String, 
        parameters: JsonElement, 
        timeout: Long
    ): Result<JsonElement>
}