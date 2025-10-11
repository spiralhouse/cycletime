package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.comparables.shouldBeGreaterThan
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.ktor.utils.io.*
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper.configureTestApplication
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*
import java.util.UUID

/**
 * TDD RED PHASE - Comprehensive integration tests for MCP session initialization bootstrap flows.
 *
 * **ISSUE**: SPI-689 - MCP client fails to connect to CycleTime
 *
 * **ROOT CAUSE**: Session bootstrap chicken-and-egg bug:
 * - POST handler (MCPPostHandler.kt:39) requires Mcp-Session-Id header BEFORE parsing requests
 * - SSE handler (MCPSSEHandler.kt:35) requires Mcp-Session-Id header BEFORE establishing connection
 * - This makes it impossible for clients to obtain a session ID
 *
 * **MCP PROTOCOL REQUIREMENT** (Spec 2024-11-05):
 * > "The server MUST accept `initialize` requests without requiring a session identifier.
 * > Upon successful initialization, the server assigns a session ID and returns it in the response."
 *
 * **EXPECTED BEHAVIOR**:
 * 1. POST initialize without session → Server generates session ID and returns in response
 * 2. SSE connect without session → Server generates session ID and sends as first event
 * 3. Subsequent requests → Must include session ID from initialization
 *
 * **BOOTSTRAP PATTERNS TO SUPPORT**:
 * - **POST-First Bootstrap** (Modern): POST initialize → receive session ID → use in subsequent requests
 * - **SSE-First Bootstrap** (Legacy): Connect SSE → receive session ID in first event → use in POST requests
 *
 * **FILES REQUIRING CHANGES**:
 * - MCPPostHandler.kt:39 - Validate session AFTER parsing (allow initialize without session)
 * - MCPSSEHandler.kt:35 - Generate session if not provided (allow connection without session)
 * - McpMethodHandler.kt:115-164 - Return session ID in initialize response
 *
 * All tests in this suite are expected to FAIL initially, demonstrating the bug.
 * Tests will pass after implementing the GREEN phase fixes.
 */
