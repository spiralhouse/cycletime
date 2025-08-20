package io.spiralhouse.jcvd.infrastructure.persistence

import io.spiralhouse.jcvd.domain.entities.Session
import io.spiralhouse.jcvd.domain.entities.SessionContext
import io.spiralhouse.jcvd.domain.repositories.SessionRepository
import io.spiralhouse.jcvd.domain.services.SystemTimeProvider
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.SessionKey
import io.spiralhouse.jcvd.infrastructure.database.SessionStatesTable
import kotlinx.coroutines.Dispatchers
import kotlinx.datetime.Instant
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.less
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

class ExposedSessionRepository : SessionRepository {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    override suspend fun findByKey(sessionKey: SessionKey): Session? = dbQuery {
        SessionStatesTable
            .selectAll()
            .where { SessionStatesTable.sessionKey eq sessionKey.value }
            .singleOrNull()
            ?.toSession()
    }

    override suspend fun findByProject(projectId: ProjectId): List<Session> = dbQuery {
        SessionStatesTable
            .selectAll()
            .where { SessionStatesTable.projectId eq projectId.value }
            .map { it.toSession() }
    }

    override suspend fun findExpiredSessions(before: Instant): List<Session> = dbQuery {
        SessionStatesTable
            .selectAll()
            .where { SessionStatesTable.lastActivity less before }
            .map { it.toSession() }
    }

    override suspend fun save(session: Session) {
        dbQuery {
        val contextJson = json.encodeToString(session.currentContext)

        val exists = SessionStatesTable
            .selectAll()
            .where { SessionStatesTable.sessionKey eq session.sessionKey.value }
            .count() > 0

        if (exists) {
            SessionStatesTable.update({ SessionStatesTable.sessionKey eq session.sessionKey.value }) {
                it[projectId] = session.projectId?.value
                it[currentContext] = contextJson
                it[lastActivity] = session.lastActivity
                it[updatedAt] = session.updatedAt
            }
        } else {
            SessionStatesTable.insert {
                it[id] = EntityID(UUID.randomUUID().toString(), SessionStatesTable)
                it[sessionKey] = session.sessionKey.value
                it[projectId] = session.projectId?.value
                it[currentContext] = contextJson
                it[lastActivity] = session.lastActivity
                it[createdAt] = session.createdAt
                it[updatedAt] = session.updatedAt
            }
        }
        }
    }

    override suspend fun delete(sessionKey: SessionKey) {
        dbQuery {
            SessionStatesTable.deleteWhere { SessionStatesTable.sessionKey eq sessionKey.value }
        }
    }

    override suspend fun deleteExpiredSessions(before: Instant): Int = dbQuery {
        SessionStatesTable.deleteWhere { SessionStatesTable.lastActivity less before }
    }

    override suspend fun exists(sessionKey: SessionKey): Boolean = dbQuery {
        SessionStatesTable
            .selectAll()
            .where { SessionStatesTable.sessionKey eq sessionKey.value }
            .count() > 0
    }

    private fun ResultRow.toSession(): Session {
        val contextJson = this[SessionStatesTable.currentContext]
        val context = if (contextJson.isNullOrBlank()) {
            SessionContext()
        } else {
            json.decodeFromString<SessionContext>(contextJson)
        }

        return Session(
            sessionKey = SessionKey(this[SessionStatesTable.sessionKey]),
            _projectId = this[SessionStatesTable.projectId]?.let { ProjectId(it) },
            _currentContext = context,
            _lastActivity = this[SessionStatesTable.lastActivity],
            createdAt = this[SessionStatesTable.createdAt],
            updatedAt = this[SessionStatesTable.updatedAt],
            timeProvider = SystemTimeProvider()
        )
    }

    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}
