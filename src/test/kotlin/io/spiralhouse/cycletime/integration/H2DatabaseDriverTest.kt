package io.spiralhouse.cycletime.integration

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.infrastructure.database.DatabaseConfig

/**
 * RED phase test - Should fail because H2 driver is not configured
 * This test validates TDD approach by ensuring H2 support fails initially
 */
class H2DatabaseDriverTest : StringSpec({
    
    "should fail with current SQLite configuration when trying H2" {
        // This should throw an exception because current config expects SQLite
        shouldThrow<Exception> {
            val config = DatabaseConfig(
                jdbcUrl = "jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                driver = "org.h2.Driver"  // This will fail with current SQLite-only setup
            )
            val database = config.connect()
            database.toString() shouldBe "should not reach here"
        }
    }
})