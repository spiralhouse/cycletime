package io.spiralhouse.cycletime.mcp.tools

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldMatch
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.cycletime.mcp.tools.exceptions.*
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration.Companion.seconds

/**
 * TDD Tests for Tool Registration System - RED Phase
 *
 * Testing dynamic tool registration, discovery, and invocation for the MCP server implementation.
 * These tests define the expected behavior before implementation.
 *
 * All tests should fail with NotImplementedError or compilation errors until implementation is complete.
 *
 * Requirements being tested:
 * 1. Tool definition and interface validation
 * 2. Registration lifecycle (register, update, unregister)
 * 3. Tool discovery and metadata retrieval
 * 4. Tool invocation with parameter validation
 * 5. Parameter validation against JSON Schema
 * 6. Error handling for invalid operations
 * 7. Thread-safe concurrent operations
 * 8. Integration with JSON-RPC protocol
 */
class ToolRegistryTest : DescribeSpec({

    describe("ToolRegistry") {
        lateinit var registry: DefaultToolRegistry

        beforeEach {
            registry = DefaultToolRegistry()
        }

        describe("tool definition and interface") {

            it("should create tool with name, description, and parameter schema") {
                val tool = Tool(
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
                    handler = { params ->
                        val a = params.jsonObject["a"]!!.jsonPrimitive.double
                        val b = params.jsonObject["b"]!!.jsonPrimitive.double
                        Result.success(JsonPrimitive(a + b))
                    }
                )

                tool.name shouldBe "math.add"
                tool.description shouldBe "Adds two numbers"
                tool.parametersSchema["type"]?.jsonPrimitive?.content shouldBe "object"
                tool.isSync shouldBe true
                tool.isAsync shouldBe false
            }

            it("should create async tool with handler using coroutines") {
                val tool = Tool(
                    name = "async.delay",
                    description = "Delays execution for specified milliseconds",
                    parametersSchema = buildJsonObject {
                        put("type", "object")
                        putJsonObject("properties") {
                            putJsonObject("milliseconds") {
                                put("type", "number")
                                put("description", "Delay in milliseconds")
                                put("minimum", 0)
                            }
                        }
                        putJsonArray("required") {
                            add("milliseconds")
                        }
                    },
                    handler = ToolHandler.Async { params ->
                        val ms = params.jsonObject["milliseconds"]!!.jsonPrimitive.long
                        delay(ms)
                        Result.success(JsonPrimitive("delayed for \${ms}ms"))
                    }
                )

                tool.name shouldBe "async.delay"
                tool.isAsync shouldBe true
                tool.isSync shouldBe false
            }

            it("should enforce tool name format validation") {
                shouldThrow<IllegalArgumentException> {
                    Tool(
                        name = "InvalidName",
                        description = "Test",
                        parametersSchema = buildJsonObject { put("type", "object") },
                        handler = { Result.success(JsonPrimitive("test")) }
                    )
                }.message shouldContain "must be lowercase"

                shouldThrow<IllegalArgumentException> {
                    Tool(
                        name = "invalid name with spaces",
                        description = "Test",
                        parametersSchema = buildJsonObject { put("type", "object") },
                        handler = { Result.success(JsonPrimitive("test")) }
                    )
                }.message shouldContain "must be lowercase"
            }

            it("should allow namespaced tool names") {
                val tool = Tool(
                    name = "math.operations.add",
                    description = "Test",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { Result.success(JsonPrimitive("test")) }
                )

                tool.name shouldBe "math.operations.add"
            }

            it("should allow underscores in tool names") {
                val tool = Tool(
                    name = "data_transform.json_to_csv",
                    description = "Test",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { Result.success(JsonPrimitive("test")) }
                )

                tool.name shouldBe "data_transform.json_to_csv"
            }
        }

        describe("registration lifecycle") {

            it("should register new tool successfully") {
                val tool = Tool(
                    name = "math.add",
                    description = "Adds two numbers", 
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { Result.success(JsonPrimitive("test")) }
                )

                val success = registry.register(tool)
                success shouldBe true

                registry.isRegistered("math.add") shouldBe true
                registry.getRegisteredToolNames() shouldContain "math.add"
            }

            it("should reject duplicate tool registration") {
                val tool1 = createMathAddTool()
                val tool2 = createMathAddTool()

                registry.register(tool1) shouldBe true
                registry.register(tool2) shouldBe false

                registry.getRegisteredToolNames() shouldHaveSize 1
            }

            it("should update existing tool successfully") {
                val originalTool = createMathAddTool()
                registry.register(originalTool)

                val updatedTool = Tool(
                    name = "math.add",
                    description = "Updated: Adds two numbers",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { Result.success(JsonPrimitive("updated")) }
                )

                registry.update(updatedTool) shouldBe true
                registry.getTool("math.add")?.description shouldBe "Updated: Adds two numbers"
            }

            it("should fail to update non-existent tool") {
                val tool = createMathAddTool()

                registry.update(tool) shouldBe false
            }

            it("should unregister tool successfully") {
                val tool = createMathAddTool()
                registry.register(tool)

                registry.unregister("math.add") shouldBe true
                registry.isRegistered("math.add") shouldBe false
            }

            it("should fail to unregister non-existent tool") {
                registry.unregister("nonexistent.tool") shouldBe false
            }
        }

        describe("tool discovery and metadata") {

            it("should retrieve tool metadata") {
                val tool1 = createMathAddTool()
                val tool2 = createMathAddTool()

                registry.register(tool1)
                registry.register(tool2)

                val metadata = registry.getToolMetadata("math.add")
                metadata shouldNotBe null
                metadata?.name shouldBe "math.add"
                metadata?.description shouldContain "Adds two numbers"
            }

            it("should get all registered tool names sorted") {
                registry.register(createMathAddTool())
                registry.register(createProjectCreateTool())
                registry.register(createAsyncDelayTool())
                registry.register(createComplexValidationTool())

                val names = registry.getRegisteredToolNames()
                names shouldHaveSize 4
                names shouldBe listOf("async.delay", "math.add", "project.create", "validation.complex")
            }

            it("should get all tool metadata sorted by name") {
                registry.register(createMathAddTool())
                registry.register(createProjectCreateTool())
                registry.register(createAsyncDelayTool())

                val allMetadata = registry.getAllToolMetadata()
                allMetadata shouldHaveSize 3
                allMetadata.map { it.name } shouldBe listOf("async.delay", "math.add", "project.create")
            }

            it("should search tools by description keywords") {
                registry.register(createMathAddTool())
                registry.register(createProjectCreateTool())
                registry.register(createAsyncDelayTool())

                val mathTools = registry.searchTools("math")
                mathTools shouldHaveSize 1
                mathTools.first().name shouldBe "math.add"

                val delayTools = registry.searchTools("delay")
                delayTools shouldHaveSize 1
                delayTools.first().name shouldBe "async.delay"

                val noMatch = registry.searchTools("nonexistent")
                noMatch.shouldBeEmpty()
            }

            it("should search tools case-insensitively") {
                registry.register(createMathAddTool())

                val results = registry.searchTools("MATH")
                results shouldHaveSize 1
                results.first().name shouldBe "math.add"
            }

            it("should return parameter schema for tool") {
                registry.register(createMathAddTool())

                val schema = registry.getParameterSchema("math.add")
                schema shouldNotBe null
                schema?.get("type")?.jsonPrimitive?.content shouldBe "object"
            }
        }

        describe("tool invocation") {

            it("should invoke synchronous tool successfully") {
                val tool = createMathAddTool()
                registry.register(tool)

                val params = buildJsonObject {
                    put("a", 5)
                    put("b", 3)
                }

                val result = registry.invoke("math.add", params)
                result.isSuccess shouldBe true
                result.getOrNull()?.jsonPrimitive?.int shouldBe 8
            }

            it("should invoke asynchronous tool successfully") {
                val tool = createAsyncDelayTool()
                registry.register(tool)

                val params = buildJsonObject {
                    put("milliseconds", 50)
                }

                runBlocking {
                    val result = registry.invokeAsync("async.delay", params, timeout = 1000)
                    result.isSuccess shouldBe true
                    result.getOrNull()?.jsonPrimitive?.content shouldBe "delayed for 50ms"
                }
            }

            it("should handle timeout for long-running async tools") {
                val longRunningTool = Tool(
                    name = "long.running",
                    description = "Tool that runs for a long time",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = ToolHandler.Async { params ->
                        delay(5000) // 5 seconds
                        Result.success(JsonPrimitive("completed"))
                    }
                )
                registry.register(longRunningTool)

                runBlocking {
                    val result = registry.invokeAsync("long.running", JsonObject(emptyMap()), timeout = 100)
                    result.isFailure shouldBe true
                    val error = result.exceptionOrNull()
                    error?.shouldBeInstanceOf<ToolTimeoutException>()
                    (error as ToolTimeoutException).timeoutMs shouldBe 100
                }
            }

            it("should validate parameters against schema") {
                val tool = createComplexValidationTool()
                registry.register(tool)

                val invalidParams = buildJsonObject {
                    put("name", "ab") // Too short, minimum is 3
                    put("age", 200) // Too high, maximum is 150
                    put("active", "not_a_boolean") // Wrong type
                }

                val result = registry.invoke("validation.complex", invalidParams)
                result.isFailure shouldBe true
                val error = result.exceptionOrNull()
                error?.shouldBeInstanceOf<ParameterValidationException>()
                (error as ParameterValidationException).validationErrors.shouldNotContain("validation passed")
            }
        }

        describe("error handling") {

            it("should provide detailed error messages for parameter validation failures") {
                registry.register(createMathAddTool())

                val invalidParams = buildJsonObject {
                    put("a", "not_a_number")
                    put("b", 5)
                }

                val result = registry.invoke("math.add", invalidParams)
                result.isFailure shouldBe true
                
                val error = result.exceptionOrNull()
                error?.shouldBeInstanceOf<ParameterValidationException>()
            }

            it("should format errors for JSON-RPC response") {
                registry.register(createMathAddTool())

                val result = registry.invoke("nonexistent.tool", JsonObject(emptyMap()))
                result.isFailure shouldBe true
                
                val error = result.exceptionOrNull()
                error?.shouldBeInstanceOf<ToolNotFoundException>()
                
                val jsonRpcError = registry.formatErrorForJsonRpc(error!!)
                jsonRpcError.code shouldBe -32601 // Method not found
                jsonRpcError.message shouldContain "Tool not found"
            }

            it("should provide specific error codes") {
                registry.register(createMathAddTool())

                val result = registry.invoke("nonexistent.tool", JsonObject(emptyMap()))
                result.isFailure shouldBe true
                
                val error = result.exceptionOrNull() as ToolNotFoundException
                error.errorCode.name shouldBe "TOOL_NOT_FOUND"
            }

            it("should handle tool execution exceptions") {
                val faultyTool = Tool(
                    name = "faulty.tool",
                    description = "Tool that throws exceptions",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { throw RuntimeException("Tool execution failed") }
                )
                registry.register(faultyTool)

                val result = registry.invoke("faulty.tool", JsonObject(emptyMap()))
                result.isFailure shouldBe true
                
                val error = result.exceptionOrNull()
                error?.shouldBeInstanceOf<ToolExecutionException>()
                (error as ToolExecutionException).cause?.message shouldBe "Tool execution failed"
            }

            it("should handle malformed JSON parameters gracefully") {
                registry.register(createMathAddTool())

                val result = registry.invoke("math.add", JsonPrimitive("not_an_object"))
                result.isFailure shouldBe true
                
                val error = result.exceptionOrNull()
                error?.shouldBeInstanceOf<ParameterValidationException>()
            }
        }

        describe("integration with JSON-RPC protocol") {

            it("should handle tools/list JSON-RPC method") {
                registry.register(createMathAddTool())
                registry.register(createProjectCreateTool())

                val response = registry.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))
                response.isSuccess shouldBe true
                
                val result = response.getOrNull()?.jsonObject
                result shouldNotBe null
                result?.get("tools")?.jsonArray?.size shouldBe 2
            }

            it("should handle tools/call JSON-RPC method") {
                registry.register(createMathAddTool())

                val params = buildJsonObject {
                    put("name", "math.add")
                    putJsonObject("arguments") {
                        put("a", 5)
                        put("b", 3)
                    }
                }

                val response = registry.handleJsonRpcMethod("tools/call", params)
                response.isSuccess shouldBe true
                
                val result = response.getOrNull()?.jsonObject
                result shouldNotBe null
                result?.get("content")?.jsonArray?.get(0)?.jsonObject?.get("text")?.jsonPrimitive?.content shouldBe "8"
            }

            it("should return proper JSON-RPC error responses") {
                val params = buildJsonObject {
                    put("name", "nonexistent.tool")
                    putJsonObject("arguments") {
                        put("test", "value")
                    }
                }

                val response = registry.handleJsonRpcMethod("tools/call", params)
                response.isFailure shouldBe true
                
                val error = response.exceptionOrNull()
                error?.shouldBeInstanceOf<JsonRpcException>()
                (error as JsonRpcException).code shouldBe -32001 // Custom error code for tool not found
            }
        }
    }
})

