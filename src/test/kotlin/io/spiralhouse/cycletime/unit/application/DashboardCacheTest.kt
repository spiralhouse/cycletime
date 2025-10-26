package io.spiralhouse.cycletime.unit.application

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.application.services.DashboardCache
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

/**
 * Unit tests for DashboardCache.
 *
 * Tests cover:
 * - Basic cache operations (get, put, invalidate)
 * - LRU eviction behavior
 * - TTL expiration
 * - Pattern-based invalidation
 * - Thread safety (basic verification)
 */
class DashboardCacheTest : StringSpec({

    "should cache and retrieve values" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        // First access should compute value
        var computeCount = 0
        val value1 = cache.getOrPut("key1") {
            computeCount++
            "value1"
        }

        value1 shouldBe "value1"
        computeCount shouldBe 1

        // Second access should use cached value
        val value2 = cache.getOrPut("key1") {
            computeCount++
            "value1-recomputed"
        }

        value2 shouldBe "value1"
        computeCount shouldBe 1 // Should not recompute
    }

    "should expire entries based on TTL" {
        val timeProvider = MockTimeProvider()
        timeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        // Store value with 5-minute TTL
        var computeCount = 0
        cache.getOrPut("key1") {
            computeCount++
            "value1"
        }

        computeCount shouldBe 1

        // Advance time by 4 minutes (should still be valid)
        timeProvider.advance(4.minutes)
        cache.getOrPut("key1") {
            computeCount++
            "value1-expired"
        }

        computeCount shouldBe 1 // Should use cached value

        // Advance time by 2 more minutes (total 6 minutes, should expire)
        timeProvider.advance(2.minutes)
        val value = cache.getOrPut("key1") {
            computeCount++
            "value1-recomputed"
        }

        value shouldBe "value1-recomputed"
        computeCount shouldBe 2 // Should recompute
    }

    "should support custom TTL per entry" {
        val timeProvider = MockTimeProvider()
        timeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        // Store value with custom 1-minute TTL
        var computeCount = 0
        cache.getOrPut("key1", ttl = 1.minutes) {
            computeCount++
            "value1"
        }

        // Advance time by 2 minutes (should expire with 1-minute TTL)
        timeProvider.advance(2.minutes)
        val value = cache.getOrPut("key1", ttl = 1.minutes) {
            computeCount++
            "value1-recomputed"
        }

        value shouldBe "value1-recomputed"
        computeCount shouldBe 2
    }

    "should evict least recently used entries when size limit exceeded" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 3, // Small cache for testing
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        // Fill cache to capacity
        cache.getOrPut("key1") { "value1" }
        cache.getOrPut("key2") { "value2" }
        cache.getOrPut("key3") { "value3" }

        cache.size() shouldBe 3

        // Access key1 to make it recently used
        cache.getOrPut("key1") { "value1" }

        // Add key4, which should evict key2 (least recently used)
        cache.getOrPut("key4") { "value4" }

        cache.size() shouldBe 3
        cache.containsKey("key1") shouldBe true
        cache.containsKey("key2") shouldBe false // Evicted
        cache.containsKey("key3") shouldBe true
        cache.containsKey("key4") shouldBe true
    }

    "should invalidate specific keys" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        cache.getOrPut("key1") { "value1" }
        cache.getOrPut("key2") { "value2" }

        cache.containsKey("key1") shouldBe true
        cache.containsKey("key2") shouldBe true

        // Invalidate key1
        cache.invalidate("key1")

        cache.containsKey("key1") shouldBe false
        cache.containsKey("key2") shouldBe true

        // Recompute key1
        var computeCount = 0
        cache.getOrPut("key1") {
            computeCount++
            "value1-new"
        }

        computeCount shouldBe 1
    }

    "should invalidate entries matching wildcard pattern" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        // Store entries with hierarchical keys
        cache.getOrPut("project:123:hierarchy") { "data1" }
        cache.getOrPut("project:456:hierarchy") { "data2" }
        cache.getOrPut("story:789:subtasks") { "data3" }
        cache.getOrPut("story:101:subtasks") { "data4" }
        cache.getOrPut("other:key") { "data5" }

        // Invalidate all project hierarchies
        cache.invalidatePattern("project:*:hierarchy")

        cache.containsKey("project:123:hierarchy") shouldBe false
        cache.containsKey("project:456:hierarchy") shouldBe false
        cache.containsKey("story:789:subtasks") shouldBe true
        cache.containsKey("story:101:subtasks") shouldBe true
        cache.containsKey("other:key") shouldBe true

        // Invalidate all story subtasks
        cache.invalidatePattern("story:*:subtasks")

        cache.containsKey("story:789:subtasks") shouldBe false
        cache.containsKey("story:101:subtasks") shouldBe false
        cache.containsKey("other:key") shouldBe true
    }

    "should invalidate with prefix wildcard pattern" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        cache.getOrPut("project:123:data") { "data1" }
        cache.getOrPut("story:456:data") { "data2" }
        cache.getOrPut("anything:789:data") { "data3" }

        // Invalidate all keys ending with ":data"
        cache.invalidatePattern("*:data")

        cache.size() shouldBe 0
    }

    "should clear all entries" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        cache.getOrPut("key1") { "value1" }
        cache.getOrPut("key2") { "value2" }
        cache.getOrPut("key3") { "value3" }

        cache.size() shouldBe 3

        cache.clear()

        cache.size() shouldBe 0
        cache.containsKey("key1") shouldBe false
        cache.containsKey("key2") shouldBe false
        cache.containsKey("key3") shouldBe false
    }

    "should handle concurrent access safely" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        // Simulate concurrent reads and writes
        val threads = (1..10).map { threadId ->
            Thread {
                kotlinx.coroutines.runBlocking {
                    repeat(100) { iteration ->
                        val key = "key${iteration % 10}"
                        cache.getOrPut(key) {
                            "value-$threadId-$iteration"
                        }
                    }
                }
            }
        }

        threads.forEach { it.start() }
        threads.forEach { it.join() }

        // Cache should have 10 entries (key0..key9)
        // and no exceptions should have been thrown
        cache.size() shouldBe 10
    }

    "should handle null values correctly" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        // Store null value
        val value1 = cache.getOrPut("nullable-key") {
            null
        }

        value1 shouldBe null

        // Retrieve cached null
        var computeCount = 0
        val value2 = cache.getOrPut("nullable-key") {
            computeCount++
            "not-null"
        }

        value2 shouldBe null
        computeCount shouldBe 0 // Should use cached null
    }

    "should not cache exceptions" {
        val timeProvider = MockTimeProvider()
        val cache = DashboardCache(
            maxSize = 100,
            defaultTTL = 5.minutes,
            timeProvider = timeProvider
        )

        // First attempt throws exception
        var attempts = 0
        try {
            cache.getOrPut("error-key") {
                attempts++
                throw RuntimeException("Compute failed")
            }
        } catch (e: RuntimeException) {
            e.message shouldBe "Compute failed"
        }

        attempts shouldBe 1

        // Second attempt should retry (exception should not be cached)
        try {
            cache.getOrPut("error-key") {
                attempts++
                throw RuntimeException("Compute failed again")
            }
        } catch (e: RuntimeException) {
            e.message shouldBe "Compute failed again"
        }

        attempts shouldBe 2
    }
})
