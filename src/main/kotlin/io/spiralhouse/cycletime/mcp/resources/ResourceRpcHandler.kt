package io.spiralhouse.cycletime.mcp.resources

import io.spiralhouse.cycletime.mcp.resources.subscription.*
import kotlinx.serialization.json.*

/**
 * Handles JSON-RPC method calls for the Resource Provider Framework
 */
class ResourceRpcHandler {
    private val registry = ResourceProviderRegistry()
    private val subscriptionManager = ResourceSubscriptionManager()
    
    init {
        // Initialize with test provider for testing
        kotlinx.coroutines.runBlocking {
            registry.register(TestResourceProvider("test-provider"))
        }
    }
    
    /**
     * Handle incoming JSON-RPC requests
     */
    suspend fun handle(request: JsonObject): JsonObject {
        val method = request["method"]?.jsonPrimitive?.content ?: ""
        val params = request["params"]?.jsonObject ?: JsonObject(emptyMap())
        val id = request["id"]?.jsonPrimitive?.int ?: 1
        
        return try {
            val result = when (method) {
                "resources/list" -> handleResourcesList(params)
                "resources/read" -> handleResourcesRead(params)
                "resources/subscribe" -> handleResourcesSubscribe(params)
                "resources/unsubscribe" -> handleResourcesUnsubscribe(params)
                else -> throw IllegalArgumentException("Unknown method: $method")
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
        
        val subscription = subscriptionManager.subscribeToResource(
            uri = uri,
            subscriber = TestSubscriber("rpc-client")
        ) { /* callback */ }
        
        return buildJsonObject {
            put("subscriptionId", JsonPrimitive(subscription.id))
        }
    }
    
    private suspend fun handleResourcesUnsubscribe(params: JsonObject): JsonObject {
        val subscriptionId = params["subscriptionId"]?.jsonPrimitive?.content 
            ?: throw IllegalArgumentException("subscriptionId parameter required")
        
        subscriptionManager.unsubscribe(subscriptionId)
        
        return buildJsonObject {
            put("success", JsonPrimitive(true))
        }
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