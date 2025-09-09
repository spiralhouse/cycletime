package io.spiralhouse.cycletime.infrastructure.database

import org.jetbrains.exposed.sql.Database
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

/**
 * Factory for creating test databases with deterministic naming.
 * 
 * This replaces the non-deterministic System.currentTimeMillis() approach
 * with proper test database naming strategies.
 */
object TestDatabaseFactory {
    
    private val sequentialCounter = AtomicInteger(0)
    
    /**
     * Create a test database with a unique, deterministic name.
     * 
     * @param strategy Naming strategy to use
     * @return Configured test database
     */
    fun createTestDatabase(strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID): Database {
        val dbName = when (strategy) {
            TestDatabaseNamingStrategy.UUID -> "test_${UUID.randomUUID()}"
            TestDatabaseNamingStrategy.SEQUENTIAL -> "test_db_${sequentialCounter.incrementAndGet()}"
            TestDatabaseNamingStrategy.FIXED -> "test_db_fixed"
        }
        
        return Database.connect(
            url = "jdbc:h2:mem:$dbName;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;LOCK_TIMEOUT=5000;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
    }
    
    /**
     * Create a test database that simulates connection failure.
     * 
     * @return Database that will fail on connection
     */
    fun createFailingDatabase(): Database {
        // Invalid URL that will cause connection failure
        return Database.connect(
            url = "jdbc:h2:mem:;INVALID_OPTION=true",
            driver = "org.h2.Driver"
        )
    }
    
    /**
     * Reset the sequential counter for deterministic tests.
     */
    fun resetSequentialCounter() {
        sequentialCounter.set(0)
    }
}

/**
 * Naming strategies for test databases.
 */
enum class TestDatabaseNamingStrategy {
    /** Use UUID for unique names (recommended for parallel tests) */
    UUID,
    
    /** Use sequential counter (good for debugging) */
    SEQUENTIAL,
    
    /** Use fixed name (only for single test runs) */
    FIXED
}