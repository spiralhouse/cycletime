package io.spiralhouse.cycletime.unit.mcp

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.cycletime.mcp.server.MCPConnectionManager
import io.spiralhouse.cycletime.mcp.server.MCPConfiguration
import io.spiralhouse.cycletime.mcp.server.MCPSession
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import java.util.UUID

/**
 * TDD RED Phase Tests for MCPConnectionManager Refactoring (SPI-691 Phase 1)
 *
 * These tests define the expected behavior after decoupling MCPConnectionManager
 * from WebSocketSession types. They will FAIL initially because the current
 * implementation uses WebSocketSession directly.
 *
 * SUCCESS CRITERIA:
 * - MCPConnectionManager should work with a generic MCPSession interface
 * - ConnectionInfo should not depend on WebSocketSession
 * - Statistics should be transport-agnostic
 * - SSE sessions should be trackable with same fidelity as WebSocket
 *
 * CURRENT ISSUES (expected failures):
 * - Line 21 of MCPConnectionManager.kt: val session: WebSocketSession
 * - Line 3: import io.ktor.websocket.*
 * - Methods registerConnection, sendFrame use WebSocketSession directly
 */
class MCPConnectionManagerRefactoringTest : DescribeSpec({

    describe("MCPConnectionManager Generic Session Interface") {

        it("should track connections without WebSocketSession dependency") {
            // EXPECTED TO FAIL: ConnectionInfo currently requires WebSocketSession type

            val config = MCPConfiguration.fromEnvironment()
            val connectionManager = MCPConnectionManager(config)

            // Create a mock generic session (not WebSocketSession)
            val mockSession = MockGenericMCPSession("test-session-${UUID.randomUUID()}")

            // This should work with ANY MCPSession implementation, not just WebSocket
            val connectionId = connectionManager.registerConnection(mockSession)

            connectionId shouldNotBe null

            // Verify connection is tracked
            val stats = connectionManager.getStatistics()
            stats.activeCount shouldBe 1
            stats.connections.size shouldBe 1
            stats.connections[0].id shouldBe connectionId
        }

        it("should support SSE connections with same metrics as WebSocket") {
            // EXPECTED TO FAIL: Current implementation tied to WebSocketSession

            val config = MCPConfiguration.fromEnvironment()
            val connectionManager = MCPConnectionManager(config)

            // Create SSE-specific session implementation
            val sseSession = MockSSEMCPSession(
                sessionId = "sse-session-${UUID.randomUUID()}",
                eventChannel = Channel(Channel.BUFFERED)
            )

            // Should register SSE session same as WebSocket
            val connectionId = connectionManager.registerConnection(sseSession)

            connectionId shouldNotBe null

            // Verify metrics work identically for SSE
            val stats = connectionManager.getStatistics()
            stats.activeCount shouldBe 1

            // SSE session should be healthy just like WebSocket
            connectionManager.isConnectionHealthy(connectionId!!) shouldBe true
        }

        it("should provide statistics without WebSocket-specific data") {
            // EXPECTED TO FAIL: ConnectionInfo has WebSocketSession field

            val config = MCPConfiguration.fromEnvironment()
            val connectionManager = MCPConnectionManager(config)

            val mockSession = MockGenericMCPSession("test-session-${UUID.randomUUID()}")
            val connectionId = connectionManager.registerConnection(mockSession)

            // Get statistics
            val stats = connectionManager.getStatistics()

            // Statistics model should be transport-agnostic
            // WILL FAIL: ConnectionInfo currently has `session: WebSocketSession` field
            stats.connections.forEach { conn ->
                // Connection stats should not expose transport-specific types
                // Should only have: id, duration, requests, errors, lastActivity
                // NO: session, frame, closeReason, etc.
            }
        }

        it("should process messages from any transport type") {
            // EXPECTED TO FAIL: processFrame method is WebSocket-specific

            val config = MCPConfiguration.fromEnvironment()
            val connectionManager = MCPConnectionManager(config)

            val mockSession = MockGenericMCPSession("test-session-${UUID.randomUUID()}")
            val connectionId = connectionManager.registerConnection(mockSession)

            // Process a generic message (not a Frame)
            val message = """{"jsonrpc":"2.0","id":1,"method":"ping"}"""

            // Should work with string messages, not just WebSocket Frames
            // WILL FAIL: processFrame expects Frame type, not String
            val response = connectionManager.processMessage(
                connectionId = connectionId!!,
                message = message,
                handler = { msg -> """{"jsonrpc":"2.0","id":1,"result":"pong"}""" }
            )

            response shouldNotBe null
            response shouldBe """{"jsonrpc":"2.0","id":1,"result":"pong"}"""
        }

        it("should send messages to any transport type") {
            // EXPECTED TO FAIL: sendFrame is WebSocket-specific

            val config = MCPConfiguration.fromEnvironment()
            val connectionManager = MCPConnectionManager(config)

            val sseSession = MockSSEMCPSession(
                sessionId = "sse-${UUID.randomUUID()}",
                eventChannel = Channel(Channel.BUFFERED)
            )
            val connectionId = connectionManager.registerConnection(sseSession)

            // Send message as string, not Frame
            val message = """{"jsonrpc":"2.0","id":2,"result":"success"}"""

            // WILL FAIL: sendFrame expects Frame type
            val sent = connectionManager.sendMessage(connectionId!!, message)

            sent shouldBe true

            // Verify SSE session received the message
            sseSession.sentMessages.size shouldBe 1
            sseSession.sentMessages[0] shouldBe message
        }

        it("should cleanup connections regardless of transport type") {
            // EXPECTED TO FAIL: Close mechanism tied to WebSocket CloseReason

            val config = MCPConfiguration.fromEnvironment()
            val connectionManager = MCPConnectionManager(config)

            val mockSession1 = MockGenericMCPSession("session-1")
            val mockSession2 = MockSSEMCPSession("session-2", Channel(Channel.BUFFERED))

            connectionManager.registerConnection(mockSession1)
            connectionManager.registerConnection(mockSession2)

            connectionManager.getStatistics().activeCount shouldBe 2

            // Should close all connections with generic close mechanism
            // WILL FAIL: closeAll uses WebSocket CloseReason
            connectionManager.closeAll()

            connectionManager.getStatistics().activeCount shouldBe 0
            mockSession1.isClosed shouldBe true
            mockSession2.isClosed shouldBe true
        }

        it("should track request count across transport types") {
            // EXPECTED TO FAIL: Request counting tied to Frame processing

            val config = MCPConfiguration.fromEnvironment()
            val connectionManager = MCPConnectionManager(config)

            val sseSession = MockSSEMCPSession("sse-${UUID.randomUUID()}", Channel(Channel.BUFFERED))
            val connectionId = connectionManager.registerConnection(sseSession)

            // Process multiple messages
            repeat(5) { i ->
                connectionManager.processMessage(
                    connectionId = connectionId!!,
                    message = """{"jsonrpc":"2.0","id":$i,"method":"test"}""",
                    handler = { _ -> """{"jsonrpc":"2.0","id":$i,"result":"ok"}""" }
                )
            }

            // Verify request counting works for SSE
            val stats = connectionManager.getStatistics()
            stats.totalRequests shouldBe 5
            stats.connections[0].requests shouldBe 5
        }
    }

    describe("MCPSession Interface Contract") {

        it("should define transport-agnostic session interface") {
            // EXPECTED TO FAIL: No MCPSession interface exists

            // Interface should define:
            // - sessionId: String
            // - isActive: Boolean
            // - close(): suspend fun
            // - send(message: String): suspend fun

            // This test validates the interface exists and has required methods
            val session: MCPSession = MockGenericMCPSession("test")

            session.sessionId shouldBe "test"
            session.isActive shouldBe true

            session.close()
            session.isActive shouldBe false
        }

        it("should support SSE session implementation") {
            // EXPECTED TO FAIL: SSEMCPSession doesn't exist

            val eventChannel = Channel<String>(Channel.BUFFERED)
            val sseSession: MCPSession = MockSSEMCPSession("sse-test", eventChannel)

            sseSession.sessionId shouldBe "sse-test"
            sseSession.isActive shouldBe true

            // SSE-specific: send should write to event channel
            sseSession.send("test message")

            // Verify message in channel
            val receivedMessage = eventChannel.tryReceive().getOrNull()
            receivedMessage shouldBe "test message"
        }
    }
})

// ==================== MOCK IMPLEMENTATIONS ====================
// These mocks implement the MCPSession interface for testing

/**
 * Mock generic MCP session for testing
 */
class MockGenericMCPSession(
    override val sessionId: String
) : MCPSession {
    override var isActive: Boolean = true
        private set
    var isClosed: Boolean = false
        private set
    val sentMessages = mutableListOf<String>()

    override suspend fun send(message: String) {
        if (!isActive) error("Session closed")
        sentMessages.add(message)
    }

    override suspend fun close() {
        isActive = false
        isClosed = true
    }
}

/**
 * Mock SSE MCP session for testing
 */
class MockSSEMCPSession(
    override val sessionId: String,
    private val eventChannel: Channel<String>
) : MCPSession {
    override var isActive: Boolean = true
        private set
    var isClosed: Boolean = false
        private set
    val sentMessages = mutableListOf<String>()

    override suspend fun send(message: String) {
        if (!isActive) error("Session closed")
        sentMessages.add(message)
        eventChannel.send(message)
    }

    override suspend fun close() {
        isActive = false
        isClosed = true
        eventChannel.close()
    }
}
