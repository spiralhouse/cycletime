package io.spiralhouse.cycletime.infrastructure.di.modules.test

import io.ktor.server.application.*
import io.ktor.server.application.install
import io.ktor.server.plugins.di.DI
import io.ktor.server.plugins.di.dependencies
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseProvider
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseNamingStrategy
import io.spiralhouse.cycletime.infrastructure.database.DatabaseProvider
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.json.Json
import kotlin.time.Duration
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

// Import table registry for schema creation
import io.spiralhouse.cycletime.infrastructure.database.TableRegistry

/**
 * Fixed time provider for testing.
 * 
 * Allows precise control over time in tests without delays or flakiness.
 */
class FixedTimeProvider(private var currentTime: Instant) : TimeProvider {
    override fun now(): Instant = currentTime
    
    fun setTime(time: Instant) {
        currentTime = time
    }
    
    fun advance(duration: Duration) {
        currentTime = currentTime.plus(duration)
    }
}

/**
 * Create a test database provider with schema initialized.
 *
 * This is the standard way to create a database for tests.
 * Each test gets its own isolated database provider.
 */
fun createTestDatabaseProvider(
    strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID,
    enableLogging: Boolean = false
): TestDatabaseProvider {
    // TestDatabaseProvider already initializes the schema in its init block
    return TestDatabaseProvider(strategy, enableLogging)
}

/**
 * Create a test database with schema initialized.
 *
 * Legacy method for backward compatibility.
 * New tests should use createTestDatabaseProvider() instead.
 */
fun createTestDatabase(
    strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID
): Database {
    val provider = createTestDatabaseProvider(strategy)
    return provider.getDatabase()
}

/**
 * Configure test dependencies using Ktor's native DI.
 *
 * Simple, explicit test configuration:
 * - Installs DI plugin first (required)
 * - Creates test database provider
 * - Configures DI with test database and provider
 * - Allows custom time provider
 * - No MCP dependencies (not needed for most tests)
 */
fun Application.configureTestDependencies(
    timeProvider: TimeProvider = FixedTimeProvider(Clock.System.now()),
    databaseProvider: DatabaseProvider? = null,
    database: Database? = null
) {
    // Install DI plugin first - this is required before configureDependencies()
    install(DI)

    // Create test database provider if not provided
    val testProvider = databaseProvider ?: createTestDatabaseProvider()
    val testDatabase = database ?: testProvider.getDatabase()

    configureDependencies(
        database = testDatabase,
        databaseProvider = testProvider,
        timeProvider = timeProvider,
        includeMCP = false
    )
}

/**
 * Test helper to create a fixed time provider with a specific time.
 * 
 * @param time ISO-8601 formatted time string
 */
fun testTimeProvider(time: String = "2024-01-01T00:00:00Z"): FixedTimeProvider {
    return FixedTimeProvider(Instant.parse(time))
}

/**
 * Configure the application for testing with project routes.
 * This includes content negotiation, dependency injection, and API routes.
 */
fun Application.configureForTesting(
    database: Database? = null,
    databaseProvider: DatabaseProvider? = null,
    timeProvider: TimeProvider? = null
) {
    // Create test database provider if not provided
    val testProvider = databaseProvider ?: createTestDatabaseProvider()
    val testDatabase = database ?: testProvider.getDatabase()

    configureDependencies(
        database = testDatabase,
        databaseProvider = testProvider,
        timeProvider = timeProvider,
        includeMCP = false // Tests don't need MCP
    )

    // Schema is already initialized by TestDatabaseProvider
    // No need to create tables again

    configureContentNegotiation()
    val injectedTimeProvider: TimeProvider by dependencies
    io.spiralhouse.cycletime.api.configuration.ApiConfiguration.configure(this, injectedTimeProvider)
}

/**
 * Configure content negotiation for JSON serialization.
 */
fun Application.configureContentNegotiation() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }
}