// Test helper functions for creating example tools

fun createMathAddTool(): Tool {
    return Tool(
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
        handler = { params ->
            val aElement = params.jsonObject["a"]!!.jsonPrimitive
            val bElement = params.jsonObject["b"]!!.jsonPrimitive
            
            // Try to parse as int first to preserve integer type
            val a = aElement.intOrNull ?: aElement.double
            val b = bElement.intOrNull ?: bElement.double
            
            val result = a.toDouble() + b.toDouble()
            
            // Return as int if result is a whole number, otherwise as double
            if (result == result.toInt().toDouble()) {
                Result.success(JsonPrimitive(result.toInt()))
            } else {
                Result.success(JsonPrimitive(result))
            }
        }
    )
}

fun createProjectCreateTool(): Tool {
    return Tool(
        name = "project.create",
        description = "Creates a new project",
        parametersSchema = buildJsonObject {
            put("type", "object")
            putJsonObject("properties") {
                putJsonObject("name") {
                    put("type", "string")
                    put("description", "Project name")
                    put("minLength", 1)
                }
                putJsonObject("description") {
                    put("type", "string") 
                    put("description", "Project description")
                }
            }
            putJsonArray("required") {
                add("name")
            }
        },
        handler = { params ->
            val name = params.jsonObject["name"]!!.jsonPrimitive.content
            val description = params.jsonObject["description"]?.jsonPrimitive?.content ?: ""
            Result.success(buildJsonObject {
                put("id", "proj_\${System.currentTimeMillis()}")
                put("name", name)
                put("description", description)
                put("created", true)
            })
        }
    )
}

