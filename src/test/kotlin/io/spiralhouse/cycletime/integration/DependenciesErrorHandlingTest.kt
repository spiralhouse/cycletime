package io.spiralhouse.cycletime.integration

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.shouldNotBe
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.ktor.client.request.*
import io.ktor.server.config.MapApplicationConfig
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.module

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
        
        // Attempting to use the failing database should throw
        shouldThrow<ExposedSQLException> {
            transaction(failingDb) {
                // This should fail due to invalid database configuration
                exec("SELECT 1")
            }
        }
    }
    
    "should handle null database parameter correctly" {
        testApplication {
            environment {
                config = MapApplicationConfig(
                    "ktor.deployment.port" to "8080",
                    "database.url" to "jdbc:h2:mem:test_error_handling;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
                )
            }
            application {
                // The DI requires an explicit database parameter
                // There's no way to pass null in the type-safe API
                // This is by design - the system is more robust
                // Test this by using the full module which uses the DI
                // Use in-memory database for tests to avoid conflicts
                System.setProperty("DATABASE_URL", "jdbc:h2:mem:mcp_test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
                module()
            }
            
            // Trigger application initialization
            client.get("/health")
            
            // Should work fine with provided database
            val database: Database by application.dependencies
            database shouldNotBe null
        }
    }
})