package io.spiralhouse.cycletime.unit.mcp.sdk.adapters.tools

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.unit.mocks.MockSDKToolExecutor
import io.spiralhouse.cycletime.unit.mocks.MCPSdkServerTestFactory
import kotlinx.serialization.json.JsonObject

/**
 * RED Phase tests for get_active_session tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class GetActiveSessionAdapterTest : StringSpec({

    "should register get_active_session tool with SDK" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val tools = executor.listTools()

        // Then
        tools shouldContain "session_get_active_session"
    }

    "should execute get_active_session via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = JsonObject(emptyMap()) // No parameters required

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "session_get_active_session",
            arguments = arguments
        )

        // Then - verify success
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should handle no active session gracefully" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "session_get_active_session",
            arguments = JsonObject(emptyMap())
        )

        // Then - should return success with appropriate message
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
        // GREEN phase will verify specific "no active session" response
    }
})
