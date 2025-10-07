package io.spiralhouse.cycletime.unit.correlation

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.nulls.shouldNotBeNull
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.mcp.correlation.MessageCorrelator
import kotlinx.datetime.Instant
import kotlinx.serialization.json.JsonPrimitive
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * TDD RED Phase: TimeProvider Architecture Tests for MessageCorrelator
 *
 * ARCHITECTURAL REQUIREMENT: All time-dependent code must use TimeProvider abstraction
 * with kotlinx.datetime.Instant (not java.time.Instant).
 *
 * EXPECTED FAILURES (RED Phase):
 * - MessageCorrelator doesn't accept TimeProvider parameter
 * - PendingRequest.timestamp uses java.time.Instant instead of kotlinx.datetime.Instant
 * - Direct calls to Instant.now() instead of timeProvider.now()
 * - Timeout uses Long milliseconds instead of kotlin.time.Duration
 *
 * These tests enforce testability by requiring MockTimeProvider for deterministic tests.
 */
class MessageCorrelatorArchitectureTest : StringSpec({

    "MessageCorrelator should accept TimeProvider in constructor" {
        // EXPECTED FAILURE: MessageCorrelator constructor doesn't accept TimeProvider
        val mockTimeProvider = MockTimeProvider()

        // This should compile and work
        val correlator = MessageCorrelator(timeProvider = mockTimeProvider)

        correlator.shouldNotBeNull()
    }

    "MessageCorrelator should use TimeProvider.now() for pending request timestamps" {
        // EXPECTED FAILURE: registerPendingRequest uses Instant.now() directly
        val mockTimeProvider = MockTimeProvider()
        val fixedTime = Instant.parse("2024-01-01T10:00:00Z")
        mockTimeProvider.setTime(fixedTime)

        val correlator = MessageCorrelator(timeProvider = mockTimeProvider)

        correlator.registerPendingRequest(
            sessionId = "time-test",
            requestId = JsonPrimitive(1),
            method = "test"
        )

        // Verify timestamp uses mocked time (would need internal access or indirect verification)
        correlator.getPendingCount("time-test") shouldBe 1
    }

    "stale request cleanup should use TimeProvider for testable time" {
        // EXPECTED FAILURE: cleanupStaleRequests uses Instant.now() or java.time.Instant
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val correlator = MessageCorrelator(
            timeProvider = mockTimeProvider,
            requestTimeout = 1.seconds // kotlin.time.Duration
        )

        correlator.registerPendingRequest(
            sessionId = "stale-test",
            requestId = JsonPrimitive(1),
            method = "slow_method"
        )

        correlator.getPendingCount("stale-test") shouldBe 1

        // Advance time past timeout (no Thread.sleep needed)
        mockTimeProvider.advance(1100.milliseconds)

        correlator.cleanupStaleRequests()

        // Request should be cleaned up
        correlator.getPendingCount("stale-test") shouldBe 0
    }

    "request timeout should use kotlin.time.Duration not Long milliseconds" {
        // EXPECTED FAILURE: Timeout parameter is Long instead of kotlin.time.Duration
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        // Constructor should accept kotlin.time.Duration
        val correlator = MessageCorrelator(
            timeProvider = mockTimeProvider,
            requestTimeout = 30.seconds // kotlin.time.Duration
        )

        correlator.registerPendingRequest(
            sessionId = "timeout-test",
            requestId = JsonPrimitive(1),
            method = "test"
        )

        // 29 seconds - should not timeout
        mockTimeProvider.advance(29.seconds)
        correlator.cleanupStaleRequests()
        correlator.getPendingCount("timeout-test") shouldBe 1

        // 31 seconds total - should timeout
        mockTimeProvider.advance(2.seconds)
        correlator.cleanupStaleRequests()
        correlator.getPendingCount("timeout-test") shouldBe 0
    }

    "cleanup should not require Thread.sleep for testing" {
        // EXPECTED FAILURE: Tests are using Thread.sleep() which is slow and flaky
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val correlator = MessageCorrelator(
            timeProvider = mockTimeProvider,
            requestTimeout = 100.milliseconds
        )

        correlator.registerPendingRequest(
            sessionId = "fast-test",
            requestId = JsonPrimitive(1),
            method = "test"
        )

        // Advance time instantly (no Thread.sleep needed)
        mockTimeProvider.advance(150.milliseconds)

        correlator.cleanupStaleRequests()

        // Test completes instantly, no flakiness
        correlator.getPendingCount("fast-test") shouldBe 0
    }

    "PendingRequest should use kotlinx.datetime.Instant not java.time.Instant" {
        // EXPECTED FAILURE: PendingRequest.timestamp uses java.time.Instant
        val mockTimeProvider = MockTimeProvider()
        val startTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(startTime)

        val correlator = MessageCorrelator(
            timeProvider = mockTimeProvider,
            requestTimeout = 5.seconds
        )

        // Register at T=0
        correlator.registerPendingRequest(
            sessionId = "type-test",
            requestId = JsonPrimitive(1),
            method = "test"
        )

        // Advance to T=4s (within timeout)
        mockTimeProvider.advance(4.seconds)
        correlator.cleanupStaleRequests()
        correlator.getPendingCount("type-test") shouldBe 1

        // Advance to T=6s (past timeout)
        mockTimeProvider.advance(2.seconds)
        correlator.cleanupStaleRequests()
        correlator.getPendingCount("type-test") shouldBe 0
    }

    "multiple pending requests should have accurate timestamps" {
        // EXPECTED FAILURE: Timestamp tracking uses wrong time type
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val correlator = MessageCorrelator(
            timeProvider = mockTimeProvider,
            requestTimeout = 10.seconds
        )

        // Register 3 requests at different times
        correlator.registerPendingRequest("session", JsonPrimitive(1), "method1")

        mockTimeProvider.advance(3.seconds)
        correlator.registerPendingRequest("session", JsonPrimitive(2), "method2")

        mockTimeProvider.advance(3.seconds)
        correlator.registerPendingRequest("session", JsonPrimitive(3), "method3")

        correlator.getPendingCount("session") shouldBe 3

        // Advance to T=11s (first request times out, others remain)
        mockTimeProvider.advance(5.seconds)
        correlator.cleanupStaleRequests()

        correlator.getPendingCount("session") shouldBe 2

        // Advance to T=14s (second request times out)
        mockTimeProvider.advance(3.seconds)
        correlator.cleanupStaleRequests()

        correlator.getPendingCount("session") shouldBe 1

        // Advance to T=17s (third request times out)
        mockTimeProvider.advance(3.seconds)
        correlator.cleanupStaleRequests()

        correlator.getPendingCount("session") shouldBe 0
    }
})
