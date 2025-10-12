package io.spiralhouse.cycletime.unit.mocks

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.SessionDto
import io.spiralhouse.cycletime.application.dto.SessionListDto
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.entities.Session
import io.spiralhouse.cycletime.domain.entities.SessionContext
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant
import kotlin.time.Duration

/**
 * Mock implementation of SessionApplicationService for unit testing.
 *
 * This mock provides a controlled environment for testing SDK transport components
 * without dependencies on the full application service stack or database.
 * It maintains test data in memory and allows for precise control over return values.
 *
 * ## Design Features:
 * - **In-Memory Storage**: Uses mutable collections for test data
 * - **Configurable Behavior**: Methods can be overridden or configured
 * - **Reset Capability**: Clear all test data between tests
 * - **Thread Safety**: Not thread-safe by design - each test gets its own instance
 *
 * ## Usage Pattern:
 * ```kotlin
 * beforeEach {
 *     mockSessionService = MockSessionApplicationService()
 *     // Pre-populate with test data as needed
 *     mockSessionService.addTestSession(testSession)
 * }
 * ```
 *
 * @property timeProvider The time provider for session creation
 */
class MockSessionApplicationService(
    private val timeProvider: TimeProvider = MockTimeProvider()
) {

    // ================================================================================
    // Test Data Storage
    // ================================================================================

    /**
     * In-memory storage for sessions keyed by SessionKey.
     * Direct access allows tests to pre-populate or inspect state.
     */
    private val sessions: MutableMap<SessionKey, Session> = mutableMapOf()

    /**
     * Counter for tracking method calls during testing.
     */
    var createSessionCallCount: Int = 0
    var getSessionCallCount: Int = 0

    // ================================================================================
    // SessionApplicationService Interface Implementation
    // ================================================================================

    suspend fun createSession(command: CreateSessionCommand): SessionDto {
        createSessionCallCount++
        val session = Session.create(
            projectId = command.projectId,
            timeProvider = timeProvider
        )
        sessions[session.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun getSession(sessionKey: SessionKey): SessionDto? {
        getSessionCallCount++
        return sessions[sessionKey]?.let { SessionDto.fromSession(it) }
    }

    suspend fun updateSessionContext(command: UpdateSessionContextCommand): SessionDto {
        val session = sessions[command.sessionKey]
            ?: throw IllegalStateException("Session not found: ${command.sessionKey}")
        session.updateContext(command.context)
        sessions[command.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun deleteSession(sessionKey: SessionKey) {
        sessions.remove(sessionKey)
    }

    suspend fun touchSession(sessionKey: SessionKey): SessionDto {
        val session = sessions[sessionKey]
            ?: throw IllegalStateException("Session not found: $sessionKey")
        session.touch()
        sessions[sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun associateWithProject(command: AssociateSessionWithProjectCommand): SessionDto {
        val session = sessions[command.sessionKey]
            ?: throw IllegalStateException("Session not found: ${command.sessionKey}")
        session.setProject(command.projectId)
        sessions[command.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun disassociateFromProject(sessionKey: SessionKey): SessionDto {
        val session = sessions[sessionKey]
            ?: throw IllegalStateException("Session not found: $sessionKey")
        session.setProject(null)
        sessions[sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun findSessionsByProject(projectId: ProjectId): List<SessionDto> {
        return sessions.values
            .filter { it.projectId == projectId }
            .map { SessionDto.fromSession(it) }
    }

    suspend fun addContextEntry(command: AddContextEntryCommand): SessionDto {
        val session = sessions[command.sessionKey]
            ?: throw IllegalStateException("Session not found: ${command.sessionKey}")
        session.updateContextData(command.key, command.value)
        sessions[command.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun updateContextEntry(command: UpdateContextEntryCommand): SessionDto {
        return addContextEntry(
            AddContextEntryCommand(
                sessionKey = command.sessionKey,
                key = command.key,
                value = command.value
            )
        )
    }

    suspend fun removeContextEntry(command: RemoveContextEntryCommand): SessionDto {
        val session = sessions[command.sessionKey]
            ?: throw IllegalStateException("Session not found: ${command.sessionKey}")
        session.removeContextData(command.key)
        sessions[command.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun clearContext(sessionKey: SessionKey): SessionDto {
        val session = sessions[sessionKey]
            ?: throw IllegalStateException("Session not found: $sessionKey")
        session.updateContext(SessionContext())
        sessions[sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun addActiveIssue(command: AddActiveIssueCommand): SessionDto {
        val session = sessions[command.sessionKey]
            ?: throw IllegalStateException("Session not found: ${command.sessionKey}")
        session.addActiveIssue(command.issueId)
        sessions[command.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun removeActiveIssue(command: RemoveActiveIssueCommand): SessionDto {
        val session = sessions[command.sessionKey]
            ?: throw IllegalStateException("Session not found: ${command.sessionKey}")
        session.removeActiveIssue(command.issueId)
        sessions[command.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun setWorkflowStage(command: SetWorkflowStageCommand): SessionDto {
        val session = sessions[command.sessionKey]
            ?: throw IllegalStateException("Session not found: ${command.sessionKey}")
        session.setWorkflowStage(command.stage)
        sessions[command.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun setLastAction(command: SetLastActionCommand): SessionDto {
        val session = sessions[command.sessionKey]
            ?: throw IllegalStateException("Session not found: ${command.sessionKey}")
        session.setLastAction(command.action)
        sessions[command.sessionKey] = session
        return SessionDto.fromSession(session)
    }

    suspend fun findExpiredSessions(maxAge: Duration): List<SessionDto> {
        val cutoffTime = timeProvider.now() - maxAge
        return sessions.values
            .filter { it.lastActivity < cutoffTime }
            .map { SessionDto.fromSession(it) }
    }

    suspend fun cleanupExpiredSessions(maxAge: Duration): Int {
        val cutoffTime = timeProvider.now() - maxAge
        val expiredSessions = sessions.values.filter { it.lastActivity < cutoffTime }
        expiredSessions.forEach { sessions.remove(it.sessionKey) }
        return expiredSessions.size
    }

    suspend fun listActiveSessions(limit: Int? = null, offset: Int? = null): SessionListDto {
        val allSessions = sessions.values.toList()
        val paginatedSessions = when {
            limit != null && offset != null -> allSessions.drop(offset).take(limit)
            limit != null -> allSessions.take(limit)
            offset != null -> allSessions.drop(offset)
            else -> allSessions
        }
        return SessionListDto(
            sessions = paginatedSessions.map { SessionDto.fromSession(it) },
            totalCount = allSessions.size
        )
    }

    suspend fun getSessionCount(): Int {
        return sessions.size
    }

    suspend fun findRecentSessions(since: Instant): List<SessionDto> {
        return sessions.values
            .filter { it.updatedAt > since }
            .map { SessionDto.fromSession(it) }
    }

    // ================================================================================
    // Test Utilities
    // ================================================================================

    /**
     * Resets all test data and counters to initial state.
     * Call this in beforeEach to ensure test isolation.
     */
    fun reset() {
        sessions.clear()
        createSessionCallCount = 0
        getSessionCallCount = 0
    }

    /**
     * Pre-populates the repository with a test session.
     * Convenience method for test setup.
     */
    fun addTestSession(session: Session) {
        sessions[session.sessionKey] = session
    }

    /**
     * Pre-populates the repository with a test session by key.
     * Convenience method for test setup.
     */
    fun addTestSessionByKey(sessionKey: SessionKey, session: Session) {
        sessions[sessionKey] = session
    }

    /**
     * Returns the total number of sessions stored.
     */
    fun getSessionsCount(): Int {
        return sessions.size
    }
}
