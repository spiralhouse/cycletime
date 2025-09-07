package io.spiralhouse.cycletime.mcp.server.handlers

import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcError
import io.spiralhouse.cycletime.mcp.resources.interfaces.ResourceRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolRegistry
import kotlinx.serialization.json.*

/**
 * Implementation of McpMethodHandler that uses ResourceRegistry and ToolRegistry.
 * 
 * This is a simplified version that works with the existing registry infrastructure.
 */
class McpMethodHandlers(
    private val resourceRegistry: ResourceRegistry,
    private val toolRegistry: ToolRegistry
) : McpMethodHandler {
    
    override suspend fun handleRequest(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            when (request.method) {
                "initialize" -> handleInitialize(request)
                "ping" -> handlePing(request)
                "shutdown" -> handleShutdown(request)
                "tools/list" -> handleToolsList(request)
                "tools/call" -> handleToolsCall(request)
                "resources/list" -> handleResourcesList(request)
                "resources/read" -> handleResourcesRead(request)
                "resources/subscribe" -> handleResourcesSubscribe(request)
                else -> createMethodNotFoundError(request)
            }
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    override suspend fun handleRequestAsync(request: JsonRpcRequest): JsonRpcResponse {
        return handleRequest(request) // For now, handle everything synchronously
    }
    
    override suspend fun handleNotification(request: JsonRpcRequest) {
        // Notifications don't require a response
        when (request.method) {
            "notifications/message" -> {} // Log message
            "notifications/progress" -> {} // Track progress
            else -> {} // Ignore unknown notifications
        }
    }
    
    // ===== Method Handlers =====
    
    private fun handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params as? JsonObject
        
        // Validate protocol version if provided
        val protocolVersion = params?.get("protocolVersion")?.jsonPrimitive?.content
        if (protocolVersion != null && protocolVersion != "2024-11-05") {
            return createInvalidParamsError(request, "Unsupported protocol version: $protocolVersion")
        }
        
        val result = buildJsonObject {
            put("protocolVersion", "2024-11-05")
            put("capabilities", buildCapabilities())
            put("serverInfo", buildServerInfo())
        }
        
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = result,
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private fun handlePing(request: JsonRpcRequest): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = buildJsonObject { put("pong", true) },
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private fun handleShutdown(request: JsonRpcRequest): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = buildJsonObject { put("acknowledged", true) },
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private suspend fun handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            val tools = toolRegistry.getAllToolMetadata().map { tool ->
                buildJsonObject {
                    put("name", tool.name)
                    put("description", tool.description)
                    tool.parametersSchema?.let { put("inputSchema", it) }
                }
            }
            
            JsonRpcResponse(
                jsonrpc = "2.0",
                result = buildJsonObject {
                    put("tools", JsonArray(tools))
                },
                id = request.id ?: JsonPrimitive("null")
            )
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    private suspend fun handleToolsCall(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params as? JsonObject
            ?: return createInvalidParamsError(request, "Parameters required")
        
        val toolName = params["name"]?.jsonPrimitive?.content
            ?: return createInvalidParamsError(request, "Tool name required")
        
        val arguments = params["arguments"] ?: JsonObject(emptyMap())
        
        return try {
            val result = toolRegistry.invoke(toolName, arguments)
            val resultValue = result.getOrThrow()
            JsonRpcResponse(
                jsonrpc = "2.0",
                result = buildJsonObject {
                    put("content", buildJsonArray {
                        add(buildJsonObject {
                            put("type", "text")
                            put("text", resultValue.toString())
                        })
                    })
                },
                id = request.id ?: JsonPrimitive("null")
            )
        } catch (e: NoSuchElementException) {
            createToolNotFoundError(request, toolName)
        } catch (e: Exception) {
            createToolExecutionError(request, e)
        }
    }
    
    private suspend fun handleResourcesList(request: JsonRpcRequest): JsonRpcResponse {
        return try {
            val resources = mutableListOf<JsonObject>()
            
            // Aggregate resources from all providers
            for (provider in resourceRegistry.getProviders()) {
                val providerResources = provider.listResources()
                providerResources.forEach { resource ->
                    resources.add(buildJsonObject {
                        put("uri", resource.uri)
                        put("name", resource.name)
                        resource.description?.let { put("description", it) }
                        put("mimeType", resource.mimeType ?: "text/plain")
                    })
                }
            }
            
            JsonRpcResponse(
                jsonrpc = "2.0",
                result = buildJsonObject {
                    put("resources", JsonArray(resources))
                },
                id = request.id ?: JsonPrimitive("null")
            )
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    private suspend fun handleResourcesRead(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params as? JsonObject
            ?: return createInvalidParamsError(request, "Parameters required")
        
        val uri = params["uri"]?.jsonPrimitive?.content
            ?: return createInvalidParamsError(request, "URI required")
        
        return try {
            // Find the provider that handles this resource
            var content: String? = null
            for (provider in resourceRegistry.getProviders()) {
                val resources = provider.listResources()
                if (resources.any { it.uri == uri }) {
                    content = provider.readResource(uri)
                    break
                }
            }
            
            if (content == null) {
                return createResourceNotFoundError(request, uri)
            }
            
            JsonRpcResponse(
                jsonrpc = "2.0",
                result = buildJsonObject {
                    put("contents", buildJsonArray {
                        add(buildJsonObject {
                            put("uri", uri)
                            put("mimeType", "text/plain")
                            put("text", content)
                        })
                    })
                },
                id = request.id ?: JsonPrimitive("null")
            )
        } catch (e: NoSuchElementException) {
            createResourceNotFoundError(request, uri)
        } catch (e: Exception) {
            createInternalError(request, e)
        }
    }
    
    private suspend fun handleResourcesSubscribe(request: JsonRpcRequest): JsonRpcResponse {
        val params = request.params as? JsonObject
            ?: return createInvalidParamsError(request, "Parameters required")
        
        val uri = params["uri"]?.jsonPrimitive?.content
            ?: return createInvalidParamsError(request, "URI required")
        
        // For now, just acknowledge the subscription
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = buildJsonObject {
                put("subscribed", true)
            },
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    // ===== Helper Methods =====
    
    private fun buildCapabilities(): JsonObject {
        return buildJsonObject {
            put("tools", buildJsonObject {
                put("listChanged", true)
            })
            put("resources", buildJsonObject {
                put("subscribe", true)
                put("listChanged", true)
            })
            put("logging", buildJsonObject {})
            put("prompts", buildJsonObject {
                put("listChanged", true)
            })
        }
    }
    
    private fun buildServerInfo(): JsonObject {
        return buildJsonObject {
            put("name", "CycleTime MCP Server")
            put("version", "1.0.0")
        }
    }
    
    // ===== Error Response Helpers =====
    
    private fun createMethodNotFoundError(request: JsonRpcRequest): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            error = JsonRpcError(
                code = -32601,
                message = "Method not found: ${request.method}",
                data = null
            ),
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private fun createInvalidParamsError(request: JsonRpcRequest, message: String): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            error = JsonRpcError(
                code = -32602,
                message = message,
                data = null
            ),
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private fun createInternalError(request: JsonRpcRequest, error: Exception): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            error = JsonRpcError(
                code = -32603,
                message = "Internal error: ${error.message}",
                data = buildJsonObject {
                    put("exception", error.javaClass.simpleName)
                }
            ),
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private fun createToolNotFoundError(request: JsonRpcRequest, toolName: String): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            error = JsonRpcError(
                code = -32001,
                message = "Tool not found: $toolName",
                data = null
            ),
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private fun createResourceNotFoundError(request: JsonRpcRequest, uri: String): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            error = JsonRpcError(
                code = -32002,
                message = "Resource not found: $uri",
                data = null
            ),
            id = request.id ?: JsonPrimitive("null")
        )
    }
    
    private fun createToolExecutionError(request: JsonRpcRequest, error: Exception): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            error = JsonRpcError(
                code = -32004,
                message = "Tool execution failed: ${error.message}",
                data = buildJsonObject {
                    put("exception", error.javaClass.simpleName)
                }
            ),
            id = request.id ?: JsonPrimitive("null")
        )
    }
}