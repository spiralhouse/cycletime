package io.spiralhouse.cycletime.integration.mcp.tools

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.kotest.matchers.types.shouldBeInstanceOf
import io.ktor.client.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.cycletime.test.utils.*
import kotlinx.serialization.json.*

/**
 * Comprehensive integration tests for MCP tool operations via SDK v0.7.2.
 *
 * Validates end-to-end tool execution through SDK transport:
 * - **Tool Discovery**: List all registered tools via tools/list
 * - **Tool Execution**: Call tools with arguments via tools/call
 * - **Response Format**: Validate MCP content format and JSON-RPC structure
 * - **Error Handling**: Verify error propagation and validation
 *
 * Migration from EventBus to SDK transport (Phase 4.2):
 * - Uses testSDKApplication for production-like test setup
 * - Tests production tools (session, project, issue, workflow)
 * - Uses SDK routing at /mcp endpoint
 * - Validates JSON-RPC 2.0 protocol via SDK
 *
 * ## Test Strategy
 *
 * Tests use production tools to validate real behavior:
 * - **Session Tools**: session_create, session_get
 * - **Project Tools**: project_list, project_get
 * - **Issue Tools**: issue_list, issue_get
 * - **Workflow Tools**: workflow_list, workflow_execute
 *
 * This ensures tests validate actual production code paths rather than
 * synthetic test-only tools.
 */
