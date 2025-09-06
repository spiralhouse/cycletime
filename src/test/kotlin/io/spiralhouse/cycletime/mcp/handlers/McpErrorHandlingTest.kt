package io.spiralhouse.cycletime.mcp.handlers

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.mcp.protocol.*
import io.spiralhouse.cycletime.mcp.server.handlers.DefaultMcpMethodHandler
import io.spiralhouse.cycletime.mcp.tools.DefaultToolRegistry
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.AsyncTool
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import kotlinx.serialization.json.*

/**
 * RED Phase TDD Tests for MCP Error Handling - SPI-572
 *
 * Comprehensive tests for error handling across all MCP protocol methods.
 * This ensures proper JSON-RPC error codes, messages, and data are returned
 * for various failure scenarios.
 *
 * Tests cover:
 * 1. Standard JSON-RPC error codes (-32700 to -32603)
 * 2. Server-defined error codes (-32000 to -32099)
 * 3. Error message formatting and localization
 * 4. Error data inclusion for debugging
 * 5. Error handling consistency across methods
 * 6. Security considerations in error responses
 *
 * All tests should FAIL initially as the implementation is missing.
 */
class McpErrorHandlingTest : StringSpec({

    lateinit var protocolHandler: JsonRpcProtocolHandler
    lateinit var toolRegistry: DefaultToolRegistry
    lateinit var resourceRegistry: ResourceProviderRegistry
    lateinit var methodHandler: DefaultMcpMethodHandler

    beforeEach {
        protocolHandler = JsonRpcProtocolHandler()
        toolRegistry = DefaultToolRegistry()
        resourceRegistry = ResourceProviderRegistry()
        methodHandler = DefaultMcpMethodHandler(protocolHandler, toolRegistry, resourceRegistry)
    }

    // ===== STANDARD JSON-RPC ERROR CODES =====

    "should return parse error (-32700) for malformed JSON-RPC requests" {
        // This test would typically be handled at the protocol level,
        // but we test the handler's response to such errors
        val request = JsonRpcRequest(
            jsonrpc = "invalid", // Invalid JSON-RPC version
            method = "initialize",
            params = buildJsonObject {},
            id = JsonPrimitive("parse-error-test")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32700 // Parse error
        response.error!!.message shouldContain "Parse error"
        response.id shouldBe JsonPrimitive("parse-error-test")
    }

    "should return invalid request error (-32600) for malformed MCP requests" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = JsonPrimitive("not_an_object"), // Should be JsonObject
            id = JsonPrimitive("invalid-request-test")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32600 // Invalid Request
        response.error!!.message shouldContain "Invalid Request"
        response.id shouldBe JsonPrimitive("invalid-request-test")
    }

    "should return method not found error (-32601) for unsupported methods" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "unsupported/method",
            params = null,
            id = JsonPrimitive("method-not-found-test")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32601 // Method not found
        response.error!!.message shouldContain "Method not found"
        response.error!!.message shouldContain "unsupported/method"
        response.id shouldBe JsonPrimitive("method-not-found-test")
    }

    "should return invalid params error (-32602) for malformed parameters" {
        val invalidParamScenarios = listOf(
            // Initialize with missing required fields
            Triple(
                "initialize",
                buildJsonObject { 
                    // Missing protocolVersion, capabilities, clientInfo
                },
                "protocolVersion"
            ),
            // Tools/call with missing name
            Triple(
                "tools/call",
                buildJsonObject {
                    put("arguments", buildJsonObject {})
                    // Missing name parameter
                },
                "tool name"
            ),
            // Resources/read with missing URI
            Triple(
                "resources/read",
                buildJsonObject {
                    // Missing uri parameter
                },
                "uri"
            )
        )

        invalidParamScenarios.forEach { (method, params, expectedErrorContent) ->
            val request = JsonRpcRequest(
                jsonrpc = "2.0",
                method = method,
                params = params,
                id = JsonPrimitive("invalid-params-$method")
            )

            val response = methodHandler.handleRequest(request)

            response.error shouldNotBe null
            response.error!!.code shouldBe -32602 // Invalid params
            response.error!!.message shouldContain expectedErrorContent
            response.id shouldBe JsonPrimitive("invalid-params-$method")
        }
    }

    "should return internal error (-32603) for unexpected server failures" {
        // This would require mocking internal failures or creating a scenario
        // where the handler throws an unexpected exception
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "internal_error_tool") // This would cause internal error
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("internal-error-test")
        )

        val response = methodHandler.handleRequest(request)

        // Should wrap unexpected errors as internal errors
        response.error shouldNotBe null
        response.error!!.code shouldBe -32603 // Internal error
        response.error!!.message shouldNotBe null
        response.error!!.data shouldNotBe null // Should include debug information
        response.id shouldBe JsonPrimitive("internal-error-test")
    }

    // ===== SERVER-DEFINED ERROR CODES (-32000 to -32099) =====

    "should return tool not found error (-32001) for non-existent tools" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "nonexistent_tool")
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("tool-not-found")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32001 // Tool not found
        response.error!!.message shouldContain "Tool not found"
        response.error!!.message shouldContain "nonexistent_tool"
    }

    "should return resource not found error (-32002) for non-existent resources" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/read",
            params = buildJsonObject {
                put("uri", "cycletime://nonexistent/resource")
            },
            id = JsonPrimitive("resource-not-found")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32002 // Resource not found
        response.error!!.message shouldContain "Resource not found"
        response.error!!.message shouldContain "cycletime://nonexistent/resource"
    }


})

// ===== TEST HELPER FUNCTIONS =====

// Note: Resource provider helper removed for RED phase compilation

private fun createFailingTool(name: String): Tool {
    return Tool(
        name = name,
        description = "A tool that always fails",
        parametersSchema = buildJsonObject {
            put("type", "object")
            put("properties", buildJsonObject {})
        },
        handler = { _ ->
            Result.failure(RuntimeException("Simulated tool execution failure"))
        }
    )
}

private fun createSlowAsyncTool(name: String): AsyncTool {
    return AsyncTool(
        name = name,
        description = "A slow async tool",
        parametersSchema = buildJsonObject {
            put("type", "object")
            put("properties", buildJsonObject {})
        },
        handler = { _ ->
            // Simulate work that takes longer than typical timeout
            kotlinx.coroutines.runBlocking {
                kotlinx.coroutines.delay(5000)
            }
            Result.success(JsonPrimitive("Slow result"))
        }
    )
}

// Note: Test helper classes removed to avoid conflicts with actual implementations
// These tests are designed to fail (RED phase) until proper implementations are created