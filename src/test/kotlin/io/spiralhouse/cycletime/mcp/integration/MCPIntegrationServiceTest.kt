package io.spiralhouse.cycletime.mcp.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.assertions.timing.eventually
import io.kotest.common.ExperimentalKotest
import kotlinx.coroutines.runBlocking
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcRequest
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcResponse
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcError
import io.spiralhouse.cycletime.mcp.protocol.ProtocolHandler
import kotlinx.serialization.json.JsonElement
import kotlinx.coroutines.delay
import kotlin.time.Duration.Companion.seconds
import kotlin.time.Duration.Companion.milliseconds

/**
 * Comprehensive test suite for MCPIntegrationService lifecycle management.
 * 
 * EXPECTATION: ALL TESTS SHOULD FAIL INITIALLY (RED Phase)
 * These tests define the expected behavior for integrating MCP WebSocket server
 * into the application startup flow.
 */
@OptIn(ExperimentalKotest::class)
class MCPIntegrationServiceTest : StringSpec({

    lateinit var mockMethodHandler: McpMethodHandler
    lateinit var mockProtocolHandler: ProtocolHandler

    beforeEach {
        // These will need to be implemented for the tests to pass
        mockMethodHandler = MockMcpMethodHandler()
        mockProtocolHandler = MockJsonRpcProtocolHandler()
    }
    
    afterEach {
        // Clean up any running services to prevent port conflicts
        runBlocking {
            // Stop any services that might be running
            delay(100) // Small delay to ensure proper cleanup
        }
    }

    "should initialize with default configuration from environment variables" {
        // Test default MCP_PORT = 3006
        val config = MCPServerConfig()
        config.port shouldBe 3006
        config.host shouldBe "0.0.0.0"
        config.enabled shouldBe true
        config.enableSsl shouldBe false
        config.path shouldBe "/mcp"
        
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        service.isRunning() shouldBe false
    }

    "should respect MCP_PORT environment variable override".config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        // Note: MCPServerConfig reads env vars at construction time
        // We need to test that the env var is actually used
        withEnvironment("MCP_PORT" to "4000") {
            val config = MCPServerConfig()
            config.port shouldBe 4000
        }
    }

    "should respect MCP_ENABLED environment variable override".config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        withEnvironment("MCP_ENABLED" to "false") {
            val config = MCPServerConfig()
            config.enabled shouldBe false
        }
    }

    "should start MCP WebSocket server successfully" {
        // Use a unique port for this test
        val testPort = 5000 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort)
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        try {
            service.start()
            
            service.isRunning() shouldBe true
            val status = service.getStatus()
            status.isRunning shouldBe true
            status.port shouldBe testPort
            status.host shouldBe "0.0.0.0"
            status.activeConnections shouldBe 0
        } finally {
            service.stop()
        }
    }

    "should stop MCP WebSocket server gracefully" {
        // Use a unique port for this test
        val testPort = 5500 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort)
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        service.start()
        service.isRunning() shouldBe true
        
        service.stop()
        
        service.isRunning() shouldBe false
        val status = service.getStatus()
        status.isRunning shouldBe false
        status.activeConnections shouldBe 0
    }

    "should be idempotent for multiple start calls" {
        // Use a unique port for this test
        val testPort = 6000 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort)
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        try {
            // First start should succeed
            service.start()
            service.isRunning() shouldBe true
            
            // Second start should be ignored (not throw exception)
            service.start() // Should log warning but not fail
            service.isRunning() shouldBe true
        } finally {
            service.stop()
        }
    }

    "should be idempotent for multiple stop calls" {
        // Use a unique port for this test
        val testPort = 6500 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort)
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        service.start()
        service.stop()
        service.isRunning() shouldBe false
        
        // Second stop should be ignored (not throw exception)
        service.stop() // Should log debug message but not fail
        service.isRunning() shouldBe false
    }

    "should handle port conflicts gracefully".config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        // Use a unique port for this test to avoid conflicts with other tests
        val testPort = 4500 + (System.currentTimeMillis() % 1000).toInt()
        val config1 = MCPServerConfig(port = testPort)
        val config2 = MCPServerConfig(port = testPort)
        
        val service1 = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config1)
        val service2 = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config2)
        
        try {
            service1.start()
            service1.isRunning() shouldBe true
            
            // Second service on same port should fail with meaningful error
            val exception = shouldThrow<MCPIntegrationException> {
                service2.start()
            }
            exception.message shouldBe "Failed to start MCP server"
            exception.cause?.message?.toLowerCase()?.contains("address") shouldBe true
            
            service2.isRunning() shouldBe false
        } finally {
            // Clean up
            service1.stop()
            service2.stop()
        }
    }

    "should handle SSL configuration correctly" {
        // Use a unique port for this test
        val testPort = 7000 + (System.currentTimeMillis() % 1000).toInt()
        val sslConfig = MCPServerConfig(port = testPort, enableSsl = true)
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, sslConfig)
        
        try {
            service.start() // Will fail - SSL WebSocket implementation not ready
            
            val status = service.getStatus()
            status.enableSsl shouldBe true
        } finally {
            service.stop()
        }
    }

    "should provide accurate server status information" {
        // Use a unique port for this test
        val testPort = 7500 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort, host = "127.0.0.1")
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        try {
            // Status before starting
            val initialStatus = service.getStatus()
            initialStatus.isRunning shouldBe false
            initialStatus.port shouldBe testPort
            initialStatus.host shouldBe "127.0.0.1"
            initialStatus.activeConnections shouldBe 0
            
            service.start()
            
            // Status after starting
            val runningStatus = service.getStatus()
            runningStatus.isRunning shouldBe true
            runningStatus.port shouldBe testPort
            runningStatus.host shouldBe "127.0.0.1"
            // activeConnections will fail because WebSocketConnectionManager.getActiveConnectionCount() doesn't exist
            runningStatus.activeConnections shouldBe 0
            
            service.stop()
            
            // Status after stopping
            val stoppedStatus = service.getStatus()
            stoppedStatus.isRunning shouldBe false
            stoppedStatus.activeConnections shouldBe 0
        } finally {
            // Ensure cleanup
            runBlocking { service.stop() }
        }
    }

    "should handle WebSocket connection manager errors during startup".config(enabled = false) { // SPI-584: Handle MCP Integration Configuration Edge Cases
        // Use a unique port for this test
        val testPort = 8000 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort)
        val faultyHandler = FaultyMockMethodHandler() // Throws exceptions
        val service = MCPIntegrationService(faultyHandler, mockProtocolHandler, config)
        
        val exception = shouldThrow<MCPIntegrationException> {
            service.start()
        }
        exception.message shouldBe "Failed to start MCP server"
        exception.cause shouldNotBe null
        
        service.isRunning() shouldBe false
    }

    "should handle graceful shutdown timeout" {
        // Use a unique port for this test
        val testPort = 8500 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort)
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        try {
            service.start()
            
            // Test that shutdown completes within reasonable time
            eventually(5.seconds) {
                service.stop()
                service.isRunning() shouldBe false
            }
        } finally {
            runBlocking { service.stop() }
        }
    }

    "should support custom ping period and timeout configuration" {
        // Use a unique port for this test
        val testPort = 9000 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(
            port = testPort,
            pingPeriod = 15000L, // 15 seconds
            timeout = 30000L // 30 seconds
        )
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        try {
            service.start() // Will fail - WebSocketServerConfig doesn't handle these yet
            
            // Configuration should be passed to WebSocketConnectionManager
            val status = service.getStatus()
            status.isRunning shouldBe true
        } finally {
            service.stop()
        }
    }

    "should handle maximum frame size configuration" {
        // Use a unique port for this test
        val testPort = 9500 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort, maxFrameSize = 2048L)
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        try {
            service.start() // Will fail - maxFrameSize configuration not implemented
            service.isRunning() shouldBe true
        } finally {
            service.stop()
        }
    }

    "should support WebSocket masking configuration" {
        // Use a unique port for this test
        val testPort = 10000 + (System.currentTimeMillis() % 1000).toInt()
        val config = MCPServerConfig(port = testPort, masking = true)
        val service = MCPIntegrationService(mockMethodHandler, mockProtocolHandler, config)
        
        try {
            service.start() // Will fail - masking configuration not implemented
            service.isRunning() shouldBe true
        } finally {
            service.stop()
        }
    }
})