class SessionBootstrapIntegrationTest : DescribeSpec({

    describe("POST Initialize Bootstrap (Modern Flow)") {

        it("POST initialize without Mcp-Session-Id should return 202 Accepted with session ID") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_1")

                val response = client.post("/mcp") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": "initialize",
                            "params": {
                                "protocolVersion": "2024-11-05",
                                "capabilities": {},
                                "clientInfo": {
                                    "name": "test-client",
                                    "version": "1.0.0"
                                }
                            }
                        }
                    """.trimIndent())
                }

                // EXPECTED BEHAVIOR (currently FAILS with 400 Bad Request):
                // - Server should accept initialize request without session ID
                // - Server should generate new session ID
                // - Server should return session ID in response

                response.status shouldBe HttpStatusCode.Accepted

                val responseBody = Json.decodeFromString<JsonRpcResponse>(response.bodyAsText())
                responseBody.error shouldBe null
                responseBody.result shouldNotBe null

                val result = responseBody.result as JsonObject
                result["sessionId"] shouldNotBe null
                result["sessionId"]?.jsonPrimitive?.content?.isNotBlank() shouldBe true
                result["protocolVersion"]?.jsonPrimitive?.content shouldBe "2024-11-05"
            }
        }

        it("POST initialize with Mcp-Session-Id should use provided session ID") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_2")

                val clientSessionId = UUID.randomUUID().toString()

                val response = client.post("/mcp") {
                    header("Mcp-Session-Id", clientSessionId)
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": "initialize",
                            "params": {
                                "protocolVersion": "2024-11-05",
                                "capabilities": {}
                            }
                        }
                    """.trimIndent())
                }

                // EXPECTED BEHAVIOR:
                // - Server should accept client-provided session ID
                // - Server should return same session ID in response

                response.status shouldBe HttpStatusCode.Accepted

                val result = Json.decodeFromString<JsonRpcResponse>(response.bodyAsText()).result as JsonObject
                result["sessionId"]?.jsonPrimitive?.content shouldBe clientSessionId
            }
        }

        it("POST initialize should generate valid UUID v4 session ID") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_3")

                val response = client.post("/mcp") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}""")
                }

                // EXPECTED BEHAVIOR (currently FAILS):
                // - Server should generate valid UUID v4 format session ID

                val result = Json.decodeFromString<JsonRpcResponse>(response.bodyAsText()).result as JsonObject
                val sessionId = result["sessionId"]?.jsonPrimitive?.content

                // Validate UUID format
                sessionId shouldNotBe null
                UUID.fromString(sessionId!!) // Should not throw exception
            }
        }
    }

    describe("POST Non-Initialize Validation (Security)") {

        it("POST tools/list without Mcp-Session-Id should return 400 Bad Request") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_4")

                val response = client.post("/mcp") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}""")
                }

                // EXPECTED BEHAVIOR (currently returns 400, should continue):
                // - Non-initialize methods MUST require session ID
                // - Should return 400 Bad Request for missing session

                response.status shouldBe HttpStatusCode.BadRequest
                response.bodyAsText() shouldContain "Mcp-Session-Id"
            }
        }

        it("POST with empty Mcp-Session-Id should return 400 Bad Request") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_5")

                val response = client.post("/mcp") {
                    header("Mcp-Session-Id", "")
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}""")
                }

                // EXPECTED BEHAVIOR:
                // - Empty session ID should be rejected
                // - Should return 400 Bad Request

                response.status shouldBe HttpStatusCode.BadRequest
            }
        }
    }

    describe("SSE Connection Bootstrap (Legacy Flow)") {

        it("SSE connection without Mcp-Session-Id should generate session ID and send as first event") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_6")

                val events = mutableListOf<String>()

                client.prepareGet("/mcp/events") {
                    header("Accept", "text/event-stream")
                }.execute { response ->
                    // EXPECTED BEHAVIOR (currently FAILS with 400 Bad Request):
                    // - Server should accept SSE connection without session ID
                    // - Server should generate new session ID
                    // - Server should send session ID as first SSE event

                    response.status shouldBe HttpStatusCode.OK
                    response.contentType()?.contentType shouldBe "text"
                    response.contentType()?.contentSubtype shouldBe "event-stream"

                    // Read first SSE event (endpoint event per MCP spec)
                    val channel = response.bodyAsChannel()
                    val firstEvent = channel.readSSEEvent()

                    // Validate first event is endpoint event (MCP spec requirement)
                    firstEvent.isNotBlank() shouldBe true
                    firstEvent shouldContain "event: endpoint"
                    firstEvent shouldContain "/mcp"

                    // Read second SSE event (session event)
                    val secondEvent = channel.readSSEEvent()
                    secondEvent shouldContain "event: session"
                    secondEvent shouldContain "sessionId"

                    // Extract and validate session ID format
                    val sessionId = extractSessionIdFromSSEEvent(secondEvent)
                    sessionId shouldNotBe null
                    UUID.fromString(sessionId!!) // Should not throw
                }
            }
        }

        it("SSE connection with Mcp-Session-Id should use provided session ID") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_7")

                val existingSessionId = UUID.randomUUID().toString()

                client.prepareGet("/mcp/events") {
                    header("Accept", "text/event-stream")
                    header("Mcp-Session-Id", existingSessionId)
                }.execute { response ->
                    // EXPECTED BEHAVIOR:
                    // - Server should accept provided session ID
                    // - Server should use existing session ID

                    response.status shouldBe HttpStatusCode.OK

                    // Read first event (endpoint event per MCP spec)
                    val channel = response.bodyAsChannel()
                    val firstEvent = channel.readSSEEvent()
                    firstEvent shouldContain "event: endpoint"

                    // Read second event (session event with session ID)
                    val secondEvent = channel.readSSEEvent()
                    secondEvent shouldContain existingSessionId
                }
            }
        }
    }

    describe("Complete Bootstrap Flows (End-to-End)") {

        it("should complete SSE-first bootstrap flow: connect SSE → capture session → use in POST") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_8")

                // Step 1: Connect to SSE and capture session ID
                var capturedSessionId: String? = null

                val sseJob = launch {
                    client.prepareGet("/mcp/events").execute { response ->
                        val channel = response.bodyAsChannel()

                        // First event: endpoint event (MCP spec)
                        val firstEvent = channel.readSSEEvent()
                        // Verify it's the endpoint event
                        firstEvent shouldContain "event: endpoint"

                        // Second event: session event
                        val secondEvent = channel.readSSEEvent()
                        if (secondEvent.contains("sessionId")) {
                            capturedSessionId = extractSessionIdFromSSEEvent(secondEvent)
                        }
                    }
                }

                // Wait for session ID
                sseJob.join()
                capturedSessionId shouldNotBe null

                // Step 2: Use captured session ID in POST request
                val postResponse = client.post("/mcp") {
                    header("Mcp-Session-Id", capturedSessionId!!)
                    contentType(ContentType.Application.Json)
                    setBody("""{"jsonrpc":"2.0","id":10,"method":"tools/list","params":{}}""")
                }

                // EXPECTED BEHAVIOR (currently FAILS at step 1):
                // - SSE connection should succeed without session
                // - Session ID should be captured from first event
                // - POST request should succeed with captured session ID

                postResponse.status shouldBe HttpStatusCode.Accepted
            }
        }

        it("should complete POST-first bootstrap flow: initialize → capture session → connect SSE") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_9")

                // Step 1: POST initialize and capture session ID
                val initResponse = client.post("/mcp") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": "initialize",
                            "params": {
                                "protocolVersion": "2024-11-05",
                                "capabilities": {}
                            }
                        }
                    """.trimIndent())
                }

                // EXPECTED BEHAVIOR (currently FAILS at step 1):
                // - Initialize request should succeed without session
                // - Response should include generated session ID

                initResponse.status shouldBe HttpStatusCode.Accepted

                val result = Json.decodeFromString<JsonRpcResponse>(initResponse.bodyAsText()).result as JsonObject
                val sessionId = result["sessionId"]?.jsonPrimitive?.content
                sessionId shouldNotBe null

                // Step 2: Use session ID to connect SSE
                client.prepareGet("/mcp/events") {
                    header("Accept", "text/event-stream")
                    header("Mcp-Session-Id", sessionId!!)
                }.execute { response ->
                    // EXPECTED BEHAVIOR:
                    // - SSE connection should succeed with session ID

                    response.status shouldBe HttpStatusCode.OK
                    response.contentType()?.contentType shouldBe "text"
                }
            }
        }
    }

    describe("Edge Cases and Error Scenarios") {

        it("should handle concurrent initialize requests without collision") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_10")

                val sessionIds = mutableSetOf<String>()

                // Launch 10 concurrent initialize requests
                val jobs = (1..10).map { requestId ->
                    async {
                        val response = client.post("/mcp") {
                            contentType(ContentType.Application.Json)
                            setBody("""{"jsonrpc":"2.0","id":$requestId,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}""")
                        }

                        val result = Json.decodeFromString<JsonRpcResponse>(response.bodyAsText()).result as JsonObject
                        result["sessionId"]?.jsonPrimitive?.content
                    }
                }

                // EXPECTED BEHAVIOR (currently FAILS):
                // - All requests should succeed
                // - All session IDs should be unique

                jobs.awaitAll().forEach { sessionId ->
                    sessionId shouldNotBe null
                    sessionIds.add(sessionId!!)
                }

                // All session IDs should be unique
                sessionIds.size shouldBe 10
            }
        }

        it("POST initialize with invalid protocol version should return error") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_11")

                val response = client.post("/mcp") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": "initialize",
                            "params": {
                                "protocolVersion": "1.0.0",
                                "capabilities": {}
                            }
                        }
                    """.trimIndent())
                }

                // EXPECTED BEHAVIOR (currently FAILS at validation stage):
                // - Should accept request even without session
                // - Should return error in response for invalid protocol version

                response.status shouldBe HttpStatusCode.Accepted

                val jsonResponse = Json.decodeFromString<JsonRpcResponse>(response.bodyAsText())
                jsonResponse.error shouldNotBe null
                jsonResponse.error?.code shouldBe -32602 // Invalid params
            }
        }

        it("POST with malformed JSON should return 400 Bad Request") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_12")

                val response = client.post("/mcp") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"invalid json""")
                }

                // EXPECTED BEHAVIOR:
                // - Malformed JSON should be rejected early
                // - Should return 400 Bad Request

                response.status shouldBe HttpStatusCode.BadRequest
            }
        }

        it("POST initialize without required parameters should return error") {
            testApplication {
                configureTestApplication(testName = "bootstrap_test_13")

                val response = client.post("/mcp") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": "initialize",
                            "params": {}
                        }
                    """.trimIndent())
                }

                // EXPECTED BEHAVIOR (currently FAILS at validation stage):
                // - Should accept request even without session
                // - Should return error for missing required parameters

                response.status shouldBe HttpStatusCode.Accepted

                val jsonResponse = Json.decodeFromString<JsonRpcResponse>(response.bodyAsText())
                jsonResponse.error shouldNotBe null
                jsonResponse.error?.code shouldBe -32602 // Invalid params
                jsonResponse.error?.message shouldContain "protocolVersion"
            }
        }
    }
})

// ===== Helper Functions =====

/**
 * Read a single SSE event from the channel.
 * An SSE event ends with a blank line (double newline).
 */
private suspend fun ByteReadChannel.readSSEEvent(): String {
    val eventBuilder = StringBuilder()
    while (!isClosedForRead) {
        val line = readUTF8Line() ?: break
        if (line.isEmpty() && eventBuilder.isNotEmpty()) {
            break // End of event
        }
        eventBuilder.appendLine(line)
    }
    return eventBuilder.toString()
}

/**
 * Extract session ID from SSE event data.
 * Expected format: data: {"sessionId":"..."}
 */
private fun extractSessionIdFromSSEEvent(event: String): String? {
    val match = Regex(""""sessionId":"([^"]+)"""").find(event)
    return match?.groupValues?.get(1)
}

/**
 * Extract session ID from JSON-RPC response body.
 */
private fun extractSessionIdFromResponse(responseBody: String): String? {
    val response = Json.decodeFromString<JsonRpcResponse>(responseBody)
    val result = response.result as? JsonObject
    return result?.get("sessionId")?.jsonPrimitive?.content
}
