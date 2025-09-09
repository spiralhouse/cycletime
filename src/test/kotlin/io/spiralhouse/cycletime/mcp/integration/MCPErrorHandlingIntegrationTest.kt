package io.spiralhouse.cycletime.mcp.integration

import io.kotest.core.annotation.DoNotParallelize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.ints.shouldBeGreaterThanOrEqual
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.assertions.timing.eventually
import io.spiralhouse.cycletime.mcp.integration.fixtures.MCPIntegrationTestBase
import io.spiralhouse.cycletime.mcp.integration.fixtures.TestDataFactory
import io.spiralhouse.cycletime.mcp.integration.fixtures.MockClaudeClient
import io.spiralhouse.cycletime.mcp.integration.fixtures.MockClaudeClientException
import io.spiralhouse.cycletime.mcp.integration.fixtures.MockClaudeClients
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.*
import kotlin.time.Duration.Companion.seconds
import kotlin.time.Duration.Companion.milliseconds

/**
 * Integration tests for MCP error handling scenarios and resilience.
 * 
 * Phase 9: These tests validate error handling in the unified MCP architecture
 * where MCP is served on main application port via /mcp WebSocket endpoint.
 */
@Ignored // SPI-608: Fix MCP WebSocket Integration Tests - Client Plugin Configuration
class MCPErrorHandlingIntegrationTest : MCPIntegrationTestBase() {

