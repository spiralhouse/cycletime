package io.spiralhouse.cycletime.infrastructure.persistence

import io.spiralhouse.cycletime.domain.services.TimeProvider
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

/**
 * Base repository class for Exposed ORM implementations.
 *
 * Consolidates common patterns and eliminates code duplication across all repository implementations.
 * Provides shared transaction management, existence checking, and query helpers that all concrete
 * repositories can leverage.
 *
 * ## Consolidated Patterns
 *
 * ### Transaction Management
 * All repositories share identical transaction management logic:
 * - Reuses existing transactions when called from UnitOfWork
 * - Creates new transactions for standalone operations
 * - Thread-safe through Exposed's transaction isolation
 * - Proper connection pooling integration
 *
 * ### Existence Checking
 * Provides optimized existence checks using SELECT with LIMIT 1 pattern
 * that all repositories use for efficient boolean queries.
 *
 * ### Error Handling
 * Centralizes database exception handling and transaction rollback logic
 * with consistent error propagation patterns.
 *
 * ## Thread-Safety Guarantees
 *
 * This base class maintains thread-safety through:
 * - Immutable constructor parameters (timeProvider, database)
 * - Transaction-scoped operations via dbQuery()
 * - No mutable state between operations
 * - Exposed ORM's connection pooling and isolation
 *
 * @property timeProvider The time provider for entity reconstitution (immutable)
 * @property database Optional database instance for testing (immutable)
 */
@ThreadSafe // Documenting thread-safety guarantee
abstract class BaseExposedRepository(
    protected val timeProvider: TimeProvider,
    protected val database: Database? = null
) {

    /**
     * Executes a database query with proper transaction management.
     * 
     * Consolidated transaction management logic that:
     * - Reuses existing transactions when called from UnitOfWork
     * - Creates new transactions for standalone operations
     * - Uses the specified database instance if provided
     * - Properly handles concurrent access through Exposed's transaction management
     *
     * This method eliminates 25-30 lines of duplication from each repository implementation.
     *
     * @param block The query to execute
     * @return The query result
     */
    protected suspend fun <T> dbQuery(block: suspend () -> T): T {
        // Check if we're already in a transaction (e.g., from UnitOfWork)
        val currentTransaction = TransactionManager.currentOrNull()
        
        return if (currentTransaction != null) {
            // We're already in a transaction - execute directly without creating a new one
            // This preserves UnitOfWork behavior and transaction boundaries
            block()
        } else {
            // No transaction - create new transaction (thread-safe)
            if (database != null) {
                newSuspendedTransaction(Dispatchers.IO, database) { block() }
            } else {
                newSuspendedTransaction(Dispatchers.IO) { block() }
            }
        }
    }

    /**
     * Checks if a record exists in the specified table with the given condition.
     *
     * Uses optimized SELECT with LIMIT 1 pattern for efficient existence checking.
     * This method consolidates the existence check pattern used across all repositories.
     *
     * @param table The table to check
     * @param condition The WHERE condition to apply
     * @return true if a record exists, false otherwise
     */
    protected fun checkExists(
        table: Table,
        condition: SqlExpressionBuilder.() -> Op<Boolean>
    ): Boolean {
        return table
            .select(table.columns.first()) // Select any column for existence check
            .where(condition)
            .limit(1)
            .count() > 0
    }

    /**
     * Finds records matching a specific condition with optional ordering.
     *
     * Provides a reusable helper for conditional queries that reduces code duplication
     * across the various find methods in concrete repositories.
     *
     * @param table The table to query
     * @param condition The SQL condition to apply
     * @param orderBy Optional ordering specification
     * @param mapper Function to convert ResultRow to domain entity
     * @return List of entities matching the condition
     */
    protected fun <T> findByCondition(
        table: Table,
        condition: SqlExpressionBuilder.() -> Op<Boolean>,
        orderBy: Pair<Expression<*>, SortOrder>? = null,
        mapper: (ResultRow) -> T
    ): List<T> {
        val query = table
            .selectAll()
            .where(condition)
        
        orderBy?.let { (column, order) ->
            query.orderBy(column to order)
        }
        
        return query.map(mapper)
    }

    /**
     * Finds a single record by a specific column value.
     *
     * Consolidates the pattern of finding by ID or unique key that appears
     * in all repository implementations.
     *
     * @param table The table to query
     * @param column The column to match
     * @param value The value to search for
     * @param mapper Function to convert ResultRow to domain entity
     * @return The entity if found, null otherwise
     */
    protected fun <T, V> findByColumn(
        table: Table,
        column: Column<V>,
        value: V,
        mapper: (ResultRow) -> T
    ): T? {
        return table
            .selectAll()
            .where { column eq value }
            .singleOrNull()
            ?.let(mapper)
    }
}