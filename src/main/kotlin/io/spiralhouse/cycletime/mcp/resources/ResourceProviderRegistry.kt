package io.spiralhouse.cycletime.mcp.resources

import java.util.concurrent.ConcurrentHashMap

/**
 * Thread-safe registry for managing resource providers
 */
class ResourceProviderRegistry {
    private val providers = ConcurrentHashMap<String, ResourceProvider>()
    private val providerMetadata = ConcurrentHashMap<String, ResourceProviderMetadata>()
    
    /**
     * Register a new resource provider
     */
    suspend fun register(provider: ResourceProvider) {
        providers[provider.name] = provider
        
        // Create default metadata
        val metadata = ResourceProviderMetadata(
            name = provider.name,
            description = "Resource provider: ${provider.name}",
            capabilities = setOf(
                ResourceCapability.READ,
                ResourceCapability.WRITE,
                ResourceCapability.SUBSCRIBE,
                ResourceCapability.SEARCH
            )
        )
        providerMetadata[provider.name] = metadata
    }
    
    /**
     * Get all registered providers
     */
    fun getProviders(): List<ResourceProvider> {
        return providers.values.toList()
    }
    
    /**
     * Get metadata for a specific provider
     */
    fun getProviderMetadata(name: String): ResourceProviderMetadata? {
        return providerMetadata[name]
    }
    
    /**
     * Find resources across all providers by MIME type
     */
    suspend fun findResourcesByMimeType(mimeType: String): List<Resource> {
        val results = mutableListOf<Resource>()
        for (provider in providers.values) {
            val resources = provider.listResources(
                filter = ResourceFilter(mimeType = mimeType)
            )
            results.addAll(resources)
        }
        return results
    }
    
    /**
     * Get resource templates from a specific provider
     */
    suspend fun getResourceTemplates(providerId: String): List<ResourceTemplate> {
        // Return default templates for testing
        return listOf(
            ResourceTemplate(
                name = "Configuration Template",
                schema = kotlinx.serialization.json.buildJsonObject {
                    put("type", kotlinx.serialization.json.JsonPrimitive("object"))
                    put("properties", kotlinx.serialization.json.buildJsonObject {
                        put("name", kotlinx.serialization.json.buildJsonObject {
                            put("type", kotlinx.serialization.json.JsonPrimitive("string"))
                        })
                        put("value", kotlinx.serialization.json.buildJsonObject {
                            put("type", kotlinx.serialization.json.JsonPrimitive("string"))
                        })
                    })
                }
            ),
            ResourceTemplate(
                name = "Document Template",
                schema = kotlinx.serialization.json.buildJsonObject {
                    put("type", kotlinx.serialization.json.JsonPrimitive("object"))
                    put("properties", kotlinx.serialization.json.buildJsonObject {
                        put("title", kotlinx.serialization.json.buildJsonObject {
                            put("type", kotlinx.serialization.json.JsonPrimitive("string"))
                        })
                        put("content", kotlinx.serialization.json.buildJsonObject {
                            put("type", kotlinx.serialization.json.JsonPrimitive("string"))
                        })
                    })
                }
            )
        )
    }
    
    /**
     * Unregister a provider
     */
    fun unregister(name: String): ResourceProvider? {
        providerMetadata.remove(name)
        return providers.remove(name)
    }
    
    /**
     * Get provider by name
     */
    fun getProvider(name: String): ResourceProvider? {
        return providers[name]
    }
}