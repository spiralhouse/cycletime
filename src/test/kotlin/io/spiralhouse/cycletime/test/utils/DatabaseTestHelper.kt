package io.spiralhouse.cycletime.test.utils

import io.spiralhouse.cycletime.infrastructure.database.DatabaseProvider
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseProvider
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseNamingStrategy
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.module
import io.ktor.server.application.*
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.domain.services.TimeProvider
import org.jetbrains.exposed.sql.Database

/**
 * Test helper for managing database initialization in integration tests.
 *
 * This helper provides test-specific database instances using the new DI pattern,
 * enabling parallel test execution without singleton conflicts.
 *
 * Design rationale:
 * - Each test gets its own isolated database provider
 * - Enables parallel test execution without conflicts
 * - Clean separation between test and production database configuration
 */
object DatabaseTestHelper {

    /**
     * Create a test database provider with a unique in-memory instance.
     *
     * @param strategy Naming strategy for the test database
     * @param enableLogging Enable SQL logging for debugging
     * @return Test database provider instance
     */
    fun createTestProvider(
        strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID,
        enableLogging: Boolean = false
    ): TestDatabaseProvider {
        return TestDatabaseProvider(strategy, enableLogging)
    }

    /**
     * Configure test application with isolated database provider.
     *
     * This extension function sets up the application with a test-specific
     * database provider, enabling parallel test execution without conflicts.
     *
     * IMPORTANT: Tests can now run in PARALLEL since each gets its own
     * database provider instance through DI.
     */
    fun ApplicationTestBuilder.configureTestApplication(
        strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID,
        enableLogging: Boolean = false,
        timeProvider: TimeProvider? = null
    ) {
        application {
            // Create isolated test database provider
            val testProvider = createTestProvider(strategy, enableLogging)
            val database = testProvider.getDatabase()

            // Configure DI with test database provider
            configureDependencies(
                database = database,
                databaseProvider = testProvider,
                timeProvider = timeProvider,
                includeMCP = false // Usually disabled for unit tests
            )

            // Now configure the rest of the application
            // Note: We're not calling module() to avoid duplicate DI configuration
            // Tests should configure routes and features as needed
        }
    }

    /**
     * Configure test application with standard module but test database.
     *
     * Use this when you want the full application module but with a test database.
     * Tests will run in parallel since each gets its own database instance.
     */
    fun ApplicationTestBuilder.configureTestApplicationWithModule(
        strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID,
        enableLogging: Boolean = false
    ) {
        // Create unique test database URL for this test instance
        val testDbUrl = when (strategy) {
            TestDatabaseNamingStrategy.UUID ->
                "jdbc:h2:mem:test_${java.util.UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
            TestDatabaseNamingStrategy.SEQUENTIAL ->
                "jdbc:h2:mem:test_db_seq_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
            TestDatabaseNamingStrategy.FIXED ->
                "jdbc:h2:mem:test_db_fixed;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
        }

        // Set system properties to override Application's buildDatabaseConfig()
        System.setProperty("DATABASE_URL", testDbUrl)
        System.setProperty("DATABASE_DRIVER", "org.h2.Driver")
        System.setProperty("DATABASE_LOGGING", enableLogging.toString())
        // Enable development mode for OAuth to use test defaults
        System.setProperty("KTOR_DEVELOPMENT", "true")

        application {
            // Call the standard module which will use our test database URL
            module()
        }
    }

    /**
     * Legacy compatibility method for existing tests.
     *
     * @deprecated Use configureTestApplicationWithModule() with TestDatabaseNamingStrategy instead
     */
    @Deprecated("Use configureTestApplicationWithModule() with TestDatabaseNamingStrategy",
        ReplaceWith("configureTestApplicationWithModule()")
    )
    fun ApplicationTestBuilder.configureTestApplication(
        testName: String = "test",
        enableLogging: Boolean = false
    ) {
        // Convert legacy testName to unique database URL
        val testDbUrl = "jdbc:h2:mem:${testName}_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"

        // Set system properties to override Application's buildDatabaseConfig()
        System.setProperty("DATABASE_URL", testDbUrl)
        System.setProperty("DATABASE_DRIVER", "org.h2.Driver")
        System.setProperty("DATABASE_LOGGING", enableLogging.toString())
        // Enable development mode for OAuth to use test defaults
        System.setProperty("KTOR_DEVELOPMENT", "true")

        application {
            // Call the standard module which will use our test database URL
            module()
        }
    }

    /**
     * Legacy compatibility method for database initialization.
     *
     * @deprecated Use createTestProvider() instead
     */
    @Deprecated("Use createTestProvider() instead",
        ReplaceWith("createTestProvider(TestDatabaseNamingStrategy.UUID, enableLogging).getDatabase()")
    )
    fun initTestDatabase(
        testName: String = "test",
        enableLogging: Boolean = false
    ): String {
        val testDbUrl = "jdbc:h2:mem:${testName}_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"

        // Set system properties for the application to use
        System.setProperty("DATABASE_URL", testDbUrl)
        System.setProperty("DATABASE_DRIVER", "org.h2.Driver")
        System.setProperty("DATABASE_LOGGING", enableLogging.toString())

        return testDbUrl
    }

    /**
     * Clean up test database provider after test completion.
     *
     * With the new DI pattern, cleanup is handled by the provider's close() method.
     * Each test has its own provider instance, so cleanup doesn't affect other tests.
     *
     * @param provider The test database provider to clean up (optional)
     */
    fun cleanupTestDatabase(provider: DatabaseProvider? = null) {
        provider?.close()
        // No singleton to reset - each test manages its own provider
    }
}