package io.spiralhouse.cycletime.integration.mcp.tools

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.cycletime.test.utils.testSDKApplication
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.slf4j.LoggerFactory

/**
 * Comprehensive integration tests for MCP tool operations using Streamable HTTP transport.
 *
 * **MIGRATION (SPI-710)**: Migrated from SDK Client pattern to Streamable HTTP pattern.
 *
 * Validates end-to-end tool execution through HTTP requests:
 * - **Tool Discovery**: List all registered tools via tools/list
 * - **Tool Execution**: Call tools with arguments via tools/call
 * - **Response Format**: Validate MCP content format through JSON-RPC
 * - **Error Handling**: Verify error propagation through HTTP responses
 *
 * ## Test Strategy
 *
 * Tests use direct HTTP POST requests to validate production tool behavior:
 * - **Session Tools**: session_create_session, session_get_active_session
 * - **Project Tools**: project_create_project, project_list_projects
 * - **Issue Tools**: issue_create_issue, issue_list_issues
 * - **Workflow Tools**: workflow_list_workflows
 *
 * This ensures tests validate actual Streamable HTTP integration patterns that clients will use.
 */
class McpToolIntegrationTest : StringSpec({
    val logger = LoggerFactory.getLogger("McpToolIntegrationTest")

    /**
     * Helper function to create a test project and return its UUID.
     * Required because session_create_session needs a valid project UUID.
     */
    suspend fun createTestProject(client: io.ktor.client.HttpClient, name: String = "Test Project ${System.currentTimeMillis()}"): String {
        val response = client.post("/mcp") {
            header("Content-Type", "application/json")
            setBody("""
                {
                    "jsonrpc": "2.0",
                    "id": 1000,
                    "method": "tools/call",
                    "params": {
                        "name": "project_create_project",
                        "arguments": {
                            "name": "$name",
                            "description": "Test project for tool integration tests"
                        }
                    }
                }
            """.trimIndent())
        }

        response.status shouldBe HttpStatusCode.OK

        val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
        val result = jsonResponse["result"]?.jsonObject
        result.shouldNotBeNull()

        val content = result["content"]?.jsonArray
        content.shouldNotBeEmpty()

        val textContent = content!![0].jsonObject["text"]?.jsonPrimitive?.content
        textContent.shouldNotBeNull()

        val projectIdRegex = "\"id\"\\s*:\\s*\"([0-9a-f-]+)\"".toRegex()
        val match = projectIdRegex.find(textContent!!)
        if (match != null) {
            return match.groupValues[1]
        }

        throw IllegalStateException("Failed to extract project ID from response: $textContent")
    }

    // ===== Tool Discovery Tests =====

    "should list all available tools using HTTP" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject
            result.shouldNotBeNull()

            val tools = result!!["tools"]?.jsonArray
            tools.shouldNotBeNull()
            tools.shouldNotBeEmpty()
            tools shouldHaveSize 17

            // Verify production tools present
            val toolNames = tools!!.map { it.jsonObject["name"]?.jsonPrimitive?.content!! }
            toolNames shouldContain "session_create_session"
            toolNames shouldContain "session_get_active_session"
            toolNames shouldContain "project_list_projects"
            toolNames shouldContain "issue_list_issues"
            toolNames shouldContain "workflow_list_workflows"
        }
    }

    "should maintain proper tool metadata through HTTP" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":2,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val tools = result["tools"]?.jsonArray!!

            // Find session tool
            val sessionTool = tools.find { it.jsonObject["name"]?.jsonPrimitive?.content == "session_create_session" }
            sessionTool.shouldNotBeNull()

            // Verify metadata is properly exposed
            val toolObj = sessionTool!!.jsonObject
            toolObj["description"]?.jsonPrimitive?.content.shouldNotBeNull()
            toolObj["inputSchema"]?.jsonObject.shouldNotBeNull()
        }
    }

    // ===== Tool Execution Tests =====

    "should call tool with valid arguments using HTTP" {
        testSDKApplication {
            // Create test project first
            val projectId = createTestProject(client, "Test Project for Tool Call")

            // Call session_create_session tool
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 3,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$projectId"
                            }
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject
            result.shouldNotBeNull()

            val isError = result!!["isError"]?.jsonPrimitive?.content?.toBooleanStrictOrNull()
            if (isError != null) {
                isError shouldBe false
            }

            val content = result["content"]?.jsonArray
            content.shouldNotBeEmpty()
            content!!.size shouldBe 1

            // Verify content type
            val contentItem = content[0].jsonObject
            contentItem["type"]?.jsonPrimitive?.content shouldBe "text"

            // Verify text contains project ID
            val text = contentItem["text"]?.jsonPrimitive?.content
            text shouldContain projectId
        }
    }

    "should handle parameter passing through HTTP correctly" {
        testSDKApplication {
            val projectId = createTestProject(client, "Test Param Passing")

            // Create session with specific project ID
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 4,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$projectId"
                            }
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject
            result.shouldNotBeNull()

            val isError = result!!["isError"]?.jsonPrimitive?.content?.toBooleanStrictOrNull()
            if (isError != null) {
                isError shouldBe false
            }

            val content = result["content"]?.jsonArray!![0].jsonObject
            content["text"]?.jsonPrimitive?.content shouldContain projectId
        }
    }

    "should handle multiple tool invocations in sequence" {
        testSDKApplication {
            val projectId = createTestProject(client, "Test Sequence")

            // Initialize session
            val initResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":100,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"test","version":"1.0"},"capabilities":{}}}""")
            }
            val sessionId = initResponse.headers["Mcp-Session-Id"]!!

            // Create session
            val createResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", sessionId)
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 5,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$projectId"
                            }
                        }
                    }
                """.trimIndent())
            }
            createResponse.status shouldBe HttpStatusCode.OK

            val createJson = Json.parseToJsonElement(createResponse.bodyAsText()).jsonObject
            val createResult = createJson["result"]?.jsonObject
            createResult.shouldNotBeNull()

            // Get session
            val getResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", sessionId)
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 6,
                        "method": "tools/call",
                        "params": {
                            "name": "session_get_active_session",
                            "arguments": {}
                        }
                    }
                """.trimIndent())
            }
            getResponse.status shouldBe HttpStatusCode.OK

            val getJson = Json.parseToJsonElement(getResponse.bodyAsText()).jsonObject
            val getResult = getJson["result"]?.jsonObject
            getResult.shouldNotBeNull()
        }
    }

    // ===== Response Format Tests =====

    "should return proper MCP content structure for tool results" {
        testSDKApplication {
            val projectId = createTestProject(client, "Test Content Format")

            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 7,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$projectId"
                            }
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject
            result.shouldNotBeNull()

            val content = result!!["content"]?.jsonArray
            content.shouldNotBeEmpty()

            val contentItem = content!![0].jsonObject
            contentItem["type"]?.jsonPrimitive?.content shouldBe "text"
            contentItem["text"]?.jsonPrimitive?.content.shouldNotBeNull()
        }
    }

    "should handle JSON object responses via HTTP" {
        testSDKApplication {
            val projectId = createTestProject(client, "Test JSON Response")

            // Create session returns JSON object
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 8,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$projectId"
                            }
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject
            result.shouldNotBeNull()

            val content = result!!["content"]?.jsonArray!![0].jsonObject
            val textContent = content["text"]?.jsonPrimitive?.content

            // Verify response contains valid JSON
            textContent.shouldNotBeNull()
            val jsonObject = Json.parseToJsonElement(textContent!!)
            jsonObject.shouldNotBeNull()
        }
    }

    // ===== Error Handling Tests =====

    "should propagate tool not found errors correctly via HTTP" {
        testSDKApplication {
            // Attempt to call non-existent tool
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 9,
                        "method": "tools/call",
                        "params": {
                            "name": "nonexistent_tool",
                            "arguments": {}
                        }
                    }
                """.trimIndent())
            }

            // Should return JSON-RPC error, not HTTP error
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject

            // Should have error object instead of result
            jsonResponse["error"].shouldNotBeNull()

            val error = jsonResponse["error"]?.jsonObject
            error.shouldNotBeNull()

            // Verify error message
            val message = error!!["message"]?.jsonPrimitive?.content
            message.shouldNotBeNull()
            message!! shouldContain "not found"
        }
    }

    "should propagate parameter validation errors correctly via HTTP" {
        testSDKApplication {
            // Call tool without required parameters
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 10,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {}
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject

            // Parameter validation errors return JSON-RPC error response
            val error = jsonResponse["error"]?.jsonObject
            error.shouldNotBeNull()

            // Verify error message is present
            val message = error!!["message"]?.jsonPrimitive?.content
            message.shouldNotBeNull()
        }
    }

    "should handle tool execution errors gracefully" {
        testSDKApplication {
            // Initialize session first
            val initResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":200,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"test","version":"1.0"},"capabilities":{}}}""")
            }
            val sessionId = initResponse.headers["Mcp-Session-Id"]!!

            // Attempt to get session without creating one first
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", sessionId)
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 11,
                        "method": "tools/call",
                        "params": {
                            "name": "session_get_active_session",
                            "arguments": {}
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject
            result.shouldNotBeNull()

            // Server should handle missing session gracefully
            val isError = result!!["isError"]?.jsonPrimitive?.content?.toBooleanStrictOrNull()
            if (isError != null) {
                isError shouldBe false
            }

            result["content"]?.jsonArray.shouldNotBeEmpty()

            // Validate session structure in content
            // The server returns a valid session (either auto-created or from MCP session ID)
            val content = result["content"]?.jsonArray!![0].jsonObject
            val responseJson = Json.parseToJsonElement(content["text"]?.jsonPrimitive?.content!!)
            responseJson.jsonObject.keys shouldContain "sessionKey"
            responseJson.jsonObject.keys shouldContain "projectId"
        }
    }

    // ===== Integration Tests =====

    "should handle complete request flow through HTTP transport" {
        testSDKApplication {
            // List tools
            val toolsResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":12,"method":"tools/list"}""")
            }
            toolsResponse.status shouldBe HttpStatusCode.OK

            val toolsJson = Json.parseToJsonElement(toolsResponse.bodyAsText()).jsonObject
            val tools = toolsJson["result"]?.jsonObject!!["tools"]?.jsonArray
            tools.shouldNotBeEmpty()

            // Create project and session
            val projectId = createTestProject(client, "Test Flow")

            val sessionResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 13,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$projectId"
                            }
                        }
                    }
                """.trimIndent())
            }
            sessionResponse.status shouldBe HttpStatusCode.OK

            val sessionJson = Json.parseToJsonElement(sessionResponse.bodyAsText()).jsonObject
            val sessionResult = sessionJson["result"]?.jsonObject
            sessionResult.shouldNotBeNull()
            sessionResult!!["content"]?.jsonArray.shouldNotBeEmpty()
        }
    }

    "should maintain proper JSON-RPC protocol through HTTP" {
        testSDKApplication {
            val projectId = createTestProject(client, "Test Protocol")

            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 14,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$projectId"
                            }
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject

            // Verify JSON-RPC 2.0 protocol
            jsonResponse["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
            jsonResponse["id"]?.jsonPrimitive?.content?.toIntOrNull() shouldBe 14
            jsonResponse["result"].shouldNotBeNull()

            val result = jsonResponse["result"]?.jsonObject!!
            result["content"]?.jsonArray.shouldNotBeEmpty()
        }
    }

    "should return consistent error format across all error types" {
        testSDKApplication {
            // Tool not found error
            val notFoundResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":15,"method":"tools/call","params":{"name":"nonexistent","arguments":{}}}""")
            }
            notFoundResponse.status shouldBe HttpStatusCode.OK

            val notFoundJson = Json.parseToJsonElement(notFoundResponse.bodyAsText()).jsonObject
            notFoundJson["error"].shouldNotBeNull()

            // Parameter validation error - also returns JSON-RPC error
            val validationResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":16,"method":"tools/call","params":{"name":"session_create_session","arguments":{}}}""")
            }
            validationResponse.status shouldBe HttpStatusCode.OK

            val validationJson = Json.parseToJsonElement(validationResponse.bodyAsText()).jsonObject
            val validationError = validationJson["error"]?.jsonObject
            validationError.shouldNotBeNull()

            // Both error types should have consistent structure
            val notFoundError = notFoundJson["error"]?.jsonObject!!
            notFoundError["message"].shouldNotBeNull()
            validationError!!["message"].shouldNotBeNull()
        }
    }

    // ===== Production Tool Integration Tests =====

    "should handle complete session lifecycle via HTTP" {
        testSDKApplication {
            val projectId = createTestProject(client, "Test Lifecycle")

            // Initialize and get session ID
            val initResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":300,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"test","version":"1.0"},"capabilities":{}}}""")
            }
            val sessionId = initResponse.headers["Mcp-Session-Id"]!!

            // Create session
            val createResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", sessionId)
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 17,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$projectId"
                            }
                        }
                    }
                """.trimIndent())
            }
            createResponse.status shouldBe HttpStatusCode.OK

            val createJson = Json.parseToJsonElement(createResponse.bodyAsText()).jsonObject
            val createResult = createJson["result"]?.jsonObject
            createResult.shouldNotBeNull()
            createResult!!["content"]?.jsonArray.shouldNotBeEmpty()

            // Verify explicit session creation works correctly
            val createContent = createResult["content"]?.jsonArray!![0].jsonObject
            createContent["text"]?.jsonPrimitive?.content!! shouldContain projectId

            // Get session
            val getResponse = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Mcp-Session-Id", sessionId)
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 18,
                        "method": "tools/call",
                        "params": {
                            "name": "session_get_active_session",
                            "arguments": {}
                        }
                    }
                """.trimIndent())
            }
            getResponse.status shouldBe HttpStatusCode.OK

            val getJson = Json.parseToJsonElement(getResponse.bodyAsText()).jsonObject
            val getResult = getJson["result"]?.jsonObject
            getResult.shouldNotBeNull()
            getResult!!["content"]?.jsonArray.shouldNotBeEmpty()

            val getContent = getResult["content"]?.jsonArray!![0].jsonObject
            val sessionJson = Json.parseToJsonElement(getContent["text"]?.jsonPrimitive?.content!!)
            sessionJson.jsonObject.keys shouldContain "sessionKey"
            sessionJson.jsonObject.keys shouldContain "projectId"
        }
    }

    "should handle multiple sessions independently" {
        testSDKApplication {
            // Create two different sessions
            val project1 = createTestProject(client, "Test Session 1")
            val project2 = createTestProject(client, "Test Session 2")

            val session1Response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 19,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$project1"
                            }
                        }
                    }
                """.trimIndent())
            }
            session1Response.status shouldBe HttpStatusCode.OK

            val session2Response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc": "2.0",
                        "id": 20,
                        "method": "tools/call",
                        "params": {
                            "name": "session_create_session",
                            "arguments": {
                                "projectId": "$project2"
                            }
                        }
                    }
                """.trimIndent())
            }
            session2Response.status shouldBe HttpStatusCode.OK

            val session1Json = Json.parseToJsonElement(session1Response.bodyAsText()).jsonObject
            val session1Result = session1Json["result"]?.jsonObject
            session1Result.shouldNotBeNull()

            val session2Json = Json.parseToJsonElement(session2Response.bodyAsText()).jsonObject
            val session2Result = session2Json["result"]?.jsonObject
            session2Result.shouldNotBeNull()

            // Both sessions should exist independently
            session1Result!!["content"]?.jsonArray.shouldNotBeEmpty()
            session2Result!!["content"]?.jsonArray.shouldNotBeEmpty()
        }
    }
})
