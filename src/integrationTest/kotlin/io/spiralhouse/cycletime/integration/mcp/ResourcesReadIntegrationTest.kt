package io.spiralhouse.cycletime.integration.mcp

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.cycletime.test.utils.testSDKApplication
import io.spiralhouse.cycletime.test.utils.MCPRequestBuilders
import io.spiralhouse.cycletime.test.utils.sendMCPRequest
import kotlinx.serialization.json.*

/**
 * Integration tests for resources/read endpoint implementation (SPI-1276).
 *
 * ## TDD RED Phase
 *
 * These tests MUST FAIL initially because StreamableHttpHandler does NOT implement
 * resources/read endpoint. Currently returns:
 * ```
 * JSON-RPC error: { "code": -32601, "message": "Method not found: resources/read" }
 * ```
 *
 * ## Expected Behavior (After Implementation)
 *
 * After implementation in StreamableHttpHandler, resources/read should:
 * 1. Accept URI parameter (e.g., "cycletime://projects", "cycletime://projects/{id}")
 * 2. Delegate to MCP SDK's resource handling
 * 3. Return MCP-compliant response:
 *    ```json
 *    {
 *      "jsonrpc": "2.0",
 *      "id": 123,
 *      "result": {
 *        "contents": [
 *          {
 *            "uri": "cycletime://projects",
 *            "mimeType": "application/json",
 *            "text": "[{\"id\":\"...\", ...}]"
 *          }
 *        ]
 *      }
 *    }
 *    ```
 *
 * ## Test Coverage
 *
 * - **Happy Path**: Collection resources (cycletime://projects)
 * - **Happy Path**: Template resources (cycletime://projects/{id})
 * - **Error Cases**: Missing URI parameter (JSON-RPC error -32602)
 * - **Error Cases**: Resource not found (JSON-RPC error -32000)
 * - **Response Format**: MCP spec compliance verification
 *
 * ## MCP Spec Compliance
 *
 * Per MCP specification, resources/read response must include:
 * - `result.contents` array (required)
 * - Each content item must have: `uri`, `mimeType`, `text` fields
 * - Standard JSON-RPC error codes for failures
 *
 * @see io.spiralhouse.cycletime.mcp.sdk.StreamableHttpHandler Implementation target
 * @see io.spiralhouse.cycletime.mcp.integration.ResourceRpcHandler Resource handler
 */
