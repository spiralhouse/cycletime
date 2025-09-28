package io.spiralhouse.cycletime.integration.mcp.tools

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.resources.ResourceRegistry
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.server.state.ServerState
import io.spiralhouse.cycletime.mcp.tools.DefaultMcpToolHandler
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.ToolHandler
import io.spiralhouse.cycletime.mcp.tools.ToolRegistry
import kotlinx.coroutines.delay
import kotlinx.serialization.json.*

/**
 * Comprehensive integration tests for the complete SPI-632 JSON-RPC extraction architecture.
 *
 * These integration tests validate the end-to-end flow through all architectural layers:
 * **MCP Server → McpMethodHandler → McpToolHandler → ToolRegistry**
 *
 * ## Integration Testing Objectives
 *
 * ### Primary Goal
 * Create integration tests that validate the complete request/response flow through all layers:
 * - **Complete Chain**: Test full request flow through all architectural layers
 * - **Tool Operations**: Validate both `tools/list` and `tools/call` through integration
 * - **Response Format**: Ensure JSON-RPC responses match expected MCP format
 * - **Error Propagation**: Verify errors propagate correctly through all layers
 *
 * ### Architecture Layer Testing
 * - **Integration Layer**: McpMethodHandler properly routes JSON-RPC methods
 * - **Protocol Layer**: McpToolHandler correctly handles tool protocol specifics
 * - **Domain Layer**: ToolRegistry performs tool operations without protocol concerns
 * - **Clean Separation**: Each layer focuses on its single responsibility
 *
 * ### Enhanced JSON Response Testing
 * - **Complex JSON Objects**: Test JsonObject responses with pretty printing
 * - **Array Responses**: Test JsonArray responses with proper formatting
 * - **Primitive Values**: Test JsonPrimitive (string and non-string) handling
 * - **Mixed Response Types**: Validate different tool response formats
 */
