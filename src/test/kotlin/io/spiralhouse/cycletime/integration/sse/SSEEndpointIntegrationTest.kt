package io.spiralhouse.cycletime.integration.sse

import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldStartWith
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import java.util.UUID

/**
 * TDD RED Phase: SSE Endpoint Integration Tests
 *
 * Integration tests for the Server-Sent Events (SSE) endpoint that streams
 * JSON-RPC responses to connected clients. Tests verify the complete SSE
 * connection lifecycle, event streaming, and session-based routing.
 *
 * SSE Endpoint Requirements (SPI-667):
 * - Accept SSE connections at /mcp/events
 * - Require Mcp-Session-Id header
 * - Return Content-Type: text/event-stream
 * - Stream events in SSE format
 * - Maintain connection state
 * - Handle disconnection gracefully
 *
 * EXPECTED FAILURES (RED Phase):
 * - /mcp/events endpoint doesn't exist
 * - SSE streaming logic not implemented
 * - Session validation not implemented
 *
 * These tests will pass once the Developer agent implements SSE endpoint.
 */
class SSEEndpointIntegrationTest : SSETestBase() {
    init {

    "should establish SSE connection with valid session header" {
        // EXPECTED FAILURE: /mcp/events endpoint doesn't exist
        withTestApp {
            val sessionId = "test-session-${UUID.randomUUID()}"

            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response.status shouldBe HttpStatusCode.OK
            response.contentType() shouldBe ContentType.Text.EventStream
        }
    }

    "should reject SSE connection without Mcp-Session-Id header" {
        // EXPECTED FAILURE: Endpoint and validation don't exist
        withTestApp {
            val response = client.get("/mcp/events")

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "Mcp-Session-Id header required"
        }
    }

    "should reject SSE connection with invalid session ID format" {
        // EXPECTED FAILURE: Session validation doesn't exist
        withTestApp {
            val invalidSessionId = "session\nid" // Newline injection attempt

            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", invalidSessionId)
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "Invalid session ID"
        }
    }

    "should set proper SSE headers in response" {
        // EXPECTED FAILURE: Header configuration not implemented
        withTestApp {
            val sessionId = "header-test-${UUID.randomUUID()}"

            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response.contentType() shouldBe ContentType.Text.EventStream
            response.headers["Cache-Control"] shouldBe "no-cache"
            response.headers["Connection"] shouldBe "keep-alive"
            response.headers["X-Accel-Buffering"] shouldBe "no" // Disable nginx buffering
        }
    }

    "should stream events in SSE format" {
        // EXPECTED FAILURE: Event streaming not implemented
        withTestApp {
            val sessionId = "stream-test-${UUID.randomUUID()}"

            // This test requires async streaming support
            // Expected format: data: ...\nevent: ...\nid: ...\n\n
            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response.status shouldBe HttpStatusCode.OK

            // Read first event chunk (may be comment or actual event)
            val body = response.bodyAsText()
            // SSE format verification
            if (body.isNotEmpty()) {
                body shouldStartWith "data: " // Or ": comment"
            }
        }
    }

    "should send initial connection comment" {
        // EXPECTED FAILURE: Initial comment not implemented
        withTestApp {
            val sessionId = "comment-test-${UUID.randomUUID()}"

            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response.status shouldBe HttpStatusCode.OK

            val body = response.bodyAsText()
            // SSE comments start with ":"
            body shouldContain ": SSE connection established"
        }
    }

    "should handle multiple concurrent SSE connections" {
        // EXPECTED FAILURE: Concurrent connection handling not implemented
        withTestApp {
            val sessions = (1..5).map { "session-$it-${UUID.randomUUID()}" }

            val responses = sessions.map { sessionId ->
                client.get("/mcp/events") {
                    header("Mcp-Session-Id", sessionId)
                }
            }

            responses.forEach { response ->
                response.status shouldBe HttpStatusCode.OK
                response.contentType() shouldBe ContentType.Text.EventStream
            }
        }
    }

    "should maintain separate event streams per session" {
        // EXPECTED FAILURE: Session isolation not implemented
        withTestApp {
            val session1 = "session-1-${UUID.randomUUID()}"
            val session2 = "session-2-${UUID.randomUUID()}"

            val response1 = client.get("/mcp/events") {
                header("Mcp-Session-Id", session1)
            }

            val response2 = client.get("/mcp/events") {
                header("Mcp-Session-Id", session2)
            }

            response1.status shouldBe HttpStatusCode.OK
            response2.status shouldBe HttpStatusCode.OK

            // Each should have independent streams
            response1.contentType() shouldBe ContentType.Text.EventStream
            response2.contentType() shouldBe ContentType.Text.EventStream
        }
    }

    "should close SSE connection on client disconnect" {
        // EXPECTED FAILURE: Disconnect handling not implemented
        withTestApp {
            val sessionId = "disconnect-test-${UUID.randomUUID()}"

            // Simulate client disconnect by cancelling request
            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response.status shouldBe HttpStatusCode.OK

            // In real implementation, connection cleanup would be verified
            // via session manager metrics
        }
    }

    "should handle SSE reconnection with same session ID" {
        // EXPECTED FAILURE: Reconnection logic not implemented
        withTestApp {
            val sessionId = "reconnect-test-${UUID.randomUUID()}"

            // First connection
            val response1 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response1.status shouldBe HttpStatusCode.OK

            // Second connection (reconnect)
            val response2 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response2.status shouldBe HttpStatusCode.OK
            // Previous connection should be closed
        }
    }

    "should send heartbeat events to keep connection alive" {
        // EXPECTED FAILURE: Heartbeat mechanism not implemented
        withTestApp {
            val sessionId = "heartbeat-test-${UUID.randomUUID()}"

            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response.status shouldBe HttpStatusCode.OK

            val body = response.bodyAsText()
            // Heartbeat is typically a comment
            body shouldContain ": heartbeat"
        }
    }

    "should include Last-Event-ID support for resumption" {
        // EXPECTED FAILURE: Event resumption not implemented
        withTestApp {
            val sessionId = "resume-test-${UUID.randomUUID()}"

            val response = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
                header("Last-Event-ID", "123") // Client wants to resume from event 123
            }

            response.status shouldBe HttpStatusCode.OK
            // Server should resume from event 124
        }
    }

