package io.spiralhouse.cycletime.unit.mcp.sdk.adapters.tools

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.unit.mocks.MockSDKToolExecutor
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

/**
 * RED Phase tests for update_project tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class UpdateProjectAdapterTest : StringSpec({

    "should register update_project tool with SDK" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val tools = executor.listTools()

        // Then
        tools shouldContain "update_project"
    }

    "should execute update_project via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("id", JsonPrimitive("TEST-PROJECT-123"))
            put("name", JsonPrimitive("Updated Name"))
            put("description", JsonPrimitive("Updated Description"))
        }

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "update_project",
            arguments = arguments
        )

        // Then
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should throw IllegalArgumentException when project id missing" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("name", JsonPrimitive("Updated Name"))
        } // Missing id!

        // When/Then - This WILL FAIL in RED phase
        shouldThrow<IllegalArgumentException> {
            executor.executeTool(
                toolName = "update_project",
                arguments = arguments
            )
        }
    }
})
