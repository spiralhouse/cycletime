package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.domain.services.TimeProvider
import kotlinx.datetime.Instant
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

/**
 * Thread-safe LRU cache with TTL support for dashboard data.
 *
 * This cache provides:
 * - **LRU Eviction**: Removes least recently used entries when size limit exceeded
 * - **TTL Expiration**: Entries expire after configured time-to-live
 * - **Pattern Invalidation**: Wildcard-based cache key invalidation
 * - **Thread Safety**: Safe for concurrent access using read-write locks
 *
 * ## Design Principles:
 * - **Testability**: Uses injected TimeProvider for deterministic testing
 * - **Performance**: Read-write locks allow concurrent reads
 * - **Simplicity**: Clean API with minimal surface area
 *
 * ## Usage Example:
 * ```kotlin
 * val cache = DashboardCache(
 *     maxSize = 100,
 *     defaultTTL = 5.minutes,
 *     timeProvider = SystemTimeProvider()
 * )
 *
 * // Get or compute value
 * val data = cache.getOrPut("project:123") {
 *     loadProjectData(projectId)
 * }
 *
 * // Invalidate specific key
 * cache.invalidate("project:123")
 *
 * // Invalidate by pattern
 * cache.invalidatePattern("story:*:subtasks")
 * ```
 *
 * ## Thread Safety:
 * All public methods are thread-safe. Uses ReentrantReadWriteLock for efficient
 * concurrent reads with exclusive writes.
 *
 * @property maxSize Maximum number of entries before LRU eviction (default: 100)
 * @property defaultTTL Default time-to-live for cached entries (default: 5 minutes)
 * @property timeProvider Time provider for TTL and expiration checks
 *
 * @constructor Creates a new cache with specified configuration
 */
