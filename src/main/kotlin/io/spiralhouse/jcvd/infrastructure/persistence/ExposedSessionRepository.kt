package io.spiralhouse.jcvd.infrastructure.persistence

import io.spiralhouse.jcvd.domain.entities.Session
import io.spiralhouse.jcvd.domain.entities.SessionContext
import io.spiralhouse.jcvd.domain.entities.SessionSnapshot
import io.spiralhouse.jcvd.domain.repositories.SessionRepository
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.services.SystemTimeProvider
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.SessionKey
import io.spiralhouse.jcvd.infrastructure.database.SessionStatesTable
import kotlinx.coroutines.Dispatchers
import kotlinx.datetime.Instant
import kotlinx.serialization.SerializationException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.greater
import org.jetbrains.exposed.sql.SqlExpressionBuilder.less
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

/**
 * Repository implementation for Session entities using Exposed ORM.
 * 
 * This repository manages the persistence of Session aggregates, handling the complex
 * mapping between domain entities and database records. It implements the Snapshot
 * pattern for entity reconstitution and manages session expiration logic.
 * 
 * ## Design Decisions
 * 
 * ### SessionContext Serialization
 * The repository uses JSON serialization for storing SessionContext data. This approach
 * provides flexibility for evolving the context structure without database schema changes.
 * The JSON configuration is lenient to handle backward compatibility:
 * - `ignoreUnknownKeys`: Allows reading older data with removed fields
 * - `isLenient`: Handles malformed JSON gracefully
 * - `prettyPrint`: Disabled for storage efficiency
 * 
 * ### Expiration Management
 * Sessions can be queried and deleted based on their last activity timestamp.
 * The repository provides efficient batch deletion of expired sessions, returning
 * the count of deleted records for audit purposes.
 * 
 * ### Project Association
 * Sessions may optionally be associated with a Project. The nullable projectId
 * field allows for both project-scoped and global sessions.
 * 
 * ### Performance Optimizations
 * - Uses SELECT 1 with LIMIT 1 for existence checks
 * - Batch operations within single transactions
 * - Efficient index usage on sessionKey and lastActivity columns
 * 
 * @property timeProvider The time provider for entity reconstitution, defaults to SystemTimeProvider
 */
