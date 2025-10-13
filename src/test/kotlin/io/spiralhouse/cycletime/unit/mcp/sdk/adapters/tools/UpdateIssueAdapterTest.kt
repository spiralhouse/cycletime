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
 * RED Phase tests for update_issue tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class UpdateIssueAdapterTest : StringSpec({

    "should register update_issue tool with SDK" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val tools = executor.listTools()

        // Then
        tools shouldContain "issue_update_issue"
    }

    "should execute update_issue via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("id", JsonPrimitive("TEST-ISSUE-456"))
            put("title", JsonPrimitive("Updated Title"))
            put("description", JsonPrimitive("Updated Description"))
            put("type", JsonPrimitive("EPIC"))
        }

        val result = executor.executeTool(
            toolName = "issue_update_issue",
            arguments = arguments
        )

        // Then
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should return error when issue id missing" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("title", JsonPrimitive("Updated Title"))
        } // Missing id!

        // When
        val result = executor.executeTool(
                toolName = "issue_update_issue",
                arguments = arguments
            )

        // Then - SDK returns error result instead of throwing
        result shouldNotBe null
        result.isError shouldBe true
    }
})
