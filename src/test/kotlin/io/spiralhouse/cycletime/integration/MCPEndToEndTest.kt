package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.assertions.timing.eventually
import io.kotest.common.ExperimentalKotest
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.ktor.websocket.*
import io.spiralhouse.cycletime.module
import kotlinx.coroutines.delay
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.time.Duration.Companion.seconds
import kotlin.time.Duration.Companion.milliseconds

/**
 * End-to-End integration tests for complete MCP WebSocket functionality.
 * 
 * EXPECTATION: ALL TESTS SHOULD FAIL INITIALLY (RED Phase)
 * These tests define the expected behavior for:
 * 1. Complete application startup sequence with MCP
 * 2. WebSocket connection establishment to MCP server  
 * 3. Basic MCP protocol interaction (initialize method)
 * 4. Server shutdown cleanup and connection closure
 * 5. Resource cleanup and connection management
 */
@OptIn(ExperimentalKotest::class)
class MCPEndToEndTest : StringSpec({

    "should complete full application startup with REST and MCP servers" {
        testApplication {
            application {
                module() // Will fail - MCP server not integrated into startup
            }

            // Verify REST server is running
            val restHealth = client.get("/health")
            restHealth.status shouldBe HttpStatusCode.OK

            val healthJson = Json.parseToJsonElement(restHealth.bodyAsText())
            val dependencies = healthJson.jsonObject["dependencies"]?.jsonObject
            
            // Both servers should be reported as healthy
            dependencies?.get("database")?.jsonPrimitive?.content shouldBe "connected"
            dependencies?.get("mcpServer")?.jsonPrimitive?.content shouldBe "running" // Will fail

            // Verify all services are initialized
            dependencies?.get("projectService")?.jsonPrimitive?.content shouldBe "initialized"
            dependencies?.get("issueService")?.jsonPrimitive?.content shouldBe "initialized"
            dependencies?.get("sessionService")?.jsonPrimitive?.content shouldBe "initialized"
        }
    }

    "should establish WebSocket connection to MCP server" {
        testApplication {
            application {
                module()
            }

            // Wait for application to start
            val healthCheck = client.get("/health")
            healthCheck.status shouldBe HttpStatusCode.OK

            // Create WebSocket client
            val wsClient = HttpClient(CIO) {
                install(WebSockets)
            }

            try {
                // This will fail - MCP WebSocket server not running
                wsClient.webSocket(
                    method = HttpMethod.Get,
                    host = "localhost",
                    port = 3006, // MCP server port
                    path = "/mcp"
                ) {
                    // Connection should be established
                    incoming.isEmpty shouldBe false
                    outgoing.isClosedForSend shouldBe false
                }
            } finally {
                wsClient.close()
            }
        }
    }

    "should handle MCP initialize protocol method" {
        testApplication {
            application {
                module()
            }

            val wsClient = HttpClient(CIO) {
                install(WebSockets)
            }

            try {
                wsClient.webSocket(
                    host = "localhost",
                    port = 3006,
                    path = "/mcp"
                ) {
                    // Send MCP initialize request
                    val initRequest = """
                        {
                            "jsonrpc": "2.0",
                            "id": "init-1",
                            "method": "initialize",
                            "params": {
                                "protocolVersion": "2024-11-05",
                                "capabilities": {
                                    "resources": {"subscribe": true},
                                    "tools": {}
                                },
                                "clientInfo": {
                                    "name": "CycleTime-Test-Client",
                                    "version": "1.0.0"
                                }
                            }
                        }
                    """.trimIndent()

                    send(Frame.Text(initRequest)) // Will fail - WebSocket handler not implemented

                    // Receive and validate initialize response
                    val response = incoming.receive() as Frame.Text
                    val responseJson = Json.parseToJsonElement(response.readText())
                    
                    responseJson.jsonObject["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
                    responseJson.jsonObject["id"]?.jsonPrimitive?.content shouldBe "init-1"
                    responseJson.jsonObject["result"] shouldNotBe null
                    
                    val result = responseJson.jsonObject["result"]?.jsonObject
                    result?.get("protocolVersion")?.jsonPrimitive?.content shouldBe "2024-11-05"
                    result?.get("capabilities") shouldNotBe null
                    result?.get("serverInfo") shouldNotBe null
                }
            } finally {
                wsClient.close()
            }
        }
    }

    "should handle MCP resources/list method" {
        testApplication {
            application {
                module()
            }

            val wsClient = HttpClient(CIO) {
                install(WebSockets)
            }

            try {
                wsClient.webSocket(
                    host = "localhost", 
                    port = 3006,
                    path = "/mcp"
                ) {
                    // First initialize
                    send(Frame.Text(createInitializeRequest()))
                    val initResponse = incoming.receive() as Frame.Text
                    
                    // Then request resources list
                    val resourcesRequest = """
                        {
                            "jsonrpc": "2.0",
                            "id": "resources-1",
                            "method": "resources/list"
                        }
                    """.trimIndent()

                    send(Frame.Text(resourcesRequest)) // Will fail - resources handler not implemented

                    val response = incoming.receive() as Frame.Text
                    val responseJson = Json.parseToJsonElement(response.readText())
                    
                    responseJson.jsonObject["id"]?.jsonPrimitive?.content shouldBe "resources-1"
                    val result = responseJson.jsonObject["result"]?.jsonObject
                    val resources = result?.get("resources")
                    resources shouldNotBe null

                    // Should include CycleTime resources (projects, issues, sessions)
                    val resourcesText = response.readText()
                    resourcesText shouldContain "cycletime://projects"
                    resourcesText shouldContain "cycletime://issues" 
                    resourcesText shouldContain "cycletime://sessions"
                }
            } finally {
                wsClient.close()
            }
        }
    }

    "should handle MCP tools/list method" {
        testApplication {
            application {
                module()
            }

            val wsClient = HttpClient(CIO) {
                install(WebSockets)
            }

            try {
                wsClient.webSocket(
                    host = "localhost",
                    port = 3006, 
                    path = "/mcp"
                ) {
                    // Initialize first
                    send(Frame.Text(createInitializeRequest()))
                    incoming.receive()

                    // Request tools list
                    val toolsRequest = """
                        {
                            "jsonrpc": "2.0",
                            "id": "tools-1", 
                            "method": "tools/list"
                        }
                    """.trimIndent()

                    send(Frame.Text(toolsRequest)) // Will fail - tools handler not implemented

                    val response = incoming.receive() as Frame.Text
                    val responseJson = Json.parseToJsonElement(response.readText())

                    responseJson.jsonObject["id"]?.jsonPrimitive?.content shouldBe "tools-1"
                    val result = responseJson.jsonObject["result"]?.jsonObject
                    val tools = result?.get("tools")
                    tools shouldNotBe null

                    // Should include CycleTime tools
                    val responseText = response.readText()
                    responseText shouldContain "create_project"
                    responseText shouldContain "create_issue"
                    responseText shouldContain "get_next_task"
                }
            } finally {
                wsClient.close()
            }
        }
    }

    "should handle concurrent WebSocket connections" {
        testApplication {
            application {
                module()
            }

            val wsClient1 = HttpClient(CIO) { install(WebSockets) }
            val wsClient2 = HttpClient(CIO) { install(WebSockets) }

            try {
                // Open two concurrent connections
                val connection1 = wsClient1.webSocketSession(
                    host = "localhost",
                    port = 3006,
                    path = "/mcp"
                )

                val connection2 = wsClient2.webSocketSession(
                    host = "localhost", 
                    port = 3006,
                    path = "/mcp"
                )

                // Both should work independently
                connection1.send(Frame.Text(createInitializeRequest("client1")))
                connection2.send(Frame.Text(createInitializeRequest("client2")))

                val response1 = connection1.incoming.receive() as Frame.Text
                val response2 = connection2.incoming.receive() as Frame.Text

                // Both should get valid responses
                response1.readText() shouldContain "client1"
                response2.readText() shouldContain "client2"

                connection1.close()
                connection2.close()

            } finally {
                wsClient1.close()
                wsClient2.close()
            }
        }
    }

    "should handle WebSocket connection errors gracefully" {
        testApplication {
            application {
                module()
            }

            val wsClient = HttpClient(CIO) {
                install(WebSockets)
            }

            try {
                wsClient.webSocket(
                    host = "localhost",
                    port = 3006,
                    path = "/mcp"
                ) {
                    // Send malformed JSON
                    send(Frame.Text("{invalid json")) // Will fail - error handling not implemented

                    val response = incoming.receive() as Frame.Text
                    val responseJson = Json.parseToJsonElement(response.readText())
                    
                    // Should get JSON-RPC error response
                    responseJson.jsonObject["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
                    responseJson.jsonObject["error"] shouldNotBe null
                    
                    val error = responseJson.jsonObject["error"]?.jsonObject
                    error?.get("code")?.jsonPrimitive?.content shouldBe "-32700" // Parse error
                    error?.get("message")?.jsonPrimitive?.content shouldContain "Parse error"
                }
            } finally {
                wsClient.close()
            }
        }
    }

    "should handle graceful server shutdown with active connections" {
        testApplication {
            application {
                module()
            }

            val wsClient = HttpClient(CIO) {
                install(WebSockets)
            }

            val connection = wsClient.webSocketSession(
                host = "localhost",
                port = 3006, 
                path = "/mcp"
            )

            connection.send(Frame.Text(createInitializeRequest()))
            val initResponse = connection.incoming.receive() as Frame.Text
            initResponse shouldNotBe null

            // Application shutdown should close connections gracefully
            // This is tested by testApplication cleanup
            // Connection should be properly closed without hanging

            eventually(5.seconds) {
                connection.closeReason.await() shouldNotBe null
            }

            wsClient.close()
        }
    }

    "should maintain connection state across multiple requests" {
        testApplication {
            application {
                module()
            }

            val wsClient = HttpClient(CIO) {
                install(WebSockets)
            }

            try {
                wsClient.webSocket(
                    host = "localhost",
                    port = 3006,
                    path = "/mcp"
                ) {
                    // Initialize
                    send(Frame.Text(createInitializeRequest()))
                    val initResponse = incoming.receive() as Frame.Text
                    initResponse shouldNotBe null

                    // Multiple sequential requests should work
                    send(Frame.Text(createResourcesListRequest()))
                    val resourcesResponse = incoming.receive() as Frame.Text
                    resourcesResponse shouldNotBe null

                    send(Frame.Text(createToolsListRequest()))  
                    val toolsResponse = incoming.receive() as Frame.Text
                    toolsResponse shouldNotBe null

                    // Connection should remain active
                    incoming.isEmpty shouldBe false
                    outgoing.isClosedForSend shouldBe false
                }
            } finally {
                wsClient.close()
            }
        }
    }

    "should handle WebSocket ping/pong heartbeat" {
        testApplication {
            application {
                module()
            }

            val wsClient = HttpClient(CIO) {
                install(WebSockets)
            }

            try {
                wsClient.webSocket(
                    host = "localhost",
                    port = 3006,
                    path = "/mcp"
                ) {
                    send(Frame.Text(createInitializeRequest()))
                    incoming.receive()

                    // Send ping frame
                    send(Frame.Ping(byteArrayOf(1, 2, 3, 4)))

                    // Should receive pong response  
                    withTimeout(5.seconds) {
                        val pong = incoming.receive() as Frame.Pong
                        pong.data shouldBe byteArrayOf(1, 2, 3, 4)
                    }
                }
            } finally {
                wsClient.close()
            }
        }
    }

    "should report accurate connection metrics in health endpoint" {
        testApplication {
            application {
                module()
            }

            // Initial state - no connections
            val initialHealth = client.get("/health")
            val initialJson = Json.parseToJsonElement(initialHealth.bodyAsText())
            val initialMetrics = initialJson.jsonObject["metrics"]?.jsonObject
            initialMetrics?.get("mcpConnections")?.jsonPrimitive?.content shouldBe "0"

            val wsClient = HttpClient(CIO) { install(WebSockets) }

            try {
                val connection = wsClient.webSocketSession(
                    host = "localhost",
                    port = 3006,
                    path = "/mcp"
                )

                // With active connection
                eventually(2.seconds) {
                    val activeHealth = client.get("/health")
                    val activeJson = Json.parseToJsonElement(activeHealth.bodyAsText())
                    val activeMetrics = activeJson.jsonObject["metrics"]?.jsonObject
                    activeMetrics?.get("mcpConnections")?.jsonPrimitive?.content shouldBe "1"
                }

                connection.close()

                // After connection closed
                eventually(2.seconds) {
                    val closedHealth = client.get("/health")
                    val closedJson = Json.parseToJsonElement(closedHealth.bodyAsText())
                    val closedMetrics = closedJson.jsonObject["metrics"]?.jsonObject
                    closedMetrics?.get("mcpConnections")?.jsonPrimitive?.content shouldBe "0"
                }
            } finally {
                wsClient.close()
            }
        }
    }
})

// Helper functions for creating MCP protocol messages
private fun createInitializeRequest(clientName: String = "test-client"): String = """
{
    "jsonrpc": "2.0",
    "id": "init-1",
    "method": "initialize", 
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {
            "resources": {"subscribe": true},
            "tools": {}
        },
        "clientInfo": {
            "name": "$clientName",
            "version": "1.0.0"
        }
    }
}
""".trimIndent()

private fun createResourcesListRequest(): String = """
{
    "jsonrpc": "2.0",
    "id": "resources-1",
    "method": "resources/list"
}
""".trimIndent()

private fun createToolsListRequest(): String = """
{
    "jsonrpc": "2.0", 
    "id": "tools-1",
    "method": "tools/list"
}
""".trimIndent()