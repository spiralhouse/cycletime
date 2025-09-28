package io.spiralhouse.cycletime.mcp.integration.fixtures

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.websocket.*
import io.ktor.http.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.serialization.json.*
import java.util.concurrent.atomic.AtomicInteger
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * Mock WebSocket client that simulates Claude's MCP behavior for integration testing.
 * 
 * This client provides:
 * - WebSocket connection management with proper lifecycle
 * - MCP protocol message sending/receiving with JSON-RPC 2.0 compliance
 * - Configurable timing and error simulation for testing edge cases
 * - Connection state tracking and cleanup
 * - Support for all standard MCP methods (initialize, tools/list, tools/call, resources/read)
 * 
 * DESIGN FOR FAILURE: This client is designed to expose missing integration pieces
 * during the RED phase by attempting realistic MCP interactions.
 */
class MockClaudeClient(
    private val serverHost: String = "localhost",
    private val serverPort: Int = 3006,
    private val serverPath: String = "/mcp",
    private val connectionTimeout: Duration = 5.seconds,
    private val requestTimeout: Duration = 10.seconds
) {
    
    private var httpClient: HttpClient? = null
    private var webSocketSession: DefaultWebSocketSession? = null
    private val requestIdGenerator = AtomicInteger(1)
    private val json = Json { 
        ignoreUnknownKeys = true
        prettyPrint = true
    }
    
    enum class ConnectionState {
        DISCONNECTED, CONNECTING, CONNECTED, INITIALIZING, INITIALIZED, FAILED, CLOSED
    }
    
    @Volatile
    private var state: ConnectionState = ConnectionState.DISCONNECTED
    private var initializationResponse: JsonElement? = null
    
    /**
     * Establishes WebSocket connection to MCP server.
     * Will fail if MCP server is not properly integrated into application startup.
     */
    suspend fun connect(): MockClaudeClient = withTimeout(connectionTimeout) {
        require(state == ConnectionState.DISCONNECTED) { 
            "Client already connected or connecting. Current state: $state" 
        }
        
        state = ConnectionState.CONNECTING
        
        try {
            httpClient = HttpClient(CIO) {
                install(WebSockets) {
                    pingInterval = 30.seconds
                    maxFrameSize = Long.MAX_VALUE
                }
            }
            
            // This will fail if MCP server is not running on expected port
            webSocketSession = httpClient!!.webSocketSession(
                method = HttpMethod.Get,
                host = serverHost,
                port = serverPort,
                path = serverPath
            )
            
            state = ConnectionState.CONNECTED
            this@MockClaudeClient
        } catch (e: Exception) {
            state = ConnectionState.FAILED
            httpClient?.close()
            throw MockClaudeClientException("Failed to connect to MCP server at $serverHost:$serverPort$serverPath", e)
        }
    }
    
    /**
     * Establishes WebSocket connection using the test application's HTTP client.
     * This is used for integration tests within testApplication blocks.
     */
    suspend fun connectToTestApplication(testHttpClient: HttpClient): MockClaudeClient = withTimeout(connectionTimeout) {
        require(state == ConnectionState.DISCONNECTED) { 
            "Client already connected or connecting. Current state: $state" 
        }
        
        state = ConnectionState.CONNECTING
        
        try {
            // Use the test application's HTTP client instead of creating our own
            httpClient = testHttpClient
            
            // Connect to the WebSocket endpoint on the test server
            webSocketSession = testHttpClient.webSocketSession(
                method = HttpMethod.Get,
                path = serverPath
            )
            
            state = ConnectionState.CONNECTED
            this@MockClaudeClient
        } catch (e: Exception) {
            state = ConnectionState.FAILED
            throw MockClaudeClientException("Failed to connect to test MCP server at $serverPath", e)
        }
    }
    
    /**
     * Sends MCP initialize request and processes response.
     * Will fail if protocol handler is not properly implemented.
     */
    suspend fun initialize(
        protocolVersion: String = "2024-11-05",
        clientName: String = "MockClaudeClient-Test",
        clientVersion: String = "1.0.0"
    ): JsonElement = withTimeout(requestTimeout) {
        require(state == ConnectionState.CONNECTED) { 
            "Must be connected before initializing. Current state: $state" 
        }
        
        state = ConnectionState.INITIALIZING
        
        val request = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "init-${generateRequestId()}")
            put("method", "initialize")
            put("params", buildJsonObject {
                put("protocolVersion", protocolVersion)
                put("capabilities", buildJsonObject {
                    put("resources", buildJsonObject {
                        put("subscribe", true)
                        put("listChanged", true)
                    })
                    put("tools", buildJsonObject { })
                    put("logging", buildJsonObject { })
                    put("prompts", buildJsonObject {
                        put("listChanged", true)
                    })
                })
                put("clientInfo", buildJsonObject {
                    put("name", clientName)
                    put("version", clientVersion)
                })
            })
        }
        
        val response = sendRequest(request)
        
        // Validate initialize response structure
        validateInitializeResponse(response)
        
        initializationResponse = response
        state = ConnectionState.INITIALIZED
        response
    }
    
    /**
     * Lists available tools from MCP server.
     * Will fail if tool registry is not properly integrated.
     */
    suspend fun listTools(): JsonElement = withTimeout(requestTimeout) {
        require(state == ConnectionState.INITIALIZED) { 
            "Must initialize before listing tools. Current state: $state" 
        }
        
        val request = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "tools-list-${generateRequestId()}")
            put("method", "tools/list")
        }
        
        val response = sendRequest(request)
        validateToolsListResponse(response)
        response
    }
    
    /**
     * Calls a specific tool with parameters.
     * Will fail if tool execution pipeline is not properly implemented.
     */
    suspend fun callTool(
        toolName: String, 
        parameters: JsonObject = buildJsonObject {}
    ): JsonElement = withTimeout(requestTimeout) {
        require(state == ConnectionState.INITIALIZED) { 
            "Must initialize before calling tools. Current state: $state" 
        }
        
        val request = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "tool-call-${generateRequestId()}")
            put("method", "tools/call")
            put("params", buildJsonObject {
                put("name", toolName)
                put("arguments", parameters)
            })
        }
        
        val response = sendRequest(request)
        validateToolCallResponse(response, toolName)
        response
    }
    
    /**
     * Lists available resources from MCP server.
     * Will fail if resource registry is not properly integrated.
     */
    suspend fun listResources(): JsonElement = withTimeout(requestTimeout) {
        require(state == ConnectionState.INITIALIZED) { 
            "Must initialize before listing resources. Current state: $state" 
        }
        
        val request = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "resources-list-${generateRequestId()}")
            put("method", "resources/list")
        }
        
        val response = sendRequest(request)
        validateResourcesListResponse(response)
        response
    }
    
    /**
     * Reads content from a specific resource.
     * Will fail if resource content providers are not properly implemented.
     */
    suspend fun readResource(uri: String): JsonElement = withTimeout(requestTimeout) {
        require(state == ConnectionState.INITIALIZED) { 
            "Must initialize before reading resources. Current state: $state" 
        }
        
        val request = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "resource-read-${generateRequestId()}")
            put("method", "resources/read")
            put("params", buildJsonObject {
                put("uri", uri)
            })
        }
        
        val response = sendRequest(request)
        validateResourceReadResponse(response, uri)
        response
    }
    
    /**
     * Sends a ping frame and waits for pong response.
     * Will fail if WebSocket heartbeat mechanism is not implemented.
     */
    suspend fun ping(data: ByteArray = byteArrayOf(1, 2, 3, 4)): ByteArray = withTimeout(requestTimeout) {
        val session = webSocketSession ?: throw MockClaudeClientException("Not connected")
        
        try {
            session.send(Frame.Ping(data))
            
            // Wait for pong response
            while (true) {
                when (val frame = session.incoming.receive()) {
                    is Frame.Pong -> {
                        // Return actual pong data from server for proper testing
                        return@withTimeout frame.data
                    }
                    is Frame.Text -> {
                        // Ignore other messages during ping/pong
                        continue
                    }
                    is Frame.Binary -> {
                        // Ignore binary frames during ping/pong
                        continue
                    }
                    is Frame.Close -> {
                        throw MockClaudeClientException("Connection closed during ping/pong")
                    }
                    else -> continue
                }
            }
        } catch (e: ClosedReceiveChannelException) {
            throw MockClaudeClientException("Connection closed during ping/pong", e)
        } catch (e: Exception) {
            throw MockClaudeClientException("Error during ping/pong: ${e.message}", e)
        }
        
        @Suppress("UNREACHABLE_CODE")
        data
    }
    
    /**
     * Sends malformed JSON to test error handling.
     * Should receive proper JSON-RPC error response.
     */
    suspend fun sendMalformedJson(malformedJson: String): JsonElement = withTimeout(requestTimeout) {
        val session = webSocketSession ?: throw MockClaudeClientException("Not connected")
        
        session.send(Frame.Text(malformedJson))
        
        val response = session.incoming.receive() as Frame.Text
        val responseJson = json.parseToJsonElement(response.readText())
        
        // Should be valid JSON-RPC error response
        validateErrorResponse(responseJson, -32700) // Parse error
        responseJson
    }
    
    /**
     * Sends unknown method request to test error handling.
     * Should receive proper method not found error.
     */
    suspend fun sendUnknownMethod(methodName: String): JsonElement = withTimeout(requestTimeout) {
        val request = buildJsonObject {
            put("jsonrpc", "2.0")
            put("id", "unknown-${generateRequestId()}")
            put("method", methodName)
        }
        
        val response = sendRequest(request)
        validateErrorResponse(response, -32601) // Method not found
        response
    }
    
    /**
     * Gracefully closes the WebSocket connection.
     */
    suspend fun disconnect() {
        try {
            webSocketSession?.close(CloseReason(CloseReason.Codes.NORMAL, "Client disconnecting"))
            httpClient?.close()
        } catch (e: Exception) {
            // Ignore errors during cleanup
        } finally {
            webSocketSession = null
            httpClient = null
            state = ConnectionState.CLOSED
        }
    }
    
    /**
     * Gets current connection state for testing.
     */
    fun getConnectionState(): ConnectionState = state
    
    /**
     * Gets the initialization response for validation.
     */
    fun getInitializationResponse(): JsonElement? = initializationResponse
    
    // Private helper methods
    
    private suspend fun sendRequest(request: JsonObject): JsonElement {
        val session = webSocketSession ?: throw MockClaudeClientException("Not connected")
        
        val requestText = json.encodeToString(JsonObject.serializer(), request)
        session.send(Frame.Text(requestText))
        
        // Wait for response
        val responseFrame = session.incoming.receive() as? Frame.Text
            ?: throw MockClaudeClientException("Expected text frame response")
        
        val responseText = responseFrame.readText()
        val response = json.parseToJsonElement(responseText)
        
        // Note: Enhanced JSON response format is now properly handled by test utilities
        return response
    }
    
    private fun generateRequestId(): Int = requestIdGenerator.getAndIncrement()
    
    private fun validateInitializeResponse(response: JsonElement) {
        val obj = response.jsonObject
        require(obj["jsonrpc"]?.jsonPrimitive?.content == "2.0") { 
            "Invalid JSON-RPC version in initialize response" 
        }
        require(obj["result"] != null) { 
            "Initialize response missing result field" 
        }
        
        val result = obj["result"]?.jsonObject ?: throw IllegalStateException("Result not an object")
        require(result["protocolVersion"] != null) { 
            "Initialize response missing protocolVersion" 
        }
        require(result["capabilities"] != null) { 
            "Initialize response missing capabilities" 
        }
        require(result["serverInfo"] != null) { 
            "Initialize response missing serverInfo" 
        }
    }
    
    private fun validateToolsListResponse(response: JsonElement) {
        val obj = response.jsonObject
        require(obj["result"] != null) { "Tools list response missing result" }
        
        val result = obj["result"]?.jsonObject ?: throw IllegalStateException("Result not an object")
        require(result["tools"] != null) { "Tools list response missing tools array" }
    }
    
    private fun validateToolCallResponse(response: JsonElement, toolName: String) {
        val obj = response.jsonObject
        
        // Could be success or error - both are valid for testing
        if (obj["result"] != null) {
            val result = obj["result"]?.jsonObject ?: throw IllegalStateException("Result not an object")
            require(result["content"] != null) { "Tool call response missing content" }
        } else if (obj["error"] != null) {
            validateErrorResponse(response, null) // Any error code is acceptable
        } else {
            throw IllegalStateException("Tool call response missing result or error")
        }
    }
    
    private fun validateResourcesListResponse(response: JsonElement) {
        val obj = response.jsonObject
        require(obj["result"] != null) { "Resources list response missing result" }
        
        val result = obj["result"]?.jsonObject ?: throw IllegalStateException("Result not an object")
        require(result["resources"] != null) { "Resources list response missing resources array" }
    }
    
    private fun validateResourceReadResponse(response: JsonElement, uri: String) {
        val obj = response.jsonObject
        
        if (obj["result"] != null) {
            val result = obj["result"]?.jsonObject ?: throw IllegalStateException("Result not an object")
            require(result["contents"] != null) { "Resource read response missing contents" }
        } else if (obj["error"] != null) {
            validateErrorResponse(response, null) // Any error code acceptable (e.g., 404)
        } else {
            throw IllegalStateException("Resource read response missing result or error")
        }
    }
    
    private fun validateErrorResponse(response: JsonElement, expectedCode: Int?) {
        val obj = response.jsonObject
        require(obj["jsonrpc"]?.jsonPrimitive?.content == "2.0") { 
            "Invalid JSON-RPC version in error response" 
        }
        require(obj["error"] != null) { "Error response missing error field" }
        
        val error = obj["error"]?.jsonObject ?: throw IllegalStateException("Error not an object")
        require(error["code"] != null) { "Error response missing code" }
        require(error["message"] != null) { "Error response missing message" }
        
        if (expectedCode != null) {
            val actualCode = error["code"]?.jsonPrimitive?.int
            require(actualCode == expectedCode) { 
                "Expected error code $expectedCode but got $actualCode" 
            }
        }
    }
}

