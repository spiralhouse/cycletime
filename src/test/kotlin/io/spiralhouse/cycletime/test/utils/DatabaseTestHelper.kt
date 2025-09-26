package io.spiralhouse.cycletime.test.utils

import io.spiralhouse.cycletime.infrastructure.database.DatabaseFactory
import io.spiralhouse.cycletime.module
import io.ktor.server.application.*
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.domain.services.TimeProvider

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
        // Generate unique test database URL
        val testDbUrl = "jdbc:h2:mem:${testName}_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"

        // Set system properties to override Application's buildDatabaseConfig()
        System.setProperty("DATABASE_URL", testDbUrl)
        System.setProperty("DATABASE_DRIVER", "org.h2.Driver")
        System.setProperty("DATABASE_LOGGING", enableLogging.toString())

        application {
            // Now module() will use our test database URL from system properties
            module()
        }
    }

    /**
     * Clean up test database after test completion.
     *
     * IMPORTANT: In CI environments with parallel test execution, calling reset()
     * can close the HikariDataSource while other test suites are still running.
     * Since we use in-memory H2 databases that are automatically cleaned up when
     * the JVM exits, explicit cleanup is not necessary for test isolation.
     *
     * This method is now a no-op to prevent CI failures. The JVM will handle
     * cleanup on process termination.
     */
    fun cleanupTestDatabase() {
        // NO-OP: Removed DatabaseFactory.reset() to prevent closing HikariDataSource
        // while other parallel test suites are still running in CI.
        // Each test uses a unique in-memory database (via nanoTime suffix), so
        // test isolation is maintained without explicit cleanup.
    }
}