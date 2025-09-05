package io.spiralhouse.cycletime.mcp.resources.cache

import io.spiralhouse.cycletime.mcp.resources.*
import java.time.Duration

/**
 * Decorator that adds caching to any ResourceProvider
 * 
 * This decorator pattern implementation wraps an existing provider
 * with a caching layer, transparently improving performance for
 * frequently accessed resources.
 */
class CachedResourceProvider(
    private val delegate: ResourceProvider,
    private val cache: ResourceCache = ResourceCache()
) : ResourceProvider {
    
    override val name: String = delegate.name
    override val isRunning: Boolean get() = delegate.isRunning
    
    override suspend fun start() {
        delegate.start()
    }
    
    override suspend fun stop() {
        delegate.stop()
        cache.clear()
    }
    
    override suspend fun listResources(
        filter: ResourceFilter?,
        pagination: ResourcePagination?
    ): List<Resource> {
        // List operations bypass cache to ensure freshness
        return delegate.listResources(filter, pagination)
    }
    
    override suspend fun getResource(uri: String): Resource? {
        // Check cache first
        cache.get(uri)?.let { return it }
        
        // Fetch from delegate and cache result
        val resource = delegate.getResource(uri)
        resource?.let { 
            cache.put(it, determineTtl(it))
        }
        
        return resource
    }
    
    override suspend fun searchResources(query: String): List<Resource> {
        // Search operations bypass cache
        return delegate.searchResources(query)
    }
    
    override suspend fun updateResource(uri: String, content: ResourceContent) {
        // Invalidate cache on update
        cache.invalidate(uri)
        delegate.updateResource(uri, content)
    }
    
    /**
     * Determine TTL based on resource characteristics
     */
    private fun determineTtl(resource: Resource): Duration {
        return when {
            // Configuration resources can be cached longer
            resource.uri.startsWith("config://") -> Duration.ofMinutes(10)
            
            // State resources should have shorter TTL
            resource.uri.startsWith("state://") -> Duration.ofSeconds(30)
            
            // File resources depend on modification time
            resource.uri.startsWith("file://") -> Duration.ofMinutes(5)
            
            // Data resources are often dynamic
            resource.uri.startsWith("data://") -> Duration.ofSeconds(60)
            
            // Default TTL
            else -> Duration.ofMinutes(5)
        }
    }
    
    /**
     * Get cache statistics for monitoring
     */
    fun getCacheStats(): ResourceCache.CacheStats {
        return cache.getStats()
    }
    
    /**
     * Clear the cache manually
     */
    fun clearCache() {
        cache.clear()
    }
    
    /**
     * Invalidate specific resource in cache
     */
    fun invalidateCache(uri: String) {
        cache.invalidate(uri)
    }
}