package io.spiralhouse.cycletime.application.dto

import io.spiralhouse.cycletime.domain.entities.Session
import io.spiralhouse.cycletime.domain.entities.SessionContext
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import io.spiralhouse.cycletime.infrastructure.serialization.InstantSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.NullableProjectIdSerializer
import io.spiralhouse.cycletime.infrastructure.serialization.SessionKeySerializer
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Data Transfer Object representing a Session for the application layer.
 * Used to transfer session data between layers without exposing domain entity internals.
 *
 * Uses custom serializers to ensure consistent primitive serialization for value classes.
 * Related issue: SPI-1277
 */
@Serializable
data class SessionDto(
    @Serializable(with = SessionKeySerializer::class)
    val sessionKey: SessionKey,
    @Serializable(with = NullableProjectIdSerializer::class)
    val projectId: ProjectId?,
    val currentContext: SessionContext,
    @Serializable(with = InstantSerializer::class)
    val lastActivity: Instant,
    @Serializable(with = InstantSerializer::class)
    val createdAt: Instant,
    @Serializable(with = InstantSerializer::class)
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