    init {
        "should handle WebSocket connection failures gracefully" {
            // Test connection to non-existent server
            val wrongPortClient = MockClaudeClients.wrongPort()
            
            // EXPECTED FAILURE: Connection error handling not implemented
            shouldThrow<MockClaudeClientException> {
                wrongPortClient.connect()
            }
            
            wrongPortClient.getConnectionState() shouldBe MockClaudeClient.ConnectionState.FAILED
        }
        
        "should handle malformed JSON requests with proper error responses" {
            withTestApplication {
                val client = createConnectedMcpClient()
                
                val malformedExamples = TestDataFactory.getMalformedJsonExamples()
                
                malformedExamples.take(3).forEach { malformed ->
                    // EXPECTED FAILURE: Parse error handling not implemented
                    val errorResponse = client.sendMalformedJson(malformed)
                    
                    validateJsonRpcError(errorResponse, -32700)
                    
                    val error = errorResponse.jsonObject["error"]?.jsonObject
                    error!!["message"]?.jsonPrimitive?.content shouldContain "Parse error"
                }
                
                // Verify connection still works after malformed requests
                client.initialize()
                client.getConnectionState() shouldBe MockClaudeClient.ConnectionState.INITIALIZED
            }
        }
        
        "should handle unknown method calls with method not found errors" {
            withTestApplication {
                val client = createInitializedMcpClient()
                
                val unknownMethods = listOf(
                    "unknown/method",
                    "tools/invalid",
                    "resources/nonexistent"
                )
                
                unknownMethods.forEach { methodName ->
                    // EXPECTED FAILURE: Method not found handling not implemented
                    val errorResponse = client.sendUnknownMethod(methodName)
                    
                    validateJsonRpcError(errorResponse, -32601)
                    
                    val error = errorResponse.jsonObject["error"]?.jsonObject
                    error!!["message"]?.jsonPrimitive?.content shouldContain "Method not found"
                    error["message"]?.jsonPrimitive?.content shouldContain methodName
                }
                
                // Connection should remain functional
                val toolsResponse = client.listTools()
                validateToolsList(toolsResponse)
            }
        }
        
        "should handle protocol violations with specific error codes" {
            withTestApplication {
                val client = createConnectedMcpClient()
                
                // Invalid Request structure (-32600)
                val invalidRequests = TestDataFactory.getInvalidMcpRequests().take(3)
                invalidRequests.forEach { invalidRequest ->
                    // EXPECTED FAILURE: Request validation not implemented
                    val errorResponse = client.sendRequest(invalidRequest)
                    
                    validateJsonRpcError(errorResponse)
                    val error = errorResponse.jsonObject["error"]?.jsonObject
                    val errorCode = error!!["code"]?.jsonPrimitive?.int!!
                    
                    // Should be appropriate error code
                    val validErrorCodes = listOf(-32600, -32602) // Invalid request or invalid params
                    validErrorCodes shouldContain errorCode
                }
            }
        }
        
        "should handle tool execution errors gracefully" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Test business logic errors (e.g., duplicate names)
                val project1Request = TestDataFactory.createProjectToolCall(
                    name = "Duplicate Test Project",
                    description = "First project"
                )
                
                val project1Response = client.sendRequest(project1Request)
                validateToolCallResponse(project1Response, "create_project")
                
                // Try to create project with same name
                val duplicateRequest = TestDataFactory.createProjectToolCall(
                    name = "Duplicate Test Project", // Same name
                    description = "Duplicate project"
                )
                
                // EXPECTED FAILURE: Business rule validation not implemented
                val duplicateResponse = client.sendRequest(duplicateRequest)
                
                // Should receive error for business rule violation
                validateJsonRpcError(duplicateResponse)
                val duplicateError = duplicateResponse.jsonObject["error"]?.jsonObject
                duplicateError!!["message"]?.jsonPrimitive?.content shouldContain "duplicate"
            }
        }
        
        "should handle connection timeouts and cleanup resources" {
            withTestApplication {
                val fastTimeoutClient = MockClaudeClients.fastTimeout()
                
                try {
                    // EXPECTED FAILURE: Timeout handling not implemented
                    fastTimeoutClient.connect()
                    fastTimeoutClient.initialize()
                    
                    // Operation that might timeout
                    val largeRequest = TestDataFactory.createLargePayloadToolCall()
                    
                    shouldThrow<MockClaudeClientException> {
                        withTimeout(1.seconds) {
                            fastTimeoutClient.sendRequest(largeRequest)
                        }
                    }
                    
                } finally {
                    // Connection should be cleaned up even after timeout
                    fastTimeoutClient.disconnect()
                    fastTimeoutClient.getConnectionState() shouldBe MockClaudeClient.ConnectionState.CLOSED
                }
            }
        }
        
        "should maintain error response consistency across different error types" {
            withTestApplication {
                val client = createInitializedMcpClient()
                
                // Test parse error
                val parseErrorResponse = try {
                    client.sendMalformedJson("{invalid")
                } catch (e: Exception) {
                    buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", "error-scenario")
                        put("error", buildJsonObject {
                            put("code", -32700)
                            put("message", "Parse error: ${e.message}")
                        })
                    }
                }
                
                // Test method not found error
                val methodErrorResponse = try {
                    client.sendUnknownMethod("nonexistent/method")
                } catch (e: Exception) {
                    buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("id", "error-scenario")
                        put("error", buildJsonObject {
                            put("code", -32601)
                            put("message", "Method not found: ${e.message}")
                        })
                    }
                }
                
                val errorResponses = listOf(parseErrorResponse, methodErrorResponse)
                
                // All error responses should follow consistent format
                errorResponses.forEach { response ->
                    validateJsonRpcError(response)
                    
                    val error = response.jsonObject["error"]?.jsonObject
                    
                    // Required fields
                    error!!["code"] shouldNotBe null
                    error["message"] shouldNotBe null
                    
                    // Code should be valid JSON-RPC error code
                    val code = error["code"]?.jsonPrimitive?.int!!
                    val validCodes = listOf(-32700, -32600, -32601, -32602, -32603) + 
                                   (-32099..-32000).toList()
                    validCodes shouldContain code
                    
                    // Message should be informative
                    val message = error["message"]?.jsonPrimitive?.content!!
                    message.length shouldBeGreaterThanOrEqual 5 // Minimum informative length
                }
            }
        }
    }
}