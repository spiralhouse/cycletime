package io.spiralhouse.cycletime.unit.correlation

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.ints.shouldBeLessThanOrEqual
import io.spiralhouse.cycletime.mcp.correlation.EventBus
import io.spiralhouse.cycletime.mcp.sse.SSEEvent
import kotlinx.coroutines.runBlocking

/**
 * TDD RED Phase: Memory Bound Tests for EventBus
 *
 * ARCHITECTURAL PROBLEM: EventBus.eventStorage grows unbounded as events are added.
 * There is no maximum size limit or eviction policy for old events.
 *
 * EXPECTED FAILURES (RED Phase):
 * - EventBus.eventStorage has no size limit (memory leak)
 * - Old events are never evicted
 * - No maxSize parameter in constructor
 * - No eviction policy when limit is exceeded
 *
 * SOLUTION: EventBus should:
 * - Accept maxEventsPerSession parameter (default 1000)
 * - Evict oldest events when limit exceeded (FIFO/circular buffer)
 * - Prevent unbounded memory growth
 */
class EventBusMemoryBoundTest : StringSpec({

    "EventBus should accept maxEventsPerSession parameter" {
        // EXPECTED FAILURE: No maxEventsPerSession constructor parameter
        val eventBus = EventBus(maxEventsPerSession = 100)

        // Should compile and initialize
        eventBus.hasActiveConnection("test") shouldBe false
    }

    "EventBus should limit events per session to maxEventsPerSession" {
        // EXPECTED FAILURE: eventStorage grows unbounded
        val maxSize = 100
        val eventBus = EventBus(maxEventsPerSession = maxSize)
        val sessionId = "bounded-session"

        // Publish 200 events (2x the limit)
        repeat(200) { index ->
            eventBus.publish(
                sessionId,
                SSEEvent(data = "event-$index", id = index.toString())
            )
        }

        // Should only retain the most recent 100 events
        val events = runBlocking { eventBus.getEvents(sessionId) }
        events.size shouldBe maxSize
    }

    "EventBus should evict oldest events when limit exceeded" {
        // EXPECTED FAILURE: No eviction policy (FIFO) implemented
        val maxSize = 50
        val eventBus = EventBus(maxEventsPerSession = maxSize)
        val sessionId = "eviction-test"

        // Publish 100 events
        repeat(100) { index ->
            eventBus.publish(
                sessionId,
                SSEEvent(data = "event-$index", id = index.toString())
            )
        }

        val events = runBlocking { eventBus.getEvents(sessionId) }

        // Should have exactly maxSize events
        events.size shouldBe maxSize

        // Oldest events (0-49) should be evicted, keeping (50-99)
        events.first().data shouldBe "event-50"
        events.last().data shouldBe "event-99"
    }

    "EventBus should maintain separate limits per session" {
        // EXPECTED FAILURE: Limit not enforced per-session
        val maxSize = 10
        val eventBus = EventBus(maxEventsPerSession = maxSize)

        // Session 1: publish 20 events
        repeat(20) { index ->
            eventBus.publish("session-1", SSEEvent(data = "s1-event-$index", id = "s1-$index"))
        }

        // Session 2: publish 15 events
        repeat(15) { index ->
            eventBus.publish("session-2", SSEEvent(data = "s2-event-$index", id = "s2-$index"))
        }

        // Each session should have exactly maxSize events
        runBlocking { eventBus.getEvents("session-1") }.size shouldBe maxSize
        runBlocking { eventBus.getEvents("session-2") }.size shouldBe maxSize

        // Verify correct events retained for session-1 (10-19)
        val s1Events = runBlocking { eventBus.getEvents("session-1") }
        s1Events.first().data shouldBe "s1-event-10"
        s1Events.last().data shouldBe "s1-event-19"

        // Verify correct events retained for session-2 (5-14)
        val s2Events = runBlocking { eventBus.getEvents("session-2") }
        s2Events.first().data shouldBe "s2-event-5"
        s2Events.last().data shouldBe "s2-event-14"
    }

    "EventBus should use default maxEventsPerSession of 1000" {
        // EXPECTED FAILURE: No default value for maxEventsPerSession
        val eventBus = EventBus() // No parameter = should default to 1000
        val sessionId = "default-test"

        // Publish 1500 events (more than default limit)
        repeat(1500) { index ->
            eventBus.publish(
                sessionId,
                SSEEvent(data = "event-$index", id = index.toString())
            )
        }

        // Should retain exactly 1000 events
        val events = runBlocking { eventBus.getEvents(sessionId) }
        events.size shouldBe 1000

        // Should be the most recent 1000 (500-1499)
        events.first().data shouldBe "event-500"
        events.last().data shouldBe "event-1499"
    }

    "EventBus should prevent memory leak with continuous publishing" {
        // EXPECTED FAILURE: Memory grows unbounded
        val maxSize = 50
        val eventBus = EventBus(maxEventsPerSession = maxSize)
        val sessionId = "leak-test"

        // Simulate continuous event publishing over time
        repeat(10) { batch ->
            repeat(100) { index ->
                val eventIndex = batch * 100 + index
                eventBus.publish(
                    sessionId,
                    SSEEvent(data = "event-$eventIndex", id = eventIndex.toString())
                )
            }

            // After each batch, verify size is bounded
            val events = runBlocking { eventBus.getEvents(sessionId) }
            events.size shouldBeLessThanOrEqual maxSize
        }

        // After 1000 total events, should still only have maxSize
        runBlocking { eventBus.getEvents(sessionId) }.size shouldBe maxSize
    }

    "EventBus should handle rapid concurrent publishing within limits" {
        // EXPECTED FAILURE: Concurrent access without proper synchronization or bounds
        val maxSize = 100
        val eventBus = EventBus(maxEventsPerSession = maxSize)
        val sessionId = "concurrent-bounded-test"

        // Publish many events rapidly
        repeat(500) { index ->
            eventBus.publish(
                sessionId,
                SSEEvent(data = "event-$index", id = index.toString())
            )
        }

        // Should respect size limit
        val events = runBlocking { eventBus.getEvents(sessionId) }
        events.size shouldBe maxSize
    }

    "EventBus unsubscribe should clear bounded event storage" {
        // EXPECTED FAILURE: unsubscribe doesn't clear eventStorage or uses wrong key
        val maxSize = 50
        val eventBus = EventBus(maxEventsPerSession = maxSize)
        val sessionId = "unsubscribe-clear-test"

        // Publish events up to limit
        repeat(75) { index ->
            eventBus.publish(
                sessionId,
                SSEEvent(data = "event-$index", id = index.toString())
            )
        }

        runBlocking { eventBus.getEvents(sessionId) }.size shouldBe maxSize

        // Unsubscribe should clear storage
        runBlocking {
            eventBus.unsubscribe(sessionId)
        }

        // getEvents should return empty list after unsubscribe
        runBlocking { eventBus.getEvents(sessionId) }.size shouldBe 0
    }

    "EventBus should handle maxEventsPerSession of 1" {
        // EXPECTED FAILURE: Edge case not handled correctly
        val eventBus = EventBus(maxEventsPerSession = 1)
        val sessionId = "single-event-test"

        // Publish 5 events
        repeat(5) { index ->
            eventBus.publish(
                sessionId,
                SSEEvent(data = "event-$index", id = index.toString())
            )
        }

        // Should only retain the most recent event
        val events = runBlocking { eventBus.getEvents(sessionId) }
        events.size shouldBe 1
        events.first().data shouldBe "event-4"
    }

    "EventBus should handle very large maxEventsPerSession" {
        // EXPECTED FAILURE: Large limits cause performance issues or aren't respected
        val maxSize = 10_000
        val eventBus = EventBus(maxEventsPerSession = maxSize)
        val sessionId = "large-limit-test"

        // Publish 15,000 events
        repeat(15_000) { index ->
            eventBus.publish(
                sessionId,
                SSEEvent(data = "event-$index", id = index.toString())
            )
        }

        // Should retain exactly maxSize events
        val events = runBlocking { eventBus.getEvents(sessionId) }
        events.size shouldBe maxSize

        // Should be events 5000-14999
        events.first().data shouldBe "event-5000"
        events.last().data shouldBe "event-14999"
    }

    "EventBus publish should be efficient with bounded storage" {
        // EXPECTED FAILURE: Publish becomes slow as events accumulate
        val maxSize = 100
        val eventBus = EventBus(maxEventsPerSession = maxSize)
        val sessionId = "performance-test"

        // Publish 10,000 events - should maintain constant-time performance
        val startTime = System.nanoTime()

        repeat(10_000) { index ->
            eventBus.publish(
                sessionId,
                SSEEvent(data = "event-$index", id = index.toString())
            )
        }

        val endTime = System.nanoTime()
        val durationMs = (endTime - startTime) / 1_000_000

        // Should complete in reasonable time (< 500ms for 10k events)
        // This verifies O(1) publish performance with circular buffer
        durationMs.toInt() shouldBeLessThanOrEqual 500

        // Size should be bounded
        runBlocking { eventBus.getEvents(sessionId) }.size shouldBe maxSize
    }
})
