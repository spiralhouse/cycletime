package io.spiralhouse.cycletime.infrastructure.persistence

import io.spiralhouse.cycletime.domain.entities.AuditLog
import io.spiralhouse.cycletime.domain.repositories.AuditLogRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.AuditLogId
import io.spiralhouse.cycletime.infrastructure.database.AuditLogsTable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*

/**
 * Repository implementation for AuditLog entities using Exposed ORM.
 *
 * Implements append-only audit logging for data retention operations.
 * Audit logs are immutable and never updated or deleted.
 *
 * ## Thread-Safety Guarantees
 *
 * This repository is **thread-safe** and designed for singleton scope in DI:
 * - All instance properties are immutable (timeProvider, database, json)
 * - Each operation runs in its own transaction context via dbQuery()
 * - No mutable state is maintained between operations
 * - Exposed ORM handles connection pooling and transaction isolation
 *
 * @property timeProvider The time provider for entity operations (immutable)
 * @property database Optional database instance for testing (immutable)
 */
@ThreadSafe
class ExposedAuditLogRepository(
    timeProvider: TimeProvider = SystemTimeProvider(),
    database: Database? = null
) : BaseExposedRepository(timeProvider, database), AuditLogRepository {

    /**
     * JSON serializer for metadata with lenient configuration.
     */
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        prettyPrint = false
        encodeDefaults = false
    }

    /**
     * Creates a new audit log entry.
     *
     * This is the only mutation operation - audit logs are append-only.
     *
     * @param auditLog The audit log to persist
     * @return The persisted audit log
     */
    override suspend fun create(auditLog: AuditLog): AuditLog = dbQuery {
        AuditLogsTable.insert {
            it[id] = EntityID(auditLog.id.value, AuditLogsTable)
            it[entityType] = auditLog.entityType
            it[entityId] = auditLog.entityId
            it[operation] = auditLog.operation
            it[purgedBy] = auditLog.purgedBy
            it[timestamp] = auditLog.timestamp
            it[metadata] = if (auditLog.metadata.isNotEmpty()) {
                json.encodeToString(auditLog.metadata)
            } else {
                null
            }
        }

        auditLog
    }

    /**
     * Finds all audit log entries for a specific entity.
     *
     * Useful for investigating purge history and debugging.
     *
     * @param entityId The entity ID to search for
     * @return List of audit logs for this entity, ordered by timestamp descending
     */
    override suspend fun findByEntityId(entityId: String): List<AuditLog> = dbQuery {
        AuditLogsTable
            .selectAll()
            .where { AuditLogsTable.entityId eq entityId }
            .orderBy(AuditLogsTable.timestamp to SortOrder.DESC)
            .map { it.toAuditLog() }
    }

    /**
     * Finds an audit log by its unique identifier.
     *
     * @param id The audit log ID
     * @return The audit log if found, null otherwise
     */
    override suspend fun findById(id: AuditLogId): AuditLog? = dbQuery {
        AuditLogsTable
            .selectAll()
            .where { AuditLogsTable.id eq id.value }
            .singleOrNull()
            ?.toAuditLog()
    }

    /**
     * Retrieves all audit logs.
     *
     * @param limit Maximum number of entries to return (defaults to 100)
     * @return List of all audit logs, ordered by timestamp descending
     */
    override suspend fun findAll(limit: Int): List<AuditLog> = dbQuery {
        AuditLogsTable
            .selectAll()
            .orderBy(AuditLogsTable.timestamp to SortOrder.DESC)
            .limit(limit)
            .map { it.toAuditLog() }
    }

    /**
     * Converts a database row to an AuditLog domain entity.
     *
     * @return The reconstituted AuditLog entity
     */
    private fun ResultRow.toAuditLog(): AuditLog {
        return AuditLog(
            id = AuditLogId(this[AuditLogsTable.id].value),
            entityType = this[AuditLogsTable.entityType],
            entityId = this[AuditLogsTable.entityId],
            operation = this[AuditLogsTable.operation],
            purgedBy = this[AuditLogsTable.purgedBy],
            timestamp = this[AuditLogsTable.timestamp],
            metadata = this[AuditLogsTable.metadata]?.let { metadataJson ->
                try {
                    json.decodeFromString<Map<String, String>>(metadataJson)
                } catch (e: Exception) {
                    emptyMap()
                }
            } ?: emptyMap()
        )
    }
}
