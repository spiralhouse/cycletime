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
 * This implementation manages transaction state and provides both automatic
 * transaction management via execute() and manual control via begin/commit/rollback.
 */
class ExposedUnitOfWork(private val database: Database) : UnitOfWork {
    
    // Thread-local storage for current transaction state
    private val currentTransaction = ThreadLocal<Transaction?>()
    
    override suspend fun <T> execute(block: suspend () -> T): T {
        return newSuspendedTransaction(Dispatchers.IO, database) {
            currentTransaction.set(this)
            try {
                // Transaction will auto-commit at the end of newSuspendedTransaction
                // Transaction will auto-rollback on exception in newSuspendedTransaction
                block()
            } finally {
                currentTransaction.remove()
            }
        }
    }

    override suspend fun begin() {
        // Create a new transaction if none exists
        if (currentTransaction.get() == null) {
            val txn = transaction(database) { this }
            currentTransaction.set(txn)
        }
    }

    override suspend fun commit() {
        val txn = currentTransaction.get()
        if (txn != null) {
            try {
                txn.commit()
            } finally {
                currentTransaction.remove()
            }
        }
    }

    override suspend fun rollback() {
        val txn = currentTransaction.get()
        if (txn != null) {
            try {
                txn.rollback()
            } finally {
                currentTransaction.remove()
            }
        }
    }
}
