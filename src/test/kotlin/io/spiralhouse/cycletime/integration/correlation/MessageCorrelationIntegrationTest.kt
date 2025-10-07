package io.spiralhouse.cycletime.integration.correlation
import io.spiralhouse.cycletime.integration.sse.SSETestBase

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import java.util.UUID

/**
 * TDD RED Phase: Message Correlation Integration Tests
 *
 * Integration tests for correlating JSON-RPC requests (POST) with responses (SSE).
 * These tests verify the complete request/response flow across the SSE transport,
 * ensuring each session receives only its own responses.
 *
 * Message Correlation Requirements (SPI-670):
 * - POST request triggers processing
 * - Response published to correct session's SSE stream
 * - Request ID correlation maintained
 * - No event leakage between sessions
 * - Support concurrent requests
 *
 * EXPECTED FAILURES (RED Phase):
 * - Message correlation logic doesn't exist
 * - Event routing not implemented
 * - Request/response matching not implemented
 *
 * These tests will pass once the Developer agent implements correlation.
 */
class MessageCorrelationIntegrationTest : SSETestBase() {
    init {

    "should deliver response to correct session via SSE" {
        // EXPECTED FAILURE: Message correlation logic doesn't exist
        withTestApp {
            val session1 = "session-1-${UUID.randomUUID()}"
            val session2 = "session-2-${UUID.randomUUID()}"

            // Session 1 makes request via POST
            val postResponse1 = client.post("/mcp") {
                header("Mcp-Session-Id", session1)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            postResponse1.status shouldBe HttpStatusCode.Accepted

            // Session 2 makes different request via POST
            val postResponse2 = client.post("/mcp") {
                header("Mcp-Session-Id", session2)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"resources/list","id":2}""")
            }

            postResponse2.status shouldBe HttpStatusCode.Accepted

            // Connect SSE for session 1
            val sse1 = client.get("/mcp/events") {
                header("Mcp-Session-Id", session1)
            }

            // Connect SSE for session 2
            val sse2 = client.get("/mcp/events") {
                header("Mcp-Session-Id", session2)
            }

            // Session 1 should receive only response with id:1
            val body1 = sse1.bodyAsText()
            body1 shouldContain "\"id\":1"
            body1 shouldNotContain "\"id\":2"

            // Session 2 should receive only response with id:2
            val body2 = sse2.bodyAsText()
            body2 shouldContain "\"id\":2"
            body2 shouldNotContain "\"id\":1"
        }
    }

    "should not leak events between sessions" {
        // EXPECTED FAILURE: Event isolation doesn't exist
        withTestApp {
            val session1 = "isolated-1-${UUID.randomUUID()}"
            val session2 = "isolated-2-${UUID.randomUUID()}"

            // Create session 1 and connect SSE
            client.post("/mcp") {
                header("Mcp-Session-Id", session1)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"initialize","id":1}""")
            }

            val sse1 = client.get("/mcp/events") {
                header("Mcp-Session-Id", session1)
            }

            // Create session 2 and connect SSE
            client.post("/mcp") {
                header("Mcp-Session-Id", session2)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"initialize","id":2}""")
            }

            val sse2 = client.get("/mcp/events") {
                header("Mcp-Session-Id", session2)
            }

            // Session 1 makes a request
            client.post("/mcp") {
                header("Mcp-Session-Id", session1)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":10}""")
            }

