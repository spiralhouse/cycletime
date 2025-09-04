package io.spiralhouse.cycletime.mcp.protocol

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import kotlinx.serialization.json.*

/**
 * TDD Tests for JSON-RPC 2.0 Protocol Handler - RED Phase
 *
 * Testing JSON-RPC 2.0 specification compliance for the MCP server implementation.
 * These tests define the expected behavior for request parsing, response generation,
 * error handling, and request/response correlation according to the JSON-RPC 2.0 specification.
 *
 * References:
 * - JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification
 * - MCP Protocol: https://modelcontextprotocol.io/
 *
 * Requirements being tested:
 * 1. Request parsing with proper validation
 * 2. Response generation with correct format
 * 3. Error handling with standard error codes
 * 4. Batch request support
 * 5. Notification handling (no response for requests without id)
 * 6. Request/response correlation via id matching
 */
class JsonRpcProtocolHandlerTest : DescribeSpec({

    describe("JsonRpcProtocolHandler") {
        lateinit var handler: JsonRpcProtocolHandler

        beforeEach {
            handler = JsonRpcProtocolHandler()
        }

        describe("request parsing") {

            describe("valid requests") {

                it("should parse valid JSON-RPC 2.0 request with all fields") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "test_method",
                            "params": {"key": "value"},
                            "id": 1
                        }
                    """

                    val request = handler.parseRequest(json)

                    request.jsonrpc shouldBe "2.0"
                    request.method shouldBe "test_method"
                    request.params shouldNotBe null
                    request.id shouldBe JsonPrimitive(1)
                }

                it("should parse request with string id") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "test_method",
                            "id": "request-123"
                        }
                    """

                    val request = handler.parseRequest(json)

                    request.id shouldBe JsonPrimitive("request-123")
                }

                it("should parse request with null id") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "test_method",
                            "id": null
                        }
                    """

                    val request = handler.parseRequest(json)

                    request.id shouldBe JsonNull
                }

                it("should parse request without params") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "test_method",
                            "id": 1
                        }
                    """

                    val request = handler.parseRequest(json)

                    request.params shouldBe null
                }

                it("should parse notification (request without id)") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "notify_method",
                            "params": {"message": "hello"}
                        }
                    """

                    val request = handler.parseRequest(json)

                    request.method shouldBe "notify_method"
                    request.id shouldBe null
                }

                it("should parse request with array params") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "test_method",
                            "params": [1, 2, 3],
                            "id": 1
                        }
                    """

                    val request = handler.parseRequest(json)

                    request.params.shouldBeInstanceOf<JsonArray>()
                    (request.params as JsonArray).size shouldBe 3
                }

                it("should parse request with object params") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "test_method",
                            "params": {"name": "John", "age": 30},
                            "id": 1
                        }
                    """

                    val request = handler.parseRequest(json)

                    request.params.shouldBeInstanceOf<JsonObject>()
                    val params = request.params as JsonObject
                    params["name"] shouldBe JsonPrimitive("John")
                    params["age"] shouldBe JsonPrimitive(30)
                }
            }

            describe("invalid JSON") {

                it("should throw JsonRpcParseError for malformed JSON") {
                    val invalidJson = """{"jsonrpc": "2.0", "method": "test", "id": 1,}""" // trailing comma

                    val exception = shouldThrow<JsonRpcParseError> {
                        handler.parseRequest(invalidJson)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.PARSE_ERROR
                    exception.message shouldContain "Parse error"
                }

                it("should throw JsonRpcParseError for non-JSON string") {
                    val nonJson = "this is not json"

                    val exception = shouldThrow<JsonRpcParseError> {
                        handler.parseRequest(nonJson)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.PARSE_ERROR
                }

                it("should throw JsonRpcParseError for empty string") {
                    val exception = shouldThrow<JsonRpcParseError> {
                        handler.parseRequest("")
                    }

                    exception.code shouldBe JsonRpcErrorCodes.PARSE_ERROR
                }

                it("should throw JsonRpcParseError for null input") {
                    val exception = shouldThrow<JsonRpcParseError> {
                        handler.parseRequest(null)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.PARSE_ERROR
                }
            }

            describe("missing required fields") {

                it("should throw JsonRpcInvalidRequest for missing jsonrpc field") {
                    val json = """
                        {
                            "method": "test_method",
                            "id": 1
                        }
                    """

                    val exception = shouldThrow<JsonRpcInvalidRequest> {
                        handler.parseRequest(json)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                    exception.message shouldContain "jsonrpc"
                }

                it("should throw JsonRpcInvalidRequest for wrong jsonrpc version") {
                    val json = """
                        {
                            "jsonrpc": "1.0",
                            "method": "test_method",
                            "id": 1
                        }
                    """

                    val exception = shouldThrow<JsonRpcInvalidRequest> {
                        handler.parseRequest(json)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                    exception.message shouldContain "must be '2.0'"
                }

                it("should throw JsonRpcInvalidRequest for missing method field") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "id": 1
                        }
                    """

                    val exception = shouldThrow<JsonRpcInvalidRequest> {
                        handler.parseRequest(json)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                    exception.message shouldContain "method"
                }

                it("should throw JsonRpcInvalidRequest for empty method") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "",
                            "id": 1
                        }
                    """

                    val exception = shouldThrow<JsonRpcInvalidRequest> {
                        handler.parseRequest(json)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                    exception.message shouldContain "method cannot be empty"
                }
            }

            describe("invalid field types") {

                it("should throw JsonRpcInvalidRequest for non-string method") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": 123,
                            "id": 1
                        }
                    """

                    val exception = shouldThrow<JsonRpcInvalidRequest> {
                        handler.parseRequest(json)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                    exception.message shouldContain "method must be a string"
                }

                it("should throw JsonRpcInvalidRequest for invalid id type") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "test_method",
                            "id": {"invalid": "object"}
                        }
                    """

                    val exception = shouldThrow<JsonRpcInvalidRequest> {
                        handler.parseRequest(json)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                    exception.message shouldContain "id must be a string, number, or null"
                }

                it("should throw JsonRpcInvalidRequest for non-structured params") {
                    val json = """
                        {
                            "jsonrpc": "2.0",
                            "method": "test_method",
                            "params": "invalid_params",
                            "id": 1
                        }
                    """

                    val exception = shouldThrow<JsonRpcInvalidRequest> {
                        handler.parseRequest(json)
                    }

                    exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                    exception.message shouldContain "params must be an object or array"
                }
            }
        }

        describe("batch request parsing") {

            it("should parse valid batch request") {
                val json = """
                    [
                        {"jsonrpc": "2.0", "method": "method1", "id": 1},
                        {"jsonrpc": "2.0", "method": "method2", "id": 2},
                        {"jsonrpc": "2.0", "method": "notify", "params": {"data": "test"}}
                    ]
                """

                val requests = handler.parseBatchRequest(json)

                requests shouldHaveSize 3
                requests[0].method shouldBe "method1"
                requests[1].method shouldBe "method2"
                requests[2].method shouldBe "notify"
                requests[2].id shouldBe null // notification
            }

            it("should throw JsonRpcInvalidRequest for empty batch") {
                val json = "[]"

                val exception = shouldThrow<JsonRpcInvalidRequest> {
                    handler.parseBatchRequest(json)
                }

                exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                exception.message shouldContain "batch cannot be empty"
            }

            it("should handle mixed valid and invalid requests in batch") {
                val json = """
                    [
                        {"jsonrpc": "2.0", "method": "valid_method", "id": 1},
                        {"jsonrpc": "2.0", "id": 2},
                        {"jsonrpc": "2.0", "method": "another_valid", "id": 3}
                    ]
                """

                val exception = shouldThrow<JsonRpcInvalidRequest> {
                    handler.parseBatchRequest(json)
                }

                exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                exception.message shouldContain "Invalid request in batch at index 1"
            }
        }

        describe("response generation") {

            describe("success responses") {

                it("should create success response with result") {
                    val result = JsonObject(mapOf("data" to JsonPrimitive("test_result")))
                    val id = JsonPrimitive(123)

                    val response = handler.createResponse(id, result)

                    response.jsonrpc shouldBe "2.0"
                    response.result shouldBe result
                    response.error shouldBe null
                    response.id shouldBe id
                }

                it("should create success response with null result") {
                    val id = JsonPrimitive("test-id")

                    val response = handler.createResponse(id, JsonNull)

                    response.result shouldBe JsonNull
                    response.error shouldBe null
                    response.id shouldBe id
                }

                it("should create success response with string result") {
                    val result = JsonPrimitive("simple string result")
                    val id = JsonPrimitive(456)

                    val response = handler.createResponse(id, result)

                    response.result shouldBe result
                    response.id shouldBe id
                }

                it("should create success response with array result") {
                    val result = JsonArray(listOf(
                        JsonPrimitive(1),
                        JsonPrimitive(2),
                        JsonPrimitive(3)
                    ))
                    val id = JsonPrimitive("array-test")

                    val response = handler.createResponse(id, result)

                    response.result shouldBe result
                    response.id shouldBe id
                }
            }

            describe("error responses") {

                it("should create error response with standard error") {
                    val id = JsonPrimitive(789)

                    val response = handler.createErrorResponse(
                        id = id,
                        code = JsonRpcErrorCodes.METHOD_NOT_FOUND,
                        message = "Method not found"
                    )

                    response.jsonrpc shouldBe "2.0"
                    response.result shouldBe null
                    response.error shouldNotBe null
                    response.error!!.code shouldBe JsonRpcErrorCodes.METHOD_NOT_FOUND
                    response.error!!.message shouldBe "Method not found"
                    response.error!!.data shouldBe null
                    response.id shouldBe id
                }

                it("should create error response with custom error data") {
                    val errorData = JsonObject(mapOf(
                        "details" to JsonPrimitive("Additional error information"),
                        "timestamp" to JsonPrimitive("2025-01-15T10:00:00Z")
                    ))
                    val id = JsonPrimitive("error-test")

                    val response = handler.createErrorResponse(
                        id = id,
                        code = JsonRpcErrorCodes.INTERNAL_ERROR,
                        message = "Internal error occurred",
                        data = errorData
                    )

                    response.error!!.code shouldBe JsonRpcErrorCodes.INTERNAL_ERROR
                    response.error!!.message shouldBe "Internal error occurred"
                    response.error!!.data shouldBe errorData
                    response.id shouldBe id
                }

                it("should create error response for parse error with null id") {
                    val response = handler.createErrorResponse(
                        id = null,
                        code = JsonRpcErrorCodes.PARSE_ERROR,
                        message = "Parse error"
                    )

                    response.error!!.code shouldBe JsonRpcErrorCodes.PARSE_ERROR
                    response.id shouldBe JsonNull
                }

                it("should create error response for invalid request") {
                    val response = handler.createErrorResponse(
                        id = null,
                        code = JsonRpcErrorCodes.INVALID_REQUEST,
                        message = "Invalid Request"
                    )

                    response.error!!.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                    response.error!!.message shouldBe "Invalid Request"
                    response.id shouldBe JsonNull
                }

                it("should create error response for invalid params") {
                    val id = JsonPrimitive("param-error-test")

                    val response = handler.createErrorResponse(
                        id = id,
                        code = JsonRpcErrorCodes.INVALID_PARAMS,
                        message = "Invalid params"
                    )

                    response.error!!.code shouldBe JsonRpcErrorCodes.INVALID_PARAMS
                    response.error!!.message shouldBe "Invalid params"
                    response.id shouldBe id
                }
            }
        }

        describe("notification handling") {

            it("should identify notification requests (no id field)") {
                val json = """
                    {
                        "jsonrpc": "2.0",
                        "method": "notification_method",
                        "params": {"message": "hello"}
                    }
                """

                val request = handler.parseRequest(json)

                handler.isNotification(request) shouldBe true
            }

            it("should identify regular requests (has id field)") {
                val json = """
                    {
                        "jsonrpc": "2.0",
                        "method": "regular_method",
                        "id": 1
                    }
                """

                val request = handler.parseRequest(json)

                handler.isNotification(request) shouldBe false
            }

            it("should not generate response for notifications") {
                val request = JsonRpcRequest(
                    jsonrpc = "2.0",
                    method = "notify_method",
                    params = null,
                    id = null
                )

                val response = handler.handleNotification(request)

                response shouldBe null
            }
        }

        describe("request/response correlation") {

            it("should maintain id correlation between request and response") {
                val originalId = JsonPrimitive("correlation-test-123")
                val result = JsonPrimitive("test result")

                val response = handler.createResponse(originalId, result)

                response.id shouldBe originalId
            }

            it("should handle concurrent requests with unique ids") {
                val id1 = JsonPrimitive(1)
                val id2 = JsonPrimitive(2)
                val id3 = JsonPrimitive("string-id")

                val response1 = handler.createResponse(id1, JsonPrimitive("result1"))
                val response2 = handler.createResponse(id2, JsonPrimitive("result2"))
                val response3 = handler.createResponse(id3, JsonPrimitive("result3"))

                response1.id shouldBe id1
                response2.id shouldBe id2
                response3.id shouldBe id3

                // Ensure responses don't interfere with each other
                response1.result shouldBe JsonPrimitive("result1")
                response2.result shouldBe JsonPrimitive("result2")
                response3.result shouldBe JsonPrimitive("result3")
            }

            it("should handle null id properly") {
                val response = handler.createResponse(null, JsonPrimitive("result"))

                response.id shouldBe JsonNull
            }
        }

        describe("error code constants") {

            it("should define standard JSON-RPC error codes") {
                JsonRpcErrorCodes.PARSE_ERROR shouldBe -32700
                JsonRpcErrorCodes.INVALID_REQUEST shouldBe -32600
                JsonRpcErrorCodes.METHOD_NOT_FOUND shouldBe -32601
                JsonRpcErrorCodes.INVALID_PARAMS shouldBe -32602
                JsonRpcErrorCodes.INTERNAL_ERROR shouldBe -32603
            }

            it("should support server-defined error codes") {
                // Server error codes range from -32000 to -32099
                val customErrorCode = -32001

                val response = handler.createErrorResponse(
                    id = JsonPrimitive("custom-error"),
                    code = customErrorCode,
                    message = "Custom server error"
                )

                response.error!!.code shouldBe customErrorCode
                response.error!!.message shouldBe "Custom server error"
            }
        }

        describe("JSON serialization") {

            it("should serialize response to valid JSON") {
                val response = handler.createResponse(
                    id = JsonPrimitive("serialize-test"),
                    result = JsonObject(mapOf("status" to JsonPrimitive("success")))
                )

                val json = handler.serializeResponse(response)

                json shouldContain "\"jsonrpc\":\"2.0\""
                json shouldContain "\"id\":\"serialize-test\""
                json shouldContain "\"result\""
                json shouldContain "\"status\":\"success\""
            }

            it("should serialize error response to valid JSON") {
                val response = handler.createErrorResponse(
                    id = JsonPrimitive("error-serialize-test"),
                    code = JsonRpcErrorCodes.METHOD_NOT_FOUND,
                    message = "Method not found"
                )

                val json = handler.serializeResponse(response)

                json shouldContain "\"jsonrpc\":\"2.0\""
                json shouldContain "\"id\":\"error-serialize-test\""
                json shouldContain "\"error\""
                json shouldContain "\"code\":-32601"
                json shouldContain "\"message\":\"Method not found\""
            }

            it("should serialize batch responses to valid JSON array") {
                val responses = listOf(
                    handler.createResponse(JsonPrimitive(1), JsonPrimitive("result1")),
                    handler.createErrorResponse(JsonPrimitive(2), JsonRpcErrorCodes.INVALID_PARAMS, "Invalid params"),
                    handler.createResponse(JsonPrimitive(3), JsonPrimitive("result3"))
                )

                val json = handler.serializeBatchResponse(responses)

                json shouldContain "["
                json shouldContain "]"
                json shouldContain "\"id\":1"
                json shouldContain "\"id\":2"
                json shouldContain "\"id\":3"
                json shouldContain "\"result\":\"result1\""
                json shouldContain "\"error\""
            }
        }

        describe("edge cases and error conditions") {

            it("should handle extremely large request ids") {
                val largeId = JsonPrimitive(Long.MAX_VALUE)
                val response = handler.createResponse(largeId, JsonPrimitive("result"))

                response.id shouldBe largeId
            }

            it("should handle unicode in method names") {
                val json = """
                    {
                        "jsonrpc": "2.0",
                        "method": "测试方法",
                        "id": 1
                    }
                """

                val request = handler.parseRequest(json)

                request.method shouldBe "测试方法"
            }

            it("should handle deeply nested params") {
                val json = """
                    {
                        "jsonrpc": "2.0",
                        "method": "deep_method",
                        "params": {
                            "level1": {
                                "level2": {
                                    "level3": {
                                        "data": "deep_value"
                                    }
                                }
                            }
                        },
                        "id": 1
                    }
                """

                val request = handler.parseRequest(json)

                request.params.shouldBeInstanceOf<JsonObject>()
                val params = request.params as JsonObject
                val level1 = params["level1"] as JsonObject
                val level2 = level1["level2"] as JsonObject
                val level3 = level2["level3"] as JsonObject
                level3["data"] shouldBe JsonPrimitive("deep_value")
            }

            it("should handle method names with special characters") {
                val json = """
                    {
                        "jsonrpc": "2.0",
                        "method": "rpc.method-with_special.chars",
                        "id": 1
                    }
                """

                val request = handler.parseRequest(json)

                request.method shouldBe "rpc.method-with_special.chars"
            }

            it("should throw appropriate error for method names starting with 'rpc.' (reserved)") {
                val json = """
                    {
                        "jsonrpc": "2.0",
                        "method": "rpc.reserved_method",
                        "id": 1
                    }
                """

                val exception = shouldThrow<JsonRpcInvalidRequest> {
                    handler.parseRequest(json)
                }

                exception.code shouldBe JsonRpcErrorCodes.INVALID_REQUEST
                exception.message shouldContain "method names starting with 'rpc.' are reserved"
            }
        }
    }
})