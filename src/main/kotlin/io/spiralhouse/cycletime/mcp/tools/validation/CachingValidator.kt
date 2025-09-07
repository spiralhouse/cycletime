package io.spiralhouse.cycletime.mcp.tools.validation

import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolValidator
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import java.util.concurrent.ConcurrentHashMap

/**
 * A validator decorator that caches validation results for performance.
 * 
 * This validator wraps another validator and caches the results of schema compilation
 * and validation to improve performance for repeated validations with the same schemas.
 * 
 * @param delegate The underlying validator to delegate to
 * @param maxCacheSize Maximum number of cache entries to maintain
 */
class CachingValidator(
    private val delegate: ToolValidator,
    private val maxCacheSize: Int = 100
) : ToolValidator {
    
    // Cache key is a combination of schema hash and data hash
    private data class CacheKey(val schemaHash: Int, val dataHash: Int)
    
    // Thread-safe cache for validation results
    private val cache = ConcurrentHashMap<CacheKey, ValidationResult>()
    
    override fun validate(data: JsonElement, schema: JsonObject): ValidationResult {
        // Create cache key from schema and data
        val cacheKey = CacheKey(
            schemaHash = schema.hashCode(),
            dataHash = data.hashCode()
        )
        
        // Check cache first
        cache[cacheKey]?.let { return it }
        
        // If cache is full, clear it (simple eviction strategy)
        if (cache.size >= maxCacheSize) {
            cache.clear()
        }
        
        // Perform validation and cache result
        val result = delegate.validate(data, schema)
        cache[cacheKey] = result
        
        return result
    }
    
    /**
     * Clear the validation cache.
     */
    fun clearCache() {
        cache.clear()
    }
    
    /**
     * Get the current cache size.
     */
    fun getCacheSize(): Int = cache.size
}