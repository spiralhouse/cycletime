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
 * RED Phase tests for list_active_sessions tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class ListActiveSessionsAdapterTest : StringSpec({

    "should register list_active_sessions tool with SDK" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val tools = executor.listTools()

        // Then
        tools shouldContain "session_list_active_sessions"
    }

    "should execute list_active_sessions via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = JsonObject(emptyMap()) // No parameters required

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "session_list_active_sessions",
            arguments = arguments
        )

        // Then - verify success
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should filter only active sessions" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "session_list_active_sessions",
            arguments = JsonObject(emptyMap())
        )

        // Then - should return only active sessions
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
        // GREEN phase will verify actual filtering logic
    }
})
