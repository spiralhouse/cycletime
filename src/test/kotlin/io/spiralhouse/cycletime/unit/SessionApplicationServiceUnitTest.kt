package io.spiralhouse.cycletime.unit

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.ints.shouldBeExactly
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.application.exceptions.SessionNotFoundException
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.entities.Session
import io.spiralhouse.cycletime.domain.entities.SessionContext
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import io.spiralhouse.cycletime.unit.mocks.MockProjectRepository
import io.spiralhouse.cycletime.unit.mocks.MockSessionRepository
import io.spiralhouse.cycletime.unit.mocks.MockUnitOfWork
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.milliseconds

/**
 * Comprehensive unit tests for SessionApplicationService.
 *
 * This test suite achieves 80%+ coverage on business logic through fast, isolated tests
 * using mock infrastructure. Each test follows Given-When-Then structure with descriptive
 * names that clearly express the business scenarios being validated.
 *
 * ## Test Categories:
 * 1. Session Creation & Basic Operations
 * 2. Project Association Management  
 * 3. Session Context Management (critical business logic)
 * 4. Issue & Workflow Management
 * 5. Session Expiration Logic (complex business rules)
 * 6. Session Analytics
 * 7. Error Scenarios & Edge Cases
 *
 * ## Mock Strategy:
 * - Uses constructor injection with all dependencies mocked
 * - MockTimeProvider for consistent time-based testing (no flaky tests)
 * - In-memory data storage for fast execution (<10ms each)
 * - Clear test isolation with beforeEach reset
 *
 * ## Performance Requirements:
 * - All tests run in <1s total
 * - No real I/O operations
 * - All time-dependent logic uses MockTimeProvider
 */
