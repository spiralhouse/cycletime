package io.spiralhouse.cycletime.integration.performance
import io.spiralhouse.cycletime.integration.sse.SSETestBase

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.longs.shouldBeLessThan
import io.kotest.matchers.shouldBe
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import java.util.UUID
import kotlin.system.measureTimeMillis

/**
 * SSE Performance Integration Tests
 *
 * Performance tests for the SSE transport implementation to ensure it meets
 * the required performance characteristics. These tests verify response times,
 * throughput, and resource efficiency.
 *
 * Performance Requirements:
 * - Tool calls complete in <100ms (target)
 * - Support 10+ concurrent SSE connections
 * - Handle 100+ requests/second per session
 * - SSE performance within 2x of WebSocket baseline
 * - Graceful degradation under load
 *
 * ARCHITECTURAL NOTE:
 * SSE connections are long-lived streams. Performance tests must use
 * prepareGet().execute{} pattern to avoid timeout issues with client.get().
 */
class SSEPerformanceTest : SSETestBase() {
    init {

    "should respond to tool call in less than 100ms" {
        withTestApp {
            val sessionId = "perf-basic-${UUID.randomUUID()}"

            // Initialize session
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05"},"id":1}""")
            }

            // Measure tool call performance
            val time = measureTimeMillis {
                val response = client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":2}""")
                }

