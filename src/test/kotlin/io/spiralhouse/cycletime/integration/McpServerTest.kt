package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.string.shouldContain as shouldContainString
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.websocket.WebSocketConnectionManager
import io.spiralhouse.cycletime.mcp.websocket.WebSocketServerConfig
import io.spiralhouse.cycletime.mcp.tools.DefaultToolRegistry
import io.spiralhouse.cycletime.mcp.tools.Tool
import io.spiralhouse.cycletime.mcp.tools.AsyncTool
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import io.spiralhouse.cycletime.mcp.resources.ResourceProvider
import io.spiralhouse.cycletime.mcp.server.McpServer
import io.spiralhouse.cycletime.mcp.server.McpServerConfig
import kotlinx.serialization.json.*
import kotlinx.coroutines.delay
import java.time.Duration

/**
 * TDD Integration Tests for MCP Server - RED Phase
 * 
 * These tests define the integration behavior for an MCP server that orchestrates
 * all MCP components. The server should provide lifecycle management, component
 * wiring, and end-to-end MCP protocol support.
 * 
 * Requirements being tested:
 * 1. Server creation and configuration with all components
 * 2. Lifecycle management (start/stop) with proper sequencing
 * 3. Component integration and communication flow
 * 4. JSON-RPC request routing through WebSocket to handlers
 * 5. Tool registration and invocation through the server
 * 6. Resource provider registration and access
 * 7. MCP protocol initialization and capability exchange
 * 8. Error handling across component boundaries
 * 9. Graceful shutdown with resource cleanup
 * 10. Configuration validation and component setup
 */
