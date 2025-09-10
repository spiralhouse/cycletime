package io.spiralhouse.cycletime.mcp.tools

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * Unified tool handler supporting both synchronous and asynchronous operations.
 * 
 * This sealed interface allows tools to define either sync or async handlers
 * while maintaining type safety and backward compatibility.
 */
sealed interface ToolHandler {
    /**
     * Synchronous handler for immediate operations.
     */
    data class Sync(val handler: (JsonElement) -> Result<JsonElement>) : ToolHandler
    
    /**
     * Asynchronous handler for long-running operations using coroutines.
     */
    data class Async(val handler: suspend (JsonElement) -> Result<JsonElement>) : ToolHandler
}

/**
 * Type alias for backward compatibility - AsyncTool is now just a Tool with async handler.
 * This allows existing code to continue working without modification.
 */
typealias AsyncTool = Tool

/**
 * Unified Tool class supporting both synchronous and asynchronous handlers.
 * 
 * Tools are registered components that can be invoked with parameters to perform
 * specific operations and return JSON results. This unified design eliminates the
 * need for separate Tool and AsyncTool classes while maintaining full compatibility.
 * 
 * Example usage:
 * ```kotlin
 * // Synchronous tool
 * val syncTool = Tool(
 *     name = "math.add",
 *     description = "Adds two numbers",
 *     parametersSchema = schema,
 *     handler = ToolHandler.Sync { params ->
 *         Result.success(JsonPrimitive(result))
 *     }
 * )
 * 
 * // Asynchronous tool
 * val asyncTool = Tool(
 *     name = "db.query",
 *     description = "Query database",
 *     parametersSchema = schema,
 *     handler = ToolHandler.Async { params ->
 *         delay(100) // Simulate async work
 *         Result.success(JsonPrimitive(result))
 *     }
 * )
 * ```
 */
data class Tool(
    val name: String,
    val description: String,
    val parametersSchema: JsonObject,
    val handler: ToolHandler
) {
    init {
        require(name.matches(Regex("^[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)*$"))) {
            "Tool name must be lowercase with optional dots or underscores for namespacing: $name"
        }
    }
    
    /**
     * Convenience constructor for creating synchronous tools (backward compatibility).
     */
    constructor(
        name: String,
        description: String,
        parametersSchema: JsonObject,
        handler: (JsonElement) -> Result<JsonElement>
    ) : this(name, description, parametersSchema, ToolHandler.Sync(handler))
    
    /**
     * Convenience method to check if this tool is synchronous.
     */
    val isSync: Boolean
        get() = handler is ToolHandler.Sync
    
    /**
     * Convenience method to check if this tool is asynchronous.
     */
    val isAsync: Boolean
        get() = handler is ToolHandler.Async
}