package io.spiralhouse.cycletime.infrastructure.persistence

import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.Transaction
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * UnitOfWork implementation using Exposed ORM transactions.
 * Provides transactional boundaries for application service operations.
 * 
 * IMPORTANT: This implementation only supports the execute() method pattern.
 * The begin/commit/rollback methods are no-ops as they don't work correctly
 * with Exposed's transaction model where transactions auto-complete.
 * 
 * Use the execute() method which properly wraps operations in transactions
 * with automatic commit/rollback handling.
 */
class ExposedUnitOfWork(private val database: Database) : UnitOfWork {
    
    override suspend fun <T> execute(block: suspend () -> T): T {
        return newSuspendedTransaction(Dispatchers.IO, database) {
            // Transaction will auto-commit at the end of newSuspendedTransaction
            // Transaction will auto-rollback on exception in newSuspendedTransaction
            block()
        }
    }

    override suspend fun begin() {
        throw UnsupportedOperationException(
            "Manual transaction management is not supported with Exposed ORM. " +
            "Exposed transactions are scoped to code blocks and cannot be manually controlled. " +
            "Use the execute() method instead, which properly manages transaction lifecycle " +
            "with automatic commit/rollback handling."
        )
    }

    override suspend fun commit() {
        throw UnsupportedOperationException(
            "Manual transaction management is not supported with Exposed ORM. " +
            "Exposed transactions are scoped to code blocks and cannot be manually controlled. " +
            "Use the execute() method instead, which properly manages transaction lifecycle " +
            "with automatic commit/rollback handling."
        )
    }

    override suspend fun rollback() {
        throw UnsupportedOperationException(
            "Manual transaction management is not supported with Exposed ORM. " +
            "Exposed transactions are scoped to code blocks and cannot be manually controlled. " +
            "Use the execute() method instead, which properly manages transaction lifecycle " +
            "with automatic commit/rollback handling."
        )
    }
}
