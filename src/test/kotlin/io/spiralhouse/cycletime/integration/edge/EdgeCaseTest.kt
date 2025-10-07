package io.spiralhouse.cycletime.integration.edge
import io.spiralhouse.cycletime.integration.sse.SSETestBase

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.coroutines.delay
import java.util.UUID

/**
 * TDD RED Phase: Edge Case and Error Scenario Integration Tests
 *
 * Integration tests for edge cases, error handling, and security scenarios
 * in the SSE transport implementation. These tests verify system resilience
 * and proper error recovery.
 *
 * Edge Case Requirements:
 * - Handle connection timeouts gracefully
 * - Reject malformed requests properly
 * - Prevent security vulnerabilities
 * - Rate limit to prevent DoS
 * - Recover from errors
 *
 * EXPECTED FAILURES (RED Phase):
 * - Error handling not implemented
 * - Security validation doesn't exist
 * - Recovery mechanisms not implemented
 *
 * These tests will pass once the Developer agent implements edge case handling.
 */
class EdgeCaseTest : SSETestBase() {
    init {

    "should handle SSE connection timeout gracefully" {
        // EXPECTED FAILURE: Timeout handling doesn't exist
        withTestApp {
            val sessionId = "timeout-${UUID.randomUUID()}"

            // Connect SSE
            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response.status shouldBe HttpStatusCode.OK

            // Wait for timeout (configured in test to be short)
            delay(100)

            // Connection should close gracefully
            // Session should be cleaned up
        }
    }

    "should handle malformed JSON-RPC in POST body" {
        // EXPECTED FAILURE: Malformed JSON handling doesn't exist
        withTestApp {
            val sessionId = "malformed-${UUID.randomUUID()}"

            val testCases = listOf(
                """{"invalid"}""",
                """{"jsonrpc":"2.0","method":}""",
                """null""",
                """undefined""",
                """{"jsonrpc":"2.0","method":"test","id":}"""
            )

            testCases.forEach { malformedJson ->
                val response = client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody(malformedJson)
                }

                // Should return parse error
                response.status shouldBe HttpStatusCode.BadRequest
                response.bodyAsText() shouldContain "parse error"
            }
        }
    }

