package io.spiralhouse.cycletime.mcp.handlers

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.cycletime.mcp.protocol.*
import io.spiralhouse.cycletime.mcp.server.handlers.DefaultMcpMethodHandler
import io.spiralhouse.cycletime.mcp.tools.DefaultToolRegistry
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.AsyncTool
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import kotlinx.serialization.json.*

/**
 * RED Phase TDD Tests for MCP Protocol Method Handlers - SPI-572
 *
 * These tests define the expected behavior for MCP protocol method handlers
 * that will process standard MCP requests and return compliant responses.
 * 
 * This test suite covers:
 * 1. Initialize method with capability negotiation
 * 2. Tools listing and invocation
 * 3. Resource listing and reading
 * 4. Session management (ping, shutdown)
 * 5. Error handling for each method
 * 6. Parameter validation according to MCP spec
 * 7. Proper JSON-RPC response formatting
 *
 * All tests are expected to FAIL initially since the handlers are not yet implemented.
 */
class McpMethodHandlersTest : StringSpec({

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

    // ===== INITIALIZE METHOD TESTS =====

    "should handle initialize request with capability negotiation" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {
                    put("roots", buildJsonObject {
                        put("listChanged", true)
                    })
                })
                put("clientInfo", buildJsonObject {
                    put("name", "Test Client")
                    put("version", "1.0.0")
                })
            },
            id = JsonPrimitive("init-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should return successful initialization response
        response.jsonrpc shouldBe "2.0"
        response.id shouldBe JsonPrimitive("init-1")
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        result["protocolVersion"]?.jsonPrimitive?.content shouldBe "2024-11-05"
        result["capabilities"] shouldNotBe null
        result["serverInfo"] shouldNotBe null

        // Should include server capabilities
        val capabilities = result["capabilities"] as JsonObject
        capabilities["tools"] shouldNotBe null
        capabilities["resources"] shouldNotBe null
        capabilities["logging"] shouldNotBe null

        // Should include server info
        val serverInfo = result["serverInfo"] as JsonObject
        serverInfo["name"]?.jsonPrimitive?.content shouldBe "CycleTime MCP Server"
        serverInfo["version"] shouldNotBe null
    }

    "should reject initialize request with unsupported protocol version" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "1.0.0") // Unsupported version
                put("capabilities", buildJsonObject {})
                put("clientInfo", buildJsonObject {
                    put("name", "Test Client")
                })
            },
            id = JsonPrimitive("init-2")
        )

        val response = methodHandler.handleRequest(request)

        // Should return error for unsupported version
        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "protocol version"
    }

    "should handle initialize request with missing client info" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "initialize",
            params = buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {})
                // Missing clientInfo
            },
            id = JsonPrimitive("init-3")
        )

        val response = methodHandler.handleRequest(request)

        // Should still succeed but handle gracefully
        response.error shouldBe null
        response.result shouldNotBe null
    }

    // ===== TOOLS LIST METHOD TESTS =====

    "should handle tools/list request and return available tools" {
        // First register some test tools
        val testTool = createTestTool(
            name = "test_tool",
            description = "A test tool for verification",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("input", buildJsonObject {
                        put("type", "string")
                        put("description", "Input parameter")
                    })
                })
                put("required", buildJsonArray { add("input") })
            }
        )
        toolRegistry.register(testTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/list",
            params = null,
            id = JsonPrimitive("tools-list-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should return list of tools with metadata
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val tools = result["tools"] as JsonArray
        tools shouldHaveSize 1

        val tool = tools[0] as JsonObject
        tool["name"]?.jsonPrimitive?.content shouldBe "test_tool"
        tool["description"]?.jsonPrimitive?.content shouldBe "A test tool for verification"
        tool["inputSchema"] shouldNotBe null
    }

    "should handle tools/list request when no tools are registered" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/list",
            params = null,
            id = JsonPrimitive("tools-list-2")
        )

        val response = methodHandler.handleRequest(request)

        // Should return empty tools array
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val tools = result["tools"] as JsonArray
        tools shouldHaveSize 0
    }

    // ===== TOOLS CALL METHOD TESTS =====

    "should handle tools/call request with valid parameters" {
        // Register a test tool
        val testTool = createTestTool(
            name = "echo_tool",
            description = "Echoes input back",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("message", buildJsonObject {
                        put("type", "string")
                    })
                })
            },
            implementation = { params ->
                val message = (params as JsonObject)["message"]?.jsonPrimitive?.content ?: "No message"
                JsonPrimitive("Echo: $message")
            }
        )
        toolRegistry.register(testTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "echo_tool")
                put("arguments", buildJsonObject {
                    put("message", "Hello, World!")
                })
            },
            id = JsonPrimitive("tools-call-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should execute tool and return result
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val content = result["content"] as JsonArray
        val textContent = content[0] as JsonObject
        textContent["type"]?.jsonPrimitive?.content shouldBe "text"
        textContent["text"]?.jsonPrimitive?.content shouldBe "Echo: Hello, World!"
    }

    "should handle tools/call request with missing tool name" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                // Missing "name" parameter
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("tools-call-2")
        )

        val response = methodHandler.handleRequest(request)

        // Should return parameter validation error
        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "tool name"
    }

    "should handle tools/call request for non-existent tool" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "non_existent_tool")
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("tools-call-3")
        )

        val response = methodHandler.handleRequest(request)

        // Should return tool not found error
        response.error shouldNotBe null
        response.error!!.code shouldBe -32001 // Tool not found (server-defined error)
        response.error!!.message shouldContain "Tool not found"
    }

    "should handle tools/call request with invalid arguments" {
        // Register a tool with strict parameter validation
        val strictTool = createTestTool(
            name = "strict_tool",
            description = "Tool with strict parameter validation",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("requiredParam", buildJsonObject {
                        put("type", "string")
                    })
                })
                put("required", buildJsonArray { add("requiredParam") })
            },
            implementation = { params ->
                // This should not be reached due to validation
                JsonPrimitive("Should not execute")
            }
        )
        toolRegistry.register(strictTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "strict_tool")
                put("arguments", buildJsonObject {
                    // Missing required parameter
                })
            },
            id = JsonPrimitive("tools-call-4")
        )

        val response = methodHandler.handleRequest(request)

        // Should return validation error
        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "validation failed"
    }

    // ===== RESOURCES LIST METHOD TESTS =====

    "should handle resources/list request and return available resources" {
        // Note: Resource provider registration would be tested separately
        // For now, this test will fail as expected (RED phase)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/list",
            params = null,
            id = JsonPrimitive("resources-list-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should return list of resources
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val resources = result["resources"] as JsonArray
        resources shouldHaveSize 1

        val resource = resources[0] as JsonObject
        resource["uri"]?.jsonPrimitive?.content shouldBe "cycletime://projects/test"
        resource["name"]?.jsonPrimitive?.content shouldBe "Test Project"
        resource["description"]?.jsonPrimitive?.content shouldBe "A test project resource"
        resource["mimeType"]?.jsonPrimitive?.content shouldBe "application/json"
    }

    "should handle resources/list request when no resources are available" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/list",
            params = null,
            id = JsonPrimitive("resources-list-2")
        )

        val response = methodHandler.handleRequest(request)

        // Should return empty resources array
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val resources = result["resources"] as JsonArray
        resources shouldHaveSize 0
    }

    // ===== RESOURCES READ METHOD TESTS =====

    "should handle resources/read request for existing resource" {
        // Note: Resource provider registration would be tested separately
        // For now, this test will fail as expected (RED phase)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/read",
            params = buildJsonObject {
                put("uri", "cycletime://data/sample.json")
            },
            id = JsonPrimitive("resources-read-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should return resource content
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val contents = result["contents"] as JsonArray
        contents shouldHaveSize 1

        val content = contents[0] as JsonObject
        content["uri"]?.jsonPrimitive?.content shouldBe "cycletime://data/sample.json"
        content["mimeType"]?.jsonPrimitive?.content shouldBe "application/json"
        content["text"]?.jsonPrimitive?.content shouldBe """{"message": "Hello from resource"}"""
    }

    "should handle resources/read request for non-existent resource" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/read",
            params = buildJsonObject {
                put("uri", "cycletime://nonexistent/resource")
            },
            id = JsonPrimitive("resources-read-2")
        )

        val response = methodHandler.handleRequest(request)

        // Should return resource not found error
        response.error shouldNotBe null
        response.error!!.code shouldBe -32002 // Resource not found (server-defined error)
        response.error!!.message shouldContain "Resource not found"
    }

    "should handle resources/read request with missing URI parameter" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/read",
            params = buildJsonObject {
                // Missing "uri" parameter
            },
            id = JsonPrimitive("resources-read-3")
        )

        val response = methodHandler.handleRequest(request)

        // Should return parameter validation error
        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "uri"
    }

    // ===== RESOURCES SUBSCRIBE METHOD TESTS =====

    "should handle resources/subscribe request for existing resource" {
        // Note: Resource provider registration would be tested separately
        // For now, this test will fail as expected (RED phase)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/subscribe",
            params = buildJsonObject {
                put("uri", "cycletime://live/data")
            },
            id = JsonPrimitive("resources-subscribe-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should confirm subscription
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        // Should indicate successful subscription
        result.keys shouldContain "subscribed"
        result["subscribed"]?.jsonPrimitive?.boolean shouldBe true
    }

    "should handle resources/subscribe request for non-existent resource" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/subscribe",
            params = buildJsonObject {
                put("uri", "cycletime://nonexistent/resource")
            },
            id = JsonPrimitive("resources-subscribe-2")
        )

        val response = methodHandler.handleRequest(request)

        // Should return resource not found error
        response.error shouldNotBe null
        response.error!!.code shouldBe -32002 // Resource not found
        response.error!!.message shouldContain "Resource not found"
    }

    // ===== RESOURCES UNSUBSCRIBE METHOD TESTS =====

    "should handle resources/unsubscribe request for subscribed resource" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "resources/unsubscribe",
            params = buildJsonObject {
                put("uri", "cycletime://live/data")
            },
            id = JsonPrimitive("resources-unsubscribe-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should confirm unsubscription
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        result.keys shouldContain "unsubscribed"
        result["unsubscribed"]?.jsonPrimitive?.boolean shouldBe true
    }

    // ===== SESSION MANAGEMENT TESTS =====

    "should handle ping request and return pong" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "ping",
            params = null,
            id = JsonPrimitive("ping-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should return pong response
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        result["pong"]?.jsonPrimitive?.boolean shouldBe true
    }

    "should handle shutdown request gracefully" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "shutdown",
            params = null,
            id = JsonPrimitive("shutdown-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should acknowledge shutdown
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        result["acknowledged"]?.jsonPrimitive?.boolean shouldBe true
    }

    // ===== NOTIFICATION HANDLING TESTS =====

    "should handle notifications/message without response" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "notifications/message",
            params = buildJsonObject {
                put("level", "info")
                put("logger", "test")
                put("data", "Test log message")
            },
            id = null // Notification
        )

        // Should handle notification without throwing
        methodHandler.handleNotification(request)
        // Notifications don't return responses, so just verify no exception
    }

    "should handle notifications/progress without response" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "notifications/progress",
            params = buildJsonObject {
                put("progressToken", "task-123")
                put("value", buildJsonObject {
                    put("kind", "report")
                    put("message", "Processing...")
                    put("percentage", 50)
                })
            },
            id = null // Notification
        )

        // Should handle notification without throwing
        methodHandler.handleNotification(request)
        // Notifications don't return responses, so just verify no exception
    }

    // ===== CAPABILITY UPDATES TESTS =====

    "should handle notifications/capabilities updates" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "notifications/capabilities",
            params = buildJsonObject {
                put("capabilities", buildJsonObject {
                    put("tools", buildJsonObject {
                        put("listChanged", true)
                    })
                    put("resources", buildJsonObject {
                        put("subscribe", true)
                        put("listChanged", false)
                    })
                })
            },
            id = null // Notification
        )

        // Should handle capability update notification
        methodHandler.handleNotification(request)
        // Notifications don't return responses, so just verify no exception
    }

    // ===== ERROR HANDLING TESTS =====

    "should return method not found error for unsupported methods" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "unknown/method",
            params = null,
            id = JsonPrimitive("unknown-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should return method not found error
        response.error shouldNotBe null
        response.error!!.code shouldBe -32601 // Method not found
        response.error!!.message shouldContain "Method not found"
        response.error!!.message shouldContain "unknown/method"
    }

    "should handle internal server errors gracefully" {
        // This test would require mocking internal failures
        // For now, we'll test the error response format
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "failing_tool") // This tool would cause internal error
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("internal-error-1")
        )

        val response = methodHandler.handleRequest(request)

        // Should return internal error with proper format
        response.error shouldNotBe null
        response.error!!.code shouldBe -32603 // Internal error
        response.error!!.message shouldNotBe null
        response.error!!.data shouldNotBe null // Should include debug info
    }

    "should validate request parameters according to MCP specification" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = JsonPrimitive("invalid_params_format"), // Should be object, not string
            id = JsonPrimitive("validation-1")
        )

        // This should be caught at the protocol level, but if it reaches the handler
        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
    }

    // ===== ASYNC METHOD TESTS =====

    "should handle async tools/call requests with timeout" {
        // Register an async tool
        val asyncTool = createTestAsyncTool(
            name = "slow_tool",
            description = "A slow async tool",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("delay", buildJsonObject {
                        put("type", "integer")
                        put("minimum", 0)
                    })
                })
            },
            asyncImplementation = { params ->
                val delay = (params as JsonObject)["delay"]?.jsonPrimitive?.long ?: 1000L
                // Simulate async operation
                kotlinx.coroutines.delay(delay)
                JsonPrimitive("Async result after ${delay}ms")
            }
        )
        toolRegistry.register(asyncTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "slow_tool")
                put("arguments", buildJsonObject {
                    put("delay", 100)
                })
                put("timeout", 5000) // 5 second timeout
            },
            id = JsonPrimitive("async-call-1")
        )

        val response = methodHandler.handleRequestAsync(request)

        // Should execute async tool and return result
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val content = result["content"] as JsonArray
        val textContent = content[0] as JsonObject
        textContent["type"]?.jsonPrimitive?.content shouldBe "text"
        textContent["text"]?.jsonPrimitive?.content shouldContain "Async result"
    }

    "should handle async tool timeout errors" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "slow_tool")
                put("arguments", buildJsonObject {
                    put("delay", 10000) // 10 second delay
                })
                put("timeout", 1000) // 1 second timeout
            },
            id = JsonPrimitive("async-timeout-1")
        )

        val response = methodHandler.handleRequestAsync(request)

        // Should return timeout error
        response.error shouldNotBe null
        response.error!!.code shouldBe -32003 // Tool timeout (server-defined error)
        response.error!!.message shouldContain "timeout"
    }
})

// ===== TEST HELPER FUNCTIONS =====

/**
 * Create a test tool using the actual Tool data class
 */
private fun createTestTool(
    name: String,
    description: String,
    parametersSchema: JsonObject,
    implementation: (JsonElement) -> JsonElement = { JsonNull }
): Tool {
    return Tool(
        name = name,
        description = description,
        parametersSchema = parametersSchema,
        handler = { params -> Result.success(implementation(params)) }
    )
}

/**
 * Create a test async tool using the actual AsyncTool data class
 */
private fun createTestAsyncTool(
    name: String,
    description: String,
    parametersSchema: JsonObject,
    asyncImplementation: suspend (JsonElement) -> JsonElement
): AsyncTool {
    return AsyncTool(
        name = name,
        description = description,
        parametersSchema = parametersSchema,
        handler = { params -> 
            try {
                Result.success(kotlinx.coroutines.runBlocking { asyncImplementation(params) })
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    )
}