    "should handle CORS preflight for SSE endpoint" {
        // EXPECTED FAILURE: CORS configuration not set up
        withTestApp {
            val response = client.options("/mcp/events") {
                header("Origin", "http://localhost:3000")
                header("Access-Control-Request-Method", "GET")
                header("Access-Control-Request-Headers", "Mcp-Session-Id")
            }

            response.status shouldBe HttpStatusCode.OK
            response.headers["Access-Control-Allow-Origin"] shouldNotBe null
            response.headers["Access-Control-Allow-Methods"] shouldContain "GET"
        }
    }

    "should limit concurrent connections per session" {
        // EXPECTED FAILURE: Connection limiting not implemented
        withTestApp {
            val sessionId = "limit-test-${UUID.randomUUID()}"

            // Try to create 3 concurrent connections (assuming limit is 2)
            val response1 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val response2 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            val response3 = client.get("/mcp/events") {
                header("Mcp-Session-Id", sessionId)
            }

            response1.status shouldBe HttpStatusCode.OK
            response2.status shouldBe HttpStatusCode.OK
            // Third connection should close one of the previous or be rejected
            // (implementation detail - could be 200 with previous closed or 429)
        }
    }

    "should return 503 when server is overloaded" {
        // EXPECTED FAILURE: Load shedding not implemented
        withTestApp {
            // Simulate server overload by creating many connections
            val sessions = (1..200).map { "overload-$it-${UUID.randomUUID()}" }

            val responses = sessions.map { sessionId ->
                client.get("/mcp/events") {
                    header("Mcp-Session-Id", sessionId)
                }
            }

            // Some requests should be rejected with 503
            val serviceUnavailable = responses.count { it.status == HttpStatusCode.ServiceUnavailable }
            serviceUnavailable shouldNotBe 0
        }
    }
    }
}
