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
 * RED Phase tests for get_session tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class GetSessionAdapterTest : StringSpec({

    "should register get_session tool with SDK" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val tools = executor.listTools()

        // Then
        tools shouldContain "session_get_session"
    }

    "should execute get_session via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("sessionKey", JsonPrimitive("test-session-key"))
        }

        val result = executor.executeTool(
            toolName = "session_get_session",
            arguments = arguments
        )

        // Then - verify success
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should return error when sessionKey missing" {
        // Given
        val mcpServer = MCPSdkServerTestFactory.createWithProviders()
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = JsonObject(emptyMap()) // Missing sessionKey!

        // When
        val result = executor.executeTool(
                toolName = "session_get_session",
                arguments = arguments
            )

        // Then - SDK returns error result instead of throwing
        result shouldNotBe null
        result.isError shouldBe true
    }
})
