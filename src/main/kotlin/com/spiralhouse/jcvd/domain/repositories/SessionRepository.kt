package com.spiralhouse.jcvd.domain.repositories

import com.spiralhouse.jcvd.domain.entities.Session
import com.spiralhouse.jcvd.domain.valueobjects.ProjectId
import com.spiralhouse.jcvd.domain.valueobjects.SessionKey
import kotlinx.datetime.Instant

interface SessionRepository {
    suspend fun findByKey(sessionKey: SessionKey): Session?
    suspend fun findByProject(projectId: ProjectId): List<Session>
    suspend fun findExpiredSessions(before: Instant): List<Session>
    suspend fun save(session: Session)
    suspend fun delete(sessionKey: SessionKey)
    suspend fun deleteExpiredSessions(before: Instant): Int
    suspend fun exists(sessionKey: SessionKey): Boolean
}