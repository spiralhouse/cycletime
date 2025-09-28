package io.spiralhouse.cycletime.infrastructure.database

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.StdOutSqlLogger
import org.jetbrains.exposed.sql.addLogger
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

/**
 * Test database provider with per-test isolation.
 *
 * This implementation creates isolated in-memory H2 databases for each test instance,
 * enabling parallel test execution without conflicts. Each provider instance gets its
 * own unique database that is automatically cleaned up when the test completes.
 *
 * ## Key Features
 * - Unique in-memory database per instance
 * - No shared state between tests
 * - Automatic cleanup via garbage collection
 * - Support for multiple naming strategies
 *
 * ## Test Isolation
 * Unlike the DatabaseFactory singleton, each test gets its own provider instance:
 * - Tests can run in parallel without conflicts
 * - Database state changes don't affect other tests
 * - No need for explicit cleanup between tests
 *
 * ## Usage Example
 * ```kotlin
 * class MyTest : DescribeSpec({
 *     val provider = TestDatabaseProvider()
 *     val database = provider.getDatabase()
 *
 *     beforeSpec {
 *         // Database is already initialized with schema
 *     }
 *
 *     describe("my feature") {
 *         it("should work") {
 *             transaction(database) {
 *                 // Test database operations
 *             }
 *         }
 *     }
 * })
 * ```
 *
 * @property strategy Naming strategy for the test database
 * @property enableLogging Enable SQL logging for debugging test failures
 */
class TestDatabaseProvider(
    private val strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID,
    private val enableLogging: Boolean = false
) : DatabaseProvider {

    private val database: Database

    init {
        // Generate unique database name based on strategy
        val dbName = when (strategy) {
            TestDatabaseNamingStrategy.UUID ->
                "test_${UUID.randomUUID().toString().replace("-", "_")}"
            TestDatabaseNamingStrategy.SEQUENTIAL ->
                "test_db_${sequentialCounter.incrementAndGet()}"
            TestDatabaseNamingStrategy.FIXED ->
                "test_db_fixed"
        }

        // Create in-memory H2 database with PostgreSQL compatibility
        // DB_CLOSE_DELAY=-1 keeps the database alive until JVM exits
        database = Database.connect(
            url = "jdbc:h2:mem:$dbName;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;LOCK_TIMEOUT=5000;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        // Initialize schema using centralized registry
        transaction(database) {
            if (enableLogging) {
                addLogger(StdOutSqlLogger)
            }

            // Validate and create schema
            TableRegistry.validate()
            SchemaUtils.create(*TableRegistry.ALL_TABLES.toTypedArray())
        }
    }

    override fun getDatabase(): Database = database

    override fun close() {
        // For in-memory H2 databases, we can optionally unregister from TransactionManager
        // This helps with cleanup in tests that create many databases
        try {
            TransactionManager.closeAndUnregister(database)
        } catch (e: Exception) {
            // Ignore errors during cleanup - in-memory database will be GC'd anyway
        }
    }

    override fun isReady(): Boolean = true // In-memory databases are always ready once created

    companion object {
        /**
         * Sequential counter for SEQUENTIAL naming strategy.
         * Shared across all test instances for deterministic naming.
         */
        private val sequentialCounter = AtomicInteger(0)

        /**
         * Reset the sequential counter for test suites that need deterministic database names.
         * Useful for debugging when you want consistent database names across test runs.
         */
        fun resetSequentialCounter() {
            sequentialCounter.set(0)
        }

        /**
         * Create a test database provider with custom configuration.
         *
         * This factory method provides a convenient way to create test providers
         * with common configurations.
         *
         * @param strategy Naming strategy for the database
         * @param enableLogging Enable SQL logging
         * @return Configured test database provider
         */
        fun create(
            strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID,
            enableLogging: Boolean = false
        ): TestDatabaseProvider {
            return TestDatabaseProvider(strategy, enableLogging)
        }

        /**
         * Create a test database provider for debugging with predictable naming.
         *
         * Uses SEQUENTIAL strategy and enables logging for easier debugging.
         *
         * @return Test database provider configured for debugging
         */
        fun createForDebugging(): TestDatabaseProvider {
            return TestDatabaseProvider(
                strategy = TestDatabaseNamingStrategy.SEQUENTIAL,
                enableLogging = true
            )
        }
    }
}