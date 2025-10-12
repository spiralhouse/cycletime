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
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject

/**
 * RED Phase tests for create_workflow tool adapter.
 *
 * These tests WILL and SHOULD fail in RED phase. This is correct and expected in TDD methodology.
 */
class CreateWorkflowAdapterTest : StringSpec({

    "should register create_workflow tool with SDK" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        // When - This WILL FAIL in RED phase
        val tools = executor.listTools()

        // Then
        tools shouldContain "create_workflow"
    }

    "should execute create_workflow via SDK CallToolRequest" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("name", JsonPrimitive("Test Workflow"))
            put("description", JsonPrimitive("Test Description"))
            put("stages", buildJsonArray {
                add(buildJsonObject {
                    put("name", JsonPrimitive("analysis"))
                    put("description", JsonPrimitive("Analysis stage"))
                })
                add(buildJsonObject {
                    put("name", JsonPrimitive("implementation"))
                    put("description", JsonPrimitive("Implementation stage"))
                })
            })
        }

        // When - This WILL FAIL in RED phase
        val result = executor.executeTool(
            toolName = "create_workflow",
            arguments = arguments
        )

        // Then
        result shouldNotBe null  // Will be CallToolResult.Success in GREEN phase
    }

    "should throw IllegalArgumentException when workflow name missing" {
        // Given
        val mcpServer = MCPSdkServer("1.0.0-test")
        val executor = MockSDKToolExecutor(mcpServer.server)

        val arguments = buildJsonObject {
            put("description", JsonPrimitive("Test Description"))
        } // Missing name!

        // When/Then - This WILL FAIL in RED phase
        shouldThrow<IllegalArgumentException> {
            executor.executeTool(
                toolName = "create_workflow",
                arguments = arguments
            )
        }
    }
})
