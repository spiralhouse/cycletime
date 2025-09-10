package io.spiralhouse.cycletime.mcp.resources

import io.spiralhouse.cycletime.mcp.resources.exceptions.ProviderNotFoundException
import java.util.concurrent.ConcurrentHashMap

/**
 * Thread-safe registry for managing resource providers
 * 
 * Provides concurrent access to provider management,
 * automatic metadata generation, and cross-provider resource discovery.
 * This is the main registry for all resource providers in the system.
 */
class ResourceRegistry {
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
        // TODO: Provider templates need to be implemented in the provider interface
        // For now, return empty list instead of hardcoded test data
        return emptyList()
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
    
    // Additional methods for testing compatibility
    
    /**
     * Register a provider with a specific key
     */
    suspend fun registerProvider(key: String, provider: ResourceProvider) {
        providers[key] = provider
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
        providerMetadata[key] = metadata
    }
    
    /**
     * Unregister a provider by key
     */
    suspend fun unregisterProvider(key: String) {
        providers.remove(key)
        providerMetadata.remove(key)
    }
    
    /**
     * List all provider keys
     */
    fun listProviders(): List<String> {
        return providers.keys.toList()
    }
    
    /**
     * Start a provider
     */
    suspend fun startProvider(key: String) {
        val provider = providers[key] ?: throw ProviderNotFoundException(key)
        provider.start()
    }
    
    /**
     * Stop a provider
     */
    suspend fun stopProvider(key: String) {
        val provider = providers[key] ?: throw ProviderNotFoundException(key)
        provider.stop()
    }
}