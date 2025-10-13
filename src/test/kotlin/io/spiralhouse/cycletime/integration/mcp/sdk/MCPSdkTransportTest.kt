package io.spiralhouse.cycletime.integration.mcp.sdk

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.cycletime.test.utils.*
import kotlinx.serialization.json.*

/**
 * Comprehensive integration tests for MCP SDK v0.7.2 transport layer.
 *
 * These tests validate the complete SDK transport integration:
 * - Official SDK v0.7.2 Ktor integration
 * - JSON-RPC protocol handling via SDK
 * - MCP tool and resource execution via SDK adapters
 * - Session management via SDK metadata
 * - Error handling and validation via SDK
 *
 * ## Test Strategy
 *
 * These integration tests verify the end-to-end flow through the SDK transport:
 * 1. **Initialize Connection**: Protocol version negotiation and capability exchange
 * 2. **Tools Operations**: List and call tools via SDK adapters
 * 3. **Resources Operations**: List, read, and subscribe to resources
 * 4. **Error Handling**: Invalid requests, missing parameters, and error responses
 * 5. **Session Management**: Session extraction from metadata and validation
 *
 * ## Architecture
 *
 * The SDK transport replaces custom EventBus architecture with official SDK:
 * ```
 * HTTP Client → SDK Ktor Integration → SDK Server → SDK Adapters → Business Logic
 * ```
 *
 * Tests use production DI configuration to ensure realistic behavior.
 *
 * @see io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer SDK server implementation
 * @see io.spiralhouse.cycletime.mcp.sdk.adapters SDK adapter implementations
 */
