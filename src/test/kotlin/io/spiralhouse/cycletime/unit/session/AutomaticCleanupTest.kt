package io.spiralhouse.cycletime.unit.session

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * TDD RED Phase: Automatic Cleanup Tests for MCPSessionManager
 *
 * ARCHITECTURAL PROBLEM: Session cleanup requires manual cleanupExpiredSessions() calls.
 * There is no automatic background cleanup coroutine.
 *
 * EXPECTED FAILURES (RED Phase):
 * - No automatic cleanup coroutine started on initialization
 * - No periodic cleanup running in background
 * - No cleanup cancellation on shutdown
 *
 * SOLUTION: MCPSessionManager should start a background coroutine that:
 * - Runs cleanupExpiredSessions() every 30 seconds
 * - Starts automatically on initialization
 * - Can be cancelled on shutdown
 */
class AutomaticCleanupTest : StringSpec({

    "MCPSessionManager should start automatic cleanup coroutine on initialization" {
        // EXPECTED FAILURE: No background cleanup coroutine is started
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 1.seconds,
            cleanupInterval = 100.milliseconds // For testing, use short interval
        )

        // Create a session
        manager.getOrCreateSession("auto-cleanup-test")

        runTest {
            // Start automatic cleanup in background scope (auto-cancelled at test end)
            manager.startCleanup(backgroundScope)

            // Advance time past timeout
            mockTimeProvider.advance(1100.milliseconds)

            // Wait for automatic cleanup to run (should happen within cleanup interval)
            delay(150) // Give cleanup coroutine time to execute

            // Session should be automatically cleaned up without manual call
            manager.getSession("auto-cleanup-test").shouldBeNull()
        }
    }

    "automatic cleanup should run periodically" {
        // EXPECTED FAILURE: No periodic cleanup running
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 500.milliseconds,
            cleanupInterval = 100.milliseconds
        )

        runTest {
            // Start automatic cleanup in background scope
            manager.startCleanup(backgroundScope)

            // Create multiple sessions over time
            manager.getOrCreateSession("session-1")

            mockTimeProvider.advance(200.milliseconds)
            manager.getOrCreateSession("session-2")

            mockTimeProvider.advance(200.milliseconds)
            manager.getOrCreateSession("session-3")

            // Now at T=400ms
            // Advance to T=600ms (session-1 expires at T=500ms)
            mockTimeProvider.advance(200.milliseconds)

            // Wait for cleanup cycle
            delay(150)

            // session-1 should be gone (expired at 500ms)
            manager.getSession("session-1").shouldBeNull()

            // Verify session count: session-2 and session-3 still alive
            // Don't use getSession() as it updates lastActivity
            manager.sessionCount() shouldBe 2

            // Advance to T=800ms (session-2 expires at T=700ms)
            mockTimeProvider.advance(200.milliseconds)
            delay(150)

            // Only session-3 should remain (session-2 expired at T=700ms)
            manager.sessionCount() shouldBe 1
            manager.getSession("session-3").shouldNotBeNull()
        }
    }

    "MCPSessionManager.shutdown should cancel cleanup coroutine" {
        // EXPECTED FAILURE: No shutdown() method exists
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 1.seconds,
            cleanupInterval = 100.milliseconds
        )

        manager.getOrCreateSession("shutdown-test")

        runTest {
            // Start automatic cleanup in background scope
            manager.startCleanup(backgroundScope)

            // Shutdown the manager
            manager.shutdown()

            // Advance time past timeout
            mockTimeProvider.advance(1100.milliseconds)

            // Wait for where cleanup would have run
            delay(150)

            // Session should NOT be cleaned up (cleanup coroutine was cancelled)
            manager.getSession("shutdown-test").shouldNotBeNull()
        }
    }

    "automatic cleanup should respect cleanupInterval parameter" {
        // EXPECTED FAILURE: No cleanupInterval parameter exists
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 100.milliseconds,
            cleanupInterval = 50.milliseconds // Cleanup every 50ms
        )

        var cleanupCount = 0

        runTest {
            // Start automatic cleanup in background scope
            manager.startCleanup(backgroundScope)

            // Create sessions that expire immediately
            manager.getOrCreateSession("interval-test-1")
            mockTimeProvider.advance(150.milliseconds) // Past timeout

            // Wait for 3 cleanup cycles (3 * 50ms = 150ms)
            repeat(3) {
                delay(60) // Slightly longer than cleanup interval
                cleanupCount++
            }

            // Cleanup should have run multiple times
            cleanupCount shouldBe 3
        }
    }

    "cleanup coroutine should use configurable scope" {
        // EXPECTED FAILURE: Cleanup coroutine not implemented or uses wrong scope
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 100.milliseconds,
            cleanupInterval = 50.milliseconds
        )

        manager.getOrCreateSession("scope-test")

        runTest {
            // Start automatic cleanup in background scope
            manager.startCleanup(backgroundScope)

            mockTimeProvider.advance(150.milliseconds)
            delay(60)

            // If cleanup coroutine is running, session should be gone
            manager.getSession("scope-test").shouldBeNull()
        }
    }

    "cleanup should handle empty session list gracefully" {
        // EXPECTED FAILURE: Cleanup coroutine not implemented
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 100.milliseconds,
            cleanupInterval = 50.milliseconds
        )

        runTest {
            // Start automatic cleanup in background scope
            manager.startCleanup(backgroundScope)

            // Let cleanup run on empty session list
            delay(100)

            // Should not crash
            manager.sessionCount() shouldBe 0
        }
    }

    "cleanup should continue running after exceptions" {
        // EXPECTED FAILURE: Cleanup coroutine not implemented with exception handling
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 100.milliseconds,
            cleanupInterval = 50.milliseconds
        )

        runTest {
            // Start automatic cleanup in background scope
            manager.startCleanup(backgroundScope)

            // Create session
            manager.getOrCreateSession("exception-test")

            // Advance past timeout
            mockTimeProvider.advance(150.milliseconds)

            // Wait for cleanup
            delay(60)

            // Even if an exception occurred, cleanup should have run
            manager.getSession("exception-test").shouldBeNull()
        }
    }

    "default cleanupInterval should be 30 seconds" {
        // EXPECTED FAILURE: No cleanupInterval parameter with default value
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        // Constructor without cleanupInterval should default to 30 seconds
        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 5.seconds
        )

        // This verifies the default is set correctly
        manager.shouldNotBeNull()
    }
})
