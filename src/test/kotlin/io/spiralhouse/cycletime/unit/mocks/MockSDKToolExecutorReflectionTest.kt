package io.spiralhouse.cycletime.unit.mocks

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import io.modelcontextprotocol.kotlin.sdk.CallToolRequest
import io.modelcontextprotocol.kotlin.sdk.CallToolResult
import io.modelcontextprotocol.kotlin.sdk.Implementation
import io.modelcontextprotocol.kotlin.sdk.ServerCapabilities
import io.modelcontextprotocol.kotlin.sdk.TextContent
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Test to verify MockSDKToolExecutor reflection works with SDK v0.7.2.
 *
 * This test manually registers tools with the Server and verifies that
 * MockSDKToolExecutor can:
 * 1. List registered tools via reflection
 * 2. Execute registered tools via reflection
 */
class MockSDKToolExecutorReflectionTest : StringSpec({

    "should list manually registered tools via reflection" {
        // Given - Create server and register a tool
        val server = Server(
            serverInfo = Implementation(name = "test", version = "1.0"),
            options = ServerOptions(
                capabilities = ServerCapabilities(
                    tools = ServerCapabilities.Tools(
                        listChanged = true
                    )
                )
            )
        )

        server.addTool(
            name = "test_tool",
            description = "Test tool for reflection"
        ) { _: CallToolRequest ->
            CallToolResult(
                content = listOf(TextContent(text = "success")),
                isError = false
            )
        }

        val executor = MockSDKToolExecutor(server)

        // When - List tools
        val tools = executor.listTools()

        // Then - Should find registered tool
        tools shouldContain "test_tool"
    }

    "should execute manually registered tools via reflection" {
        // Given - Create server and register a tool
        val server = Server(
            serverInfo = Implementation(name = "test", version = "1.0"),
            options = ServerOptions(
                capabilities = ServerCapabilities(
                    tools = ServerCapabilities.Tools(
                        listChanged = true
                    )
                )
            )
        )

        server.addTool(
            name = "echo_tool",
            description = "Echo tool for testing"
        ) { request: CallToolRequest ->
            val message = request.arguments["message"]?.toString() ?: "no message"
            CallToolResult(
                content = listOf(TextContent(text = "echo: $message")),
                isError = false
            )
        }

        val executor = MockSDKToolExecutor(server)

        // When - Execute tool
        val result = executor.executeTool(
            toolName = "echo_tool",
            arguments = buildJsonObject {
                put("message", "hello world")
            }
        )

        // Then - Should get result
        result.isError shouldBe false
        result.content.size shouldBe 1
    }

    "should print server class info for debugging" {
        // Given
        val server = Server(
            serverInfo = Implementation(name = "test", version = "1.0"),
            options = ServerOptions(
                capabilities = ServerCapabilities(
                    tools = ServerCapabilities.Tools(
                        listChanged = true
                    )
                )
            )
        )

        server.addTool(
            name = "debug_tool",
            description = "Tool for debugging"
        ) { _: CallToolRequest ->
            CallToolResult(content = emptyList(), isError = false)
        }

        // When - Print server info
        println("=== Server Reflection Debug ===")
        println("Server class: ${server::class}")
        println("Properties:")
        server::class.members.forEach { member ->
            println("  - ${member.name}")
        }
        println("===============================")

        // This test always passes - it's just for debugging output
        true shouldBe true
    }
})
