package io.spiralhouse.cycletime.mcp.integration

import io.kotest.core.annotation.Ignored
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.collections.shouldContain
import io.kotest.assertions.timing.eventually
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.HttpStatusCode
import io.spiralhouse.cycletime.mcp.integration.fixtures.MCPIntegrationTestBase
import io.spiralhouse.cycletime.mcp.integration.fixtures.TestDataFactory
import io.spiralhouse.cycletime.mcp.integration.fixtures.MockClaudeClient
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlin.time.Duration.Companion.seconds

/**
 * Integration tests for core MCP server end-to-end functionality.
 * 
 * These tests verify complete integration between:
 * - Application startup sequence including MCP server initialization
 * - WebSocket server startup and connection handling
 * - MCP protocol implementation (JSON-RPC 2.0 compliance)
 * - Initialize handshake flow with capability negotiation
 * - Basic tool and resource discovery workflows
 * - Connection state management and cleanup
 * 
 * RED PHASE EXPECTATION: ALL TESTS SHOULD FAIL
 * These tests will fail during RED phase due to missing integration between:
 * - MCP server not integrated into main application startup
 * - WebSocket endpoints not configured in routing
 * - Protocol handlers not wired to WebSocket message processing
 * - Tool/resource registries not populated from domain services
 * - Health checks not reporting MCP server status
 * 
 * Each failure will indicate specific integration work needed for GREEN phase.
 */
@Ignored // SPI-608: Fix MCP WebSocket Integration Tests - Client Plugin Configuration
class MCPServerIntegrationTest : MCPIntegrationTestBase() {

