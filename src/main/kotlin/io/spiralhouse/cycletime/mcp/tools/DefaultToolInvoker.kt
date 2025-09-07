package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolInvoker
import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolRegistry
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.coroutines.withTimeout
import org.slf4j.LoggerFactory

/**
 * Default implementation of ToolInvoker.
 * 
 * Invokes tools from the registry with proper parameter validation and error handling.
 */
class DefaultToolInvoker(
    private val toolRegistry: ToolRegistry
) : ToolInvoker {
    
    private val logger = LoggerFactory.getLogger(DefaultToolInvoker::class.java)
    
    override fun invoke(toolName: String, parameters: JsonElement): Result<JsonElement> {
        return try {
            val tool = toolRegistry.getTool(toolName)
                ?: return Result.failure(IllegalArgumentException("Tool not found: $toolName"))
            
            // Validate parameters
            if (parameters !is JsonObject) {
                return Result.failure(IllegalArgumentException("Parameters must be a JSON object"))
            }
            
            // Execute the tool
            tool.handler(parameters)
            
        } catch (e: Exception) {
            logger.error("Error invoking tool $toolName", e)
            Result.failure(e)
        }
    }
    
    override suspend fun invokeAsync(
        toolName: String, 
        parameters: JsonElement, 
        timeout: Long
    ): Result<JsonElement> {
        return try {
            val asyncTool = toolRegistry.getAsyncTool(toolName)
                ?: return Result.failure(IllegalArgumentException("Async tool not found: $toolName"))
            
            // Validate parameters
            if (parameters !is JsonObject) {
                return Result.failure(IllegalArgumentException("Parameters must be a JSON object"))
            }
            
            // Execute with timeout
            withTimeout(timeout) {
                asyncTool.handlerAsync(parameters)
            }
            
        } catch (e: Exception) {
            logger.error("Error invoking async tool $toolName", e)
            Result.failure(e)
        }
    }
}