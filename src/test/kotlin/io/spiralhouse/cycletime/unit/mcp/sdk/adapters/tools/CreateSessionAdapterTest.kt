package io.spiralhouse.cycletime.unit.mcp.sdk.adapters.tools

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.unit.mocks.MockSDKToolExecutor
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/**
 * RED Phase tests for create_session tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 * The tests specify requirements for the adapter that will be implemented in GREEN phase.
 *
 * Test Coverage:
 * 1. Tool registration with SDK
 * 2. Tool execution via SDK CallToolRequest (happy path)
 * 3. Error handling when session context is missing
 *
 * Expected Behavior (when GREEN phase implements adapters):
 * - create_session tool should be registered with SDK
 * - Execution should create session and return session data
 * - Missing projectId should throw IllegalArgumentException
 */
class CreateSessionAdapterTest : StringSpec({

    "should register create_session tool with SDK" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - list all registered tools
        // This WILL FAIL in RED phase - no tools registered yet
        val tools = executor.listTools()

        // Then - verify create_session is registered
        tools shouldContain "create_session"
    }

    "should execute create_session via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("projectId", JsonPrimitive("TEST-PROJECT-123"))
        }

        // When - execute tool via SDK
        // This WILL FAIL in RED phase - no adapter implementation exists yet
        val result = executor.executeTool(
            toolName = "create_session",
            arguments = arguments
        )

        // Then - verify success and session data returned
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
        // Verify result contains sessionKey and projectId
        // (specific content assertions will be added in GREEN phase)
    }

    "should throw IllegalArgumentException when projectId missing" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = JsonObject(emptyMap()) // Missing projectId!

        // When/Then - should throw exception
        // This WILL FAIL in RED phase - no error handling exists yet
        shouldThrow<IllegalArgumentException> {
            executor.executeTool(
                toolName = "create_session",
                arguments = arguments
            )
        }
    }
})
