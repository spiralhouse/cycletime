package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcError
import io.spiralhouse.cycletime.mcp.tools.exceptions.*
import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolRegistry
import io.spiralhouse.cycletime.mcp.tools.validation.JsonSchemaValidator
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Default thread-safe implementation of ToolRegistry with integrated invocation capabilities.
 * 
 * This implementation provides:
 * - Thread-safe concurrent access to tools
 * - Parameter validation using JSON Schema
 * - Support for both synchronous and asynchronous tools
 * - Rich error handling with specific exception types
 * - JSON-RPC integration support
 * 
 * @param validator The validator to use for parameter validation (defaults to JsonSchemaValidator)
 */
open class DefaultToolRegistry(
    private val validator: JsonSchemaValidator = JsonSchemaValidator()
) : ToolRegistry {
    
    private val tools = ConcurrentHashMap<String, Tool>()
    
    // ===== ToolRegistry Implementation =====
    
    override fun register(tool: Tool): Boolean {
        return tools.putIfAbsent(tool.name, tool) == null
    }
    
    override fun update(tool: Tool): Boolean {
        return if (tools.containsKey(tool.name)) {
            tools[tool.name] = tool
            true
        } else {
            false
        }
    }
    
    override fun unregister(toolName: String): Boolean {
        return tools.remove(toolName) != null
    }
    
    override fun isRegistered(toolName: String): Boolean {
        return tools.containsKey(toolName)
    }
    
    override fun getTool(toolName: String): Tool? {
        return tools[toolName]
    }
    
    
    override fun getRegisteredToolNames(): List<String> {
        return tools.keys.sorted()
    }
    
    override fun getToolMetadata(toolName: String): ToolMetadata? {
        tools[toolName]?.let { tool ->
            return ToolMetadata(tool.name, tool.description, tool.parametersSchema)
        }
        return null
    }
    
    override fun getAllToolMetadata(): List<ToolMetadata> {
        return tools.values.map { 
            ToolMetadata(it.name, it.description, it.parametersSchema) 
        }.sortedBy { it.name }
    }
    
    override fun searchTools(query: String): List<ToolMetadata> {
        val lowerQuery = query.lowercase()
        return getAllToolMetadata().filter { 
            it.description.lowercase().contains(lowerQuery) 
        }
    }
    
    override fun getParameterSchema(toolName: String): JsonObject? {
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
    
    // ===== JSON-RPC Support Methods =====
    
    /**
     * Format a tool-related error into a JSON-RPC error structure.
     */
    fun formatErrorForJsonRpc(error: Throwable): JsonRpcError {
        return when (error) {
            is ToolNotFoundException -> JsonRpcError(
                code = -32601, // Method not found
                message = "Tool not found: ${error.toolName}",
                data = buildJsonObject {
                    put("toolName", error.toolName)
                    put("errorCode", error.errorCode.name)
                }
            )
            is ParameterValidationException -> JsonRpcError(
                code = -32602, // Invalid params
                message = "Invalid method parameter(s)",
                data = buildJsonObject {
                    put("toolName", error.toolName)
                    put("errors", JsonArray(error.validationErrors.map { JsonPrimitive(it) }))
                    put("errorCode", error.errorCode.name)
                }
            )
            is ToolExecutionException -> JsonRpcError(
                code = -32603, // Internal error
                message = "Tool execution failed",
                data = buildJsonObject {
                    put("toolName", error.toolName)
                    put("error", error.cause?.message ?: "Unknown error")
                    put("errorCode", error.errorCode.name)
                }
            )
            is ToolTimeoutException -> JsonRpcError(
                code = -32603, // Internal error
                message = "Tool execution timed out",
                data = buildJsonObject {
                    put("toolName", error.toolName)
                    put("timeoutMs", error.timeoutMs)
                    put("errorCode", error.errorCode.name)
                }
            )
            else -> JsonRpcError(
                code = -32603, // Internal error
                message = "Unknown error: ${error.message}",
                data = buildJsonObject {
                    put("error", error.message ?: "Unknown error")
                }
            )
        }
    }
    
    /**
     * Handle JSON-RPC method calls for tool operations.
     */
    fun handleJsonRpcMethod(method: String, params: JsonElement): Result<JsonElement> {
        return when (method) {
            "tools/list" -> handleToolsList()
            "tools/call" -> handleToolsCall(params)
            else -> Result.failure(
                JsonRpcException(
                    code = -32601, // Method not found
                    message = "Method not found: $method"
                )
            )
        }
    }
    
    private fun handleToolsList(): Result<JsonElement> {
        val metadata = getAllToolMetadata()
        val tools = metadata.map { tool ->
            buildJsonObject {
                put("name", tool.name)
                put("description", tool.description)
                put("inputSchema", tool.parametersSchema)
            }
        }
        
        return Result.success(buildJsonObject {
            put("tools", JsonArray(tools))
        })
    }
    
    private fun handleToolsCall(params: JsonElement): Result<JsonElement> {
        if (params !is JsonObject) {
            return Result.failure(
                JsonRpcException(
                    code = -32602, // Invalid params
                    message = "Invalid parameters: expected object"
                )
            )
        }
        
        val toolName = params["name"]?.jsonPrimitive?.content
            ?: return Result.failure(
                JsonRpcException(
                    code = -32602, // Invalid params
                    message = "Missing required parameter: name"
                )
            )
        
        val arguments = params["arguments"] ?: JsonObject(emptyMap())
        
        // Check if tool exists and invoke based on its handler type
        val tool = tools[toolName] ?: return Result.failure(
            JsonRpcException(
                code = -32601, // Method not found
                message = "Tool not found: $toolName"
            )
        )
        
        val result = if (tool.isSync) {
            invoke(toolName, arguments)
        } else {
            // For JSON-RPC we can't handle async tools directly in this sync context
            Result.failure(
                JsonRpcException(
                    code = -32603, // Internal error
                    message = "Async tools cannot be invoked via JSON-RPC synchronously"
                )
            )
        }
        
        return result.fold(
            onSuccess = { value ->
                val textValue = when {
                    value is JsonPrimitive && value.isString -> value.content
                    else -> value.toString().trim('"')
                }
                Result.success(buildJsonObject {
                    put("content", buildJsonArray {
                        add(buildJsonObject {
                            put("type", "text")
                            put("text", textValue)
                        })
                    })
                })
            },
            onFailure = { error ->
                Result.failure(
                    JsonRpcException(
                        code = formatErrorForJsonRpc(error).code,
                        message = formatErrorForJsonRpc(error).message,
                        data = formatErrorForJsonRpc(error).data
                    )
                )
            }
        )
    }
}


/**
 * Exception for JSON-RPC errors.
 */
class JsonRpcException(
    val code: Int,
    override val message: String,
    val data: JsonObject? = null
) : Exception(message)