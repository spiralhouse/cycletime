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
        lateinit var registry: ToolRegistry

        beforeEach {
            registry = ToolRegistry()
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
                tool.parametersSchema shouldNotBe null
                tool.handler shouldNotBe null
            }

            it("should validate tool name follows naming convention") {
                shouldThrow<IllegalArgumentException> {
                    Tool(
                        name = "InvalidToolName",
                        description = "Invalid name",
                        parametersSchema = buildJsonObject { put("type", "object") },
                        handler = { Result.success(JsonPrimitive("test")) }
                    )
                }

                shouldThrow<IllegalArgumentException> {
                    Tool(
                        name = "invalid-name",
                        description = "Invalid name with dash",
                        parametersSchema = buildJsonObject { put("type", "object") },
                        handler = { Result.success(JsonPrimitive("test")) }
                    )
                }

                shouldThrow<IllegalArgumentException> {
                    Tool(
                        name = "",
                        description = "Empty name",
                        parametersSchema = buildJsonObject { put("type", "object") },
                        handler = { Result.success(JsonPrimitive("test")) }
                    )
                }

                // Valid names should not throw
                Tool(
                    name = "math.add",
                    description = "Valid dotted name",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { Result.success(JsonPrimitive("test")) }
                )

                Tool(
                    name = "simple",
                    description = "Valid simple name",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { Result.success(JsonPrimitive("test")) }
                )
            }

            it("should support synchronous tool handlers") {
                val syncTool = Tool(
                    name = "sync.test",
                    description = "Synchronous test tool",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { params ->
                        Result.success(JsonPrimitive("sync result"))
                    }
                )

                val result = syncTool.handler(JsonObject(emptyMap()))
                result.isSuccess shouldBe true
                result.getOrNull() shouldBe JsonPrimitive("sync result")
            }

            it("should support asynchronous tool handlers") {
                val asyncTool = AsyncTool(
                    name = "async.test",
                    description = "Asynchronous test tool",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { params ->
                        delay(10)
                        Result.success(JsonPrimitive("async result"))
                    }
                )

                runBlocking {
                    val result = asyncTool.handlerAsync(JsonObject(emptyMap()))
                    result.isSuccess shouldBe true
                    result.getOrNull() shouldBe JsonPrimitive("async result")
                }
            }
        }

        describe("registration lifecycle") {

            it("should register new tool successfully") {
                val tool = createMathAddTool()

                val success = registry.register(tool)
                success shouldBe true

                registry.isRegistered("math.add") shouldBe true
                registry.getRegisteredToolNames() shouldContain "math.add"
            }

            it("should prevent duplicate tool registration") {
                val tool1 = createMathAddTool()
                val tool2 = createMathAddTool()

                registry.register(tool1) shouldBe true
                registry.register(tool2) shouldBe false

                registry.getRegisteredToolNames() shouldHaveSize 1
            }

            it("should allow updating existing tool implementation") {
                val originalTool = createMathAddTool()
                val updatedTool = Tool(
                    name = "math.add",
                    description = "Updated: Adds two numbers with validation",
                    parametersSchema = buildJsonObject { 
                        put("type", "object")
                        putJsonObject("properties") {
                            putJsonObject("a") { put("type", "number") }
                            putJsonObject("b") { put("type", "number") }
                        }
                    },
                    handler = { params ->
                        // Different implementation
                        Result.success(JsonPrimitive(42))
                    }
                )

                registry.register(originalTool) shouldBe true
                registry.update(updatedTool) shouldBe true

                val retrievedTool = registry.getTool("math.add")
                retrievedTool?.description shouldBe "Updated: Adds two numbers with validation"
            }

            it("should fail to update non-existent tool") {
                val tool = createMathAddTool()

                registry.update(tool) shouldBe false
            }

            it("should unregister tool successfully") {
                val tool = createMathAddTool()
                registry.register(tool) shouldBe true

                registry.unregister("math.add") shouldBe true
                registry.isRegistered("math.add") shouldBe false
                registry.getRegisteredToolNames() shouldNotContain "math.add"
            }

            it("should fail to unregister non-existent tool") {
                registry.unregister("nonexistent.tool") shouldBe false
            }

            it("should be thread-safe for concurrent registration") {
                val tools = (1..10).map { i ->
                    Tool(
                        name = "test.tool$i",
                        description = "Test tool $i",
                        parametersSchema = buildJsonObject { put("type", "object") },
                        handler = { Result.success(JsonPrimitive(i)) }
                    )
                }

                val futures = tools.map { tool ->
                    CompletableFuture.supplyAsync {
                        registry.register(tool)
                    }
                }

                val results = futures.map { it.get() }
                results.count { it } shouldBe 10 // All registrations should succeed
                registry.getRegisteredToolNames() shouldHaveSize 10
            }

            it("should handle concurrent registration of same tool name") {
                val tool1 = createMathAddTool()
                val tool2 = createMathAddTool()

                val future1 = CompletableFuture.supplyAsync { registry.register(tool1) }
                val future2 = CompletableFuture.supplyAsync { registry.register(tool2) }

                val results = listOf(future1.get(), future2.get())
                results.count { it } shouldBe 1 // Only one should succeed
                registry.getRegisteredToolNames() shouldHaveSize 1
            }
        }

        describe("tool discovery") {

            beforeEach {
                // Register test tools
                registry.register(createMathAddTool())
                registry.register(createProjectCreateTool())
                registry.register(createAsyncDelayTool())
                registry.register(createComplexValidationTool())
            }

            it("should list all registered tools") {
                val toolNames = registry.getRegisteredToolNames()
                toolNames shouldHaveSize 4
                toolNames shouldContain "math.add"
                toolNames shouldContain "project.create"
                toolNames shouldContain "async.delay"
                toolNames shouldContain "validation.complex"
            }

            it("should get specific tool by name") {
                val tool = registry.getTool("math.add")
                tool shouldNotBe null
                tool!!.name shouldBe "math.add"
                tool.description shouldBe "Adds two numbers"
            }

            it("should return null for non-existent tool") {
                val tool = registry.getTool("nonexistent.tool")
                tool shouldBe null
            }

            it("should get tool metadata without exposing implementation") {
                val metadata = registry.getToolMetadata("math.add")
                metadata shouldNotBe null
                metadata!!.name shouldBe "math.add"
                metadata.description shouldBe "Adds two numbers"
                metadata.parametersSchema shouldNotBe null
                // Handler should not be exposed in metadata
            }

            it("should list all tool metadata") {
                val metadataList = registry.getAllToolMetadata()
                metadataList shouldHaveSize 4
                
                val mathTool = metadataList.find { it.name == "math.add" }
                mathTool shouldNotBe null
                mathTool!!.description shouldBe "Adds two numbers"
            }

            it("should search tools by description keywords") {
                val mathTools = registry.searchTools("number")
                mathTools shouldHaveSize 1
                mathTools.first().name shouldBe "math.add"

                val projectTools = registry.searchTools("project")
                projectTools shouldHaveSize 1
                projectTools.first().name shouldBe "project.create"

                val noMatch = registry.searchTools("nonexistent")
                noMatch.shouldBeEmpty()
            }

            it("should search tools case-insensitively") {
                val results = registry.searchTools("NUMBER")
                results shouldHaveSize 1
                results.first().name shouldBe "math.add"
            }

            it("should get tool parameter schema for client validation") {
                val schema = registry.getParameterSchema("math.add")
                schema shouldNotBe null
                schema!!.jsonObject["type"]?.jsonPrimitive?.content shouldBe "object"
                
                val properties = schema.jsonObject["properties"]?.jsonObject
                properties shouldNotBe null
                properties!!["a"] shouldNotBe null
                properties["b"] shouldNotBe null
            }
        }

        describe("tool invocation") {

            beforeEach {
                registry.register(createMathAddTool())
                registry.register(createProjectCreateTool())
                registry.register(createAsyncDelayTool())
            }

            it("should invoke tool with valid parameters") {
                val params = buildJsonObject {
                    put("a", 5)
                    put("b", 3)
                }

                val result = registry.invoke("math.add", params)
                result.isSuccess shouldBe true
                result.getOrNull() shouldBe JsonPrimitive(8)
            }

            it("should return error for missing tool") {
                val params = buildJsonObject {
                    put("test", "value")
                }

                val result = registry.invoke("nonexistent.tool", params)
                result.isFailure shouldBe true
                result.exceptionOrNull()?.shouldBeInstanceOf<ToolNotFoundException>()
            }

            it("should validate parameters against tool schema") {
                // Missing required parameter
                val invalidParams1 = buildJsonObject {
                    put("a", 5)
                    // Missing required parameter "b"
                }

                val result1 = registry.invoke("math.add", invalidParams1)
                result1.isFailure shouldBe true
                result1.exceptionOrNull()?.shouldBeInstanceOf<ParameterValidationException>()

                // Wrong parameter type
                val invalidParams2 = buildJsonObject {
                    put("a", "not_a_number")
                    put("b", 3)
                }

                val result2 = registry.invoke("math.add", invalidParams2)
                result2.isFailure shouldBe true
                result2.exceptionOrNull()?.shouldBeInstanceOf<ParameterValidationException>()
            }

            it("should handle tool execution errors") {
                val errorTool = Tool(
                    name = "error.tool",
                    description = "Tool that always throws error",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { params ->
                        throw RuntimeException("Tool execution failed")
                    }
                )
                registry.register(errorTool)

                val result = registry.invoke("error.tool", JsonObject(emptyMap()))
                result.isFailure shouldBe true
                result.exceptionOrNull()?.shouldBeInstanceOf<ToolExecutionException>()
                result.exceptionOrNull()!!.message shouldContain "Tool execution failed"
            }

            it("should invoke async tools") {
                runBlocking {
                    val params = buildJsonObject {
                        put("milliseconds", 50)
                    }

                    val result = registry.invokeAsync("async.delay", params, timeout = 30000)
                    result.isSuccess shouldBe true
                    result.getOrNull()?.jsonPrimitive?.content shouldBe "delayed for 50ms"
                }
            }

            it("should handle timeout for long-running async tools") {
                val longRunningTool = AsyncTool(
                    name = "long.running",
                    description = "Tool that runs for a long time",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { params ->
                        delay(5000) // 5 seconds
                        Result.success(JsonPrimitive("completed"))
                    }
                )
                registry.register(longRunningTool)

                runBlocking {
                    val result = registry.invokeAsync("long.running", JsonObject(emptyMap()), timeout = 100)
                    result.isFailure shouldBe true
                    result.exceptionOrNull()?.shouldBeInstanceOf<ToolTimeoutException>()
                }
            }
        }

        describe("parameter validation") {

            beforeEach {
                registry.register(createComplexValidationTool())
            }

            xit("should validate required parameters")
                { // SPI-582: Enhance MCP Tool Parameter Validation
                val missingRequired = buildJsonObject {
                    put("optional_field", "test")
                    // Missing required "name" field
                }

                val result = registry.invoke("validation.complex", missingRequired)
                result.isFailure shouldBe true
                val error = result.exceptionOrNull() as ParameterValidationException
                error.message shouldContain "required"
                error.message shouldContain "name"
            }

            xit("should validate parameter types")
                { // SPI-582: Enhance MCP Tool Parameter Validation
                val wrongType = buildJsonObject {
                    put("name", 123) // Should be string
                    put("age", "twenty") // Should be number
                    put("active", "yes") // Should be boolean
                }

                val result = registry.invoke("validation.complex", wrongType)
                result.isFailure shouldBe true
                val error = result.exceptionOrNull() as ParameterValidationException
                error.validationErrors shouldHaveSize 3
            }

            xit("should validate string constraints")
                { // SPI-582: Enhance MCP Tool Parameter Validation
                val invalidString = buildJsonObject {
                    put("name", "xy") // Too short (minLength: 3)
                    put("age", 25)
                    put("active", true)
                }

                val result = registry.invoke("validation.complex", invalidString)
                result.isFailure shouldBe true
                val error = result.exceptionOrNull() as ParameterValidationException
                error.message shouldContain "minLength"
            }

            it("should validate number constraints") {
                val invalidNumber = buildJsonObject {
                    put("name", "John")
                    put("age", -5) // Should be minimum 0
                    put("active", true)
                }

                val result = registry.invoke("validation.complex", invalidNumber)
                result.isFailure shouldBe true
                val error = result.exceptionOrNull() as ParameterValidationException
                error.message shouldContain "minimum"
            }

            it("should validate nested objects") {
                val invalidNested = buildJsonObject {
                    put("name", "John")
                    put("age", 25)
                    put("active", true)
                    putJsonObject("address") {
                        put("street", "123 Main St")
                        // Missing required "city" field
                    }
                }

                val result = registry.invoke("validation.complex", invalidNested)
                result.isFailure shouldBe true
                val error = result.exceptionOrNull() as ParameterValidationException
                error.message shouldContain "city"
            }

            it("should validate arrays") {
                val invalidArray = buildJsonObject {
                    put("name", "John")
                    put("age", 25)
                    put("active", true)
                    putJsonArray("tags") {
                        add("tag1")
                        add(123) // Should be string
                    }
                }

                val result = registry.invoke("validation.complex", invalidArray)
                result.isFailure shouldBe true
                val error = result.exceptionOrNull() as ParameterValidationException
                error.message shouldContain "array"
            }

            it("should pass validation for valid parameters") {
                val validParams = buildJsonObject {
                    put("name", "John Doe")
                    put("age", 25)
                    put("active", true)
                    putJsonObject("address") {
                        put("street", "123 Main St")
                        put("city", "Springfield")
                    }
                    putJsonArray("tags") {
                        add("developer")
                        add("kotlin")
                    }
                }

                val result = registry.invoke("validation.complex", validParams)
                result.isSuccess shouldBe true
            }
        }

        describe("error handling") {

            it("should provide detailed error messages for parameter validation failures") {
                registry.register(createMathAddTool())

                val invalidParams = buildJsonObject {
                    put("a", "not_a_number")
                    put("b", true)
                }

                val result = registry.invoke("math.add", invalidParams)
                result.isFailure shouldBe true
                val error = result.exceptionOrNull() as ParameterValidationException
                
                error.toolName shouldBe "math.add"
                error.validationErrors shouldHaveSize 2
                error.message shouldContain "parameter validation failed"
            }

            it("should format errors for JSON-RPC response") {
                registry.register(createMathAddTool())

                val invalidParams = buildJsonObject {
                    put("a", "invalid")
                }

                val result = registry.invoke("math.add", invalidParams)
                result.isFailure shouldBe true
                
                val jsonRpcError = registry.formatErrorForJsonRpc(result.exceptionOrNull()!!)
                jsonRpcError.code shouldBe -32602 // Invalid params
                jsonRpcError.message shouldContain "Invalid method parameter(s)"
                jsonRpcError.data shouldNotBe null
            }

            it("should provide specific error codes") {
                // Tool not found
                var result = registry.invoke("nonexistent.tool", JsonObject(emptyMap()))
                var error1 = result.exceptionOrNull() as ToolNotFoundException
                error1.errorCode shouldBe ToolErrorCode.TOOL_NOT_FOUND

                // Parameter validation error
                registry.register(createMathAddTool())
                result = registry.invoke("math.add", buildJsonObject { put("invalid", true) })
                var error2 = result.exceptionOrNull() as ParameterValidationException
                error2.errorCode shouldBe ToolErrorCode.INVALID_PARAMETERS

                // Tool execution error
                val errorTool = Tool(
                    name = "error.tool",
                    description = "Error tool",
                    parametersSchema = buildJsonObject { put("type", "object") },
                    handler = { throw RuntimeException("execution failed") }
                )
                registry.register(errorTool)
                result = registry.invoke("error.tool", JsonObject(emptyMap()))
                var error3 = result.exceptionOrNull() as ToolExecutionException
                error3.errorCode shouldBe ToolErrorCode.EXECUTION_ERROR
            }

            it("should handle malformed JSON parameters gracefully") {
                registry.register(createMathAddTool())

                // This would typically come from malformed JSON parsing
                val malformedJson = JsonNull
                
                val result = registry.invoke("math.add", malformedJson)
                result.isFailure shouldBe true
                result.exceptionOrNull()?.shouldBeInstanceOf<ParameterValidationException>()
            }
        }

        describe("integration with JSON-RPC protocol") {

            it("should handle tools/list JSON-RPC method") {
                registry.register(createMathAddTool())
                registry.register(createProjectCreateTool())

                val response = registry.handleJsonRpcMethod("tools/list", JsonObject(emptyMap()))
                response.isSuccess shouldBe true
                
                val result = response.getOrNull()!!.jsonObject
                val tools = result["tools"]!!.jsonArray
                tools shouldHaveSize 2
                
                val mathTool = tools.find { 
                    it.jsonObject["name"]?.jsonPrimitive?.content == "math.add" 
                }
                mathTool shouldNotBe null
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
                
                val result = response.getOrNull()!!.jsonObject
                result["content"]?.jsonArray?.get(0)?.jsonObject?.get("text")?.jsonPrimitive?.content shouldBe "8"
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
                (error as JsonRpcException).code shouldBe -32601 // Method not found (tool not found)
            }
        }
    }
})

// Test helper functions for creating example tools

private fun createMathAddTool(): Tool {
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

private fun createProjectCreateTool(): Tool {
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
                put("id", "proj_${System.currentTimeMillis()}")
                put("name", name)
                put("description", description)
                put("created", true)
            })
        }
    )
}

private fun createAsyncDelayTool(): AsyncTool {
    return AsyncTool(
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
        handler = { params ->
            val ms = params.jsonObject["milliseconds"]!!.jsonPrimitive.long
            delay(ms)
            Result.success(JsonPrimitive("delayed for ${ms}ms"))
        }
    )
}

private fun createComplexValidationTool(): Tool {
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