// Mock implementations that will be needed for tests to pass
class MockMcpMethodHandler : McpMethodHandler {
    override suspend fun handleRequest(request: JsonRpcRequest): JsonRpcResponse {
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = kotlinx.serialization.json.buildJsonObject { 
                put("result", kotlinx.serialization.json.JsonPrimitive("mock")) 
            },
            id = request.id ?: kotlinx.serialization.json.JsonPrimitive("test")
        )
    }
    
    override suspend fun handleRequestAsync(request: JsonRpcRequest): JsonRpcResponse {
        return handleRequest(request)
    }
    
    override suspend fun handleNotification(request: JsonRpcRequest) {
        // No response for notifications
    }
}

class MockJsonRpcProtocolHandler : ProtocolHandler {
    override fun parseRequest(json: String?): JsonRpcRequest {
        return JsonRpcRequest(
            jsonrpc = "2.0",
            method = "test",
            params = null,
            id = kotlinx.serialization.json.JsonPrimitive("test")
        )
    }
    
    override fun parseBatchRequest(json: String): List<JsonRpcRequest> {
        return listOf(parseRequest(json))
    }
    
    override fun serializeResponse(response: JsonRpcResponse): String {
        return """{"jsonrpc":"2.0","result":{"result":"mock"},"id":"test"}"""
    }
    
