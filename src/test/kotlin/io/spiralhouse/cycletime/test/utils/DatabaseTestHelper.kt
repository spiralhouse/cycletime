package io.spiralhouse.cycletime.test.utils

import io.spiralhouse.cycletime.infrastructure.database.DatabaseFactory
import io.spiralhouse.cycletime.module
import io.ktor.server.application.*
import io.ktor.server.testing.*

/**
 * Test helper for managing database initialization in integration tests.
 *
 * This helper ensures that DatabaseFactory is properly initialized before
 * the application module is loaded, preventing race conditions during test execution.
 *
 * Design rationale:
 * - Provides a test-specific initialization pattern
 * - Ensures database is initialized exactly once per test spec
 * - Prevents double initialization from test setup and module()
 */
object DatabaseTestHelper {

    /**
     * Initialize test database with a unique in-memory instance per test spec.
     *
     * @param testName Name of the test spec for unique database naming
     * @param enableLogging Enable SQL logging for debugging
     * @return JDBC URL of the initialized test database
     */
    fun initTestDatabase(
        testName: String = "test",
        enableLogging: Boolean = false
    ): String {
        val testDbUrl = "jdbc:h2:mem:${testName}_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"

        // Initialize if not already initialized
        if (!DatabaseFactory.isInitialized()) {
            DatabaseFactory.init(
                jdbcUrl = testDbUrl,
                driver = "org.h2.Driver",
                enableLogging = enableLogging,
                forceReinit = false
            )
        }

        return testDbUrl
    }

    /**
     * Configure test application with pre-initialized database.
     *
     * This extension function ensures the database is initialized before
     * calling module(), preventing race conditions.
     */
    fun ApplicationTestBuilder.configureTestApplication(
        testName: String = "test",
        enableLogging: Boolean = false
    ) {
        // Ensure database is initialized before module
        initTestDatabase(testName, enableLogging)

        application {
            // Now safe to call module - database already initialized
            module()
        }
    }

    /**
     * Clean up test database after test completion.
     */
    fun cleanupTestDatabase() {
        DatabaseFactory.reset()
    }
}