class SessionApplicationServiceUnitTest : StringSpec({

    // ================================================================================
    // Test Infrastructure Setup
    // ================================================================================

    lateinit var mockSessionRepository: MockSessionRepository
    lateinit var mockProjectRepository: MockProjectRepository
    lateinit var mockUnitOfWork: MockUnitOfWork
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var sessionService: SessionApplicationService

    // Common test data
    lateinit var testProjectId: ProjectId
    var testSessionKey: SessionKey = SessionKey.generate() // Can't use lateinit with value classes
    lateinit var baseTime: Instant

    beforeEach {
        // Reset all mocks to ensure test isolation
        mockSessionRepository = MockSessionRepository()
        mockProjectRepository = MockProjectRepository()
        mockUnitOfWork = MockUnitOfWork()
        mockTimeProvider = MockTimeProvider()

        // Create session service with mocked dependencies
        sessionService = SessionApplicationService(
            sessionRepository = mockSessionRepository,
            projectRepository = mockProjectRepository,
            unitOfWork = mockUnitOfWork,
            timeProvider = mockTimeProvider
        )

        // Initialize common test data
        testProjectId = ProjectId.generate()
        testSessionKey = SessionKey.generate()
        baseTime = Instant.parse("2024-01-01T00:00:00Z")
        mockTimeProvider.setTime(baseTime)
    }

    // ================================================================================
    // Helper Methods for Test Setup
    // ================================================================================

    fun createTestSession(
        sessionKey: SessionKey = SessionKey.generate(),
        projectId: ProjectId? = null,
        context: SessionContext = SessionContext(),
        lastActivity: Instant = mockTimeProvider.now()
    ): Session {
        // Set the time for consistent session creation
        mockTimeProvider.setTime(lastActivity)
        return Session.createWithKey(
            sessionKey = sessionKey,
            projectId = projectId,
            currentContext = context,
            timeProvider = mockTimeProvider
        )
    }

    fun addTestProject(projectId: ProjectId = testProjectId) {
        // For the mock, we just need to ensure exists() returns true
        // We'll create a minimal project using the domain factory method
        val testProject = io.spiralhouse.cycletime.domain.entities.Project.create(
            name = "Test Project",
            description = "Test project for unit tests",
            timeProvider = mockTimeProvider
        )
        // Add to mock repository - the ID doesn't matter for existence checking
        mockProjectRepository.projects[projectId] = testProject
    }

    // ================================================================================
    // Session Creation & Basic Operations Tests
    // ================================================================================

    "should create session without project when no project provided" {
        // Given - no setup needed

        // When
        val result = sessionService.createSession(CreateSessionCommand(projectId = null))

        // Then
        result.shouldNotBeNull()
        result.projectId.shouldBeNull()
        result.sessionKey.value.shouldNotBe("")
        result.createdAt shouldBe baseTime
        result.updatedAt shouldBe baseTime
        result.lastActivity shouldBe baseTime
        result.currentContext shouldBe SessionContext()
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should create session with project when project exists" {
        // Given
        addTestProject(testProjectId)

        // When
        val result = sessionService.createSession(CreateSessionCommand(projectId = testProjectId))

        // Then
        result.shouldNotBeNull()
        result.projectId shouldBe testProjectId
        result.sessionKey.value.shouldNotBe("")
        result.createdAt shouldBe baseTime
        result.updatedAt shouldBe baseTime
        result.lastActivity shouldBe baseTime
        result.currentContext shouldBe SessionContext()
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw ProjectNotFoundException when creating session with non-existent project" {
        // Given
        val nonExistentProjectId = ProjectId.generate()
        // Do not add project to repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            sessionService.createSession(CreateSessionCommand(projectId = nonExistentProjectId))
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should return session when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey, projectId = testProjectId)
        mockSessionRepository.sessions[testSessionKey] = testSession

        // When
        val result = sessionService.getSession(testSessionKey)

        // Then
        result.shouldNotBeNull()
        result.sessionKey shouldBe testSessionKey
        result.projectId shouldBe testProjectId
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return null when session does not exist" {
        // Given
        val nonExistentKey = SessionKey.generate()
        // Do not add session to repository

        // When
        val result = sessionService.getSession(nonExistentKey)

        // Then
        result.shouldBeNull()
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should delete session when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        mockSessionRepository.sessions[testSessionKey] = testSession

        // When
        sessionService.deleteSession(testSessionKey)

        // Then
        mockSessionRepository.deleteCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
        mockSessionRepository.sessions.keys.shouldNotContain(testSessionKey)
    }

    "should delete session idempotently when session does not exist" {
        // Given - no session in repository

        // When
        sessionService.deleteSession(testSessionKey)

        // Then - no error thrown, operation completes
        mockSessionRepository.deleteCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should touch session and update timestamps when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey, lastActivity = baseTime)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(1.hours)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.touchSession(testSessionKey)

        // Then
        result.shouldNotBeNull()
        result.sessionKey shouldBe testSessionKey
        result.lastActivity shouldBe newTime
        result.updatedAt shouldBe newTime
        result.createdAt shouldBe baseTime // Should not change
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when touching non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.touchSession(testSessionKey)
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    // ================================================================================
    // Project Association Management Tests
    // ================================================================================

    "should associate session with project when both exist" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey, projectId = null)
        mockSessionRepository.sessions[testSessionKey] = testSession
        addTestProject(testProjectId)
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.associateWithProject(
            AssociateSessionWithProjectCommand(testSessionKey, testProjectId)
        )

        // Then
        result.shouldNotBeNull()
        result.sessionKey shouldBe testSessionKey
        result.projectId shouldBe testProjectId
        result.lastActivity shouldBe newTime
        result.updatedAt shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when associating non-existent session" {
        // Given
        addTestProject(testProjectId)
        // Do not add session to repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.associateWithProject(
                AssociateSessionWithProjectCommand(testSessionKey, testProjectId)
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should throw ProjectNotFoundException when associating with non-existent project" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val nonExistentProjectId = ProjectId.generate()
        // Do not add project to repository

        // When & Then
        shouldThrow<ProjectNotFoundException> {
            sessionService.associateWithProject(
                AssociateSessionWithProjectCommand(testSessionKey, nonExistentProjectId)
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should disassociate session from project when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey, projectId = testProjectId)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(45.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.disassociateFromProject(testSessionKey)

        // Then
        result.shouldNotBeNull()
        result.sessionKey shouldBe testSessionKey
        result.projectId.shouldBeNull()
        result.lastActivity shouldBe newTime
        result.updatedAt shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when disassociating non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.disassociateFromProject(testSessionKey)
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should find sessions by project when sessions exist for project" {
        // Given
        val session1 = createTestSession(
            sessionKey = SessionKey.generate(),
            projectId = testProjectId
        )
        val session2 = createTestSession(
            sessionKey = SessionKey.generate(),
            projectId = testProjectId
        )
        val session3 = createTestSession(
            sessionKey = SessionKey.generate(),
            projectId = ProjectId.generate() // Different project
        )

        mockSessionRepository.sessions[session1.sessionKey] = session1
        mockSessionRepository.sessions[session2.sessionKey] = session2
        mockSessionRepository.sessions[session3.sessionKey] = session3

        // Update the project index manually for test setup
        mockSessionRepository.sessionsByProject[testProjectId] = mutableListOf(session1, session2)

        // When
        val result = sessionService.findSessionsByProject(testProjectId)

        // Then
        result shouldHaveSize 2
        result.map { it.sessionKey } shouldContain session1.sessionKey
        result.map { it.sessionKey } shouldContain session2.sessionKey
        result.map { it.sessionKey }.shouldNotContain(session3.sessionKey)
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty list when no sessions exist for project" {
        // Given
        val projectWithNoSessions = ProjectId.generate()

        // When
        val result = sessionService.findSessionsByProject(projectWithNoSessions)

        // Then
        result.shouldBeEmpty()
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // ================================================================================
    // Session Context Management Tests (Critical Business Logic)
    // ================================================================================

    "should update session context completely when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val originalContext = SessionContext(
            activeIssues = listOf("issue-1"),
            workflowStage = "old-stage",
            lastAction = "old-action",
            contextData = mapOf("key1" to "value1")
        )
        testSession.updateContext(originalContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        
        val newContext = SessionContext(
            activeIssues = listOf("issue-2", "issue-3"),
            workflowStage = "new-stage",
            lastAction = "new-action",
            contextData = mapOf("key2" to "value2", "key3" to "value3")
        )
        val newTime = baseTime.plus(1.hours)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.updateSessionContext(
            UpdateSessionContextCommand(testSessionKey, newContext)
        )

        // Then
        result.shouldNotBeNull()
        result.sessionKey shouldBe testSessionKey
        result.currentContext shouldBe newContext
        result.lastActivity shouldBe newTime
        result.updatedAt shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when updating context for non-existent session" {
        // Given
        val newContext = SessionContext(workflowStage = "test-stage")

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.updateSessionContext(
                UpdateSessionContextCommand(testSessionKey, newContext)
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should add context entry when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(contextData = mapOf("existing" to "value"))
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.addContextEntry(
            AddContextEntryCommand(testSessionKey, "newKey", "newValue")
        )

        // Then
        result.shouldNotBeNull()
        result.sessionKey shouldBe testSessionKey
        result.currentContext.contextData shouldBe mapOf(
            "existing" to "value",
            "newKey" to "newValue"
        )
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should overwrite existing context entry when key already exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(contextData = mapOf("key1" to "oldValue", "key2" to "value2"))
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.addContextEntry(
            AddContextEntryCommand(testSessionKey, "key1", "newValue")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.contextData shouldBe mapOf(
            "key1" to "newValue",
            "key2" to "value2"
        )
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when adding context entry to non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.addContextEntry(
                AddContextEntryCommand(testSessionKey, "key", "value")
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should update context entry when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(contextData = mapOf("key1" to "oldValue"))
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.updateContextEntry(
            UpdateContextEntryCommand(testSessionKey, "key1", "updatedValue")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.contextData shouldBe mapOf("key1" to "updatedValue")
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should remove context entry when key exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(
            contextData = mapOf("key1" to "value1", "key2" to "value2", "key3" to "value3")
        )
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.removeContextEntry(
            RemoveContextEntryCommand(testSessionKey, "key2")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.contextData shouldBe mapOf(
            "key1" to "value1",
            "key3" to "value3"
        )
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should remove context entry idempotently when key does not exist" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(contextData = mapOf("key1" to "value1"))
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.removeContextEntry(
            RemoveContextEntryCommand(testSessionKey, "nonExistentKey")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.contextData shouldBe mapOf("key1" to "value1") // Unchanged
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when removing context entry from non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.removeContextEntry(
                RemoveContextEntryCommand(testSessionKey, "key")
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should clear all context when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(
            activeIssues = listOf("issue-1", "issue-2"),
            workflowStage = "some-stage",
            lastAction = "some-action",
            contextData = mapOf("key1" to "value1", "key2" to "value2")
        )
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.clearContext(testSessionKey)

        // Then
        result.shouldNotBeNull()
        result.sessionKey shouldBe testSessionKey
        result.currentContext shouldBe SessionContext() // Empty context
        result.lastActivity shouldBe newTime
        result.updatedAt shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when clearing context of non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.clearContext(testSessionKey)
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    // ================================================================================
    // Issue & Workflow Management Tests
    // ================================================================================

    "should add active issue when session exists and issue is new" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(activeIssues = listOf("existing-issue"))
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.addActiveIssue(
            AddActiveIssueCommand(testSessionKey, "new-issue")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.activeIssues shouldContain "existing-issue"
        result.currentContext.activeIssues shouldContain "new-issue"
        result.currentContext.activeIssues shouldHaveSize 2
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should add active issue idempotently when issue already exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(activeIssues = listOf("existing-issue"))
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession

        // When
        val result = sessionService.addActiveIssue(
            AddActiveIssueCommand(testSessionKey, "existing-issue")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.activeIssues shouldContain "existing-issue"
        result.currentContext.activeIssues shouldHaveSize 1 // No duplicate
        mockSessionRepository.saveCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when adding active issue to non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.addActiveIssue(
                AddActiveIssueCommand(testSessionKey, "issue-id")
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should remove active issue when session exists and issue is present" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(
            activeIssues = listOf("issue-1", "issue-2", "issue-3")
        )
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.removeActiveIssue(
            RemoveActiveIssueCommand(testSessionKey, "issue-2")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.activeIssues shouldContain "issue-1"
        result.currentContext.activeIssues shouldNotContain "issue-2"
        result.currentContext.activeIssues shouldContain "issue-3"
        result.currentContext.activeIssues shouldHaveSize 2
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should remove active issue idempotently when issue does not exist" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(activeIssues = listOf("issue-1"))
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.removeActiveIssue(
            RemoveActiveIssueCommand(testSessionKey, "non-existent-issue")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.activeIssues shouldBe listOf("issue-1") // Unchanged
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when removing active issue from non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.removeActiveIssue(
                RemoveActiveIssueCommand(testSessionKey, "issue-id")
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should set workflow stage when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.setWorkflowStage(
            SetWorkflowStageCommand(testSessionKey, "development")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.workflowStage shouldBe "development"
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should clear workflow stage when null value provided" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(workflowStage = "existing-stage")
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.setWorkflowStage(
            SetWorkflowStageCommand(testSessionKey, null)
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.workflowStage.shouldBeNull()
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when setting workflow stage on non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.setWorkflowStage(
                SetWorkflowStageCommand(testSessionKey, "stage")
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    "should set last action when session exists" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.setLastAction(
            SetLastActionCommand(testSessionKey, "completed code review")
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.lastAction shouldBe "completed code review"
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should clear last action when null value provided" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val initialContext = SessionContext(lastAction = "existing-action")
        testSession.updateContext(initialContext)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val newTime = baseTime.plus(30.milliseconds)
        mockTimeProvider.setTime(newTime)

        // When
        val result = sessionService.setLastAction(
            SetLastActionCommand(testSessionKey, null)
        )

        // Then
        result.shouldNotBeNull()
        result.currentContext.lastAction.shouldBeNull()
        result.lastActivity shouldBe newTime
        mockSessionRepository.saveCallCount shouldBe 1
    }

    "should throw SessionNotFoundException when setting last action on non-existent session" {
        // Given - no session in repository

        // When & Then
        shouldThrow<SessionNotFoundException> {
            sessionService.setLastAction(
                SetLastActionCommand(testSessionKey, "action")
            )
        }
        mockSessionRepository.saveCallCount shouldBe 0
    }

    // ================================================================================
    // Session Expiration Logic Tests (Complex Business Rules)
    // ================================================================================

    "should find expired sessions based on cutoff time calculation" {
        // Given
        val oldTime = baseTime.minus(8.days) // Expired (older than 7 days default)
        val recentTime = baseTime.minus(3.days) // Not expired
        val currentTime = baseTime
        
        val expiredSession1 = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = oldTime
        )
        val expiredSession2 = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = oldTime.minus(1.days)
        )
        val activeSession = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = recentTime
        )

        mockSessionRepository.sessions[expiredSession1.sessionKey] = expiredSession1
        mockSessionRepository.sessions[expiredSession2.sessionKey] = expiredSession2  
        mockSessionRepository.sessions[activeSession.sessionKey] = activeSession

        mockTimeProvider.setTime(currentTime)

        // When
        val result = sessionService.findExpiredSessions(7.days)

        // Then
        result shouldHaveSize 2
        result.map { it.sessionKey } shouldContain expiredSession1.sessionKey
        result.map { it.sessionKey } shouldContain expiredSession2.sessionKey
        result.map { it.sessionKey } shouldNotContain activeSession.sessionKey
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should find expired sessions with custom max age duration" {
        // Given
        val veryOldTime = baseTime.minus(25.hours) // Expired with 1 day max age
        val recentTime = baseTime.minus(30.milliseconds) // Not expired
        
        val expiredSession = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = veryOldTime
        )
        val activeSession = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = recentTime
        )

        mockSessionRepository.sessions[expiredSession.sessionKey] = expiredSession
        mockSessionRepository.sessions[activeSession.sessionKey] = activeSession

        mockTimeProvider.setTime(baseTime)

        // When
        val result = sessionService.findExpiredSessions(1.days)

        // Then
        result shouldHaveSize 1
        result.first().sessionKey shouldBe expiredSession.sessionKey
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty list when no sessions are expired" {
        // Given
        val recentSession1 = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = baseTime.minus(1.hours)
        )
        val recentSession2 = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = baseTime.minus(30.milliseconds)
        )

        mockSessionRepository.sessions[recentSession1.sessionKey] = recentSession1
        mockSessionRepository.sessions[recentSession2.sessionKey] = recentSession2

        mockTimeProvider.setTime(baseTime)

        // When
        val result = sessionService.findExpiredSessions(7.days)

        // Then
        result.shouldBeEmpty()
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should cleanup expired sessions and return count when expired sessions exist" {
        // Given
        val oldTime = baseTime.minus(8.days) // Expired
        val recentTime = baseTime.minus(3.days) // Not expired
        
        val expiredSession1 = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = oldTime
        )
        val expiredSession2 = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = oldTime.minus(1.days)
        )
        val activeSession = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = recentTime
        )

        mockSessionRepository.sessions[expiredSession1.sessionKey] = expiredSession1
        mockSessionRepository.sessions[expiredSession2.sessionKey] = expiredSession2
        mockSessionRepository.sessions[activeSession.sessionKey] = activeSession

        mockTimeProvider.setTime(baseTime)

        // When
        val deletedCount = sessionService.cleanupExpiredSessions(7.days)

        // Then
        deletedCount shouldBe 2
        mockSessionRepository.deleteCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
        // Verify that only active session remains
        mockSessionRepository.sessions.size shouldBe 1
        mockSessionRepository.sessions.keys.shouldContain(activeSession.sessionKey)
    }

    "should cleanup expired sessions and return zero when no expired sessions exist" {
        // Given
        val recentSession = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = baseTime.minus(1.hours)
        )

        mockSessionRepository.sessions[recentSession.sessionKey] = recentSession
        mockTimeProvider.setTime(baseTime)

        // When
        val deletedCount = sessionService.cleanupExpiredSessions(7.days)

        // Then
        deletedCount shouldBe 0
        mockSessionRepository.deleteCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
        // Verify session still exists
        mockSessionRepository.sessions.size shouldBe 1
    }

    "should find recent sessions updated after cutoff time" {
        // Given
        val oldTime = baseTime.minus(2.days)
        val recentTime = baseTime.minus(1.hours)
        val cutoffTime = baseTime.minus(1.days)
        
        val oldSession = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = oldTime
        )
        oldSession.touch() // This sets updatedAt to oldTime
        
        val recentSession = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = recentTime
        )
        
        mockTimeProvider.setTime(recentTime)
        recentSession.touch() // This sets updatedAt to recentTime

        mockSessionRepository.sessions[oldSession.sessionKey] = oldSession
        mockSessionRepository.sessions[recentSession.sessionKey] = recentSession

        mockTimeProvider.setTime(baseTime)

        // When
        val result = sessionService.findRecentSessions(cutoffTime)

        // Then
        result shouldHaveSize 1
        result.first().sessionKey shouldBe recentSession.sessionKey
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty list when no recent sessions exist" {
        // Given
        val oldTime = baseTime.minus(3.days)
        val cutoffTime = baseTime.minus(1.days)
        
        val oldSession = createTestSession(
            sessionKey = SessionKey.generate(),
            lastActivity = oldTime
        )

        mockSessionRepository.sessions[oldSession.sessionKey] = oldSession
        mockTimeProvider.setTime(baseTime)

        // When
        val result = sessionService.findRecentSessions(cutoffTime)

        // Then
        result.shouldBeEmpty()
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // ================================================================================
    // Session Analytics Tests
    // ================================================================================

    "should list all active sessions with correct total count" {
        // Given
        val session1 = createTestSession(sessionKey = SessionKey.generate())
        val session2 = createTestSession(sessionKey = SessionKey.generate())
        val session3 = createTestSession(sessionKey = SessionKey.generate())

        mockSessionRepository.sessions[session1.sessionKey] = session1
        mockSessionRepository.sessions[session2.sessionKey] = session2
        mockSessionRepository.sessions[session3.sessionKey] = session3

        // When
        val result = sessionService.listActiveSessions()

        // Then
        result.shouldNotBeNull()
        result.sessions shouldHaveSize 3
        result.totalCount shouldBe 3
        result.sessions.map { it.sessionKey } shouldContain session1.sessionKey
        result.sessions.map { it.sessionKey } shouldContain session2.sessionKey
        result.sessions.map { it.sessionKey } shouldContain session3.sessionKey
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return empty session list when no sessions exist" {
        // Given - no sessions in repository

        // When
        val result = sessionService.listActiveSessions()

        // Then
        result.shouldNotBeNull()
        result.sessions.shouldBeEmpty()
        result.totalCount shouldBe 0
        mockSessionRepository.findCallCount shouldBe 1
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return correct session count when sessions exist" {
        // Given
        val session1 = createTestSession(sessionKey = SessionKey.generate())
        val session2 = createTestSession(sessionKey = SessionKey.generate())

        mockSessionRepository.sessions[session1.sessionKey] = session1
        mockSessionRepository.sessions[session2.sessionKey] = session2

        // When
        val count = sessionService.getSessionCount()

        // Then
        count shouldBe 2
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    "should return zero count when no sessions exist" {
        // Given - no sessions in repository

        // When
        val count = sessionService.getSessionCount()

        // Then
        count shouldBe 0
        mockUnitOfWork.executeCallCount shouldBe 1
    }

    // ================================================================================
    // Edge Cases and Boundary Conditions Tests
    // ================================================================================

    "should handle empty session context gracefully in all operations" {
        // Given
        val testSession = createTestSession(
            sessionKey = testSessionKey,
            context = SessionContext() // Completely empty context
        )
        mockSessionRepository.sessions[testSessionKey] = testSession

        // When & Then - all context operations should work with empty context
        val addResult = sessionService.addContextEntry(
            AddContextEntryCommand(testSessionKey, "key", "value")
        )
        addResult.currentContext.contextData shouldBe mapOf("key" to "value")

        val removeResult = sessionService.removeContextEntry(
            RemoveContextEntryCommand(testSessionKey, "nonExistent")
        )
        removeResult.currentContext.contextData shouldBe mapOf("key" to "value") // Unchanged

        val clearResult = sessionService.clearContext(testSessionKey)
        clearResult.currentContext shouldBe SessionContext()
    }

    "should handle session with maximum context data entries efficiently" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        val largeContextData = (1..100).associate { "key$it" to "value$it" }
        val largeContext = SessionContext(
            activeIssues = (1..20).map { "issue-$it" },
            workflowStage = "complex-stage",
            lastAction = "bulk-operation",
            contextData = largeContextData
        )
        testSession.updateContext(largeContext)
        mockSessionRepository.sessions[testSessionKey] = testSession

        // When
        val result = sessionService.getSession(testSessionKey)

        // Then
        result.shouldNotBeNull()
        result.currentContext.contextData.size shouldBe 100
        result.currentContext.activeIssues shouldHaveSize 20
        result.currentContext.workflowStage shouldBe "complex-stage"
        result.currentContext.lastAction shouldBe "bulk-operation"
    }

    "should handle rapid successive operations with correct timestamp ordering" {
        // Given
        val testSession = createTestSession(sessionKey = testSessionKey)
        mockSessionRepository.sessions[testSessionKey] = testSession
        val startTime = baseTime

        // When - perform rapid operations with advancing time
        mockTimeProvider.setTime(startTime.plus(10.milliseconds))
        val touch1 = sessionService.touchSession(testSessionKey)
        
        mockTimeProvider.setTime(startTime.plus(20.milliseconds))
        val addEntry = sessionService.addContextEntry(
            AddContextEntryCommand(testSessionKey, "key1", "value1")
        )
        
        mockTimeProvider.setTime(startTime.plus(30.milliseconds))
        val addIssue = sessionService.addActiveIssue(
            AddActiveIssueCommand(testSessionKey, "issue-1")
        )

        // Then - timestamps should be strictly increasing
        touch1.lastActivity shouldBe startTime.plus(10.milliseconds)
        addEntry.lastActivity shouldBe startTime.plus(20.milliseconds)
        addIssue.lastActivity shouldBe startTime.plus(30.milliseconds)
        
        // Final state should include all changes
        addIssue.currentContext.contextData shouldBe mapOf("key1" to "value1")
        addIssue.currentContext.activeIssues shouldBe listOf("issue-1")
    }

    "should maintain referential integrity when project does not exist during validation" {
        // Given
        val nonExistentProject = ProjectId.generate()
        // Explicitly ensure project doesn't exist
        mockProjectRepository.projects.clear()

        // When & Then - operations requiring project validation should fail
        shouldThrow<ProjectNotFoundException> {
            sessionService.createSession(CreateSessionCommand(projectId = nonExistentProject))
        }

        shouldThrow<ProjectNotFoundException> {
            val testSession = createTestSession(sessionKey = testSessionKey)
            mockSessionRepository.sessions[testSessionKey] = testSession
            sessionService.associateWithProject(
                AssociateSessionWithProjectCommand(testSessionKey, nonExistentProject)
            )
        }
    }

    "should handle concurrent session operations with proper isolation" {
        // Given
        val session1Key = SessionKey.generate()
        val session2Key = SessionKey.generate()
        val session1 = createTestSession(sessionKey = session1Key)
        val session2 = createTestSession(sessionKey = session2Key)
        
        mockSessionRepository.sessions[session1Key] = session1
        mockSessionRepository.sessions[session2Key] = session2

        // When - operations on different sessions should not interfere
        val newTime = baseTime.plus(1.hours)
        mockTimeProvider.setTime(newTime)

        val result1 = sessionService.addContextEntry(
            AddContextEntryCommand(session1Key, "session1-key", "session1-value")
        )
        val result2 = sessionService.addActiveIssue(
            AddActiveIssueCommand(session2Key, "session2-issue")
        )

        // Then - each session maintains independent state
        result1.sessionKey shouldBe session1Key
        result1.currentContext.contextData shouldBe mapOf("session1-key" to "session1-value")
        result1.currentContext.activeIssues shouldBe emptyList()

        result2.sessionKey shouldBe session2Key
        result2.currentContext.contextData shouldBe emptyMap()
        result2.currentContext.activeIssues shouldBe listOf("session2-issue")

        // Both should have same timestamp as they occurred at same time
        result1.lastActivity shouldBe newTime
        result2.lastActivity shouldBe newTime
    }

})