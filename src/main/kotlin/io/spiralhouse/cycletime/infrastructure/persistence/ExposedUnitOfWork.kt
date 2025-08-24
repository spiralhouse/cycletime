package io.spiralhouse.cycletime.infrastructure.persistence

import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

/**
 * UnitOfWork implementation using Exposed ORM transactions.
 * Provides transactional boundaries for application service operations.
 */
class ExposedUnitOfWork(private val database: Database) : UnitOfWork {

    override suspend fun <T> execute(block: suspend () -> T): T {
        return newSuspendedTransaction(db = database) {
            block()
        }
    }

    override suspend fun begin() {
        // Exposed handles transaction begin automatically in newSuspendedTransaction
        // This method is here for interface compliance but not needed in practice
    }

    override suspend fun commit() {
        // Exposed handles commit automatically at the end of newSuspendedTransaction
        // This method is here for interface compliance but not needed in practice
    }

    override suspend fun rollback() {
        // Exposed handles rollback automatically on exceptions in newSuspendedTransaction
        // This method is here for interface compliance but not needed in practice
    }
}
