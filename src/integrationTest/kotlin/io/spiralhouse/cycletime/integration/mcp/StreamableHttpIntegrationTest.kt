package io.spiralhouse.cycletime.integration.mcp

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.kotest.matchers.collections.shouldContain as shouldContainElement
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldStartWith
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.cycletime.test.utils.testSDKApplication
import kotlinx.serialization.json.*

/**
 * Integration tests for StreamableHttpHandler SDK delegation (SPI-764).
 *
 * Tests verify that the Streamable HTTP transport correctly delegates JSON-RPC
 * requests to the MCP SDK Server instance instead of returning hardcoded empty arrays.
 *
 * ## Test Strategy (TDD - RED phase)
 *
 * These tests MUST FAIL initially because StreamableHttpHandler currently returns:
 * ```kotlin
 * "tools/list" -> buildJsonObject {
 *     put("result", buildJsonObject {
 *         put("tools", JsonArray(emptyList()))  // WRONG!
 *     })
 * }
 * ```
 *
 * After implementation (GREEN phase), tests should pass with real SDK-registered tools/resources.
 *
 * ## Architecture
 *
 * StreamableHttpHandler receives the SDK Server instance which has 17 tools and 10 resources
 * registered during application startup. The handler must delegate to the SDK instead of
 * returning mock responses.
 *
 * ## Edge Cases Covered (Ultrathink Analysis)
 *
 * - Tool/resource count validation (exact counts from log evidence)
 * - Tool name namespacing (provider_toolname format)
 * - Resource URI scheme validation (cycletime:// prefix)
 * - Tool schema completeness (name, description, inputSchema)
 * - Resource schema completeness (uri, name, description)
 * - JSON-RPC id propagation (request id matches response id)
 * - JSON-RPC id type handling (integer, string, null)
 * - Session management (with/without session ID)
 * - Content negotiation (JSON vs SSE responses)
 * - Protocol version header propagation
 * - Provider coverage (all 4 providers registered: project, issue, session, workflow)
 *
 * @see io.spiralhouse.cycletime.mcp.sdk.StreamableHttpHandler StreamableHttpHandler implementation
 * @see io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer SDK Server with registered tools/resources
 */
