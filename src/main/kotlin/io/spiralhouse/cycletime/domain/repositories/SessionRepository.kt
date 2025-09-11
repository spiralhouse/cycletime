package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.Session
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant

/**
 * Repository interface for Session aggregate persistence.
 *
 * Defines the contract for Session persistence operations without coupling
 * to specific infrastructure implementations. This enables testability
 * through dependency injection and follows Domain-Driven Design principles.
 *
 * ## Design Principles:
 * - **Aggregate Root Focus**: All operations work with Session aggregates
 * - **Infrastructure Agnostic**: No dependencies on specific database technologies
 * - **Testability**: Easily mockable for unit testing
 * - **Consistency**: All methods are suspend functions for async compatibility
 *
 * ## Implementation Notes:
 * - Concrete implementations should handle transaction management
 * - Error handling should be consistent across implementations
 * - Performance characteristics may vary by implementation
 */
interface SessionRepository {
    
    /**
     * Finds a session by its unique key.
     *
     * @param sessionKey The unique identifier of the session
     * @return The session if found, null otherwise
     */
    suspend fun findByKey(sessionKey: SessionKey): Session?
    
    /**
     * Finds all sessions associated with a specific project.
     *
     * @param projectId The project identifier
     * @return List of sessions associated with the project
     */
    suspend fun findByProject(projectId: ProjectId): List<Session>
    
    /**
     * Finds sessions that were last active before the specified time.
     *
     * @param before The cutoff time for last activity
     * @return List of sessions expired before the cutoff time
     */
    suspend fun findExpiredSessions(before: Instant): List<Session>
    
    /**
     * Finds sessions that were updated after the specified time.
     *
     * @param since The cutoff time for updates
     * @return List of sessions updated after the cutoff time
     */
    suspend fun findRecentSessions(since: Instant): List<Session>
    
    /**
     * Retrieves all sessions in the system.
     *
     * @return List of all sessions
     */
    suspend fun findAll(): List<Session>
    
    /**
     * Persists a session aggregate.
     *
     * @param session The session to save (create or update)
     */
    suspend fun save(session: Session)
    
    /**
     * Deletes a session by its key.
     *
     * @param sessionKey The key of the session to delete
     */
    suspend fun delete(sessionKey: SessionKey)
    
    /**
     * Deletes all sessions that were last active before the specified time.
     *
     * @param before The cutoff time for last activity
     * @return The number of sessions deleted
     */
    suspend fun deleteExpiredSessions(before: Instant): Int
    
    /**
     * Returns the total count of sessions.
     *
     * @return The number of sessions in the repository
     */
    suspend fun count(): Int
    
    /**
     * Checks if a session exists with the given key.
     *
     * @param sessionKey The session key to check
     * @return true if the session exists, false otherwise
     */
    suspend fun exists(sessionKey: SessionKey): Boolean
}