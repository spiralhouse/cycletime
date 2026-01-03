package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.AuditLog
import io.spiralhouse.cycletime.domain.valueobjects.AuditLogId

/**
 * Repository interface for AuditLog persistence.
 *
 * Audit logs are append-only for compliance and security purposes.
 * No update or delete operations are provided intentionally.
 *
 * ## Design Principles:
 * - **Append-Only**: Only create operations allowed
 * - **Immutable**: Once written, audit logs cannot be modified
 * - **Queryable**: Support querying by entity ID for investigations
 * - **Compliance**: Maintain complete audit trail for data retention operations
 *
 * @see AuditLog The aggregate root this repository manages
 */
interface AuditLogRepository {

    /**
     * Creates a new audit log entry.
     *
     * This is the only mutation operation - audit logs are append-only.
     *
     * @param auditLog The audit log to persist
     * @return The persisted audit log
     */
    suspend fun create(auditLog: AuditLog): AuditLog

    /**
     * Finds all audit log entries for a specific entity.
     *
     * Useful for investigating purge history and debugging.
     *
     * @param entityId The entity ID to search for
     * @return List of audit logs for this entity, ordered by timestamp descending
     */
    suspend fun findByEntityId(entityId: String): List<AuditLog>

    /**
     * Finds an audit log by its unique identifier.
     *
     * @param id The audit log ID
     * @return The audit log if found, null otherwise
     */
    suspend fun findById(id: AuditLogId): AuditLog?

    /**
     * Retrieves all audit logs.
     *
     * @param limit Maximum number of entries to return (defaults to 100)
     * @return List of all audit logs, ordered by timestamp descending
     */
    suspend fun findAll(limit: Int = 100): List<AuditLog>
}