class McpToolIntegrationTest : DescribeSpec({

    // ===== Helper Functions for SDK Testing =====

    suspend fun HttpClient.executeToolsList(): HttpResponse {
        return listMCPTools()
    }

    suspend fun HttpClient.executeToolsCall(
        toolName: String,
        arguments: Map<String, Any> = emptyMap(),
        sessionId: String? = null
    ): HttpResponse {
        return callMCPTool(toolName, arguments, sessionId)
    }

    // Production tools available for testing:
    // - session_create, session_get (session management)
    // - project_list, project_get, project_create (project operations)
    // - issue_list, issue_get, issue_create (issue operations)
    // - workflow_list, workflow_execute (workflow operations)

    // SDK handles all setup automatically via testSDKApplication

    // ===== Integration Tests =====

    describe("Complete End-to-End Flow Validation") {

        describe("Complete Tools/List Flow") {

            it("should handle complete tools/list request flow through SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    val response = client.executeToolsList()

                    // Verify HTTP response
                    response.status shouldBe HttpStatusCode.OK

                    // Verify JSON-RPC success
                    response.isMCPSuccess() shouldBe true
                    val result = response.extractMCPResult()

                    // Validate MCP tool listing format
                    result shouldNotBe null
                    val tools = result.jsonObject["tools"]
                    tools shouldNotBe null
                    tools.shouldBeInstanceOf<JsonArray>()

                    val toolsArray = tools!!.jsonArray
                    // Production tools: session (2), project (3+), issue (3+), workflow (2+) = 17 tools
                    toolsArray shouldHaveSize 17

                    // Verify tool structure compliance
                    toolsArray.forEach { toolElement ->
                        val tool = toolElement.jsonObject
                        tool["name"] shouldNotBe null
                        tool["description"] shouldNotBe null
                        tool["inputSchema"] shouldNotBe null
                        tool["inputSchema"].shouldBeInstanceOf<JsonObject>()
                    }

                    // Verify production tools are present
                    val toolNames = toolsArray.map { it.jsonObject["name"]?.jsonPrimitive?.content }.filterNotNull()
                    toolNames shouldContain "session_create"
                    toolNames shouldContain "session_get"
                    toolNames shouldContain "project_list"
                    toolNames shouldContain "issue_list"
                    toolNames shouldContain "workflow_list"
                }
            }

            it("should maintain proper tool metadata through SDK transport") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    val response = client.executeToolsList()
                    val result = response.extractMCPResult()

                    // Verify tool metadata is properly exposed through SDK
                    val toolsArray = result.jsonObject["tools"]!!.jsonArray

                    val sessionTool = toolsArray.find {
                        it.jsonObject["name"]?.jsonPrimitive?.content == "session_create"
                    }?.jsonObject

                    sessionTool shouldNotBe null
                    sessionTool!!["description"] shouldNotBe null
                    sessionTool["inputSchema"]?.jsonObject?.get("type")?.jsonPrimitive?.content shouldBe "object"
                }
            }
        }

        describe("Complete Tools/Call Flow") {

            it("should handle complete tools/call request flow through SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    val response = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-PROJECT-INTEGRATION")
                    )

                    // Verify HTTP response
                    response.status shouldBe HttpStatusCode.OK

                    // Verify JSON-RPC success
                    response.isMCPSuccess() shouldBe true
                    val result = response.extractMCPResult()

                    // Validate MCP content format
                    result shouldNotBe null
                    val content = result.jsonObject["content"]
                    content shouldNotBe null
                    content.shouldBeInstanceOf<JsonArray>()

                    val contentArray = content!!.jsonArray
                    contentArray.shouldNotBeEmpty()

                    val contentItem = contentArray[0].jsonObject
                    contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
                    contentItem["text"] shouldNotBe null

                    // Verify session was created (text contains session data)
                    val textContent = contentItem["text"]?.jsonPrimitive?.content
                    textContent shouldContain "id"
                    textContent shouldContain "TEST-PROJECT-INTEGRATION"
                }
            }

            it("should handle parameter passing through SDK correctly") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Create session with specific project ID
                    val response = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-PARAM-PASSING")
                    )

                    response.isMCPSuccess() shouldBe true
                    val result = response.extractMCPResult()

                    // Verify parameters were passed correctly
                    val contentArray = result.jsonObject["content"]!!.jsonArray
                    val textContent = contentArray[0].jsonObject["text"]?.jsonPrimitive?.content
                    textContent shouldContain "TEST-PARAM-PASSING"
                }
            }

            it("should handle multiple tool invocations in sequence") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Create session
                    val createResponse = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-SEQUENCE")
                    )
                    createResponse.isMCPSuccess() shouldBe true

                    // Extract session ID
                    val createResult = createResponse.extractMCPResult()
                    val contentArray = createResult.jsonObject["content"]!!.jsonArray
                    val textContent = contentArray[0].jsonObject["text"]?.jsonPrimitive?.content
                    val sessionData = Json.parseToJsonElement(textContent!!).jsonObject
                    val sessionId = sessionData["id"]?.jsonPrimitive?.content

                    // Get session using ID
                    val getResponse = client.executeToolsCall(
                        "session_get",
                        mapOf(),
                        sessionId
                    )
                    getResponse.isMCPSuccess() shouldBe true
                }
            }
        }
    }

    describe("SDK Response Format Validation") {

        describe("MCP Content Structure") {

            it("should return proper MCP content structure for tool results") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    val response = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-CONTENT-FORMAT")
                    )

                    val result = response.extractMCPResult()

                    // Validate strict MCP content structure
                    result.jsonObject["content"] shouldNotBe null
                    val contentArray = result.jsonObject["content"]!!.jsonArray
                    contentArray.shouldNotBeEmpty()

                    val contentItem = contentArray[0].jsonObject
                    contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
                    contentItem["text"] shouldNotBe null
                }
            }

            it("should handle JSON object responses via SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Create session returns JSON object
                    val response = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-JSON-RESPONSE")
                    )

                    response.isMCPSuccess() shouldBe true
                    val result = response.extractMCPResult()
                    val contentArray = result.jsonObject["content"]!!.jsonArray
                    val textContent = contentArray[0].jsonObject["text"]?.jsonPrimitive?.content

                    // Verify response contains valid JSON
                    textContent shouldNotBe null
                    val jsonObject = Json.parseToJsonElement(textContent!!)
                    jsonObject.shouldBeInstanceOf<JsonObject>()
                }
            }
        }
    }

    describe("Error Propagation Through SDK") {

        describe("Tool-Level Error Handling") {

            it("should propagate tool not found errors correctly via SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    val response = client.executeToolsCall(
                        "nonexistent_tool",
                        mapOf()
                    )

                    // SDK returns HTTP 200 with JSON-RPC error
                    response.status shouldBe HttpStatusCode.OK
                    val error = response.extractMCPError()

                    error shouldNotBe null
                    error!!["code"] shouldNotBe null
                    error["message"]?.jsonPrimitive?.content shouldContain "not found"
                }
            }

            it("should propagate parameter validation errors correctly via SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Call tool without required parameters
                    val response = client.executeToolsCall(
                        "session_create",
                        mapOf() // Missing required projectId
                    )

                    val error = response.extractMCPError()
                    error shouldNotBe null
                    error!!["message"]?.jsonPrimitive?.content shouldContain "required"
                }
            }

            it("should handle tool execution errors gracefully") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Attempt to get session without session ID
                    val response = client.executeToolsCall(
                        "session_get",
                        mapOf() // No session ID in metadata
                    )

                    val error = response.extractMCPError()
                    error shouldNotBe null
                    error!!["message"] shouldNotBe null
                }
            }
        }

        describe("Protocol-Level Error Handling") {

            it("should handle invalid JSON-RPC requests via SDK") {
                testSDKApplication {
                    val client = createTestClient()

                    // Send malformed JSON-RPC request
                    val response = client.sendMCPRequest(
                        """{"invalid": "request", "missing": "fields"}"""
                    )

                    response.status shouldBe HttpStatusCode.OK
                    val error = response.extractMCPError()

                    error shouldNotBe null
                    error!!["code"]?.jsonPrimitive?.int shouldBe -32600 // Invalid Request
                }
            }

            it("should handle malformed request parameters via SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Send request with invalid parameter types
                    val response = client.sendMCPRequest(
                        MCPRequestBuilders.buildCustomRequest(
                            method = "tools/call",
                            params = buildJsonObject {
                                put("name", "session_create")
                                put("arguments", JsonPrimitive("invalid")) // Should be object
                            }
                        )
                    )

                    val error = response.extractMCPError()
                    error shouldNotBe null
                }
            }

            it("should handle missing required request fields via SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Send tools/call without tool name
                    val response = client.sendMCPRequest(
                        MCPRequestBuilders.buildCustomRequest(
                            method = "tools/call",
                            params = buildJsonObject {
                                // Missing "name" field
                                putJsonObject("arguments") {
                                    put("test", "value")
                                }
                            }
                        )
                    )

                    val error = response.extractMCPError()
                    error shouldNotBe null
                    error!!["message"]?.jsonPrimitive?.content shouldContain "name"
                }
            }
        }
    }

    describe("SDK Integration Validation") {

        describe("End-to-End Request Flow") {

            it("should handle complete request flow through SDK transport") {
                testSDKApplication {
                    val client = createTestClient()

                    // Initialize connection
                    val initResponse = client.mcpInitialize()
                    initResponse.isMCPSuccess() shouldBe true

                    // List tools
                    val listResponse = client.executeToolsList()
                    listResponse.isMCPSuccess() shouldBe true

                    // Call tool
                    val callResponse = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-FLOW")
                    )
                    callResponse.isMCPSuccess() shouldBe true

                    // All operations succeed through SDK
                    val result = callResponse.extractMCPResult()
                    result.jsonObject["content"] shouldNotBe null
                }
            }

            it("should maintain proper JSON-RPC protocol through SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    val response = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-PROTOCOL")
                    )

                    // Verify JSON-RPC 2.0 protocol
                    response.status shouldBe HttpStatusCode.OK

                    val body = response.bodyAsText()
                    val json = Json.parseToJsonElement(body).jsonObject

                    json["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
                    json["id"] shouldNotBe null
                    json["result"] shouldNotBe null
                }
            }
        }

        describe("Error Consistency") {

            it("should return consistent error format across all error types") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Tool not found error
                    val notFoundError = client.executeToolsCall("nonexistent", mapOf())
                    notFoundError.extractMCPError() shouldNotBe null

                    // Parameter validation error
                    val validationError = client.executeToolsCall("session_create", mapOf())
                    validationError.extractMCPError() shouldNotBe null

                    // Both errors have consistent structure
                    val error1 = notFoundError.extractMCPError()!!
                    val error2 = validationError.extractMCPError()!!

                    error1["code"] shouldNotBe null
                    error1["message"] shouldNotBe null
                    error2["code"] shouldNotBe null
                    error2["message"] shouldNotBe null
                }
            }
        }
    }

    describe("Production Tool Integration") {

        describe("Session Tool Operations") {

            it("should handle complete session lifecycle via SDK") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Create session
                    val createResponse = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-LIFECYCLE")
                    )
                    createResponse.isMCPSuccess() shouldBe true

                    // Extract session ID
                    val createResult = createResponse.extractMCPResult()
                    val contentArray = createResult.jsonObject["content"]!!.jsonArray
                    val textContent = contentArray[0].jsonObject["text"]?.jsonPrimitive?.content
                    val sessionData = Json.parseToJsonElement(textContent!!).jsonObject
                    val sessionId = sessionData["id"]?.jsonPrimitive?.content

                    sessionId shouldNotBe null

                    // Get session
                    val getResponse = client.executeToolsCall(
                        "session_get",
                        mapOf(),
                        sessionId
                    )
                    getResponse.isMCPSuccess() shouldBe true

                    // Verify same session
                    val getResult = getResponse.extractMCPResult()
                    val getContent = getResult.jsonObject["content"]!!.jsonArray
                    val getText = getContent[0].jsonObject["text"]?.jsonPrimitive?.content
                    getText shouldContain sessionId!!
                }
            }

            it("should handle multiple sessions independently") {
                testSDKApplication {
                    val client = createTestClient()
                    client.mcpInitialize()

                    // Create two different sessions
                    val session1 = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-SESSION-1")
                    )
                    val session2 = client.executeToolsCall(
                        "session_create",
                        mapOf("projectId" to "TEST-SESSION-2")
                    )

                    session1.isMCPSuccess() shouldBe true
                    session2.isMCPSuccess() shouldBe true

                    // Both sessions should exist independently
                    val result1 = session1.extractMCPResult()
                    val result2 = session2.extractMCPResult()

                    result1 shouldNotBe null
                    result2 shouldNotBe null
                }
            }
        }
    }
})