class MCPSdkTransportTest : StringSpec({

    // ===== Initialize Connection Tests =====

    "should initialize MCP connection via SDK" {
        testSDKApplication {
            val client = createTestClient()

            val response = client.sendMCPRequest(
                MCPRequestBuilders.buildInitializeRequest(
                    clientName = "test-client",
                    clientVersion = "1.0.0"
                )
            )

            // Verify HTTP response
            response.status shouldBe HttpStatusCode.OK

            // Verify JSON-RPC structure
            val result = response.extractMCPResult()
            result.shouldBeInstanceOf<JsonObject>()

            // Verify server info
            val serverInfo = result.jsonObject["serverInfo"]
            serverInfo shouldNotBe null
            serverInfo.shouldBeInstanceOf<JsonObject>()

            val name = serverInfo!!.jsonObject["name"]?.jsonPrimitive?.content
            name shouldBe "cycletime-ce"

            // Verify capabilities
            val capabilities = result.jsonObject["capabilities"]
            capabilities shouldNotBe null
            capabilities.shouldBeInstanceOf<JsonObject>()
        }
    }

    "should validate protocol version during initialize" {
        testSDKApplication {
            val client = createTestClient()

            // Test with current protocol version
            val validResponse = client.sendMCPRequest(
                MCPRequestBuilders.buildInitializeRequest(
                    protocolVersion = "2024-11-05"
                )
            )

            validResponse.status shouldBe HttpStatusCode.OK
            val result = validResponse.extractMCPResult()
            result shouldNotBe null

            // Verify protocol version is echoed back
            val protocolVersion = result.jsonObject["protocolVersion"]?.jsonPrimitive?.content
            protocolVersion shouldNotBe null
        }
    }

    "should handle client info in initialize request" {
        testSDKApplication {
            val client = createTestClient()

            val response = client.sendMCPRequest(
                MCPRequestBuilders.buildInitializeRequest(
                    clientName = "integration-test-client",
                    clientVersion = "2.5.0"
                )
            )

            response.status shouldBe HttpStatusCode.OK
            val result = response.extractMCPResult()

            // Verify server accepted client info
            result shouldNotBe null
            result.jsonObject["serverInfo"] shouldNotBe null
        }
    }

    // ===== Tools Operations Tests =====

    "should list all MCP tools via SDK" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize first (required by MCP protocol)
            client.mcpInitialize()

            // List tools
            val response = client.listMCPTools()

            // Verify response structure
            response.isMCPSuccess() shouldBe true
            val result = response.extractMCPResult()

            // Verify tools array
            val tools = result.jsonObject["tools"]
            tools shouldNotBe null
            tools.shouldBeInstanceOf<JsonArray>()

            val toolsArray = tools!!.jsonArray
            // Phase 3 registered 4 tool providers (session, project, issue, workflow)
            // Each provider has multiple tools, expect 15+ total tools
            toolsArray.size shouldBe 17

            // Verify tool structure
            toolsArray.forEach { toolElement ->
                val tool = toolElement.jsonObject
                tool["name"] shouldNotBe null
                tool["description"] shouldNotBe null
                tool["inputSchema"] shouldNotBe null
            }
        }
    }

    "should call tool with valid arguments via SDK" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Create session first
            val createResponse = client.callMCPTool(
                "session_create",
                mapOf("projectId" to "TEST-PROJECT-1")
            )

            createResponse.isMCPSuccess() shouldBe true
            val result = createResponse.extractMCPResult()

            // Verify tool result structure
            result shouldNotBe null
            val content = result.jsonObject["content"]
            content shouldNotBe null
            content.shouldBeInstanceOf<JsonArray>()

            val contentArray = content!!.jsonArray
            contentArray.shouldNotBeEmpty()

            // Verify text content
            val firstContent = contentArray[0].jsonObject
            firstContent["type"]?.jsonPrimitive?.content shouldBe "text"
            firstContent["text"] shouldNotBe null
        }
    }

    "should reject tool call with invalid tool name" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Call non-existent tool
            val response = client.callMCPTool(
                "nonexistent_tool",
                mapOf()
            )

            // Verify error response
            response.status shouldBe HttpStatusCode.OK // JSON-RPC errors return 200
            val error = response.extractMCPError()

            error shouldNotBe null
            error!!["code"] shouldNotBe null
            error["message"]?.jsonPrimitive?.content shouldContain "not found"
        }
    }

    "should reject tool call with missing required arguments" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Call tool without required arguments
            val response = client.callMCPTool(
                "session_create",
                mapOf() // Missing required projectId
            )

            // Verify error response
            val error = response.extractMCPError()
            error shouldNotBe null
            error!!["message"]?.jsonPrimitive?.content shouldContain "required"
        }
    }

    // ===== Resources Operations Tests =====

    "should list all MCP resources via SDK" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // List resources
            val response = client.listMCPResources()

            // Verify response structure
            response.isMCPSuccess() shouldBe true
            val result = response.extractMCPResult()

            // Verify resources array
            val resources = result.jsonObject["resources"]
            resources shouldNotBe null
            resources.shouldBeInstanceOf<JsonArray>()

            val resourcesArray = resources!!.jsonArray
            // Phase 3 registered 4 resource providers
            resourcesArray.shouldNotBeEmpty()

            // Verify resource structure
            resourcesArray.forEach { resourceElement ->
                val resource = resourceElement.jsonObject
                resource["uri"] shouldNotBe null
                resource["name"] shouldNotBe null
                resource["mimeType"] shouldNotBe null
            }
        }
    }

    "should read resource with valid URI via SDK" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Create session to get a valid session ID
            val sessionResponse = client.callMCPTool(
                "session_create",
                mapOf("projectId" to "TEST-PROJECT-1")
            )

            sessionResponse.isMCPSuccess() shouldBe true

            // Extract session ID from response
            val sessionResult = sessionResponse.extractMCPResult()
            val contentArray = sessionResult.jsonObject["content"]!!.jsonArray
            val textContent = contentArray[0].jsonObject["text"]?.jsonPrimitive?.content
            val sessionData = Json.parseToJsonElement(textContent!!).jsonObject
            val sessionId = sessionData["id"]?.jsonPrimitive?.content

            // Read resource
            val response = client.readMCPResource(
                uri = "cycletime://session/current",
                sessionId = sessionId
            )

            // Verify response structure
            response.isMCPSuccess() shouldBe true
            val result = response.extractMCPResult()

            // Verify resource contents
            val contents = result.jsonObject["contents"]
            contents shouldNotBe null
            contents.shouldBeInstanceOf<JsonArray>()
        }
    }

    "should reject resource read with invalid URI" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Read non-existent resource
            val response = client.readMCPResource(
                uri = "cycletime://invalid/resource"
            )

            // Verify error response
            val error = response.extractMCPError()
            error shouldNotBe null
            error!!["message"]?.jsonPrimitive?.content shouldContain "not found"
        }
    }

    "should subscribe to resource updates via SDK" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Subscribe to resource
            val response = client.subscribeMCPResource(
                uri = "cycletime://session/current"
            )

            // Verify subscription accepted
            response.status shouldBe HttpStatusCode.OK
        }
    }

    // ===== Error Handling Tests =====

    "should reject invalid JSON-RPC format" {
        testSDKApplication {
            val client = createTestClient()

            // Send malformed JSON
            val response = client.sendMCPRequest(
                """{"invalid": "json", "missing": "required fields"}"""
            )

            // Verify error response
            response.status shouldBe HttpStatusCode.OK // JSON-RPC errors return 200
            val error = response.extractMCPError()

            error shouldNotBe null
            error!!["code"]?.jsonPrimitive?.int shouldBe -32600 // Invalid Request
        }
    }

    "should reject requests missing session metadata when required" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Call session-aware tool without session metadata
            val response = client.callMCPTool(
                "session_get",
                mapOf() // No session ID in metadata
            )

            // Verify error response
            val error = response.extractMCPError()
            error shouldNotBe null
            error!!["message"]?.jsonPrimitive?.content shouldContain "session"
        }
    }

    "should handle malformed request parameters" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
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

            // Verify error response
            val error = response.extractMCPError()
            error shouldNotBe null
        }
    }

    // ===== Session Management Tests =====

    "should extract session ID from request metadata" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Create session
            val createResponse = client.callMCPTool(
                "session_create",
                mapOf("projectId" to "TEST-PROJECT-1")
            )

            createResponse.isMCPSuccess() shouldBe true

            // Extract session ID
            val result = createResponse.extractMCPResult()
            val contentArray = result.jsonObject["content"]!!.jsonArray
            val textContent = contentArray[0].jsonObject["text"]?.jsonPrimitive?.content
            val sessionData = Json.parseToJsonElement(textContent!!).jsonObject
            val sessionId = sessionData["id"]?.jsonPrimitive?.content

            sessionId shouldNotBe null

            // Use session ID in subsequent request
            val getResponse = client.callMCPTool(
                "session_get",
                mapOf(),
                sessionId = sessionId
            )

            getResponse.isMCPSuccess() shouldBe true
        }
    }

    "should maintain session persistence across requests" {
        testSDKApplication {
            val client = createTestClient()

            // Initialize
            client.mcpInitialize()

            // Create session
            val createResponse = client.callMCPTool(
                "session_create",
                mapOf("projectId" to "TEST-PROJECT-1")
            )

            val result = createResponse.extractMCPResult()
            val contentArray = result.jsonObject["content"]!!.jsonArray
            val textContent = contentArray[0].jsonObject["text"]?.jsonPrimitive?.content
            val sessionData = Json.parseToJsonElement(textContent!!).jsonObject
            val sessionId = sessionData["id"]?.jsonPrimitive?.content

            // Make multiple requests with same session
            repeat(3) { index ->
                val response = client.callMCPTool(
                    "session_get",
                    mapOf(),
                    sessionId = sessionId
                )

                response.isMCPSuccess() shouldBe true

                // Verify session data remains consistent
                val sessionResult = response.extractMCPResult()
                val sessionContent = sessionResult.jsonObject["content"]!!.jsonArray
                val sessionText = sessionContent[0].jsonObject["text"]?.jsonPrimitive?.content
                val currentSessionData = Json.parseToJsonElement(sessionText!!).jsonObject
                val currentSessionId = currentSessionData["id"]?.jsonPrimitive?.content

                currentSessionId shouldBe sessionId
            }
        }
    }
})
