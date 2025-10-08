package io.spiralhouse.cycletime.unit.post

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.mcp.http.*
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import kotlinx.serialization.json.*

/**
 * TDD RED Phase: JSON-RPC Request Parsing Unit Tests for POST Endpoint
 *
 * Tests for parsing JSON-RPC 2.0 requests received via HTTP POST.
 * These tests verify request validation, parameter extraction, and error handling
 * specific to the SSE transport's POST endpoint.
 *
 * Note: This complements JsonRpcProtocolHandlerTest by focusing on HTTP-specific
 * aspects like header validation and request routing.
 *
 * EXPECTED FAILURES (RED Phase):
 * - POST request handler doesn't exist
 * - Session header validation not implemented
 * - Request routing logic not implemented
 *
 * These tests will pass once the Developer agent implements POST endpoint logic.
 */
class JsonRpcRequestParsingTest : StringSpec({

    "should parse JSON-RPC request from POST body" {
        // Note: JsonRpcRequest already exists from WebSocket implementation
        val requestBody = """{"jsonrpc":"2.0","method":"tools/list","id":1}"""

        val request = parseJsonRpcRequest(requestBody)

        request.jsonrpc shouldBe "2.0"
        request.method shouldBe "tools/list"
        request.id shouldBe JsonPrimitive(1)
    }

    "should validate JSON-RPC 2.0 format" {
        // EXPECTED FAILURE: Validation logic doesn't exist for POST endpoint
        val invalidRequest = """{"method":"test","id":1}""" // Missing jsonrpc field

        shouldThrow<JsonRpcValidationException> {
            validateJsonRpcRequest(invalidRequest)
        }
    }

    "should validate required jsonrpc version field" {
        // EXPECTED FAILURE: Version validation not implemented
        val wrongVersion = """{"jsonrpc":"1.0","method":"test","id":1}"""

        val exception = shouldThrow<JsonRpcValidationException> {
            validateJsonRpcRequest(wrongVersion)
        }

        exception.message shouldBe "jsonrpc version must be '2.0'"
    }

    "should extract method name from request" {
        // EXPECTED FAILURE: Method extraction utility doesn't exist
        val request = """{"jsonrpc":"2.0","method":"resources/list","id":2}"""

        val methodName = extractMethodName(request)

        methodName shouldBe "resources/list"
    }

    "should extract request ID for correlation" {
        // EXPECTED FAILURE: ID extraction utility doesn't exist
        val request1 = """{"jsonrpc":"2.0","method":"test","id":123}"""
        val request2 = """{"jsonrpc":"2.0","method":"test","id":"str-id"}"""
        val request3 = """{"jsonrpc":"2.0","method":"notify"}""" // No ID

        extractRequestId(request1) shouldBe JsonPrimitive(123)
        extractRequestId(request2) shouldBe JsonPrimitive("str-id")
        extractRequestId(request3).shouldBeNull()
    }

    "should parse request parameters as JsonObject" {
        // EXPECTED FAILURE: Parameter parsing not implemented
        val request = """{"jsonrpc":"2.0","method":"test","params":{"key":"value"},"id":1}"""

        val params = extractParams(request)

        params.shouldNotBeNull()
        params.shouldBeInstanceOf<JsonObject>()
        params["key"] shouldBe JsonPrimitive("value")
    }

    "should parse request parameters as JsonArray" {
        // EXPECTED FAILURE: Array parameter support not implemented
        val request = """{"jsonrpc":"2.0","method":"test","params":[1,2,3],"id":1}"""

        val params = extractParams(request)

        params.shouldNotBeNull()
        params.shouldBeInstanceOf<JsonArray>()
        (params as JsonArray).size shouldBe 3
    }

    "should handle request without parameters" {
        // EXPECTED FAILURE: Null parameter handling not implemented
        val request = """{"jsonrpc":"2.0","method":"test","id":1}"""

        val params = extractParams(request)

        params.shouldBeNull()
    }

    "should reject malformed JSON" {
        // EXPECTED FAILURE: JSON parsing error handling doesn't exist
        val malformed = """{"jsonrpc":"2.0","method":"test",}""" // Trailing comma

        shouldThrow<JsonParseException> {
            parseJsonRpcRequest(malformed)
        }
    }

    "should validate method name format" {
        // EXPECTED FAILURE: Method name validation not implemented
        val invalidMethod = """{"jsonrpc":"2.0","method":"","id":1}""" // Empty method

        shouldThrow<JsonRpcValidationException> {
            validateJsonRpcRequest(invalidMethod)
        }
    }

    "should detect notification requests (no id)" {
        // EXPECTED FAILURE: Notification detection logic doesn't exist
        val notification = """{"jsonrpc":"2.0","method":"notifications/cancelled"}"""

        val request = parseJsonRpcRequest(notification)

        isNotification(request) shouldBe true
    }

    "should detect regular requests (with id)" {
        // EXPECTED FAILURE: Request type detection not implemented
        val regularRequest = """{"jsonrpc":"2.0","method":"tools/call","id":5}"""

        val request = parseJsonRpcRequest(regularRequest)

        isNotification(request) shouldBe false
    }

    "should validate MCP-specific method names" {
        // EXPECTED FAILURE: MCP method validation not implemented
        val validMethods = listOf(
            "initialize",
            "tools/list",
            "tools/call",
            "resources/list",
            "resources/read",
            "resources/templates/list",
            "prompts/list",
            "prompts/get"
        )

        validMethods.forEach { method ->
            val request = """{"jsonrpc":"2.0","method":"$method","id":1}"""
            validateMcpMethod(method) shouldBe true
        }
    }

    "should reject unknown MCP methods" {
        // EXPECTED FAILURE: Method whitelist validation doesn't exist
        val invalidMethod = "unknown/method"

        validateMcpMethod(invalidMethod) shouldBe false
    }

    "should parse tools/call request with arguments" {
        // EXPECTED FAILURE: Tool call parsing not implemented
        val toolCallRequest = """
            {
                "jsonrpc":"2.0",
                "method":"tools/call",
                "params":{
                    "name":"create_project",
                    "arguments":{"name":"Test Project"}
                },
                "id":10
            }
        """

        val request = parseJsonRpcRequest(toolCallRequest)
        val params = request.params as JsonObject

        params["name"] shouldBe JsonPrimitive("create_project")
        params["arguments"].shouldNotBeNull()
    }

    "should validate request size limits" {
        // EXPECTED FAILURE: Size validation not implemented
        val largeRequest = """{"jsonrpc":"2.0","method":"test","params":{"data":"${"x".repeat(1_000_000)}"},"id":1}"""

        shouldThrow<RequestTooLargeException> {
            validateRequestSize(largeRequest)
        }
    }
})

// Implementations now provided by io.spiralhouse.cycletime.mcp.http package
