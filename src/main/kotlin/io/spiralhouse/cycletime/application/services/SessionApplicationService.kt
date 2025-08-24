package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.SessionDto
import io.spiralhouse.cycletime.application.dto.SessionListDto
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.application.exceptions.SessionNotFoundException
import io.spiralhouse.cycletime.domain.entities.Session
import io.spiralhouse.cycletime.domain.entities.SessionContext
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant
import org.slf4j.LoggerFactory
import kotlin.time.Duration
import kotlin.time.Duration.Companion.days

/**
 * Application service for managing Session operations.
 *
 * This service acts as the orchestration layer between the domain and infrastructure,
 * coordinating complex business operations while maintaining transactional integrity
 * through the Unit of Work pattern. It enforces business rules, handles cross-aggregate
 * operations, and translates between domain entities and DTOs.
 *
 * ## Responsibilities:
 * - **Use Case Orchestration**: Each public method represents a complete use case
 * - **Transaction Management**: Ensures all operations within a use case are atomic
 * - **Domain Coordination**: Orchestrates operations across Session and Project aggregates
 * - **DTO Translation**: Converts between domain entities and application DTOs
 * - **Business Rule Enforcement**: Validates commands and enforces application-level rules
 *
 * ## Design Patterns:
 * - **Unit of Work**: All operations wrapped in transactional boundaries
 * - **Command Pattern**: Uses command objects for complex operations
 * - **Repository Pattern**: Delegates persistence to repository interfaces
 * - **DTO Pattern**: Never exposes domain entities directly
 *
 * ## Thread Safety:
 * All methods are suspend functions designed for concurrent access.
 * The Unit of Work ensures transactional isolation between operations.
 *
 * ## Performance Characteristics:
 * - **Single aggregate loads per operation** (no N+1 queries)
 * - **Optimized context operations** using domain methods
 * - **Batch operations** for cleanup and expiration management
 * - **Transaction scope minimized** to reduce lock contention
 * - **Efficient existence checks** without loading full entities
 *
 * ## Session Lifecycle Management:
 * - **Creation**: Auto-generates unique SessionKey with UUID v4
 * - **Activity Tracking**: Automatic timestamp updates on any modification
 * - **Expiration**: Configurable max age with efficient batch cleanup
 * - **Context Management**: Flexible key-value storage with JSON serialization
 *
 * @property sessionRepository Repository for Session aggregate persistence
 * @property projectRepository Repository for Project aggregate persistence
 * @property unitOfWork Transaction coordinator ensuring atomic operations
 * @property timeProvider Time provider for consistent temporal operations
 *
 * @constructor Creates a new SessionApplicationService with required dependencies
 */
