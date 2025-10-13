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
 * RED Phase tests for create_issue tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class CreateIssueAdapterTest : StringSpec({

    "should register create_issue tool with SDK" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val tools = executor.listTools()

        // Then
        tools shouldContain "issue_create_issue"
    }

    "should execute create_issue via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("title", JsonPrimitive("Test Issue"))
            put("description", JsonPrimitive("Test Description"))
            put("projectId", JsonPrimitive("TEST-PROJECT-123"))
            put("type", JsonPrimitive("STORY"))
        }

        val result = executor.executeTool(
            toolName = "issue_create_issue",
            arguments = arguments
        )

        // Then
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should return error when required fields missing" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("title", JsonPrimitive("Test Issue"))
            // Missing projectId (required)
        }

        // When
        val result = executor.executeTool(
                toolName = "issue_create_issue",
                arguments = arguments
            )

        // Then - SDK returns error result instead of throwing
        result shouldNotBe null
        result.isError shouldBe true
    }
})