class DashboardCache(
    private val maxSize: Int = 100,
    private val defaultTTL: Duration = 5.minutes,
    private val timeProvider: TimeProvider
) {
    /**
     * Cache entry with value and expiration timestamp.
     *
     * @property value The cached value
     * @property expiresAt Instant when this entry should expire
     */
    private data class CacheEntry<T>(
        val value: T,
        val expiresAt: Instant
    ) {
        /**
         * Checks if this entry has expired.
         *
         * @param now Current time instant
         * @return true if entry is expired, false otherwise
         */
        fun isExpired(now: Instant): Boolean = now >= expiresAt
    }

    /**
     * LRU-ordered map of cache entries.
     * LinkedHashMap maintains insertion/access order for LRU eviction.
     */
    private val cache = object : LinkedHashMap<String, CacheEntry<Any?>>(
        maxSize + 1, // Initial capacity slightly larger than max
        0.75f,      // Load factor
        true        // Access-order (LRU)
    ) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, CacheEntry<Any?>>?): Boolean {
            return size > maxSize
        }
    }

    /**
     * Read-write lock for thread-safe cache access.
     * Allows multiple concurrent readers or single writer.
     */
    private val lock = ReentrantReadWriteLock()

    /**
     * Retrieves a value from cache or computes it if absent/expired.
     *
     * This method:
     * 1. Checks cache for existing valid entry
     * 2. Returns cached value if found and not expired
     * 3. Computes new value using supplier if cache miss or expired
     * 4. Stores newly computed value with TTL
     *
     * ## Thread Safety:
     * Uses optimistic read-lock check followed by write-lock for computation.
     * This minimizes lock contention for cache hits.
     *
     * ## TTL Behavior:
     * Expired entries are treated as cache misses and recomputed.
     * Uses custom TTL if provided, otherwise falls back to defaultTTL.
     *
     * @param key Cache key (supports hierarchical naming like "project:123:hierarchy")
     * @param ttl Optional custom TTL for this entry (null uses defaultTTL)
     * @param valueSupplier Function to compute value on cache miss
     * @return Cached or newly computed value
     */
    suspend fun <T> getOrPut(
        key: String,
        ttl: Duration? = null,
        valueSupplier: suspend () -> T
    ): T {
        val now = timeProvider.now()

        // Fast path: check if value exists and is valid (read lock)
        lock.read {
            @Suppress("UNCHECKED_CAST")
            val entry = cache[key] as? CacheEntry<T>
            if (entry != null && !entry.isExpired(now)) {
                return entry.value
            }
        }

        // Slow path: compute and store new value (write lock)
        return lock.write {
            // Double-check after acquiring write lock (another thread may have computed it)
            @Suppress("UNCHECKED_CAST")
            val entry = cache[key] as? CacheEntry<T>
            if (entry != null && !entry.isExpired(now)) {
                return@write entry.value
            }

            // Compute new value and store with TTL
            val value = valueSupplier()
            val effectiveTTL = ttl ?: defaultTTL
            val expiresAt = now + effectiveTTL

            cache[key] = CacheEntry(value, expiresAt)
            value
        }
    }

    /**
     * Invalidates a specific cache entry by key.
     *
     * Removes the entry from cache if it exists. This is a no-op if the key
     * is not present.
     *
     * ## Thread Safety:
     * Uses write lock for exclusive access during removal.
     *
     * @param key The cache key to invalidate
     */
    fun invalidate(key: String) {
        lock.write {
            cache.remove(key)
        }
    }

    /**
     * Invalidates all cache entries matching a wildcard pattern.
     *
     * Supports simple glob-style patterns with asterisk (*) as wildcard:
     * - `"project:*"` - Matches all keys starting with "project:"
     * - `"*:subtasks"` - Matches all keys ending with ":subtasks"
     * - `"story:*:subtasks"` - Matches keys like "story:123:subtasks", "story:456:subtasks"
     *
     * ## Performance:
     * Scans all cache keys to find matches. For large caches with frequent
     * pattern invalidation, consider more specific key invalidation.
     *
     * ## Thread Safety:
     * Uses write lock for exclusive access during bulk removal.
     *
     * @param pattern Glob-style pattern with asterisk wildcards
     */
    fun invalidatePattern(pattern: String) {
        val regex = patternToRegex(pattern)

        lock.write {
            val keysToRemove = cache.keys.filter { key ->
                regex.matches(key)
            }
            keysToRemove.forEach { key ->
                cache.remove(key)
            }
        }
    }

    /**
     * Clears all entries from the cache.
     *
     * This is a complete cache reset, removing all entries regardless of
     * expiration status.
     *
     * ## Thread Safety:
     * Uses write lock for exclusive access during clear operation.
     */
    fun clear() {
        lock.write {
            cache.clear()
        }
    }

    /**
     * Returns the current number of entries in the cache.
     *
     * Note: This count includes expired entries that haven't been evicted yet.
     * Expired entries are removed lazily on access.
     *
     * ## Thread Safety:
     * Uses read lock for safe concurrent access.
     *
     * @return Number of entries currently in cache
     */
    fun size(): Int {
        return lock.read {
            cache.size
        }
    }

    /**
     * Checks if a key exists in the cache (ignoring expiration).
     *
     * This method only checks for key presence, not validity.
     * Use `getOrPut` for expiration-aware access.
     *
     * ## Thread Safety:
     * Uses read lock for safe concurrent access.
     *
     * @param key The cache key to check
     * @return true if key exists in cache, false otherwise
     */
    fun containsKey(key: String): Boolean {
        return lock.read {
            cache.containsKey(key)
        }
    }

    /**
     * Converts a glob-style pattern to a Kotlin Regex.
     *
     * Transformation rules:
     * - Escapes regex special characters (., +, ?, etc.)
     * - Converts `*` to `.*` (match any characters)
     * - Anchors pattern with `^` and `$` for exact matching
     *
     * Examples:
     * - `"project:*"` → `^project:.*$`
     * - `"*:subtasks"` → `^.*:subtasks$`
     * - `"story:*:sub*"` → `^story:.*:sub.*$`
     *
     * @param pattern Glob-style pattern with asterisk wildcards
     * @return Compiled regex for pattern matching
     */
    private fun patternToRegex(pattern: String): Regex {
        val regexPattern = pattern
            .replace(".", "\\.")      // Escape dots
            .replace("+", "\\+")      // Escape plus
            .replace("?", "\\?")      // Escape question mark
            .replace("(", "\\(")      // Escape opening paren
            .replace(")", "\\)")      // Escape closing paren
            .replace("[", "\\[")      // Escape opening bracket
            .replace("]", "\\]")      // Escape closing bracket
            .replace("{", "\\{")      // Escape opening brace
            .replace("}", "\\}")      // Escape closing brace
            .replace("*", ".*")       // Convert wildcard to regex
        return Regex("^$regexPattern$")
    }
}
