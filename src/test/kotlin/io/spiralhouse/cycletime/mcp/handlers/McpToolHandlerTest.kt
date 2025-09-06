package io.spiralhouse.cycletime.mcp.handlers

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.mcp.protocol.*
import io.spiralhouse.cycletime.mcp.server.handlers.DefaultMcpMethodHandler
import io.spiralhouse.cycletime.mcp.tools.DefaultToolRegistry
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.AsyncTool
import io.spiralhouse.cycletime.mcp.tools.ToolMetadata
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import kotlinx.serialization.json.*

/**
 * RED Phase TDD Tests for MCP Tool Handler - SPI-572
 *
 * Focused tests for MCP tool-related methods:
 * - tools/list
 * - tools/call (sync and async)
 * - Tool parameter validation
 * - Tool error handling
 * - Tool metadata handling
 *
 * Tests cover tool discovery, parameter validation, execution,
 * result formatting, and comprehensive error handling.
 *
 * All tests should FAIL initially as the implementation is missing.
 */
class McpToolHandlerTest : StringSpec({

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

    // ===== TOOLS/LIST METHOD TESTS =====

    "should return empty tool list when no tools are registered" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/list",
            params = null,
            id = JsonPrimitive("tools-empty")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val tools = result["tools"] as JsonArray
        tools shouldHaveSize 0
    }

    "should list all registered tools with complete metadata" {
        // Register tools with different parameter schemas
        val simpleTool = createTestTool(
            name = "simple.tool",
            description = "A simple tool for testing",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("input", buildJsonObject {
                        put("type", "string")
                        put("description", "Input string")
                    })
                })
                put("required", buildJsonArray { add("input") })
            }
        )

        val complexTool = createTestTool(
            name = "complex.tool",
            description = "A complex tool with multiple parameters",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("mode", buildJsonObject {
                        put("type", "string")
                        put("enum", buildJsonArray { 
                            add("fast")
                            add("slow")
                            add("accurate") 
                        })
                        put("description", "Processing mode")
                        put("default", "fast")
                    })
                    put("count", buildJsonObject {
                        put("type", "integer")
                        put("minimum", 1)
                        put("maximum", 100)
                        put("description", "Number of items to process")
                    })
                    put("options", buildJsonObject {
                        put("type", "object")
                        put("properties", buildJsonObject {
                            put("verbose", buildJsonObject {
                                put("type", "boolean")
                                put("default", false)
                            })
                        })
                    })
                })
                put("required", buildJsonArray { 
                    add("mode")
                    add("count")
                })
            }
        )

        toolRegistry.register(simpleTool)
        toolRegistry.register(complexTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/list",
            params = null,
            id = JsonPrimitive("tools-list-complete")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val tools = result["tools"] as JsonArray
        tools shouldHaveSize 2

        // Verify simple tool
        val simpleToolJson = tools.first { 
            (it as JsonObject)["name"]?.jsonPrimitive?.content == "simple_tool" 
        } as JsonObject

        simpleToolJson["name"]?.jsonPrimitive?.content shouldBe "simple_tool"
        simpleToolJson["description"]?.jsonPrimitive?.content shouldBe "A simple tool for testing"
        simpleToolJson["inputSchema"] shouldNotBe null

        val simpleSchema = simpleToolJson["inputSchema"] as JsonObject
        simpleSchema["type"]?.jsonPrimitive?.content shouldBe "object"
        simpleSchema["properties"] shouldNotBe null
        simpleSchema["required"] shouldNotBe null

        // Verify complex tool
        val complexToolJson = tools.first {
            (it as JsonObject)["name"]?.jsonPrimitive?.content == "complex_tool"
        } as JsonObject

        complexToolJson["name"]?.jsonPrimitive?.content shouldBe "complex_tool"
        complexToolJson["description"]?.jsonPrimitive?.content shouldBe "A complex tool with multiple parameters"
        
        val complexSchema = complexToolJson["inputSchema"] as JsonObject
        val properties = complexSchema["properties"] as JsonObject
        properties.containsKey("mode") shouldBe true
        properties.containsKey("count") shouldBe true
        properties.containsKey("options") shouldBe true
    }

    "should handle tool registry errors during listing" {
        // Register a tool that will cause errors during metadata retrieval
        val problematicTool = createProblematicTool("problematic_tool")
        val workingTool = createTestTool(
            name = "working.tool",
            description = "A working tool",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            }
        )

        toolRegistry.register(problematicTool)
        toolRegistry.register(workingTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/list",
            params = null,
            id = JsonPrimitive("tools-with-errors")
        )

        val response = methodHandler.handleRequest(request)

        // Should handle errors gracefully and return working tools
        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val tools = result["tools"] as JsonArray
        // Should still include working tool, exclude problematic one
        tools shouldHaveSize 1

        val tool = tools[0] as JsonObject
        tool["name"]?.jsonPrimitive?.content shouldBe "working_tool"
    }

    // ===== TOOLS/CALL SYNCHRONOUS TESTS =====

    "should execute tool with valid parameters and return formatted result" {
        val echoTool = createTestTool(
            name = "echo.tool",
            description = "Echoes input with prefix",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("message", buildJsonObject {
                        put("type", "string")
                        put("description", "Message to echo")
                    })
                    put("prefix", buildJsonObject {
                        put("type", "string")
                        put("description", "Prefix for message")
                        put("default", "Echo:")
                    })
                })
                put("required", buildJsonArray { add("message") })
            },
            implementation = { params ->
                val paramsObj = params as JsonObject
                val message = paramsObj["message"]?.jsonPrimitive?.content ?: ""
                val prefix = paramsObj["prefix"]?.jsonPrimitive?.content ?: "Echo:"
                JsonPrimitive("$prefix $message")
            }
        )

        toolRegistry.register(echoTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "echo.tool")
                put("arguments", buildJsonObject {
                    put("message", "Hello, MCP!")
                    put("prefix", "Response:")
                })
            },
            id = JsonPrimitive("tool-call-success")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val content = result["content"] as JsonArray
        content shouldHaveSize 1

        val textContent = content[0] as JsonObject
        textContent["type"]?.jsonPrimitive?.content shouldBe "text"
        textContent["text"]?.jsonPrimitive?.content shouldBe "Response: Hello, MCP!"
    }

    "should validate required parameters are present" {
        val strictTool = createTestTool(
            name = "strict.tool",
            description = "Tool with strict parameter requirements",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("required_param", buildJsonObject {
                        put("type", "string")
                        put("description", "This parameter is required")
                    })
                    put("optional_param", buildJsonObject {
                        put("type", "string")
                        put("description", "This parameter is optional")
                    })
                })
                put("required", buildJsonArray { add("required_param") })
            }
        )

        toolRegistry.register(strictTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "strict.tool")
                put("arguments", buildJsonObject {
                    put("optional_param", "I'm here")
                    // Missing required_param
                })
            },
            id = JsonPrimitive("missing-required-param")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "validation failed"
        response.error!!.message shouldContain "required_param"
    }

    "should validate parameter types according to schema" {
        val typedTool = createTestTool(
            name = "typed.tool",
            description = "Tool with typed parameters",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("number_param", buildJsonObject {
                        put("type", "integer")
                        put("minimum", 1)
                        put("maximum", 100)
                    })
                    put("boolean_param", buildJsonObject {
                        put("type", "boolean")
                    })
                    put("array_param", buildJsonObject {
                        put("type", "array")
                        put("items", buildJsonObject {
                            put("type", "string")
                        })
                    })
                })
                put("required", buildJsonArray { 
                    add("number_param")
                    add("boolean_param")
                })
            }
        )

        toolRegistry.register(typedTool)

        // Test invalid number parameter
        val invalidNumberRequest = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "typed.tool")
                put("arguments", buildJsonObject {
                    put("number_param", "not_a_number")
                    put("boolean_param", true)
                })
            },
            id = JsonPrimitive("invalid-number")
        )

        val numberResponse = methodHandler.handleRequest(invalidNumberRequest)

        numberResponse.error shouldNotBe null
        numberResponse.error!!.code shouldBe -32602 // Invalid params
        numberResponse.error!!.message shouldContain "type validation failed"

        // Test out of range number
        val outOfRangeRequest = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "typed.tool")
                put("arguments", buildJsonObject {
                    put("number_param", 150) // > maximum of 100
                    put("boolean_param", true)
                })
            },
            id = JsonPrimitive("out-of-range")
        )

        val rangeResponse = methodHandler.handleRequest(outOfRangeRequest)

        rangeResponse.error shouldNotBe null
        rangeResponse.error!!.code shouldBe -32602 // Invalid params
        rangeResponse.error!!.message shouldContain "validation failed"
    }

    "should return tool not found error for non-existent tool" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "nonexistent.tool")
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("tool-not-found")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32001 // Tool not found (server-defined error)
        response.error!!.message shouldContain "Tool not found"
        response.error!!.message shouldContain "nonexistent_tool"
    }

    "should handle tool execution errors gracefully" {
        val failingTool = createTestTool(
            name = "failing.tool",
            description = "A tool that always fails",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            implementation = { _ ->
                throw RuntimeException("Tool execution failed")
            }
        )

        toolRegistry.register(failingTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "failing.tool")
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("tool-execution-failure")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32004 // Tool execution error (server-defined error)
        response.error!!.message shouldContain "Tool execution failed"
        
        // Should include error details
        response.error!!.data shouldNotBe null
        val errorData = response.error!!.data as JsonObject
        errorData["exception"] shouldNotBe null
    }

    "should handle different result types and format them correctly" {
        val multiTypeTool = createTestTool(
            name = "multi.type.tool",
            description = "Tool that returns different result types",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("result_type", buildJsonObject {
                        put("type", "string")
                        put("enum", buildJsonArray { 
                            add("string")
                            add("number") 
                            add("object")
                            add("array")
                            add("null")
                        })
                    })
                })
                put("required", buildJsonArray { add("result_type") })
            },
            implementation = { params ->
                val type = (params as JsonObject)["result_type"]?.jsonPrimitive?.content
                when (type) {
                    "string" -> JsonPrimitive("String result")
                    "number" -> JsonPrimitive(42)
                    "object" -> buildJsonObject {
                        put("message", "Object result")
                        put("value", 123)
                    }
                    "array" -> buildJsonArray {
                        add("item1")
                        add("item2")
                        add("item3")
                    }
                    "null" -> JsonNull
                    else -> JsonPrimitive("Unknown type")
                }
            }
        )

        toolRegistry.register(multiTypeTool)

        val resultTypes = listOf("string", "number", "object", "array", "null")

        resultTypes.forEach { resultType ->
            val request = JsonRpcRequest(
                jsonrpc = "2.0",
                method = "tools/call",
                params = buildJsonObject {
                    put("name", "multi.type.tool")
                    put("arguments", buildJsonObject {
                        put("result_type", resultType)
                    })
                },
                id = JsonPrimitive("multi-type-$resultType")
            )

            val response = methodHandler.handleRequest(request)

            response.error shouldBe null
            response.result shouldNotBe null

            val result = response.result as JsonObject
            val content = result["content"] as JsonArray
            content shouldHaveSize 1

            val textContent = content[0] as JsonObject
            textContent["type"]?.jsonPrimitive?.content shouldBe "text"
            textContent["text"] shouldNotBe null
        }
    }

    // ===== TOOLS/CALL ASYNCHRONOUS TESTS =====

    "should execute async tool with timeout handling" {
        val asyncTool = createTestAsyncTool(
            name = "async.tool",
            description = "An asynchronous tool",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("delay", buildJsonObject {
                        put("type", "integer")
                        put("minimum", 0)
                        put("maximum", 5000)
                        put("description", "Delay in milliseconds")
                        put("default", 100)
                    })
                })
            },
            asyncImplementation = { params ->
                val delay = (params as JsonObject)["delay"]?.jsonPrimitive?.longOrNull ?: 100L
                kotlinx.coroutines.delay(delay)
                JsonPrimitive("Async result after ${delay}ms delay")
            }
        )

        toolRegistry.register(asyncTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "async.tool")
                put("arguments", buildJsonObject {
                    put("delay", 200)
                })
                put("timeout", 5000) // 5 second timeout
            },
            id = JsonPrimitive("async-tool-success")
        )

        val response = methodHandler.handleRequestAsync(request)

        response.error shouldBe null
        response.result shouldNotBe null

        val result = response.result as JsonObject
        val content = result["content"] as JsonArray
        val textContent = content[0] as JsonObject
        textContent["text"]?.jsonPrimitive?.content shouldBe "Async result after 200ms delay"
    }


    // ===== PARAMETER VALIDATION EDGE CASES =====

    "should handle missing tool name parameter" {
        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                // Missing "name" parameter
                put("arguments", buildJsonObject {})
            },
            id = JsonPrimitive("missing-tool-name")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "tool name"
    }

    "should handle malformed arguments parameter" {
        val testTool = createTestTool("test_tool", "Test", buildJsonObject { put("type", "object") })
        toolRegistry.register(testTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "test.tool")
                put("arguments", "invalid_arguments_format") // Should be object
            },
            id = JsonPrimitive("malformed-arguments")
        )

        val response = methodHandler.handleRequest(request)

        response.error shouldNotBe null
        response.error!!.code shouldBe -32602 // Invalid params
        response.error!!.message shouldContain "arguments must be an object"
    }

    "should provide default empty arguments when missing" {
        val noArgsTool = createTestTool(
            name = "no.args.tool",
            description = "Tool that accepts no arguments",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
            implementation = { params ->
                JsonPrimitive("No args result")
            }
        )

        toolRegistry.register(noArgsTool)

        val request = JsonRpcRequest(
            jsonrpc = "2.0",
            method = "tools/call",
            params = buildJsonObject {
                put("name", "no.args.tool")
                // Missing arguments - should default to empty object
            },
            id = JsonPrimitive("missing-arguments")
        )

        val response = methodHandler.handleRequest(request)

        // Should succeed with empty arguments
        response.error shouldBe null
        response.result shouldNotBe null
    }

})

// ===== TEST HELPER FUNCTIONS =====

private fun createProblematicTool(name: String): Tool {
    return createTestTool(
        name = name,
        description = "Problematic tool that causes errors",
        parametersSchema = buildJsonObject { put("type", "object") },
        shouldFail = true
    )
}

private fun createTestTool(
    name: String,
    description: String,
    parametersSchema: JsonObject,
    implementation: (JsonElement) -> JsonElement = { JsonNull },
    shouldFail: Boolean = false
): Tool {
    return Tool(
        name = name,
        description = description,
        parametersSchema = parametersSchema,
        handler = { params ->
            if (shouldFail) {
                Result.failure(RuntimeException("Tool metadata error simulation"))
            } else {
                try {
                    Result.success(implementation(params))
                } catch (e: Exception) {
                    Result.failure(e)
                }
            }
        }
    )
}

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