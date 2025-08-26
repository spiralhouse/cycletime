package io.spiralhouse.cycletime.domain.repositories

/**
 * Unit of Work pattern for managing database transactions.
 * 
 * This interface provides transactional boundaries for database operations, ensuring
 * data consistency through atomic commits or rollbacks. The primary design follows
 * a functional approach with automatic transaction management.
 * 
 * ## Design Rationale
 * 
 * This interface provides two approaches for transaction management:
 * 1. **Automatic transaction management** via [execute] method (RECOMMENDED)
 * 2. **Manual transaction management** via [begin], [commit], [rollback] methods
 * 
 * ## Important Implementation Note
 * 
 * The manual transaction methods (begin/commit/rollback) may not be supported
 * by all implementations due to underlying ORM limitations. For example, 
 * Exposed ORM's transaction model doesn't support manual transaction boundaries
 * as transactions are scoped to code blocks and auto-commit/rollback.
 * 
 * ## Usage Patterns
 * 
 * ### Recommended: Using execute() method
 * ```kotlin
 * class ProjectService(private val unitOfWork: UnitOfWork, private val repo: ProjectRepository) {
 *     suspend fun createProjectWithIssues(project: Project, issues: List<Issue>): Project {
 *         return unitOfWork.execute {
 *             // All operations within this block are transactional
 *             val savedProject = repo.save(project)
 *             issues.forEach { issue ->
 *                 repo.addIssue(savedProject.id, issue)
 *             }
 *             savedProject
 *         }
 *         // Transaction auto-commits on success, auto-rollbacks on exception
 *     }
 * }
 * ```
 * 
 * ### Why Manual Transaction Control Isn't Supported with Exposed
 * 
 * Exposed ORM uses a thread-local transaction context that is automatically managed
 * within transaction blocks. This design prevents manual transaction boundaries:
 * 
 * 1. **Thread-Local Context**: Transactions are bound to the current thread/coroutine
 * 2. **Block Scoping**: Transaction lifecycle is tied to the code block scope
 * 3. **Automatic Management**: Commits/rollbacks happen automatically based on block completion
 * 
 * Attempting manual control would break Exposed's internal state management and could
 * lead to connection leaks or inconsistent transaction states.
 * 
 * ## Migration Considerations
 * 
 * If future requirements necessitate manual transaction control:
 * 1. Consider switching to a lower-level database access layer (JDBC)
 * 2. Implement a custom transaction manager outside of Exposed's scope
 * 3. Use database-specific transaction savepoints for nested transactions
 * 
 * @see ExposedUnitOfWork for the Exposed ORM implementation
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
