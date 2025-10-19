package io.spiralhouse.cycletime.unit.mcp.sdk

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.application.commands.CreateSessionCommand
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.entities.Session
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import io.spiralhouse.cycletime.unit.mocks.MockSessionRepository
import io.spiralhouse.cycletime.unit.mocks.MockProjectRepository
import io.spiralhouse.cycletime.unit.mocks.MockUnitOfWork
import kotlinx.coroutines.runBlocking

/**
 * Unit tests for SDKSessionManager session lifecycle management.
 *
 * These tests verify the SDK session management layer that bridges between
 * the stateless SDK transport and the domain/application session services.
 *
 * Test Categories:
 * - Session retrieval and creation (getOrCreateSession)
 * - Session validation (validateSession)
 * - Optional session retrieval (getSessionOrNull)
 * - Error handling and edge cases
 *
 * Design Philosophy:
 * - Fast, isolated unit tests with mock services
 * - Test manager orchestration logic, not service internals
 * - Cover both success and failure paths
 * - Validate error messages are actionable
 *
 * Architecture Context:
 * SDKSessionManager replaces the stateful EventBus channel management with
 * stateless per-request session lookup. Sessions are stored in the database
 * and retrieved based on session ID from request metadata.
 */
class SDKSessionManagerTest : StringSpec({
    lateinit var sessionService: SessionApplicationService
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var mockSessionRepository: MockSessionRepository
    lateinit var mockProjectRepository: MockProjectRepository
    lateinit var mockUnitOfWork: MockUnitOfWork
    lateinit var sessionManager: SDKSessionManager

    beforeEach {
        mockTimeProvider = MockTimeProvider()
        mockSessionRepository = MockSessionRepository(mockTimeProvider)
        mockProjectRepository = MockProjectRepository()
        mockUnitOfWork = MockUnitOfWork()
        sessionService = SessionApplicationService(
            mockSessionRepository,
            mockProjectRepository,
            mockUnitOfWork,
            mockTimeProvider
        )
        sessionManager = SDKSessionManager(sessionService)
    }

    "should get existing session by session ID" {
        // Given - pre-create a session in the service
        val createdSession = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }
        val sessionId = createdSession.sessionKey.value // Extract String from SessionKey

        // When
        val retrievedSession = runBlocking {
            sessionManager.getOrCreateSession(sessionId)
        }

        // Then
        retrievedSession shouldNotBe null
        retrievedSession.sessionKey.value shouldBe sessionId
    }

    "should create new session when session ID not found" {
        // Given - session ID that doesn't exist (valid UUID format)
        val sessionId = "550e8400-e29b-41d4-a716-446655440001"

        // When
        val session = runBlocking {
            sessionManager.getOrCreateSession(sessionId)
        }

        // Then - new session should be created
        session shouldNotBe null
        // Verify session exists in repository
        mockSessionRepository.sessions.size shouldBe 1
    }

    "should validate existing session successfully" {
        // Given - pre-create a session
        val createdSession = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }
        val sessionId = createdSession.sessionKey.value

        // When
        val validatedSession = runBlocking {
            sessionManager.validateSession(sessionId)
        }

        // Then
        validatedSession shouldNotBe null
        validatedSession.sessionKey.value shouldBe sessionId
    }

    "should throw IllegalStateException when validating non-existent session" {
        // Given - session ID that doesn't exist (valid UUID format)
        val sessionId = "550e8400-e29b-41d4-a716-446655449999"

        // When/Then
        val exception = shouldThrow<IllegalStateException> {
            runBlocking {
                sessionManager.validateSession(sessionId)
            }
        }

        exception.message shouldBe "Invalid or expired session: $sessionId"
    }

    "should return null when getting non-existent session with getSessionOrNull" {
        // Given - session ID that doesn't exist (valid UUID format)
        val sessionId = "550e8400-e29b-41d4-a716-446655449998"

        // When
        val session = runBlocking {
            sessionManager.getSessionOrNull(sessionId)
        }

        // Then
        session shouldBe null
    }

    "should return session when getting existing session with getSessionOrNull" {
        // Given - pre-create a session
        val createdSession = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }
        val sessionId = createdSession.sessionKey.value

        // When
        val retrievedSession = runBlocking {
            sessionManager.getSessionOrNull(sessionId)
        }

        // Then
        retrievedSession shouldNotBe null
        retrievedSession?.sessionKey?.value shouldBe sessionId
    }

    "should handle multiple getOrCreateSession calls for existing session ID" {
        // Given - create initial session via service (so it exists with that ID)
        val createdSession = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }
        val sessionId = createdSession.sessionKey.value

        // When - request same session multiple times via manager
        val session1 = runBlocking {
            sessionManager.getOrCreateSession(sessionId)
        }
        val session2 = runBlocking {
            sessionManager.getOrCreateSession(sessionId)
        }
        val session3 = runBlocking {
            sessionManager.getOrCreateSession(sessionId)
        }

        // Then - all should return the same session key (the original)
        session1.sessionKey.value shouldBe sessionId
        session2.sessionKey.value shouldBe sessionId
        session3.sessionKey.value shouldBe sessionId
    }

    "should create multiple independent sessions for different session IDs" {
        // Given/When - create sessions with different valid UUIDs
        val session1 = runBlocking {
            sessionManager.getOrCreateSession("550e8400-e29b-41d4-a716-446655440003")
        }
        val session2 = runBlocking {
            sessionManager.getOrCreateSession("550e8400-e29b-41d4-a716-446655440004")
        }
        val session3 = runBlocking {
            sessionManager.getOrCreateSession("550e8400-e29b-41d4-a716-446655440005")
        }

        // Then - all sessions should be independent
        session1.sessionKey shouldNotBe session2.sessionKey
        session2.sessionKey shouldNotBe session3.sessionKey
        session1.sessionKey shouldNotBe session3.sessionKey

        // Verify all sessions were created
        mockSessionRepository.sessions.size shouldBe 3
    }

    "should handle rapid session validation calls" {
        // Given - pre-create a session
        val createdSession = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }
        val sessionId = createdSession.sessionKey.value

        // When - validate same session multiple times rapidly
        val validations = (1..10).map {
            runBlocking {
                sessionManager.validateSession(sessionId)
            }
        }

        // Then - all validations should succeed
        validations.size shouldBe 10
        validations.all { it.sessionKey.value == sessionId } shouldBe true
    }

    "should track repository interactions correctly" {
        // Given
        val initialSaveCount = mockSessionRepository.saveCallCount
        val initialFindCount = mockSessionRepository.findCallCount

        // When - perform various operations
        runBlocking {
            sessionManager.getOrCreateSession("550e8400-e29b-41d4-a716-446655440006")
            sessionManager.getOrCreateSession("550e8400-e29b-41d4-a716-446655440007")

            val session = sessionService.createSession(CreateSessionCommand(projectId = null))
            sessionManager.validateSession(session.sessionKey.value)
            sessionManager.getSessionOrNull(session.sessionKey.value)
        }

        // Then - verify call counts increased
        mockSessionRepository.saveCallCount shouldBe initialSaveCount + 3 // 3 creates
        (mockSessionRepository.findCallCount > initialFindCount) shouldBe true // Multiple finds
    }

    "should handle valid UUID formatted session IDs" {
        // Given - session ID with valid UUID format
        val sessionId = "550e8400-e29b-41d4-a716-446655440008"

        // When
        val session = runBlocking {
            sessionManager.getOrCreateSession(sessionId)
        }

        // Then
        session shouldNotBe null
    }

    "should handle UUID formatted session IDs" {
        // Given - UUID formatted session ID
        val uuidSessionId = "550e8400-e29b-41d4-a716-446655440000"

        // When
        val session = runBlocking {
            sessionManager.getOrCreateSession(uuidSessionId)
        }

        // Then
        session shouldNotBe null
    }

    "should maintain session isolation across manager operations" {
        // Given - create two sessions
        val session1 = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }
        val session2 = runBlocking {
            sessionService.createSession(CreateSessionCommand(projectId = null))
        }

        // When - retrieve both sessions via manager
        val retrieved1 = runBlocking {
            sessionManager.getSessionOrNull(session1.sessionKey.value)
        }
        val retrieved2 = runBlocking {
            sessionManager.getSessionOrNull(session2.sessionKey.value)
        }

        // Then - sessions should be independent
        retrieved1?.sessionKey shouldBe session1.sessionKey
        retrieved2?.sessionKey shouldBe session2.sessionKey
        retrieved1?.sessionKey shouldNotBe retrieved2?.sessionKey
    }
})
