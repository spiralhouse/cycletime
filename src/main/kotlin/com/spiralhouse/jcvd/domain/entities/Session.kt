package com.spiralhouse.jcvd.domain.entities

import com.spiralhouse.jcvd.domain.services.TimeProvider
import com.spiralhouse.jcvd.domain.valueobjects.ProjectId
import com.spiralhouse.jcvd.domain.valueobjects.SessionKey
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import kotlin.time.Duration
import kotlin.time.Duration.Companion.days

@Serializable
data class SessionContext(
    val activeIssues: List<String> = emptyList(),
    val workflowStage: String? = null,
    val lastAction: String? = null,
    val contextData: Map<String, String> = emptyMap()
)

data class Session(
    val sessionKey: SessionKey,
    private var _projectId: ProjectId? = null,
    private var _currentContext: SessionContext = SessionContext(),
    private var _lastActivity: Instant,
    val createdAt: Instant,
    var updatedAt: Instant,
    private val timeProvider: TimeProvider = object : TimeProvider {
        override fun now(): Instant = Clock.System.now()
    }
) {
    val projectId: ProjectId? get() = _projectId
    val currentContext: SessionContext get() = _currentContext
    val lastActivity: Instant get() = _lastActivity
    
    constructor(
        sessionKey: SessionKey,
        projectId: ProjectId? = null,
        currentContext: SessionContext = SessionContext(),
        timeProvider: TimeProvider = object : TimeProvider {
            override fun now(): Instant = Clock.System.now()
        }
    ) : this(
        sessionKey = sessionKey,
        _projectId = projectId,
        _currentContext = currentContext,
        _lastActivity = timeProvider.now(),
        createdAt = timeProvider.now(),
        updatedAt = timeProvider.now(),
        timeProvider = timeProvider
    )
    
    fun updateContext(updates: SessionContext) {
        _currentContext = updates
        touch()
    }
    
    fun updateContext(block: SessionContext.() -> SessionContext) {
        _currentContext = block(_currentContext)
        touch()
    }
    
    fun setProject(projectId: ProjectId?) {
        _projectId = projectId
        touch()
    }
    
    fun touch() {
        _lastActivity = timeProvider.now()
        updatedAt = timeProvider.now()
    }
    
    fun isExpired(maxAge: Duration = 7.days): Boolean {
        val now = timeProvider.now()
        val age = now - _lastActivity
        return age >= maxAge
    }
    
    fun addActiveIssue(issueId: String) {
        _currentContext = _currentContext.copy(
            activeIssues = _currentContext.activeIssues + issueId
        )
        touch()
    }
    
    fun removeActiveIssue(issueId: String) {
        _currentContext = _currentContext.copy(
            activeIssues = _currentContext.activeIssues - issueId
        )
        touch()
    }
    
    fun setWorkflowStage(stage: String?) {
        _currentContext = _currentContext.copy(workflowStage = stage)
        touch()
    }
    
    fun setLastAction(action: String?) {
        _currentContext = _currentContext.copy(lastAction = action)
        touch()
    }
    
    fun updateContextData(key: String, value: String) {
        _currentContext = _currentContext.copy(
            contextData = _currentContext.contextData + (key to value)
        )
        touch()
    }
    
    fun removeContextData(key: String) {
        _currentContext = _currentContext.copy(
            contextData = _currentContext.contextData - key
        )
        touch()
    }
    
    companion object {
        fun create(
            projectId: ProjectId? = null,
            timeProvider: TimeProvider = object : TimeProvider {
                override fun now(): Instant = Clock.System.now()
            }
        ): Session {
            return Session(
                sessionKey = SessionKey.generate(),
                projectId = projectId,
                timeProvider = timeProvider
            )
        }
    }
}