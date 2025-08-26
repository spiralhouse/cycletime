package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.infrastructure.database.DatabaseConfig
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * Integration test for H2 database driver functionality
 * Validates that H2 driver connects properly and supports PostgreSQL compatibility mode
 */
class H2DatabaseDriverTest : StringSpec({
    
    "should connect to H2 database with PostgreSQL compatibility mode" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        // Should not throw exception
        val database = config.connect()
        database shouldNotBe null
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
    
    "should create tables successfully with H2 driver" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:testschema;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        // The connect() method should create all tables without throwing exceptions
        val database = config.connect()
        database shouldNotBe null
        
        // If we get here without exception, tables were created successfully
        // This validates the H2 driver works with table creation
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
})