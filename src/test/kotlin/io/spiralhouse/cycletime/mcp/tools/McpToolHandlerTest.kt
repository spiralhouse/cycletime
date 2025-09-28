package io.spiralhouse.cycletime.mcp.tools

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcErrorCodes
import io.spiralhouse.cycletime.mcp.tools.exceptions.JsonRpcException
import kotlinx.coroutines.delay
import kotlinx.serialization.json.*

/**
 * Comprehensive test suite for McpToolHandler ensuring complete coverage of JSON-RPC protocol handling.
 *
 * This test suite verifies the protocol-specific behavior of McpToolHandler, testing:
 * 1. JSON-RPC method routing (tools/list, tools/call, unknown methods)
 * 2. Parameter validation and error handling with correct error codes
 * 3. Response formatting for all method types
 * 4. Integration with ToolRegistry for tool operations
 * 5. Async tool handling with timeout management
 *
 * The tests are designed to ensure 100% line coverage of the McpToolHandler implementation
 * while maintaining separation between protocol handling and domain logic.
 */
class McpToolHandlerTest : DescribeSpec({

    // ===== Test Helper Functions =====

    fun createMockSyncTool(name: String = "test.tool"): Tool {
        return Tool(
            name = name,
            description = "Test synchronous tool",
            parametersSchema = buildJsonObject {
                put("type", "object")
                putJsonObject("properties") {
                    putJsonObject("param1") {
                        put("type", "string")
                        put("description", "Test parameter")
                    }
                }
                // param1 is optional, not required
            },
            handler = ToolHandler.Sync { params ->
                val param1 = params.jsonObject["param1"]?.jsonPrimitive?.content ?: "default"
                Result.success(JsonPrimitive("sync result: $param1"))
            }
        )
    }

    fun createMockAsyncTool(name: String = "async.tool"): Tool {
        return Tool(
            name = name,
            description = "Test asynchronous tool",
            parametersSchema = buildJsonObject {
                put("type", "object")
                putJsonObject("properties") {
                    putJsonObject("delay") {
                        put("type", "number")
                        put("description", "Delay in milliseconds")
                    }
                }
            },
            handler = ToolHandler.Async { params ->
                val delayMs = params.jsonObject["delay"]?.jsonPrimitive?.long ?: 10L
                delay(delayMs)
                Result.success(JsonPrimitive("async result after ${delayMs}ms"))
            }
        )
    }

    fun createMockFailingTool(name: String = "failing.tool"): Tool {
        return Tool(
            name = name,
            description = "Tool that always fails",
            parametersSchema = buildJsonObject {
                put("type", "object")
            },
            handler = ToolHandler.Sync { _ ->
                Result.failure(RuntimeException("Tool execution failed"))
            }
        )
    }

    fun createMockToolRegistry(): ToolRegistry {
        val registry = ToolRegistry()
        registry.register(createMockSyncTool("test.sync"))
        registry.register(createMockAsyncTool("test.async"))
        registry.register(createMockFailingTool("test.failing"))

        // Additional tools for comprehensive testing
        registry.register(Tool(
            name = "math.add",
            description = "Adds two numbers",
            parametersSchema = buildJsonObject {
                put("type", "object")
                putJsonObject("properties") {
                    putJsonObject("a") {
                        put("type", "number")
                        put("description", "First number")
                    }
                    putJsonObject("b") {
                        put("type", "number")
                        put("description", "Second number")
                    }
                }
                putJsonArray("required") {
                    add("a")
                    add("b")
                }
            },
            handler = ToolHandler.Sync { params ->
                val a = params.jsonObject["a"]?.jsonPrimitive?.double ?: 0.0
                val b = params.jsonObject["b"]?.jsonPrimitive?.double ?: 0.0
                Result.success(JsonPrimitive(a + b))
            }
        ))

        return registry
    }

    describe("McpToolHandler") {
        lateinit var toolRegistry: ToolRegistry
        lateinit var handler: McpToolHandler

        beforeEach {
            toolRegistry = createMockToolRegistry()
            handler = DefaultMcpToolHandler(toolRegistry)
        }

        describe("JSON-RPC method routing") {

            it("should handle tools/list method successfully") {
                val result = handler.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))

                result.isSuccess shouldBe true
                val response = result.getOrNull()
                response shouldNotBe null
                response.shouldBeInstanceOf<JsonObject>()

                val responseObj = response as JsonObject
                responseObj["tools"] shouldNotBe null
                responseObj["tools"].shouldBeInstanceOf<JsonArray>()

                val toolsArray = responseObj["tools"] as JsonArray
                toolsArray.size shouldBe 4 // test.sync, test.async, test.failing, math.add

                // Verify tool structure
                val firstTool = toolsArray[0].jsonObject
                firstTool["name"] shouldNotBe null
                firstTool["description"] shouldNotBe null
                firstTool["inputSchema"] shouldNotBe null
            }

            it("should handle tools/call method successfully for sync tools") {
                val params = buildJsonObject {
                    put("name", "test.sync")
                    putJsonObject("arguments") {
                        put("param1", "test_value")
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isSuccess shouldBe true
                val response = result.getOrNull()
                response shouldNotBe null
                response.shouldBeInstanceOf<JsonObject>()

                val responseObj = response as JsonObject
                responseObj["content"] shouldNotBe null
                responseObj["content"].shouldBeInstanceOf<JsonArray>()

                val contentArray = responseObj["content"] as JsonArray
                contentArray.size shouldBe 1

                val contentItem = contentArray[0].jsonObject
                contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
                contentItem["text"]?.jsonPrimitive?.content shouldBe "sync result: test_value"
            }

            it("should handle tools/call method successfully for async tools") {
                val params = buildJsonObject {
                    put("name", "test.async")
                    putJsonObject("arguments") {
                        put("delay", 50)
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isSuccess shouldBe true
                val response = result.getOrNull()
                response shouldNotBe null
                response.shouldBeInstanceOf<JsonObject>()

                val responseObj = response as JsonObject
                val contentArray = responseObj["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "async result after 50ms"
            }

            it("should handle tools/call method with missing arguments parameter") {
                val params = buildJsonObject {
                    put("name", "test.sync")
                    // No arguments parameter - should default to empty object
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isSuccess shouldBe true
                val response = result.getOrNull()
                response shouldNotBe null

                val responseObj = response as JsonObject
                val contentArray = responseObj["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "sync result: default"
            }

            it("should return method not found error for unknown methods") {
                val result = handler.handleJsonRpcMethod("unknown/method", JsonObject(emptyMap()))

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull()
                exception.shouldBeInstanceOf<JsonRpcException>()

                val jsonRpcException = exception as JsonRpcException
                jsonRpcException.code shouldBe -32601 // Method not found
                jsonRpcException.message shouldContain "Method not found: unknown/method"
            }
        }

        describe("parameter validation and error handling") {

            it("should return invalid params error for non-object parameters") {
                val invalidParams = JsonPrimitive("invalid_string_params")

                val result = handler.handleJsonRpcMethod("tools/call", invalidParams)

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull()
                exception.shouldBeInstanceOf<JsonRpcException>()

                val jsonRpcException = exception as JsonRpcException
                jsonRpcException.code shouldBe -32602 // Invalid params
                jsonRpcException.message shouldContain "Invalid parameters: expected object"
            }

            it("should return invalid params error for missing name parameter") {
                val paramsWithoutName = buildJsonObject {
                    putJsonObject("arguments") {
                        put("param1", "value")
                    }
                    // Missing required "name" parameter
                }

                val result = handler.handleJsonRpcMethod("tools/call", paramsWithoutName)

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull()
                exception.shouldBeInstanceOf<JsonRpcException>()

                val jsonRpcException = exception as JsonRpcException
                jsonRpcException.code shouldBe -32602 // Invalid params
                jsonRpcException.message shouldContain "Missing required parameter: name"
            }

            it("should return method not found error for nonexistent tool") {
                val params = buildJsonObject {
                    put("name", "nonexistent.tool")
                    putJsonObject("arguments") {
                        put("param", "value")
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull()
                exception.shouldBeInstanceOf<JsonRpcException>()

                val jsonRpcException = exception as JsonRpcException
                jsonRpcException.code shouldBe -32601 // Method not found
                jsonRpcException.message shouldContain "Tool not found: nonexistent.tool"
            }

            it("should return internal error for tool execution failures") {
                val params = buildJsonObject {
                    put("name", "test.failing")
                    putJsonObject("arguments") {
                        put("param", "value")
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull()
                exception.shouldBeInstanceOf<JsonRpcException>()

                val jsonRpcException = exception as JsonRpcException
                jsonRpcException.code shouldBe JsonRpcErrorCodes.INTERNAL_ERROR // -32603
                jsonRpcException.message shouldContain "Tool execution failed"
            }
        }

        describe("response formatting") {

            it("should format tools/list response with correct JSON structure") {
                val result = handler.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))
                val response = result.getOrNull() as JsonObject

                // Verify root structure
                response.keys shouldBe setOf("tools")

                val toolsArray = response["tools"] as JsonArray
                toolsArray.forEach { toolElement ->
                    val tool = toolElement.jsonObject
                    tool.keys shouldBe setOf("name", "description", "inputSchema")

                    tool["name"].shouldBeInstanceOf<JsonPrimitive>()
                    tool["description"].shouldBeInstanceOf<JsonPrimitive>()
                    tool["inputSchema"].shouldBeInstanceOf<JsonObject>()
                }
            }

            it("should format tools/call response with correct content structure") {
                val params = buildJsonObject {
                    put("name", "math.add")
                    putJsonObject("arguments") {
                        put("a", 5)
                        put("b", 3)
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)
                val response = result.getOrNull() as JsonObject

                // Verify response structure
                response.keys shouldBe setOf("content")

                val contentArray = response["content"] as JsonArray
                contentArray.size shouldBe 1

                val contentItem = contentArray[0].jsonObject
                contentItem.keys shouldBe setOf("type", "text")
                contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
                contentItem["text"]?.jsonPrimitive?.content shouldBe "8.0"
            }

            it("should handle string content extraction correctly") {
                val params = buildJsonObject {
                    put("name", "test.sync")
                    putJsonObject("arguments") {
                        put("param1", "string_test")
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)
                val response = result.getOrNull() as JsonObject

                val contentArray = response["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "sync result: string_test"
            }

            it("should handle non-string JSON content correctly") {
                // Test with a tool that returns a number
                val params = buildJsonObject {
                    put("name", "math.add")
                    putJsonObject("arguments") {
                        put("a", 10)
                        put("b", 5)
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)
                val response = result.getOrNull() as JsonObject

                val contentArray = response["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "15.0"
            }

            it("should format error responses correctly") {
                val result = handler.handleJsonRpcMethod("invalid/method", JsonObject(emptyMap()))

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull() as JsonRpcException

                exception.code shouldBe -32601
                exception.message shouldBe "Method not found: invalid/method"
                exception.data shouldBe null
            }
        }

        describe("ToolRegistry integration") {

            it("should delegate tool listing to ToolRegistry") {
                val result = handler.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))
                val response = result.getOrNull() as JsonObject
                val toolsArray = response["tools"] as JsonArray

                // Verify all registered tools are included
                val toolNames = toolsArray.map { it.jsonObject["name"]?.jsonPrimitive?.content }
                toolNames shouldBe listOf("math.add", "test.async", "test.failing", "test.sync")
            }

            it("should use ToolRegistry metadata for tool descriptions") {
                val result = handler.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))
                val response = result.getOrNull() as JsonObject
                val toolsArray = response["tools"] as JsonArray

                val mathTool = toolsArray.find {
                    it.jsonObject["name"]?.jsonPrimitive?.content == "math.add"
                }?.jsonObject

                mathTool shouldNotBe null
                mathTool!!["description"]?.jsonPrimitive?.content shouldBe "Adds two numbers"
            }

            it("should use ToolRegistry parameter schemas") {
                val result = handler.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))
                val response = result.getOrNull() as JsonObject
                val toolsArray = response["tools"] as JsonArray

                val mathTool = toolsArray.find {
                    it.jsonObject["name"]?.jsonPrimitive?.content == "math.add"
                }?.jsonObject

                mathTool shouldNotBe null
                val schema = mathTool!!["inputSchema"]?.jsonObject
                schema shouldNotBe null
                schema!!["type"]?.jsonPrimitive?.content shouldBe "object"
                schema["properties"].shouldBeInstanceOf<JsonObject>()
                schema["required"].shouldBeInstanceOf<JsonArray>()
            }

            it("should delegate sync tool invocation to ToolRegistry") {
                val params = buildJsonObject {
                    put("name", "test.sync")
                    putJsonObject("arguments") {
                        put("param1", "delegated_value")
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)
                val response = result.getOrNull() as JsonObject

                val contentArray = response["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "sync result: delegated_value"
            }

            it("should delegate async tool invocation to ToolRegistry") {
                val params = buildJsonObject {
                    put("name", "test.async")
                    putJsonObject("arguments") {
                        put("delay", 25)
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)
                val response = result.getOrNull() as JsonObject

                val contentArray = response["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "async result after 25ms"
            }
        }

        describe("async tool handling") {

            it("should handle async tool execution with default timeout") {
                val params = buildJsonObject {
                    put("name", "test.async")
                    putJsonObject("arguments") {
                        put("delay", 100)
                    }
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isSuccess shouldBe true
                val response = result.getOrNull() as JsonObject
                val contentArray = response["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "async result after 100ms"
            }

            it("should handle async tool timeout scenarios") {
                // Create a tool that takes longer than the timeout
                val longRunningTool = Tool(
                    name = "long.running",
                    description = "Tool that takes a long time",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = ToolHandler.Async { _ ->
                        delay(15000) // 15 seconds - longer than default timeout
                        Result.success(JsonPrimitive("should not reach here"))
                    }
                )
                toolRegistry.register(longRunningTool)

                val params = buildJsonObject {
                    put("name", "long.running")
                    putJsonObject("arguments") {}
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull()
                exception.shouldBeInstanceOf<JsonRpcException>()

                val jsonRpcException = exception as JsonRpcException
                jsonRpcException.code shouldBe -32603 // Internal error
                jsonRpcException.message shouldContain "timed out after"
            }

            it("should handle async tool execution exceptions") {
                val asyncFailingTool = Tool(
                    name = "async.failing",
                    description = "Async tool that throws exception",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = ToolHandler.Async { _ ->
                        throw RuntimeException("Async execution error")
                    }
                )
                toolRegistry.register(asyncFailingTool)

                val params = buildJsonObject {
                    put("name", "async.failing")
                    putJsonObject("arguments") {}
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull()
                exception.shouldBeInstanceOf<JsonRpcException>()

                val jsonRpcException = exception as JsonRpcException
                jsonRpcException.code shouldBe -32603 // Internal error
                jsonRpcException.message shouldContain "Tool execution failed"
                jsonRpcException.message shouldContain "Async execution error"
            }
        }

        describe("edge cases and boundary conditions") {

            it("should handle empty tool registry") {
                val emptyRegistry = ToolRegistry()
                val emptyHandler = DefaultMcpToolHandler(emptyRegistry)

                val result = emptyHandler.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))
                val response = result.getOrNull() as JsonObject
                val toolsArray = response["tools"] as JsonArray

                toolsArray.size shouldBe 0
            }

            it("should handle null name parameter") {
                val params = buildJsonObject {
                    put("name", JsonNull)
                    putJsonObject("arguments") {}
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull() as JsonRpcException
                // Note: JsonNull.jsonPrimitive?.content returns "null" string, which is treated as tool name
                exception.code shouldBe -32601 // Tool not found
                exception.message shouldContain "Tool not found"
            }

            it("should handle non-string name parameter") {
                val params = buildJsonObject {
                    put("name", 123) // Non-string name
                    putJsonObject("arguments") {}
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isFailure shouldBe true
                val exception = result.exceptionOrNull() as JsonRpcException
                // Note: JsonPrimitive(123).content returns "123" string, which is treated as tool name
                exception.code shouldBe -32601 // Tool not found
                exception.message shouldContain "Tool not found"
            }

            it("should handle tool that returns JsonNull") {
                val nullReturningTool = Tool(
                    name = "null.returning",
                    description = "Tool that returns null",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = ToolHandler.Sync { _ ->
                        Result.success(JsonNull)
                    }
                )
                toolRegistry.register(nullReturningTool)

                val params = buildJsonObject {
                    put("name", "null.returning")
                    putJsonObject("arguments") {}
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isSuccess shouldBe true
                val response = result.getOrNull() as JsonObject
                val contentArray = response["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                contentItem["text"]?.jsonPrimitive?.content shouldBe "null"
            }

            it("should handle tool that returns complex JSON object") {
                val complexTool = Tool(
                    name = "complex.returning",
                    description = "Tool that returns complex object",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = ToolHandler.Sync { _ ->
                        Result.success(buildJsonObject {
                            put("status", "success")
                            put("data", buildJsonArray {
                                add("item1")
                                add("item2")
                            })
                        })
                    }
                )
                toolRegistry.register(complexTool)

                val params = buildJsonObject {
                    put("name", "complex.returning")
                    putJsonObject("arguments") {}
                }

                val result = handler.handleJsonRpcMethod("tools/call", params)

                result.isSuccess shouldBe true
                val response = result.getOrNull() as JsonObject
                val contentArray = response["content"] as JsonArray
                val contentItem = contentArray[0].jsonObject
                val text = contentItem["text"]?.jsonPrimitive?.content
                text shouldContain "status"
                text shouldContain "success"
                text shouldContain "data"
            }
        }
    }
})