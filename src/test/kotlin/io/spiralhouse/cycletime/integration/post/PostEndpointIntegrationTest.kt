package io.spiralhouse.cycletime.integration.post

import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.cycletime.integration.sse.SSETestBase
import kotlinx.serialization.json.*
import java.util.UUID

/**
 * TDD RED Phase: POST Endpoint Integration Tests
 *
 * Integration tests for the HTTP POST endpoint that receives JSON-RPC requests.
 * Tests verify request handling, session validation, and response correlation
 * with the SSE event stream.
 *
 * POST Endpoint Requirements (SPI-668):
 * - Accept POST requests at /mcp
 * - Require Mcp-Session-Id header
 * - Parse JSON-RPC 2.0 requests
 * - Return 202 Accepted (async processing)
 * - Publish responses to SSE stream
 *
 * EXPECTED FAILURES (RED Phase):
 * - /mcp POST endpoint doesn't exist
 * - Request parsing not implemented
 * - Session validation not implemented
 * - Response publishing not implemented
 *
 * These tests will pass once the Developer agent implements POST endpoint.
 */
class PostEndpointIntegrationTest : SSETestBase() {
    init {

    "should process POST request with valid session header" {
        // EXPECTED FAILURE: /mcp POST endpoint doesn't exist
        withTestApp {
            val sessionId = "test-session-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            response.status shouldBe HttpStatusCode.Accepted // 202 Accepted
        }
    }

    "should reject POST request without Mcp-Session-Id header" {
        // EXPECTED FAILURE: Endpoint and validation don't exist
        withTestApp {
            val response = client.post("/mcp") {
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "Mcp-Session-Id"
        }
    }

    "should validate Content-Type header" {
        // EXPECTED FAILURE: Content-Type validation doesn't exist
        withTestApp {
            val sessionId = "content-type-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Text.Plain) // Wrong content type
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":1}""")
            }

            response.status shouldBe HttpStatusCode.UnsupportedMediaType
        }
    }

    "should handle malformed JSON in POST body" {
        // EXPECTED FAILURE: JSON parsing error handling doesn't exist
        withTestApp {
            val sessionId = "malformed-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"invalid json""")
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "parse error"
        }
    }

    "should validate JSON-RPC 2.0 format" {
        // EXPECTED FAILURE: JSON-RPC validation doesn't exist
        withTestApp {
            val sessionId = "validation-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"method":"test","id":1}""") // Missing jsonrpc field
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "jsonrpc"
        }
    }

    "should accept valid initialize request" {
        // EXPECTED FAILURE: Request routing not implemented
        withTestApp {
            val sessionId = "init-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""
                    {
                        "jsonrpc":"2.0",
                        "method":"initialize",
                        "params":{
                            "protocolVersion":"2024-11-05",
                            "clientInfo":{"name":"test","version":"1.0"}
                        },
                        "id":1
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.Accepted
        }
    }

    "should accept tools/list request" {
        // EXPECTED FAILURE: Tool method routing not implemented
        withTestApp {
            val sessionId = "tools-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"tools/list","id":2}""")
            }

            response.status shouldBe HttpStatusCode.Accepted
        }
    }

    "should accept tools/call request with arguments" {
        // EXPECTED FAILURE: Tool call handling not implemented
        withTestApp {
            val sessionId = "tool-call-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""
                    {
                        "jsonrpc":"2.0",
                        "method":"tools/call",
                        "params":{
                            "name":"create_project",
                            "arguments":{"name":"Test Project"}
                        },
                        "id":3
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.Accepted
        }
    }

    "should accept resources/list request" {
        // EXPECTED FAILURE: Resource method routing not implemented
        withTestApp {
            val sessionId = "resources-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"resources/list","id":4}""")
            }

            response.status shouldBe HttpStatusCode.Accepted
        }
    }

    "should handle notification requests (no id)" {
        // EXPECTED FAILURE: Notification handling not implemented
        withTestApp {
            val sessionId = "notify-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"notifications/cancelled"}""")
            }

            // Notifications still return 202 but no response is queued
            response.status shouldBe HttpStatusCode.Accepted
        }
    }

    "should reject unknown JSON-RPC methods" {
        // EXPECTED FAILURE: Method validation not implemented
        withTestApp {
            val sessionId = "unknown-method-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"unknown/method","id":5}""")
            }

            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "unknown method"
        }
    }

    "should handle concurrent POST requests to same session" {
        // EXPECTED FAILURE: Concurrent request handling not implemented
        withTestApp {
            val sessionId = "concurrent-test-${UUID.randomUUID()}"

            val responses = (1..10).map { index ->
                client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":$index}""")
                }
            }

            responses.forEach { response ->
                response.status shouldBe HttpStatusCode.Accepted
            }
        }
    }

    "should validate request body size limits" {
        // EXPECTED FAILURE: Size limit validation not implemented
        withTestApp {
            val sessionId = "size-test-${UUID.randomUUID()}"
            val largePayload = "x".repeat(10_000_000) // 10MB

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"test","params":{"data":"$largePayload"},"id":1}""")
            }

            response.status shouldBe HttpStatusCode.PayloadTooLarge
        }
    }

    "should return appropriate error for method not found" {
        // EXPECTED FAILURE: Error response handling not implemented
        withTestApp {
            val sessionId = "error-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""{"jsonrpc":"2.0","method":"nonexistent/method","id":6}""")
            }

            // Error should be queued to SSE stream, POST still returns 202
            response.status shouldBe HttpStatusCode.Accepted
        }
    }

    "should handle batch JSON-RPC requests" {
        // EXPECTED FAILURE: Batch request handling not implemented
        withTestApp {
            val sessionId = "batch-test-${UUID.randomUUID()}"

            val response = client.post("/mcp") {
                header("Mcp-Session-Id", sessionId)
                contentType(ContentType.Application.Json)
                setBody("""
                    [
                        {"jsonrpc":"2.0","method":"tools/list","id":1},
                        {"jsonrpc":"2.0","method":"resources/list","id":2}
                    ]
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.Accepted
        }
    }

    "should handle CORS preflight for POST endpoint" {
        // EXPECTED FAILURE: CORS configuration not set up
        withTestApp {
            val response = client.options("/mcp") {
                header("Origin", "http://localhost:3000")
                header("Access-Control-Request-Method", "POST")
                header("Access-Control-Request-Headers", "Mcp-Session-Id, Content-Type")
            }

            response.status shouldBe HttpStatusCode.OK
            response.headers["Access-Control-Allow-Origin"] shouldNotBe null
            response.headers["Access-Control-Allow-Methods"] shouldContain "POST"
        }
    }

    "should rate limit requests per session" {
        // EXPECTED FAILURE: Rate limiting not implemented
        withTestApp {
            val sessionId = "rate-limit-test-${UUID.randomUUID()}"

            // Send 100 requests rapidly
            val responses = (1..100).map { index ->
                client.post("/mcp") {
                    header("Mcp-Session-Id", sessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","method":"tools/list","id":$index}""")
                }
            }

            // Some should be rate limited
            val rateLimited = responses.count { it.status == HttpStatusCode.TooManyRequests }
            rateLimited shouldNotBe 0
        }
    }
    }
}
