package io.spiralhouse.cycletime.unit.mocks

import io.spiralhouse.cycletime.domain.entities.AuditLog
import io.spiralhouse.cycletime.domain.repositories.AuditLogRepository
import io.spiralhouse.cycletime.domain.valueobjects.AuditLogId

/**
 * Mock implementation of AuditLogRepository for unit testing.
 *
 * Provides a controlled environment for testing audit logging without database dependencies.
 */
class MockAuditLogRepository : AuditLogRepository {

    /**
     * In-memory storage for audit logs.
     */
    val auditLogs: MutableList<AuditLog> = mutableListOf()

    /**
     * Counter for tracking create calls.
     */
    var createCallCount: Int = 0

    /**
     * Counter for tracking audit log calls (alias for createCallCount).
     */
    var auditLogCallCount: Int
        get() = createCallCount
        set(value) { createCallCount = value }

    /**
     * Last audit entry created.
     */
    var lastAuditEntry: AuditLog? = null

    override suspend fun create(auditLog: AuditLog): AuditLog {
        createCallCount++
        lastAuditEntry = auditLog
        auditLogs.add(auditLog)
        return auditLog
    }

    override suspend fun findByEntityId(entityId: String): List<AuditLog> {
        return auditLogs.filter { it.entityId == entityId }
    }

    override suspend fun findById(id: AuditLogId): AuditLog? {
        return auditLogs.find { it.id == id }
    }

    override suspend fun findAll(limit: Int): List<AuditLog> {
        return auditLogs.take(limit)
    }

    /**
     * Resets all test data and counters.
     */
    fun reset() {
        auditLogs.clear()
        createCallCount = 0
        lastAuditEntry = null
    }
}
