package io.spiralhouse.cycletime.domain.entities

import io.spiralhouse.cycletime.domain.valueobjects.AuditLogId
import kotlinx.datetime.Instant

/**
 * Domain entity representing an audit log entry for data retention operations.
 *
 * Audit logs provide an immutable record of all purge operations (both scheduled
 * and manual) for compliance, debugging, and security purposes.
 *
 * ## Audit Requirements:
 * - All purge operations MUST be logged
 * - Logs are immutable (no updates or deletes)
 * - Includes entity type, ID, timestamp, and user identifier
 * - Optional metadata for additional context
 *
 * @property id Unique identifier for this audit log entry
 * @property entityType Type of entity purged (e.g., "project", "issue", "scheduled_purge")
 * @property entityId ID of the purged entity or "system" for batch operations
 * @property operation Type of operation performed (e.g., "manual_purge", "purge_expired")
 * @property purgedBy User or system identifier (e.g., "manual:userId", "scheduled")
 * @property timestamp When the operation occurred
 * @property metadata Additional context as key-value pairs
 */
data class AuditLog(
    val id: AuditLogId,
    val entityType: String,
    val entityId: String,
    val operation: String,
    val purgedBy: String,
    val timestamp: Instant,
    val metadata: Map<String, String> = emptyMap()
) {
    companion object {
        /**
         * Creates a new audit log entry for a scheduled purge operation.
         *
         * @param projectCount Number of projects purged
         * @param issueCount Number of issues purged
         * @param workflowCount Number of workflows purged
         * @param cutoffDate Cutoff timestamp used for purging
         * @param timestamp When the operation occurred
         * @return A new AuditLog instance
         */
        fun scheduledPurge(
            projectCount: Int,
            issueCount: Int,
            workflowCount: Int,
            cutoffDate: Instant,
            timestamp: Instant
        ): AuditLog {
            return AuditLog(
                id = AuditLogId.generate(),
                entityType = "scheduled_purge",
                entityId = "system",
                operation = "purge_expired",
                purgedBy = "scheduled",
                timestamp = timestamp,
                metadata = mapOf(
                    "projectCount" to projectCount.toString(),
                    "issueCount" to issueCount.toString(),
                    "workflowCount" to workflowCount.toString(),
                    "cutoffDate" to cutoffDate.toString()
                )
            )
        }

        /**
         * Creates a new audit log entry for a manual purge operation.
         *
         * @param entityType Type of entity purged (e.g., "project", "issue")
         * @param entityId ID of the purged entity
         * @param userId User who initiated the purge
         * @param timestamp When the operation occurred
         * @return A new AuditLog instance
         */
        fun manualPurge(
            entityType: String,
            entityId: String,
            userId: String,
            timestamp: Instant
        ): AuditLog {
            return AuditLog(
                id = AuditLogId.generate(),
                entityType = entityType,
                entityId = entityId,
                operation = "manual_purge",
                purgedBy = "manual:$userId",
                timestamp = timestamp
            )
        }
    }
}