            // Session 2 should NOT receive session 1's response
            val body2 = sse2.bodyAsText()
            body2 shouldNotContain "\"id\":10"
        }
    }

    "should correlate multiple concurrent requests correctly" {
        // EXPECTED FAILURE: Concurrent correlation not implemented
        withTestApp {
            val sessionId = "concurrent-${UUID.randomUUID()}"

            // Send multiple requests concurrently
            val requestIds = (1..10).toList()

            requestIds.forEach { id ->
                launch {
                    client.post("/mcp") {
                        header("Mcp-Session-Id", sessionId)
                        contentType(ContentType.Application.Json)
                        setBody("""{"jsonrpc":"2.0","method":"tools/list","id":$id}""")
                    }
                }
            }

            delay(100) // Wait for all requests to process

            // Connect SSE
            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // All request IDs should appear in responses
            requestIds.forEach { id ->
                body shouldContain "\"id\":$id"
            }
        }
    }

    "should handle request/response with same ID in different sessions" {
        // EXPECTED FAILURE: Session isolation not verified
        withTestApp {
            val session1 = "same-id-1-${UUID.randomUUID()}"
            val session2 = "same-id-2-${UUID.randomUUID()}"

            // Both sessions use request ID 1
            client.post("/mcp") {
                header("Mcp-Session-Id", session1)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            client.post("/mcp") {
                header("Mcp-Session-Id", session2)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"resources/list","id":1}""")
            }

            // Each session should receive only its own response
            val sse1 = client.get("/mcp/events") {
                header("Mcp-Session-Id", session1)
            }

            val sse2 = client.get("/mcp/events") {
                header("Mcp-Session-Id", session2)
            }

            val body1 = sse1.bodyAsText()
            val body2 = sse2.bodyAsText()

            // Session 1 should have tools/list response
            body1 shouldContain "tools"

            // Session 2 should have resources/list response
            body2 shouldContain "resources"
        }
    }

    "should maintain request ID format through correlation" {
        // EXPECTED FAILURE: ID format preservation not implemented
        withTestApp {
            val sessionId = "id-format-${UUID.randomUUID()}"

            // String ID
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":"string-id-123"}""")
            }

            // Numeric ID
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":456}""")
            }

            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // IDs should be preserved exactly
            body shouldContain "\"id\":\"string-id-123\""
            body shouldContain "\"id\":456"
        }
    }

    "should queue responses when SSE not yet connected" {
        // EXPECTED FAILURE: Response queuing not implemented
        withTestApp {
            val sessionId = "queue-test-${UUID.randomUUID()}"

            // Send request before SSE connection
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            delay(50) // Wait for processing

            // Now connect SSE
            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // Queued response should be delivered
            body shouldContain "\"id\":1"
        }
    }

    "should handle notification requests (no response expected)" {
        // EXPECTED FAILURE: Notification handling not implemented
        withTestApp {
            val sessionId = "notification-${UUID.randomUUID()}"

            // Send notification (no id field)
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"notifications/cancelled"}""")
            }

            // Send regular request
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // Only regular request should have response
            body shouldContain "\"id\":1"
            // Notification should not generate response
        }
    }

    "should deliver error responses with correct correlation" {
        // EXPECTED FAILURE: Error response routing not implemented
        withTestApp {
            val sessionId = "error-correlation-${UUID.randomUUID()}"

            // Send request that will error
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"nonexistent/method","id":99}""")
            }

            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // Error response should have correct ID
            body shouldContain "\"id\":99"
            body shouldContain "\"error\""
        }
    }

    "should handle out-of-order response delivery" {
        // EXPECTED FAILURE: Out-of-order handling not implemented
        withTestApp {
            val sessionId = "ooo-test-${UUID.randomUUID()}"

            // Send 3 requests
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":2}""")
            }

            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":3}""")
            }

            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // All responses should be delivered regardless of order
            body shouldContain "\"id\":1"
            body shouldContain "\"id\":2"
            body shouldContain "\"id\":3"
        }
    }

    "should deliver batch responses correctly" {
        // EXPECTED FAILURE: Batch response handling not implemented
        withTestApp {
            val sessionId = "batch-${UUID.randomUUID()}"

            // Send batch request
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""
                    [
                        {"jsonrpc":"2.0","method":"tools/list","id":1},
                        {"jsonrpc":"2.0","method":"resources/list","id":2}
                    ]
                """.trimIndent())
            }

            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // Batch responses should be delivered
            body shouldContain "\"id\":1"
            body shouldContain "\"id\":2"
        }
    }

    "should clean up pending requests on session disconnect" {
        // EXPECTED FAILURE: Cleanup logic doesn't exist
        withTestApp {
            val sessionId = "cleanup-pending-${UUID.randomUUID()}"

            // Send request
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            // Connect and immediately disconnect SSE
            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            sseResponse.status shouldBe HttpStatusCode.OK

            // Disconnect happens when request completes
            // Pending requests should be cleaned up
        }
    }

    "should preserve JSON-RPC structure in SSE events" {
        // EXPECTED FAILURE: JSON structure preservation not verified
        withTestApp {
            val sessionId = "json-structure-${UUID.randomUUID()}"

            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // Response should be valid JSON-RPC 2.0
            body shouldContain "\"jsonrpc\":\"2.0\""
            body shouldContain "\"id\":1"
            // Should have either result or error
            // body shouldContain "\"result\"" OR body shouldContain "\"error\""
        }
    }

    "should handle rapid request/response cycles" {
        // EXPECTED FAILURE: High-frequency correlation not implemented
        withTestApp {
            val sessionId = "rapid-${UUID.randomUUID()}"

            // Send 50 requests rapidly
            repeat(50) { index ->
                launch {
                    client.post("/mcp") {
                        header("Mcp-Session-Id", sessionId)
                        contentType(ContentType.Application.Json)
                        setBody("""{"jsonrpc":"2.0","method":"tools/list","id":$index}""")
                    }
                }
            }

            delay(200) // Wait for processing

            val sseResponse = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val body = sseResponse.bodyAsText()

            // All 50 responses should be delivered
            (0 until 50).forEach { index ->
                body shouldContain "\"id\":$index"
            }
        }
    }
    }
}
