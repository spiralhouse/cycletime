package io.spiralhouse.cycletime.mcp.integration

import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.string.shouldContain as shouldContainString
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.mcp.integration.fixtures.MCPIntegrationTestBase
import io.spiralhouse.cycletime.mcp.integration.fixtures.TestDataFactory
import io.spiralhouse.cycletime.mcp.integration.fixtures.MockClaudeClientException
import io.spiralhouse.cycletime.mcp.integration.fixtures.MockClaudeClient
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.serialization.json.*

/**
 * Integration tests for MCP protocol compliance and JSON-RPC 2.0 specification adherence.
 * 
 * These tests verify that our MCP server implementation correctly follows:
 * - JSON-RPC 2.0 specification for message format and error handling
 * - MCP protocol specification for method signatures and capabilities
 * - Proper error code usage and error message formatting
 * - Batch request processing capabilities
 * - Notification message handling (uni-directional)
 * - Protocol version negotiation and capability advertisement
 * 
 * RED PHASE EXPECTATION: ALL TESTS SHOULD FAIL
 * These tests will fail during RED phase due to:
 * - JSON-RPC request parsing not implemented
 * - Error response formatting not following specification
 * - Method validation and routing not implemented
 * - Batch request processing not supported
 * - Notification handling missing
 * - Protocol validation missing
 * 
 * Each failure will guide GREEN phase implementation of specification-compliant handlers.
 */
class MCPProtocolComplianceTest : MCPIntegrationTestBase() {