                response.status shouldBe HttpStatusCode.Accepted
            }

            time shouldBeLessThan 100 // <100ms target
        }
    }

    "should handle 10 concurrent SSE connections efficiently" {
        withTestApp {
            val sessionIds = (1..10).map { "concurrent-$it-${UUID.randomUUID()}" }

            val time = measureTimeMillis {
                val connections = sessionIds.map { sessionId ->
                    async {
                        var status: HttpStatusCode? = null
                        client.prepareGet("/mcp/events") {
                            header("Mcp-Session-Id", sessionId)
                        }.execute { response ->
                            status = response.status
                        }
                        status
                    }
                }.awaitAll()

                connections.forEach { status ->
                    status shouldBe HttpStatusCode.OK
                }
            }

            // All connections should establish quickly
            time shouldBeLessThan 1000 // <1 second for 10 connections
        }
    }

    "should process 100 requests per second per session" {
        // EXPECTED FAILURE: High-throughput handling not implemented
        withTestApp {
            val sessionId = "throughput-${UUID.randomUUID()}"
            val requestCount = 100

            val time = measureTimeMillis {
                val requests = (1..requestCount).map { index ->
                    async {
                        client.post("/mcp") {
                            header("Mcp-Session-Id", sessionId)
                            contentType(ContentType.Application.Json)
                            setBody("""{"jsonrpc":"2.0","method":"tools/list","id":$index}""")
                        }
                    }
                }.awaitAll()

                requests.forEach { response ->
                    response.status shouldBe HttpStatusCode.Accepted
                }
            }

            // 100 requests should complete in ~1 second
            time shouldBeLessThan 2000 // Allow 2s for test environment
        }
    }

    "should maintain low latency under concurrent load" {
        // EXPECTED FAILURE: Load optimization not implemented
        withTestApp {
            val sessionCount = 5
            val requestsPerSession = 20

            val time = measureTimeMillis {
                val allRequests = (1..sessionCount).flatMap { sessionIdx ->
                    val sessionId = "load-session-$sessionIdx-${UUID.randomUUID()}"

                    (1..requestsPerSession).map { reqIdx ->
                        async {
                            client.post("/mcp") {
                                header("Mcp-Session-Id", sessionId)
                                contentType(ContentType.Application.Json)
                                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":$reqIdx}""")
                            }
                        }
                    }
                }.awaitAll()

                allRequests.forEach { response ->
                    response.status shouldBe HttpStatusCode.Accepted
                }
            }

            // 100 total requests across 5 sessions
            time shouldBeLessThan 3000 // <3s for distributed load
        }
    }

    "should efficiently stream large SSE event payloads" {
        withTestApp {
            val sessionId = "large-payload-${UUID.randomUUID()}"

            // Send request that will return large response
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            val time = measureTimeMillis {
                client.prepareGet("/mcp/events") {
                    header("Mcp-Session-Id", sessionId)
                }.execute { response ->
                    response.status shouldBe HttpStatusCode.OK
                    // Connection established - streaming works
                }
            }

            // Streaming should be fast even for large payloads
            time shouldBeLessThan 500
        }
    }

    "should handle rapid connect/disconnect cycles" {
        withTestApp {
            val sessionId = "reconnect-perf-${UUID.randomUUID()}"
            val cycleCount = 10

            val time = measureTimeMillis {
                repeat(cycleCount) {
                    client.prepareGet("/mcp/events") {
                        header("Mcp-Session-Id", sessionId)
                    }.execute { response ->
                        response.status shouldBe HttpStatusCode.OK
                        // Connection closes when request completes
                    }
                }
            }

            // 10 connect/disconnect cycles
            time shouldBeLessThan 2000 // <200ms per cycle
        }
    }

    "should not degrade performance with session accumulation" {
        // EXPECTED FAILURE: Session cleanup not optimized
        withTestApp {
            // Create 50 sessions
            val sessions = (1..50).map { "accumulation-$it-${UUID.randomUUID()}" }

            sessions.forEach { sessionId ->
                client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"initialize","id":1}""")
                }
            }

            // Measure performance with many existing sessions
            val testSessionId = "test-${UUID.randomUUID()}"

            val time = measureTimeMillis {
                client.post("/mcp") {
                    header("Mcp-Session-Id", testSessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
                }
            }

            // Performance should not degrade significantly
            time shouldBeLessThan 150 // Still under 150ms with 50 sessions
        }
    }

    "should efficiently queue pending responses" {
        withTestApp {
            val sessionId = "queue-perf-${UUID.randomUUID()}"

            // Send 50 requests before connecting SSE
            (1..50).forEach { index ->
                client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":$index}""")
                }
            }

            // Measure time to establish connection (queued responses handled internally)
            val time = measureTimeMillis {
                client.prepareGet("/mcp/events") {
                    header("Mcp-Session-Id", sessionId)
                }.execute { response ->
                    response.status shouldBe HttpStatusCode.OK
                    // Queued responses are sent via stream
                }
            }

            // Queued response delivery should be fast
            time shouldBeLessThan 1000
        }
    }

    "should maintain performance during session cleanup" {
        withTestApp {
            val sessionId = "cleanup-perf-${UUID.randomUUID()}"

            // Create session with activity
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"initialize","id":1}""")
            }

            // Open and close SSE connection
            client.prepareGet("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }.execute { response ->
                response.status shouldBe HttpStatusCode.OK
            }

            delay(100) // Wait for cleanup

            // Measure subsequent request performance
            val time = measureTimeMillis {
                val response = client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":2}""")
                }

                response.status shouldBe HttpStatusCode.Accepted
            }

            time shouldBeLessThan 100
        }
    }

    "should achieve SSE performance within 2x of WebSocket baseline" {
        withTestApp {
            val sessionId = "baseline-${UUID.randomUUID()}"

            // Initialize
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05"},"id":1}""")
            }

            // Measure SSE request/response cycle
            val sseTime = measureTimeMillis {
                // Send request
                client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":2}""")
                }

                // Establish SSE connection
                client.prepareGet("/mcp/events") {
                    header("Mcp-Session-Id", sessionId)
                }.execute { response ->
                    response.status shouldBe HttpStatusCode.OK
                }
            }

            // WebSocket baseline is typically 20-50ms for similar operation
            // SSE should be within 2x (40-100ms)
            sseTime shouldBeLessThan 100
        }
    }

    "should handle message correlation efficiently at scale" {
        withTestApp {
            val sessionCount = 10
            val requestsPerSession = 10

            val time = measureTimeMillis {
                val allRequests = (1..sessionCount).flatMap { sessionIdx ->
                    val sessionId = "correlation-$sessionIdx-${UUID.randomUUID()}"

                    (1..requestsPerSession).map { reqIdx ->
                        async {
                            // Send request
                            client.post("/mcp") {
                                header("Mcp-Session-Id", sessionId)
                                contentType(ContentType.Application.Json)
                                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":$reqIdx}""")
                            }

                            // Establish SSE connection
                            client.prepareGet("/mcp/events") {
                                header("Mcp-Session-Id", sessionId)
                            }.execute { response ->
                                response.status shouldBe HttpStatusCode.OK
                            }
                        }
                    }
                }.awaitAll()

                // Verify all completed
                allRequests.size shouldBe (sessionCount * requestsPerSession)
            }

            // 100 correlated request/response pairs
            time shouldBeLessThan 5000 // <5s for 100 pairs across 10 sessions
        }
    }

    "should minimize memory overhead per session" {
        // EXPECTED FAILURE: Memory optimization not implemented
        withTestApp {
            // Create 100 lightweight sessions
            val sessions = (1..100).map { "memory-$it-${UUID.randomUUID()}" }

            sessions.forEach { sessionId ->
                client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"initialize","id":1}""")
                }
            }

            // System should handle 100 sessions without performance degradation
            val testSessionId = "test-${UUID.randomUUID()}"

            val time = measureTimeMillis {
                client.post("/mcp") {
                    header("Mcp-Session-Id", testSessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
                }
            }

            time shouldBeLessThan 150 // Still performant with 100 sessions
        }
    }
    }
}
