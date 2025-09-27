package io.spiralhouse.cycletime.infrastructure.database

import org.jetbrains.exposed.sql.Database
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

/**
 * Provider interface for database access.
 *
 * This interface enables proper dependency injection and test isolation by abstracting
 * database lifecycle management. Implementations can provide singleton instances for
 * production or isolated instances for testing.
 *
 * ## Production Usage
 * In production, the DefaultDatabaseProvider maintains a single HikariCP connection pool
 * with proper configuration for connection limits, timeouts, and lifecycle management.
 *
 * ## Test Usage
 * In tests, the TestDatabaseProvider creates isolated in-memory H2 databases for each
 * test, enabling parallel execution without conflicts.
 *
 * ## Migration from DatabaseFactory
 * This interface replaces the DatabaseFactory singleton pattern, eliminating:
 * - Race conditions from shared mutable state
 * - Test isolation issues from singleton reset() calls
 * - Forced sequential test execution (maxParallelForks = 1)
 *
 * @see DefaultDatabaseProvider for production implementation
 * @see TestDatabaseProvider for test implementation
 */
interface DatabaseProvider {
    /**
     * Get the database connection.
     *
     * The returned Database instance is managed by the provider and should not be
     * closed directly by consumers. Use the provider's close() method for cleanup.
     *
     * @return Database instance configured for the current environment
     */
    fun getDatabase(): Database

    /**
     * Execute a suspending database query with proper transaction management.
     *
     * This method handles:
     * - Transaction creation with IO dispatcher
     * - Proper error handling and rollback
     * - Connection management from the pool
     *
     * Example:
     * ```kotlin
     * val result = databaseProvider.dbQuery {
     *     ProjectsTable.selectAll().map { it.toProject() }
     * }
     * ```
     *
     * @param block Suspending block to execute within a transaction
     * @return Result of the block execution
     */
    suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO, getDatabase()) { block() }

    /**
     * Close database connections and release resources.
     *
     * This method should be called during application shutdown to ensure:
     * - HikariCP connection pools are properly closed
     * - Database connections are returned to the OS
     * - No resource leaks occur
     *
     * In test environments, this may be a no-op for in-memory databases
     * that are automatically cleaned up by the JVM.
     */
    fun close()

    /**
     * Check if the database provider is initialized and ready.
     *
     * @return true if the database is ready for use, false otherwise
     */
    fun isReady(): Boolean = try {
        getDatabase()
        true
    } catch (e: Exception) {
        false
    }
}