class McpServerTest : StringSpec({

    "should create McpServer with all required components" {
        // Server should integrate and configure all MCP components
        val server = McpServer(
            config = McpServerConfig(
                port = 8080,
                enableSSL = false,
                connectionTimeout = Duration.ofSeconds(30),
                heartbeatInterval = Duration.ofSeconds(10)
            )
        )
        
        server shouldNotBe null
        server.isRunning() shouldBe false
        server.getProtocolHandler().shouldBeInstanceOf<JsonRpcProtocolHandler>()
        server.getConnectionManager().shouldBeInstanceOf<WebSocketConnectionManager>()
        server.getToolRegistry().shouldBeInstanceOf<DefaultToolRegistry>()
        server.getResourceRegistry().shouldBeInstanceOf<ResourceProviderRegistry>()
    }

    "should start server and initialize all components in correct sequence" {
        val server = McpServer(McpServerConfig(port = 3001))
        
        // Starting should initialize components in proper order:
        // 1. Protocol handler setup
        // 2. Tool and resource registries initialization
        // 3. Connection manager with protocol handler wiring
        // 4. WebSocket server startup
        server.start()
        
        server.isRunning() shouldBe true
        server.getPort() shouldBe 3001
        
        // Connection manager should be wired with protocol handler
        val connectionManager = server.getConnectionManager()
        connectionManager.isRunning() shouldBe true
        
        server.stop()
    }

    "should stop server and cleanup all components gracefully" {
        val server = McpServer(McpServerConfig(port = 3010))
        server.start()
        server.isRunning() shouldBe true
        
        // Stopping should cleanup in reverse order:
        // 1. Close WebSocket connections
        // 2. Stop connection manager
        // 3. Clear registries
        // 4. Cleanup resources
        server.stop()
        
        server.isRunning() shouldBe false
        server.getConnectionManager().isRunning() shouldBe false
    }

    "should handle full MCP initialization flow with capability exchange" {
        val server = McpServer(McpServerConfig(port = 3002))
        server.start()
        
        // MCP initialization should support standard protocol flow:
        // 1. Client connects via WebSocket
        // 2. Client sends 'initialize' method with capabilities
        // 3. Server responds with its capabilities
        // 4. Client can then invoke tools and resources
        
        val initRequest = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "initialize")
            put("params", buildJsonObject {
                put("protocolVersion", "2024-11-05")
                put("capabilities", buildJsonObject {
                    put("roots", buildJsonObject {
                        put("listChanged", false)
                    })
                    put("sampling", buildJsonObject {})
                })
                put("clientInfo", buildJsonObject {
                    put("name", "test-client")
                    put("version", "1.0.0")
                })
            })
        }
        
        // This should route through: WebSocket -> JsonRpcProtocolHandler -> Initialize handler
        val response = server.handleRequest(initRequest.toString())
        
        response shouldNotBe null
        val responseJson = Json.parseToJsonElement(response!!) as JsonObject
        responseJson["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
        responseJson["id"]?.jsonPrimitive?.int shouldBe 1
        
        val result = responseJson["result"] as JsonObject
        result["protocolVersion"]?.jsonPrimitive?.content shouldBe "2024-11-05"
        result["capabilities"] shouldNotBe null
        result["serverInfo"] shouldNotBe null
        
        server.stop()
    }

    "should register and invoke tools through WebSocket JSON-RPC flow" {
        val server = McpServer(McpServerConfig(port = 3003))
        
        // Register a test tool before starting
        val testTool = Tool(
            name = "testtool",
            description = "A test tool for integration testing",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("message", buildJsonObject {
                        put("type", "string")
                        put("description", "Test message")
                    })
                })
                put("required", buildJsonArray { add("message") })
            }
        ) { params ->
            val message = (params as JsonObject)["message"]?.jsonPrimitive?.content ?: "default"
            Result.success(JsonPrimitive("Tool executed with: $message"))
        }
        
        server.registerTool(testTool)
        server.start()
        
        // Should handle tools/list request
        val listRequest = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "tools/list")
        }
        
        val listResponse = server.handleRequest(listRequest.toString())
        listResponse shouldNotBe null
        
        val listJson = Json.parseToJsonElement(listResponse!!) as JsonObject
        val result = listJson["result"] as JsonObject
        val tools = result["tools"] as JsonArray
        tools shouldHaveSize 1
        
        val toolInfo = tools[0] as JsonObject
        toolInfo["name"]?.jsonPrimitive?.content shouldBe "testtool"
        
        // Should handle tools/call request
        val callRequest = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 2)
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", "testtool")
                put("arguments", buildJsonObject {
                    put("message", "integration test")
                })
            })
        }
        
        val callResponse = server.handleRequest(callRequest.toString())
        callResponse shouldNotBe null
        
        val callJson = Json.parseToJsonElement(callResponse!!) as JsonObject
        val callResult = callJson["result"] as JsonObject
        val content = callResult["content"] as JsonArray
        val textContent = content[0] as JsonObject
        textContent["text"]!!.jsonPrimitive.content shouldContainString "Tool executed with: integration test"
        
        server.stop()
    }

    "should register and access resources through WebSocket JSON-RPC flow" {
        val server = McpServer(McpServerConfig(port = 3004))
        
        // Create and register a test resource provider
        val testResourceProvider = object : ResourceProvider {
            override val name: String = "test_provider"
            override val isRunning: Boolean = true
            
            override suspend fun start() {
                // No-op for test
            }
            
            override suspend fun stop() {
                // No-op for test
            }
            
            override suspend fun getResource(uri: String): io.spiralhouse.cycletime.mcp.resources.Resource {
                return io.spiralhouse.cycletime.mcp.resources.Resource(
                    uri = uri,
                    name = "Test Resource",
                    description = "A test resource",
                    mimeType = "text/plain"
                )
            }
            
            override suspend fun listResources(
                filter: io.spiralhouse.cycletime.mcp.resources.ResourceFilter?,
                pagination: io.spiralhouse.cycletime.mcp.resources.ResourcePagination?
            ): List<io.spiralhouse.cycletime.mcp.resources.Resource> {
                return listOf(
                    io.spiralhouse.cycletime.mcp.resources.Resource(
                        uri = "test://example",
                        name = "Example Resource",
                        description = "An example resource",
                        mimeType = "text/plain"
                    )
                )
            }
            
            override suspend fun searchResources(query: String): List<io.spiralhouse.cycletime.mcp.resources.Resource> {
                return emptyList()
            }
            
            override suspend fun updateResource(uri: String, content: io.spiralhouse.cycletime.mcp.resources.ResourceContent) {
                // No-op for test
            }
            
            override suspend fun readResource(uri: String): String {
                return "test content"
            }
        }
        
        server.registerResourceProvider(testResourceProvider)
        server.start()
        
        // Should handle resources/list request
        val listRequest = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "resources/list")
        }
        
        val listResponse = server.handleRequest(listRequest.toString())
        listResponse shouldNotBe null
        
        val listJson = Json.parseToJsonElement(listResponse!!) as JsonObject
        val result = listJson["result"] as JsonObject
        val resources = result["resources"] as JsonArray
        resources shouldHaveSize 1
        
        val resourceInfo = resources[0] as JsonObject
        resourceInfo["uri"]?.jsonPrimitive?.content shouldBe "test://example"
        resourceInfo["name"]?.jsonPrimitive?.content shouldBe "Example Resource"
        
        server.stop()
    }

    "should handle async tool invocation with timeout management" {
        val server = McpServer(McpServerConfig(port = 3005))
        
        // Register an async tool that takes time
        val asyncTool = AsyncTool(
            name = "slowtool",
            description = "A slow async tool",
            parametersSchema = buildJsonObject {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("delay", buildJsonObject {
                        put("type", "integer")
                        put("description", "Delay in milliseconds")
                    })
                })
                put("required", buildJsonArray { add("delay") })
            }
        ) { params ->
            val delayMs = (params as JsonObject)["delay"]?.jsonPrimitive?.int ?: 100
            delay(delayMs.toLong())
            Result.success(JsonPrimitive("Async operation completed after ${delayMs}ms"))
        }
        
        server.registerAsyncTool(asyncTool)
        server.start()
        
        // Should handle async tool invocation
        val callRequest = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", "slowtool")
                put("arguments", buildJsonObject {
                    put("delay", 50)
                })
            })
        }
        
        val callResponse = server.handleRequestAsync(callRequest.toString())
        callResponse shouldNotBe null
        
        val callJson = Json.parseToJsonElement(callResponse!!) as JsonObject
        val result = callJson["result"] as JsonObject
        val content = result["content"] as JsonArray
        val textContent = content[0] as JsonObject
        textContent["text"]!!.jsonPrimitive.content shouldContainString "completed after 50ms"
        
        server.stop()
    }

    "should handle component errors gracefully and return proper JSON-RPC errors" {
        val server = McpServer(McpServerConfig(port = 3006))
        
        // Register a tool that throws an error
        val errorTool = Tool(
            name = "errortool",
            description = "A tool that always fails",
            parametersSchema = buildJsonObject {
                put("type", "object")
            }
        ) { _ ->
            throw RuntimeException("Tool execution failed")
        }
        
        server.registerTool(errorTool)
        server.start()
        
        val callRequest = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", 1)
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", "errortool")
                put("arguments", buildJsonObject {})
            })
        }
        
        val response = server.handleRequest(callRequest.toString())
        response shouldNotBe null
        
        val responseJson = Json.parseToJsonElement(response!!) as JsonObject
        responseJson["error"] shouldNotBe null
        
        val error = responseJson["error"] as JsonObject
        error["code"]?.jsonPrimitive?.int shouldBe -32603 // Internal error
        error["message"]!!.jsonPrimitive.content shouldContainString "Tool execution failed"
        
        server.stop()
    }

    "should validate configuration and reject invalid settings" {
        // Should reject invalid port ranges
        shouldThrow<IllegalArgumentException> {
            McpServer(
                config = McpServerConfig(
                    port = -1, // Invalid port
                    enableSSL = false,
                    connectionTimeout = Duration.ofSeconds(30),
                    heartbeatInterval = Duration.ofSeconds(10)
                )
            )
        }
        
        // Should reject invalid timeout values
        shouldThrow<IllegalArgumentException> {
            McpServer(
                config = McpServerConfig(
                    port = 8080,
                    enableSSL = false,
                    connectionTimeout = Duration.ofMillis(-1), // Invalid timeout
                    heartbeatInterval = Duration.ofSeconds(10)
                )
            )
        }
    }

    "should support notifications without response generation" {
        val server = McpServer(McpServerConfig(port = 3007))
        server.start()
        
        // Notification requests (no id field) should not generate responses
        val notificationRequest = buildJsonObject {
            put("jsonrpc", "2.0")
            put("method", "notifications/message")
            put("params", buildJsonObject {
                put("level", "info")
                put("message", "Test notification")
            })
            // No id field = notification
        }
        
        val response = server.handleRequest(notificationRequest.toString())
        response shouldBe null // Notifications should not generate responses
        
        server.stop()
    }

    "should handle batch requests with mixed success and error responses" {
        val server = McpServer(McpServerConfig(port = 3008))
        
        // Register tools for testing
        val successTool = Tool(
            name = "successtool",
            description = "Always succeeds",
            parametersSchema = buildJsonObject { put("type", "object") }
        ) { _ -> Result.success(JsonPrimitive("success")) }
        
        val errorTool = Tool(
            name = "errortool", 
            description = "Always fails",
            parametersSchema = buildJsonObject { put("type", "object") }
        ) { _ -> throw RuntimeException("Tool failed") }
        
        server.registerTool(successTool)
        server.registerTool(errorTool)
        server.start()
        
        // Send batch request
        val batchRequest = buildJsonArray {
            add(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 1)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "successtool")
                    put("arguments", buildJsonObject {})
                })
            })
            add(buildJsonObject {
                put("jsonrpc", "2.0")
                put("id", 2)
                put("method", "tools/call")
                put("params", buildJsonObject {
                    put("name", "errortool")
                    put("arguments", buildJsonObject {})
                })
            })
        }
        
        val response = server.handleBatchRequest(batchRequest.toString())
        response shouldNotBe null
        
        val responses = Json.parseToJsonElement(response!!) as JsonArray
        responses shouldHaveSize 2
        
        // First response should be successful
        val firstResponse = responses[0] as JsonObject
        firstResponse["result"] shouldNotBe null
        firstResponse["error"] shouldBe null
        
        // Second response should be an error
        val secondResponse = responses[1] as JsonObject
        secondResponse["result"] shouldBe null
        secondResponse["error"] shouldNotBe null
        
        server.stop()
    }

    "should maintain component isolation during partial failures" {
        val server = McpServer(McpServerConfig(port = 3009))
        server.start()
        
        // Even if one component experiences errors, others should continue working
        
        // Test tool registry continues to work after resource error
        val workingTool = Tool(
            name = "workingtool",
            description = "Still works",
            parametersSchema = buildJsonObject { put("type", "object") }
        ) { _ -> Result.success(JsonPrimitive("still working")) }
        
        server.registerTool(workingTool)
        
        // Tool should still be accessible even if resource operations fail
        val toolListRequest = buildJsonObject {
            put("jsonrpc", "2.0") 
            put("id", 1)
            put("method", "tools/list")
        }
        
        val toolListResponse = server.handleRequest(toolListRequest.toString())
        toolListResponse shouldNotBe null
        
        val toolListJson = Json.parseToJsonElement(toolListResponse!!) as JsonObject
        val result = toolListJson["result"] as JsonObject
        val tools = result["tools"] as JsonArray
        tools shouldHaveSize 1
        
        server.stop()
    }
})

