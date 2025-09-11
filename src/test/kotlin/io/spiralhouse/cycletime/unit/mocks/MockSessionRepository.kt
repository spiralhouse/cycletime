package io.spiralhouse.cycletime.unit.mocks

import io.spiralhouse.cycletime.domain.entities.Session
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.Database

/**
 * Mock implementation of SessionRepository for unit testing.
 *
 * This mock provides a controlled environment for testing Application Services
 * without dependencies on the database or Exposed ORM. It maintains test data
 * in memory and allows for precise control over return values and behavior.
 *
 * ## Design Features:
 * - **Constructor Compatibility**: Matches ExposedSessionRepository constructor
 * - **In-Memory Storage**: Uses mutable collections for test data
 * - **Configurable Behavior**: Methods can be overridden to return specific values
 * - **Reset Capability**: Clear all test data between tests
 * - **Thread Safety**: Not thread-safe by design - each test gets its own instance
 *
 * ## Usage Pattern:
 * ```kotlin
 * beforeEach {
 *     mockSessionRepository = MockSessionRepository()
 *     // Pre-populate with test data as needed
 *     mockSessionRepository.sessions["key1"] = testSession
 * }
 * ```
 *
 * @property timeProvider The time provider for entity reconstitution (unused in mock)
 * @property database The database reference (unused in mock)
 */
class MockSessionRepository(
    private val timeProvider: TimeProvider? = null,
    private val database: Database? = null
) : SessionRepository {
    
    // ================================================================================
    // Test Data Storage
    // ================================================================================
    
    /**
     * In-memory storage for sessions keyed by SessionKey.
     * Direct access allows tests to pre-populate or inspect state.
     */
    val sessions: MutableMap<SessionKey, Session> = mutableMapOf()
    
    /**
     * Storage for sessions by project ID for efficient project-based queries.
     * Automatically maintained by save() operations.
     */
    val sessionsByProject: MutableMap<ProjectId, MutableList<Session>> = mutableMapOf()
    
    /**
     * Counter for tracking method calls during testing.
     */
    var saveCallCount: Int = 0
    var deleteCallCount: Int = 0
    var findCallCount: Int = 0
    
    // ================================================================================
    // Repository Interface Implementation
    // ================================================================================
    
    override suspend fun findByKey(sessionKey: SessionKey): Session? {
        findCallCount++
        return sessions[sessionKey]
    }
    
    override suspend fun findByProject(projectId: ProjectId): List<Session> {
        findCallCount++
        return sessionsByProject[projectId]?.toList() ?: emptyList()
    }
    
    override suspend fun findExpiredSessions(before: Instant): List<Session> {
        findCallCount++
        return sessions.values.filter { it.lastActivity < before }
    }
    
    override suspend fun save(session: Session) {
        saveCallCount++
        sessions[session.sessionKey] = session
        
        // Update project index
        session.projectId?.let { projectId ->
            sessionsByProject.getOrPut(projectId) { mutableListOf() }.apply {
                // Remove existing entry for this session (for updates)
                removeAll { it.sessionKey == session.sessionKey }
                // Add the updated session
                add(session)
            }
        }
    }
    
    override suspend fun delete(sessionKey: SessionKey) {
        deleteCallCount++
        val session = sessions.remove(sessionKey)
        
        // Remove from project index
        session?.projectId?.let { projectId ->
            sessionsByProject[projectId]?.removeAll { it.sessionKey == sessionKey }
        }
    }
    
    override suspend fun deleteExpiredSessions(before: Instant): Int {
        deleteCallCount++
        val expiredSessions = sessions.values.filter { it.lastActivity < before }
        
        expiredSessions.forEach { session ->
            sessions.remove(session.sessionKey)
            
            // Remove from project index
            session.projectId?.let { projectId ->
                sessionsByProject[projectId]?.removeAll { it.sessionKey == session.sessionKey }
            }
        }
        
        return expiredSessions.size
    }
    
    override suspend fun findAll(): List<Session> {
        findCallCount++
        return sessions.values.toList()
    }
    
    override suspend fun findRecentSessions(since: Instant): List<Session> {
        findCallCount++
        return sessions.values.filter { it.updatedAt > since }
    }
    
    override suspend fun count(): Int {
        return sessions.size
    }
    
    override suspend fun exists(sessionKey: SessionKey): Boolean {
        return sessions.containsKey(sessionKey)
    }
    
    suspend fun saveAll(sessions: List<Session>) {
        saveCallCount++
        sessions.forEach { session ->
            save(session)
        }
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
        sessionsByProject.clear()
        saveCallCount = 0
        deleteCallCount = 0
        findCallCount = 0
    }
    
    /**
     * Pre-populates the repository with test sessions.
     * Convenience method for test setup.
     */
    fun addTestSessions(vararg sessions: Session) {
        sessions.forEach { session ->
            this.sessions[session.sessionKey] = session
            
            session.projectId?.let { projectId ->
                sessionsByProject.getOrPut(projectId) { mutableListOf() }.add(session)
            }
        }
    }
    
    /**
     * Returns the total number of method calls made to this mock.
     * Useful for verifying expected interaction patterns.
     */
    fun getTotalCallCount(): Int {
        return saveCallCount + deleteCallCount + findCallCount
    }
}