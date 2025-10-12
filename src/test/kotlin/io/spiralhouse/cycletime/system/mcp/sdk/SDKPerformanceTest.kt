package io.spiralhouse.cycletime.system.mcp.sdk

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.longs.shouldBeLessThan
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.application.commands.CreateSessionCommand
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import io.spiralhouse.cycletime.mcp.sdk.SessionContext
import io.spiralhouse.cycletime.unit.mocks.MockSessionRepository
import io.spiralhouse.cycletime.unit.mocks.MockProjectRepository
import io.spiralhouse.cycletime.unit.mocks.MockUnitOfWork
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonPrimitive
import kotlin.time.measureTime

/**
 * Performance benchmark tests for SDK v0.7.2 transport layer.
 *
 * These system tests validate that the SDK transport infrastructure meets
 * the performance requirements specified in Phase 2 (SPI-703).
 *
 * Performance Targets:
 * - SDK server initialization: < 100ms (target: < 50ms)
 * - Session ID extraction: < 10ms (target: < 5ms)
 * - Session creation: < 500ms (target: < 100ms)
 * - Session validation: < 100ms (target: < 50ms)
 *
 * Test Categories:
 * - Server initialization benchmarks
 * - Session extraction benchmarks
 * - Session management operation benchmarks
 * - Concurrent operation benchmarks
 *
 * Design Philosophy:
 * - Real performance measurements (not mocks for timing)
 * - Realistic data volumes and patterns
 * - Multiple iterations to account for JVM warmup
 * - Clear reporting of actual vs target times
 *
 * Note: These tests use in-memory mock services to focus on SDK transport
 * performance independent of database I/O. Database performance is validated
 * separately in integration tests.
 */
