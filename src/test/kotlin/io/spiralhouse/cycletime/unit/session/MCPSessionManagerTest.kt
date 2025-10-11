package io.spiralhouse.cycletime.unit.session

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.mcp.session.*
import java.util.UUID
import kotlin.time.Duration.Companion.milliseconds

/**
 * TDD RED Phase: MCP Session Manager Unit Tests
 *
 * Tests for session management in the SSE transport implementation.
 * This component manages session lifecycle, header validation, and session state
 * for both POST requests and SSE connections.
 *
 * Session Management Requirements (SPI-669):
 * - Extract session ID from Mcp-Session-Id header
 * - Create new sessions for valid session IDs
 * - Reuse existing sessions for same session ID
 * - Validate session ID format (security)
 * - Clean up expired sessions
 * - Prevent session hijacking
 *
 * EXPECTED FAILURES (RED Phase):
 * - MCPSessionManager class doesn't exist
 * - Session validation logic not implemented
 * - Session cleanup mechanism not implemented
 *
 * These tests will pass once the Developer agent implements session management.
 */
class MCPSessionManagerTest : StringSpec({

    "should extract session ID from Mcp-Session-Id header" {
        // EXPECTED FAILURE: parseSessionHeader() doesn't exist
        val sessionId = parseSessionHeader("test-session-123")

        sessionId shouldBe "test-session-123"
    }

    "should create new session for valid session ID" {
        // EXPECTED FAILURE: MCPSessionManager class doesn't exist
        val manager = MCPSessionManager(MockTimeProvider())
        val sessionId = "new-session-${UUID.randomUUID()}"

        val session = manager.getOrCreateSession(sessionId)

        session.id shouldBe sessionId
        session.createdAt shouldNotBe null
        session.lastActivity shouldNotBe null
    }

    "should reuse existing session for same session ID" {
        // EXPECTED FAILURE: MCPSessionManager doesn't exist
        val manager = MCPSessionManager(MockTimeProvider())
        val sessionId = "session-${UUID.randomUUID()}"

        val session1 = manager.getOrCreateSession(sessionId)
        val session2 = manager.getOrCreateSession(sessionId)

        session1 shouldBe session2
        session1.id shouldBe session2.id
    }

    "should validate session ID format" {
        // EXPECTED FAILURE: validateSessionId() doesn't exist
        // Valid formats
        validateSessionId("session-123") shouldBe true
        validateSessionId("abc-def-ghi") shouldBe true
        validateSessionId(UUID.randomUUID().toString()) shouldBe true

        // Invalid formats with security risks
        validateSessionId("session\nid") shouldBe false // Newline
        validateSessionId("session\rid") shouldBe false // Carriage return
        validateSessionId("session\u0000id") shouldBe false // Null byte
        validateSessionId("../../../etc/passwd") shouldBe false // Path traversal
    }

    "should throw SecurityException for invalid session ID format" {
        // EXPECTED FAILURE: Security validation doesn't exist
        shouldThrow<SecurityException> {
            parseSessionHeader("session\nid")
        }
    }

    "should prevent session ID injection attacks" {
        // EXPECTED FAILURE: Injection prevention not implemented
        val maliciousIds = listOf(
            "session\nMcp-Session-Id: hijacked",
            "session\r\nSet-Cookie: evil=true",
            "session'; DROP TABLE sessions;--"
        )

        maliciousIds.forEach { maliciousId ->
            shouldThrow<SecurityException> {
                parseSessionHeader(maliciousId)
            }
        }
    }

    "should update session last activity timestamp" {
        // EXPECTED FAILURE: Activity tracking not implemented
        val mockTimeProvider = MockTimeProvider()
        val manager = MCPSessionManager(mockTimeProvider)
        val sessionId = "activity-test"

        val session = manager.getOrCreateSession(sessionId)
        val initialActivity = session.lastActivity

        mockTimeProvider.advance(10.milliseconds) // Advance time

        manager.updateActivity(sessionId)
        val updatedSession = manager.getSession(sessionId)

        updatedSession!!.lastActivity shouldNotBe initialActivity
    }

    "should track active SSE connections per session" {
        // EXPECTED FAILURE: Connection tracking not implemented
        val manager = MCPSessionManager(MockTimeProvider())
        val sessionId = "connection-test"

        val session = manager.getOrCreateSession(sessionId)

        manager.registerSSEConnection(sessionId, "connection-1")
        manager.registerSSEConnection(sessionId, "connection-2")

        session.sseConnections shouldHaveSize 2
        session.sseConnections shouldContain "connection-1"
        session.sseConnections shouldContain "connection-2"
    }

    "should remove SSE connection when disconnected" {
        // EXPECTED FAILURE: Connection removal logic doesn't exist
        val manager = MCPSessionManager(MockTimeProvider())
        val sessionId = "disconnect-test"

        manager.registerSSEConnection(sessionId, "conn-1")
        manager.registerSSEConnection(sessionId, "conn-2")

        manager.unregisterSSEConnection(sessionId, "conn-1")

        val session = manager.getSession(sessionId)
        session!!.sseConnections shouldHaveSize 1
        session.sseConnections shouldNotContain "conn-1"
    }

    "should clean up expired sessions" {
        // EXPECTED FAILURE: Cleanup mechanism doesn't exist
        val mockTimeProvider = MockTimeProvider()
        val manager = MCPSessionManager(mockTimeProvider, sessionTimeout = 100.milliseconds) // 100ms timeout
        val sessionId = "expire-test"

        manager.getOrCreateSession(sessionId)

        mockTimeProvider.advance(150.milliseconds) // Advance time past expiration

        manager.cleanupExpiredSessions()

        manager.getSession(sessionId) shouldBe null
    }

    "should not clean up active sessions" {
        // EXPECTED FAILURE: Expiration logic not implemented
        val mockTimeProvider = MockTimeProvider()
        val manager = MCPSessionManager(mockTimeProvider, sessionTimeout = 100.milliseconds)
        val sessionId = "active-test"

        manager.getOrCreateSession(sessionId)

        mockTimeProvider.advance(50.milliseconds) // Halfway to expiration
        manager.updateActivity(sessionId) // Keep alive

        mockTimeProvider.advance(60.milliseconds) // Total 110ms, but activity was updated at 50ms

        manager.cleanupExpiredSessions()

        manager.getSession(sessionId) shouldNotBe null
    }

    "should get all active session IDs" {
        // EXPECTED FAILURE: Session enumeration not implemented
        val manager = MCPSessionManager(MockTimeProvider())

        manager.getOrCreateSession("session-1")
        manager.getOrCreateSession("session-2")
        manager.getOrCreateSession("session-3")

        val activeSessions = manager.getActiveSessions()

        activeSessions shouldHaveSize 3
        activeSessions shouldContain "session-1"
        activeSessions shouldContain "session-2"
        activeSessions shouldContain "session-3"
    }

    "should limit maximum concurrent sessions" {
        // EXPECTED FAILURE: Rate limiting not implemented
        val manager = MCPSessionManager(MockTimeProvider(), maxSessions = 2)

        manager.getOrCreateSession("session-1")
        manager.getOrCreateSession("session-2")

        shouldThrow<TooManySessionsException> {
            manager.getOrCreateSession("session-3")
        }
    }

    "should store session state for correlation" {
        // EXPECTED FAILURE: State storage not implemented
        val manager = MCPSessionManager(MockTimeProvider())
        val sessionId = "state-test"

        val session = manager.getOrCreateSession(sessionId)

        manager.setSessionState(sessionId, "pendingRequests", listOf("req-1", "req-2"))
        manager.setSessionState(sessionId, "initialized", true)

        manager.getSessionState<List<String>>(sessionId, "pendingRequests") shouldBe listOf("req-1", "req-2")
        manager.getSessionState<Boolean>(sessionId, "initialized") shouldBe true
    }

    "should clear all session state on cleanup" {
        // EXPECTED FAILURE: State cleanup not implemented
        val manager = MCPSessionManager(MockTimeProvider())
        val sessionId = "cleanup-test"

        manager.getOrCreateSession(sessionId)
        manager.setSessionState(sessionId, "data", "test")

        manager.clearSession(sessionId)

        manager.getSession(sessionId) shouldBe null
        manager.getSessionState<String>(sessionId, "data") shouldBe null
    }

    "should generate unique session IDs" {
        // EXPECTED FAILURE: ID generation not implemented
        val id1 = generateSessionId()
        val id2 = generateSessionId()

        id1 shouldNotBe id2
        id1.length shouldBe 36 // UUID format
        id2.length shouldBe 36
    }

    "should validate session ID length" {
        // EXPECTED FAILURE: Length validation doesn't exist
        validateSessionId("a") shouldBe false // Too short
        validateSessionId("a".repeat(256)) shouldBe false // Too long
        validateSessionId("valid-session-id") shouldBe true
    }
})

// Implementations now provided by io.spiralhouse.cycletime.mcp.session package
