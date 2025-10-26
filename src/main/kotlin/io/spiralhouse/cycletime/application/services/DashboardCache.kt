package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.domain.services.TimeProvider
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.datetime.Instant
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

/**
 * Coroutine-safe LRU cache with TTL support for dashboard data.
 *
 * This cache provides:
 * - **LRU Eviction**: Removes least recently used entries when size limit exceeded
 * - **TTL Expiration**: Entries expire after configured time-to-live
 * - **Pattern Invalidation**: Wildcard-based cache key invalidation
 * - **Coroutine Safety**: Safe for concurrent access using coroutine Mutex
 *
 * ## Design Principles:
 * - **Testability**: Uses injected TimeProvider for deterministic testing
 * - **Coroutine-Aware**: Uses Mutex from kotlinx.coroutines.sync for proper suspend function support
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
 * // Get or compute value (suspend)
 * val data = cache.getOrPut("project:123") {
 *     loadProjectData(projectId)
 * }
 *
 * // Invalidate specific key (suspend)
 * cache.invalidate("project:123")
 *
 * // Invalidate by pattern (suspend)
 * cache.invalidatePattern("story:*:subtasks")
 * ```
 *
 * ## Coroutine Safety:
 * All public methods are coroutine-safe. Uses Mutex to ensure proper synchronization
 * when coroutines suspend and resume, potentially on different threads.
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
     * Represents the result of a cache lookup to distinguish between
     * "not found" and "found with null value".
     */
    private sealed class CacheLookup<out T> {
        data class Found<T>(val value: T) : CacheLookup<T>()
        object NotFound : CacheLookup<Nothing>()
    }

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
     * Mutex for coroutine-safe cache access.
     * Ensures proper synchronization when coroutines suspend and resume.
     */
    private val mutex = Mutex()

    /**
     * Retrieves a value from cache or computes it if absent/expired.
     *
     * This method:
     * 1. Checks cache for existing valid entry
     * 2. Returns cached value if found and not expired (including null values)
     * 3. Computes new value using supplier if cache miss or expired
     * 4. Stores newly computed value with TTL
     *
     * ## Coroutine Safety:
     * Uses Mutex.withLock to ensure proper synchronization when coroutines
     * suspend and resume. The lock is released during valueSupplier execution
     * to allow other operations, then reacquired to store the result.
     *
     * ## Null Value Handling:
     * Uses a CacheLookup wrapper to distinguish between "not found" and
     * "found with null value", ensuring null values are properly cached.
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

        // Check if value exists and is valid under lock
        val lookupResult = mutex.withLock {
            @Suppress("UNCHECKED_CAST")
            val entry = cache[key] as? CacheEntry<T>
            if (entry != null && !entry.isExpired(now)) {
                CacheLookup.Found(entry.value)
            } else {
                CacheLookup.NotFound
            }
        }

        // Handle result based on lookup outcome
        return when (lookupResult) {
            is CacheLookup.Found -> lookupResult.value
            is CacheLookup.NotFound -> {
                // Compute new value outside of lock to allow concurrent operations
                val value = valueSupplier()
                val effectiveTTL = ttl ?: defaultTTL
                val expiresAt = now + effectiveTTL

                // Store computed value under lock with double-check
                mutex.withLock {
                    // Double-check: another coroutine may have cached it while we were computing
                    @Suppress("UNCHECKED_CAST")
                    val existingEntry = cache[key] as? CacheEntry<T>
                    if (existingEntry != null && !existingEntry.isExpired(now)) {
                        existingEntry.value
                    } else {
                        cache[key] = CacheEntry(value, expiresAt)
                        value
                    }
                }
            }
        }
    }

    /**
     * Invalidates a specific cache entry by key.
     *
     * Removes the entry from cache if it exists. This is a no-op if the key
     * is not present.
     *
     * ## Coroutine Safety:
     * Uses Mutex.withLock for exclusive access during removal.
     *
     * @param key The cache key to invalidate
     */
    suspend fun invalidate(key: String) {
        mutex.withLock {
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
     * ## Coroutine Safety:
     * Uses Mutex.withLock for exclusive access during bulk removal.
     *
     * @param pattern Glob-style pattern with asterisk wildcards
     */
    suspend fun invalidatePattern(pattern: String) {
        val regex = patternToRegex(pattern)

        mutex.withLock {
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
     * ## Coroutine Safety:
     * Uses Mutex.withLock for exclusive access during clear operation.
     */
    suspend fun clear() {
        mutex.withLock {
            cache.clear()
        }
    }

    /**
     * Returns the current number of entries in the cache.
     *
     * Note: This count includes expired entries that haven't been evicted yet.
     * Expired entries are removed lazily on access.
     *
     * ## Coroutine Safety:
     * Uses Mutex.withLock for safe concurrent access.
     *
     * @return Number of entries currently in cache
     */
    suspend fun size(): Int {
        return mutex.withLock {
            cache.size
        }
    }

    /**
     * Checks if a key exists in the cache (ignoring expiration).
     *
     * This method only checks for key presence, not validity.
     * Use `getOrPut` for expiration-aware access.
     *
     * ## Coroutine Safety:
     * Uses Mutex.withLock for safe concurrent access.
     *
     * @param key The cache key to check
     * @return true if key exists in cache, false otherwise
     */
    suspend fun containsKey(key: String): Boolean {
        return mutex.withLock {
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