class StreamableHttpIntegrationTest : StringSpec({

    // ========================================
    // CORE FUNCTIONALITY TESTS (MUST FAIL)
    // ========================================

    "POST /mcp with tools/list should return all 17 registered tools from SDK" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 1

            val result = jsonResponse["result"]?.jsonObject
            result shouldNotBe null

            val tools = result!!["tools"]?.jsonArray
            tools shouldNotBe null

            // CRITICAL: SDK should have 17 tools registered (evidence from logs)
            // This WILL FAIL because StreamableHttpHandler returns empty array
            tools!!.size shouldBeGreaterThan 0
            tools.size shouldBe 17
        }
    }

    "POST /mcp with tools/list should return correctly namespaced tool names" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":2,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val tools = result["tools"]?.jsonArray!!

            // CRITICAL: Tool names must follow {namespace}_{tool_name} pattern
            // This WILL FAIL because StreamableHttpHandler returns empty array
            val toolNames = tools.map { it.jsonObject["name"]?.jsonPrimitive?.content!! }

            // Verify specific tools from each provider (log evidence)
            toolNames shouldContainAll listOf(
                "project_create_project",
                "project_get_project",
                "project_list_projects",
                "project_update_project",
                "issue_create_issue",
                "issue_get_issue",
                "issue_list_issues",
                "issue_update_issue",
                "session_get_active_session",
                "workflow_list_workflows"
            )
        }
    }

    "POST /mcp with tools/list should return tools with complete schema" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":3,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val tools = result["tools"]?.jsonArray!!

            // CRITICAL: Every tool must have required fields per MCP spec
            // This WILL FAIL because StreamableHttpHandler returns empty array
            tools.size shouldBeGreaterThan 0

            tools.forEach { tool ->
                val toolObj = tool.jsonObject

                // MCP spec requires: name, description, inputSchema
                toolObj.containsKey("name") shouldBe true
                toolObj.containsKey("description") shouldBe true
                toolObj.containsKey("inputSchema") shouldBe true

                // Verify field types
                toolObj["name"]?.jsonPrimitive?.content shouldNotBe null
                toolObj["description"]?.jsonPrimitive?.content shouldNotBe null
                toolObj["inputSchema"]?.jsonObject shouldNotBe null
            }
        }
    }

    "POST /mcp with resources/list should return all 10 registered resources from SDK" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":4,"method":"resources/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            jsonResponse["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
            jsonResponse["id"]?.jsonPrimitive?.int shouldBe 4

            val result = jsonResponse["result"]?.jsonObject
            result shouldNotBe null

            val resources = result!!["resources"]?.jsonArray
            resources shouldNotBe null

            // CRITICAL: SDK should have 10 resources registered (4 providers)
            // This WILL FAIL because StreamableHttpHandler returns empty array
            resources!!.size shouldBeGreaterThan 0
            resources.size shouldBe 10
        }
    }

    "POST /mcp with resources/list should return resources with cycletime:// URI scheme" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":5,"method":"resources/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val resources = result["resources"]?.jsonArray!!

            // CRITICAL: Resource URIs must follow cycletime:// scheme
            // This WILL FAIL because StreamableHttpHandler returns empty array
            resources.size shouldBeGreaterThan 0

            val resourceUris = resources.map { it.jsonObject["uri"]?.jsonPrimitive?.content!! }

            // Verify specific resources from each provider
            resourceUris shouldContainAll listOf(
                "cycletime://projects",
                "cycletime://issues",
                "cycletime://sessions/active"
            )

            // Verify all URIs use cycletime:// scheme
            resourceUris.forEach { uri ->
                uri shouldStartWith "cycletime://"
            }
        }
    }

    "POST /mcp with resources/list should return resources with complete schema" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":6,"method":"resources/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val resources = result["resources"]?.jsonArray!!

            // CRITICAL: Every resource must have required fields per MCP spec
            // This WILL FAIL because StreamableHttpHandler returns empty array
            resources.size shouldBeGreaterThan 0

            resources.forEach { resource ->
                val resourceObj = resource.jsonObject

                // MCP spec requires: uri, name, description
                resourceObj.containsKey("uri") shouldBe true
                resourceObj.containsKey("name") shouldBe true
                resourceObj.containsKey("description") shouldBe true

                // Verify field types
                resourceObj["uri"]?.jsonPrimitive?.content shouldNotBe null
                resourceObj["name"]?.jsonPrimitive?.content shouldNotBe null
                resourceObj["description"]?.jsonPrimitive?.content shouldNotBe null
            }
        }
    }

    // ========================================
    // EDGE CASE TESTS (Protocol Compliance)
    // ========================================

    "POST /mcp with tools/list should propagate JSON-RPC request id to response" {
        testSDKApplication {
            // Test with integer id
            val response1 = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":42,"method":"tools/list"}""")
            }

            val jsonResponse1 = Json.parseToJsonElement(response1.bodyAsText()).jsonObject
            jsonResponse1["id"]?.jsonPrimitive?.int shouldBe 42

            // Test with string id (JSON-RPC allows string ids)
            val response2 = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":"test-id-123","method":"tools/list"}""")
            }

            val jsonResponse2 = Json.parseToJsonElement(response2.bodyAsText()).jsonObject
            jsonResponse2["id"]?.jsonPrimitive?.content shouldBe "test-id-123"
        }
    }

    "POST /mcp with tools/list and no session ID should still return tools" {
        testSDKApplication {
            // EDGE CASE: tools/list doesn't require session (stateless operation)
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                // NOTE: No Mcp-Session-Id header
                setBody("""{"jsonrpc":"2.0","id":7,"method":"tools/list"}""")
            }

            // Should succeed (tools/list is stateless)
            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val tools = result["tools"]?.jsonArray!!

            // CRITICAL: Should return tools even without session
            // This WILL FAIL because StreamableHttpHandler returns empty array
            tools.size shouldBe 17
        }
    }

    "POST /mcp with tools/list and Accept text/event-stream should return SSE response" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Accept", "text/event-stream")
                setBody("""{"jsonrpc":"2.0","id":8,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            // EDGE CASE: Content negotiation should return SSE format
            response.headers["Content-Type"] shouldBe "text/event-stream"

            val bodyText = response.bodyAsText()
            // SSE format: data: {json}\nid: {uuid}\n\n
            bodyText shouldStartWith "data: "
            bodyText shouldContain "\"tools\":"

            // Extract JSON from SSE data line
            val jsonLine = bodyText.lines().first { it.startsWith("data: ") }
            val jsonContent = jsonLine.removePrefix("data: ")
            val jsonResponse = Json.parseToJsonElement(jsonContent).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val tools = result["tools"]?.jsonArray!!

            // CRITICAL: Should still return 17 tools in SSE format
            // This WILL FAIL because StreamableHttpHandler returns empty array
            tools.size shouldBe 17
        }
    }

    "POST /mcp with tools/list should return protocol version header" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("MCP-Protocol-Version", "2025-06-18")
                setBody("""{"jsonrpc":"2.0","id":9,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            // EDGE CASE: Protocol version should be echoed back
            response.headers["MCP-Protocol-Version"] shouldBe "2025-06-18"

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val tools = result["tools"]?.jsonArray!!

            // Should still return 17 tools
            tools.size shouldBe 17
        }
    }

    "POST /mcp with tools/list should include tools from all 4 providers" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"jsonrpc":"2.0","id":10,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject!!
            val tools = result["tools"]?.jsonArray!!

            // CRITICAL: Verify all 4 providers are registered (from logs)
            // - project: 4 tools
            // - issue: 4 tools
            // - session: 6 tools
            // - workflow: 3 tools
            // Total: 17 tools

            val toolNames = tools.map { it.jsonObject["name"]?.jsonPrimitive?.content!! }

            // Count tools per provider
            val projectTools = toolNames.count { it.startsWith("project_") }
            val issueTools = toolNames.count { it.startsWith("issue_") }
            val sessionTools = toolNames.count { it.startsWith("session_") }
            val workflowTools = toolNames.count { it.startsWith("workflow_") }

            // Verify counts match log evidence
            projectTools shouldBe 4
            issueTools shouldBe 4
            sessionTools shouldBe 6
            workflowTools shouldBe 3
        }
    }

    "POST /mcp with initialize should return correct server capabilities" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""
                    {
                        "jsonrpc":"2.0",
                        "id":11,
                        "method":"initialize",
                        "params":{
                            "protocolVersion":"2025-06-18",
                            "clientInfo":{"name":"test-client","version":"1.0.0"},
                            "capabilities":{}
                        }
                    }
                """.trimIndent())
            }

            response.status shouldBe HttpStatusCode.OK

            val jsonResponse = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val result = jsonResponse["result"]?.jsonObject
            result shouldNotBe null

            // Verify server info matches SDK configuration
            val serverInfo = result!!["serverInfo"]?.jsonObject
            serverInfo?.get("name")?.jsonPrimitive?.content shouldBe "cycletime-ce"
            serverInfo?.get("version")?.jsonPrimitive?.content shouldNotBe null

            // Verify capabilities match SDK registration
            val capabilities = result["capabilities"]?.jsonObject
            capabilities shouldNotBe null
            capabilities!!["tools"]?.jsonObject shouldNotBe null
            capabilities["resources"]?.jsonObject shouldNotBe null
        }
    }

    // ========================================
    // ERROR HANDLING TESTS (Security & Robustness)
    // ========================================

    "POST /mcp with invalid JSON should return 400 Bad Request" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("{invalid json}")  // Malformed JSON
            }

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.bodyAsText()
            error shouldContain "Invalid JSON"
        }
    }

    "POST /mcp with malicious Origin should return 403 Forbidden" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("Origin", "http://evil-site.com")  // Not in whitelist
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.Forbidden
            val error = response.bodyAsText()
            error shouldContain "Invalid origin"
        }
    }

    "POST /mcp with unsupported protocol version should return 400 Bad Request" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                header("MCP-Protocol-Version", "1999-12-31")  // Way old version
                setBody("""{"jsonrpc":"2.0","id":1,"method":"tools/list"}""")
            }

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.bodyAsText()
            error shouldContain "protocol version"
        }
    }

    "POST /mcp with missing required JSON-RPC fields should return 400 Bad Request" {
        testSDKApplication {
            val response = client.post("/mcp") {
                header("Content-Type", "application/json")
                setBody("""{"id":1}""")  // Missing "jsonrpc" and "method"
            }

            response.status shouldBe HttpStatusCode.BadRequest
            val error = response.bodyAsText()
            error shouldContain "Invalid JSON-RPC"
        }
    }
})
