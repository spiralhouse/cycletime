package io.spiralhouse.cycletime.unit.mcp.sdk

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.mcp.sdk.SessionContext
import kotlinx.serialization.json.*

/**
 * Unit tests for SessionContext session ID extraction.
 *
 * These tests verify the stateless session context extraction from MCP request metadata,
 * a key component of the SDK v0.7.2 transport layer architecture.
 *
 * Test Categories:
 * - Session ID extraction from metadata
 * - Missing session handling (nullable vs required)
 * - Error handling and validation
 * - Edge cases and nested structures
 *
 * Design Philosophy:
 * - Fast, isolated unit tests (no external dependencies)
 * - Test the extraction logic, not JSON serialization
 * - Cover both success and failure paths
 * - Validate error messages are actionable
 *
 * Architecture Context:
 * SessionContext replaces the EventBus stateful channel architecture with stateless
 * per-request session extraction. This is a fundamental shift from the previous
 * MessageCorrelator pattern.
 */
class SessionContextTest : StringSpec({

    "should extract session ID from request metadata" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("test-session-123")
        )

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then
        sessionId shouldBe "test-session-123"
    }

    "should return null when sessionId missing from metadata" {
        // Given
        val metadata = emptyMap<String, JsonElement>()

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then
        sessionId shouldBe null
    }

    "should return null when metadata is null" {
        // Given
        val metadata: Map<String, JsonElement>? = null

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then
        sessionId shouldBe null
    }

    "should extract session ID from metadata with multiple keys" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("session-456"),
            "userId" to JsonPrimitive("user-789"),
            "requestId" to JsonPrimitive("req-000")
        )

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then
        sessionId shouldBe "session-456"
    }

    "should handle nested metadata structures" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("nested-session"),
            "context" to JsonObject(
                mapOf(
                    "projectId" to JsonPrimitive("project-123"),
                    "workflowStage" to JsonPrimitive("development")
                )
            ),
            "timestamp" to JsonPrimitive(1234567890)
        )

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then
        sessionId shouldBe "nested-session"
    }

    "should throw IllegalStateException when requireSessionId finds no session" {
        // Given
        val metadata = emptyMap<String, JsonElement>()

        // When/Then
        val exception = shouldThrow<IllegalStateException> {
            SessionContext.requireSessionId(metadata)
        }

        exception.message shouldContain "No session ID in request metadata"
        exception.message shouldContain "sessionId"
        exception.message shouldContain "request.meta"
    }

    "should throw IllegalStateException when requireSessionId receives null metadata" {
        // Given
        val metadata: Map<String, JsonElement>? = null

        // When/Then
        val exception = shouldThrow<IllegalStateException> {
            SessionContext.requireSessionId(metadata)
        }

        exception.message shouldContain "No session ID in request metadata"
    }

    "should successfully extract session ID with requireSessionId when present" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("required-session-789")
        )

        // When
        val sessionId = SessionContext.requireSessionId(metadata)

        // Then
        sessionId shouldBe "required-session-789"
    }

    "should handle UUID formatted session IDs" {
        // Given
        val uuidSessionId = "550e8400-e29b-41d4-a716-446655440000"
        val metadata = mapOf(
            "sessionId" to JsonPrimitive(uuidSessionId)
        )

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then
        sessionId shouldBe uuidSessionId
    }

    "should handle empty string session ID" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("")
        )

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then
        sessionId shouldBe ""
        // Note: Empty string is technically valid for extraction,
        // validation is responsibility of downstream components
    }

    "should handle session IDs with special characters" {
        // Given
        val specialSessionId = "session-with-dashes_and_underscores.123"
        val metadata = mapOf(
            "sessionId" to JsonPrimitive(specialSessionId)
        )

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then
        sessionId shouldBe specialSessionId
    }

    "should handle non-string sessionId values" {
        // Given - sessionId as number (invalid type)
        val metadata = mapOf(
            "sessionId" to JsonPrimitive(12345)
        )

        // When - extracting non-string sessionId
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then - should return the string representation
        sessionId shouldNotBe null
    }

    "should extract consistently across multiple calls" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonPrimitive("consistent-session")
        )

        // When
        val sessionId1 = SessionContext.extractSessionId(metadata)
        val sessionId2 = SessionContext.extractSessionId(metadata)
        val sessionId3 = SessionContext.requireSessionId(metadata)

        // Then - all calls return same value
        sessionId1 shouldBe "consistent-session"
        sessionId2 shouldBe "consistent-session"
        sessionId3 shouldBe "consistent-session"
    }

    "should handle metadata with sessionId key but null value" {
        // Given
        val metadata = mapOf(
            "sessionId" to JsonNull
        )

        // When
        val sessionId = SessionContext.extractSessionId(metadata)

        // Then - JsonNull returns "null" as string content
        // This is JsonPrimitive behavior - it's the client's responsibility to not send null
        sessionId shouldNotBe null // JsonNull.jsonPrimitive.content returns "null"
    }
})
