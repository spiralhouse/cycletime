package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.mcp.tools.exceptions.*
import io.spiralhouse.cycletime.mcp.tools.validation.JsonSchemaValidator
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Thread-safe tool registry with integrated invocation capabilities.
 *
 * This implementation provides:
 * - Thread-safe concurrent access to tools
 * - Parameter validation using JSON Schema
 * - Support for both synchronous and asynchronous tools
 * - Rich error handling with specific exception types
 * - Tool lifecycle management (registration, discovery, invocation)
 *
 * @param validator The validator to use for parameter validation (defaults to JsonSchemaValidator)
 */
open class ToolRegistry(
    private val validator: JsonSchemaValidator = JsonSchemaValidator()
) {
    
    private val tools = ConcurrentHashMap<String, Tool>()
    
    // ===== Tool Registry Methods =====
    
    fun register(tool: Tool): Boolean {
        return tools.putIfAbsent(tool.name, tool) == null
    }
    
    fun update(tool: Tool): Boolean {
        return tools.replace(tool.name, tool) != null
    }
    
    fun unregister(toolName: String): Boolean {
        return tools.remove(toolName) != null
    }
    
    fun isRegistered(toolName: String): Boolean {
        return tools.containsKey(toolName)
    }
    
    fun getTool(toolName: String): Tool? {
        return tools[toolName]
    }
    
    
    fun getRegisteredToolNames(): List<String> {
        return tools.keys.sorted()
    }
    
    fun getToolMetadata(toolName: String): ToolMetadata? {
        tools[toolName]?.let { tool ->
            return ToolMetadata(tool.name, tool.description, tool.parametersSchema)
        }
        return null
    }
    
    fun getAllToolMetadata(): List<ToolMetadata> {
        return tools.values.map { 
            ToolMetadata(it.name, it.description, it.parametersSchema) 
        }.sortedBy { it.name }
    }
    
    fun searchTools(query: String): List<ToolMetadata> {
        val lowerQuery = query.lowercase()
        return getAllToolMetadata().filter { 
            it.name.lowercase().contains(lowerQuery) || 
            it.description.lowercase().contains(lowerQuery) 
        }
    }
    
    fun getParameterSchema(toolName: String): JsonObject? {
        return getToolMetadata(toolName)?.parametersSchema
    }
    
    // ===== ToolInvoker Implementation =====
    
    fun invoke(toolName: String, parameters: JsonElement): Result<JsonElement> {
        val tool = tools[toolName] 
            ?: return Result.failure(ToolNotFoundException(toolName))
        
        // Check if it's a sync tool
        val syncHandler = (tool.handler as? ToolHandler.Sync)?.handler
            ?: return Result.failure(ToolNotFoundException(toolName))
        
        // Validate parameters
        val validationResult = validator.validate(parameters, tool.parametersSchema)
        if (!validationResult.isValid) {
            return Result.failure(
                ParameterValidationException(toolName, validationResult.errors)
            )
        }
        
        return try {
            syncHandler(parameters)
        } catch (e: Exception) {
            Result.failure(ToolExecutionException(toolName, e))
        }
    }
    
    suspend fun invokeAsync(
        toolName: String, 
        parameters: JsonElement, 
        timeout: Long
    ): Result<JsonElement> {
        val tool = tools[toolName] 
            ?: return Result.failure(ToolNotFoundException(toolName))
        
        // Check if it's an async tool
        val asyncHandler = (tool.handler as? ToolHandler.Async)?.handler
            ?: return Result.failure(ToolNotFoundException(toolName))
        
        // Validate parameters
        val validationResult = validator.validate(parameters, tool.parametersSchema)
        if (!validationResult.isValid) {
            return Result.failure(
                ParameterValidationException(toolName, validationResult.errors)
            )
        }
        
        return try {
            withTimeout(timeout) {
                asyncHandler(parameters)
            }
        } catch (e: TimeoutCancellationException) {
            Result.failure(ToolTimeoutException(toolName, timeout))
        } catch (e: Exception) {
            Result.failure(ToolExecutionException(toolName, e))
        }
    }
    
}


/**
 * Default implementation of ToolRegistry for backwards compatibility with tests.
 * This is an alias to the main ToolRegistry class.
 */
typealias DefaultToolRegistry = ToolRegistry

