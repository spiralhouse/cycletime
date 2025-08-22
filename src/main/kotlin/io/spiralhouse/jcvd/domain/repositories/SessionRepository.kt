package io.spiralhouse.jcvd.domain.repositories

import io.spiralhouse.jcvd.domain.entities.Session
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant

interface SessionRepository {
    suspend fun findByKey(sessionKey: SessionKey): Session?
    suspend fun findByProject(projectId: ProjectId): List<Session>
    suspend fun findExpiredSessions(before: Instant): List<Session>
    suspend fun findAll(): List<Session>
    suspend fun findRecentSessions(since: Instant): List<Session>
    suspend fun count(): Int
    suspend fun save(session: Session)
    suspend fun delete(sessionKey: SessionKey)
    suspend fun deleteExpiredSessions(before: Instant): Int
    suspend fun exists(sessionKey: SessionKey): Boolean
}
