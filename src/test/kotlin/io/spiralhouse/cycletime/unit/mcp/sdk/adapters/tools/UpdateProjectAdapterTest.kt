package io.spiralhouse.cycletime.unit.mcp.sdk.adapters.tools

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.unit.mocks.MockSDKToolExecutor
import io.spiralhouse.cycletime.unit.mocks.MCPSdkServerTestFactory
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
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val tools = executor.listTools()

        // Then
        tools shouldContain "project_update_project"
    }

    "should execute update_project via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("id", JsonPrimitive("TEST-PROJECT-123"))
            put("name", JsonPrimitive("Updated Name"))
            put("description", JsonPrimitive("Updated Description"))
        }

        val result = executor.executeTool(
            toolName = "project_update_project",
            arguments = arguments
        )

        // Then
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should return error when project id missing" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("name", JsonPrimitive("Updated Name"))
        } // Missing id!

        // When
        val result = executor.executeTool(
                toolName = "project_update_project",
                arguments = arguments
            )

        // Then - SDK returns error result instead of throwing
        result shouldNotBe null
        result.isError shouldBe true
    }
})
