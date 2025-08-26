package io.spiralhouse.cycletime.domain.repositories

/**
 * Unit of Work pattern for managing database transactions.
 * 
 * This interface provides two approaches for transaction management:
 * 1. **Automatic transaction management** via [execute] method (RECOMMENDED)
 * 2. **Manual transaction management** via [begin], [commit], [rollback] methods
 * 
 * **Important Implementation Note:**
 * The manual transaction methods (begin/commit/rollback) may not be supported
 * by all implementations due to underlying ORM limitations. For example, 
 * Exposed ORM's transaction model doesn't support manual transaction boundaries
 * as transactions are scoped to code blocks and auto-commit/rollback.
 * 
 * **Best Practice:**
 * Always prefer the [execute] method for reliable cross-implementation behavior.
 */
interface UnitOfWork {
    /**
     * Executes the given block within a transaction boundary.
     * 
     * The transaction will:
     * - Auto-commit if the block completes successfully
     * - Auto-rollback if the block throws an exception
     * 
     * This method is guaranteed to work across all UnitOfWork implementations.
     * 
     * @param block The operation to execute within the transaction
     * @return The result of the block execution
     * @throws Exception Any exception thrown by the block will cause transaction rollback
     */
    suspend fun <T> execute(block: suspend () -> T): T
    
    /**
     * Begins a new transaction.
     * 
     * **Warning:** This method may not be supported by all implementations.
     * Exposed ORM, for example, doesn't support manual transaction boundaries.
     * 
     * @throws UnsupportedOperationException if the implementation doesn't support manual transactions
     */
    suspend fun begin()
    
    /**
     * Commits the current transaction.
     * 
     * **Warning:** This method may not be supported by all implementations.
     * Exposed ORM, for example, doesn't support manual transaction boundaries.
     * 
     * @throws UnsupportedOperationException if the implementation doesn't support manual transactions
     */
    suspend fun commit()
    
    /**
     * Rolls back the current transaction.
     * 
     * **Warning:** This method may not be supported by all implementations.
     * Exposed ORM, for example, doesn't support manual transaction boundaries.
     * 
     * @throws UnsupportedOperationException if the implementation doesn't support manual transactions
     */
    suspend fun rollback()
}
