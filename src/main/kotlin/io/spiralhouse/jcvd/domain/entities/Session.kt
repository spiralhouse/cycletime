package io.spiralhouse.jcvd.domain.entities

import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import kotlin.time.Duration
import kotlin.time.Duration.Companion.days

/**
 * Context data associated with a Session.
 * Contains workflow state, active issues, and custom key-value data.
 */
@Serializable
data class SessionContext(
    val activeIssues: List<String> = emptyList(),
    val workflowStage: String? = null,
    val lastAction: String? = null,
    val contextData: Map<String, String> = emptyMap()
)

/**
 * Immutable snapshot of a Session entity's state.
 * Used for persistence and serialization without exposing internal mutability.
 */
@Serializable
data class SessionSnapshot(
    val sessionKey: SessionKey,
    val projectId: ProjectId?,
    val currentContext: SessionContext,
    val lastActivity: Instant,
    val createdAt: Instant,
    val updatedAt: Instant
)

/**
 * Domain entity representing a user Session with rich business logic.
 * 
 * A Session manages user context, tracks activity, and enforces expiration rules.
 * It can be associated with a Project and maintains workflow state.
 * 
 * This entity follows Domain-Driven Design principles with:
 * - Factory methods for controlled instantiation
 * - Encapsulated state with business rule enforcement
 * - Snapshot pattern for persistence
 * - Explicit TimeProvider dependency for testability
 */