fun createAsyncDelayTool(): Tool {
    return Tool(
        name = "async.delay",
        description = "Delays execution for specified milliseconds",
        parametersSchema = buildJsonObject {
            put("type", "object")
            putJsonObject("properties") {
                putJsonObject("milliseconds") {
                    put("type", "number")
                    put("description", "Delay in milliseconds")
                    put("minimum", 0)
                }
            }
            putJsonArray("required") {
                add("milliseconds")
            }
        },
        handler = ToolHandler.Async { params ->
            val ms = params.jsonObject["milliseconds"]!!.jsonPrimitive.long
            delay(ms)
            Result.success(JsonPrimitive("delayed for \${ms}ms"))
        }
    )
}

fun createComplexValidationTool(): Tool {
    return Tool(
        name = "validation.complex",
        description = "Tool with complex parameter validation",
        parametersSchema = buildJsonObject {
            put("type", "object")
            putJsonObject("properties") {
                putJsonObject("name") {
                    put("type", "string")
                    put("minLength", 3)
                    put("maxLength", 50)
                }
                putJsonObject("age") {
                    put("type", "number")
                    put("minimum", 0)
                    put("maximum", 150)
                }
                putJsonObject("active") {
                    put("type", "boolean")
                }
                putJsonObject("address") {
                    put("type", "object")
                    putJsonObject("properties") {
                        putJsonObject("street") {
                            put("type", "string")
                        }
                        putJsonObject("city") {
                            put("type", "string")
                        }
                    }
                    putJsonArray("required") {
                        add("street")
                        add("city")
                    }
                }
                putJsonObject("tags") {
                    put("type", "array")
                    putJsonObject("items") {
                        put("type", "string")
                    }
                }
            }
            putJsonArray("required") {
                add("name")
                add("age") 
                add("active")
            }
        },
        handler = { params ->
            Result.success(JsonPrimitive("validation passed"))
        }
    )
}