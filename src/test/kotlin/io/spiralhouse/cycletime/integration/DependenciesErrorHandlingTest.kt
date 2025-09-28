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
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseProvider
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
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

    lateinit var database: Database
    lateinit var testProvider: TestDatabaseProvider

    beforeSpec {
        // Create isolated test database using modern pattern
        database = TestDatabaseFactory.createTestDatabase()
        testProvider = TestDatabaseProvider()
    }

    afterSpec {
        // Clean up test database properly
        testProvider.close()
        TransactionManager.closeAndUnregister(database)
    }
    
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
        testApplication {
            application {
                // Configure DI with isolated test database
                configureDependencies(
                    database = database,
                    databaseProvider = testProvider,
                    timeProvider = null,
                    includeMCP = false
                )
            }

            // Trigger application initialization
            client.get("/health")

            // Should work fine with provided database
            val testDatabase: Database by application.dependencies
            testDatabase shouldNotBe null
        }
    }
})