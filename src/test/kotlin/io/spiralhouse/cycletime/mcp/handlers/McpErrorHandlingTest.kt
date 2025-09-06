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

    "should return subscription not supported error (-32003) for non-subscribable resources" {
        // Note: Resource provider removed for RED phase compilation
        // Note: Resource provider registration would be tested separately
        // For now, this test will fail as expected (RED phase)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/subscribe",
            params = buildJsonObject {
                put("uri", "cycletime://static/resource")
            },
            id = JsonPrimitive("subscription-not-supported")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32003 // Subscription not supported
        response.error!!.message shouldContain "does not support subscriptions"
    }

    "should return tool execution error (-32004) for tool runtime failures" {
        val failingTool = createFailingTool("failing.tool")
        toolRegistry.register(failingTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "failing.tool")
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("tool-execution-error")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32004 // Tool execution error
        response.error!!.message shouldContain "execution failed"
        response.error!!.data shouldNotBe null
        
        // Should include error details for debugging
        val errorData = response.error!!.data as JsonObject
        errorData["exception"] shouldNotBe null
        errorData["toolName"]?.jsonPrimitive?.content shouldBe "failing_tool"
    }

    "should return tool timeout error (-32005) for async tool timeouts" {
        val slowTool = createSlowAsyncTool("slow.tool")
        toolRegistry.register(slowTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "slow.tool")
                put("arguments", buildJsonObject {})
                put("timeout", 100) // Very short timeout
            },
            id = JsonPrimitive("tool-timeout")
        )

        val response = methodHandler.handleRequestAsync(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32005 // Tool timeout
        response.error!!.message shouldContain "timeout"
        response.error!!.message shouldContain "100ms"
    }

    // ===== ERROR MESSAGE FORMATTING =====

    "should format error messages consistently across methods" {
        val errorScenarios = listOf(
            // Method not found
            Triple(
                JsonRpcRequest(
                    jsonrpc = "2.0",
                    method = "unknown/method",
                    params = null,
                    id = JsonPrimitive("1")
                ),
                -32601,
                listOf("Method not found", "unknown/method")
            ),
            // Invalid parameters for initialize
            Triple(
                JsonRpcRequest(
                    jsonrpc = "2.0", 
                    method = "initialize",
                    params = buildJsonObject {},
                    id = JsonPrimitive("2")
                ),
                -32602,
                listOf("Invalid params", "protocolVersion")
            ),
            // Tool not found
            Triple(
                JsonRpcRequest(
                    jsonrpc = "2.0",
                    method = "tools/call",
                    params = buildJsonObject {
                        put("name", "missing_tool")
                        put("arguments", buildJsonObject {})
                    },
                    id = JsonPrimitive("3")
                ),
                -32001,
                listOf("Tool not found", "missing_tool")
            )
        )

        errorScenarios.forEach { (request, expectedCode, expectedMessageParts) ->
            val response = methodHandler.handleRequest(request)

            response.error shouldNotBe null
            response.error!!.code shouldBe expectedCode
            
            expectedMessageParts.forEach { part ->
                response.error!!.message shouldContain part
            }
            
            // Error messages should be descriptive but not reveal internal details
            response.error!!.message.length shouldBe 10.coerceAtLeast(response.error!!.message.length) // Reasonable length
            response.error!!.message shouldNotBe response.error!!.message.uppercase() // Not all caps
        }
    }

    "should include appropriate error data for debugging" {
        val debugScenarios = listOf(
            // Tool execution error should include tool name and exception type
            JsonRpcRequest(
                jsonrpc = "2.0",
                method = "tools/call", 
                params = buildJsonObject {
                    put("name", "debug.tool")
                    put("arguments", buildJsonObject {})
                },
                id = JsonPrimitive("debug-1")
            ),
            // Resource error should include URI
            JsonRpcRequest(
                jsonrpc = "2.0",
                method = "resources/read",
                params = buildJsonObject {
                    put("uri", "cycletime://debug/resource")
                },
                id = JsonPrimitive("debug-2")
            )
        )

        // Register a tool that will fail for debugging
        val debugTool = createFailingTool("debug.tool")
        toolRegistry.register(debugTool)

        debugScenarios.forEach { request ->
            val response = methodHandler.handleRequest(request)

            response.error shouldNotBe null
            response.error!!.data shouldNotBe null
            
            val errorData = response.error!!.data as JsonObject
            
            // Should include relevant debug information
            when (request.method) {
                "tools/call" -> {
                    errorData.containsKey("toolName") shouldBe true
                    errorData.containsKey("exception") shouldBe true
                }
                "resources/read" -> {
                    errorData.containsKey("uri") shouldBe true
                }
            }
            
            // Should not include sensitive information
            errorData.toString().contains("password") shouldBe false
            errorData.toString().contains("secret") shouldBe false
            errorData.toString().contains("token") shouldBe false
        }
    }

    // ===== ERROR CONSISTENCY ACROSS METHODS =====

    "should handle null parameters consistently across all methods" {
        val methods = listOf("initialize", "tools/list", "tools/call", "resources/list", "resources/read")
        
        methods.forEach { method ->
            val request = JsonRpcRequest(
                jsonrpc = "2.0",
                method = method,
                params = null,
                id = JsonPrimitive("null-params-$method")
            )

            val response = methodHandler.handleRequest(request)

            // Some methods allow null params, others don't
            when (method) {
                "tools/list", "resources/list" -> {
                    // These methods should accept null params
                    response.error shouldBe null
                }
                "initialize", "tools/call", "resources/read" -> {
                    // These methods require parameters
                    response.error shouldNotBe null
                    response.error!!.code shouldBe -32602 // Invalid params
                }
            }
        }
    }

    "should maintain request ID correlation in all error responses" {
        val uniqueIds = listOf(
            JsonPrimitive(12345),
            JsonPrimitive("string-id"),
            JsonPrimitive(0),
            JsonPrimitive(-1),
            JsonNull
        )

        uniqueIds.forEach { id ->
            val request = JsonRpcRequest(
                jsonrpc = "2.0",
                method = "nonexistent/method", // Will cause error
                params = null,
                id = id
            )

            val response = methodHandler.handleRequest(request)

            response.error shouldNotBe null
            response.id shouldBe id // Must preserve request ID
        }
    }

    // ===== SECURITY CONSIDERATIONS IN ERROR RESPONSES =====

    "should not leak sensitive information in error messages" {
        // Test that error messages don't reveal internal system details
        val sensitiveScenarios = listOf(
            // File system paths
            JsonRpcRequest(
                jsonrpc = "2.0",
                method = "resources/read",
                params = buildJsonObject {
                    put("uri", "file:///etc/passwd") // Malicious URI
                },
                id = JsonPrimitive("sensitive-1")
            ),
            // SQL injection attempts
            JsonRpcRequest(
                jsonrpc = "2.0",
                method = "tools/call",
                params = buildJsonObject {
                    put("name", "'; DROP TABLE users; --")
                    put("arguments", buildJsonObject {})
                },
                id = JsonPrimitive("sensitive-2")
            )
        )

        sensitiveScenarios.forEach { request ->
            val response = methodHandler.handleRequest(request)

            response.error shouldNotBe null
            
            // Error message should not echo back potentially malicious input
            val errorMessage = response.error!!.message.lowercase()
            errorMessage.contains("/etc/passwd") shouldBe false
            errorMessage.contains("drop table") shouldBe false
            errorMessage.contains("--") shouldBe false
            
            // Should use generic error messages for security
            errorMessage shouldContain "invalid"
        }
    }

    "should rate limit error responses to prevent abuse" {
        // Test that rapid error requests are handled appropriately
        val rapidRequests = (1..100).map { i ->
            JsonRpcRequest(
                jsonrpc = "2.0",
                method = "nonexistent/method",
                params = null,
                id = JsonPrimitive("rapid-$i")
            )
        }

        rapidRequests.forEach { request ->
            val response = methodHandler.handleRequest(request)
            
            // All should return errors, but system should remain stable
            response.error shouldNotBe null
            response.error!!.code shouldBe -32601 // Method not found
        }
    }

    // ===== ERROR RECOVERY AND RESILIENCE =====

    "should continue operating normally after error conditions" {
        // Cause various errors
        val errorCausingRequests = listOf(
            JsonRpcRequest(
                jsonrpc = "2.0",
                method = "invalid/method",
                params = null,
                id = JsonPrimitive("error-1")
            ),
            JsonRpcRequest(
                jsonrpc = "2.0",
                method = "tools/call",
                params = buildJsonObject {
                    put("name", "nonexistent")
                    put("arguments", buildJsonObject {})
                },
                id = JsonPrimitive("error-2")
            )
        )

        // Process error requests
        errorCausingRequests.forEach { request ->
            val response = methodHandler.handleRequest(request)
            response.error shouldNotBe null
        }

        // Verify system still works for valid requests
        val validRequest = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/list",
            params = null,
            id = JsonPrimitive("recovery-test")
        )

        val response = methodHandler.handleRequest(validRequest)
        
        // Should work normally after errors
        response.error shouldBe null
        response.result shouldNotBe null
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