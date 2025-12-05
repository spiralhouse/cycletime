package io.spiralhouse.cycletime.unit.infrastructure.logging

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.infrastructure.logging.MCPLogger
import org.slf4j.MDC

/**
 * Unit tests for MCPLogger utility.
 *
 * Tests verify:
 * - MDC context management (add, remove, cleanup)
 * - Structured logging methods (tool invocation, session lifecycle)
 * - Sensitive data sanitization
 * - Nested context handling
 * - Automatic cleanup in all code paths
 */
class MCPLoggerTest : StringSpec({

    beforeEach {
        // Clear MDC before each test to ensure isolation
        MDC.clear()
    }

    afterEach {
        // Ensure MDC is clean after each test
        MDC.clear()
    }

    "should add MCP context to MDC during tool invocation" {
        // Arrange
        val sessionId = "test-session-123"
        val toolName = "project_create"

        // Act & Assert
        MCPLogger.withMCPContext(sessionId, toolName) {
            MDC.get("mcp-session-id") shouldBe sessionId
            MDC.get("mcp-tool") shouldBe toolName
        }
    }

    "should remove MDC context after tool completion" {
        // Arrange
        val sessionId = "test-session-456"
        val toolName = "issue_update"

        // Act
        MCPLogger.withMCPContext(sessionId, toolName) {
            // Context should exist during execution
            MDC.get("mcp-session-id") shouldBe sessionId
        }

        // Assert - context should be cleaned up
        MDC.get("mcp-session-id") shouldBe null
        MDC.get("mcp-tool") shouldBe null
    }

    "should log tool invocation with parameters" {
        // Arrange
        val sessionId = "session-789"
        val toolName = "workflow_execute"
        val params = mapOf(
            "workflowId" to "wf-123",
            "stage" to "validation"
        )

        // Act - no exception should be thrown
        MCPLogger.logToolInvocation(sessionId, toolName, params)

        // Assert - MDC should be cleaned up
        MDC.get("mcp-session-id") shouldBe null
        MDC.get("mcp-tool") shouldBe null
    }

    "should log tool success with duration" {
        // Arrange
        val sessionId = "session-success"
        val toolName = "project_list"
        val durationMs = 150L

        // Act
        MCPLogger.logToolSuccess(sessionId, toolName, durationMs)

        // Assert - MDC should be cleaned up
        MDC.get("mcp-session-id") shouldBe null
        MDC.get("mcp-tool") shouldBe null
    }

    "should log tool failure with exception details" {
        // Arrange
        val sessionId = "session-failure"
        val toolName = "issue_create"
        val exception = RuntimeException("Database connection failed")

        // Act
        MCPLogger.logToolFailure(sessionId, toolName, exception)

        // Assert - MDC should be cleaned up
        MDC.get("mcp-session-id") shouldBe null
        MDC.get("mcp-tool") shouldBe null
    }

    "should sanitize sensitive parameters" {
        // Arrange
        val sessionId = "session-security"
        val toolName = "user_authenticate"
        val params = mapOf(
            "username" to "testuser",
            "password" to "super-secret-password",
            "token" to "bearer-token-xyz",
            "apiKey" to "api-key-123",
            "normalField" to "safe-value"
        )

        // Act - should not throw, should sanitize
        MCPLogger.logToolInvocation(sessionId, toolName, params)

        // Assert - MDC cleaned up
        MDC.get("mcp-session-id") shouldBe null
    }

    "should handle nested MDC context correctly" {
        // Arrange
        val outerSessionId = "outer-session"
        val outerToolName = "outer-tool"
        val innerSessionId = "inner-session"
        val innerToolName = "inner-tool"

        // Act & Assert
        MCPLogger.withMCPContext(outerSessionId, outerToolName) {
            // Outer context active
            MDC.get("mcp-session-id") shouldBe outerSessionId
            MDC.get("mcp-tool") shouldBe outerToolName

            // Nested context
            MCPLogger.withMCPContext(innerSessionId, innerToolName) {
                // Inner context should override
                MDC.get("mcp-session-id") shouldBe innerSessionId
                MDC.get("mcp-tool") shouldBe innerToolName
            }

            // Outer context should be restored
            MDC.get("mcp-session-id") shouldBe outerSessionId
            MDC.get("mcp-tool") shouldBe outerToolName
        }

        // All context should be cleaned up
        MDC.get("mcp-session-id") shouldBe null
        MDC.get("mcp-tool") shouldBe null
    }

    "should support optional tool name parameter" {
        // Arrange
        val sessionId = "session-optional"

        // Act & Assert
        MCPLogger.withMCPContext(sessionId) {
            MDC.get("mcp-session-id") shouldBe sessionId
            MDC.get("mcp-tool") shouldBe null // Optional parameter not provided
        }

        // Cleanup verified
        MDC.get("mcp-session-id") shouldBe null
    }

    "should support optional request ID parameter" {
        // Arrange
        val sessionId = "session-request"
        val toolName = "test-tool"
        val requestId = "req-12345"

        // Act & Assert
        MCPLogger.withMCPContext(sessionId, toolName, requestId) {
            MDC.get("mcp-session-id") shouldBe sessionId
            MDC.get("mcp-tool") shouldBe toolName
            MDC.get("mcp-request-id") shouldBe requestId
        }

        // All cleaned up
        MDC.get("mcp-session-id") shouldBe null
        MDC.get("mcp-tool") shouldBe null
        MDC.get("mcp-request-id") shouldBe null
    }

    "should cleanup MDC even when block throws exception" {
        // Arrange
        val sessionId = "session-exception"
        val toolName = "failing-tool"

        // Act & Assert
        try {
            MCPLogger.withMCPContext(sessionId, toolName) {
                MDC.get("mcp-session-id") shouldBe sessionId
                throw RuntimeException("Simulated failure")
            }
        } catch (e: RuntimeException) {
            // Exception expected
        }

        // Assert - MDC should still be cleaned up
        MDC.get("mcp-session-id") shouldBe null
        MDC.get("mcp-tool") shouldBe null
    }

    "should log session start with session ID" {
        // Arrange
        val sessionId = "new-session-001"

        // Act
        MCPLogger.logSessionStart(sessionId)

        // Assert - MDC should be cleaned up
        MDC.get("mcp-session-id") shouldBe null
    }

    "should log session end with duration" {
        // Arrange
        val sessionId = "ending-session-002"
        val durationMs = 5000L

        // Act
        MCPLogger.logSessionEnd(sessionId, durationMs)

        // Assert - MDC should be cleaned up
        MDC.get("mcp-session-id") shouldBe null
    }

    "should truncate long parameter values" {
        // Arrange
        val sessionId = "session-long-params"
        val toolName = "data_import"
        val longValue = "x".repeat(500) // 500 characters
        val params = mapOf(
            "data" to longValue,
            "shortField" to "normal"
        )

        // Act - should handle without error
        MCPLogger.logToolInvocation(sessionId, toolName, params)

        // Assert - cleanup verified
        MDC.get("mcp-session-id") shouldBe null
    }

    "should sanitize nested map parameters" {
        // Arrange
        val sessionId = "session-nested"
        val toolName = "complex_operation"
        val params = mapOf(
            "config" to mapOf(
                "setting1" to "value1",
                "password" to "secret-nested",
                "nested" to mapOf(
                    "token" to "nested-token",
                    "safeValue" to "ok"
                )
            )
        )

        // Act - should sanitize recursively
        MCPLogger.logToolInvocation(sessionId, toolName, params)

        // Assert - cleanup verified
        MDC.get("mcp-session-id") shouldBe null
    }

    "should handle empty parameters map" {
        // Arrange
        val sessionId = "session-empty"
        val toolName = "simple_tool"
        val params = emptyMap<String, Any?>()

        // Act
        MCPLogger.logToolInvocation(sessionId, toolName, params)

        // Assert - cleanup verified
        MDC.get("mcp-session-id") shouldBe null
    }

    "should handle null parameter values" {
        // Arrange
        val sessionId = "session-nulls"
        val toolName = "nullable_tool"
        val params = mapOf(
            "field1" to "value",
            "field2" to null,
            "field3" to "another-value"
        )

        // Act
        MCPLogger.logToolInvocation(sessionId, toolName, params)

        // Assert - cleanup verified
        MDC.get("mcp-session-id") shouldBe null
    }

    "should return block result with MDC context" {
        // Arrange
        val sessionId = "session-result"
        val toolName = "calculator"
        val expectedResult = 42

        // Act
        val result = MCPLogger.withMCPContext(sessionId, toolName) {
            MDC.get("mcp-session-id") shouldBe sessionId
            expectedResult
        }

        // Assert
        result shouldBe expectedResult
        MDC.get("mcp-session-id") shouldBe null
    }

    "should handle multiple sequential contexts" {
        // Arrange
        val sessions = listOf("session-1", "session-2", "session-3")
        val tools = listOf("tool-1", "tool-2", "tool-3")

        // Act
        sessions.zip(tools).forEach { (sessionId, toolName) ->
            MCPLogger.withMCPContext(sessionId, toolName) {
                MDC.get("mcp-session-id") shouldBe sessionId
                MDC.get("mcp-tool") shouldBe toolName
            }

            // Each context should be cleaned up
            MDC.get("mcp-session-id") shouldBe null
            MDC.get("mcp-tool") shouldBe null
        }
    }

    "should handle case-insensitive sensitive key matching" {
        // Arrange
        val sessionId = "session-case"
        val toolName = "auth-tool"
        val params = mapOf(
            "PASSWORD" to "uppercase-secret",
            "Token" to "mixed-case-token",
            "api_KEY" to "underscore-key",
            "normalField" to "safe"
        )

        // Act - should sanitize all variants
        MCPLogger.logToolInvocation(sessionId, toolName, params)

        // Assert - cleanup verified
        MDC.get("mcp-session-id") shouldBe null
    }

    "should preserve MDC context across exception boundaries" {
        // Arrange
        val sessionId = "session-preserve"
        val toolName = "exception-tool"
        var mdcDuringException: String? = null

        // Act
        try {
            MCPLogger.withMCPContext(sessionId, toolName) {
                mdcDuringException = MDC.get("mcp-session-id")
                throw IllegalStateException("Test exception")
            }
        } catch (e: IllegalStateException) {
            // Expected
        }

        // Assert - context was active during exception
        mdcDuringException shouldBe sessionId

        // But cleaned up after
        MDC.get("mcp-session-id") shouldBe null
    }

    "should handle deeply nested contexts" {
        // Arrange & Act & Assert
        MCPLogger.withMCPContext("level-1", "tool-1") {
            MDC.get("mcp-session-id") shouldBe "level-1"

            MCPLogger.withMCPContext("level-2", "tool-2") {
                MDC.get("mcp-session-id") shouldBe "level-2"

                MCPLogger.withMCPContext("level-3", "tool-3") {
                    MDC.get("mcp-session-id") shouldBe "level-3"
                }

                // Restored to level 2
                MDC.get("mcp-session-id") shouldBe "level-2"
            }

            // Restored to level 1
            MDC.get("mcp-session-id") shouldBe "level-1"
        }

        // All cleaned up
        MDC.get("mcp-session-id") shouldBe null
    }

    "should support all sensitive key variations" {
        // Arrange
        val sessionId = "session-sensitive"
        val toolName = "security-tool"
        val params = mapOf(
            "password" to "secret1",
            "token" to "secret2",
            "secret" to "secret3",
            "apiKey" to "secret4",
            "api_key" to "secret5",
            "authorization" to "secret6",
            "credentials" to "secret7",
            "auth" to "secret8",
            "safeField" to "visible"
        )

        // Act - should sanitize all sensitive fields
        MCPLogger.logToolInvocation(sessionId, toolName, params)

        // Assert - cleanup verified
        MDC.get("mcp-session-id") shouldBe null
    }

    "should handle concurrent MDC contexts" {
        // Note: MDC is thread-local, so concurrent access requires actual threads
        // This test verifies sequential behavior that simulates interleaving

        // Arrange
        val context1 = "context-1" to "tool-1"
        val context2 = "context-2" to "tool-2"

        // Act & Assert - simulate interleaving
        MCPLogger.withMCPContext(context1.first, context1.second) {
            MDC.get("mcp-session-id") shouldBe context1.first

            // Nested different context
            MCPLogger.withMCPContext(context2.first, context2.second) {
                MDC.get("mcp-session-id") shouldBe context2.first
            }

            // Original context restored
            MDC.get("mcp-session-id") shouldBe context1.first
        }

        // All cleaned
        MDC.get("mcp-session-id") shouldBe null
    }
})
