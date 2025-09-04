package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.mcp.tools.exceptions.*
import io.spiralhouse.cycletime.mcp.tools.validation.JsonSchemaValidator
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Thread-safe registry for managing tool registration, discovery, and invocation.
 */
class ToolRegistry {
    private val tools = ConcurrentHashMap<String, Tool>()
    private val asyncTools = ConcurrentHashMap<String, AsyncTool>()
    private val validator = JsonSchemaValidator()
    
    fun register(tool: Tool): Boolean {
        return tools.putIfAbsent(tool.name, tool) == null
    }
    
    fun register(tool: AsyncTool): Boolean {
        return asyncTools.putIfAbsent(tool.name, tool) == null
    }
    
    fun update(tool: Tool): Boolean {
        return if (tools.containsKey(tool.name)) {
            tools[tool.name] = tool
            true
        } else {
            false
        }
    }
    
    fun update(tool: AsyncTool): Boolean {
        return if (asyncTools.containsKey(tool.name)) {
            asyncTools[tool.name] = tool
            true
        } else {
            false
        }
    }
    
    fun unregister(toolName: String): Boolean {
        val syncRemoved = tools.remove(toolName) != null
        val asyncRemoved = asyncTools.remove(toolName) != null
        return syncRemoved || asyncRemoved
    }
    
    fun isRegistered(toolName: String): Boolean {
        return tools.containsKey(toolName) || asyncTools.containsKey(toolName)
    }
    
    fun getTool(toolName: String): Tool? {
        return tools[toolName]
    }
    
    fun getAsyncTool(toolName: String): AsyncTool? {
        return asyncTools[toolName]
    }
    
    fun getRegisteredToolNames(): List<String> {
        return (tools.keys + asyncTools.keys).sorted()
    }
    
    fun getToolMetadata(toolName: String): ToolMetadata? {
        tools[toolName]?.let { tool ->
            return ToolMetadata(tool.name, tool.description, tool.parametersSchema)
        }
        
        asyncTools[toolName]?.let { tool ->
            return ToolMetadata(tool.name, tool.description, tool.parametersSchema)
        }
        
        return null
    }
    
    fun getAllToolMetadata(): List<ToolMetadata> {
        val syncMetadata = tools.values.map { 
            ToolMetadata(it.name, it.description, it.parametersSchema) 
        }
        val asyncMetadata = asyncTools.values.map { 
            ToolMetadata(it.name, it.description, it.parametersSchema) 
        }
        return (syncMetadata + asyncMetadata).sortedBy { it.name }
    }
    
    fun searchTools(query: String): List<ToolMetadata> {
        val lowerQuery = query.lowercase()
        return getAllToolMetadata().filter { 
            it.description.lowercase().contains(lowerQuery) 
        }
    }
    
    fun getParameterSchema(toolName: String): JsonObject? {
        return getToolMetadata(toolName)?.parametersSchema
    }
    
    fun invoke(toolName: String, parameters: JsonElement): Result<JsonElement> {
        val tool = tools[toolName] 
            ?: return Result.failure(ToolNotFoundException(toolName))
        
        // Validate parameters
        val validationResult = validator.validate(parameters, tool.parametersSchema)
        if (!validationResult.isValid) {
            return Result.failure(
                ParameterValidationException(toolName, validationResult.errors)
            )
        }
        
        return try {
            tool.handler(parameters)
        } catch (e: Exception) {
            Result.failure(ToolExecutionException(toolName, e))
        }
    }
    
    suspend fun invokeAsync(
        toolName: String, 
        parameters: JsonElement, 
        timeout: Long
    ): Result<JsonElement> {
        val tool = asyncTools[toolName] 
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
                tool.handler(parameters)
            }
        } catch (e: TimeoutCancellationException) {
            Result.failure(ToolTimeoutException(toolName, timeout))
        } catch (e: Exception) {
            Result.failure(ToolExecutionException(toolName, e))
        }
    }
    
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
    
    fun handleJsonRpcMethod(method: String, params: JsonElement): Result<JsonElement> {
        return when (method) {
            "tools/list" -> handleToolsList(params)
            "tools/call" -> handleToolsCall(params)
            else -> Result.failure(
                JsonRpcException(
                    code = -32601, // Method not found
                    message = "Method not found: $method"
                )
            )
        }
    }
    
    private fun handleToolsList(params: JsonElement): Result<JsonElement> {
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
        
        // Try sync tool first, then async
        val result = if (tools.containsKey(toolName)) {
            invoke(toolName, arguments)
        } else {
            return Result.failure(
                JsonRpcException(
                    code = -32601, // Method not found
                    message = "Tool not found: $toolName"
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

