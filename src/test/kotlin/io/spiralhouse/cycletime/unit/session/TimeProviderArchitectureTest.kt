package io.spiralhouse.cycletime.unit.session

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.nulls.shouldNotBeNull
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * TDD RED Phase: TimeProvider Architecture Tests for MCPSessionManager
 *
 * ARCHITECTURAL REQUIREMENT: All time-dependent code must use TimeProvider abstraction
 * with kotlinx.datetime.Instant (not java.time.Instant).
 *
 * EXPECTED FAILURES (RED Phase):
 * - MCPSessionManager doesn't accept TimeProvider parameter
 * - MCPSessionManager uses java.time.Instant instead of kotlinx.datetime.Instant
 * - MCPSession.lastActivity uses java.time.Instant instead of kotlinx.datetime.Instant
 * - Direct calls to Instant.now() instead of timeProvider.now()
 *
 * These tests enforce testability by requiring MockTimeProvider for deterministic tests.
 */
class TimeProviderArchitectureTest : StringSpec({

    "MCPSessionManager should accept TimeProvider in constructor" {
        // EXPECTED FAILURE: MCPSessionManager constructor doesn't accept TimeProvider
        val mockTimeProvider = MockTimeProvider()

        // This should compile and work
        val manager = MCPSessionManager(timeProvider = mockTimeProvider)

        manager.shouldNotBeNull()
    }

    "MCPSessionManager should use kotlinx.datetime.Instant for timestamps" {
        // EXPECTED FAILURE: MCPSession uses java.time.Instant instead of kotlinx.datetime.Instant
        val mockTimeProvider = MockTimeProvider()
        val startTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(startTime)

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        val session = manager.getOrCreateSession("test-session")

        // Session timestamps should use kotlinx.datetime.Instant
        session.createdAt shouldBe startTime
        session.lastActivity shouldBe startTime
    }

    "MCPSessionManager should use TimeProvider.now() not Instant.now()" {
        // EXPECTED FAILURE: Code calls Instant.now() directly instead of timeProvider.now()
        val mockTimeProvider = MockTimeProvider()
        val fixedTime = Instant.parse("2024-01-01T10:00:00Z")
        mockTimeProvider.setTime(fixedTime)

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        val session = manager.getOrCreateSession("time-test")

        // Should use mocked time, not real time
        session.createdAt shouldBe fixedTime
        session.lastActivity shouldBe fixedTime
    }

    "session expiration should use TimeProvider for testable time" {
        // EXPECTED FAILURE: Expiration calculation uses java.time.Instant or Instant.now()
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 1000.milliseconds // 1 second timeout
        )

        val session = manager.getOrCreateSession("expire-test")
        session.shouldNotBeNull()

        // Advance time by 1.1 seconds (past timeout)
        mockTimeProvider.advance(1100.milliseconds)

        manager.cleanupExpiredSessions()

        // Session should be expired and removed
        manager.getSession("expire-test") shouldBe null
    }

    "session activity update should use TimeProvider" {
        // EXPECTED FAILURE: updateActivity() calls Instant.now() directly
        val mockTimeProvider = MockTimeProvider()
        val startTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(startTime)

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        val session = manager.getOrCreateSession("activity-test")

        session.lastActivity shouldBe startTime

        // Advance time and update activity
        mockTimeProvider.advance(5.seconds)
        manager.updateActivity("activity-test")

        val updatedSession = manager.getSession("activity-test")
        updatedSession?.lastActivity shouldBe startTime + 5.seconds
    }

    "getOrCreateSession should update lastActivity using TimeProvider" {
        // EXPECTED FAILURE: getOrCreateSession uses Instant.now() instead of timeProvider.now()
        val mockTimeProvider = MockTimeProvider()
        val startTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(startTime)

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        val session1 = manager.getOrCreateSession("reuse-test")

        session1.lastActivity shouldBe startTime

        // Advance time and retrieve same session
        mockTimeProvider.advance(3.seconds)
        val session2 = manager.getOrCreateSession("reuse-test")

        // lastActivity should be updated to new time
        session2.lastActivity shouldBe startTime + 3.seconds
    }

    "getSession should update lastActivity using TimeProvider" {
        // EXPECTED FAILURE: getSession uses Instant.now() instead of timeProvider.now()
        val mockTimeProvider = MockTimeProvider()
        val startTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(startTime)

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        manager.getOrCreateSession("get-test")

        // Advance time and get session
        mockTimeProvider.advance(2.seconds)
        val session = manager.getSession("get-test")

        session?.lastActivity shouldBe startTime + 2.seconds
    }

    "cleanup should not use Thread.sleep for testing" {
        // EXPECTED FAILURE: Tests are using Thread.sleep() which is slow and flaky
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 100.milliseconds // 100ms timeout
        )

        manager.getOrCreateSession("cleanup-test")

        // Advance time instantly (no Thread.sleep needed)
        mockTimeProvider.advance(150.milliseconds)

        manager.cleanupExpiredSessions()

        // Test completes instantly, no flakiness
        manager.getSession("cleanup-test") shouldBe null
    }

    "session timeout calculation should use kotlin.time.Duration" {
        // EXPECTED FAILURE: Timeout uses Long milliseconds instead of kotlin.time.Duration
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        // Constructor should accept kotlin.time.Duration, not Long
        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 5.seconds // kotlin.time.Duration
        )

        manager.getOrCreateSession("duration-test")

        // 4 seconds - should not expire
        mockTimeProvider.advance(4.seconds)
        manager.cleanupExpiredSessions()
        // Don't call getSession() here as it updates lastActivity timestamp
        // Instead verify the session count
        manager.sessionCount() shouldBe 1

        // 6 seconds total - should expire
        mockTimeProvider.advance(2.seconds)
        manager.cleanupExpiredSessions()
        manager.getSession("duration-test") shouldBe null
    }
})
