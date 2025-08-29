package io.spiralhouse.cycletime.infrastructure.di.modules.test

import io.ktor.server.application.*
import io.ktor.server.application.install
import io.ktor.server.plugins.di.DI
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseNamingStrategy
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlin.time.Duration
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

// Import tables for schema creation
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueDependenciesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueLabelsTable
import io.spiralhouse.cycletime.infrastructure.database.SessionStatesTable

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
 * Create a test database with schema initialized.
 * 
 * This is the standard way to create a database for tests.
 * Each test gets its own isolated database.
 */
fun createTestDatabase(
    strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID
): Database {
    val database = TestDatabaseFactory.createTestDatabase(strategy)
    
    // Initialize schema
    transaction(database) {
        SchemaUtils.create(
            ProjectsTable,
            IssuesTable,
            IssueDependenciesTable,
            IssueLabelsTable,
            SessionStatesTable
        )
    }
    
    return database
}

/**
 * Configure test dependencies using Ktor's native DI.
 * 
 * Simple, explicit test configuration:
 * - Installs DI plugin first (required)
 * - Creates test database
 * - Configures DI with test database
 * - Allows custom time provider
 * - No MCP dependencies (not needed for most tests)
 */
fun Application.configureTestDependencies(
    timeProvider: TimeProvider = FixedTimeProvider(Clock.System.now()),
    database: Database = createTestDatabase()
) {
    // Install DI plugin first - this is required before configureDependencies()
    install(DI)
    
    configureDependencies(
        database = database,
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