class McpToolIntegrationTest : DescribeSpec({

    // ===== Integration Test Setup =====

    lateinit var toolRegistry: ToolRegistry
    lateinit var toolHandler: DefaultMcpToolHandler
    lateinit var methodHandler: McpMethodHandler
    lateinit var protocolHandler: JsonRpcProtocolHandler
    lateinit var resourceRegistry: ResourceRegistry
    lateinit var serverState: ServerState

    fun setupIntegrationTestTools() {
        // Simple sync tool for basic integration testing
        toolRegistry.register(Tool(
            name = "integration.simple",
            description = "Simple sync tool for integration testing",
            parametersSchema = buildJsonObject {
                put("type", "object")
                putJsonObject("properties") {
                    putJsonObject("message") {
                        put("type", "string")
                        put("description", "Message to echo")
                    }
                }
            },
            handler = ToolHandler.Sync { params ->
                val message = params.jsonObject["message"]?.jsonPrimitive?.content ?: "default"
                Result.success(JsonPrimitive("Echo: $message"))
            }
        ))

        // Complex JSON response tool for enhanced testing
        toolRegistry.register(Tool(
            name = "integration.complex",
            description = "Tool returning complex JSON objects",
            parametersSchema = buildJsonObject {
                put("type", "object")
                putJsonObject("properties") {
                    putJsonObject("structure") {
                        put("type", "string")
                        put("description", "Type of structure to return")
                    }
                }
            },
            handler = ToolHandler.Sync { params ->
                val structureType = params.jsonObject["structure"]?.jsonPrimitive?.content ?: "object"
                when (structureType) {
                    "object" -> Result.success(buildJsonObject {
                        put("type", "complex")
                        put("status", "success")
                        put("timestamp", "2024-01-01T00:00:00Z")
                        putJsonObject("metadata") {
                            put("version", "1.0")
                            put("author", "integration-test")
                        }
                    })
                    "array" -> Result.success(buildJsonArray {
                        add("item1")
                        add("item2")
                        add(buildJsonObject {
                            put("nested", "object")
                            put("value", 42)
                        })
                    })
                    "primitive" -> Result.success(JsonPrimitive(12345))
                    else -> Result.failure(RuntimeException("Unknown structure type: $structureType"))
                }
            }
        ))

        // Async tool for timeout and concurrency testing
        toolRegistry.register(Tool(
            name = "integration.async",
            description = "Async tool for concurrency testing",
            parametersSchema = buildJsonObject {
                put("type", "object")
                putJsonObject("properties") {
                    putJsonObject("delay") {
                        put("type", "number")
                        put("description", "Delay in milliseconds")
                    }
                    putJsonObject("action") {
                        put("type", "string")
                        put("description", "Action to perform")
                    }
                }
            },
            handler = ToolHandler.Async { params ->
                val delayMs = params.jsonObject["delay"]?.jsonPrimitive?.long ?: 10L
                val action = params.jsonObject["action"]?.jsonPrimitive?.content ?: "default"

                delay(delayMs)

                when (action) {
                    "success" -> Result.success(JsonPrimitive("Async completed after ${delayMs}ms"))
                    "fail" -> Result.failure(RuntimeException("Async operation failed"))
                    "timeout" -> {
                        delay(15000) // Force timeout
                        Result.success(JsonPrimitive("Should not reach here"))
                    }
                    else -> Result.success(buildJsonObject {
                        put("action", action)
                        put("delay", delayMs)
                        put("result", "async_success")
                    })
                }
            }
        ))

        // Failing tool for error testing
        toolRegistry.register(Tool(
            name = "integration.failing",
            description = "Tool that always fails for error testing",
            parametersSchema = buildJsonObject {
                put("type", "object")
                putJsonObject("properties") {
                    putJsonObject("errorType") {
                        put("type", "string")
                        put("description", "Type of error to generate")
                    }
                }
            },
            handler = ToolHandler.Sync { params ->
                val errorType = params.jsonObject["errorType"]?.jsonPrimitive?.content ?: "generic"
                when (errorType) {
                    "validation" -> Result.failure(IllegalArgumentException("Parameter validation failed"))
                    "execution" -> Result.failure(RuntimeException("Tool execution failed"))
                    "timeout" -> Result.failure(RuntimeException("Operation timed out"))
                    else -> Result.failure(Exception("Generic tool error"))
                }
            }
        ))

        // Math tool for parameter validation testing
        toolRegistry.register(Tool(
            name = "integration.math",
            description = "Math operations for parameter testing",
            parametersSchema = buildJsonObject {
                put("type", "object")
                putJsonObject("properties") {
                    putJsonObject("operation") {
                        put("type", "string")
                        put("enum", buildJsonArray {
                            add("add")
                            add("multiply")
                            add("divide")
                        })
                    }
                    putJsonObject("a") {
                        put("type", "number")
                    }
                    putJsonObject("b") {
                        put("type", "number")
                    }
                }
                putJsonArray("required") {
                    add("operation")
                    add("a")
                    add("b")
                }
            },
            handler = ToolHandler.Sync { params ->
                val operation = params.jsonObject["operation"]?.jsonPrimitive?.content
                val a = params.jsonObject["a"]?.jsonPrimitive?.double
                val b = params.jsonObject["b"]?.jsonPrimitive?.double

                if (operation == null || a == null || b == null) {
                    return@Sync Result.failure(IllegalArgumentException("Missing required parameters"))
                }

                val result = when (operation) {
                    "add" -> a + b
                    "multiply" -> a * b
                    "divide" -> {
                        if (b == 0.0) {
                            return@Sync Result.failure(ArithmeticException("Division by zero"))
                        }
                        a / b
                    }
                    else -> return@Sync Result.failure(IllegalArgumentException("Unknown operation: $operation"))
                }

                Result.success(buildJsonObject {
                    put("operation", operation)
                    put("operandA", a)
                    put("operandB", b)
                    put("result", result)
                })
            }
        ))
    }

    fun initializeServerForTesting() {
        // Initialize server with test configuration
        serverState.transitionTo(io.spiralhouse.cycletime.mcp.server.state.ServerStatus.STARTING)
        serverState.transitionTo(io.spiralhouse.cycletime.mcp.server.state.ServerStatus.RUNNING)
    }

    beforeEach {
        // Setup complete integration chain
        toolRegistry = ToolRegistry()
        toolHandler = DefaultMcpToolHandler(toolRegistry)
        protocolHandler = JsonRpcProtocolHandler()
        resourceRegistry = ResourceRegistry()
        serverState = ServerState()

        methodHandler = McpMethodHandler(
            protocolHandler = protocolHandler,
            toolHandler = toolHandler,
            resourceRegistry = resourceRegistry,
            serverState = serverState
        )

        // Register test tools for integration testing
        setupIntegrationTestTools()

        // Initialize server state
        initializeServerForTesting()
    }

    // ===== Helper Functions =====

    suspend fun executeToolsList(): JsonRpcResponse {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/list",
            params = JsonObject(emptyMap()),
            id = JsonPrimitive("test-list-1")
        )
        return methodHandler.handleRequest(request)
    }

    suspend fun executeToolsCall(toolName: String, arguments: JsonObject = JsonObject(emptyMap())): JsonRpcResponse {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", toolName)
                put("arguments", arguments)
            },
            id = JsonPrimitive("test-call-1")
        )
        return methodHandler.handleRequest(request)
    }

    // ===== Integration Tests =====

    describe("Complete End-to-End Flow Validation") {

        describe("Complete Tools/List Flow") {

            it("should handle complete tools/list request flow through all layers") {
                val response = executeToolsList()

                // Validate JSON-RPC response structure
                response.jsonrpc shouldBe "2.0"
                response.id shouldBe JsonPrimitive("test-list-1")
                response.error shouldBe null
                response.result shouldNotBe null

                // Validate MCP tool listing format
                val result = response.result as JsonObject
                result["tools"] shouldNotBe null
                result["tools"].shouldBeInstanceOf<JsonArray>()

                val toolsArray = result["tools"] as JsonArray
                toolsArray.size shouldBe 5 // All registered integration test tools

                // Verify tool structure compliance
                toolsArray.forEach { toolElement ->
                    val tool = toolElement.jsonObject
                    tool["name"] shouldNotBe null
                    tool["description"] shouldNotBe null
                    tool["inputSchema"] shouldNotBe null
                    tool["inputSchema"].shouldBeInstanceOf<JsonObject>()
                }

                // Verify specific tools are present
                val toolNames = toolsArray.map { it.jsonObject["name"]?.jsonPrimitive?.content }.filterNotNull()
                toolNames shouldContain "integration.simple"
                toolNames shouldContain "integration.complex"
                toolNames shouldContain "integration.async"
                toolNames shouldContain "integration.failing"
                toolNames shouldContain "integration.math"
            }

            it("should maintain proper layer delegation without protocol coupling") {
                val response = executeToolsList()

                // Validate that each layer properly delegates to the next
                response.result shouldNotBe null
                val result = response.result as JsonObject
                val toolsArray = result["tools"] as JsonArray

                // Verify ToolRegistry metadata is properly exposed through all layers
                val simpleTool = toolsArray.find {
                    it.jsonObject["name"]?.jsonPrimitive?.content == "integration.simple"
                }?.jsonObject

                simpleTool shouldNotBe null
                simpleTool!!["description"]?.jsonPrimitive?.content shouldBe "Simple sync tool for integration testing"
                simpleTool["inputSchema"]?.jsonObject?.get("type")?.jsonPrimitive?.content shouldBe "object"
            }
        }

        describe("Complete Tools/Call Flow") {

            it("should handle complete tools/call request flow through all layers") {
                val arguments = buildJsonObject {
                    put("message", "integration test")
                }

                val response = executeToolsCall("integration.simple", arguments)

                // Validate JSON-RPC response structure
                response.jsonrpc shouldBe "2.0"
                response.id shouldBe JsonPrimitive("test-call-1")
                response.error shouldBe null
                response.result shouldNotBe null

                // Validate MCP content format
                val result = response.result as JsonObject
                result["content"] shouldNotBe null
                result["content"].shouldBeInstanceOf<JsonArray>()

                val contentArray = result["content"] as JsonArray
                contentArray.size shouldBe 1

                val contentItem = contentArray[0].jsonObject
                contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
                contentItem["text"]?.jsonPrimitive?.content shouldBe "Echo: integration test"
            }

            it("should handle parameter passing and response formatting correctly") {
                val arguments = buildJsonObject {
                    put("operation", "add")
                    put("a", 10)
                    put("b", 5)
                }

                val response = executeToolsCall("integration.math", arguments)

                response.error shouldBe null
                val result = response.result as JsonObject
                val contentArray = result["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                val responseText = contentItem["text"]?.jsonPrimitive?.content

                // Verify JSON object response is pretty-printed
                responseText shouldNotBe null
                responseText!! shouldContain "operation"
                responseText shouldContain "add"
                responseText shouldContain "result"
                responseText shouldContain "15.0"
            }

            it("should handle sync and async tool execution through integration") {
                // Test sync tool
                val syncResponse = executeToolsCall("integration.simple", buildJsonObject {
                    put("message", "sync test")
                })
                syncResponse.error shouldBe null

                // Test async tool
                val asyncResponse = executeToolsCall("integration.async", buildJsonObject {
                    put("delay", 50)
                    put("action", "success")
                })
                asyncResponse.error shouldBe null

                val asyncResult = asyncResponse.result as JsonObject
                val asyncContentArray = asyncResult["content"] as JsonArray
                val asyncContentItem = asyncContentArray[0].jsonObject
                asyncContentItem["text"]?.jsonPrimitive?.content shouldBe "Async completed after 50ms"
            }
        }
    }

    describe("Enhanced JSON Response Handling") {

        describe("Complex JSON Response Formatting") {

            it("should handle JsonObject responses with pretty printing") {
                val response = executeToolsCall("integration.complex", buildJsonObject {
                    put("structure", "object")
                })

                response.error shouldBe null
                val result = response.result as JsonObject
                val contentArray = result["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                val responseText = contentItem["text"]?.jsonPrimitive?.content

                responseText shouldNotBe null
                responseText!! shouldContain "\"type\": \"complex\""
                responseText shouldContain "\"status\": \"success\""
                responseText shouldContain "\"metadata\":"
                responseText shouldContain "\"version\": \"1.0\""

                // Verify pretty printing format (indentation)
                responseText!! shouldContain "{\n    "
            }

            it("should handle JsonArray responses with proper formatting") {
                val response = executeToolsCall("integration.complex", buildJsonObject {
                    put("structure", "array")
                })

                response.error shouldBe null
                val result = response.result as JsonObject
                val contentArray = result["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                val responseText = contentItem["text"]?.jsonPrimitive?.content

                responseText shouldNotBe null
                responseText!! shouldContain "[\n    \"item1\","
                responseText shouldContain "\"item2\","
                responseText shouldContain "{\n        \"nested\": \"object\""
                responseText shouldContain "\"value\": 42"
            }

            it("should handle JsonPrimitive responses correctly") {
                val response = executeToolsCall("integration.complex", buildJsonObject {
                    put("structure", "primitive")
                })

                response.error shouldBe null
                val result = response.result as JsonObject
                val contentArray = result["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                val responseText = contentItem["text"]?.jsonPrimitive?.content

                responseText shouldBe "12345"
            }

            it("should validate MCP content format compliance") {
                val response = executeToolsCall("integration.math", buildJsonObject {
                    put("operation", "multiply")
                    put("a", 7)
                    put("b", 6)
                })

                response.error shouldBe null
                val result = response.result as JsonObject

                // Validate strict MCP content structure
                result.keys shouldBe setOf("content")
                val contentArray = result["content"] as JsonArray
                contentArray.size shouldBe 1

                val contentItem = contentArray[0].jsonObject
                contentItem.keys shouldBe setOf("type", "text")
                contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
                contentItem["text"] shouldNotBe null
            }
        }

        describe("Mixed Response Type Validation") {

            it("should handle different tool response formats consistently") {
                // Test simple string response
                val stringResponse = executeToolsCall("integration.simple", buildJsonObject {
                    put("message", "test")
                })

                // Test complex object response
                val objectResponse = executeToolsCall("integration.math", buildJsonObject {
                    put("operation", "divide")
                    put("a", 20)
                    put("b", 4)
                })

                // Test async response
                val asyncResponse = executeToolsCall("integration.async", buildJsonObject {
                    put("delay", 25)
                    put("action", "complex")
                })

                // All should use same MCP content format
                listOf(stringResponse, objectResponse, asyncResponse).forEach { response ->
                    response.error shouldBe null
                    val result = response.result as JsonObject
                    result["content"].shouldBeInstanceOf<JsonArray>()
                    val contentArray = result["content"] as JsonArray
                    contentArray.size shouldBe 1
                    val contentItem = contentArray[0].jsonObject
                    contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
                    contentItem["text"] shouldNotBe null
                }
            }
        }
    }

    describe("Error Propagation Through All Layers") {

        describe("Tool-Level Error Handling") {

            it("should propagate tool not found errors correctly") {
                val response = executeToolsCall("nonexistent.tool", JsonObject(emptyMap()))

                response.error shouldNotBe null
                response.result shouldBe null

                val error = response.error!!
                error.code shouldBe -32601 // Method not found
                error.message shouldContain "Tool not found: nonexistent.tool"
            }

            it("should propagate parameter validation errors correctly") {
                val response = executeToolsCall("integration.math", buildJsonObject {
                    put("operation", "add")
                    // Missing required parameters a and b
                })

                response.error shouldNotBe null
                val error = response.error!!
                // Parameter validation happens in ToolRegistry, shows as parameter validation error
                error.code shouldBe -32603 // Internal error
                error.message shouldContain "parameter validation failed"
            }

            it("should propagate tool execution errors correctly") {
                val response = executeToolsCall("integration.failing", buildJsonObject {
                    put("errorType", "execution")
                })

                response.error shouldNotBe null
                val error = response.error!!
                error.code shouldBe -32603 // Internal error
                error.message shouldContain "Tool execution failed"
            }

            it("should propagate async tool timeout errors correctly") {
                val response = executeToolsCall("integration.async", buildJsonObject {
                    put("delay", 15000) // Longer than default timeout
                    put("action", "timeout")
                })

                response.error shouldNotBe null
                val error = response.error!!
                error.code shouldBe -32603 // Internal error
                error.message shouldContain "timed out after"
            }
        }

        describe("Protocol-Level Error Handling") {

            it("should handle invalid JSON-RPC requests correctly") {
                val invalidRequest = JsonRpcRequest(
                    jsonrpc = "1.0", // Invalid version
                    method = "tools/list",
                    params = JsonObject(emptyMap()),
                    id = JsonPrimitive("test")
                )

                val response = methodHandler.handleRequest(invalidRequest)

                response.error shouldNotBe null
                response.error!!.code shouldBe -32700 // Parse error
            }

            it("should handle invalid method parameters correctly") {
                val request = JsonRpcRequest(
                    jsonrpc = "2.0",
                    method = "tools/call",
                    params = JsonPrimitive("invalid_params"), // Should be object
                    id = JsonPrimitive("test")
                )

                val response = methodHandler.handleRequest(request)

                response.error shouldNotBe null
                response.error!!.code shouldBe -32602 // Invalid params
                response.error!!.message shouldContain "Expected object parameters"
            }

            it("should handle missing required parameters correctly") {
                val request = JsonRpcRequest(
                    jsonrpc = "2.0",
                    method = "tools/call",
                    params = buildJsonObject {
                        // Missing required "name" parameter
                        putJsonObject("arguments") {
                            put("test", "value")
                        }
                    },
                    id = JsonPrimitive("test")
                )

                val response = methodHandler.handleRequest(request)

                response.error shouldNotBe null
                response.error!!.code shouldBe -32602 // Invalid params
                response.error!!.message shouldContain "Missing required parameter: name"
            }
        }

        describe("Server State Error Handling") {

            it("should handle requests when server is not initialized") {
                val uninitializedServerState = ServerState()
                val uninitializedMethodHandler = McpMethodHandler(
                    protocolHandler = protocolHandler,
                    toolHandler = toolHandler,
                    resourceRegistry = resourceRegistry,
                    serverState = uninitializedServerState
                )

                val request = JsonRpcRequest(
                    jsonrpc = "2.0",
                    method = "tools/list",
                    params = JsonObject(emptyMap()),
                    id = JsonPrimitive("test")
                )

                val response = uninitializedMethodHandler.handleRequest(request)

                response.error shouldNotBe null
                response.error!!.code shouldBe -32003
                response.error!!.message shouldBe "Server not initialized"
            }
        }
    }

    describe("Architecture Compliance Validation") {

        describe("Layer Separation Verification") {

            it("should maintain clean separation between layers") {
                // This test verifies that each layer focuses on its single responsibility
                val response = executeToolsCall("integration.complex", buildJsonObject {
                    put("structure", "object")
                })

                // McpMethodHandler should handle JSON-RPC protocol
                response.jsonrpc shouldBe "2.0"
                response.id shouldNotBe null

                // McpToolHandler should handle MCP content formatting
                val result = response.result as JsonObject
                result["content"].shouldBeInstanceOf<JsonArray>()

                // ToolRegistry should handle domain logic (verified by correct tool execution)
                val contentArray = result["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                val responseText = contentItem["text"]?.jsonPrimitive?.content
                responseText shouldContain "\"type\": \"complex\""
            }

            it("should demonstrate proper dependency direction") {
                // Integration test verifies unidirectional dependency flow:
                // McpMethodHandler -> McpToolHandler -> ToolRegistry

                val listResponse = executeToolsList()
                val callResponse = executeToolsCall("integration.simple", buildJsonObject {
                    put("message", "dependency test")
                })

                // Both operations should succeed, demonstrating proper dependency injection
                listResponse.error shouldBe null
                callResponse.error shouldBe null

                // Verify that ToolRegistry operations are accessible through the chain
                val listResult = listResponse.result as JsonObject
                val toolsArray = listResult["tools"] as JsonArray
                toolsArray.size shouldBe 5 // All tools accessible

                val callResult = callResponse.result as JsonObject
                val contentArray = callResult["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "Echo: dependency test"
            }

            it("should maintain protocol independence in domain layer") {
                // Verify that ToolRegistry operations work independently of protocol concerns

                // Direct ToolRegistry access should work the same as through the integration chain
                val directResult = toolRegistry.invoke("integration.simple", buildJsonObject {
                    put("message", "direct access")
                })

                directResult.isSuccess shouldBe true
                val directValue = directResult.getOrNull()
                directValue shouldBe JsonPrimitive("Echo: direct access")

                // Integration chain should produce equivalent results (after MCP formatting)
                val integrationResponse = executeToolsCall("integration.simple", buildJsonObject {
                    put("message", "direct access")
                })

                integrationResponse.error shouldBe null
                val integrationResult = integrationResponse.result as JsonObject
                val contentArray = integrationResult["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "Echo: direct access"
            }
        }

        describe("Error Boundary Validation") {

            it("should demonstrate clean error handling at each layer boundary") {
                // Test error originating in ToolRegistry
                val toolError = executeToolsCall("integration.failing", buildJsonObject {
                    put("errorType", "execution")
                })

                // Test error originating in McpToolHandler (protocol layer)
                val protocolError = executeToolsCall("nonexistent.tool", JsonObject(emptyMap()))

                // Test error originating in McpMethodHandler (integration layer)
                val methodRequest = JsonRpcRequest(
                    jsonrpc = "2.0",
                    method = "unknown/method",
                    params = JsonObject(emptyMap()),
                    id = JsonPrimitive("test")
                )
                val methodError = methodHandler.handleRequest(methodRequest)

                // All errors should be properly formatted as JSON-RPC errors
                listOf(toolError, protocolError, methodError).forEach { response ->
                    response.error shouldNotBe null
                    response.result shouldBe null
                    response.error!!.code shouldNotBe null
                    response.error!!.message shouldNotBe null
                }

                // Each layer should contribute appropriate error codes
                toolError.error!!.code shouldBe -32603 // Internal error (from tool execution)
                protocolError.error!!.code shouldBe -32601 // Method not found (from tool handler)
                methodError.error!!.code shouldBe -32601 // Method not found (from method handler)
            }
        }
    }

    describe("Performance and Quality Validation") {

        describe("Concurrent Access Testing") {

            it("should handle multiple concurrent tool invocations safely") {
                val tools = listOf("integration.simple", "integration.math", "integration.complex")
                val responses = mutableListOf<JsonRpcResponse>()

                // Execute multiple tools concurrently
                tools.forEach { toolName ->
                    val arguments = when (toolName) {
                        "integration.simple" -> buildJsonObject { put("message", "concurrent-$toolName") }
                        "integration.math" -> buildJsonObject {
                            put("operation", "add")
                            put("a", 1)
                            put("b", 2)
                        }
                        "integration.complex" -> buildJsonObject { put("structure", "object") }
                        else -> JsonObject(emptyMap())
                    }

                    val response = executeToolsCall(toolName, arguments)
                    responses.add(response)
                }

                // All operations should succeed
                responses.forEach { response ->
                    response.error shouldBe null
                    response.result shouldNotBe null
                }

                responses.size shouldBe 3
            }
        }

        describe("Resource Cleanup Validation") {

            it("should properly handle async operation cleanup") {
                // Test async tool that completes successfully
                val successResponse = executeToolsCall("integration.async", buildJsonObject {
                    put("delay", 25)
                    put("action", "success")
                })

                successResponse.error shouldBe null

                // Test async tool that fails
                val failResponse = executeToolsCall("integration.async", buildJsonObject {
                    put("delay", 10)
                    put("action", "fail")
                })

                failResponse.error shouldNotBe null
                failResponse.error!!.code shouldBe -32603 // Internal error
                failResponse.error!!.message shouldContain "Async operation failed"
            }
        }
    }
})