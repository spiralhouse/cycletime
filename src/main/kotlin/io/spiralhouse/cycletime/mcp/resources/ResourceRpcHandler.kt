package io.spiralhouse.cycletime.mcp.resources

import io.spiralhouse.cycletime.mcp.resources.interfaces.*
import io.spiralhouse.cycletime.mcp.resources.rpc.*
import kotlinx.serialization.json.*

/**
 * Handles JSON-RPC method calls for the Resource Provider Framework
 * 
 * This handler uses the command pattern to organize RPC method implementations,
 * providing a clean and extensible architecture for handling resource operations.
 */
class ResourceRpcHandler(
    private val registry: ResourceRegistry = ResourceProviderRegistry()
) {
    private val commands = mutableMapOf<String, RpcCommand>()
    
    init {
        // Register commands
        registerCommands()
    }
    
    private fun registerCommands() {
        commands["resources/list"] = ResourceListCommand(registry)
        // Other commands will be registered here
    }
    
    /**
     * Handle incoming JSON-RPC requests
     */
    suspend fun handle(request: JsonObject): JsonObject {
        val method = request["method"]?.jsonPrimitive?.content ?: ""
        val params = request["params"]?.jsonObject ?: JsonObject(emptyMap())
        val id = request["id"]?.jsonPrimitive?.int ?: 1
        
        return try {
            // Try command pattern first
            val command = commands[method]
            val result = if (command != null && command.validate(params)) {
                command.execute(params)
            } else {
                // Fall back to legacy handlers for backward compatibility
                when (method) {
                    "resources/list" -> handleResourcesList(params)
                    "resources/read" -> handleResourcesRead(params)
                    "resources/subscribe" -> handleResourcesSubscribe(params)
                    "resources/unsubscribe" -> handleResourcesUnsubscribe(params)
                    else -> throw IllegalArgumentException("Unknown method: $method")
                }
            }
            
            buildJsonObject {
                put("jsonrpc", JsonPrimitive("2.0"))
                put("id", JsonPrimitive(id))
                put("result", result)
            }
        } catch (e: Exception) {
            buildJsonObject {
                put("jsonrpc", JsonPrimitive("2.0"))
                put("id", JsonPrimitive(id))
                put("error", buildJsonObject {
                    put("code", JsonPrimitive(-32000))
                    put("message", JsonPrimitive(e.message ?: "Unknown error"))
                })
            }
        }
    }
    
    private suspend fun handleResourcesList(params: JsonObject): JsonObject {
        val providerName = params["provider"]?.jsonPrimitive?.content
        val provider = if (providerName != null) {
            registry.getProvider(providerName)
        } else {
            registry.getProviders().firstOrNull()
        }
        
        val resources = provider?.listResources() ?: emptyList()
        
        return buildJsonObject {
            put("resources", JsonArray(resources.map { resourceToJson(it) }))
        }
    }
    
    private suspend fun handleResourcesRead(params: JsonObject): JsonObject {
        val uri = params["uri"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("uri parameter required")
        
        // Find resource across all providers
        for (provider in registry.getProviders()) {
            val resource = provider.getResource(uri)
            if (resource != null) {
                return resourceToJson(resource)
            }
        }
        
        throw IllegalArgumentException("Resource not found: $uri")
    }
    
    private suspend fun handleResourcesSubscribe(params: JsonObject): JsonObject {
        val uri = params["uri"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("uri parameter required")
        
        // Resource subscription is not supported in this implementation
        // Future versions may add real-time resource change notifications
        throw UnsupportedOperationException("Resource subscription is not supported")
    }
    
    private suspend fun handleResourcesUnsubscribe(params: JsonObject): JsonObject {
        val subscriptionId = params["subscriptionId"]?.jsonPrimitive?.content 
            ?: throw IllegalArgumentException("subscriptionId parameter required")
        
        // Resource subscription is not supported in this implementation
        // Future versions may add real-time resource change notifications
        throw UnsupportedOperationException("Resource subscription is not supported")
    }
    
    private fun resourceToJson(resource: Resource): JsonObject {
        return buildJsonObject {
            put("uri", JsonPrimitive(resource.uri))
            put("name", JsonPrimitive(resource.name))
            resource.description?.let { put("description", JsonPrimitive(it)) }
            put("mimeType", JsonPrimitive(resource.mimeType))
            
            resource.content?.let { content ->
                when (content) {
                    is ResourceContent.Text -> {
                        put("contents", buildJsonObject {
                            put("text", JsonPrimitive(content.data))
                        })
                    }
                    is ResourceContent.Binary -> {
                        put("contents", buildJsonObject {
                            put("blob", JsonPrimitive(content.data))
                        })
                    }
                }
            }
            
            resource.metadata?.let { metadata ->
                put("metadata", buildJsonObject {
                    put("created", JsonPrimitive(metadata.created.toString()))
                    put("modified", JsonPrimitive(metadata.modified.toString()))
                    put("size", JsonPrimitive(metadata.size))
                    metadata.version?.let { put("version", JsonPrimitive(it)) }
                })
            }
        }
    }
}