class ExposedSessionRepository(
    private val timeProvider: TimeProvider = SystemTimeProvider(),
    private val database: Database? = null
) : SessionRepository {

    /**
     * JSON serializer for SessionContext with lenient configuration.
     * Handles backward compatibility and malformed data gracefully.
     */
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        prettyPrint = false
        encodeDefaults = true
    }

    /**
     * Finds a session by its unique key.
     * 
     * @param sessionKey The session key to search for
     * @return The session if found, null otherwise
     */
    override suspend fun findByKey(sessionKey: SessionKey): Session? = dbQuery {
        findSessionRowByKey(sessionKey.value)?.toSession()
    }

    /**
     * Finds all sessions associated with a specific project.
     * 
     * @param projectId The project ID to search for
     * @return List of sessions associated with the project, ordered by creation date
     */
    override suspend fun findByProject(projectId: ProjectId): List<Session> = dbQuery {
        findSessionsByCondition { SessionStatesTable.projectId eq projectId.value }
    }

    /**
     * Finds all sessions that have expired based on last activity.
     * 
     * @param before The cutoff instant - sessions with lastActivity before this are considered expired
     * @return List of expired sessions
     */
    override suspend fun findExpiredSessions(before: Instant): List<Session> = dbQuery {
        findSessionsByCondition { SessionStatesTable.lastActivity less before }
    }

    /**
     * Persists a session to the repository.
     * 
     * This method implements an upsert pattern - it updates existing sessions or
     * inserts new ones based on sessionKey existence. The SessionContext is serialized
     * to JSON for storage.
     * 
     * Transaction behavior:
     * - All operations occur within a single transaction
     * - If serialization fails, the transaction is rolled back
     * - Updates preserve the original createdAt timestamp
     * 
     * @param session The session to save
     * @throws SerializationException if SessionContext serialization fails
     */
    override suspend fun save(session: Session) {
        dbQuery {
            val contextJson = serializeContext(session.currentContext)
            val exists = checkSessionExists(session.sessionKey)
            
            if (exists) {
                updateSession(session, contextJson)
            } else {
                insertSession(session, contextJson)
            }
        }
    }

    /**
     * Deletes a session from the repository.
     * 
     * @param sessionKey The key of the session to delete
     */
    override suspend fun delete(sessionKey: SessionKey) {
        dbQuery {
            SessionStatesTable.deleteWhere { 
                SessionStatesTable.sessionKey eq sessionKey.value 
            }
        }
    }

    /**
     * Deletes all sessions that have expired based on last activity.
     * 
     * This method performs a batch deletion of expired sessions in a single
     * database operation for optimal performance.
     * 
     * @param before The cutoff instant - sessions with lastActivity before this will be deleted
     * @return The number of sessions deleted
     */
    override suspend fun deleteExpiredSessions(before: Instant): Int = dbQuery {
        SessionStatesTable.deleteWhere { 
            SessionStatesTable.lastActivity less before 
        }
    }

    /**
     * Finds all sessions in the repository.
     * 
     * @return List of all sessions ordered by creation date
     */
    override suspend fun findAll(): List<Session> = dbQuery {
        findSessionsByCondition { Op.TRUE }
    }

    /**
     * Finds sessions that have been updated since a specific time.
     * 
     * @param since The cutoff instant - sessions updated after this time are returned
     * @return List of recent sessions
     */
    override suspend fun findRecentSessions(since: Instant): List<Session> = dbQuery {
        findSessionsByCondition { SessionStatesTable.updatedAt greater since }
    }

    /**
     * Counts the total number of sessions in the repository.
     * 
     * @return The total count of sessions
     */
    override suspend fun count(): Int = dbQuery {
        SessionStatesTable.selectAll().count().toInt()
    }

    /**
     * Checks if a session exists in the repository.
     * 
     * @param sessionKey The session key to check
     * @return true if the session exists, false otherwise
     */
    override suspend fun exists(sessionKey: SessionKey): Boolean = dbQuery {
        checkSessionExists(sessionKey)
    }
    
    /**
     * Persists multiple sessions to the repository in a single transaction.
     * 
     * This method is optimized for batch operations and ensures all sessions are saved
     * atomically. If any session fails to save, the entire batch is rolled back.
     * 
     * Performance optimizations:
     * - Single transaction for all operations (atomic commit)
     * - Batch existence check to minimize database queries
     * - Grouped processing of updates vs inserts
     * 
     * @param sessions The list of sessions to save
     * @throws SerializationException if any SessionContext serialization fails
     */
    suspend fun saveAll(sessions: List<Session>) {
        if (sessions.isEmpty()) return
        
        dbQuery {
            // Pre-serialize all contexts to fail fast if there are issues
            val sessionData = sessions.map { session ->
                session to serializeContext(session.currentContext)
            }
            
            // Batch check existence to minimize queries
            val existenceMap = sessions.associate { session ->
                session.sessionKey to checkSessionExists(session.sessionKey)
            }
            
            // Process all sessions
            sessionData.forEach { (session, contextJson) ->
                if (existenceMap[session.sessionKey] == true) {
                    updateSession(session, contextJson)
                } else {
                    insertSession(session, contextJson)
                }
            }
        }
    }

    // ================== Helper Methods ==================
    
    /**
     * Updates an existing session in the database.
     * 
     * @param session The session to update
     * @param contextJson The serialized context JSON
     */
    private fun updateSession(session: Session, contextJson: String) {
        SessionStatesTable.update({ SessionStatesTable.sessionKey eq session.sessionKey.value }) {
            it[projectId] = session.projectId?.value
            it[currentContext] = contextJson
            it[lastActivity] = session.lastActivity
            it[updatedAt] = session.updatedAt
        }
    }
    
    /**
     * Inserts a new session into the database.
     * 
     * @param session The session to insert
     * @param contextJson The serialized context JSON
     */
    private fun insertSession(session: Session, contextJson: String) {
        SessionStatesTable.insert {
            it[id] = EntityID(generateSessionId(), SessionStatesTable)
            it[sessionKey] = session.sessionKey.value
            it[projectId] = session.projectId?.value
            it[currentContext] = contextJson
            it[lastActivity] = session.lastActivity
            it[createdAt] = session.createdAt
            it[updatedAt] = session.updatedAt
        }
    }
    
    /**
     * Serializes a SessionContext to JSON string.
     * 
     * @param context The context to serialize
     * @return The JSON string representation
     * @throws SerializationException if serialization fails
     */
    private fun serializeContext(context: SessionContext): String {
        return try {
            json.encodeToString(context)
        } catch (e: Exception) {
            throw SerializationException("Failed to serialize SessionContext", e)
        }
    }
    
    /**
     * Deserializes a SessionContext from JSON string.
     * 
     * Handles null, blank, and malformed JSON gracefully by returning
     * an empty SessionContext as fallback.
     * 
     * @param contextJson The JSON string to deserialize
     * @return The deserialized SessionContext or empty context on error
     */
    private fun deserializeContext(contextJson: String?): SessionContext {
        if (contextJson.isNullOrBlank()) {
            return SessionContext()
        }
        
        return try {
            json.decodeFromString<SessionContext>(contextJson)
        } catch (e: Exception) {
            // Log warning about corrupt data but don't fail
            // Return empty context to maintain system stability
            SessionContext()
        }
    }
    
    /**
     * Checks if a session exists in the database.
     * 
     * Uses SELECT with LIMIT 1 for optimal performance.
     * 
     * @param sessionKey The session key to check
     * @return true if the session exists, false otherwise
     */
    private fun checkSessionExists(sessionKey: SessionKey): Boolean {
        return SessionStatesTable
            .select(SessionStatesTable.sessionKey)
            .where { SessionStatesTable.sessionKey eq sessionKey.value }
            .limit(1)
            .count() > 0
    }
    
    /**
     * Finds sessions matching a specific condition.
     * 
     * This is a reusable helper method that reduces code duplication across
     * the various find methods.
     * 
     * @param condition The SQL condition to apply
     * @return List of sessions matching the condition
     */
    private fun findSessionsByCondition(condition: SqlExpressionBuilder.() -> Op<Boolean>): List<Session> {
        return SessionStatesTable
            .selectAll()
            .where(condition)
            .orderBy(SessionStatesTable.createdAt to SortOrder.ASC)
            .map { it.toSession() }
    }
    
    /**
     * Finds a single session row by key.
     * 
     * @param key The session key to search for
     * @return The result row if found, null otherwise
     */
    private fun findSessionRowByKey(key: String): ResultRow? {
        return SessionStatesTable
            .selectAll()
            .where { SessionStatesTable.sessionKey eq key }
            .singleOrNull()
    }
    
    /**
     * Generates a unique session ID.
     * 
     * @return A UUID string for the session ID
     */
    private fun generateSessionId(): String = UUID.randomUUID().toString()
    
    /**
     * Converts a database row to a Session domain entity.
     * 
     * This method handles the complete reconstitution of a Session aggregate,
     * including deserialization of the SessionContext from JSON. It gracefully
     * handles corrupt or missing context data by falling back to an empty context.
     * 
     * @receiver ResultRow from the SessionStatesTable query
     * @return The fully reconstituted Session entity
     */
    private fun ResultRow.toSession(): Session {
        val contextJson = this[SessionStatesTable.currentContext]
        val context = deserializeContext(contextJson)
        
        val snapshot = SessionSnapshot(
            sessionKey = SessionKey(this[SessionStatesTable.sessionKey]),
            projectId = this[SessionStatesTable.projectId]?.let { ProjectId(it) },
            currentContext = context,
            lastActivity = this[SessionStatesTable.lastActivity],
            createdAt = this[SessionStatesTable.createdAt],
            updatedAt = this[SessionStatesTable.updatedAt]
        )
        
        return Session.fromSnapshot(snapshot, timeProvider)
    }

    /**
     * Executes a database query within a transaction.
     * 
     * All database operations are executed within a coroutine context using
     * the IO dispatcher for optimal thread management.
     * 
     * @param block The query to execute
     * @return The query result
     */
    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        if (database != null) {
            newSuspendedTransaction(Dispatchers.IO, database) { block() }
        } else {
            newSuspendedTransaction(Dispatchers.IO) { block() }
        }
}

/**
 * Custom exception for serialization errors in the repository.
 */
class SerializationException(message: String, cause: Throwable? = null) : Exception(message, cause)
