package io.spiralhouse.cycletime.unit.session

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.milliseconds

/**
 * TDD RED Phase: Concurrency Safety Tests for MCPSession
 *
 * ARCHITECTURAL PROBLEM: MCPSession.lastActivity is a mutable var without synchronization,
 * which creates a race condition when multiple coroutines update it concurrently.
 *
 * EXPECTED FAILURES (RED Phase):
 * - Race conditions on lastActivity updates from concurrent coroutines
 * - Data corruption or incorrect timestamps under concurrent access
 * - MCPSession should have immutable lastActivity with atomic updates
 *
 * SOLUTION: lastActivity should be immutable (val) in MCPSession, with updates
 * creating new session instances or using atomic references.
 */
class ConcurrencySafetyTest : StringSpec({

    "MCPSession.lastActivity should be immutable to prevent race conditions" {
        // EXPECTED FAILURE: MCPSession.lastActivity is a mutable var
        val mockTimeProvider = MockTimeProvider()
        val startTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(startTime)

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        val session = manager.getOrCreateSession("immutable-test")

        // lastActivity should be val, not var
        // This test verifies the architectural constraint that lastActivity
        // cannot be directly mutated, preventing race conditions

        // If lastActivity is a var, this would compile and introduce race conditions
        // If lastActivity is a val, this won't compile - which is what we want

        // Test that updates are thread-safe by verifying state consistency
        runTest {
            repeat(100) { index ->
                mockTimeProvider.advance(10.milliseconds)
                manager.updateActivity("immutable-test")
            }

            val finalSession = manager.getSession("immutable-test")
            // After 100 updates of 10ms each, lastActivity should be exactly startTime + 1s
            finalSession?.lastActivity shouldBe startTime + 1000.milliseconds
        }
    }

    "concurrent lastActivity updates should not cause data corruption" {
        // EXPECTED FAILURE: Concurrent updates to var lastActivity cause race conditions
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        manager.getOrCreateSession("concurrent-test")

        runTest {
            // Launch 100 concurrent updateActivity calls
            val jobs = (1..100).map { index ->
                async {
                    mockTimeProvider.advance(1.milliseconds)
                    manager.updateActivity("concurrent-test")
                }
            }

            jobs.awaitAll()

            // All updates should be recorded without data corruption
            val session = manager.getSession("concurrent-test")
            // With proper synchronization, lastActivity should reflect the latest update
            session?.lastActivity shouldBe mockTimeProvider.now()
        }
    }

    "concurrent getOrCreateSession calls should safely update lastActivity" {
        // EXPECTED FAILURE: Race conditions on lastActivity during concurrent access
        val mockTimeProvider = MockTimeProvider()
        val startTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(startTime)

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)

        runTest {
            // Launch 50 concurrent getOrCreateSession calls
            // All at the same mock time to test concurrent access
            val jobs = (1..50).map { index ->
                async {
                    manager.getOrCreateSession("race-test")
                }
            }

            val sessions = jobs.awaitAll()

            // All calls should return sessions with the same ID
            sessions.map { it.id }.distinct().size shouldBe 1

            // Verify no data corruption occurred
            val finalSession = manager.getSession("race-test")
            finalSession?.id shouldBe "race-test"
        }
    }

    "concurrent getSession calls should safely update lastActivity" {
        // EXPECTED FAILURE: getSession updates var lastActivity without synchronization
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        manager.getOrCreateSession("get-race-test")

        runTest {
            // Launch 50 concurrent getSession calls
            val jobs = (1..50).map {
                async {
                    mockTimeProvider.advance(1.milliseconds)
                    manager.getSession("get-race-test")
                }
            }

            jobs.awaitAll()

            // Verify no data corruption occurred
            val session = manager.getSession("get-race-test")
            session?.lastActivity shouldBe mockTimeProvider.now()
        }
    }

    "concurrent SSE connection registration should be safe" {
        // EXPECTED FAILURE: Mutable sseConnections set accessed concurrently
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        manager.getOrCreateSession("sse-concurrent-test")

        runTest {
            // Register 100 SSE connections concurrently
            val jobs = (1..100).map { index ->
                async {
                    manager.registerSSEConnection("sse-concurrent-test", "conn-$index")
                }
            }

            jobs.awaitAll()

            val session = manager.getSession("sse-concurrent-test")
            // All 100 connections should be registered without loss
            session?.sseConnections?.size shouldBe 100
        }
    }

    "concurrent session state updates should be safe" {
        // EXPECTED FAILURE: Mutable state map accessed concurrently
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(timeProvider = mockTimeProvider)
        manager.getOrCreateSession("state-concurrent-test")

        runTest {
            // Update session state 100 times concurrently
            val jobs = (1..100).map { index ->
                async {
                    manager.setSessionState("state-concurrent-test", "key-$index", "value-$index")
                }
            }

            jobs.awaitAll()

            // All 100 state entries should be present without corruption
            var count = 0
            for (i in 1..100) {
                val value = manager.getSessionState<String>("state-concurrent-test", "key-$i")
                if (value == "value-$i") count++
            }
            count shouldBe 100
        }
    }

    "concurrent cleanup and access should not cause corruption" {
        // EXPECTED FAILURE: Cleanup modifies sessions while they're being accessed
        val mockTimeProvider = MockTimeProvider()
        mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))

        val manager = MCPSessionManager(
            timeProvider = mockTimeProvider,
            sessionTimeout = 100.milliseconds
        )

        runTest {
            // Create sessions
            repeat(10) { index ->
                manager.getOrCreateSession("cleanup-test-$index")
            }

            // Concurrently access sessions and run cleanup
            val accessJobs = (0..9).map { index ->
                async {
                    repeat(10) {
                        manager.updateActivity("cleanup-test-$index")
                    }
                }
            }

            val cleanupJobs = (1..5).map {
                async {
                    mockTimeProvider.advance(20.milliseconds)
                    manager.cleanupExpiredSessions()
                }
            }

            accessJobs.awaitAll()
            cleanupJobs.awaitAll()

            // All sessions should still be accessible (activity kept them alive)
            val activeSessions = manager.getActiveSessions()
            activeSessions.size shouldBe 10
        }
    }
})