class Session private constructor(
    val sessionKey: SessionKey,
    private var _projectId: ProjectId?,
    private var _currentContext: SessionContext,
    private var _lastActivity: Instant,
    val createdAt: Instant,
    private var _updatedAt: Instant,
    private val timeProvider: TimeProvider
) {
    val projectId: ProjectId? get() = _projectId
    val currentContext: SessionContext get() = _currentContext
    val lastActivity: Instant get() = _lastActivity
    val updatedAt: Instant get() = _updatedAt

    /**
     * Updates the session context with new data.
     * 
     * @param updates The new context to set
     */
    fun updateContext(updates: SessionContext) {
        _currentContext = updates
        touch()
    }

    /**
     * Updates the session context using a transformation function.
     * 
     * @param block A function that transforms the current context
     */
    fun updateContext(block: SessionContext.() -> SessionContext) {
        _currentContext = block(_currentContext)
        touch()
    }

    /**
     * Associates or disassociates this session with a project.
     * 
     * @param projectId The project ID to associate with, or null to disassociate
     */
    fun setProject(projectId: ProjectId?) {
        _projectId = projectId
        touch()
    }

    /**
     * Updates the last activity timestamp to the current time.
     * This method is called automatically when the session state changes.
     */
    fun touch() {
        val now = timeProvider.now()
        _lastActivity = now
        _updatedAt = now
    }

    /**
     * Checks if the session has expired based on the last activity time.
     * 
     * @param maxAge The maximum age before a session is considered expired
     * @return true if the session has expired, false otherwise
     */
    fun isExpired(maxAge: Duration = DEFAULT_MAX_AGE): Boolean {
        val now = timeProvider.now()
        val age = now - _lastActivity
        return age >= maxAge
    }

    /**
     * Adds an issue to the list of active issues in this session.
     * Duplicate issues are ignored.
     * 
     * @param issueId The ID of the issue to add
     */
    fun addActiveIssue(issueId: String) {
        if (issueId !in _currentContext.activeIssues) {
            _currentContext = _currentContext.copy(
                activeIssues = _currentContext.activeIssues + issueId
            )
            touch()
        }
    }

    /**
     * Removes an issue from the list of active issues.
     * 
     * @param issueId The ID of the issue to remove
     */
    fun removeActiveIssue(issueId: String) {
        _currentContext = _currentContext.copy(
            activeIssues = _currentContext.activeIssues - issueId
        )
        touch()
    }

    /**
     * Sets the current workflow stage.
     * 
     * @param stage The workflow stage name, or null to clear
     */
    fun setWorkflowStage(stage: String?) {
        _currentContext = _currentContext.copy(workflowStage = stage)
        touch()
    }

    /**
     * Sets the last action performed in this session.
     * 
     * @param action The action description, or null to clear
     */
    fun setLastAction(action: String?) {
        _currentContext = _currentContext.copy(lastAction = action)
        touch()
    }

    /**
     * Adds or updates a key-value pair in the context data.
     * 
     * @param key The key to set
     * @param value The value to associate with the key
     */
    fun updateContextData(key: String, value: String) {
        _currentContext = _currentContext.copy(
            contextData = _currentContext.contextData + (key to value)
        )
        touch()
    }

    /**
     * Removes a key-value pair from the context data.
     * 
     * @param key The key to remove
     */
    fun removeContextData(key: String) {
        _currentContext = _currentContext.copy(
            contextData = _currentContext.contextData - key
        )
        touch()
    }

    /**
     * Creates an immutable snapshot of the current session state.
     * 
     * @return A SessionSnapshot containing the current state
     */
    fun toSnapshot(): SessionSnapshot {
        return SessionSnapshot(
            sessionKey = sessionKey,
            projectId = _projectId,
            currentContext = _currentContext,
            lastActivity = _lastActivity,
            createdAt = createdAt,
            updatedAt = _updatedAt
        )
    }

    companion object {
        /**
         * Default maximum age for sessions before they are considered expired.
         */
        val DEFAULT_MAX_AGE: Duration = 7.days

        /**
         * Factory method to create a new Session.
         * 
         * @param projectId Optional project to associate with the session
         * @param timeProvider Time provider for timestamps
         * @return A new Session instance
         * @throws IllegalArgumentException if timeProvider is null
         */
        fun create(
            projectId: ProjectId? = null,
            timeProvider: TimeProvider?
        ): Session {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }
            
            val now = timeProvider.now()
            return Session(
                sessionKey = SessionKey.generate(),
                _projectId = projectId,
                _currentContext = SessionContext(),
                _lastActivity = now,
                createdAt = now,
                _updatedAt = now,
                timeProvider = timeProvider
            )
        }

        /**
         * Factory method to create a Session with a specific key.
         * Used primarily for testing or when a specific session key is required.
         * 
         * @param sessionKey The specific session key to use
         * @param projectId Optional project to associate with the session
         * @param currentContext Initial context for the session
         * @param timeProvider Time provider for timestamps
         * @return A new Session instance
         * @throws IllegalArgumentException if timeProvider is null
         */
        fun createWithKey(
            sessionKey: SessionKey,
            projectId: ProjectId? = null,
            currentContext: SessionContext = SessionContext(),
            timeProvider: TimeProvider?
        ): Session {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }
            
            val now = timeProvider.now()
            return Session(
                sessionKey = sessionKey,
                _projectId = projectId,
                _currentContext = currentContext,
                _lastActivity = now,
                createdAt = now,
                _updatedAt = now,
                timeProvider = timeProvider
            )
        }

        /**
         * Reconstitutes a Session from a snapshot.
         * 
         * @param snapshot The snapshot to reconstitute from
         * @param timeProvider Time provider for timestamps
         * @return A Session instance with the snapshot's state
         * @throws IllegalArgumentException if timeProvider is null
         */
        fun fromSnapshot(
            snapshot: SessionSnapshot,
            timeProvider: TimeProvider?
        ): Session {
            requireNotNull(timeProvider) { "TimeProvider cannot be null" }
            
            return Session(
                sessionKey = snapshot.sessionKey,
                _projectId = snapshot.projectId,
                _currentContext = snapshot.currentContext,
                _lastActivity = snapshot.lastActivity,
                createdAt = snapshot.createdAt,
                _updatedAt = snapshot.updatedAt,
                timeProvider = timeProvider
            )
        }
    }
}