package io.spiralhouse.jcvd.application.dto

import io.spiralhouse.jcvd.domain.entities.Session
import io.spiralhouse.jcvd.domain.entities.SessionContext
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Data Transfer Object representing a Session for the application layer.
 * Used to transfer session data between layers without exposing domain entity internals.
 */
@Serializable
data class SessionDto(
    val sessionKey: SessionKey,
    val projectId: ProjectId?,
    val currentContext: SessionContext,
    val lastActivity: Instant,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    companion object {
        /**
         * Creates a SessionDto from a domain Session entity.
         */
        fun fromSession(session: Session): SessionDto {
            return SessionDto(
                sessionKey = session.sessionKey,
                projectId = session.projectId,
                currentContext = session.currentContext,
                lastActivity = session.lastActivity,
                createdAt = session.createdAt,
                updatedAt = session.updatedAt
            )
        }
    }
}

/**
 * Data Transfer Object containing a list of sessions.
 */
@Serializable
data class SessionListDto(
    val sessions: List<SessionDto>,
    val totalCount: Int
) {
    companion object {
        fun fromSessions(sessions: List<Session>): SessionListDto {
            return SessionListDto(
                sessions = sessions.map { SessionDto.fromSession(it) },
                totalCount = sessions.size
            )
        }
    }
}