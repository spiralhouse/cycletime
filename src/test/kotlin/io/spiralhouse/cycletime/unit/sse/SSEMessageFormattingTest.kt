package io.spiralhouse.cycletime.unit.sse

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldStartWith
import io.kotest.matchers.string.shouldEndWith
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.mcp.sse.SSEEvent
import io.spiralhouse.cycletime.mcp.sse.formatSSEEvent
import io.spiralhouse.cycletime.mcp.sse.formatSSEBatch

/**
 * TDD RED Phase: SSE Message Formatting Unit Tests
 *
 * Tests for Server-Sent Events (SSE) message formatting according to the SSE specification.
 * These tests define the expected behavior for SSE event formatting, including proper
 * field structure, data escaping, and event type handling.
 *
 * SSE Specification: https://html.spec.whatwg.org/multipage/server-sent-events.html
 *
 * EXPECTED FAILURES (RED Phase):
 * - SSEEvent data class doesn't exist yet
 * - formatSSEEvent() function doesn't exist
 * - SSE formatting utilities not implemented
 *
 * These tests will pass once the Developer agent implements SSE formatting logic.
 */
class SSEMessageFormattingTest : StringSpec({

    "should format SSE event with proper structure" {
        // EXPECTED FAILURE: SSEEvent class doesn't exist
        val event = SSEEvent(
            data = """{"jsonrpc":"2.0","result":{"test":"value"},"id":1}""",
            event = "message",
            id = "evt-123"
        )

        val formatted = formatSSEEvent(event)

        // SSE format: data: ...\nevent: ...\nid: ...\n\n
        formatted shouldStartWith "data: "
        formatted shouldContain "\nevent: message\n"
        formatted shouldContain "\nid: evt-123\n"
        formatted shouldEndWith "\n\n"
    }

    "should escape newlines in SSE data field" {
        // EXPECTED FAILURE: formatSSEEvent() doesn't exist
        val multilineData = """{"line1":"value1",
            "line2":"value2"}"""

        val event = SSEEvent(data = multilineData)
        val formatted = formatSSEEvent(event)

        // Each line should be prefixed with "data: "
        formatted shouldContain "data: "
        // Should not contain raw newlines in data content
        val dataLines = formatted.lines().filter { it.startsWith("data: ") }
        dataLines.size shouldBe 2
    }

    "should include event type and id in SSE format" {
        // EXPECTED FAILURE: SSE formatting logic doesn't exist
        val event = SSEEvent(
            data = "test data",
            event = "custom-event",
            id = "12345"
        )

        val formatted = formatSSEEvent(event)

        formatted shouldContain "event: custom-event\n"
        formatted shouldContain "id: 12345\n"
        formatted shouldContain "data: test data\n"
    }

    "should format minimal SSE event with data only" {
        // EXPECTED FAILURE: SSEEvent class doesn't exist
        val event = SSEEvent(data = "simple message")

        val formatted = formatSSEEvent(event)

        formatted shouldBe "data: simple message\n\n"
    }

    "should handle empty data field" {
        // EXPECTED FAILURE: Edge case handling not implemented
        val event = SSEEvent(data = "")

        val formatted = formatSSEEvent(event)

        formatted shouldBe "data: \n\n"
    }

    "should format SSE event with comment field" {
        // EXPECTED FAILURE: Comment field support not implemented
        val event = SSEEvent(
            data = "test",
            comment = "This is a comment for debugging"
        )

        val formatted = formatSSEEvent(event)

        formatted shouldContain ": This is a comment for debugging\n"
        formatted shouldContain "data: test\n"
    }

    "should format SSE event with retry field" {
        // EXPECTED FAILURE: Retry field support not implemented
        val event = SSEEvent(
            data = "test",
            retry = 5000
        )

        val formatted = formatSSEEvent(event)

        formatted shouldContain "retry: 5000\n"
        formatted shouldContain "data: test\n"
    }

    "should validate SSE event type naming conventions" {
        // EXPECTED FAILURE: Validation logic doesn't exist
        shouldThrow<IllegalArgumentException> {
            SSEEvent(
                data = "test",
                event = "invalid event" // Spaces not allowed in event type
            )
        }
    }

    "should handle JSON-RPC response in SSE data field" {
        // EXPECTED FAILURE: Integration with JSON-RPC not implemented
        val jsonRpcResponse = """{"jsonrpc":"2.0","result":{"tools":[{"name":"test"}]},"id":1}"""

        val event = SSEEvent(
            data = jsonRpcResponse,
            event = "rpc-response",
            id = "rpc-1"
        )

        val formatted = formatSSEEvent(event)

        formatted shouldContain "event: rpc-response\n"
        formatted shouldContain "id: rpc-1\n"
        formatted shouldContain "data: $jsonRpcResponse\n"
        formatted shouldEndWith "\n\n"
    }

    "should escape special characters in SSE fields" {
        // EXPECTED FAILURE: Special character escaping not implemented
        val event = SSEEvent(
            data = "data with: colon",
            event = "test-event",
            id = "id:with:colons"
        )

        val formatted = formatSSEEvent(event)

        // All fields should be properly formatted
        formatted shouldContain "data: data with: colon\n"
        formatted shouldContain "event: test-event\n"
        formatted shouldContain "id: id:with:colons\n"
    }

    "should create SSE event from JSON-RPC response" {
        // EXPECTED FAILURE: SSEEvent factory methods don't exist
        val jsonRpcId = 42
        val jsonRpcResponse = """{"jsonrpc":"2.0","result":"success","id":$jsonRpcId}"""

        val event = SSEEvent.fromJsonRpcResponse(jsonRpcResponse, jsonRpcId.toString())

        event.data shouldBe jsonRpcResponse
        event.id shouldBe jsonRpcId.toString()
        event.event shouldBe "message" // Default event type
    }

    "should batch multiple SSE events with proper separation" {
        // EXPECTED FAILURE: Batch formatting not implemented
        val events = listOf(
            SSEEvent(data = "event1", id = "1"),
            SSEEvent(data = "event2", id = "2"),
            SSEEvent(data = "event3", id = "3")
        )

        val batched = formatSSEBatch(events)

        // Each event should be properly terminated
        batched shouldContain "data: event1\nid: 1\n\n"
        batched shouldContain "data: event2\nid: 2\n\n"
        batched shouldContain "data: event3\nid: 3\n\n"
    }
})

// Implementations now provided by io.spiralhouse.cycletime.mcp.sse package