    init {
        "should follow JSON-RPC 2.0 specification for request-response format" {
            withTestApplication {
                val client = createConnectedMcpClient()
                
                val initRequest = TestDataFactory.createInitializeRequest(
                    clientName = "Protocol-Compliance-Test",
                    protocolVersion = "2024-11-05"
                )
                
                // EXPECTED FAILURE: JSON-RPC request parsing not implemented
                val response = client.sendRequest(initRequest)
                
                // Response must follow JSON-RPC 2.0 format exactly
                val responseObj = response.jsonObject
                
                // Required fields
                responseObj["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
                responseObj["id"] shouldNotBe null
                
                // Must have either result or error, not both
                val hasResult = responseObj["result"] != null
                val hasError = responseObj["error"] != null
                (hasResult xor hasError) shouldBe true
                
                if (hasResult) {
                    // Result can be any JSON value
                    responseObj["result"] shouldNotBe null
                } else {
                    // Error must be properly structured
                    val error = responseObj["error"]?.jsonObject
                    error shouldNotBe null
                    error!!["code"]?.jsonPrimitive?.int shouldNotBe null
                    error["message"]?.jsonPrimitive?.content shouldNotBe null
                    // data field is optional
                }
            }
        }
        
        "should handle batch requests according to JSON-RPC 2.0 specification" {
            withTestApplication {
                val client = createInitializedMcpClient()
                
                // EXPECTED FAILURE: Batch request processing not implemented
                val batchRequests = buildJsonArray {
                    add(TestDataFactory.createToolsListRequest())
                    add(TestDataFactory.createResourcesListRequest())
                    add(TestDataFactory.createProjectToolCall("Batch Test Project 1"))
                    add(TestDataFactory.createProjectToolCall("Batch Test Project 2"))
                }
                
                val batchResponse = client.sendBatchRequest(batchRequests)
                
                // Response should be JSON array with same number of elements
                val responseArray = batchResponse.jsonArray
                responseArray shouldHaveSize 4
                
                // Each response should be valid JSON-RPC 2.0 response
                responseArray.forEach { response ->
                    validateJsonRpcResponse(response)
                }
                
                // Responses should correspond to requests (order may vary)
                val responseIds = responseArray.map { 
                    it.jsonObject["id"]?.jsonPrimitive?.content 
                }
                responseIds.forEach { id ->
                    id shouldNotBe null
                }
            }
        }
        
        "should return proper error codes for protocol violations" {
            withTestApplication {
                val client = createConnectedMcpClient()
                
                // Test each JSON-RPC error code with appropriate scenarios
                
                // -32700: Parse error (malformed JSON)
                val malformedExamples = TestDataFactory.getMalformedJsonExamples()
                malformedExamples.forEach { malformed ->
                    // EXPECTED FAILURE: Parse error handling not implemented
                    val parseErrorResponse = client.sendMalformedJson(malformed)
                    validateJsonRpcError(parseErrorResponse, -32700)
                    
                    val error = parseErrorResponse.jsonObject["error"]?.jsonObject
                    error!!["message"]?.jsonPrimitive?.content!! shouldContainString "Parse error"
                }
                
                // -32600: Invalid Request (valid JSON but invalid JSON-RPC)
                val invalidRequests = TestDataFactory.getInvalidMcpRequests()
                invalidRequests.forEach { invalidRequest ->
                    // EXPECTED FAILURE: Request validation not implemented
                    val invalidResponse = client.sendRequest(invalidRequest)
                    validateJsonRpcError(invalidResponse, -32600)
                    
                    val error = invalidResponse.jsonObject["error"]?.jsonObject
                    error!!["message"]?.jsonPrimitive?.content!! shouldContainString "Invalid Request"
                }
                
                // -32601: Method not found
                val unknownMethods = listOf(
                    "unknown/method",
                    "invalid_method_name",
                    "tools/unknown",
                    "resources/invalid"
                )
                
                unknownMethods.forEach { methodName ->
                    // EXPECTED FAILURE: Method not found handling not implemented
                    val response = client.sendUnknownMethod(methodName)
                    validateJsonRpcError(response, -32601)
                    
                    val error = response.jsonObject["error"]?.jsonObject
                    error!!["message"]?.jsonPrimitive?.content!! shouldContainString "Method not found"
                }
            }
        }
        
        "should handle invalid parameters with appropriate error responses" {
            withTestApplication {
                val client = createInitializedMcpClient()
                
                // -32602: Invalid params
                val invalidToolCalls = TestDataFactory.getInvalidToolCalls()
                
                invalidToolCalls.forEach { invalidCall ->
                    // EXPECTED FAILURE: Parameter validation not implemented
                    val response = client.sendRequest(invalidCall)
                    
                    // Could be parameter validation error or tool execution error
                    validateJsonRpcError(response)
                    
                    val error = response.jsonObject["error"]?.jsonObject
                    val errorCode = error!!["code"]?.jsonPrimitive?.int!!
                    
                    // Should be either invalid params or tool-specific error
                    val validErrorCodes = listOf(
                        -32602, // Invalid params
                        -32000, // Server error (tool validation)
                        -32001, // Server error (tool execution)
                    )
                    validErrorCodes shouldContain errorCode
                }
            }
        }
        
        "should handle notification messages without sending responses" {
            withTestApplication {
                val client = createInitializedMcpClient()
                
                // Notifications have no "id" field and expect no response
                val notification = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("method", "notifications/message")
                    put("params", buildJsonObject {
                        put("level", "info")
                        put("message", "Test notification")
                    })
                }
                
                // EXPECTED FAILURE: Notification handling not implemented
                client.sendNotification(notification)
                
                // Should not receive any response for notification
                // (This will be validated by client implementation timeout)
            }
        }
        
        "should advertise correct capabilities during initialization" {
            withTestApplication {
                val client = createConnectedMcpClient()
                
                val initResponse = client.initialize(
                    protocolVersion = "2024-11-05",
                    clientName = "Capability-Test-Client"
                )
                
                validateJsonRpcResponse(initResponse)
                
                val result = initResponse.jsonObject["result"]?.jsonObject
                val capabilities = result!!["capabilities"]?.jsonObject
                capabilities shouldNotBe null
                
                // CycleTime should advertise these capabilities
                val resources = capabilities!!["resources"]?.jsonObject
                resources shouldNotBe null
                resources!!["subscribe"]?.jsonPrimitive?.boolean shouldBe true
                resources["listChanged"]?.jsonPrimitive?.boolean shouldBe true
                
                val tools = capabilities["tools"]?.jsonObject
                tools shouldNotBe null
                // Tools should not advertise listChanged since our tools are static
                
                val logging = capabilities["logging"]?.jsonObject
                logging shouldNotBe null
                
                // Server should identify itself properly
                val serverInfo = result["serverInfo"]?.jsonObject
                serverInfo shouldNotBe null
                serverInfo!!["name"]?.jsonPrimitive?.content shouldBe "CycleTime-CE"
                serverInfo["version"]?.jsonPrimitive?.content shouldNotBe null
            }
        }
        
        "should handle protocol version negotiation correctly" {
            withTestApplication {
                // Test with supported version
                val client1 = createConnectedMcpClient()
                val supportedResponse = client1.initialize(protocolVersion = "2024-11-05")
                
                validateJsonRpcResponse(supportedResponse)
                val result1 = supportedResponse.jsonObject["result"]?.jsonObject
                result1!!["protocolVersion"]?.jsonPrimitive?.content shouldBe "2024-11-05"
                
                // Test with unsupported version
                val client2 = createConnectedMcpClient()
                
                // EXPECTED FAILURE: Version validation not implemented
                val unsupportedResponse = client2.initialize(protocolVersion = "1.0.0")
                
                // Should either accept with downgrade or reject with error
                if (unsupportedResponse.jsonObject["error"] != null) {
                    validateJsonRpcError(unsupportedResponse)
                    val error = unsupportedResponse.jsonObject["error"]?.jsonObject
                    error!!["message"]?.jsonPrimitive?.content!! shouldContainString "protocol version"
                } else {
                    // Server downgraded to supported version
                    val result2 = unsupportedResponse.jsonObject["result"]?.jsonObject
                    result2!!["protocolVersion"] shouldNotBe null
                }
                
                client1.disconnect()
                client2.disconnect()
            }
        }
        
        "should handle malformed MCP method signatures appropriately" {
            withTestApplication {
                val client = createInitializedMcpClient()
                
                // Test initialize with wrong parameter structure
                val wrongInitParams = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "wrong-init")
                    put("method", "initialize")
                    put("params", buildJsonObject {
                        // Missing required fields
                        put("clientInfo", buildJsonObject {
                            put("name", "Test")
                        })
                        // Missing protocolVersion and capabilities
                    })
                }
                
                // EXPECTED FAILURE: MCP parameter validation not implemented
                val response1 = client.sendRequest(wrongInitParams)
                validateJsonRpcError(response1, -32602)
                
                // Test tools/call without required name parameter
                val wrongToolCall = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "wrong-tool")
                    put("method", "tools/call")
                    put("params", buildJsonObject {
                        put("arguments", buildJsonObject {})
                        // Missing name parameter
                    })
                }
                
                val response2 = client.sendRequest(wrongToolCall)
                validateJsonRpcError(response2, -32602)
                
                // Test resources/read without URI
                val wrongResourceRead = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "wrong-resource")
                    put("method", "resources/read")
                    put("params", buildJsonObject {
                        // Missing uri parameter
                    })
                }
                
                val response3 = client.sendRequest(wrongResourceRead)
                validateJsonRpcError(response3, -32602)
            }
        }
        
        "should maintain JSON-RPC 2.0 compliance under concurrent load" {
            withTestApplication {
                val clients = (1..5).map { index ->
                    createInitializedMcpClient("Load-Test-Client-$index")
                }
                
                // Send many concurrent requests
                val responses = clients.flatMap { client ->
                    (1..10).map { requestIndex ->
                        async {
                            when (requestIndex % 4) {
                                0 -> client.listTools()
                                1 -> client.listResources()
                                2 -> client.sendRequest(TestDataFactory.createProjectToolCall("Load Test Project $requestIndex"))
                                else -> client.sendRequest(TestDataFactory.createResourceReadRequest("cycletime://projects"))
                            }
                        }
                    }
                }.awaitAll()
                
                // All responses should maintain JSON-RPC 2.0 compliance
                responses.forEach { response ->
                    validateJsonRpcResponse(response)
                }
                
                // Cleanup
                clients.forEach { it.disconnect() }
            }
        }
        
        "should handle request ID correlation correctly across multiple requests" {
            withTestApplication {
                val client = createInitializedMcpClient()
                
                // Send requests with specific IDs and verify responses match
                val testRequests = listOf(
                    "id-correlation-1" to TestDataFactory.createToolsListRequest(),
                    "id-correlation-2" to TestDataFactory.createResourcesListRequest(),
                    "id-correlation-3" to TestDataFactory.createProjectToolCall("ID Correlation Test")
                )
                
                // Modify requests to use specific IDs
                val requestsWithIds = testRequests.map { (id, request) ->
                    buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", id)
                        put("method", request["method"]!!)
                        if (request["params"] != null) {
                            put("params", request["params"]!!)
                        }
                    }
                }
                
                val responses = requestsWithIds.map { request ->
                    client.sendRequest(request)
                }
                
                // Verify each response has correct ID
                responses.zip(testRequests).forEach { (response, expectedIdAndRequest) ->
                    val expectedId = expectedIdAndRequest.first
                    response.jsonObject["id"]?.jsonPrimitive?.content shouldBe expectedId
                }
            }
        }
        
        "should handle edge cases in JSON-RPC message format" {
            withTestApplication {
                val client = createConnectedMcpClient()
                
                // Test with null id (allowed in JSON-RPC 2.0)
                val nullIdRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", JsonNull)
                    put("method", "tools/list")
                }
                
                val nullIdResponse = client.sendRequest(nullIdRequest)
                validateJsonRpcResponse(nullIdResponse)
                nullIdResponse.jsonObject["id"] shouldBe JsonNull
                
                // Test with numeric id
                val numericIdRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", 12345)
                    put("method", "tools/list")
                }
                
                val numericIdResponse = client.sendRequest(numericIdRequest)
                validateJsonRpcResponse(numericIdResponse)
                numericIdResponse.jsonObject["id"]?.jsonPrimitive?.int shouldBe 12345
                
                // Test with empty params object
                val emptyParamsRequest = buildJsonObject {
                    put("jsonrpc", "2.0")
                    put("id", "empty-params")
                    put("method", "tools/list")
                    put("params", buildJsonObject {})
                }
                
                val emptyParamsResponse = client.sendRequest(emptyParamsRequest)
                validateJsonRpcResponse(emptyParamsResponse)
            }
        }
    }
    
    /**
     * Extension function for MockClaudeClient to send batch requests.
     */
    private suspend fun MockClaudeClient.sendBatchRequest(requests: JsonArray): JsonArray {
        // EXPECTED FAILURE: Batch request handling not implemented
        throw MockClaudeClientException("Batch request handling not implemented in RED phase")
    }
    
    /**
     * Extension function for MockClaudeClient to send notifications.
     */
    private suspend fun MockClaudeClient.sendNotification(notification: JsonObject) {
        // EXPECTED FAILURE: Notification handling not implemented
        throw MockClaudeClientException("Notification handling not implemented in RED phase")
    }
}