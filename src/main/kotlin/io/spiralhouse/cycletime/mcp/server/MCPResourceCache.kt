package io.spiralhouse.cycletime.mcp.server

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.slf4j.LoggerFactory
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

/**
 * Cached resource entry with metadata.
 */
data class CachedResource(
    val uri: String,
    val content: String,
    val mimeType: String,
    val cachedAt: Long = System.currentTimeMillis(),
    val accessCount: Int = 0,
    val size: Int = content.length
)

/**
 * High-performance resource cache with TTL and LRU eviction.
 * 
 * Features:
 * - Time-based expiration (TTL)
 * - Size-based limits
 * - LRU eviction policy
 * - Access tracking for hot resources
 * - Thread-safe operations
 */
class MCPResourceCache(
    private val config: MCPConfiguration
) {
    private val logger = LoggerFactory.getLogger(MCPResourceCache::class.java)
    private val cache = ConcurrentHashMap<String, CachedResource>()
    private val accessOrder = LinkedHashMap<String, Long>(16, 0.75f, true)
    private val cacheMutex = Mutex()
    
    // Cache statistics
    private var hits = 0L
    private var misses = 0L
    private var evictions = 0L
    private var totalSize = 0L
    
    /**
     * Get a resource from cache if available and not expired.
     */
    suspend fun get(uri: String): CachedResource? {
        if (!config.resourceCacheEnabled) return null
        
        return cacheMutex.withLock {
            val entry = cache[uri]
            if (entry != null) {
                if (isExpired(entry)) {
                    // Remove expired entry
                    remove(uri)
                    misses++
                    null
                } else {
                    // Update access tracking
                    accessOrder[uri] = System.currentTimeMillis()
                    hits++
                    
                    // Return updated entry with incremented access count
                    val updated = entry.copy(accessCount = entry.accessCount + 1)
                    cache[uri] = updated
                    updated
                }
            } else {
                misses++
                null
            }
        }
    }
    
    /**
     * Put a resource into cache with automatic eviction if needed.
     */
    suspend fun put(
        uri: String,
        content: String,
        mimeType: String
    ): CachedResource {
        if (!config.resourceCacheEnabled) {
            return CachedResource(uri, content, mimeType)
        }
        
        return cacheMutex.withLock {
            val entry = CachedResource(uri, content, mimeType)
            
            // Check if we need to evict entries
            if (cache.size >= config.resourceCacheMaxSize) {
                evictLRU()
            }
            
            // Check size limits
            while (totalSize + entry.size > config.resourceCacheMaxSize * 1024 && cache.isNotEmpty()) {
                evictLRU()
            }
            
            // Add to cache
            cache[uri] = entry
            accessOrder[uri] = System.currentTimeMillis()
            totalSize += entry.size
            
            if (config.detailedLogging) {
                logger.debug("Cached resource: $uri (size: ${entry.size}, total: ${cache.size})")
            }
            
            entry
        }
    }
    
    /**
     * Remove a specific resource from cache.
     */
    suspend fun remove(uri: String): Boolean {
        return cacheMutex.withLock {
            val entry = cache.remove(uri)
            if (entry != null) {
                accessOrder.remove(uri)
                totalSize -= entry.size
                true
            } else {
                false
            }
        }
    }
    
    /**
     * Clear all cached resources.
     */
    suspend fun clear() {
        cacheMutex.withLock {
            cache.clear()
            accessOrder.clear()
            totalSize = 0
            
            logger.info("Cache cleared (evictions: $evictions)")
        }
    }
    
    /**
     * Get cache statistics for monitoring.
     */
    fun getStatistics(): CacheStatistics {
        val hitRate = if (hits + misses > 0) {
            hits.toDouble() / (hits + misses)
        } else 0.0
        
        return CacheStatistics(
            entries = cache.size,
            totalSize = totalSize,
            hits = hits,
            misses = misses,
            hitRate = hitRate,
            evictions = evictions,
            hotResources = getHotResources()
        )
    }
    
    /**
     * Preload frequently accessed resources.
     */
    suspend fun preload(resources: Map<String, Pair<String, String>>) {
        resources.forEach { (uri, data) ->
            val (content, mimeType) = data
            put(uri, content, mimeType)
        }
        
        logger.info("Preloaded ${resources.size} resources into cache")
    }
    
    /**
     * Get the most frequently accessed resources.
     */
    private fun getHotResources(limit: Int = 10): List<HotResource> {
        return cache.entries
            .sortedByDescending { it.value.accessCount }
            .take(limit)
            .map { (uri, entry) ->
                HotResource(
                    uri = uri,
                    accessCount = entry.accessCount,
                    size = entry.size,
                    age = System.currentTimeMillis() - entry.cachedAt
                )
            }
    }
    
    /**
     * Check if a cache entry has expired.
     */
    private fun isExpired(entry: CachedResource): Boolean {
        val age = System.currentTimeMillis() - entry.cachedAt
        return age > config.resourceCacheTtl.inWholeMilliseconds
    }
    
    /**
     * Evict the least recently used entry.
     */
    private fun evictLRU() {
        val lru = accessOrder.entries.firstOrNull()
        if (lru != null) {
            val uri = lru.key
            val entry = cache.remove(uri)
            if (entry != null) {
                accessOrder.remove(uri)
                totalSize -= entry.size
                evictions++
                
                if (config.detailedLogging) {
                    logger.debug("Evicted LRU resource: $uri (size: ${entry.size})")
                }
            }
        }
    }
    
    /**
     * Perform periodic maintenance tasks.
     */
    suspend fun maintenance() {
        cacheMutex.withLock {
            // Remove expired entries
            val now = System.currentTimeMillis()
            val expired = cache.entries.filter { (_, entry) ->
                isExpired(entry)
            }
            
            expired.forEach { (uri, entry) ->
                cache.remove(uri)
                accessOrder.remove(uri)
                totalSize -= entry.size
                evictions++
            }
            
            if (expired.isNotEmpty()) {
                logger.info("Maintenance: removed ${expired.size} expired entries")
            }
        }
    }
}

/**
 * Cache statistics for monitoring.
 */
data class CacheStatistics(
    val entries: Int,
    val totalSize: Long,
    val hits: Long,
    val misses: Long,
    val hitRate: Double,
    val evictions: Long,
    val hotResources: List<HotResource>
)

/**
 * Information about frequently accessed resources.
 */
data class HotResource(
    val uri: String,
    val accessCount: Int,
    val size: Int,
    val age: Long
)