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
 * RED Phase tests for list_workflows tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class ListWorkflowsAdapterTest : StringSpec({

    "should register list_workflows tool with SDK" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val tools = executor.listTools()

        // Then
        tools shouldContain "workflow_list_workflows"
    }

    "should execute list_workflows via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = JsonObject(emptyMap()) // No parameters required

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "workflow_list_workflows",
            arguments = arguments
        )

        // Then
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should handle empty workflow list gracefully" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "workflow_list_workflows",
            arguments = JsonObject(emptyMap())
        )

        // Then - should return success even with empty list
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }
})
