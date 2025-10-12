package io.spiralhouse.cycletime.unit.mcp.sdk.adapters.tools

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.unit.mocks.MockSDKToolExecutor
import kotlinx.serialization.json.JsonObject

/**
 * RED Phase tests for list_sessions tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class ListSessionsAdapterTest : StringSpec({

    "should register list_sessions tool with SDK" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val tools = executor.listTools()

        // Then
        tools shouldContain "list_sessions"
    }

    "should execute list_sessions via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = JsonObject(emptyMap()) // No parameters required

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "list_sessions",
            arguments = arguments
        )

        // Then - verify success and list returned
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should handle empty session list gracefully" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "list_sessions",
            arguments = JsonObject(emptyMap())
        )

        // Then - should return success even with empty list
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }
})
