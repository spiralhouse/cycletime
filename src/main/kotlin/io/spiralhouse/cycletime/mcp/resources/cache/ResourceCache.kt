package io.spiralhouse.cycletime.mcp.resources.cache

import io.spiralhouse.cycletime.mcp.resources.Resource
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * Cache layer for frequently accessed resources
 * 
 * This class provides an LRU cache with TTL support for resources,
 * reducing provider load and improving response times for frequently
 * accessed resources.
 */
class ResourceCache(
    private val maxSize: Int = 1000,
    private val defaultTtl: Duration = Duration.ofMinutes(5)
) {
    private val cache = ConcurrentHashMap<String, CacheEntry>()
    private val accessOrder = LinkedHashMap<String, Instant>(maxSize + 1, 0.75f, true)
    
    /**
     * Cache entry with expiration tracking
     */
    private data class CacheEntry(
        val resource: Resource,
        val cachedAt: Instant,
        val expiresAt: Instant
    ) {
        fun isExpired(): Boolean = Instant.now().isAfter(expiresAt)
    }
    
    /**
     * Get a resource from the cache
     * 
     * @param uri The URI of the resource
     * @return The cached resource, or null if not found or expired
     */
    fun get(uri: String): Resource? {
        val entry = cache[uri] ?: return null
        
        if (entry.isExpired()) {
            cache.remove(uri)
            accessOrder.remove(uri)
            return null
        }
        
        // Update access order
        synchronized(accessOrder) {
            accessOrder[uri] = Instant.now()
        }
        
        return entry.resource
    }
    
    /**
     * Put a resource in the cache
     * 
     * @param resource The resource to cache
     * @param ttl Optional custom TTL for this resource
     */
    fun put(resource: Resource, ttl: Duration = defaultTtl) {
        val now = Instant.now()
        val entry = CacheEntry(
            resource = resource,
            cachedAt = now,
            expiresAt = now.plus(ttl)
        )
        
        // Evict oldest entry if at capacity
        synchronized(accessOrder) {
            if (accessOrder.size >= maxSize) {
                val oldest = accessOrder.keys.first()
                accessOrder.remove(oldest)
                cache.remove(oldest)
            }
            accessOrder[resource.uri] = now
        }
        
        cache[resource.uri] = entry
    }
    
    /**
     * Invalidate a cached resource
     * 
     * @param uri The URI of the resource to invalidate
     */
    fun invalidate(uri: String) {
        cache.remove(uri)
        synchronized(accessOrder) {
            accessOrder.remove(uri)
        }
    }
    
    /**
     * Clear all cached resources
     */
    fun clear() {
        cache.clear()
        synchronized(accessOrder) {
            accessOrder.clear()
        }
    }
    
    /**
     * Get cache statistics
     * 
     * @return Current cache statistics
     */
    fun getStats(): CacheStats {
        val validEntries = cache.values.filterNot { it.isExpired() }
        return CacheStats(
            size = validEntries.size,
            maxSize = maxSize,
            hitRate = calculateHitRate(),
            averageAge = calculateAverageAge(validEntries)
        )
    }
    
    private var hits = 0L
    private var misses = 0L
    
    private fun calculateHitRate(): Double {
        val total = hits + misses
        return if (total > 0) hits.toDouble() / total else 0.0
    }
    
    private fun calculateAverageAge(entries: List<CacheEntry>): Duration {
        if (entries.isEmpty()) return Duration.ZERO
        
        val now = Instant.now()
        val totalAge = entries.sumOf { 
            Duration.between(it.cachedAt, now).toMillis()
        }
        return Duration.ofMillis(totalAge / entries.size)
    }
    
    /**
     * Cache statistics
     */
    data class CacheStats(
        val size: Int,
        val maxSize: Int,
        val hitRate: Double,
        val averageAge: Duration
    )
}