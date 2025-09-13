package io.spiralhouse.cycletime.integration.mcp

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.websocket.*
import io.ktor.http.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import kotlinx.serialization.json.*
import java.util.concurrent.atomic.AtomicInteger
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

/**
 * Enhanced WebSocket test client specifically for MCP protocol integration testing.
 * 
 * This client extends the existing MockClaudeClient with additional capabilities:
 * - Raw WebSocket frame inspection for protocol compliance testing
 * - Message interception and validation for integration testing  
 * - Concurrent connection management for load testing
 * - Fine-grained timing control for performance testing
 * - Error simulation for resilience testing
 * 
 * Unlike MockClaudeClient which focuses on high-level MCP operations,
 * this client provides low-level WebSocket access for infrastructure testing.
 */
class WebSocketTestClient(
    private val serverHost: String = "localhost",
    private val serverPort: Int = 8080,
    private val serverPath: String = "/mcp",
    private val connectionTimeout: Duration = 5.seconds,
    private val requestTimeout: Duration = 10.seconds
) {
    
    private var httpClient: HttpClient? = null
    private var webSocketSession: DefaultWebSocketSession? = null
    private val requestIdGenerator = AtomicInteger(1)
    private val messageChannel = Channel<Frame>(Channel.UNLIMITED)
    private var messageListenerJob: Job? = null
    
    private val json = Json { 
        ignoreUnknownKeys = true
        prettyPrint = true
    }
    
    enum class FrameType {
        TEXT, BINARY, PING, PONG, CLOSE
    }
    
    data class ReceivedFrame(
        val type: FrameType,
        val content: String?,
        val data: ByteArray?,
        val timestamp: Long = System.currentTimeMillis()
    )
    
    @Volatile
    private var connected = false
    private val receivedFrames = mutableListOf<ReceivedFrame>()
    
    /**
     * Establishes WebSocket connection with frame monitoring.
     */
    suspend fun connect(): WebSocketTestClient = withTimeout(connectionTimeout) {
        require(!connected) { "Already connected" }
        
        httpClient = HttpClient(CIO) {
            install(WebSockets) {
                pingInterval = 30.seconds
                maxFrameSize = Long.MAX_VALUE
            }
        }
        
        webSocketSession = httpClient!!.webSocketSession(
            method = HttpMethod.Get,
            host = serverHost,
            port = serverPort,
            path = serverPath
        )
        
        startFrameMonitoring()
        connected = true
        this@WebSocketTestClient
    }
    
    /**
     * Connects using provided test application HTTP client.
     */
    suspend fun connectToTestApplication(testClient: HttpClient): WebSocketTestClient = withTimeout(connectionTimeout) {
        require(!connected) { "Already connected" }
        
        httpClient = testClient
        webSocketSession = testClient.webSocketSession(
            method = HttpMethod.Get,
            path = serverPath
        )
        
        startFrameMonitoring()
        connected = true
        this@WebSocketTestClient
    }
    
    /**
     * Starts background frame monitoring for analysis.
     */
    private fun startFrameMonitoring() {
        val session = webSocketSession ?: return
        
        messageListenerJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                for (frame in session.incoming) {
                    val receivedFrame = when (frame) {
                        is Frame.Text -> ReceivedFrame(FrameType.TEXT, frame.readText(), null)
                        is Frame.Binary -> ReceivedFrame(FrameType.BINARY, null, frame.data)
                        is Frame.Ping -> ReceivedFrame(FrameType.PING, null, frame.data)
                        is Frame.Pong -> ReceivedFrame(FrameType.PONG, null, frame.data)
                        is Frame.Close -> ReceivedFrame(FrameType.CLOSE, frame.readReason()?.message, null)
                    }
                    
                    synchronized(receivedFrames) {
                        receivedFrames.add(receivedFrame)
                    }
                    
                    messageChannel.send(frame)
                }
            } catch (e: Exception) {
                // Frame monitoring stopped due to connection close or error
            }
        }
    }
    
    /**
     * Sends raw JSON-RPC message and returns response.
     */
    suspend fun sendJsonRpcMessage(message: JsonObject): JsonElement = withTimeout(requestTimeout) {
        val session = webSocketSession ?: throw IllegalStateException("Not connected")
        
        val messageText = json.encodeToString(JsonObject.serializer(), message)
        session.send(Frame.Text(messageText))
        
        // Wait for text response
        val responseFrame = messageChannel.receive() as? Frame.Text
            ?: throw IllegalStateException("Expected text frame response")
        
        json.parseToJsonElement(responseFrame.readText())
    }
    
    /**
     * Sends raw text message without JSON parsing.
     */
    suspend fun sendRawText(text: String): String = withTimeout(requestTimeout) {
        val session = webSocketSession ?: throw IllegalStateException("Not connected")
        
        session.send(Frame.Text(text))
        
        val responseFrame = messageChannel.receive() as? Frame.Text
            ?: throw IllegalStateException("Expected text frame response")
        
        responseFrame.readText()
    }
    
    /**
     * Sends binary frame for protocol testing.
     */
    suspend fun sendBinaryFrame(data: ByteArray): ByteArray = withTimeout(requestTimeout) {
        val session = webSocketSession ?: throw IllegalStateException("Not connected")
        
        session.send(Frame.Binary(true, data))
        
        val responseFrame = messageChannel.receive() as? Frame.Binary
            ?: throw IllegalStateException("Expected binary frame response")
        
        responseFrame.data
    }
    
    /**
     * Sends ping frame and waits for pong.
     */
    suspend fun ping(data: ByteArray = byteArrayOf(0x42)): ByteArray = withTimeout(requestTimeout) {
        val session = webSocketSession ?: throw IllegalStateException("Not connected")
        
        session.send(Frame.Ping(data))
        
        val responseFrame = messageChannel.receive() as? Frame.Pong
            ?: throw IllegalStateException("Expected pong frame response")
        
        responseFrame.data
    }
    
    /**
     * Sends close frame with specified reason.
     */
    suspend fun close(code: Short = CloseReason.Codes.NORMAL.code, message: String = "Test complete") {
        val session = webSocketSession ?: return
        
        session.close(CloseReason(code, message))
        messageListenerJob?.cancel()
        connected = false
    }
    
    /**
     * Forcibly disconnects without proper close handshake.
     */
    suspend fun forceDisconnect() {
        messageListenerJob?.cancel()
        httpClient?.close()
        webSocketSession = null
        connected = false
    }
    
    /**
     * Gets all received frames for analysis.
     */
    fun getReceivedFrames(): List<ReceivedFrame> = synchronized(receivedFrames) {
        receivedFrames.toList()
    }
    
    /**
     * Gets frames of specific type.
     */
    fun getFramesOfType(type: FrameType): List<ReceivedFrame> = synchronized(receivedFrames) {
        receivedFrames.filter { it.type == type }
    }
    
    /**
     * Waits for specific number of text frames.
     */
    suspend fun waitForTextFrames(count: Int, timeout: Duration = 5.seconds): List<String> = withTimeout(timeout) {
        val frames = mutableListOf<String>()
        
        while (frames.size < count) {
            val frame = messageChannel.receive()
            if (frame is Frame.Text) {
                frames.add(frame.readText())
            }
        }
        
        frames
    }
    
    /**
     * Creates JSON-RPC request with auto-generated ID.
     */
    fun createJsonRpcRequest(method: String, params: JsonElement? = null): JsonObject = buildJsonObject {
        put("jsonrpc", "2.0")
        put("id", "test-${requestIdGenerator.getAndIncrement()}")
        put("method", method)
        if (params != null) {
            put("params", params)
        }
    }
    
    /**
     * Creates malformed JSON for error testing.
     */
    fun createMalformedJson(): String = """{"jsonrpc":"2.0","id":"malformed","method":"test" // Missing closing brace"""
    
    /**
     * Creates invalid JSON-RPC (missing required fields).
     */
    fun createInvalidJsonRpc(): JsonObject = buildJsonObject {
        put("id", "invalid")
        // Missing jsonrpc and method fields
    }
    
    /**
     * Measures WebSocket frame roundtrip time.
     */
    suspend fun measureFrameRoundtrip(message: JsonObject): Long {
        val startTime = System.currentTimeMillis()
        sendJsonRpcMessage(message)
        return System.currentTimeMillis() - startTime
    }
    
    /**
     * Performs connection stress test.
     */
    suspend fun stressTestConnections(
        connectionCount: Int,
        operationsPerConnection: Int
    ): List<Long> = coroutineScope {
        val results = (1..connectionCount).map { connectionId ->
            async {
                val client = WebSocketTestClient(serverHost, serverPort, serverPath)
                client.connectToTestApplication(httpClient!!)
                
                val timings = mutableListOf<Long>()
                repeat(operationsPerConnection) { opId ->
                    val request = client.createJsonRpcRequest("tools/list")
                    val timing = client.measureFrameRoundtrip(request)
                    timings.add(timing)
                }
                
                client.close()
                timings
            }
        }
        
        results.awaitAll().flatten()
    }
    
    /**
     * Tests server behavior under malformed input.
     */
    suspend fun testMalformedInputHandling(): List<String> {
        val responses = mutableListOf<String>()
        
        // Test various malformed inputs
        val malformedInputs = listOf(
            createMalformedJson(),
            "not json at all",
            "",
            "null",
            "{\"jsonrpc\":\"1.0\"}",  // Wrong version
            json.encodeToString(JsonObject.serializer(), createInvalidJsonRpc())
        )
        
        for (input in malformedInputs) {
            try {
                val response = sendRawText(input)
                responses.add(response)
            } catch (e: Exception) {
                responses.add("ERROR: ${e.message}")
            }
        }
        
        return responses
    }
    
    /**
     * Validates JSON-RPC 2.0 compliance of response.
     */
    fun validateJsonRpcCompliance(response: JsonElement): Boolean {
        return try {
            val obj = response.jsonObject
            obj["jsonrpc"]?.jsonPrimitive?.content == "2.0" &&
            obj["id"] != null &&
            (obj["result"] != null || obj["error"] != null) &&
            !(obj["result"] != null && obj["error"] != null)
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Gets connection statistics for monitoring.
     */
    fun getConnectionStats(): ConnectionStats = ConnectionStats(
        isConnected = connected,
        totalFramesReceived = receivedFrames.size,
        textFramesReceived = receivedFrames.count { it.type == FrameType.TEXT },
        binaryFramesReceived = receivedFrames.count { it.type == FrameType.BINARY },
        pingFramesReceived = receivedFrames.count { it.type == FrameType.PING },
        pongFramesReceived = receivedFrames.count { it.type == FrameType.PONG },
        connectionDuration = if (receivedFrames.isNotEmpty()) {
            System.currentTimeMillis() - receivedFrames.first().timestamp
        } else 0L
    )
}

/**
 * Statistics for WebSocket connection monitoring.
 */
data class ConnectionStats(
    val isConnected: Boolean,
    val totalFramesReceived: Int,
    val textFramesReceived: Int,
    val binaryFramesReceived: Int,
    val pingFramesReceived: Int,
    val pongFramesReceived: Int,
    val connectionDuration: Long
)

/**
 * Exception for WebSocket test client errors.
 */
class WebSocketTestClientException(message: String, cause: Throwable? = null) : Exception(message, cause)