    override fun serializeBatchResponse(responses: List<JsonRpcResponse>): String {
        return """[${responses.joinToString(",") { serializeResponse(it) }}]"""
    }
    
    override fun createBatchResponse(responses: List<JsonRpcResponse>): String {
        return serializeBatchResponse(responses)
    }
    
    override fun createResponse(id: Any?, result: Any?): JsonRpcResponse {
        val jsonId = when (id) {
            is JsonElement -> id
            is String -> kotlinx.serialization.json.JsonPrimitive(id)
            else -> kotlinx.serialization.json.JsonPrimitive("test")
        }
        val jsonResult = when (result) {
            is JsonElement -> result
            else -> kotlinx.serialization.json.JsonPrimitive(result.toString())
        }
        return JsonRpcResponse(
            jsonrpc = "2.0",
            result = jsonResult,
            id = jsonId
        )
    }
    
    override fun createErrorResponse(id: Any?, code: Int, message: String, data: Any?): JsonRpcResponse {
        val jsonId = when (id) {
            is JsonElement -> id
            is String -> kotlinx.serialization.json.JsonPrimitive(id)
            else -> kotlinx.serialization.json.JsonPrimitive("test")
        }
        val jsonData = when (data) {
            is JsonElement -> data
            else -> null
        }
        return JsonRpcResponse(
            jsonrpc = "2.0",
            error = JsonRpcError(code, message, jsonData),
            id = jsonId
        )
    }
    
    override fun isNotification(request: JsonRpcRequest): Boolean {
        return request.id == null
    }
    
    override fun handleNotification(request: JsonRpcRequest): JsonRpcResponse? {
        return null // Notifications don't return responses
    }
}

class FaultyMockMethodHandler : McpMethodHandler {
    override suspend fun handleRequest(request: JsonRpcRequest): JsonRpcResponse {
        throw RuntimeException("Simulated handler failure")
    }
    
    override suspend fun handleRequestAsync(request: JsonRpcRequest): JsonRpcResponse {
        throw RuntimeException("Simulated handler failure")
    }
    
    override suspend fun handleNotification(request: JsonRpcRequest) {
        // No response for notifications
    }
}

/**
 * Test utility for environment variable mocking.
 * Uses reflection to temporarily override environment variables for testing.
 */
@Suppress("UNCHECKED_CAST")
fun <T> withEnvironment(vararg pairs: Pair<String, String>, block: () -> T): T {
    // Always use reflection since System.getenv() returns an unmodifiable map
    val envClass = try {
        Class.forName("java.lang.ProcessEnvironment")
    } catch (e: ClassNotFoundException) {
        // Fallback for different JVM implementations
        System.err.println("Warning: Cannot mock environment variables on this JVM")
        return block()
    }
    
    val theEnvironmentField = try {
        envClass.getDeclaredField("theEnvironment").apply { isAccessible = true }
    } catch (e: NoSuchFieldException) {
        System.err.println("Warning: Cannot find environment field")
        return block()
    }
    
    val theCaseInsensitiveEnvironmentField = try {
        envClass.getDeclaredField("theCaseInsensitiveEnvironment").apply { isAccessible = true }
    } catch (e: NoSuchFieldException) {
        null // Windows might not have this field
    }
    
    val envMap = theEnvironmentField.get(null) as? MutableMap<String, String> ?: return block()
    val ciEnvMap = theCaseInsensitiveEnvironmentField?.get(null) as? MutableMap<String, String>
    
    val backup = pairs.map { it.first to envMap[it.first] }
    
    return try {
        pairs.forEach { (key, value) ->
            envMap[key] = value
            ciEnvMap?.put(key, value)
        }
        block()
    } finally {
        backup.forEach { (key, originalValue) ->
            if (originalValue == null) {
                envMap.remove(key)
                ciEnvMap?.remove(key)
            } else {
                envMap[key] = originalValue
                ciEnvMap?.put(key, originalValue)
            }
        }
    }
}