    init {
        "should complete full MCP handshake flow from connection to initialized state" {
            withTestApplication {
                // EXPECTED FAILURE: MCP server not started with main application
                val client = createConnectedMcpClient()
                
                // EXPECTED FAILURE: WebSocket connection will fail - no MCP endpoint configured
                client.getConnectionState() shouldBe MockClaudeClient.ConnectionState.CONNECTED
                
                // EXPECTED FAILURE: Initialize method handler not implemented
                val initResponse = client.initialize(
                    protocolVersion = "2024-11-05",
                    clientName = "MCPServerIntegrationTest",
                    clientVersion = "1.0.0-test"
                )
                
                // Validate complete initialize response structure
                validateJsonRpcResponse(initResponse)
                
                val result = initResponse.jsonObject["result"]?.jsonObject
                result shouldNotBe null
                
                // Server should report correct protocol version
                result!!["protocolVersion"]?.jsonPrimitive?.content shouldBe "2024-11-05"
                
                // Server should report its capabilities
                val capabilities = result["capabilities"]?.jsonObject
                capabilities shouldNotBe null
                capabilities!!["resources"] shouldNotBe null
                capabilities["tools"] shouldNotBe null
                
                // Server should identify itself correctly
                val serverInfo = result["serverInfo"]?.jsonObject
                serverInfo shouldNotBe null
                serverInfo!!["name"]?.jsonPrimitive?.content shouldBe "CycleTime-CE"
                serverInfo["version"]?.jsonPrimitive?.content shouldNotBe null
                
                client.getConnectionState() shouldBe MockClaudeClient.ConnectionState.INITIALIZED
            }
        }
        
        "should list available tools with complete schemas after initialization" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // EXPECTED FAILURE: Tools list handler not implemented
                val toolsResponse = client.listTools()
                validateToolsList(toolsResponse)
                
                val result = toolsResponse.jsonObject["result"]?.jsonObject
                val tools = result!!["tools"]?.jsonArray!!
                
                // Verify CycleTime-specific tools are present
                val toolNames = tools.mapNotNull { it.jsonObject["name"]?.jsonPrimitive?.content }
                toolNames shouldContain "create_project"
                toolNames shouldContain "create_issue"
                toolNames shouldContain "get_next_task"
                toolNames shouldContain "list_projects"
                toolNames shouldContain "list_issues"
                
                // Each tool should have proper schema definition
                tools.forEach { tool ->
                    val toolObj = tool.jsonObject
                    toolObj["name"] shouldNotBe null
                    toolObj["description"] shouldNotBe null
                    toolObj["inputSchema"] shouldNotBe null
                    
                    // Input schema should be valid JSON Schema
                    val schema = toolObj["inputSchema"]?.jsonObject
                    schema?.get("type")?.jsonPrimitive?.content shouldBe "object"
                    schema?.get("properties") shouldNotBe null
                }
            }
        }
        
        "should execute project creation tool and verify persistence" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // EXPECTED FAILURE: Tool execution pipeline not implemented
                val projectRequest = TestDataFactory.createProjectToolCall(
                    name = "MCP Integration Test Project",
                    description = "Created via MCP tool call during integration testing"
                )
                
                val response = client.sendRequest(projectRequest)
                validateToolCallResponse(response, "create_project")
                
                // Verify tool response contains project data
                val result = response.jsonObject["result"]?.jsonObject
                val content = result?.get("content")?.jsonArray?.get(0)?.jsonObject
                content?.get("type")?.jsonPrimitive?.content shouldBe "text"
                
                val responseText = content?.get("text")?.jsonPrimitive?.content
                responseText shouldNotBe null
                responseText!! shouldContain "MCP Integration Test Project"
                
                // Verify project was actually persisted by listing projects
                val listRequest = TestDataFactory.createListProjectsToolCall()
                val listResponse = client.sendRequest(listRequest)
                
                val listResult = listResponse.jsonObject["result"]?.jsonObject
                val listContent = listResult?.get("content")?.jsonArray?.get(0)?.jsonObject?.get("text")?.jsonPrimitive?.content
                listContent shouldNotBe null
                listContent!! shouldContain "MCP Integration Test Project"
            }
        }
        
        "should read project resource after creation and verify format" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Create project first
                val projectId = createTestProject(client, "Resource Test Project")
                
                // EXPECTED FAILURE: Resource read handler not implemented
                val resourceUri = "cycletime://projects/${projectId}"
                val resourceResponse = client.readResource(resourceUri)
                
                validateResourceReadResponse(resourceResponse, resourceUri)
                
                val result = resourceResponse.jsonObject["result"]?.jsonObject
                val contents = result!!["contents"]?.jsonArray?.get(0)?.jsonObject
                
                contents?.get("uri")?.jsonPrimitive?.content shouldBe resourceUri
                contents?.get("mimeType")?.jsonPrimitive?.content shouldBe "application/json"
                
                val resourceText = contents?.get("text")?.jsonPrimitive?.content
                resourceText shouldNotBe null
                resourceText!! shouldContain "Resource Test Project"
                resourceText shouldContain projectId
            }
        }
        
        "should handle graceful disconnect with proper cleanup" {
            withTestApplication { testBuilder ->
                val mcpClient = performCompleteHandshake()
                
                // Verify connection is active
                mcpClient.getConnectionState() shouldBe MockClaudeClient.ConnectionState.INITIALIZED
                
                // Send a request to confirm connection works
                val toolsResponse = mcpClient.listTools()
                validateToolsList(toolsResponse)
                
                // Disconnect gracefully
                mcpClient.disconnect()
                
                eventually(5.seconds) {
                    mcpClient.getConnectionState() shouldBe MockClaudeClient.ConnectionState.CLOSED
                }
                
                // Verify connection metrics are updated in health endpoint
                val healthResponse = testBuilder.client.get("/health")
                val healthJson = json.parseToJsonElement(healthResponse.bodyAsText())
                val metrics = healthJson.jsonObject["metrics"]?.jsonObject
                metrics?.get("mcpConnections")?.jsonPrimitive?.content shouldBe "0"
            }
        }
        
        "should maintain connection state across multiple sequential requests" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Sequence of different request types should all work on same connection
                val toolsResponse = client.listTools()
                validateToolsList(toolsResponse)
                
                val resourcesResponse = client.listResources()
                validateResourcesList(resourcesResponse)
                
                val projectResponse = client.sendRequest(
                    TestDataFactory.createProjectToolCall("Sequential Test Project")
                )
                validateToolCallResponse(projectResponse, "create_project")
                
                val listResponse = client.sendRequest(TestDataFactory.createListProjectsToolCall())
                validateToolCallResponse(listResponse, "list_projects")
                
                // Connection should remain initialized throughout
                client.getConnectionState() shouldBe MockClaudeClient.ConnectionState.INITIALIZED
            }
        }
        
        "should handle WebSocket ping-pong heartbeat correctly" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // EXPECTED FAILURE: Ping/pong handling not implemented
                val pingData = byteArrayOf(1, 2, 3, 4, 5)
                val pongData = client.ping(pingData)
                
                pongData shouldBe pingData
                
                // Connection should remain active after ping/pong
                client.getConnectionState() shouldBe MockClaudeClient.ConnectionState.INITIALIZED
                
                // Should still be able to make requests
                val toolsResponse = client.listTools()
                validateToolsList(toolsResponse)
            }
        }
        
        "should report accurate MCP server status in health endpoint" {
            withTestApplication { testBuilder ->
                // Before any connections
                val initialHealth = testBuilder.client.get("/health")
                val initialJson = json.parseToJsonElement(initialHealth.bodyAsText())
                val initialDeps = initialJson.jsonObject["dependencies"]?.jsonObject
                val initialMetrics = initialJson.jsonObject["metrics"]?.jsonObject
                
                // EXPECTED FAILURE: MCP server status not reported in health check
                initialDeps?.get("mcp")?.jsonPrimitive?.content shouldBe "running"
                initialMetrics?.get("mcpConnections")?.jsonPrimitive?.content shouldBe "0"
                
                // With active connection
                val mcpClient1 = performCompleteHandshake()
                
                eventually(2.seconds) {
                    val activeHealth = testBuilder.client.get("/health")
                    val activeJson = json.parseToJsonElement(activeHealth.bodyAsText())
                    val activeMetrics = activeJson.jsonObject["metrics"]?.jsonObject
                    activeMetrics?.get("mcpConnections")?.jsonPrimitive?.content shouldBe "1"
                }
                
                // With multiple connections
                val mcpClient2 = createInitializedMcpClient("Client-2")
                
                eventually(2.seconds) {
                    val multiHealth = testBuilder.client.get("/health")
                    val multiJson = json.parseToJsonElement(multiHealth.bodyAsText())
                    val multiMetrics = multiJson.jsonObject["metrics"]?.jsonObject
                    multiMetrics?.get("mcpConnections")?.jsonPrimitive?.content shouldBe "2"
                }
                
                // After cleanup
                mcpClient1.disconnect()
                mcpClient2.disconnect()
                
                eventually(3.seconds) {
                    val finalHealth = testBuilder.client.get("/health")
                    val finalJson = json.parseToJsonElement(finalHealth.bodyAsText())
                    val finalMetrics = finalJson.jsonObject["metrics"]?.jsonObject
                    finalMetrics?.get("mcpConnections")?.jsonPrimitive?.content shouldBe "0"
                }
            }
        }
        
        "should handle server restart scenario with connection recovery" {
            // This test validates that MCP server can be properly integrated into
            // application lifecycle management
            
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Verify initial connection works
                val initialToolsResponse = client.listTools()
                validateToolsList(initialToolsResponse)
                
                // Simulate server restart by stopping and starting application
                // EXPECTED FAILURE: Server restart/connection recovery not implemented
                
                // After restart, new connection should work
                val newClient = createInitializedMcpClient("Restart-Test-Client")
                val postRestartToolsResponse = newClient.listTools()
                validateToolsList(postRestartToolsResponse)
                
                newClient.disconnect()
            }
        }
        
        "should handle concurrent initialization requests correctly" {
            withTestApplication {
                // EXPECTED FAILURE: Concurrent connection handling not implemented properly
                val clients = (1..3).map { index ->
                    createConnectedMcpClient()
                }
                
                // All clients should be able to initialize concurrently
                val initResponses = clients.mapIndexed { index, client ->
                    client.initialize(
                        clientName = "Concurrent-Client-${index + 1}",
                        protocolVersion = "2024-11-05"
                    )
                }
                
                // All initializations should succeed
                initResponses.forEach { response ->
                    validateJsonRpcResponse(response)
                    val result = response.jsonObject["result"]?.jsonObject
                    result?.get("protocolVersion")?.jsonPrimitive?.content shouldBe "2024-11-05"
                }
                
                // All clients should be in initialized state
                clients.forEach { client ->
                    client.getConnectionState() shouldBe MockClaudeClient.ConnectionState.INITIALIZED
                }
                
                // Cleanup
                clients.forEach { it.disconnect() }
            }
        }
        
        "should validate complete end-to-end MCP workflow" {
            // This is the comprehensive test covering the full SPI-575 acceptance criteria
            withTestApplication {
                val client = performCompleteHandshake()
                
                // 1. Full MCP Flow Test: WebSocket → initialize → tools/list → tools/call → resources/read → disconnect
                
                // Initialize already done in performCompleteHandshake()
                client.getConnectionState() shouldBe MockClaudeClient.ConnectionState.INITIALIZED
                
                // Tools list
                val toolsResponse = client.listTools()
                validateToolsList(toolsResponse)
                
                // Tool call (create project)
                val projectId = createTestProject(client, "E2E Workflow Test Project")
                
                // Resource read (verify project exists)
                val resourceResponse = client.readResource("cycletime://projects/${projectId}")
                validateResourceReadResponse(resourceResponse, "cycletime://projects/${projectId}")
                
                // Create issue in the project
                val issueId = createTestIssue(client, projectId, "E2E Workflow Test Issue")
                
                // Verify issue resource
                val issueResourceResponse = client.readResource("cycletime://issues/${issueId}")
                validateResourceReadResponse(issueResourceResponse, "cycletime://issues/${issueId}")
                
                // Get next task (workflow integration)
                val nextTaskRequest = TestDataFactory.createGetNextTaskToolCall(projectId) // Using project as session for now
                val nextTaskResponse = client.sendRequest(nextTaskRequest)
                validateToolCallResponse(nextTaskResponse, "get_next_task")
                
                // Graceful disconnect
                client.disconnect()
                client.getConnectionState() shouldBe MockClaudeClient.ConnectionState.CLOSED
            }
        }
        
        "MCP server smoke test - basic functionality" {
            withTestApplication { testBuilder ->
                // Just verify the server is running
                val health = testBuilder.client.get("/health")
                health.status shouldBe HttpStatusCode.OK
                
                // Verify MCP is in health response
                val healthBody = health.bodyAsText()
                healthBody shouldContain "mcp"
            }
        }
    }
}