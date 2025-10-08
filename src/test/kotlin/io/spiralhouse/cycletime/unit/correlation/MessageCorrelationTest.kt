package io.spiralhouse.cycletime.unit.correlation

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.mcp.correlation.*
import io.spiralhouse.cycletime.mcp.sse.SSEEvent
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcError
import kotlinx.serialization.json.*
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.milliseconds

// Alias for test compatibility
typealias ServerSentEvent = SSEEvent

/**
 * TDD RED Phase: Message Correlation Unit Tests
 *
 * Tests for correlating JSON-RPC requests (via POST) with responses (via SSE).
 * This is a critical component of the SSE transport that ensures each session
 * receives only its own responses.
 *
 * Message Correlation Requirements (SPI-670):
 * - Match request ID with response ID
 * - Queue events for correct session
 * - Handle concurrent event publishing
 * - Prevent event leakage between sessions
 * - Support async request/response patterns
 *
 * EXPECTED FAILURES (RED Phase):
 * - EventBus class doesn't exist
 * - Message correlation logic not implemented
 * - Event queue management not implemented
 *
 * These tests will pass once the Developer agent implements correlation logic.
 */
class MessageCorrelationTest : StringSpec({

    "should match request ID with response ID" {
        // EXPECTED FAILURE: correlateResponse() doesn't exist
        val requestId = JsonPrimitive("req-123")
        val responseData = JsonObject(mapOf("result" to JsonPrimitive("success")))

        val response = correlateResponse(requestId, responseData)

        response.id shouldBe requestId
        response.result shouldBe responseData
    }

    "should queue events for correct session" {
        // EXPECTED FAILURE: EventBus class doesn't exist
        val eventBus = EventBus()
        val sessionId = "session-1"
        val event = ServerSentEvent(
            data = """{"jsonrpc":"2.0","result":"test","id":1}""",
            id = "evt-1"
        )

        eventBus.publish(sessionId, event)

        val events = eventBus.getEvents(sessionId)
        events shouldHaveSize 1
        events[0] shouldBe event
    }

    "should not leak events to other sessions" {
        // EXPECTED FAILURE: Event isolation not implemented
        val eventBus = EventBus()
        val session1 = "session-1"
        val session2 = "session-2"

        val event1 = ServerSentEvent(data = "data for session 1", id = "1")

        eventBus.publish(session1, event1)

        eventBus.getEvents(session1) shouldHaveSize 1
        eventBus.getEvents(session2).shouldBeEmpty()
    }

    "should handle concurrent event publishing" {
        // EXPECTED FAILURE: Thread-safety not implemented
        runTest {
            val eventBus = EventBus()
            val sessionId = "concurrent-test"

            // Publish 100 events concurrently
            repeat(100) { index ->
                launch {
                    eventBus.publish(
                        sessionId,
                        ServerSentEvent(data = "event-$index", id = index.toString())
                    )
                }
            }

            // Wait for all coroutines to complete
            delay(100)

            val events = eventBus.getEvents(sessionId)
            events shouldHaveSize 100
        }
    }

    "should correlate multiple requests with their responses" {
        // EXPECTED FAILURE: Multi-request correlation not implemented
        val correlator = MessageCorrelator(MockTimeProvider())
        val sessionId = "multi-req-session"

        // Register multiple pending requests
        correlator.registerPendingRequest(sessionId, JsonPrimitive(1), "tools/list")
        correlator.registerPendingRequest(sessionId, JsonPrimitive(2), "resources/list")
        correlator.registerPendingRequest(sessionId, JsonPrimitive(3), "tools/call")

        // Create responses
        val response1 = JsonObject(mapOf("result" to JsonArray(listOf())))
        val response2 = JsonObject(mapOf("result" to JsonArray(listOf())))
        val response3 = JsonObject(mapOf("result" to JsonPrimitive("success")))

        // Correlate responses
        correlator.correlate(sessionId, JsonPrimitive(2), response2)
        correlator.correlate(sessionId, JsonPrimitive(1), response1)
        correlator.correlate(sessionId, JsonPrimitive(3), response3)

        // All requests should be resolved
        correlator.hasPendingRequests(sessionId) shouldBe false
    }

    "should track pending requests per session" {
        // EXPECTED FAILURE: Request tracking not implemented
        val correlator = MessageCorrelator(MockTimeProvider())

        correlator.registerPendingRequest("session-1", JsonPrimitive(1), "test")
        correlator.registerPendingRequest("session-1", JsonPrimitive(2), "test")
        correlator.registerPendingRequest("session-2", JsonPrimitive(1), "test")

        correlator.getPendingCount("session-1") shouldBe 2
        correlator.getPendingCount("session-2") shouldBe 1
    }

    "should remove resolved requests from pending queue" {
        // EXPECTED FAILURE: Queue management not implemented
        val correlator = MessageCorrelator(MockTimeProvider())
        val sessionId = "resolve-test"

        correlator.registerPendingRequest(sessionId, JsonPrimitive(1), "test")
        correlator.correlate(sessionId, JsonPrimitive(1), JsonObject(mapOf()))

        correlator.getPendingCount(sessionId) shouldBe 0
    }

    "should handle out-of-order responses" {
        // EXPECTED FAILURE: Out-of-order handling not implemented
        val correlator = MessageCorrelator(MockTimeProvider())
        val sessionId = "ooo-test"

        // Register requests in order 1, 2, 3
        correlator.registerPendingRequest(sessionId, JsonPrimitive(1), "test1")
        correlator.registerPendingRequest(sessionId, JsonPrimitive(2), "test2")
        correlator.registerPendingRequest(sessionId, JsonPrimitive(3), "test3")

        // Receive responses out of order: 3, 1, 2
        correlator.correlate(sessionId, JsonPrimitive(3), JsonObject(mapOf("order" to JsonPrimitive(3))))
        correlator.correlate(sessionId, JsonPrimitive(1), JsonObject(mapOf("order" to JsonPrimitive(1))))
        correlator.correlate(sessionId, JsonPrimitive(2), JsonObject(mapOf("order" to JsonPrimitive(2))))

        // All should be resolved
        correlator.hasPendingRequests(sessionId) shouldBe false
    }

    "should timeout stale pending requests" {
        // EXPECTED FAILURE: Request timeout not implemented
        val mockTimeProvider = MockTimeProvider()
        val correlator = MessageCorrelator(mockTimeProvider, requestTimeout = 100.milliseconds)
        val sessionId = "timeout-test"

        correlator.registerPendingRequest(sessionId, JsonPrimitive(1), "slow_method")

        mockTimeProvider.advance(150.milliseconds) // Advance time past timeout

        correlator.cleanupStaleRequests()

        correlator.hasPendingRequests(sessionId) shouldBe false
    }

    "should support notification correlation (no response expected)" {
        // EXPECTED FAILURE: Notification handling not implemented
        val correlator = MessageCorrelator(MockTimeProvider())
        val sessionId = "notify-test"

        // Notifications have null ID
        correlator.registerPendingRequest(sessionId, null, "notifications/cancelled")

        // Notifications don't wait for response
        correlator.isNotification(null) shouldBe true
        correlator.hasPendingRequests(sessionId) shouldBe false
    }

    "should create JSON-RPC response with correlated ID" {
        // EXPECTED FAILURE: Response creation not implemented
        val requestId = JsonPrimitive("create-resp-123")
        val result = JsonObject(mapOf("status" to JsonPrimitive("ok")))

        val response = createJsonRpcResponse(requestId, result)

        response.jsonrpc shouldBe "2.0"
        response.id shouldBe requestId
        response.result shouldBe result
        response.error shouldBe null
    }

    "should create JSON-RPC error response with correlated ID" {
        // EXPECTED FAILURE: Error response creation not implemented
        val requestId = JsonPrimitive("error-resp-456")

        val response = createJsonRpcError(
            requestId,
            code = -32601,
            message = "Method not found"
        )

        response.jsonrpc shouldBe "2.0"
        response.id shouldBe requestId
        response.error shouldNotBe null
        response.error!!.code shouldBe -32601
        response.result shouldBe null
    }

    "should detect duplicate request IDs within session" {
        // EXPECTED FAILURE: Duplicate detection not implemented
        val correlator = MessageCorrelator(MockTimeProvider())
        val sessionId = "dup-test"

        correlator.registerPendingRequest(sessionId, JsonPrimitive(1), "test")

        shouldThrow<DuplicateRequestIdException> {
            correlator.registerPendingRequest(sessionId, JsonPrimitive(1), "test")
        }
    }

    "should allow same request ID in different sessions" {
        // EXPECTED FAILURE: Session isolation not verified
        val correlator = MessageCorrelator(MockTimeProvider())

        // Same ID in different sessions is OK
        correlator.registerPendingRequest("session-1", JsonPrimitive(1), "test")
        correlator.registerPendingRequest("session-2", JsonPrimitive(1), "test")

        correlator.getPendingCount("session-1") shouldBe 1
        correlator.getPendingCount("session-2") shouldBe 1
    }

    "should clear all pending requests for session on disconnect" {
        // EXPECTED FAILURE: Session cleanup not implemented
        val correlator = MessageCorrelator(MockTimeProvider())
        val sessionId = "disconnect-cleanup"

        correlator.registerPendingRequest(sessionId, JsonPrimitive(1), "test1")
        correlator.registerPendingRequest(sessionId, JsonPrimitive(2), "test2")
        correlator.registerPendingRequest(sessionId, JsonPrimitive(3), "test3")

        correlator.clearSession(sessionId)

        correlator.getPendingCount(sessionId) shouldBe 0
    }

    "should provide request metadata for debugging" {
        // EXPECTED FAILURE: Metadata tracking not implemented
        val correlator = MessageCorrelator(MockTimeProvider())
        val sessionId = "metadata-test"

        correlator.registerPendingRequest(
            sessionId,
            JsonPrimitive(1),
            "tools/call",
            metadata = mapOf("toolName" to "create_project")
        )

        val metadata = correlator.getRequestMetadata(sessionId, JsonPrimitive(1))
        metadata shouldNotBe null
        metadata!!["toolName"] shouldBe "create_project"
    }
})

// Implementations now provided by io.spiralhouse.cycletime.mcp.correlation package
