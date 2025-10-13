package io.spiralhouse.cycletime.unit.mcp.sdk.adapters.tools

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.unit.mocks.MockSDKToolExecutor
import io.spiralhouse.cycletime.unit.mocks.MCPSdkServerTestFactory
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/**
 * RED Phase tests for get_next_task tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class GetNextTaskAdapterTest : StringSpec({

    "should register get_next_task tool with SDK" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val tools = executor.listTools()

        // Then
        tools shouldContain "session_get_next_task"
    }

    "should execute get_next_task with sessionKey via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("sessionKey", JsonPrimitive("test-session-key"))
        }

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "session_get_next_task",
            arguments = arguments
        )

        // Then - verify success
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should execute get_next_task without sessionKey (optional parameter)" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = JsonObject(emptyMap()) // sessionKey is optional

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "session_get_next_task",
            arguments = arguments
        )

        // Then - should succeed with default session
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }
})