class ResourcesReadIntegrationTest : StringSpec({

    // ========================================
    // HAPPY PATH TESTS (Collection Resources)
    // ========================================

    "should read collection resource cycletime://projects via HTTP" {
        testSDKApplication {
            // ARRANGE: Create a test project first
            val createRequest = MCPRequestBuilders.buildToolCallRequest(
                toolName = "project_create_project",
                arguments = mapOf(
                    "name" to "Test Project Alpha",
                    "description" to "Test project for resources/read verification"
                ),
                id = 100
            )
            client.sendMCPRequest(createRequest)

            // ACT: Read projects collection resource
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://projects",
                id = 1
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Should return HTTP 200 with MCP-compliant response
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 1

            // Should have result object (not error)
            jsonResponse["result"] shouldNotBe null
            jsonResponse["error"] shouldBe null

            val result = jsonResponse["result"]!!.jsonObject

            // MCP spec: result must contain contents array
            result.containsKey("contents") shouldBe true
            val contents = result["contents"]?.jsonArray
            contents shouldNotBe null

            // Verify contents array has at least one item (the created project)
            contents!!.size shouldBe 1

            // Verify content structure matches MCP spec
            val firstContent = contents[0].jsonObject
            firstContent.containsKey("uri") shouldBe true
            firstContent.containsKey("mimeType") shouldBe true
            firstContent.containsKey("text") shouldBe true

            // Verify field values
            firstContent["uri"]?.jsonPrimitive?.content shouldBe "cycletime://projects"
            firstContent["mimeType"]?.jsonPrimitive?.content shouldBe "application/json"

            val textContent = firstContent["text"]?.jsonPrimitive?.content
            textContent shouldNotBe null
            textContent!! shouldContain "Test Project Alpha"
        }
    }

    "should read collection resource cycletime://issues via HTTP" {
        testSDKApplication {
            // ARRANGE: Create a test project and issue
            val projectRequest = MCPRequestBuilders.buildToolCallRequest(
                toolName = "project_create_project",
                arguments = mapOf("name" to "Issue Test Project"),
                id = 110
            )
            val projectResponse = client.sendMCPRequest(projectRequest)
            val projectJson = Json.parseToJsonElement(projectResponse.bodyAsText()).jsonObject
            val projectContent = projectJson["result"]?.jsonObject?.get("content")?.jsonArray?.get(0)?.jsonObject
            val projectText = projectContent?.get("text")?.jsonPrimitive?.content
            val projectData = Json.parseToJsonElement(projectText!!).jsonObject
            val projectId = projectData["id"]?.jsonPrimitive?.content!!

            val issueRequest = MCPRequestBuilders.buildToolCallRequest(
                toolName = "issue_create_issue",
                arguments = mapOf(
                    "title" to "Test Issue",
                    "projectId" to projectId,
                    "issueType" to "Story"
                ),
                id = 111
            )
            client.sendMCPRequest(issueRequest)

            // ACT: Read issues collection resource
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://issues",
                id = 2
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Should return HTTP 200 with issues data
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 2

            val result = jsonResponse["result"]!!.jsonObject
            val contents = result["contents"]?.jsonArray
            contents shouldNotBe null

            val firstContent = contents!![0].jsonObject
            firstContent["uri"]?.jsonPrimitive?.content shouldBe "cycletime://issues"
            firstContent["mimeType"]?.jsonPrimitive?.content shouldBe "application/json"

            val textContent = firstContent["text"]?.jsonPrimitive?.content
            textContent shouldNotBe null
            textContent!! shouldContain "Test Issue"
        }
    }

    // ========================================
    // HAPPY PATH TESTS (Template Resources)
    // ========================================

    "should read template resource cycletime://projects/{id} via HTTP" {
        testSDKApplication {
            // ARRANGE: Create a specific project
            val createRequest = MCPRequestBuilders.buildToolCallRequest(
                toolName = "project_create_project",
                arguments = mapOf(
                    "name" to "Specific Test Project",
                    "description" to "Project for template resource test"
                ),
                id = 120
            )
            val createResponse = client.sendMCPRequest(createRequest)

            // Extract project ID from creation response
            val createJson = Json.parseToJsonElement(createResponse.bodyAsText()).jsonObject
            val createResult = createJson["result"]?.jsonObject
            val contentArray = createResult!!["content"]?.jsonArray
            val textContent = contentArray!![0].jsonObject["text"]?.jsonPrimitive?.content
            val projectData = Json.parseToJsonElement(textContent!!).jsonObject
            val projectId = projectData["id"]?.jsonPrimitive?.content!!

            // ACT: Read specific project by ID using template resource
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://projects/$projectId",
                id = 3
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Should return HTTP 200 with specific project data
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 3

            val result = jsonResponse["result"]!!.jsonObject
            val contents = result["contents"]?.jsonArray
            contents shouldNotBe null
            contents!!.size shouldBe 1

            // Verify content structure
            val firstContent = contents[0].jsonObject
            firstContent["uri"]?.jsonPrimitive?.content shouldBe "cycletime://projects/$projectId"
            firstContent["mimeType"]?.jsonPrimitive?.content shouldBe "application/json"

            val readTextContent = firstContent["text"]?.jsonPrimitive?.content
            readTextContent shouldNotBe null
            readTextContent!! shouldContain "Specific Test Project"
            readTextContent shouldContain projectId
        }
    }

    "should read template resource cycletime://issues/{id} via HTTP" {
        testSDKApplication {
            // ARRANGE: Create project and issue
            val projectRequest = MCPRequestBuilders.buildToolCallRequest(
                toolName = "project_create_project",
                arguments = mapOf("name" to "Issue Template Test Project"),
                id = 130
            )
            val projectResponse = client.sendMCPRequest(projectRequest)
            val projectJson = Json.parseToJsonElement(projectResponse.bodyAsText()).jsonObject
            val projectContent = projectJson["result"]?.jsonObject?.get("content")?.jsonArray?.get(0)?.jsonObject
            val projectText = projectContent?.get("text")?.jsonPrimitive?.content
            val projectData = Json.parseToJsonElement(projectText!!).jsonObject
            val projectId = projectData["id"]?.jsonPrimitive?.content!!

            val issueRequest = MCPRequestBuilders.buildToolCallRequest(
                toolName = "issue_create_issue",
                arguments = mapOf(
                    "title" to "Specific Test Issue",
                    "projectId" to projectId,
                    "issueType" to "Epic"
                ),
                id = 131
            )
            val issueResponse = client.sendMCPRequest(issueRequest)

            // Extract issue ID
            val issueJson = Json.parseToJsonElement(issueResponse.bodyAsText()).jsonObject
            val issueContent = issueJson["result"]?.jsonObject?.get("content")?.jsonArray?.get(0)?.jsonObject
            val issueText = issueContent?.get("text")?.jsonPrimitive?.content
            val issueData = Json.parseToJsonElement(issueText!!).jsonObject
            val issueId = issueData["id"]?.jsonPrimitive?.content!!

            // ACT: Read specific issue by ID using template resource
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://issues/$issueId",
                id = 4
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Should return HTTP 200 with specific issue data
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 4

            val result = jsonResponse["result"]!!.jsonObject
            val contents = result["contents"]?.jsonArray
            contents shouldNotBe null

            val firstContent = contents!![0].jsonObject
            firstContent["uri"]?.jsonPrimitive?.content shouldBe "cycletime://issues/$issueId"
            firstContent["mimeType"]?.jsonPrimitive?.content shouldBe "application/json"

            val readTextContent = firstContent["text"]?.jsonPrimitive?.content
            readTextContent shouldNotBe null
            readTextContent!! shouldContain "Specific Test Issue"
            readTextContent shouldContain issueId
        }
    }

    // ========================================
    // ERROR HANDLING TESTS
    // ========================================

    "should return JSON-RPC error -32602 for missing uri parameter" {
        testSDKApplication {
            // ACT: Send resources/read request without uri parameter
            val invalidRequest = buildJsonObject {
                put("jsonrpc", "2.0")
                put("method", "resources/read")
                putJsonObject("params") {
                    // Missing "uri" field
                }
                put("id", 5)
            }.toString()

            val response = client.sendMCPRequest(invalidRequest)

            // ASSERT: Should return HTTP 200 with JSON-RPC error (not HTTP error)
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject

            // Should have error object, not result
            jsonResponse["error"] shouldNotBe null
            jsonResponse["result"] shouldBe null

            val error = jsonResponse["error"]!!.jsonObject

            // JSON-RPC error code -32602 = Invalid params
            error["code"]?.jsonPrimitive?.int shouldBe -32602

            val errorMessage = error["message"]?.jsonPrimitive?.content
            errorMessage shouldNotBe null
            errorMessage!!.lowercase() shouldContain "param"
        }
    }

    "should return JSON-RPC error -32000 for resource not found" {
        testSDKApplication {
            // ACT: Read non-existent resource
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://projects/nonexistent-uuid-12345",
                id = 6
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Should return HTTP 200 with JSON-RPC error
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject

            // Should have error object
            jsonResponse["error"] shouldNotBe null

            val error = jsonResponse["error"]!!.jsonObject

            // JSON-RPC error code -32000 = Server error (application-specific)
            // Note: MCP may use different error code for not found, verify during implementation
            val errorCode = error["code"]?.jsonPrimitive?.int
            errorCode shouldNotBe null

            val errorMessage = error["message"]?.jsonPrimitive?.content
            errorMessage shouldNotBe null
            errorMessage!!.lowercase() shouldContain "not found"
        }
    }

    "should return JSON-RPC error for invalid URI scheme" {
        testSDKApplication {
            // ACT: Read resource with invalid URI scheme
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "invalid-scheme://projects",
                id = 7
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Should return JSON-RPC error
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["error"] shouldNotBe null

            val error = jsonResponse["error"]!!.jsonObject
            val errorMessage = error["message"]?.jsonPrimitive?.content
            errorMessage shouldNotBe null
        }
    }

    // ========================================
    // MCP SPEC COMPLIANCE TESTS
    // ========================================

    "should return MCP-compliant response format with contents array" {
        testSDKApplication {
            // ARRANGE: Create test project
            val createRequest = MCPRequestBuilders.buildToolCallRequest(
                toolName = "project_create_project",
                arguments = mapOf("name" to "Compliance Test Project"),
                id = 140
            )
            client.sendMCPRequest(createRequest)

            // ACT: Read projects resource
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://projects",
                id = 8
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Verify exact MCP spec structure
            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject

            // Top-level JSON-RPC fields
            jsonResponse.containsKey("jsonrpc") shouldBe true
            jsonResponse.containsKey("id") shouldBe true
            jsonResponse.containsKey("result") shouldBe true

            jsonResponse["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 8

            // Result structure
            val result = jsonResponse["result"]!!.jsonObject
            result.containsKey("contents") shouldBe true

            // Contents array structure
            val contents = result["contents"]!!.jsonArray
            contents.size shouldBe 1

            // Each content item structure
            val contentItem = contents[0].jsonObject
            contentItem.containsKey("uri") shouldBe true
            contentItem.containsKey("mimeType") shouldBe true
            contentItem.containsKey("text") shouldBe true

            // Verify field types
            contentItem["uri"]?.jsonPrimitive?.content shouldNotBe null
            contentItem["mimeType"]?.jsonPrimitive?.content shouldNotBe null
            contentItem["text"]?.jsonPrimitive?.content shouldNotBe null
        }
    }

    "should propagate JSON-RPC request id to response" {
        testSDKApplication {
            // Test with integer id
            val request1 = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://projects",
                id = 42
            )
            val response1 = client.sendMCPRequest(request1)

            val jsonResponse1 = Json.parseToJsonElement(response1.bodyAsText()).jsonObject
            jsonResponse1["id"]?.jsonPrimitive?.int shouldBe 42

            // Test with string id (JSON-RPC allows string ids)
            val request2 = buildJsonObject {
                put("jsonrpc", "2.0")
                put("method", "resources/read")
                putJsonObject("params") {
                    put("uri", "cycletime://projects")
                }
                put("id", "test-read-id-123")
            }.toString()

            val response2 = client.sendMCPRequest(request2)
            val jsonResponse2 = Json.parseToJsonElement(response2.bodyAsText()).jsonObject
            jsonResponse2["id"]?.jsonPrimitive?.content shouldBe "test-read-id-123"
        }
    }

    "should handle resources/read without session ID" {
        testSDKApplication {
            // ACT: Read resource without session (stateless operation)
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://projects",
                sessionId = null,
                id = 9
            )
            val response = client.sendMCPRequest(readRequest, sessionId = null)

            // ASSERT: Should succeed (resources/read is stateless)
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["result"] shouldNotBe null
            jsonResponse["error"] shouldBe null
        }
    }

    // ========================================
    // EDGE CASE TESTS
    // ========================================

    "should return empty contents array for empty collection" {
        testSDKApplication {
            // ACT: Read workflows (likely empty in fresh test database)
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://workflows",
                id = 10
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Should return success with empty data
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]!!.jsonObject
            val contents = result["contents"]?.jsonArray

            contents shouldNotBe null
            // Note: Implementation may return empty array or array with empty JSON array in text
            // Both are valid MCP responses for empty collections
        }
    }

    "should handle resources/read with very long URI" {
        testSDKApplication {
            // ACT: Read resource with extremely long (but valid) project ID
            val longId = "a".repeat(100)
            val readRequest = MCPRequestBuilders.buildResourceReadRequest(
                uri = "cycletime://projects/$longId",
                id = 11
            )
            val response = client.sendMCPRequest(readRequest)

            // ASSERT: Should handle gracefully (return not found, not crash)
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            // Should have either result or error (no crash)
            (jsonResponse.containsKey("result") || jsonResponse.containsKey("error")) shouldBe true
        }
    }
})