class SessionApplicationService(
    private val sessionRepository: SessionRepository,
    private val projectRepository: ProjectRepository,
    private val unitOfWork: UnitOfWork,
    private val timeProvider: TimeProvider
) : ApplicationServiceBase() {

    private val logger = LoggerFactory.getLogger(SessionApplicationService::class.java)

    // ================================================================================
    // Session Creation and Basic Operations
    // ================================================================================

    /**
     * Creates a new session with the specified attributes.
     *
     * This operation creates a new Session aggregate and optionally associates
     * it with a project. The session is immediately persisted within a transactional boundary.
     *
     * ## Business Rules:
     * - Project must exist if projectId is provided
     * - Session key is auto-generated using UUID v4
     * - New sessions start with empty context
     * - Timestamps (createdAt, updatedAt, lastActivity) are set to current time
     *
     * ## Transactional Guarantees:
     * - Session creation is atomic - either fully succeeds or rolls back
     * - Project existence validation occurs within transaction
     *
     * @param command Command containing optional project ID
     * @return SessionDto representing the created session with generated key
     * @throws ProjectNotFoundException if project ID is provided but doesn't exist
     */
    suspend fun createSession(command: CreateSessionCommand): SessionDto {
        return unitOfWork.execute {
            // Validate project exists if provided
            command.projectId?.let { projectId ->
                ensureProjectExists(projectId)
            }

            val session = Session.create(
                projectId = command.projectId,
                timeProvider = timeProvider
            )

            logger.debug("Created new session with key: ${session.sessionKey.value}")

            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Retrieves a session by its unique key.
     *
     * This is a read-only operation that returns the current state of a session
     * including all context data. Returns null if the session doesn't exist.
     *
     * @param sessionKey The unique identifier of the session to retrieve
     * @return SessionDto if found, null otherwise
     */
    suspend fun getSession(sessionKey: SessionKey): SessionDto? {
        return unitOfWork.execute {
            sessionRepository.findByKey(sessionKey)?.let { session ->
                SessionDto.fromSession(session)
            }
        }
    }

    /**
     * Updates an existing session's context.
     *
     * Replaces the entire context with the provided data. The lastActivity
     * timestamp is automatically updated to current time.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - Context replacement is atomic
     * - LastActivity and updatedAt are automatically updated
     *
     * @param command Command containing session key and new context
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun updateSessionContext(command: UpdateSessionContextCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)

            session.updateContext(command.context)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Permanently deletes a session from the system.
     *
     * This is a destructive operation that cannot be undone. The operation
     * is idempotent - deleting a non-existent session does not throw an error.
     *
     * ## Business Rules:
     * - No error if session doesn't exist (idempotent operation)
     * - No recovery possible after deletion
     *
     * @param sessionKey The key of the session to delete
     */
    suspend fun deleteSession(sessionKey: SessionKey) {
        unitOfWork.execute {
            sessionRepository.delete(sessionKey)
        }
    }

    // ================================================================================
    // Session Activity and Lifecycle Management
    // ================================================================================

    /**
     * Updates the last activity timestamp of a session.
     *
     * This operation "touches" the session to indicate recent activity,
     * extending its effective lifetime for expiration calculations.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - Only lastActivity and updatedAt timestamps are modified
     * - Context and other session data remain unchanged
     *
     * @param sessionKey The key of the session to touch
     * @return SessionDto representing the touched session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun touchSession(sessionKey: SessionKey): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(sessionKey)

            session.touch()
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    // ================================================================================
    // Project Association Management
    // ================================================================================

    /**
     * Associates a session with a project.
     *
     * Creates or updates the association between a session and project.
     * The project must exist for the association to be created.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - Project must exist or ProjectNotFoundException is thrown
     * - Previous project association is replaced
     * - LastActivity timestamp is updated
     *
     * @param command Command containing session key and project ID
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     * @throws ProjectNotFoundException if the project doesn't exist
     */
    suspend fun associateWithProject(command: AssociateSessionWithProjectCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)
            ensureProjectExists(command.projectId)

            session.setProject(command.projectId)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Disassociates a session from its current project.
     *
     * Removes the project association while preserving all other session data.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - No error if session wasn't associated with a project
     * - LastActivity timestamp is updated
     *
     * @param sessionKey The key of the session to disassociate
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun disassociateFromProject(sessionKey: SessionKey): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(sessionKey)

            session.setProject(null)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Finds all sessions associated with a specific project.
     *
     * Returns sessions that are currently associated with the given project.
     * Results are ordered by creation date.
     *
     * @param projectId The project ID to search for
     * @return List of SessionDto associated with the project
     */
    suspend fun findSessionsByProject(projectId: ProjectId): List<SessionDto> {
        return unitOfWork.execute {
            sessionRepository.findByProject(projectId)
                .map { session -> SessionDto.fromSession(session) }
        }
    }

    // ================================================================================
    // Session Context Management
    // ================================================================================

    /**
     * Adds a key-value entry to the session context.
     *
     * If the key already exists, its value is updated. The operation
     * automatically updates the lastActivity timestamp.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - Key overwrites existing value if present
     * - LastActivity timestamp is updated
     *
     * ## Performance Note:
     * This operation performs a targeted update to a single context entry,
     * avoiding full context replacement for better efficiency.
     *
     * @param command Command containing session key, entry key and value
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun addContextEntry(command: AddContextEntryCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)

            session.updateContextData(command.key, command.value)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Updates an existing context entry in the session.
     *
     * This operation is semantically identical to addContextEntry but provides
     * clearer intent when updating existing keys. Both operations perform
     * the same key-value update functionality.
     *
     * ## Implementation Note:
     * Delegates to the same domain method as addContextEntry for consistency
     * and to avoid code duplication.
     *
     * @param command Command containing session key, entry key and new value
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun updateContextEntry(command: UpdateContextEntryCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)

            session.updateContextData(command.key, command.value)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Removes a key-value entry from the session context.
     *
     * The operation is idempotent - removing a non-existent key does not
     * cause an error. The lastActivity timestamp is updated.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - No error if key doesn't exist (idempotent operation)
     * - LastActivity timestamp is updated
     *
     * @param command Command containing session key and entry key to remove
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun removeContextEntry(command: RemoveContextEntryCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)

            session.removeContextData(command.key)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Clears all context data from a session.
     *
     * Resets the session context to an empty state while preserving
     * the session key, project association, and timestamps.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - All context data is removed (activeIssues, workflowStage, lastAction, contextData)
     * - LastActivity timestamp is updated
     *
     * ## Implementation Detail:
     * Uses the functional update pattern to ensure atomic context replacement
     * within the domain entity.
     *
     * @param sessionKey The key of the session to clear
     * @return SessionDto representing the cleared session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun clearContext(sessionKey: SessionKey): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(sessionKey)

            session.updateContext(SessionContext()) // Reset to empty context
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    // ================================================================================
    // Issue and Workflow Management
    // ================================================================================

    /**
     * Adds an issue to the session's active issues list.
     *
     * Manages a list of currently active issue IDs within the session context.
     * Duplicate issues are automatically prevented by domain logic.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - Duplicate issue IDs are ignored (idempotent operation)
     * - LastActivity timestamp is updated
     *
     * ## Performance Optimization:
     * The domain entity maintains active issues as a List but checks for duplicates
     * before adding. Consider migrating to Set if duplicate checking becomes a bottleneck
     * with large numbers of active issues.
     *
     * @param command Command containing session key and issue ID
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun addActiveIssue(command: AddActiveIssueCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)

            session.addActiveIssue(command.issueId)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Removes an issue from the session's active issues list.
     *
     * The operation is idempotent - removing a non-existent issue does not
     * cause an error.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - No error if issue ID doesn't exist (idempotent operation)
     * - LastActivity timestamp is updated
     *
     * @param command Command containing session key and issue ID to remove
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun removeActiveIssue(command: RemoveActiveIssueCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)

            session.removeActiveIssue(command.issueId)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Sets the current workflow stage for a session.
     *
     * Updates the workflow stage context field to track the current
     * development phase or process step.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - Null stage value clears the current stage
     * - LastActivity timestamp is updated
     *
     * @param command Command containing session key and stage name
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun setWorkflowStage(command: SetWorkflowStageCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)

            session.setWorkflowStage(command.stage)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    /**
     * Sets the last action performed in a session.
     *
     * Updates the lastAction context field to track the most recent
     * significant activity or operation.
     *
     * ## Business Rules:
     * - Session must exist or SessionNotFoundException is thrown
     * - Null action value clears the current action
     * - LastActivity timestamp is updated
     *
     * @param command Command containing session key and action description
     * @return SessionDto representing the updated session state
     * @throws SessionNotFoundException if the session doesn't exist
     */
    suspend fun setLastAction(command: SetLastActionCommand): SessionDto {
        return unitOfWork.execute {
            val session = loadSessionOrThrow(command.sessionKey)

            session.setLastAction(command.action)
            sessionRepository.save(session)
            SessionDto.fromSession(session)
        }
    }

    // ================================================================================
    // Session Expiration and Cleanup
    // ================================================================================

    /**
     * Finds sessions that have expired based on the maximum age.
     *
     * Returns sessions whose lastActivity timestamp indicates they have
     * exceeded the specified maximum age duration.
     *
     * ## Implementation:
     * Calculates cutoff time as (current time - maxAge) and finds sessions
     * with lastActivity before this cutoff.
     *
     * ## Use Cases:
     * - Audit reporting of expired sessions before cleanup
     * - Notification systems for session expiration warnings
     * - Analytics on session lifetime patterns
     *
     * @param maxAge The maximum age before a session is considered expired
     * @return List of SessionDto representing expired sessions
     */
    suspend fun findExpiredSessions(maxAge: Duration): List<SessionDto> {
        return unitOfWork.execute {
            val cutoffTime = calculateExpirationCutoff(maxAge)
            sessionRepository.findExpiredSessions(cutoffTime)
                .map { session -> SessionDto.fromSession(session) }
        }
    }

    /**
     * Deletes all sessions that have expired based on the maximum age.
     *
     * This method performs a batch deletion of expired sessions in a single
     * database operation for optimal performance.
     *
     * ## Implementation:
     * Calculates cutoff time as (current time - maxAge) and deletes sessions
     * with lastActivity before this cutoff.
     *
     * ## Performance Considerations:
     * - Uses batch deletion at the repository level for efficiency
     * - Single database transaction for all deletions
     * - No entity loading required - deletion performed directly via SQL
     * - Consider scheduling during low-traffic periods for large datasets
     *
     * @param maxAge The maximum age before a session is considered expired
     * @return The number of sessions deleted
     */
    suspend fun cleanupExpiredSessions(maxAge: Duration): Int {
        return unitOfWork.execute {
            val cutoffTime = calculateExpirationCutoff(maxAge)
            sessionRepository.deleteExpiredSessions(cutoffTime)
        }
    }

    // ================================================================================
    // Session Querying and Analytics
    // ================================================================================

    /**
     * Retrieves all active sessions in the system.
     *
     * Returns a complete list of all sessions regardless of project association
     * or expiration status. Sessions are returned in their natural repository
     * order (typically by creation date).
     *
     * ## Performance Considerations:
     * - **Loads all sessions into memory** - consider pagination for large datasets
     * - Each session includes its full context data (JSON deserialization cost)
     * - For large deployments, consider implementing:
     *   - Pagination with limit/offset parameters
     *   - Streaming results for memory efficiency
     *   - Optional context loading (lazy loading pattern)
     *
     * @return SessionListDto containing all sessions and total count
     */
    suspend fun listActiveSessions(): SessionListDto {
        return unitOfWork.execute {
            val sessions = sessionRepository.findAll()
            SessionListDto.fromSessions(sessions)
        }
    }

    /**
     * Returns the total count of sessions in the system.
     *
     * Provides an efficient count operation without loading session data.
     *
     * @return The total number of sessions
     */
    suspend fun getSessionCount(): Int {
        return unitOfWork.execute {
            sessionRepository.count()
        }
    }

    /**
     * Finds sessions that have been updated since a specific time.
     *
     * Returns sessions whose updatedAt timestamp is after the specified cutoff.
     * Useful for finding recently active sessions.
     *
     * @param since The cutoff instant - sessions updated after this time are returned
     * @return List of SessionDto representing recent sessions
     */
    suspend fun findRecentSessions(since: Instant): List<SessionDto> {
        return unitOfWork.execute {
            sessionRepository.findRecentSessions(since)
                .map { session -> SessionDto.fromSession(session) }
        }
    }

    // ================================================================================
    // Private Helper Methods
    // ================================================================================

    /**
     * Loads a session by key or throws SessionNotFoundException.
     *
     * Centralizes the common pattern of loading a session and handling
     * the not-found case with a consistent exception.
     *
     * @param sessionKey The key of the session to load
     * @return The loaded session entity
     * @throws SessionNotFoundException if the session doesn't exist
     */
    private suspend fun loadSessionOrThrow(sessionKey: SessionKey): Session {
        return sessionRepository.findByKey(sessionKey)
            ?: throw SessionNotFoundException(sessionKey)
    }

    /**
     * Ensures a project exists without loading the full entity.
     *
     * More efficient than loading when only existence check is needed.
     * Uses the repository's optimized exists() method which performs
     * a SELECT 1 query instead of loading the full entity.
     *
     * @param projectId The ID of the project to check
     * @throws ProjectNotFoundException if the project doesn't exist
     */
    private suspend fun ensureProjectExists(projectId: ProjectId) {
        if (!projectRepository.exists(projectId)) {
            throw ProjectNotFoundException(projectId)
        }
    }

    /**
     * Calculates the expiration cutoff timestamp.
     *
     * Centralizes the calculation of expiration time for consistency
     * across all expiration-related operations.
     *
     * @param maxAge The maximum age duration
     * @return The cutoff instant before which sessions are considered expired
     */
    private fun calculateExpirationCutoff(maxAge: Duration): Instant {
        return timeProvider.now() - maxAge
    }

    // ================================================================================
    // Companion Object - Constants and Factory Methods
    // ================================================================================

    companion object {
        /**
         * Default maximum age for session expiration.
         * Sessions older than this are considered expired.
         */
        val DEFAULT_SESSION_MAX_AGE = 7.days

        /**
         * Maximum number of active issues recommended per session.
         * Beyond this, performance may degrade.
         */
        const val MAX_ACTIVE_ISSUES_RECOMMENDED = 100

        /**
         * Maximum size of context data map recommended.
         * Beyond this, consider using a different storage mechanism.
         */
        const val MAX_CONTEXT_ENTRIES_RECOMMENDED = 500

        /**
         * Maximum length of individual context values.
         * Longer values should be stored externally and referenced.
         */
        const val MAX_CONTEXT_VALUE_LENGTH = 10000
    }
}