/**
 * Exception thrown by MockClaudeClient when operations fail.
 */
class MockClaudeClientException(message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Connection configuration for MockClaudeClient testing scenarios.
 */
data class MockClaudeClientConfig(
    val host: String = "localhost",
    val port: Int = 3006,
    val path: String = "/mcp",
    val connectionTimeout: Duration = 5.seconds,
    val requestTimeout: Duration = 10.seconds,
    val enableHeartbeat: Boolean = true,
    val heartbeatInterval: Duration = 30.seconds
)

/**
 * Builder for creating pre-configured MockClaudeClient instances for different test scenarios.
 */
object MockClaudeClients {
    
    /**
     * Standard client for normal integration tests.
     */
    fun standard(): MockClaudeClient = MockClaudeClient()
    
    /**
     * Client with short timeouts for failure scenario testing.
     */
    fun fastTimeout(): MockClaudeClient = MockClaudeClient(
        connectionTimeout = 1.seconds,
        requestTimeout = 2.seconds
    )
    
    /**
     * Client configured for performance testing.
     */
    fun performance(): MockClaudeClient = MockClaudeClient(
        connectionTimeout = 100.milliseconds,
        requestTimeout = 200.milliseconds
    )
    
    /**
     * Client that attempts connection to wrong port for error testing.
     */
    fun wrongPort(): MockClaudeClient = MockClaudeClient(
        serverPort = 9999 // Non-existent port
    )
}