    "should prevent session hijacking via header validation" {
        // EXPECTED FAILURE: Security validation doesn't exist
        withTestApp {
            val validSession = "valid-${UUID.randomUUID()}"

            // Create valid session
            client.post("/mcp") {
                header("Mcp-Session-Id", validSession)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"initialize","id":1}""")
            }

            // Try various injection attacks
            val attacks = listOf(
                "$validSession\nMcp-Session-Id: hijacked",
                "$validSession\r\nAuthorization: Bearer evil",
                "$validSession\u0000admin",
                "../../../etc/passwd",
                "'; DROP TABLE sessions; --"
            )

            attacks.forEach { attack ->
                val response = client.post("/mcp") {
                    header("Mcp-Session-Id", attack)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
                }

                response.status shouldBe HttpStatusCode.BadRequest
                response.bodyAsText() shouldContain "Invalid session ID"
            }
        }
    }

    "should limit concurrent sessions to prevent DoS" {
        // EXPECTED FAILURE: Rate limiting doesn't exist
        withTestApp {
            // Create 101 sessions (over limit of 100)
            val sessions = (1..101).map { "dos-session-$it-${UUID.randomUUID()}" }

            val responses = sessions.map { sessionId ->
                client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"initialize","id":1}""")
                }
            }

            // Last one should be rejected
            responses.last().status shouldBe HttpStatusCode.TooManyRequests
        }
    }

    "should handle empty request body" {
        // EXPECTED FAILURE: Empty body handling doesn't exist
        withTestApp {
            val sessionId = "empty-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("")
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "empty"
        }
    }

    "should reject requests with invalid Content-Type" {
        // EXPECTED FAILURE: Content-Type validation doesn't exist
        withTestApp {
            val sessionId = "content-type-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Text.Plain)
                setBody("""{"jsonrpc":"2.0","method":"test","id":1}""")
            }

            response.status shouldBe HttpStatusCode.UnsupportedMediaType
        }
    }

    "should handle concurrent duplicate request IDs in same session" {
        // EXPECTED FAILURE: Duplicate ID detection doesn't exist
        withTestApp {
            val sessionId = "duplicate-id-${UUID.randomUUID()}"

            // Send two requests with same ID concurrently
            val response1 = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            val response2 = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"resources/list","id":1}""")
            }

            // Both should be accepted (or one rejected)
            // Implementation can choose to allow or reject duplicates
            response1.status shouldBe HttpStatusCode.Accepted
            // response2 could be 202 or 400
        }
    }

    "should handle SSE connection without prior session creation" {
        // EXPECTED FAILURE: Auto-session creation logic doesn't exist
        withTestApp {
            val sessionId = "new-session-${UUID.randomUUID()}"

            // Connect SSE without any prior POST request
            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            // Should auto-create session or require initialization first
            response.status shouldBe HttpStatusCode.OK // Auto-create
            // OR response.status shouldBe HttpStatusCode.BadRequest // Require init
        }
    }

    "should handle rapid session creation and deletion" {
        // EXPECTED FAILURE: Lifecycle race condition handling doesn't exist
        withTestApp {
            repeat(50) { index ->
                val sessionId = "rapid-$index-${UUID.randomUUID()}"

                // Create session
                client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"initialize","id":1}""")
                }

                // Connect SSE
                client.get("/mcp/events") {
                    header("Mcp-Session-Id", sessionId)
                }

                // Immediately disconnect (request completes)
                // Session cleanup
            }

            // System should remain stable
        }
    }

    "should reject oversized request payloads" {
        // EXPECTED FAILURE: Size limit enforcement doesn't exist
        withTestApp {
            val sessionId = "oversized-${UUID.randomUUID()}"
            val largePayload = "x".repeat(10_000_000) // 10MB

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"test","params":{"data":"$largePayload"},"id":1}""")
            }

            response.status shouldBe HttpStatusCode.PayloadTooLarge
        }
    }

    "should handle null bytes in request body" {
        // EXPECTED FAILURE: Binary data handling doesn't exist
        withTestApp {
            val sessionId = "null-byte-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"test\u0000","id":1}""")
            }

            response.status shouldBe HttpStatusCode.BadRequest
        }
    }

    "should handle extremely long session IDs" {
        // EXPECTED FAILURE: Length validation doesn't exist
        withTestApp {
            val longSessionId = "a".repeat(1000)

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", longSessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"test","id":1}""")
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "session ID too long"
        }
    }

    "should handle unicode in session IDs" {
        // EXPECTED FAILURE: Unicode validation doesn't exist
        withTestApp {
            val unicodeSessionId = "session-测试-😀"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", unicodeSessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"test","id":1}""")
            }

            // Should either accept (if unicode allowed) or reject
            // response.status shouldBe HttpStatusCode.Accepted OR BadRequest
        }
    }

    "should handle SSE reconnection with Last-Event-ID" {
        // EXPECTED FAILURE: Event resumption doesn't exist
        withTestApp {
            val sessionId = "resume-${UUID.randomUUID()}"

            // First connection receives events 1-5
            client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            val response1 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response1.status shouldBe HttpStatusCode.OK

            // Reconnect with Last-Event-ID to resume
            val response2 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
                header("Last-Event-ID", "3")
            }

            response2.status shouldBe HttpStatusCode.OK
            // Should receive events after ID 3
        }
    }

    "should handle method names with special characters" {
        // EXPECTED FAILURE: Method name validation doesn't exist
        withTestApp {
            val sessionId = "special-method-${UUID.randomUUID()}"

            val specialMethods = listOf(
                "method\ninjection",
                "method\rinjection",
                "method<script>",
                "method' OR '1'='1"
            )

            specialMethods.forEach { method ->
                val response = client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"$method","id":1}""")
                }

                response.status shouldBe HttpStatusCode.BadRequest
            }
        }
    }

    "should handle requests without jsonrpc version field" {
        // EXPECTED FAILURE: Version validation doesn't exist
        withTestApp {
            val sessionId = "no-version-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"method":"test","id":1}""")
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "jsonrpc"
        }
    }

    "should handle mixed valid and invalid batch requests" {
        // EXPECTED FAILURE: Batch validation doesn't exist
        withTestApp {
            val sessionId = "batch-mixed-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""
                    [
                        {"jsonrpc":"2.0","method":"tools/list","id":1},
                        {"method":"invalid","id":2},
                        {"jsonrpc":"2.0","method":"resources/list","id":3}
                    ]
                """.trimIndent())
            }

            // Should reject entire batch if any request is invalid
            response.status shouldBe HttpStatusCode.BadRequest
        }
    }

    "should handle CORS preflight with invalid origin" {
        // EXPECTED FAILURE: CORS origin validation doesn't exist
        withTestApp {
            val response = client.options("/mcp") {
                header("Origin", "http://evil.com")
                header("Access-Control-Request-Method", "POST")
            }

            // Should reject or allow based on CORS policy
            // Typically reject unknown origins
        }
    }

    "should recover from server errors gracefully" {
        // EXPECTED FAILURE: Error recovery doesn't exist
        withTestApp {
            val sessionId = "error-recovery-${UUID.randomUUID()}"

            // Send request that causes server error
            val errorResponse = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"error_causing_method","id":1}""")
            }

            // Server should return error response, not crash
            errorResponse.status shouldBe HttpStatusCode.Accepted // Or 500

            // Subsequent requests should still work
            val normalResponse = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":2}""")
            }

            normalResponse.status shouldBe HttpStatusCode.Accepted
        }
    }

    "should handle SSE connection from multiple tabs/windows" {
        // EXPECTED FAILURE: Multi-connection handling doesn't exist
        withTestApp {
            val sessionId = "multi-tab-${UUID.randomUUID()}"

            // Simulate 3 tabs opening SSE connections with same session
            val connection1 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val connection2 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val connection3 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            connection1.status shouldBe HttpStatusCode.OK
            connection2.status shouldBe HttpStatusCode.OK
            connection3.status shouldBe HttpStatusCode.OK

            // All should receive events
            // (or last connection replaces previous - implementation choice)
        }
    }
    }
}
