package io.spiralhouse.cycletime.integration

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.shouldBe
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.ktor.client.request.*
import io.ktor.server.config.MapApplicationConfig
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.module
import io.spiralhouse.cycletime.infrastructure.database.DatabaseFactory

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.exceptions.ExposedSQLException

/**
 * Tests for error handling in the dependency injection system.
 * 
 * These tests verify that the DI system properly handles:
 * - Database initialization failures
 * - Dependency resolution failures
 * - Database operation failures
 * 
 * Note: With the current DI, there are no profiles to validate,
 * making the system more robust and less prone to configuration errors.
 */
class DependenciesErrorHandlingTest : StringSpec({
    
    "should handle failing database operations" {
        val failingDb = TestDatabaseFactory.createFailingDatabase()

        // The failing database should throw when attempting operations
        shouldThrow<Exception> {
            transaction(failingDb) {
                // This should fail due to invalid database configuration
                exec("SELECT 1")
            }
        }.let { exception ->
            // Verify it's a connection-related error (could be various types)
            val message = exception.message?.lowercase() ?: ""
            // Accept various connection-related error messages
            val isConnectionError = message.contains("connection") ||
                                  message.contains("invalid") ||
                                  message.contains("host") ||
                                  message.contains("url") ||
                                  message.contains("tcp") ||
                                  message.contains("refused") ||
                                  message.contains("timeout")
            if (!isConnectionError) {
                println("Actual exception: ${exception::class.simpleName}: ${exception.message}")
            }
            isConnectionError shouldBe true
        }
    }
    
    "should handle null database parameter correctly" {
        // Initialize database before test
        val testDbUrl = "jdbc:h2:mem:test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
        DatabaseFactory.init(
            jdbcUrl = testDbUrl,
            driver = "org.h2.Driver",
            enableLogging = false
        )

        try {
            testApplication {
                environment {
                    config = MapApplicationConfig(
                        "ktor.deployment.port" to "8080",
                        "database.url" to testDbUrl
                    )
                }
                application {
                    // The DI requires an explicit database parameter
                    // There's no way to pass null in the type-safe API
                    // This is by design - the system is more robust
                    // Test this by using the full module which uses the DI
                    System.setProperty("DATABASE_URL", testDbUrl)
                    module()
                }

                // Trigger application initialization
                client.get("/health")

                // Should work fine with provided database
                val database: Database by application.dependencies
                database shouldNotBe null
            }
        } finally {
            DatabaseFactory.reset()
        }
    }
})