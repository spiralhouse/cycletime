package io.spiralhouse.cycletime.mcp.resources.interfaces

import io.spiralhouse.cycletime.mcp.resources.*

/**
 * Registry interface for managing and discovering resource providers
 * 
 * This interface defines the contract for registries that manage multiple
 * resource providers, enabling provider discovery, resource aggregation,
 * and cross-provider resource queries.
 */
interface ResourceRegistry {
    
    /**
     * Register a new resource provider with the registry
     * 
     * @param provider The resource provider to register
     * @throws IllegalArgumentException if a provider with the same name already exists
     */
    suspend fun register(provider: ResourceProvider)
    
    /**
     * Unregister a provider from the registry
     * 
     * @param name The name of the provider to unregister
     * @return The unregistered provider, or null if not found
     */
    fun unregister(name: String): ResourceProvider?
    
    /**
     * Get a specific provider by name
     * 
     * @param name The name of the provider to retrieve
     * @return The provider, or null if not found
     */
    fun getProvider(name: String): ResourceProvider?
    
    /**
     * Get all registered providers
     * 
     * @return A list of all registered providers
     */
    fun getProviders(): List<ResourceProvider>
    
    /**
     * Get metadata for a specific provider
     * 
     * @param name The name of the provider
     * @return The provider's metadata, or null if not found
     */
    fun getProviderMetadata(name: String): ResourceProviderMetadata?
    
    /**
     * Find resources across all providers by MIME type
     * 
     * @param mimeType The MIME type to filter by
     * @return A list of resources matching the MIME type from all providers
     */
    suspend fun findResourcesByMimeType(mimeType: String): List<Resource>
    
    /**
     * Get resource templates from a specific provider
     * 
     * @param providerId The ID of the provider
     * @return A list of available resource templates
     */
    suspend fun getResourceTemplates(providerId: String): List<ResourceTemplate>
}