class SDKPerformanceTest : StringSpec({

    "SDK server initialization should complete in under 100ms" {
        // Given
        val version = "1.0.0"

        // When - measure initialization time
        val duration = measureTime {
            MCPSdkServer(version)
        }

        // Then
        duration.inWholeMilliseconds shouldBeLessThan 100
        println("✓ SDK server initialization: ${duration.inWholeMilliseconds}ms (target: <100ms, ideal: <50ms)")
    }

    "SDK server initialization should average under 50ms over multiple runs" {
        // Given - warmup JVM
        repeat(5) { MCPSdkServer("warmup") }

        // When - measure average initialization time over 10 runs
        val durations = (1..10).map {
            measureTime {
                MCPSdkServer("1.0.0")
            }.inWholeMilliseconds
        }

        val averageDuration = durations.average()

        // Then
        (averageDuration < 50.0) shouldBe true
        println("✓ SDK server initialization average: ${averageDuration}ms over 10 runs (target: <50ms)")
        println("  Min: ${durations.minOrNull()}ms, Max: ${durations.maxOrNull()}ms")
    }

    "Session ID extraction should complete in under 10ms" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("perf-test-session"),
            "userId" to JsonPrimitive("user-123"),
            "requestId" to JsonPrimitive("req-456")
        )

        // When - measure extraction time
        val duration = measureTime {
            repeat(100) {
                SessionContext.extractSessionId(metadata)
            }
        }

        val avgDuration = duration.inWholeMilliseconds / 100.0

        // Then - average per extraction should be well under 10ms
        (avgDuration < 10.0) shouldBe true
        println("✓ Session ID extraction average: ${avgDuration}ms per call (target: <10ms, ideal: <5ms)")
    }

    "Session ID extraction should handle 1000 calls efficiently" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("bulk-test-session")
        )

        // When - measure bulk extraction time
        val duration = measureTime {
            repeat(1000) {
                SessionContext.extractSessionId(metadata)
            }
        }

        // Then - should complete all extractions in reasonable time
        duration.inWholeMilliseconds shouldBeLessThan 100 // <0.1ms per extraction
        println("✓ Session ID extraction (1000 calls): ${duration.inWholeMilliseconds}ms total")
    }

    "Session creation should complete in under 500ms" {
        // Given
        val mockTimeProvider = MockTimeProvider()
        val mockSessionRepository = MockSessionRepository(mockTimeProvider)
        val mockProjectRepository = MockProjectRepository()
        val mockUnitOfWork = MockUnitOfWork()
        val sessionService = SessionApplicationService(
            mockSessionRepository,
            mockProjectRepository,
            mockUnitOfWork,
            mockTimeProvider
        )
        val sessionManager = SDKSessionManager(sessionService)

        // When - measure session creation time
        val duration = measureTime {
            runBlocking {
                sessionManager.getOrCreateSession("550e8400-e29b-41d4-a716-446655440010")
            }
        }

        // Then
        duration.inWholeMilliseconds shouldBeLessThan 500
        println("✓ Session creation: ${duration.inWholeMilliseconds}ms (target: <500ms, ideal: <100ms)")
    }

    "Session validation should complete in under 100ms" {
        // Given
        val mockTimeProvider = MockTimeProvider()
        val mockSessionRepository = MockSessionRepository(mockTimeProvider)
        val mockProjectRepository = MockProjectRepository()
        val mockUnitOfWork = MockUnitOfWork()
        val sessionService = SessionApplicationService(
            mockSessionRepository,
            mockProjectRepository,
            mockUnitOfWork,
            mockTimeProvider
        )
        val sessionManager = SDKSessionManager(sessionService)

        // Pre-create session
        val session = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }

        // When - measure validation time
        val duration = measureTime {
            runBlocking {
                sessionManager.validateSession(session.sessionKey.value)
            }
        }

        // Then
        duration.inWholeMilliseconds shouldBeLessThan 100
        println("✓ Session validation: ${duration.inWholeMilliseconds}ms (target: <100ms, ideal: <50ms)")
    }

    "Session retrieval should complete in under 100ms" {
        // Given
        val mockTimeProvider = MockTimeProvider()
        val mockSessionRepository = MockSessionRepository(mockTimeProvider)
        val mockProjectRepository = MockProjectRepository()
        val mockUnitOfWork = MockUnitOfWork()
        val sessionService = SessionApplicationService(
            mockSessionRepository,
            mockProjectRepository,
            mockUnitOfWork,
            mockTimeProvider
        )
        val sessionManager = SDKSessionManager(sessionService)

        // Pre-create session
        val session = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }

        // When - measure retrieval time
        val duration = measureTime {
            runBlocking {
                sessionManager.getSessionOrNull(session.sessionKey.value)
            }
        }

        // Then
        duration.inWholeMilliseconds shouldBeLessThan 100
        println("✓ Session retrieval: ${duration.inWholeMilliseconds}ms (target: <100ms)")
    }

    "Bulk session creation should maintain consistent performance" {
        // Given
        val mockTimeProvider = MockTimeProvider()
        val mockSessionRepository = MockSessionRepository(mockTimeProvider)
        val mockProjectRepository = MockProjectRepository()
        val mockUnitOfWork = MockUnitOfWork()
        val sessionService = SessionApplicationService(
            mockSessionRepository,
            mockProjectRepository,
            mockUnitOfWork,
            mockTimeProvider
        )
        val sessionManager = SDKSessionManager(sessionService)

        // When - create 100 sessions and measure average time
        val durations = (1..100).map { index ->
            val uuid = String.format("550e8400-e29b-41d4-a716-%012d", index + 1000)
            measureTime {
                runBlocking {
                    sessionManager.getOrCreateSession(uuid)
                }
            }.inWholeMilliseconds
        }

        val averageDuration = durations.average()
        val maxDuration = durations.maxOrNull() ?: 0

        // Then - average should be under ideal target, max under hard limit
        (averageDuration < 100.0) shouldBe true
        maxDuration shouldBeLessThan 500
        println("✓ Bulk session creation (100 sessions):")
        println("  Average: ${averageDuration}ms (target: <100ms)")
        println("  Max: ${maxDuration}ms (target: <500ms)")
    }

    "Session manager should handle rapid sequential operations efficiently" {
        // Given
        val mockTimeProvider = MockTimeProvider()
        val mockSessionRepository = MockSessionRepository(mockTimeProvider)
        val mockProjectRepository = MockProjectRepository()
        val mockUnitOfWork = MockUnitOfWork()
        val sessionService = SessionApplicationService(
            mockSessionRepository,
            mockProjectRepository,
            mockUnitOfWork,
            mockTimeProvider
        )
        val sessionManager = SDKSessionManager(sessionService)

        // Pre-create sessions
        val sessionIds = (1..10).map { index ->
            runBlocking {
                sessionService.createSession(CreateSessionCommand(projectId = null))
            }.sessionKey.value // Extract String from SessionKey
        }

        // When - perform rapid sequential operations
        val duration = measureTime {
            runBlocking {
                // Mix of operations
                sessionIds.forEach { sessionId ->
                    sessionManager.validateSession(sessionId)
                    sessionManager.getSessionOrNull(sessionId)
                    sessionManager.getOrCreateSession(sessionId)
                }
            }
        }

        val avgDurationPerOperation = duration.inWholeMilliseconds / (sessionIds.size * 3.0)

        // Then - average operation time should be efficient
        (avgDurationPerOperation < 50.0) shouldBe true
        println("✓ Rapid sequential operations (30 ops): ${duration.inWholeMilliseconds}ms total")
        println("  Average per operation: ${avgDurationPerOperation}ms")
    }

    "Server shutdown should complete in under 100ms" {
        // Given
        val server = MCPSdkServer("1.0.0")

        // When - measure shutdown time
        val duration = measureTime {
            runBlocking {
                server.shutdown()
            }
        }

        // Then
        duration.inWholeMilliseconds shouldBeLessThan 100
        println("✓ Server shutdown: ${duration.inWholeMilliseconds}ms (target: <100ms)")
    }

    "Complete SDK initialization and first session creation should complete in under 1 second" {
        // Given - fresh environment

        // When - measure full startup sequence
        val duration = measureTime {
            val server = MCPSdkServer("1.0.0")
            val mockTimeProvider = MockTimeProvider()
            val mockSessionRepository = MockSessionRepository(mockTimeProvider)
            val mockProjectRepository = MockProjectRepository()
            val mockUnitOfWork = MockUnitOfWork()
            val sessionService = SessionApplicationService(
                mockSessionRepository,
                mockProjectRepository,
                mockUnitOfWork,
                mockTimeProvider
            )
            val sessionManager = SDKSessionManager(sessionService)

            runBlocking {
                sessionManager.getOrCreateSession("550e8400-e29b-41d4-a716-446655442000")
            }
        }

        // Then - complete startup should be fast
        duration.inWholeMilliseconds shouldBeLessThan 1000
        println("✓ Complete SDK startup + first session: ${duration.inWholeMilliseconds}ms (target: <1000ms)")
    }

    "requireSessionId should match extractSessionId performance" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("require-test-session")
        )

        // When - measure both methods
        val extractDuration = measureTime {
            repeat(100) {
                SessionContext.extractSessionId(metadata)
            }
        }.inWholeMilliseconds

        val requireDuration = measureTime {
            repeat(100) {
                SessionContext.requireSessionId(metadata)
            }
        }.inWholeMilliseconds

        // Then - both should have similar performance
        val difference = kotlin.math.abs(extractDuration - requireDuration)
        difference shouldBeLessThan 10 // within 10ms difference
        println("✓ Session ID extraction methods performance:")
        println("  extractSessionId: ${extractDuration}ms")
        println("  requireSessionId: ${requireDuration}ms")
        println("  Difference: ${difference}ms (should be <10ms)")
    }
})
